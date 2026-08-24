import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { PricingService } from '../bookings/pricing.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityRatesService } from './services/connectivity-rates.service';
import { PricingAdjustmentType } from '@prisma/client';

describe('Connectivity Platform Phase 2C-1 Unit Tests (External Rate Updates)', () => {
  let ratesService: ConnectivityRatesService;

  const mockPartner = {
    id: 'partner-1',
    name: 'Channex Partner',
    code: 'CHANNEX',
  };

  const mockPrismaService = {
    roomType: {
      findUnique: jest.fn(),
    },
    pricingRule: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
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

  const mockSystemSettingsService = {
    getSetting: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityRatesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityLogService, useValue: mockLogService },
        { provide: PricingService, useValue: mockPricingService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: SystemSettingsService, useValue: mockSystemSettingsService },
      ],
    }).compile();

    ratesService = module.get<ConnectivityRatesService>(ConnectivityRatesService);
  });

  describe('Capability & Access Validation', () => {
    it('should throw ForbiddenException if rateSync capability is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: false });

      await expect(
        ratesService.updateRates(mockPartner, {
          propertyId: 'prop-1',
          rates: [
            {
              externalRoomTypeId: 'DLX',
              startDate: '2026-09-10',
              endDate: '2026-09-15',
              price: 6500,
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if rates array is empty', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      await expect(
        ratesService.updateRates(mockPartner, {
          propertyId: 'prop-1',
          rates: [],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Mapping & Data Sanity Validation', () => {
    it('should throw BadRequestException if externalRoomTypeId is not mapped', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      await expect(
        ratesService.updateRates(mockPartner, {
          propertyId: 'prop-1',
          rates: [
            {
              externalRoomTypeId: 'SUITE_UNMAPPED',
              startDate: '2026-09-10',
              endDate: '2026-09-15',
              price: 6500,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if price is zero or negative', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      await expect(
        ratesService.updateRates(mockPartner, {
          propertyId: 'prop-1',
          rates: [
            {
              externalRoomTypeId: 'DLX',
              startDate: '2026-09-10',
              endDate: '2026-09-15',
              price: -50,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('PricingRule Integration & Idempotency', () => {
    it('should create new PricingRule with adjustmentValue = targetPrice - basePrice without altering basePrice', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.roomType.findUnique.mockResolvedValue({
        id: 'rt-deluxe',
        propertyId: 'prop-1',
        basePrice: 5000, // Baseline basePrice = 5000
      });
      mockPrismaService.pricingRule.findFirst.mockResolvedValue(null);
      mockPrismaService.pricingRule.create.mockResolvedValue({
        id: 'rule-99',
        name: 'EXTERNAL_RATE_SYNC:CHANNEX',
        startDate: new Date('2026-09-10T00:00:00Z'),
        endDate: new Date('2026-09-15T00:00:00Z'),
        adjustmentType: PricingAdjustmentType.FIXED_AMOUNT,
        adjustmentValue: 1500, // 6500 - 5000 = 1500
        roomTypeId: 'rt-deluxe',
        isActive: true,
      });

      const result = await ratesService.updateRates(mockPartner, {
        propertyId: 'prop-1',
        rates: [
          {
            externalRoomTypeId: 'DLX',
            startDate: '2026-09-10',
            endDate: '2026-09-15',
            price: 6500,
          },
        ],
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.updatedRules).toHaveLength(1);
      expect(result.updatedRules[0].price).toBe(6500);
      expect(result.updatedRules[0].basePrice).toBe(5000);
      expect(result.updatedRules[0].adjustmentValue).toBe(1500);
      expect(mockPrismaService.pricingRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'EXTERNAL_RATE_SYNC:CHANNEX',
          roomTypeId: 'rt-deluxe',
          adjustmentType: PricingAdjustmentType.FIXED_AMOUNT,
          adjustmentValue: 1500,
          isActive: true,
        }),
      });
      expect(mockLogService.createLog).toHaveBeenCalled();
    });

    it('should update existing PricingRule on repeated update without creating duplicates (idempotency)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ rateSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.roomType.findUnique.mockResolvedValue({
        id: 'rt-deluxe',
        propertyId: 'prop-1',
        basePrice: 5000,
      });
      mockPrismaService.pricingRule.findFirst.mockResolvedValue({
        id: 'rule-99',
        name: 'EXTERNAL_RATE_SYNC:CHANNEX',
        roomTypeId: 'rt-deluxe',
        startDate: new Date('2026-09-10T00:00:00Z'),
        endDate: new Date('2026-09-15T00:00:00Z'),
        adjustmentValue: 1500,
        isActive: true,
      });
      mockPrismaService.pricingRule.update.mockResolvedValue({
        id: 'rule-99',
        name: 'EXTERNAL_RATE_SYNC:CHANNEX',
        adjustmentType: PricingAdjustmentType.FIXED_AMOUNT,
        adjustmentValue: 2000, // Updated target price = 7000 (7000 - 5000 = 2000)
        isActive: true,
      });

      const result = await ratesService.updateRates(mockPartner, {
        propertyId: 'prop-1',
        rates: [
          {
            externalRoomTypeId: 'DLX',
            startDate: '2026-09-10',
            endDate: '2026-09-15',
            price: 7000,
          },
        ],
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockPrismaService.pricingRule.create).not.toHaveBeenCalled();
      expect(mockPrismaService.pricingRule.update).toHaveBeenCalledWith({
        where: { id: 'rule-99' },
        data: {
          adjustmentType: PricingAdjustmentType.FIXED_AMOUNT,
          adjustmentValue: 2000,
          isActive: true,
        },
      });
    });
  });
});
