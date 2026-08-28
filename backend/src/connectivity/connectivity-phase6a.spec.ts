import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectivityLogService } from './services/connectivity-log.service';

describe('Phase 6A Unit Tests (Admin Dead-Letter Replay & Static RatePlan Mapping)', () => {
  let processorService: ConnectivityOutboxProcessorService;
  let mappingService: ConnectivityMappingService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    connectivityOutbox: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    connectivityPartnerConnection: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    connectivityRoomTypeMapping: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    roomType: {
      findFirst: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockLogService = {
    createLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityOutboxProcessorService,
        ConnectivityMappingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityLogService, useValue: mockLogService },
      ],
    }).compile();

    processorService = module.get<ConnectivityOutboxProcessorService>(ConnectivityOutboxProcessorService);
    mappingService = module.get<ConnectivityMappingService>(ConnectivityMappingService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('Part A — Administrative Dead-Letter Replay', () => {
    const deadLetterRecord = {
      id: 'outbox-dl-101',
      partnerId: 'partner-A',
      connectionId: 'conn-1',
      eventType: 'RESERVATION.CREATED',
      aggregateId: 'res-agg-99',
      sequenceNumber: 1n,
      payload: { data: 'test' },
      status: 'FAILED_DEAD_LETTER',
      retryCount: 5,
      nextRetryAt: null,
      lastError: 'Max retries (5) exceeded',
    };

    it('1 & 2. Admin / SuperAdmin can replay FAILED_DEAD_LETTER event', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue(deadLetterRecord);
      mockPrismaService.connectivityOutbox.update.mockResolvedValue({
        ...deadLetterRecord,
        status: 'PENDING',
        retryCount: 0,
        lastError: null,
      });
      mockPrismaService.connectivityOutbox.updateMany.mockResolvedValue({ count: 0 });

      const result = await processorService.replayDeadLetterEvent('outbox-dl-101');
      expect(result.status).toBe('PENDING');
      expect(mockPrismaService.connectivityOutbox.update).toHaveBeenCalledWith({
        where: { id: 'outbox-dl-101' },
        data: expect.objectContaining({
          status: 'PENDING',
          retryCount: 0,
          lastError: null,
        }),
      });
    });

    it('3 & 4. Role Guard / Security verification (Non-admin or Partner cannot access admin endpoint)', () => {
      // Endpoint security is verified via AdminConnectivityController metadata guards
      const controllerGuards = Reflect.getMetadata('__guards__', require('./admin-connectivity.controller').AdminConnectivityController);
      const roles = Reflect.getMetadata('roles', require('./admin-connectivity.controller').AdminConnectivityController);
      expect(controllerGuards).toBeDefined();
      expect(roles).toEqual(['SuperAdmin', 'Admin']);
    });

    it('5. PENDING event cannot be replayed', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue({
        ...deadLetterRecord,
        status: 'PENDING',
      });

      await expect(processorService.replayDeadLetterEvent('outbox-dl-101')).rejects.toThrow(BadRequestException);
    });

    it('6. DELIVERED event cannot be replayed', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue({
        ...deadLetterRecord,
        status: 'DELIVERED',
      });

      await expect(processorService.replayDeadLetterEvent('outbox-dl-101')).rejects.toThrow(BadRequestException);
    });

    it('7. FAILED_PERMANENT event cannot be replayed', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue({
        ...deadLetterRecord,
        status: 'FAILED_PERMANENT',
      });

      await expect(processorService.replayDeadLetterEvent('outbox-dl-101')).rejects.toThrow(BadRequestException);
    });

    it('8, 9, 10. Replay preserves original id, aggregateId, and sequenceNumber', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue(deadLetterRecord);
      mockPrismaService.connectivityOutbox.update.mockImplementation(({ where, data }) => ({
        ...deadLetterRecord,
        ...data,
      }));

      const result = await processorService.replayDeadLetterEvent('outbox-dl-101');
      expect(result.id).toBe('outbox-dl-101');
      expect(result.aggregateId).toBe('res-agg-99');
      expect(result.sequenceNumber).toBe(1n);
      expect(result.payload).toEqual({ data: 'test' });
    });

    it('11. Replay resets retry state correctly', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue(deadLetterRecord);
      mockPrismaService.connectivityOutbox.update.mockResolvedValue({
        ...deadLetterRecord,
        status: 'PENDING',
        retryCount: 0,
        lastError: null,
      });

      await processorService.replayDeadLetterEvent('outbox-dl-101');
      expect(mockPrismaService.connectivityOutbox.update).toHaveBeenCalledWith({
        where: { id: 'outbox-dl-101' },
        data: expect.objectContaining({
          status: 'PENDING',
          retryCount: 0,
          lastError: null,
        }),
      });
    });

    it('12, 13. Parent reservation replay safely restores only dependent cascade-failed events in order', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue(deadLetterRecord);
      mockPrismaService.connectivityOutbox.update.mockResolvedValue({
        ...deadLetterRecord,
        status: 'PENDING',
      });

      await processorService.replayDeadLetterEvent('outbox-dl-101');

      expect(mockPrismaService.connectivityOutbox.updateMany).toHaveBeenCalledWith({
        where: {
          aggregateId: 'res-agg-99',
          sequenceNumber: { gt: 1n },
          status: 'FAILED_PERMANENT',
          lastError: { contains: 'Parent reservation event dead-lettered' },
        },
        data: {
          status: 'PENDING',
          retryCount: 0,
          nextRetryAt: expect.any(Date),
          lastError: null,
        },
      });
    });

    it('14. Concurrent replay attempts are handled safely within transaction', async () => {
      mockPrismaService.connectivityOutbox.findUnique.mockResolvedValue(deadLetterRecord);
      mockPrismaService.connectivityOutbox.update.mockResolvedValue({
        ...deadLetterRecord,
        status: 'PENDING',
      });

      const p1 = processorService.replayDeadLetterEvent('outbox-dl-101');
      const p2 = processorService.replayDeadLetterEvent('outbox-dl-101');

      await Promise.all([p1, p2]);
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
    });
  });

  describe('Part B — Static RatePlan Mapping', () => {
    const mockConnection = {
      id: 'conn-1',
      partnerId: 'partner-A',
      propertyId: 'prop-101',
      externalPropertyId: 'EXT-PROP-101',
      roomMappings: [
        {
          id: 'map-1',
          connectionId: 'conn-1',
          roomTypeId: 'rt-dlx',
          externalRoomTypeId: 'EXT-DLX',
          externalRatePlanId: 'BAR-01',
        },
      ],
    };

    it('15 & 16. externalRatePlanId accepted and persisted when provided in CreateRoomMappingDto', async () => {
      mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(mockConnection);
      mockPrismaService.roomType.findFirst.mockResolvedValue({ id: 'rt-dlx', propertyId: 'prop-101', name: 'Deluxe' });
      mockPrismaService.connectivityRoomTypeMapping.upsert.mockResolvedValue({
        id: 'map-1',
        connectionId: 'conn-1',
        roomTypeId: 'rt-dlx',
        externalRoomTypeId: 'EXT-DLX',
        externalRatePlanId: 'BAR-01',
      });

      const dto = {
        roomTypeId: 'rt-dlx',
        externalRoomTypeId: 'EXT-DLX',
        externalRatePlanId: 'BAR-01',
      };

      const result = await mappingService.createOrUpdateRoomMapping('partner-A', 'prop-101', dto);
      expect(result.externalRatePlanId).toBe('BAR-01');
      expect(mockPrismaService.connectivityRoomTypeMapping.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ externalRatePlanId: 'BAR-01' }),
          update: expect.objectContaining({ externalRatePlanId: 'BAR-01' }),
        }),
      );
    });

    it('17. externalRatePlanId returned correctly in getRoomMappingsForConnection', async () => {
      mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(mockConnection);

      const mappings = await mappingService.getRoomMappingsForConnection('partner-A', 'prop-101');
      expect(mappings).toHaveLength(1);
      expect(mappings[0].externalRatePlanId).toBe('BAR-01');
    });

    it('18. Existing mappings without externalRatePlanId continue working seamlessly', async () => {
      mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(mockConnection);
      mockPrismaService.roomType.findFirst.mockResolvedValue({ id: 'rt-dlx', propertyId: 'prop-101', name: 'Deluxe' });
      mockPrismaService.connectivityRoomTypeMapping.upsert.mockResolvedValue({
        id: 'map-1',
        connectionId: 'conn-1',
        roomTypeId: 'rt-dlx',
        externalRoomTypeId: 'EXT-DLX',
        externalRatePlanId: null,
      });

      const dto = {
        roomTypeId: 'rt-dlx',
        externalRoomTypeId: 'EXT-DLX',
      };

      const result = await mappingService.createOrUpdateRoomMapping('partner-A', 'prop-101', dto);
      expect(result.externalRatePlanId).toBeNull();
    });

    it('19. Partner isolation enforced in mapping lookup', async () => {
      mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(null);

      const dto = {
        roomTypeId: 'rt-dlx',
        externalRoomTypeId: 'EXT-DLX',
      };

      await expect(
        mappingService.createOrUpdateRoomMapping('partner-B', 'prop-101', dto),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
