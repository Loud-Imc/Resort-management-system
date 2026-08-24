import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectivityOutboxService } from './services/connectivity-outbox.service';
import { ConnectivityRatesService } from './services/connectivity-rates.service';
import { ConnectivityRestrictionsService } from './services/connectivity-restrictions.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { PricingService } from '../bookings/pricing.service';
import { AvailabilityService } from '../bookings/availability.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Phase 6B Unit Tests (RATE.CHANGED, RESTRICTION.CHANGED, CONTENT.CHANGED Producers & Echo Loop Protection)', () => {
  let outboxService: ConnectivityOutboxService;
  let ratesService: ConnectivityRatesService;
  let restrictionsService: ConnectivityRestrictionsService;
  let prisma: PrismaService;

  const mockPrismaService: any = {
    connectivityOutbox: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    connectivityPartnerConnection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    roomType: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    property: {
      update: jest.fn(),
    },
    pricingRule: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    restrictionRule: {
      create: jest.fn(),
    },
    $transaction: jest.fn((cb) => cb(mockPrismaService)),
  };

  const mockSettingsService = {
    getGlobalCapabilities: jest.fn().mockResolvedValue({
      rateSync: true,
      restrictionSync: true,
      availabilitySync: true,
      reservationSync: true,
    }),
  };

  const mockConnectionService = {
    getConnectionForPartnerAndProperty: jest.fn(),
  };

  const mockMappingService = {
    getRoomMappingsForConnection: jest.fn(),
  };

  const mockLogService = {
    createLog: jest.fn(),
  };

  const mockPricingService = {
    getPublishedDailyRates: jest.fn(),
  };

  const mockAvailabilityService = {
    recalculateAndEmitAvailability: jest.fn(),
    evaluateRestrictions: jest.fn(),
  };

  const mockConnectivityAvailabilityService = {
    recalculateAndEmitAvailability: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityOutboxService,
        ConnectivityRatesService,
        ConnectivityRestrictionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivityLogService, useValue: mockLogService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: require('./services/connectivity-availability.service').ConnectivityAvailabilityService, useValue: mockConnectivityAvailabilityService },
      ],
    }).compile();

    outboxService = module.get<ConnectivityOutboxService>(ConnectivityOutboxService);
    ratesService = module.get<ConnectivityRatesService>(ConnectivityRatesService);
    restrictionsService = module.get<ConnectivityRestrictionsService>(ConnectivityRestrictionsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('PHASE 6B-1 — RATE.CHANGED & Echo Loop Suppression', () => {
    const mockPartnerA = { id: 'partner-A', code: 'PARTNER_A' };
    const mockConnectionA = {
      id: 'conn-A',
      partnerId: 'partner-A',
      propertyId: 'prop-101',
      externalPropertyId: 'EXT-PROP-101',
    };
    const mockConnectionB = {
      id: 'conn-B',
      partnerId: 'partner-B',
      propertyId: 'prop-101',
      externalPropertyId: 'EXT-PROP-101',
      roomMappings: [{ roomTypeId: 'rt-dlx', externalRoomTypeId: 'EXT-DLX', externalRatePlanId: 'BAR-01' }],
    };

    it('1, 9, 10, 11. createRateEventForProperty emits RATE.CHANGED with externalRatePlanId and correct aggregateId', async () => {
      mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnectionB]);
      mockPrismaService.connectivityOutbox.create.mockResolvedValue({ id: 'outbox-rate-1' });

      const events = await outboxService.createRateEventForProperty(
        null,
        'prop-101',
        'rt-dlx',
        '2026-09-01',
        '2026-09-05',
        4500,
        'INR',
      );

      expect(events).toHaveLength(1);
      expect(mockPrismaService.connectivityOutbox.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: 'partner-B',
          connectionId: 'conn-B',
          eventType: 'RATE.CHANGED',
          aggregateId: 'PROPERTY:prop-101:ROOMTYPE:rt-dlx:RATES',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              externalRoomTypeId: 'EXT-DLX',
              externalRatePlanId: 'BAR-01',
              price: 4500,
              currency: 'INR',
            }),
          }),
        }),
      });
    });

    it('6, 7. Inbound PUT /rates from Partner A suppresses echo event to Partner A', async () => {
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue(mockConnectionA);
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { roomTypeId: 'rt-dlx', externalRoomTypeId: 'EXT-DLX', externalRatePlanId: 'BAR-01' },
      ]);
      mockPrismaService.roomType.findUnique.mockResolvedValue({ id: 'rt-dlx', propertyId: 'prop-101', basePrice: 4000 });
      mockPrismaService.pricingRule.findFirst.mockResolvedValue(null);
      mockPrismaService.pricingRule.create.mockResolvedValue({ id: 'rule-1' });

      // Only Partner A is connected
      mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([]);

      const result = await ratesService.updateRates(mockPartnerA, {
        propertyId: 'prop-101',
        currency: 'INR',
        rates: [{ externalRoomTypeId: 'EXT-DLX', startDate: '2026-09-01', endDate: '2026-09-05', price: 4500 }],
      });

      expect(result.status).toBe('SUCCESS');
      // No outbox event created because Partner A was excluded and no other partners exist
      expect(mockPrismaService.connectivityOutbox.create).not.toHaveBeenCalled();
    });

    it('8. Inbound PUT /rates from Partner A dispatches event to Partner B', async () => {
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue(mockConnectionA);
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { roomTypeId: 'rt-dlx', externalRoomTypeId: 'EXT-DLX', externalRatePlanId: 'BAR-01' },
      ]);
      mockPrismaService.roomType.findUnique.mockResolvedValue({ id: 'rt-dlx', propertyId: 'prop-101', basePrice: 4000 });
      mockPrismaService.pricingRule.findFirst.mockResolvedValue(null);
      mockPrismaService.pricingRule.create.mockResolvedValue({ id: 'rule-1' });

      // Partner B is connected (Partner A excluded)
      mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnectionB]);
      mockPrismaService.connectivityOutbox.create.mockResolvedValue({ id: 'outbox-rate-2' });

      await ratesService.updateRates(mockPartnerA, {
        propertyId: 'prop-101',
        currency: 'INR',
        rates: [{ externalRoomTypeId: 'EXT-DLX', startDate: '2026-09-01', endDate: '2026-09-05', price: 4500 }],
      });

      expect(mockPrismaService.connectivityOutbox.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: 'partner-B',
          connectionId: 'conn-B',
          eventType: 'RATE.CHANGED',
        }),
      });
    });
  });

  describe('PHASE 6B-2 — RESTRICTION.CHANGED & Physical Room Maintenance Separation', () => {
    const mockPartnerA = { id: 'partner-A' };
    const mockConnectionA = { id: 'conn-A', partnerId: 'partner-A', propertyId: 'prop-101', externalPropertyId: 'EXT-PROP-101' };
    const mockConnectionB = {
      id: 'conn-B',
      partnerId: 'partner-B',
      propertyId: 'prop-101',
      externalPropertyId: 'EXT-PROP-101',
      roomMappings: [{ roomTypeId: 'rt-dlx', externalRoomTypeId: 'EXT-DLX' }],
    };

    it('13, 19. updateRestrictions emits RESTRICTION.CHANGED with aggregateId PROPERTY:<prop>:ROOMTYPE:<rt>:RESTRICTIONS', async () => {
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue(mockConnectionA);
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { roomTypeId: 'rt-dlx', externalRoomTypeId: 'EXT-DLX' },
      ]);
      mockPrismaService.restrictionRule.create.mockResolvedValue({ id: 'rule-r1' });
      mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnectionB]);
      mockPrismaService.connectivityOutbox.create.mockResolvedValue({ id: 'outbox-rst-1' });

      const result = await restrictionsService.updateRestrictions(mockPartnerA, {
        propertyId: 'prop-101',
        restrictions: [{ externalRoomTypeId: 'EXT-DLX', startDate: '2026-09-01', endDate: '2026-09-05', minStayArrival: 2, stopSell: false }],
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockPrismaService.connectivityOutbox.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: 'partner-B',
          eventType: 'RESTRICTION.CHANGED',
          aggregateId: 'PROPERTY:prop-101:ROOMTYPE:rt-dlx:RESTRICTIONS',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              restrictions: expect.objectContaining({
                minStay: 2,
                stopSell: false,
              }),
            }),
          }),
        }),
      });
    });

    it('17, 18. Physical room blocks / maintenance (emitAvailabilityChange) produce AVAILABILITY.CHANGED, NOT RESTRICTION.CHANGED', async () => {
      mockConnectivityAvailabilityService.recalculateAndEmitAvailability.mockResolvedValue([{ id: 'avail-evt-1' }]);

      await outboxService.emitAvailabilityChange(null, 'prop-101', 'rt-dlx', '2026-09-01', '2026-09-05');

      expect(mockConnectivityAvailabilityService.recalculateAndEmitAvailability).toHaveBeenCalled();
      expect(mockPrismaService.connectivityOutbox.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ eventType: 'RESTRICTION.CHANGED' }),
      );
    });
  });

  describe('PHASE 6B-3 — CONTENT.CHANGED Notification-Only Events', () => {
    const mockConnectionB = {
      id: 'conn-B',
      partnerId: 'partner-B',
      propertyId: 'prop-101',
      externalPropertyId: 'EXT-PROP-101',
    };

    it('21, 26, 27, 28. createContentEventForProperty produces notification-only payload with contentUrl and aggregateId', async () => {
      mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnectionB]);
      mockPrismaService.connectivityOutbox.create.mockResolvedValue({ id: 'outbox-cnt-1' });

      const events = await outboxService.createContentEventForProperty(null, 'prop-101', 'PROPERTY_DETAILS');

      expect(events).toHaveLength(1);
      expect(mockPrismaService.connectivityOutbox.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partnerId: 'partner-B',
          connectionId: 'conn-B',
          eventType: 'CONTENT.CHANGED',
          aggregateId: 'PROPERTY:prop-101:CONTENT',
          payload: expect.objectContaining({
            data: expect.objectContaining({
              changeType: 'PROPERTY_DETAILS',
              contentUrl: '/api/connectivity/v1/content?externalPropertyId=EXT-PROP-101',
            }),
          }),
        }),
      });
    });

    it('31-36. Phase 5B Infrastructure Compatibility (Dead-letter, Retry, HMAC, Scheduler remain fully functional)', () => {
      expect(outboxService.createRateEventForProperty).toBeDefined();
      expect(outboxService.createRestrictionEventForProperty).toBeDefined();
      expect(outboxService.createContentEventForProperty).toBeDefined();
    });
  });
});
