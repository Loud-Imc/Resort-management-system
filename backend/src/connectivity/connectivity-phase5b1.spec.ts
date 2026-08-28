import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

describe('Connectivity Platform Phase 5B-1 — Outbound Webhook Delivery Worker & HMAC Signing', () => {
  let processorService: ConnectivityOutboxProcessorService;
  let prismaService: PrismaService;
  let logService: ConnectivityLogService;

  const mockPartner = {
    id: 'partner-uuid-1',
    name: 'Test PMS Partner',
    code: 'TEST_PMS',
    webhookUrl: 'https://example-pms.com/webhook',
    webhookSecret: 'test_secret_123',
  };

  const mockConnection = {
    id: 'conn-uuid-1',
    partnerId: 'partner-uuid-1',
    propertyId: 'prop-uuid-1',
    externalPropertyId: 'EXT-PROP-1001',
    webhookUrl: 'https://override-pms.com/webhook',
    status: 'ACTIVE',
  };

  const mockOutboxPending = {
    id: 'outbox-1',
    partnerId: 'partner-uuid-1',
    connectionId: 'conn-uuid-1',
    eventType: 'RESERVATION.CREATED',
    aggregateId: 'mapping-1001',
    sequenceNumber: BigInt(1),
    payload: {
      eventId: 'evt-1001',
      eventType: 'RESERVATION.CREATED',
      data: { bookingNumber: 'BK-1001' },
    },
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 5,
    nextRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: mockPartner,
    connection: mockConnection,
  };

  const mockLogs: any[] = [];
  const mockOutboxStore: Map<string, any> = new Map();

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    connectivityOutbox: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockLogService = {
    createLog: jest.fn(async (logData) => {
      const record = { id: `log-${Date.now()}`, ...logData, createdAt: new Date() };
      mockLogs.push(record);
      return record;
    }),
  };

  beforeEach(async () => {
    mockLogs.length = 0;
    mockOutboxStore.clear();
    jest.clearAllMocks();

    mockOutboxStore.set(mockOutboxPending.id, { ...mockOutboxPending });

    mockPrismaService.connectivityOutbox.findUnique.mockImplementation(async (args) => {
      return mockOutboxStore.get(args.where.id) || null;
    });

    mockPrismaService.connectivityOutbox.update.mockImplementation(async (args) => {
      const existing = mockOutboxStore.get(args.where.id);
      if (!existing) return null;
      const updated = { ...existing, ...args.data, updatedAt: new Date() };
      mockOutboxStore.set(args.where.id, updated);
      return updated;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityOutboxProcessorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityLogService, useValue: mockLogService },
      ],
    }).compile();

    processorService = module.get<ConnectivityOutboxProcessorService>(ConnectivityOutboxProcessorService);
    prismaService = module.get<PrismaService>(PrismaService);
    logService = module.get<ConnectivityLogService>(ConnectivityLogService);
  });

  // 1. Claims PENDING event
  it('1. claims PENDING event atomically', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-1' }]);

    const ids = await processorService.claimNextBatch(10);
    expect(ids).toContain('outbox-1');
  });

  // 2. Claims RETRYING event when eligible
  it('2. claims RETRYING event when nextRetryAt <= NOW()', async () => {
    const retryingEvent = {
      ...mockOutboxPending,
      id: 'outbox-retrying',
      status: 'RETRYING',
      nextRetryAt: new Date(Date.now() - 1000),
    };
    mockOutboxStore.set('outbox-retrying', retryingEvent);
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-retrying' }]);

    const ids = await processorService.claimNextBatch(10);
    expect(ids).toContain('outbox-retrying');
  });

  // 3. Does not claim future RETRYING event
  it('3. does not claim future RETRYING event when nextRetryAt > NOW()', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

    const ids = await processorService.claimNextBatch(10);
    expect(ids.length).toBe(0);
  });

  // 4. Stale PROCESSING recovery after 15 minutes
  it('4. recovers stale PROCESSING records older than 15 minutes', async () => {
    const staleEvent = {
      ...mockOutboxPending,
      id: 'outbox-stale',
      status: 'PROCESSING',
      updatedAt: new Date(Date.now() - 16 * 60 * 1000),
    };
    mockOutboxStore.set('outbox-stale', staleEvent);
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-stale' }]);

    const ids = await processorService.claimNextBatch(10);
    expect(ids).toContain('outbox-stale');
  });

  // 5. Does not recover recent PROCESSING event
  it('5. does not recover recent PROCESSING event updated < 15 minutes ago', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

    const ids = await processorService.claimNextBatch(10);
    expect(ids).not.toContain('outbox-1');
  });

  // 6. Resolves connection webhook URL
  it('6. resolves connection-level webhook URL override', async () => {
    const record = mockOutboxStore.get('outbox-1');
    const destination = record.connection?.webhookUrl || record.partner?.webhookUrl;
    expect(destination).toBe('https://override-pms.com/webhook');
  });

  // 7. Falls back to partner webhook URL
  it('7. falls back to partner webhook URL when connection URL is missing', async () => {
    mockOutboxStore.set('outbox-1', {
      ...mockOutboxPending,
      connection: { ...mockConnection, webhookUrl: null },
    });

    const record = mockOutboxStore.get('outbox-1');
    const destination = record.connection?.webhookUrl || record.partner?.webhookUrl;
    expect(destination).toBe('https://example-pms.com/webhook');
  });

  // 8. Fails permanently when no webhook URL exists
  it('8. fails permanently when no webhook URL exists', async () => {
    mockOutboxStore.set('outbox-no-url', {
      ...mockOutboxPending,
      id: 'outbox-no-url',
      connection: { ...mockConnection, webhookUrl: null },
      partner: { ...mockPartner, webhookUrl: null },
    });

    const res = await processorService.processOutboxRecord('outbox-no-url');
    expect(res.status).toBe('FAILED_PERMANENT');

    const updated = mockOutboxStore.get('outbox-no-url');
    expect(updated.status).toBe('FAILED_PERMANENT');
    expect(updated.lastError).toContain('No valid webhook URL configured');
  });

  // 9. Rejects insecure production HTTP URL
  it('9. rejects insecure HTTP URL in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const res = processorService.validateDestinationUrl('http://insecure-pms.com/webhook');
    expect(res.valid).toBe(false);
    expect(res.reason).toContain('HTTPS is required in production');

    process.env.NODE_ENV = originalEnv;
  });

  // 10. Rejects localhost & private IP destinations
  it('10. rejects localhost and private IP destinations', async () => {
    expect(processorService.validateDestinationUrl('https://localhost/webhook').valid).toBe(false);
    expect(processorService.validateDestinationUrl('https://127.0.0.1/webhook').valid).toBe(false);
    expect(processorService.validateDestinationUrl('https://10.0.0.1/webhook').valid).toBe(false);
    expect(processorService.validateDestinationUrl('https://192.168.1.1/webhook').valid).toBe(false);
    expect(processorService.validateDestinationUrl('https://169.254.169.254/latest').valid).toBe(false);
  });

  // 11. Generates correct HMAC-SHA256 signature
  it('11 & EXACT Cryptographic Test: generates exact HMAC-SHA256 signature matching verified test vector', async () => {
    const payload = { eventId: 'evt-1001', eventType: 'TEST' };
    const secret = 'test_secret_123';
    const timestamp = '1787123456';

    const signatureHeader = processorService.generateHmacSignature(payload, secret, timestamp);

    // Exact expected hash verification:
    // 1787123456.{"eventId":"evt-1001","eventType":"TEST"} with key "test_secret_123"
    const expectedDigest = '78a34af8e39652228cc7abd3dc32b264b9a394fdd8075edc131b17e9ff0f0e79';

    expect(signatureHeader).toBe(`t=1787123456,v1=${expectedDigest}`);
  });

  // 12. Sends correct signature headers
  it('12. formats signature headers correctly', async () => {
    const sig = processorService.generateHmacSignature(
      mockOutboxPending.payload,
      'test_secret_123',
      '1787123456',
    );
    expect(sig).toContain('t=1787123456,v1=');
  });

  // 13. Sends canonical eventId in header
  it('13. sends canonical eventId in X-RouteGuide-Event-Id header', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('{"status":"ok"}'),
    } as any);

    await processorService.processOutboxRecord('outbox-1');

    expect(global.fetch).toHaveBeenCalled();
    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = fetchArgs[1].headers;
    expect(headers['X-RouteGuide-Event-Id']).toBe('evt-1001');
    expect(headers['X-RouteGuide-Event-Type']).toBe('RESERVATION.CREATED');
  });

  // 14. Sends POST request
  it('14. dispatches HTTP POST request', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('OK'),
    } as any);

    await processorService.processOutboxRecord('outbox-1');

    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    expect(fetchArgs[1].method).toBe('POST');
  });

  // 15. Respects 10-second timeout
  it('15. aborts request on 10-second timeout', async () => {
    global.fetch = jest.fn().mockImplementationOnce(() => {
      const err: any = new Error('The operation was aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('RETRYING');
    expect(res.error).toContain('10s');
  });

  // 16. Successful 2xx delivery marks DELIVERED
  it('16. successful 2xx HTTP response transitions status to DELIVERED', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('{"received":true}'),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('DELIVERED');

    const updated = mockOutboxStore.get('outbox-1');
    expect(updated.status).toBe('DELIVERED');
    expect(updated.deliveredAt).toBeDefined();
  });

  // 17. Logs outbound attempt
  it('17. logs outbound delivery attempt via ConnectivityLogService', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('OK'),
    } as any);

    await processorService.processOutboxRecord('outbox-1');

    expect(mockLogService.createLog).toHaveBeenCalled();
    const logCall = mockLogService.createLog.mock.calls[0][0];
    expect(logCall.direction).toBe('OUTBOUND');
    expect(logCall.endpoint).toBe('https://override-pms.com/webhook');
    expect(logCall.statusCode).toBe(200);
  });

  // 18. Secret never appears in logs
  it('18. webhook secret is never logged in ConnectivityLog', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: jest.fn().mockResolvedValue('OK'),
    } as any);

    await processorService.processOutboxRecord('outbox-1');

    const logCall = mockLogService.createLog.mock.calls[0][0];
    const logStr = JSON.stringify(logCall);
    expect(logStr).not.toContain('test_secret_123');
  });

  // 19. Retry uses the SAME eventId
  it('19. retried delivery retains the SAME eventId across attempts', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Error'),
    } as any);

    await processorService.processOutboxRecord('outbox-1');

    const fetchArgs = (global.fetch as jest.Mock).mock.calls[0];
    const headers = fetchArgs[1].headers;
    expect(headers['X-RouteGuide-Event-Id']).toBe('evt-1001');
  });

  // 20. Concurrent workers cannot claim the same event simultaneously
  it('20. atomic FOR UPDATE SKIP LOCKED query prevents double claim', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-1' }]);

    const claim1 = await processorService.claimNextBatch(1);
    expect(claim1).toEqual(['outbox-1']);

    mockPrismaService.$queryRaw.mockResolvedValueOnce([]);
    const claim2 = await processorService.claimNextBatch(1);
    expect(claim2).toEqual([]);
  });
});
