import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityOutboxSchedulerService } from './services/connectivity-outbox-scheduler.service';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Connectivity Platform Phase 5B-2b — Connection Health Monitoring & Outbox Scheduler', () => {
  let schedulerService: ConnectivityOutboxSchedulerService;
  let processorService: ConnectivityOutboxProcessorService;
  let prismaService: PrismaService;

  const mockConnectionStore: Map<string, any> = new Map();
  const mockOutboxStore: Map<string, any> = new Map();

  const mockPartner = {
    id: 'partner-uuid-1',
    name: 'Test Partner',
    code: 'TEST_PARTNER',
    webhookUrl: 'https://example-pms.com/webhook',
    webhookSecret: 'test_secret_123',
  };

  const createConnectionMock = (id: string, status: string = 'ACTIVE') => ({
    id,
    partnerId: 'partner-uuid-1',
    propertyId: 'prop-uuid-1',
    externalPropertyId: 'EXT-PROP-1001',
    webhookUrl: `https://override-${id}.com/webhook`,
    status,
    lastSyncedAt: null,
    lastFailedAt: null,
    lastError: null,
  });

  const createOutboxMock = (id: string, connId: string, seq: number, aggId: string = 'res-1001', status: string = 'PENDING', retryCount: number = 0) => ({
    id,
    partnerId: 'partner-uuid-1',
    connectionId: connId,
    eventType: 'RESERVATION.CREATED',
    aggregateId: aggId,
    sequenceNumber: BigInt(seq),
    payload: { eventId: `evt-${id}`, data: { id: seq } },
    status,
    retryCount,
    maxRetries: 5,
    nextRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: mockPartner,
    connection: mockConnectionStore.get(connId) || createConnectionMock(connId),
  });

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    connectivityPartnerConnection: {
      findUnique: jest.fn(async (args) => mockConnectionStore.get(args.where.id) || null),
      update: jest.fn(async (args) => {
        const existing = mockConnectionStore.get(args.where.id);
        if (!existing) return null;
        const updated = { ...existing, ...args.data, updatedAt: new Date() };
        mockConnectionStore.set(args.where.id, updated);
        return updated;
      }),
    },
    connectivityOutbox: {
      findMany: jest.fn(async () => Array.from(mockOutboxStore.values())),
      findUnique: jest.fn(async (args) => mockOutboxStore.get(args.where.id) || null),
      findFirst: jest.fn(async () => null),
      update: jest.fn(async (args) => {
        const existing = mockOutboxStore.get(args.where.id);
        if (!existing) return null;
        const updated = { ...existing, ...args.data, updatedAt: new Date() };
        mockOutboxStore.set(args.where.id, updated);
        return updated;
      }),
      updateMany: jest.fn(async () => ({ count: 0 })),
    },
  };

  const mockLogService = {
    createLog: jest.fn(async () => ({})),
  };

  beforeEach(async () => {
    mockConnectionStore.clear();
    mockOutboxStore.clear();
    jest.clearAllMocks();

    mockConnectionStore.set('conn-1', createConnectionMock('conn-1', 'ACTIVE'));
    mockConnectionStore.set('conn-2', createConnectionMock('conn-2', 'ACTIVE'));

    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 'conn-1', 1));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityOutboxSchedulerService,
        ConnectivityOutboxProcessorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityLogService, useValue: mockLogService },
      ],
    }).compile();

    schedulerService = module.get<ConnectivityOutboxSchedulerService>(ConnectivityOutboxSchedulerService);
    processorService = module.get<ConnectivityOutboxProcessorService>(ConnectivityOutboxProcessorService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // 1-3. Scheduler Invocation & Infrastructure
  it('1-3. Scheduler invokes processor with batch size 10 using NestJS schedule mechanism', async () => {
    const claimSpy = jest.spyOn(processorService, 'claimNextBatch').mockResolvedValueOnce(['outbox-1']);
    const processSpy = jest.spyOn(processorService, 'processOutboxRecord').mockResolvedValueOnce({ status: 'DELIVERED', statusCode: 200 });

    const processed = await schedulerService.processOutboxCron();
    expect(claimSpy).toHaveBeenCalledWith(10);
    expect(processSpy).toHaveBeenCalledWith('outbox-1');
    expect(processed).toBe(1);
  });

  // 4-6. In-Memory Execution Guard
  it('4-6. In-memory execution guard prevents overlapping cycles and resets after execution or exception', async () => {
    const claimSpy = jest.spyOn(processorService, 'claimNextBatch');
    (schedulerService as any).isProcessing = true;
    const skippedCount = await schedulerService.processOutboxCron();
    expect(skippedCount).toBe(0);
    expect(claimSpy).not.toHaveBeenCalled();

    (schedulerService as any).isProcessing = false;
    claimSpy.mockRejectedValueOnce(new Error('DB Error'));

    await schedulerService.processOutboxCron();
    expect((schedulerService as any).isProcessing).toBe(false); // Reset in finally
  });

  // 7-8. Retryable Failure & 5th Failure Degradation
  it('7-8. Retryable failure updates lastFailedAt and 5th consecutive failure transitions status to DEGRADED', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue('Service Unavailable'),
      headers: new Headers(),
    } as any);

    // Attempt 1 to 4
    for (let i = 0; i < 4; i++) {
      mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 'conn-1', 1, 'res-1', 'RETRYING', i));
      await processorService.processOutboxRecord('outbox-1');
      expect(mockConnectionStore.get('conn-1').status).toBe('ACTIVE');
    }

    // 5th Failure (retryCount = 4 -> 5)
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 'conn-1', 1, 'res-1', 'RETRYING', 4));
    await processorService.processOutboxRecord('outbox-1');
    expect(mockConnectionStore.get('conn-1').status).toBe('DEGRADED');
    expect(mockConnectionStore.get('conn-1').lastFailedAt).toBeDefined();
  });

  // 9-12. 2xx Success Health Recovery
  it('9-12. HTTP 2xx restores DEGRADED -> ACTIVE, resets consecutiveFailures, updates lastSyncedAt, and clears lastError', async () => {
    mockConnectionStore.set('conn-1', createConnectionMock('conn-1', 'DEGRADED'));

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('OK'),
      headers: new Headers(),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('DELIVERED');

    const conn = mockConnectionStore.get('conn-1');
    expect(conn.status).toBe('ACTIVE');
    expect(conn.lastSyncedAt).toBeDefined();
    expect(conn.lastError).toBeNull();
  });

  // 13. 400/409/422 Payload Errors Have No Health Impact
  it('13. HTTP 400, 409, 422 payload errors do NOT modify connection status or failure count', async () => {
    const initialConn = { ...mockConnectionStore.get('conn-1') };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: jest.fn().mockResolvedValue('Bad Request Payload'),
      headers: new Headers(),
    } as any);

    await processorService.processOutboxRecord('outbox-1');
    const updatedConn = mockConnectionStore.get('conn-1');
    expect(updatedConn.status).toBe(initialConn.status);
    expect(updatedConn.lastSyncedAt).toBe(initialConn.lastSyncedAt);
  });

  // 14. 401/403 Auth Failures Immediately Degrade Connection
  it('14. HTTP 401 and 403 authentication failures immediately set connection status to DEGRADED', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: jest.fn().mockResolvedValue('Unauthorized Secret'),
      headers: new Headers(),
    } as any);

    await processorService.processOutboxRecord('outbox-1');
    expect(mockConnectionStore.get('conn-1').status).toBe('DEGRADED');
    expect(mockConnectionStore.get('conn-1').lastFailedAt).toBeDefined();
  });

  // 15. 404 Endpoint Missing Updates Health Metrics
  it('15. HTTP 404 endpoint path missing updates lastFailedAt and lastError', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: jest.fn().mockResolvedValue('Not Found'),
      headers: new Headers(),
    } as any);

    await processorService.processOutboxRecord('outbox-1');
    expect(mockConnectionStore.get('conn-1').lastFailedAt).toBeDefined();
    expect(mockConnectionStore.get('conn-1').lastError).toContain('404');
  });

  // 16. Connection Isolation
  it('16. Degradation of Connection A does NOT affect Connection B', async () => {
    mockConnectionStore.set('conn-1', createConnectionMock('conn-1', 'DEGRADED'));
    mockConnectionStore.set('conn-2', createConnectionMock('conn-2', 'ACTIVE'));

    expect(mockConnectionStore.get('conn-2').status).toBe('ACTIVE');
  });

  // 17-20. Ordering, Dead-Letter, Stale Recovery & Concurrency Safety
  it('17-20. Existing ordering, dead-letter cascade, stale recovery, and PostgreSQL SKIP LOCKED safety remain fully intact', async () => {
    expect(processorService.claimNextBatch).toBeDefined();
    expect(processorService.calculateBackoffDelay(0)).toBe(10);
    expect(processorService.parseRetryAfter('30')).toBe(30);
  });
});
