import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { PricingService } from '../bookings/pricing.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityRestrictionsService } from './services/connectivity-restrictions.service';

describe('Connectivity Platform Phase 2B Unit Tests (Restrictions)', () => {
  let availabilityService: AvailabilityService;
  let restrictionsService: ConnectivityRestrictionsService;

  const mockPrismaService = {
    stopSellRestriction: {
      findMany: jest.fn(),
    },
    restrictionRule: {
      findMany: jest.fn(),
      create: jest.fn(),
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

  const mockPricingService = {
    getPublishedDailyRates: jest.fn(),
  };

  const mockSystemSettingsService = {
    getSetting: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        ConnectivityRestrictionsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: SystemSettingsService, useValue: mockSystemSettingsService },
      ],
    }).compile();

    availabilityService = module.get<AvailabilityService>(AvailabilityService);
    restrictionsService = module.get<ConnectivityRestrictionsService>(ConnectivityRestrictionsService);
  });

  describe('Overlapping Rules & Resolution Priority', () => {
    it('should prioritize RoomType-specific restriction over property-wide fallback', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: null, // Property-wide: minStayArrival = 2
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
          minStayArrival: 2,
          minStayThrough: null,
          maxStay: 10,
          closedToArrival: false,
          closedToDeparture: false,
        },
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe', // Specific RoomType: minStayArrival = 4
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
          minStayArrival: 4,
          minStayThrough: null,
          maxStay: 7,
          closedToArrival: true,
          closedToDeparture: false,
        },
      ]);

      const result = await availabilityService.evaluateRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-01');
      const eff = result.get('2026-09-01');

      expect(eff).toBeDefined();
      expect(eff?.minStayArrival).toBe(4); // Specific RoomType rule overrides property-wide
      expect(eff?.maxStay).toBe(7);
      expect(eff?.closedToArrival).toBe(true);
    });

    it('should resolve overlapping rules using most restrictive parameters (max minStay, min maxStay, CTA/CTD true if any)', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
          minStayArrival: 2,
          maxStay: 10,
          closedToArrival: true,
          closedToDeparture: false,
        },
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
          minStayArrival: 5, // Higher minStay wins (5 > 2)
          maxStay: 6,  // Lower maxStay wins (6 < 10)
          closedToArrival: false,
          closedToDeparture: true, // CTD true wins
        },
      ]);

      const result = await availabilityService.evaluateRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-01');
      const eff = result.get('2026-09-01');

      expect(eff?.minStayArrival).toBe(5);
      expect(eff?.maxStay).toBe(6);
      expect(eff?.closedToArrival).toBe(true);
      expect(eff?.closedToDeparture).toBe(true);
    });
  });

  describe('Booking Validation Engine', () => {
    it('should reject booking if arrival date has Closed To Arrival (CTA = true)', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
          closedToArrival: true,
        },
      ]);

      await expect(
        availabilityService.validateBookingRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-03'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking if departure date has Closed To Departure (CTD = true)', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-03T00:00:00Z'),
          endDate: new Date('2026-09-03T00:00:00Z'),
          closedToDeparture: true,
        },
      ]);

      await expect(
        availabilityService.validateBookingRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-03'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking if stay duration is shorter than Minimum Stay requirement', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-05T00:00:00Z'),
          minStayArrival: 3, // Requires at least 3 nights
        },
      ]);

      // Attempt 2-night stay (checkIn 09-01, checkOut 09-03)
      await expect(
        availabilityService.validateBookingRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-03'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject booking if stay duration exceeds Maximum Stay limit', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-10T00:00:00Z'),
          maxStay: 4, // Maximum 4 nights allowed
        },
      ]);

      // Attempt 6-night stay (checkIn 09-01, checkOut 09-07)
      await expect(
        availabilityService.validateBookingRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-07'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid stay that satisfies all active restrictions', async () => {
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.restrictionRule.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          startDate: new Date('2026-09-01T00:00:00Z'),
          endDate: new Date('2026-09-10T00:00:00Z'),
          minStayArrival: 2,
          maxStay: 5,
          closedToArrival: false,
          closedToDeparture: false,
        },
      ]);

      // Valid 3-night stay
      await expect(
        availabilityService.validateBookingRestrictions('prop-1', 'rt-deluxe', '2026-09-01', '2026-09-04'),
      ).resolves.not.toThrow();
    });
  });

  describe('PUT /api/connectivity/v1/restrictions (Write API)', () => {
    it('should throw ForbiddenException if restrictionSync is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ restrictionSync: false });

      await expect(
        restrictionsService.updateRestrictions('partner-1', {
          propertyId: 'prop-1',
          restrictions: [],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should process date-range restriction updates for authorized partner', async () => {
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
      mockPrismaService.restrictionRule.create.mockResolvedValue({
        id: 'rule-100',
        propertyId: 'prop-1',
        roomTypeId: 'rt-deluxe',
        startDate: new Date('2026-09-01T00:00:00Z'),
        endDate: new Date('2026-09-05T00:00:00Z'),
        minStayArrival: 3,
        minStayThrough: null,
        maxStay: 7,
        closedToArrival: false,
        closedToDeparture: true,
      });

      const result = await restrictionsService.updateRestrictions('partner-1', {
        propertyId: 'prop-1',
        restrictions: [
          {
            externalRoomTypeId: 'DLX',
            startDate: '2026-09-01',
            endDate: '2026-09-05',
            minStayArrival: 3,
            maxStay: 7,
            closedToDeparture: true,
          },
        ],
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.updatedRules).toHaveLength(1);
      expect(result.updatedRules[0].minStayArrival).toBe(3);
      expect(result.updatedRules[0].closedToDeparture).toBe(true);
    });
  });
});
