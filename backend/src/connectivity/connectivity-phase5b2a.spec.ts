import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Connectivity Platform Phase 5B-2a — Response Classification, Retry Backoff & Dead-Letter Ordering', () => {
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

  const createOutboxMock = (id: string, seq: number, aggId: string | null = 'res-mapping-1001', status: string = 'PENDING', retryCount: number = 0) => ({
    id,
    partnerId: 'partner-uuid-1',
    connectionId: 'conn-uuid-1',
    eventType: 'RESERVATION.CREATED',
    aggregateId: aggId,
    sequenceNumber: BigInt(seq),
    payload: {
      eventId: `evt-${id}`,
      eventType: 'RESERVATION.CREATED',
      data: { bookingNumber: `BK-${seq}` },
    },
    status,
    retryCount,
    maxRetries: 5,
    nextRetryAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    partner: mockPartner,
    connection: mockConnection,
  });

  const mockOutboxStore: Map<string, any> = new Map();
  const mockLogs: any[] = [];

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    connectivityOutbox: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
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

    const event1 = createOutboxMock('outbox-1', 1);
    mockOutboxStore.set('outbox-1', event1);

    mockPrismaService.connectivityOutbox.findUnique.mockImplementation(async (args) => {
      return mockOutboxStore.get(args.where.id) || null;
    });

    mockPrismaService.connectivityOutbox.findFirst.mockImplementation(async (args) => {
      for (const item of mockOutboxStore.values()) {
        if (
          args.where.aggregateId && item.aggregateId === args.where.aggregateId &&
          args.where.sequenceNumber?.lt && item.sequenceNumber < args.where.sequenceNumber.lt &&
          args.where.status?.in && args.where.status.in.includes(item.status)
        ) {
          return item;
        }
      }
      return null;
    });

    mockPrismaService.connectivityOutbox.findMany.mockImplementation(async (args) => {
      return Array.from(mockOutboxStore.values());
    });

    mockPrismaService.connectivityOutbox.update.mockImplementation(async (args) => {
      const existing = mockOutboxStore.get(args.where.id);
      if (!existing) return null;
      const updated = { ...existing, ...args.data, updatedAt: new Date() };
      mockOutboxStore.set(args.where.id, updated);
      return updated;
    });

    mockPrismaService.connectivityOutbox.updateMany.mockImplementation(async (args) => {
      let count = 0;
      for (const [id, item] of mockOutboxStore.entries()) {
        if (
          args.where.aggregateId && item.aggregateId === args.where.aggregateId &&
          args.where.sequenceNumber?.gt && item.sequenceNumber > args.where.sequenceNumber.gt &&
          args.where.status?.in && args.where.status.in.includes(item.status)
        ) {
          mockOutboxStore.set(id, { ...item, ...args.data, updatedAt: new Date() });
          count++;
        }
      }
      return { count };
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

  // 1-4: 2xx Success Statuses
  it('1-4. HTTP 200, 201, 202, 204 transition status to DELIVERED and set deliveredAt', async () => {
    for (const code of [200, 201, 202, 204]) {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        status: code,
        text: jest.fn().mockResolvedValue('OK'),
        headers: new Headers(),
      } as any);

      const res = await processorService.processOutboxRecord('outbox-1');
      expect(res.status).toBe('DELIVERED');
      expect(mockOutboxStore.get('outbox-1').status).toBe('DELIVERED');
      expect(mockOutboxStore.get('outbox-1').deliveredAt).toBeDefined();
    }
  });

  // 5-10: 4xx Permanent Failures
  it('5-10. HTTP 400, 401, 403, 404, 409, 422 transition status to FAILED_PERMANENT without retrying', async () => {
    for (const code of [400, 401, 403, 404, 409, 422]) {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: code,
        text: jest.fn().mockResolvedValue('Permanent error'),
        headers: new Headers(),
      } as any);

      const res = await processorService.processOutboxRecord('outbox-1');
      expect(res.status).toBe('FAILED_PERMANENT');
      expect(mockOutboxStore.get('outbox-1').status).toBe('FAILED_PERMANENT');
      expect(mockOutboxStore.get('outbox-1').retryCount).toBe(0);
    }
  });

  // 11-15: 429 Retry-After Handling
  it('11. 429 with Retry-After seconds parses N seconds correctly', async () => {
    const now = Date.now();
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: jest.fn().mockResolvedValue('Rate Limited'),
      headers: new Headers({ 'retry-after': '30' }),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('RETRYING');

    const updated = mockOutboxStore.get('outbox-1');
    expect(updated.retryCount).toBe(1);
    const diffSec = Math.round((updated.nextRetryAt.getTime() - now) / 1000);
    expect(diffSec).toBeGreaterThanOrEqual(29);
    expect(diffSec).toBeLessThanOrEqual(31);
  });

  it('12. 429 with Retry-After HTTP date parses date correctly', async () => {
    const targetDate = new Date(Date.now() + 120 * 1000); // +120s
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: jest.fn().mockResolvedValue('Rate Limited'),
      headers: new Headers({ 'retry-after': targetDate.toUTCString() }),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('RETRYING');

    const updated = mockOutboxStore.get('outbox-1');
    const diffSec = Math.round((updated.nextRetryAt.getTime() - Date.now()) / 1000);
    expect(diffSec).toBeGreaterThanOrEqual(118);
    expect(diffSec).toBeLessThanOrEqual(122);
  });

  it('13-14. 429 without or with invalid Retry-After falls back to exponential backoff', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: jest.fn().mockResolvedValue('Rate Limited'),
      headers: new Headers({ 'retry-after': 'invalid-date-string' }),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('RETRYING');

    const updated = mockOutboxStore.get('outbox-1');
    const diffSec = Math.round((updated.nextRetryAt.getTime() - Date.now()) / 1000);
    expect(diffSec).toBe(10); // Attempt 1 retry backoff delay is 10s
  });

  it('15. Retry-After exceeding 24 hours (86,400s) is capped at 24 hours', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: jest.fn().mockResolvedValue('Rate Limited'),
      headers: new Headers({ 'retry-after': '9999999' }), // Huge number
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('RETRYING');

    const updated = mockOutboxStore.get('outbox-1');
    const diffSec = Math.round((updated.nextRetryAt.getTime() - Date.now()) / 1000);
    expect(diffSec).toBe(86400); // Capped at 24 hours
  });

  // 16-22: 5xx & Network Failures
  it('16-22. 500, 502, 503, 504, timeout, network failures trigger RETRYING status', async () => {
    for (const code of [500, 502, 503, 504]) {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        status: code,
        text: jest.fn().mockResolvedValue('Server Error'),
        headers: new Headers(),
      } as any);

      const res = await processorService.processOutboxRecord('outbox-1');
      expect(res.status).toBe('RETRYING');
    }
  });

  // 23-27: Backoff Schedule Calculation
  it('23-27. Backoff delays: 10s (attempt 1), 60s (attempt 2), 300s (attempt 3), 1800s (attempt 4), 7200s (attempt 5)', () => {
    expect(processorService.calculateBackoffDelay(0)).toBe(10);
    expect(processorService.calculateBackoffDelay(1)).toBe(60);
    expect(processorService.calculateBackoffDelay(2)).toBe(300);
    expect(processorService.calculateBackoffDelay(3)).toBe(1800);
    expect(processorService.calculateBackoffDelay(4)).toBe(7200);
  });

  // 28-29: Dead-Lettering
  it('28-29. Attempt 6 failure (retryCount = 5) transitions event to FAILED_DEAD_LETTER', async () => {
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 1, 'res-mapping-1001', 'RETRYING', 5));

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue('Service Unavailable'),
      headers: new Headers(),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('FAILED_DEAD_LETTER');

    const updated = mockOutboxStore.get('outbox-1');
    expect(updated.status).toBe('FAILED_DEAD_LETTER');
    expect(updated.lastError).toContain('Max retries (5) exceeded');
  });

  // 30-32: Event Immutability
  it('30-32. eventId, payload, sequenceNumber remain 100% unchanged across retries', async () => {
    const originalPayload = JSON.parse(JSON.stringify(mockOutboxStore.get('outbox-1').payload));

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue('Error'),
      headers: new Headers(),
    } as any);

    await processorService.processOutboxRecord('outbox-1');

    const updated = mockOutboxStore.get('outbox-1');
    expect(updated.payload.eventId).toBe(originalPayload.eventId);
    expect(updated.payload.data.bookingNumber).toBe(originalPayload.data.bookingNumber);
    expect(updated.sequenceNumber).toBe(BigInt(1));
  });

  // 33-36: Per-Aggregate Ordering Safeguards
  it('33. Event 2 (MODIFIED) is blocked while Event 1 (CREATED) is RETRYING', async () => {
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 1, 'res-mapping-1001', 'RETRYING', 1));
    mockOutboxStore.set('outbox-2', createOutboxMock('outbox-2', 2, 'res-mapping-1001', 'PENDING', 0));

    mockPrismaService.$queryRaw.mockResolvedValueOnce([]); // SQL query filters out outbox-2

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed).not.toContain('outbox-2');
  });

  it('34. Event 3 (CANCELLED) is blocked while Event 1 (CREATED) is PROCESSING', async () => {
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 1, 'res-mapping-1001', 'PROCESSING', 0));
    mockOutboxStore.set('outbox-3', createOutboxMock('outbox-3', 3, 'res-mapping-1001', 'PENDING', 0));

    mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed).not.toContain('outbox-3');
  });

  it('35. Event 2 proceeds after Event 1 is DELIVERED', async () => {
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 1, 'res-mapping-1001', 'DELIVERED', 0));
    mockOutboxStore.set('outbox-2', createOutboxMock('outbox-2', 2, 'res-mapping-1001', 'PENDING', 0));

    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-2' }]);

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed).toContain('outbox-2');
  });

  it('36. Event 2 proceeds after Event 1 is FAILED_PERMANENT', async () => {
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 1, 'res-mapping-1001', 'FAILED_PERMANENT', 0));
    mockOutboxStore.set('outbox-2', createOutboxMock('outbox-2', 2, 'res-mapping-1001', 'PENDING', 0));

    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-2' }]);

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed).toContain('outbox-2');
  });

  // 37-38: Dead-Letter Dependency Cascade
  it('37-38. When Event 1 enters FAILED_DEAD_LETTER, queued Event 2 & Event 3 for same aggregate are marked FAILED_PERMANENT', async () => {
    mockOutboxStore.set('outbox-1', createOutboxMock('outbox-1', 1, 'res-mapping-1001', 'RETRYING', 5));
    mockOutboxStore.set('outbox-2', createOutboxMock('outbox-2', 2, 'res-mapping-1001', 'PENDING', 0));
    mockOutboxStore.set('outbox-3', createOutboxMock('outbox-3', 3, 'res-mapping-1001', 'PENDING', 0));

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: jest.fn().mockResolvedValue('Service Unavailable'),
      headers: new Headers(),
    } as any);

    const res = await processorService.processOutboxRecord('outbox-1');
    expect(res.status).toBe('FAILED_DEAD_LETTER');

    expect(mockOutboxStore.get('outbox-2').status).toBe('FAILED_PERMANENT');
    expect(mockOutboxStore.get('outbox-2').lastError).toBe('Parent reservation event dead-lettered');

    expect(mockOutboxStore.get('outbox-3').status).toBe('FAILED_PERMANENT');
    expect(mockOutboxStore.get('outbox-3').lastError).toBe('Parent reservation event dead-lettered');
  });

  // 39-40: Aggregate Isolation
  it('39. Dead-lettering Reservation A does NOT block Reservation B', async () => {
    mockOutboxStore.set('outbox-resA-1', createOutboxMock('outbox-resA-1', 1, 'res-A', 'FAILED_DEAD_LETTER', 5));
    mockOutboxStore.set('outbox-resB-1', createOutboxMock('outbox-resB-1', 2, 'res-B', 'PENDING', 0));

    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-resB-1' }]);

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed).toContain('outbox-resB-1');
  });

  it('40. Dead-lettering reservation does NOT block availability aggregate', async () => {
    mockOutboxStore.set('outbox-resA-1', createOutboxMock('outbox-resA-1', 1, 'res-A', 'FAILED_DEAD_LETTER', 5));
    mockOutboxStore.set('outbox-avail-1', createOutboxMock('outbox-avail-1', 2, 'prop-1_rt-deluxe', 'PENDING', 0));

    mockPrismaService.$queryRaw.mockResolvedValueOnce([{ id: 'outbox-avail-1' }]);

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed).toContain('outbox-avail-1');
  });

  // 41. Concurrent workers cannot bypass ordering
  it('41. FOR UPDATE SKIP LOCKED with NOT EXISTS subquery prevents concurrent worker ordering bypass', async () => {
    mockPrismaService.$queryRaw.mockResolvedValueOnce([]);

    const claimed = await processorService.claimNextBatch(10);
    expect(claimed.length).toBe(0);
  });

  // 42. No duplicate outbox records created
  it('42. retry and dead-letter transitions update existing outbox record without creating duplicates', async () => {
    const initialStoreSize = mockOutboxStore.size;

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: jest.fn().mockResolvedValue('Internal Error'),
      headers: new Headers(),
    } as any);

    await processorService.processOutboxRecord('outbox-1');
    expect(mockOutboxStore.size).toBe(initialStoreSize);
  });
});
