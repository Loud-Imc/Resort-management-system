import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityReservationService } from './services/connectivity-reservation.service';
import { ConnectivityOutboxService } from './services/connectivity-outbox.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';

describe('Connectivity Platform Phase 4 Unit Tests (Reservation Lifecycle: Modification & Cancellation)', () => {
  let reservationService: ConnectivityReservationService;

  const mockPartner = {
    id: 'partner-1',
    name: 'Channex Partner',
    code: 'CHANNEX',
  };

  const mockPartner2 = {
    id: 'partner-2',
    name: 'Other PMS',
    code: 'OTHER_PMS',
  };

  const mockExistingMapping = {
    id: 'mapping-1001',
    bookingId: 'bk-1001',
    partnerId: 'partner-1',
    connectionId: 'conn-1',
    externalReservationId: 'EXT-1001',
    externalPropertyId: 'EXT-PROP-1',
    externalRoomTypeId: 'DLX',
    externalRatePlanId: 'BAR',
    connection: { propertyId: 'prop-1', externalPropertyId: 'EXT-PROP-1' },
    booking: {
      id: 'bk-1001',
      bookingNumber: 'BK-CONN-12345',
      checkInDate: new Date('2026-09-10T00:00:00Z'),
      checkOutDate: new Date('2026-09-15T00:00:00Z'),
      numberOfNights: 5,
      roomTypeId: 'rt-deluxe',
      roomId: 'room-101',
      adultsCount: 2,
      childrenCount: 0,
      totalAmount: 15000,
      bookingCurrency: 'INR',
      status: 'CONFIRMED',
      specialRequests: 'High floor',
      room: { id: 'room-101', roomNumber: '101', roomTypeId: 'rt-deluxe' },
      roomType: { id: 'rt-deluxe', name: 'Deluxe Room' },
      user: { id: 'user-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+919876543210' },
    },
  };

  const mockPrismaService = {
    connectivityReservationMapping: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    booking: {
      update: jest.fn(),
    },
    room: {
      update: jest.fn(),
    },
    roomBlock: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
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

  const mockAvailabilityService = {
    validateBookingRestrictions: jest.fn(),
    isRoomAvailable: jest.fn(),
    getAvailableRooms: jest.fn(),
  };

  const mockLogService = {
    createLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockPrismaService.$transaction.mockImplementation(async (cb) => {
      return cb(mockPrismaService);
    });

    const mockOutboxService = {
      createReservationEvent: jest.fn().mockResolvedValue({ id: 'outbox-1' }),
      createAvailabilityEvent: jest.fn().mockResolvedValue({ id: 'outbox-2' }),
    };

    const mockConnectivityAvailabilityService = {
      recalculateAndEmitAvailability: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityReservationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: AvailabilityService, useValue: mockAvailabilityService },
        { provide: ConnectivityLogService, useValue: mockLogService },
        { provide: ConnectivityOutboxService, useValue: mockOutboxService },
        { provide: ConnectivityAvailabilityService, useValue: mockConnectivityAvailabilityService },
      ],
    }).compile();

    reservationService = module.get<ConnectivityReservationService>(ConnectivityReservationService);
  });

  describe('Capability & Access Controls', () => {
    it('18. should throw ForbiddenException when reservationSync capability is disabled globally for modification/cancellation', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: false });

      await expect(
        reservationService.updateReservation(mockPartner, 'EXT-1001', { totalAmount: 18000 }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        reservationService.cancelReservation(mockPartner, 'EXT-1001'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('19. should throw NotFoundException when reservation is not found for the given ID', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(null);

      await expect(
        reservationService.updateReservation(mockPartner, 'EXT-NONEXISTENT', { totalAmount: 18000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('16. should reject cross-partner modification attempts (Partner B cannot modify Partner A reservation)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(null);

      await expect(
        reservationService.updateReservation(mockPartner2, 'EXT-1001', { totalAmount: 18000 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('17. should reject cross-partner cancellation attempts (Partner B cannot cancel Partner A reservation)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(null);

      await expect(
        reservationService.cancelReservation(mockPartner2, 'EXT-1001'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Reservation Modification (`PUT /reservations/:id`)', () => {
    it('1. & 2. should successfully perform date modification & update reservation', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockAvailabilityService.isRoomAvailable.mockResolvedValue(true);

      mockPrismaService.booking.update.mockResolvedValue({
        ...mockExistingMapping.booking,
        checkInDate: new Date('2026-09-12T00:00:00Z'),
        checkOutDate: new Date('2026-09-17T00:00:00Z'),
        totalAmount: 18000,
        room: { roomNumber: '101' },
      });

      const result = await reservationService.updateReservation(mockPartner, 'EXT-1001', {
        checkInDate: '2026-09-12',
        checkOutDate: '2026-09-17',
        totalAmount: 18000,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isExisting).toBe(false);
      expect(result.checkInDate).toBe('2026-09-12');
      expect(result.checkOutDate).toBe('2026-09-17');
      expect(result.totalAmount).toBe(18000);
      expect(mockAvailabilityService.validateBookingRestrictions).toHaveBeenCalled();
      expect(mockLogService.createLog).toHaveBeenCalled();
    });

    it('3. & 5. should perform RoomType modification and reallocate physical room when necessary', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
        { id: 'map-2', roomTypeId: 'rt-suite', externalRoomTypeId: 'STE' },
      ]);

      mockAvailabilityService.getAvailableRooms.mockResolvedValue([
        { id: 'room-201', roomNumber: '201', roomTypeId: 'rt-suite' },
      ]);

      mockPrismaService.booking.update.mockResolvedValue({
        ...mockExistingMapping.booking,
        roomTypeId: 'rt-suite',
        roomId: 'room-201',
        room: { roomNumber: '201' },
      });

      mockPrismaService.connectivityReservationMapping.update.mockResolvedValue({
        ...mockExistingMapping,
        externalRoomTypeId: 'STE',
      });

      const result = await reservationService.updateReservation(mockPartner, 'EXT-1001', {
        externalRoomTypeId: 'STE',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.externalRoomTypeId).toBe('STE');
      expect(result.assignedRoomNumber).toBe('201');
    });

    it('4. should retain existing physical room when current room remains available for modified dates', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockAvailabilityService.isRoomAvailable.mockResolvedValue(true);

      mockPrismaService.booking.update.mockResolvedValue({
        ...mockExistingMapping.booking,
        checkInDate: new Date('2026-09-11T00:00:00Z'),
        checkOutDate: new Date('2026-09-16T00:00:00Z'),
        room: { roomNumber: '101' },
      });

      const result = await reservationService.updateReservation(mockPartner, 'EXT-1001', {
        checkInDate: '2026-09-11',
        checkOutDate: '2026-09-16',
      });

      expect(result.assignedRoomNumber).toBe('101');
      expect(mockAvailabilityService.getAvailableRooms).not.toHaveBeenCalled();
    });

    it('6. should reject modification when no physical room is available for requested dates/RoomType', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockAvailabilityService.isRoomAvailable.mockResolvedValue(false);
      mockAvailabilityService.getAvailableRooms.mockResolvedValue([]);

      await expect(
        reservationService.updateReservation(mockPartner, 'EXT-1001', {
          checkInDate: '2026-09-20',
          checkOutDate: '2026-09-25',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('7. should reject modification if restriction validation fails', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockAvailabilityService.validateBookingRestrictions.mockRejectedValue(
        new BadRequestException('Minimum stay requirement of 3 nights not met'),
      );

      await expect(
        reservationService.updateReservation(mockPartner, 'EXT-1001', {
          checkInDate: '2026-09-10',
          checkOutDate: '2026-09-11',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('8. & 9. & 10. should successfully modify guest information, guest counts, and total amount', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockAvailabilityService.isRoomAvailable.mockResolvedValue(true);

      mockPrismaService.booking.update.mockResolvedValue({
        ...mockExistingMapping.booking,
        adultsCount: 3,
        childrenCount: 1,
        totalAmount: 22000,
        room: { roomNumber: '101' },
        user: { id: 'user-1', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '+919999999999' },
      });

      const result = await reservationService.updateReservation(mockPartner, 'EXT-1001', {
        adultsCount: 3,
        childrenCount: 1,
        totalAmount: 22000,
        guest: {
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '+919999999999',
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.totalAmount).toBe(22000);
      expect(result.guest.name).toBe('Jane Smith');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('11. should safely handle modification idempotency (resubmitting identical payload returns 200 OK without DB updates)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);

      const result = await reservationService.updateReservation(mockPartner, 'EXT-1001', {
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-15',
        adultsCount: 2,
        childrenCount: 0,
        totalAmount: 15000,
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isExisting).toBe(true);
      expect(mockPrismaService.booking.update).not.toHaveBeenCalled();
    });

    it('20. should throw BadRequestException if target externalRoomTypeId is unmapped', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      await expect(
        reservationService.updateReservation(mockPartner, 'EXT-1001', {
          externalRoomTypeId: 'UNMAPPED_TYPE',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('21. should maintain transactional safety if database update fails', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);
      mockAvailabilityService.isRoomAvailable.mockResolvedValue(true);
      mockPrismaService.$transaction.mockRejectedValue(new Error('Database transaction timeout'));

      await expect(
        reservationService.updateReservation(mockPartner, 'EXT-1001', {
          totalAmount: 20000,
        }),
      ).rejects.toThrow('Database transaction timeout');
    });
  });

  describe('Reservation Cancellation (`POST /reservations/:id/cancel`)', () => {
    it('12. & 13. & 14. should successfully cancel reservation, release physical room, and restore availability', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockExistingMapping);

      mockPrismaService.booking.update.mockResolvedValue({
        ...mockExistingMapping.booking,
        status: 'CANCELLED',
        cancelledAt: new Date('2026-08-22T18:00:00Z'),
      });

      const result = await reservationService.cancelReservation(mockPartner, 'EXT-1001', {
        reason: 'Guest cancelled via external PMS',
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isExisting).toBe(false);
      expect(result.bookingStatus).toBe('CANCELLED');
      expect(mockPrismaService.room.update).toHaveBeenCalledWith({
        where: { id: 'room-101' },
        data: { status: 'AVAILABLE' },
      });
      expect(mockPrismaService.roomBlock.deleteMany).toHaveBeenCalledWith({
        where: { bookingId: 'bk-1001' },
      });
      expect(mockLogService.createLog).toHaveBeenCalled();
    });

    it('15. should safely handle cancellation idempotency (resubmitting cancel on already cancelled reservation returns 200 OK)', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue({
        ...mockExistingMapping,
        booking: {
          ...mockExistingMapping.booking,
          status: 'CANCELLED',
          cancelledAt: new Date('2026-08-22T17:00:00Z'),
        },
      });

      const result = await reservationService.cancelReservation(mockPartner, 'EXT-1001');

      expect(result.status).toBe('SUCCESS');
      expect(result.isExisting).toBe(true);
      expect(result.bookingStatus).toBe('CANCELLED');
      expect(mockPrismaService.booking.update).not.toHaveBeenCalled();
    });
  });
});
