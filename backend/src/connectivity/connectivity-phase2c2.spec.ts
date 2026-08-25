import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';

describe('Connectivity Platform Phase 2C-2 Unit Tests (External Availability Updates)', () => {
  let availabilityService: ConnectivityAvailabilityService;

  const mockPartner = {
    id: 'partner-1',
    name: 'Channex Partner',
    code: 'CHANNEX',
  };

  const mockPrismaService = {
    booking: {
      findMany: jest.fn(),
    },
    stopSellRestriction: {
      findMany: jest.fn(),
    },
    room: {
      count: jest.fn(),
    },
    connectivityAvailabilityOverride: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityAvailabilityService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityLogService, useValue: mockLogService },
      ],
    }).compile();

    availabilityService = module.get<ConnectivityAvailabilityService>(ConnectivityAvailabilityService);
  });

  describe('Capability & Validation Checks', () => {
    it('should throw ForbiddenException if availabilitySync capability is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: false });

      await expect(
        availabilityService.updateAvailability(mockPartner, {
          propertyId: 'prop-1',
          availability: [
            {
              externalRoomTypeId: 'DLX',
              startDate: '2026-09-10',
              endDate: '2026-09-15',
              sellableQuantity: 3,
            },
          ],
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if sellableQuantity is negative', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      await expect(
        availabilityService.updateAvailability(mockPartner, {
          propertyId: 'prop-1',
          availability: [
            {
              externalRoomTypeId: 'DLX',
              startDate: '2026-09-10',
              endDate: '2026-09-15',
              sellableQuantity: -5,
            },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Effective Availability Calculation & Capping Math', () => {
    it('should evaluate Effective Availability = MIN(Physical, ExternalCap) correctly', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.room.count.mockResolvedValue(5); // Physical capacity = 5

      // Mock External Cap = 3
      mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          date: new Date('2026-09-10T00:00:00Z'),
          allocatedQuantity: 3,
        },
      ]);

      const result = await availabilityService.getAvailability('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
      });

      expect(result.availability).toHaveLength(1);
      expect(result.availability[0].physicalAvailability).toBe(5);
      expect(result.availability[0].externalAllocationCap).toBe(3);
      expect(result.availability[0].sellableQuantity).toBe(3); // MIN(5, 3) = 3
    });

    it('should NEVER exceed physical capacity even if external cap is higher than physical rooms', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.room.count.mockResolvedValue(2); // Physical capacity = 2

      // External PMS attempts to set Cap = 10
      mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([
        {
          propertyId: 'prop-1',
          roomTypeId: 'rt-deluxe',
          date: new Date('2026-09-10T00:00:00Z'),
          allocatedQuantity: 10,
        },
      ]);

      const result = await availabilityService.getAvailability('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
      });

      expect(result.availability[0].sellableQuantity).toBe(2); // MIN(2, 10) = 2 (Physical limit enforced)
    });

    it('should fall back to Physical Availability when external allocation cap is removed/reset', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.booking.findMany.mockResolvedValue([]);
      mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
      mockPrismaService.room.count.mockResolvedValue(5);
      mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([]); // No cap

      const result = await availabilityService.getAvailability('partner-1', {
        propertyId: 'prop-1',
        startDate: '2026-09-10',
        endDate: '2026-09-10',
      });

      expect(result.availability[0].sellableQuantity).toBe(5); // Physical = 5, No cap = 5
      expect(result.availability[0].externalAllocationCap).toBeNull();
    });
  });

  describe('Allocation Cap Override CRUD Operations', () => {
    it('should upsert ConnectivityAvailabilityOverride records for date range', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.connectivityAvailabilityOverride.upsert.mockResolvedValue({
        id: 'override-1',
        propertyId: 'prop-1',
        roomTypeId: 'rt-deluxe',
        date: new Date('2026-09-10T00:00:00Z'),
        allocatedQuantity: 3,
      });

      const result = await availabilityService.updateAvailability(mockPartner, {
        propertyId: 'prop-1',
        availability: [
          {
            externalRoomTypeId: 'DLX',
            startDate: '2026-09-10',
            endDate: '2026-09-10',
            sellableQuantity: 3,
          },
        ],
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.updatedOverrides).toHaveLength(1);
      expect(result.updatedOverrides[0].allocatedQuantity).toBe(3);
      expect(mockPrismaService.connectivityAvailabilityOverride.upsert).toHaveBeenCalled();
      expect(mockLogService.createLog).toHaveBeenCalled();
    });

    it('should delete override records when sellableQuantity is null (Reset / Remove Cap)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ availabilitySync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.connectivityAvailabilityOverride.deleteMany.mockResolvedValue({ count: 1 });

      const result = await availabilityService.updateAvailability(mockPartner, {
        propertyId: 'prop-1',
        availability: [
          {
            externalRoomTypeId: 'DLX',
            startDate: '2026-09-10',
            endDate: '2026-09-10',
            sellableQuantity: null,
          },
        ],
      });

      expect(result.status).toBe('SUCCESS');
      expect(mockPrismaService.connectivityAvailabilityOverride.deleteMany).toHaveBeenCalled();
    });
  });
});
