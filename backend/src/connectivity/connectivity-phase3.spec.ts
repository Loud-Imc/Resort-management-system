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

describe('Connectivity Platform Phase 3 Unit Tests (Reservation Connectivity & Ingestion)', () => {
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

  const mockPrismaService = {
    connectivityReservationMapping: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    booking: {
      create: jest.fn(),
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

  describe('Capability & Validation Checks', () => {
    it('should throw ForbiddenException if reservationSync capability is disabled globally', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: false });

      await expect(
        reservationService.createReservation(mockPartner, {
          propertyId: 'prop-1',
          externalReservationId: 'EXT-1001',
          externalRoomTypeId: 'DLX',
          checkInDate: '2026-09-10',
          checkOutDate: '2026-09-15',
          adultsCount: 2,
          totalAmount: 15000,
          guest: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+919876543210',
          },
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if checkInDate is after or equal to checkOutDate', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue(null);

      await expect(
        reservationService.createReservation(mockPartner, {
          propertyId: 'prop-1',
          externalReservationId: 'EXT-1001',
          externalRoomTypeId: 'DLX',
          checkInDate: '2026-09-15',
          checkOutDate: '2026-09-10',
          adultsCount: 2,
          totalAmount: 15000,
          guest: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+919876543210',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if unmapped externalRoomTypeId is provided', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      await expect(
        reservationService.createReservation(mockPartner, {
          propertyId: 'prop-1',
          externalReservationId: 'EXT-1001',
          externalRoomTypeId: 'SUITE_UNMAPPED',
          checkInDate: '2026-09-10',
          checkOutDate: '2026-09-15',
          adultsCount: 2,
          totalAmount: 15000,
          guest: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+919876543210',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no physical rooms are available', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue(null);
      mockAvailabilityService.getAvailableRooms.mockResolvedValue([]);

      await expect(
        reservationService.createReservation(mockPartner, {
          propertyId: 'prop-1',
          externalReservationId: 'EXT-1001',
          externalRoomTypeId: 'DLX',
          checkInDate: '2026-09-10',
          checkOutDate: '2026-09-15',
          adultsCount: 2,
          totalAmount: 15000,
          guest: {
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            phone: '+919876543210',
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Reservation Ingestion & Physical Room Allocation', () => {
    it('should successfully ingest external reservation, assign physical room, create canonical Booking and Mapping', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);
      mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue(null);

      mockAvailabilityService.getAvailableRooms.mockResolvedValue([
        { id: 'room-101', roomNumber: '101', roomTypeId: 'rt-deluxe', propertyId: 'prop-1' },
      ]);

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-guest-1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+919876543210',
      });

      mockPrismaService.booking.create.mockResolvedValue({
        id: 'bk-1001',
        bookingNumber: 'BK-CONN-12345',
        checkInDate: new Date('2026-09-10T00:00:00Z'),
        checkOutDate: new Date('2026-09-15T00:00:00Z'),
        totalAmount: 15000,
        bookingCurrency: 'INR',
        status: 'CONFIRMED',
        room: { roomNumber: '101' },
        roomType: { id: 'rt-deluxe' },
        user: { id: 'user-guest-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+919876543210' },
      });

      mockPrismaService.connectivityReservationMapping.create.mockResolvedValue({
        id: 'mapping-1001',
        bookingId: 'bk-1001',
        partnerId: 'partner-1',
        connectionId: 'conn-1',
        externalReservationId: 'EXT-1001',
        externalPropertyId: 'EXT-PROP-1',
        externalRoomTypeId: 'DLX',
      });

      const result = await reservationService.createReservation(mockPartner, {
        propertyId: 'prop-1',
        externalReservationId: 'EXT-1001',
        externalRoomTypeId: 'DLX',
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-15',
        adultsCount: 2,
        totalAmount: 15000,
        guest: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+919876543210',
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isExisting).toBe(false);
      expect(result.bookingId).toBe('bk-1001');
      expect(result.externalReservationId).toBe('EXT-1001');
      expect(result.assignedRoomNumber).toBe('101');
      expect(mockAvailabilityService.validateBookingRestrictions).toHaveBeenCalled();
      expect(mockAvailabilityService.getAvailableRooms).toHaveBeenCalledWith('rt-deluxe', expect.any(Date), expect.any(Date));
      expect(mockLogService.createLog).toHaveBeenCalled();
    });
  });

  describe('Idempotency & Duplicate Protection', () => {
    it('should return existing booking information when identical externalReservationId is resubmitted', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockConnectionService.getConnectionForPartnerAndProperty.mockResolvedValue({
        id: 'conn-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-PROP-1',
      });
      mockMappingService.getRoomMappingsForConnection.mockResolvedValue([
        { id: 'map-1', roomTypeId: 'rt-deluxe', externalRoomTypeId: 'DLX' },
      ]);

      mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue({
        id: 'mapping-1001',
        bookingId: 'bk-1001',
        partnerId: 'partner-1',
        connectionId: 'conn-1',
        externalReservationId: 'EXT-1001',
        externalPropertyId: 'EXT-PROP-1',
        externalRoomTypeId: 'DLX',
        booking: {
          id: 'bk-1001',
          bookingNumber: 'BK-CONN-12345',
          checkInDate: new Date('2026-09-10T00:00:00Z'),
          checkOutDate: new Date('2026-09-15T00:00:00Z'),
          totalAmount: 15000,
          bookingCurrency: 'INR',
          status: 'CONFIRMED',
          room: { roomNumber: '101' },
          roomType: { id: 'rt-deluxe' },
          user: { id: 'user-guest-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+919876543210' },
        },
      });

      const result = await reservationService.createReservation(mockPartner, {
        propertyId: 'prop-1',
        externalReservationId: 'EXT-1001',
        externalRoomTypeId: 'DLX',
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-15',
        adultsCount: 2,
        totalAmount: 15000,
        guest: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '+919876543210',
        },
      });

      expect(result.status).toBe('SUCCESS');
      expect(result.isExisting).toBe(true);
      expect(result.bookingId).toBe('bk-1001');
      expect(result.externalReservationId).toBe('EXT-1001');
      expect(mockPrismaService.booking.create).not.toHaveBeenCalled();
    });
  });

  describe('Reservation Retrieval & Access Isolation', () => {
    it('should retrieve reservation details for authorized partner', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue({
        id: 'mapping-1001',
        bookingId: 'bk-1001',
        partnerId: 'partner-1',
        externalReservationId: 'EXT-1001',
        externalRoomTypeId: 'DLX',
        createdAt: new Date('2026-08-22T10:00:00Z'),
        connection: { propertyId: 'prop-1', externalPropertyId: 'EXT-PROP-1' },
        booking: {
          id: 'bk-1001',
          bookingNumber: 'BK-CONN-12345',
          checkInDate: new Date('2026-09-10T00:00:00Z'),
          checkOutDate: new Date('2026-09-15T00:00:00Z'),
          adultsCount: 2,
          childrenCount: 0,
          totalAmount: 15000,
          bookingCurrency: 'INR',
          status: 'CONFIRMED',
          specialRequests: 'High floor',
          roomTypeId: 'rt-deluxe',
          room: { roomNumber: '101' },
          user: { id: 'user-guest-1', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '+919876543210' },
        },
      });

      const result = await reservationService.getReservation(mockPartner, 'EXT-1001');

      expect(result.externalReservationId).toBe('EXT-1001');
      expect(result.assignedRoomNumber).toBe('101');
      expect(result.guest.email).toBe('john@example.com');
    });

    it('should throw NotFoundException if partner attempts to query another partner reservation', async () => {
      mockSettingsService.getGlobalCapabilities.mockResolvedValue({ reservationSync: true });
      mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(null);

      await expect(
        reservationService.getReservation(mockPartner2, 'EXT-1001'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
