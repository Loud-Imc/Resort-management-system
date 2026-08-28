import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';
import { ConnectivityRatesService } from './services/connectivity-rates.service';
import { ConnectivityRestrictionsService } from './services/connectivity-restrictions.service';
import { PricingService } from '../bookings/pricing.service';

describe('Connectivity Platform Phase 2A Unit Tests', () => {
  let availabilityService: ConnectivityAvailabilityService;
  let ratesService: ConnectivityRatesService;
  let restrictionsService: ConnectivityRestrictionsService;

  const mockPrismaService = {
    room: {
      count: jest.fn(),
    },
    booking: {
      findMany: jest.fn(),
    },
    stopSellRestriction: {
      findMany: jest.fn(),
    },
    connectivityAvailabilityOverride: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  const mockConnectionService = {
    getConnectionForPartnerAndProperty: jest.fn(),
  };

  const mockMappingService = {
    getRoomMappingsForConnection: jest.fn(),
  };

  const mockSettingsService = {
    getGlobalCapabilities: jest.fn(),
  };

  const mockLogService = {
    createLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };

  const mockPricingService = {
    getPublishedDailyRates: jest.fn(),
  };

  const mockAvailabilityService = {
    evaluateRestrictions: jest.fn().mockResolvedValue(new Map()),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityAvailabilityService,
        ConnectivityRatesService,
        ConnectivityRestrictionsService,
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityLogService, useValue: mockLogService },
        { provide: PricingService, useValue: mockPricingService },
      ],
    }).compile();

    availabilityService = module.get<ConnectivityAvailabilityService>(ConnectivityAvailabilityService);
    ratesService = module.get<ConnectivityRatesService>(ConnectivityRatesService);
    restrictionsService = module.get<ConnectivityRestrictionsService>(ConnectivityRestrictionsService);
  });

  describe('ConnectivityAvailabilityService (Phase 2A Read)', () => {
    it('should throw ForbiddenException if availabilitySync capability is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: false });

      await expect(
        availabilityService.getAvailability('partner-1', {
          propertyId: 'prop-1',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if no room mappings exist for the connection', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([]);

      await expect(
        availabilityService.getAvailability('partner-1', {
          propertyId: 'prop-1',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate correct RoomType sellable quantity (total enabled rooms minus active bookings)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        {
          id: 'map-1',
          roomTypeId: 'rt-deluxe',
          externalRoomTypeId: 'DLX',
        },
      ]);
      mockPrismaService.booking.findMany.mockResolvedValue([
        {
          roomTypeId: 'rt-deluxe',
          checkInDate: new Date('2026-09-01T00:00:00Z'),
          checkOutDate: new Date('2026-09-03T00:00:00Z'),
        },
      ]);
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.room.count.mockResolvedValue(5); // 5 physical rooms

      const result = await availabilityService.getAvailability('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      });

      expect(result.propertyId).toBe('prop-1');
      expect(result.externalPropertyId).toBe('EXT-PROP-1');
      expect(result.availability).toHaveLength(1);
      expect(result.availability[0].externalRoomTypeId).toBe('DLX');
      expect(result.availability[0].sellableQuantity).toBe(4); // 5 physical - 1 booked = 4
      expect(result.availability[0].isStopSell).toBe(false);
    });

    it('should return sellableQuantity = 0 when StopSell is active for that date', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        {
          id: 'map-1',
          roomTypeId: 'rt-deluxe',
          externalRoomTypeId: 'DLX',
        },
      ]);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([
        {
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
        },
      ]);
      mockPrismaService.room.count.mockResolvedValue(5);

      const result = await availabilityService.getAvailability('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      });

      expect(result.availability[0].sellableQuantity).toBe(0);
      expect(result.availability[0].isStopSell).toBe(true);
    });
  });

  describe('ConnectivityRatesService (Phase 2A Read)', () => {
    it('should throw ForbiddenException if rateSync capability is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: false });

      await expect(
        ratesService.getRates('partner-1', {
          propertyId: 'prop-1',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should fetch daily published rates using PricingService SSOT', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        {
          id: 'map-1',
          roomTypeId: 'rt-deluxe',
          externalRoomTypeId: 'DLX',
          externalRatePlanId: 'BAR',
        },
      ]);
      mockPricingService.getPublishedDailyRates.mockResolvedValue([
        {
          date: '2026-09-01',
          roomTypeId: 'rt-deluxe',
          publishedPrice: 6160,
          convertedPublishedPrice: 6160,
          baseCurrency: 'INR',
          targetCurrency: 'INR',
          exchangeRate: 1,
          breakdown: {
            originalBasePrice: 5500,
            basePrice: 5500,
            effectivePriceBeforeTax: 5500,
            taxAmount: 660,
            taxRate: 0.12,
            isGstInclusive: false,
            gstMode: 'EXCLUSIVE',
          },
        },
      ]);

      const result = await ratesService.getRates('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
        currency: 'INR',
      });

      expect(result.rates).toHaveLength(1);
      expect(result.rates[0].price).toBe(6160);
      expect(result.rates[0].currency).toBe('INR');
      expect(result.rates[0].externalRatePlanId).toBe('BAR');
    });
  });

  describe('ConnectivityRestrictionsService (Phase 2A Read)', () => {
    it('should throw ForbiddenException if restrictionSync capability is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ restrictionSync: false });

      await expect(
        restrictionsService.getRestrictions('partner-1', {
          propertyId: 'prop-1',
          startDate: '2026-09-01',
          endDate: '2026-09-02',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should return contract-ready restriction response including stopSell status', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ restrictionSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        {
          id: 'map-1',
          roomTypeId: 'rt-deluxe',
          externalRoomTypeId: 'DLX',
        },
      ]);
      mockAvailabilityService.evaluateRestrictions.mockResolvedValue(
        new Map([
          [
            '2026-09-01',
            {
              stopSell: true,
              minStayArrival: null,
              minStayThrough: null,
              maxStay: null,
              closedToArrival: false,
              closedToDeparture: false,
            },
          ],
        ]),
      );

      const result = await restrictionsService.getRestrictions('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-01',
        endDate: '2026-09-01',
      });

      expect(result.restrictions).toHaveLength(1);
      expect(result.restrictions[0].stopSell).toBe(true);
      expect(result.restrictions[0].minStayArrival).toBeNull();
      expect(result.restrictions[0].closedToArrival).toBe(false);
    });
  });
});
