import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Phase 8: Production Migration and Property Activation', () => {
  let propertiesService: PropertiesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      property: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      roomType: {
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(prismaMock)),
    };

    const notificationsMock: any = {};
    const auditMock: any = { log: jest.fn() };
    const systemSettingsMock: any = {};
    const pricingServiceMock: any = {};
    const mailServiceMock: any = {};

    propertiesService = new PropertiesService(
      prismaMock as any,
      notificationsMock,
      auditMock,
      systemSettingsMock,
      pricingServiceMock,
      mailServiceMock,
    );
  });

  describe('Property Readiness Audit', () => {
    it('should report V2 activation eligibility only when ALL RoomTypes are ready', async () => {
      const propertyData = {
        id: 'prop-1',
        name: 'Hilltop Haven',
        occupancyVersion: 'V1',
        roomTypes: [
          {
            id: 'rt-1',
            name: 'Deluxe Suite',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            freeChildrenCount: 1,
          },
          {
            id: 'rt-2',
            name: 'Standard Room',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 2,
            maxPhysicalAdults: 2,
            maxPhysicalChildren: 0,
            maxPhysicalInfants: 1,
            freeChildrenCount: 0,
          },
        ],
      };

      prismaMock.property.findUnique.mockResolvedValue(propertyData);

      const readiness = await propertiesService.getOccupancyReadiness('prop-1');

      expect(readiness.isEligibleForV2Activation).toBe(true);
      expect(readiness.readyRoomTypesCount).toBe(2);
      expect(readiness.blockingReasons).toHaveLength(0);
    });

    it('should block activation eligibility if any RoomType is not V2 ready', async () => {
      const propertyData = {
        id: 'prop-2',
        name: 'Seaside Resort',
        occupancyVersion: 'V1',
        roomTypes: [
          {
            id: 'rt-1',
            name: 'Ready Suite',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            freeChildrenCount: 0,
          },
          {
            id: 'rt-2',
            name: 'Unreviewed Legacy Room',
            occupancyVersion: 'V1',
            baseAdults: 2,
            maxAdults: 6, // High divergence -> REVIEW_REQUIRED
            maxChildren: 0,
            maxPhysicalAdults: 6,
            maxPhysicalChildren: 0,
          },
        ],
      };

      prismaMock.property.findUnique.mockResolvedValue(propertyData);

      const readiness = await propertiesService.getOccupancyReadiness('prop-2');

      expect(readiness.isEligibleForV2Activation).toBe(false);
      expect(readiness.readyRoomTypesCount).toBe(1);
      expect(readiness.blockingReasons.length).toBeGreaterThan(0);
    });
  });

  describe('Property V2 Activation Mechanism', () => {
    it('should atomically activate Property to V2 when all RoomTypes are V2 ready and pass Channex checks', async () => {
      const propertyData = {
        id: 'prop-1',
        name: 'Hilltop Haven',
        occupancyVersion: 'V1',
        roomTypes: [
          {
            id: 'rt-1',
            name: 'Deluxe Suite',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            freeChildrenCount: 1,
          },
        ],
      };

      prismaMock.property.findUnique.mockResolvedValue(propertyData);
      prismaMock.property.update.mockResolvedValue({ id: 'prop-1', occupancyVersion: 'V2' });

      const result = await propertiesService.activateV2Occupancy('prop-1', { id: 'admin-1' });

      expect(result.success).toBe(true);
      expect(result.occupancyVersion).toBe('V2');
      expect(prismaMock.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { occupancyVersion: 'V2' },
      });
      expect(prismaMock.roomType.updateMany).toHaveBeenCalledWith({
        where: { propertyId: 'prop-1' },
        data: { occupancyVersion: 'V2' },
      });
    });

    it('should reject activation if a RoomType has incompatible Channex configuration (B > P_A)', async () => {
      const propertyData = {
        id: 'prop-1',
        name: 'Hilltop Haven',
        occupancyVersion: 'V1',
        roomTypes: [
          {
            id: 'rt-1',
            name: 'Incompatible Suite',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 4,
            totalMaxOccupancy: 5,
            maxPhysicalAdults: 2, // B (4) > P_A (2)
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            freeChildrenCount: 0,
          },
        ],
      };

      prismaMock.property.findUnique.mockResolvedValue(propertyData);

      await expect(propertiesService.activateV2Occupancy('prop-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(prismaMock.property.update).not.toHaveBeenCalled();
    });

    it('should reject activation if property is not found', async () => {
      prismaMock.property.findUnique.mockResolvedValue(null);

      await expect(propertiesService.activateV2Occupancy('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should revert property to V1 upon deactivation', async () => {
      const propertyData = {
        id: 'prop-1',
        name: 'Hilltop Haven',
        occupancyVersion: 'V2',
      };

      prismaMock.property.findUnique.mockResolvedValue(propertyData);
      prismaMock.property.update.mockResolvedValue({ id: 'prop-1', occupancyVersion: 'V1' });

      const result = await propertiesService.deactivateV2Occupancy('prop-1');

      expect(result.success).toBe(true);
      expect(result.occupancyVersion).toBe('V1');
      expect(prismaMock.property.update).toHaveBeenCalledWith({
        where: { id: 'prop-1' },
        data: { occupancyVersion: 'V1' },
      });
    });
  });
});
