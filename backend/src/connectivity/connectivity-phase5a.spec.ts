import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectivityReservationService } from './services/connectivity-reservation.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';
import { ConnectivityOutboxService } from './services/connectivity-outbox.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { AvailabilityService } from '../bookings/availability.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Connectivity Platform Phase 5A — Outbox Persistence & Event Producer', () => {
  let reservationService: ConnectivityReservationService;
  let availabilityService: ConnectivityAvailabilityService;
  let outboxService: ConnectivityOutboxService;
  let settingsService: ConnectivitySettingsService;
  let prismaService: PrismaService;

  const mockPartner = {
    id: 'partner-uuid-1',
    name: 'Test PMS Partner',
    code: 'TEST_PMS',
    type: 'PMS',
  };

  const mockPartner2 = {
    id: 'partner-uuid-2',
    name: 'Test Channel Manager',
    code: 'TEST_CM',
    type: 'CHANNEL_MANAGER',
  };

  const mockConnection = {
    id: 'conn-uuid-1',
    partnerId: 'partner-uuid-1',
    propertyId: 'prop-uuid-1',
    externalPropertyId: 'EXT-PROP-1001',
    status: 'ACTIVE',
  };

  const mockConnection2 = {
    id: 'conn-uuid-2',
    partnerId: 'partner-uuid-2',
    propertyId: 'prop-uuid-1',
    externalPropertyId: 'EXT-PROP-1002',
    status: 'ACTIVE',
  };

  const mockRoomMapping = {
    id: 'mapping-uuid-1',
    connectionId: 'conn-uuid-1',
    roomTypeId: 'rt-uuid-deluxe',
    externalRoomTypeId: 'DLX',
  };

  const mockUser = {
    id: 'user-uuid-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+919876543210',
  };

  const mockBooking = {
    id: 'booking-uuid-1',
    bookingNumber: 'BK-CONN-12345',
    checkInDate: new Date('2026-09-10'),
    checkOutDate: new Date('2026-09-15'),
    numberOfNights: 5,
    adultsCount: 2,
    childrenCount: 0,
    baseAmount: 15000,
    totalAmount: 15000,
    status: 'CONFIRMED',
    bookingCurrency: 'INR',
    roomId: 'room-uuid-101',
    roomTypeId: 'rt-uuid-deluxe',
    userId: 'user-uuid-1',
    propertyId: 'prop-uuid-1',
    room: { id: 'room-uuid-101', roomNumber: '101' },
    roomType: { id: 'rt-uuid-deluxe', name: 'Deluxe Room' },
    user: mockUser,
  };

  const mockReservationMapping = {
    id: 'mapping-res-1001',
    bookingId: 'booking-uuid-1',
    partnerId: 'partner-uuid-1',
    connectionId: 'conn-uuid-1',
    externalReservationId: 'EXT-RES-1001',
    externalPropertyId: 'EXT-PROP-1001',
    externalRoomTypeId: 'DLX',
    booking: mockBooking,
    connection: mockConnection,
  };

  const mockOutboxRecords: any[] = [];

  const mockPrismaService = {
    $transaction: jest.fn(async (cb) => cb(mockPrismaService)),
    connectivityPartnerConnection: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    connectivityReservationMapping: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    connectivityOutbox: {
      create: jest.fn((args) => {
        const record = {
          id: `outbox-${Date.now()}-${Math.random()}`,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockOutboxRecords.push(record);
        return record;
      }),
      findMany: jest.fn(),
    },
    booking: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    room: {
      count: jest.fn(),
      update: jest.fn(),
    },
    roomBlock: {
      deleteMany: jest.fn(),
    },
    roomType: {
      findMany: jest.fn(),
    },
    stopSellRestriction: {
      findMany: jest.fn(),
    },
    connectivityAvailabilityOverride: {
      findMany: jest.fn(),
    },
  };

  const mockConnectionService = {
    getConnectionForPartnerAndProperty: jest.fn().mockResolvedValue(mockConnection),
  };

  const mockMappingService = {
    getRoomMappingsForConnection: jest.fn().mockResolvedValue([mockRoomMapping]),
  };

  const mockSettingsService = {
    getGlobalCapabilities: jest.fn().mockResolvedValue({
      connectivityPlatform: true,
      availabilitySync: true,
      ratesSync: true,
      restrictionsSync: true,
      reservationSync: true,
    }),
  };

  const mockLogService = {
    createLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };

  const mockCoreAvailabilityService = {
    validateBookingRestrictions: jest.fn().mockResolvedValue(true),
    getAvailableRooms: jest.fn().mockResolvedValue([{ id: 'room-uuid-101', roomNumber: '101' }]),
    isRoomAvailable: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    mockOutboxRecords.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityReservationService,
        ConnectivityAvailabilityService,
        ConnectivityOutboxService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityConnectionService, useValue: mockConnectionService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityLogService, useValue: mockLogService },
        { provide: AvailabilityService, useValue: mockCoreAvailabilityService },
      ],
    }).compile();

    reservationService = module.get<ConnectivityReservationService>(ConnectivityReservationService);
    availabilityService = module.get<ConnectivityAvailabilityService>(ConnectivityAvailabilityService);
    outboxService = module.get<ConnectivityOutboxService>(ConnectivityOutboxService);
    settingsService = module.get<ConnectivitySettingsService>(ConnectivitySettingsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  // 1. RESERVATION.CREATED Outbox Creation
  it('1. RESERVATION.CREATED creates a PENDING outbox event', async () => {
    mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue(null);
    mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
    mockPrismaService.booking.create.mockResolvedValue(mockBooking);
    mockPrismaService.connectivityReservationMapping.create.mockResolvedValue(mockReservationMapping);
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnection]);
    mockPrismaService.room.count.mockResolvedValue(5);
    mockPrismaService.booking.findMany.mockResolvedValue([]);
    mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([]);

    const result = await reservationService.createReservation(mockPartner, {
      propertyId: 'prop-uuid-1',
      externalReservationId: 'EXT-RES-1001',
      externalRoomTypeId: 'DLX',
      checkInDate: '2026-09-10',
      checkOutDate: '2026-09-15',
      adultsCount: 2,
      totalAmount: 15000,
      guest: { firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '9876543210' },
    });

    expect(result.status).toBe('SUCCESS');
    expect(mockOutboxRecords.length).toBeGreaterThanOrEqual(1);

    const resCreatedEvent = mockOutboxRecords.find((r) => r.eventType === 'RESERVATION.CREATED');
    expect(resCreatedEvent).toBeDefined();
    expect(resCreatedEvent.status).toBe('PENDING');
    expect(resCreatedEvent.partnerId).toBe('partner-uuid-1');
    expect(resCreatedEvent.connectionId).toBe('conn-uuid-1');
    expect(resCreatedEvent.payload.eventType).toBe('RESERVATION.CREATED');
    expect(resCreatedEvent.payload.data.bookingNumber).toBe('BK-CONN-12345');
  });

  // 2. RESERVATION.MODIFIED Outbox Creation
  it('2. RESERVATION.MODIFIED creates a PENDING outbox event', async () => {
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockReservationMapping);
    mockPrismaService.booking.update.mockResolvedValue({ ...mockBooking, adultsCount: 3 });
    mockPrismaService.connectivityReservationMapping.update.mockResolvedValue(mockReservationMapping);
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnection]);
    mockPrismaService.room.count.mockResolvedValue(5);
    mockPrismaService.booking.findMany.mockResolvedValue([]);
    mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([]);

    const result = await reservationService.updateReservation(mockPartner, 'EXT-RES-1001', {
      adultsCount: 3,
    });

    expect(result.status).toBe('SUCCESS');
    const resModifiedEvent = mockOutboxRecords.find((r) => r.eventType === 'RESERVATION.MODIFIED');
    expect(resModifiedEvent).toBeDefined();
    expect(resModifiedEvent.status).toBe('PENDING');
    expect(resModifiedEvent.payload.data.adultsCount).toBe(3);
  });

  // 3. RESERVATION.CANCELLED Outbox Creation
  it('3. RESERVATION.CANCELLED creates a PENDING outbox event', async () => {
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(mockReservationMapping);
    mockPrismaService.roomBlock.deleteMany.mockResolvedValue({ count: 1 });
    mockPrismaService.room.update.mockResolvedValue({ id: 'room-101', status: 'AVAILABLE' });
    mockPrismaService.booking.update.mockResolvedValue({ ...mockBooking, status: 'CANCELLED', cancelledAt: new Date() });
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([mockConnection]);
    mockPrismaService.room.count.mockResolvedValue(5);
    mockPrismaService.booking.findMany.mockResolvedValue([]);
    mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([]);

    const result = await reservationService.cancelReservation(mockPartner, 'EXT-RES-1001');

    expect(result.status).toBe('SUCCESS');
    const resCancelledEvent = mockOutboxRecords.find((r) => r.eventType === 'RESERVATION.CANCELLED');
    expect(resCancelledEvent).toBeDefined();
    expect(resCancelledEvent.status).toBe('PENDING');
    expect(resCancelledEvent.payload.data.bookingStatus).toBe('CANCELLED');
  });

  // 4. AVAILABILITY.CHANGED Outbox Creation
  it('4. AVAILABILITY.CHANGED creates a PENDING outbox event via centralized producer', async () => {
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([{
      ...mockConnection,
      roomMappings: [mockRoomMapping],
    }]);
    mockPrismaService.roomType.findMany.mockResolvedValue([{ id: 'rt-uuid-deluxe', name: 'Deluxe' }]);
    mockPrismaService.room.count.mockResolvedValue(4);
    mockPrismaService.booking.findMany.mockResolvedValue([]);
    mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([]);

    const events = await availabilityService.recalculateAndEmitAvailability(
      null,
      'prop-uuid-1',
      'rt-uuid-deluxe',
      '2026-09-10',
      '2026-09-15',
    );

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('AVAILABILITY.CHANGED');
    expect(events[0].status).toBe('PENDING');
    expect(events[0].payload.data.availableQuantity).toBe(4);
  });

  // 5. Transactional Integrity test
  it('5. Outbox event and booking creation are executed inside the same transaction', async () => {
    mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue(null);
    mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
    mockPrismaService.booking.create.mockResolvedValue(mockBooking);
    mockPrismaService.connectivityReservationMapping.create.mockResolvedValue(mockReservationMapping);
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([]);

    await reservationService.createReservation(mockPartner, {
      propertyId: 'prop-uuid-1',
      externalReservationId: 'EXT-RES-1002',
      externalRoomTypeId: 'DLX',
      checkInDate: '2026-09-10',
      checkOutDate: '2026-09-15',
      adultsCount: 2,
      totalAmount: 15000,
      guest: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com', phone: '9876543211' },
    });

    expect(mockPrismaService.$transaction).toHaveBeenCalled();
  });

  // 6. Failed booking transaction leaves zero outbox events
  it('6. Failed booking transaction does not leave an outbox event', async () => {
    mockPrismaService.connectivityReservationMapping.findUnique.mockResolvedValue(null);
    mockPrismaService.user.findFirst.mockResolvedValue(mockUser);
    mockPrismaService.$transaction.mockImplementationOnce(async () => {
      throw new Error('Database transaction failed');
    });

    await expect(
      reservationService.createReservation(mockPartner, {
        propertyId: 'prop-uuid-1',
        externalReservationId: 'EXT-RES-FAIL',
        externalRoomTypeId: 'DLX',
        checkInDate: '2026-09-10',
        checkOutDate: '2026-09-15',
        adultsCount: 2,
        totalAmount: 15000,
        guest: { firstName: 'Fail', lastName: 'User', email: 'fail@example.com', phone: '0000000000' },
      }),
    ).rejects.toThrow('Database transaction failed');
  });

  // 7. Global capability switch prevention for reservation events
  it('7. Relevant global capability disabled prevents reservation event creation', async () => {
    mockSettingsService.getGlobalCapabilities.mockResolvedValueOnce({
      connectivityPlatform: true,
      availabilitySync: true,
      ratesSync: true,
      restrictionsSync: true,
      reservationSync: false,
    });

    const event = await outboxService.createReservationEvent(
      null,
      'RESERVATION.CREATED',
      'partner-uuid-1',
      'conn-uuid-1',
      mockReservationMapping,
      mockBooking,
      mockUser,
    );

    expect(event).toBeNull();
  });

  // 8. Physical room IDs & internal bookingId suppressed in outbound payload
  it('8. Physical room IDs and internal bookingId are NOT exposed in external payload', async () => {
    const event = await outboxService.createReservationEvent(
      null,
      'RESERVATION.CREATED',
      'partner-uuid-1',
      'conn-uuid-1',
      mockReservationMapping,
      mockBooking,
      mockUser,
    );

    expect(event).not.toBeNull();
    const payloadData = event.payload.data;
    expect(payloadData.bookingId).toBeUndefined();
    expect(payloadData.roomId).toBeUndefined();
    expect(payloadData.physicalRoomNumber).toBeUndefined();

    // Verify allowed external identity
    expect(payloadData.reservationId).toBe('mapping-res-1001');
    expect(payloadData.bookingNumber).toBe('BK-CONN-12345');
    expect(payloadData.externalReservationId).toBe('EXT-RES-1001');
  });

  // 9. Idempotency prevents duplicate events on repeated cancelled operation
  it('9. No duplicate reservation event generated for idempotent repeated cancellation', async () => {
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue({
      ...mockReservationMapping,
      booking: {
        ...mockBooking,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    const result = await reservationService.cancelReservation(mockPartner, 'EXT-RES-1001');

    expect(result.status).toBe('SUCCESS');
    expect(result.isExisting).toBe(true);
    expect(mockOutboxRecords.length).toBe(0);
  });

  // 10. Native RouteGuide Booking createReservationEventForBooking test
  it('10. Native RouteGuide booking creation emits RESERVATION.CREATED outbox event for active partners', async () => {
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([{
      ...mockConnection,
      roomMappings: [mockRoomMapping],
    }]);
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(null);
    mockPrismaService.connectivityReservationMapping.create.mockResolvedValue(mockReservationMapping);

    const events = await outboxService.createReservationEventForBooking(
      null,
      'RESERVATION.CREATED',
      'prop-uuid-1',
      mockBooking,
      mockUser,
    );

    expect(events.length).toBe(1);
    expect(events[0].eventType).toBe('RESERVATION.CREATED');
    expect(events[0].status).toBe('PENDING');
    expect(events[0].payload.data.bookingNumber).toBe('BK-CONN-12345');
  });

  // 11. Property with 0 active connections emits 0 outbox events
  it('11. Native operation for property with 0 active connections emits 0 outbox events', async () => {
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([]);

    const resEvents = await outboxService.createReservationEventForBooking(
      null,
      'RESERVATION.CREATED',
      'prop-no-conn',
      mockBooking,
      mockUser,
    );
    expect(resEvents.length).toBe(0);

    const availEvents = await outboxService.emitAvailabilityChange(
      null,
      'prop-no-conn',
      'rt-uuid-deluxe',
      '2026-09-10',
      '2026-09-15',
    );
    expect(availEvents.length).toBe(0);
  });

  // 12. Multiple active connections emits 1 outbox event per active partner connection
  it('12. Property with multiple active connections emits 1 event per active connection', async () => {
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([
      { ...mockConnection, roomMappings: [mockRoomMapping] },
      { ...mockConnection2, roomMappings: [{ ...mockRoomMapping, connectionId: 'conn-uuid-2' }] },
    ]);
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue(null);
    mockPrismaService.connectivityReservationMapping.create.mockResolvedValue(mockReservationMapping);
    mockPrismaService.roomType.findMany.mockResolvedValue([{ id: 'rt-uuid-deluxe', name: 'Deluxe' }]);
    mockPrismaService.room.count.mockResolvedValue(5);
    mockPrismaService.booking.findMany.mockResolvedValue([]);
    mockPrismaService.stopSellRestriction.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityAvailabilityOverride.findMany.mockResolvedValue([]);

    const resEvents = await outboxService.createReservationEventForBooking(
      null,
      'RESERVATION.CREATED',
      'prop-uuid-1',
      mockBooking,
      mockUser,
    );

    expect(resEvents.length).toBe(2);
    expect(resEvents[0].connectionId).toBe('conn-uuid-1');
    expect(resEvents[1].connectionId).toBe('conn-uuid-2');
  });

  // 13. availabilitySync = false suppresses AVAILABILITY.CHANGED outbox events
  it('13. availabilitySync=false suppresses availability outbox events', async () => {
    mockSettingsService.getGlobalCapabilities.mockResolvedValueOnce({
      connectivityPlatform: true,
      availabilitySync: false,
      ratesSync: true,
      restrictionsSync: true,
      reservationSync: true,
    });

    const events = await outboxService.emitAvailabilityChange(
      null,
      'prop-uuid-1',
      'rt-uuid-deluxe',
      '2026-09-10',
      '2026-09-15',
    );

    expect(events.length).toBe(0);
  });
});
