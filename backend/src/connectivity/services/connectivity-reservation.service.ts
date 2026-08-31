import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AvailabilityService } from '../../bookings/availability.service';
import { ConnectivityConnectionService } from './connectivity-connection.service';
import { ConnectivityMappingService } from './connectivity-mapping.service';
import { ConnectivitySettingsService } from './connectivity-settings.service';
import { ConnectivityLogService } from './connectivity-log.service';
import { ConnectivityOutboxService } from './connectivity-outbox.service';
import { ConnectivityAvailabilityService } from './connectivity-availability.service';
import { CreateConnectivityReservationDto } from '../dto/create-connectivity-reservation.dto';
import { UpdateConnectivityReservationDto } from '../dto/update-connectivity-reservation.dto';
import { CancelConnectivityReservationDto } from '../dto/cancel-connectivity-reservation.dto';

@Injectable()
export class ConnectivityReservationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionService: ConnectivityConnectionService,
    private readonly mappingService: ConnectivityMappingService,
    private readonly settingsService: ConnectivitySettingsService,
    private readonly availabilityService: AvailabilityService,
    private readonly logService: ConnectivityLogService,
    private readonly outboxService: ConnectivityOutboxService,
    private readonly connectivityAvailabilityService: ConnectivityAvailabilityService,
  ) {}

  async createReservation(partner: any, dto: CreateConnectivityReservationDto, credentialEnv?: string) {
    const partnerId = partner.id;

    // 1. Enforce global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.reservationSync) {
      throw new ForbiddenException('Reservation synchronization is currently disabled globally');
    }

    // 2. Validate partner connection for target property
    const connection = await this.connectionService.getConnectionForPartnerAndProperty(
      partnerId,
      dto.propertyId,
      credentialEnv,
    );

    const propertyId = connection.propertyId;

    // 3. Load registered RoomType mappings for this connection
    const mappings = await this.mappingService.getRoomMappingsForConnection(partnerId, propertyId);
    if (!mappings || mappings.length === 0) {
      throw new NotFoundException(`No RoomType mappings registered for property connection ${connection.id}`);
    }

    const mapping = mappings.find(
      (m) => m.externalRoomTypeId === dto.externalRoomTypeId || m.roomTypeId === dto.externalRoomTypeId,
    );

    if (!mapping) {
      throw new BadRequestException(`RoomType ${dto.externalRoomTypeId} is not mapped for this property connection`);
    }

    // 4. Idempotency Check: Look up existing reservation mapping
    const existingMapping = await this.prisma.connectivityReservationMapping.findUnique({
      where: {
        partnerId_externalReservationId: {
          partnerId,
          externalReservationId: dto.externalReservationId,
        },
      },
      include: {
        booking: {
          include: {
            room: true,
            roomType: true,
            user: true,
          },
        },
      },
    });

    if (existingMapping) {
      const guestName = existingMapping.booking.user
        ? [existingMapping.booking.user.firstName, existingMapping.booking.user.lastName].filter(Boolean).join(' ')
        : 'Guest';

      return {
        status: 'SUCCESS',
        isExisting: true,
        message: `Reservation ${dto.externalReservationId} already exists`,
        reservationId: existingMapping.id,
        bookingId: existingMapping.booking.id,
        bookingNumber: existingMapping.booking.bookingNumber,
        externalReservationId: existingMapping.externalReservationId,
        propertyId: connection.propertyId,
        externalPropertyId: connection.externalPropertyId,
        roomTypeId: mapping.roomTypeId,
        externalRoomTypeId: mapping.externalRoomTypeId,
        assignedRoomNumber: existingMapping.booking.room?.roomNumber || null,
        checkInDate: existingMapping.booking.checkInDate.toISOString().slice(0, 10),
        checkOutDate: existingMapping.booking.checkOutDate.toISOString().slice(0, 10),
        totalAmount: Number(existingMapping.booking.totalAmount),
        currency: existingMapping.booking.bookingCurrency || 'INR',
        bookingStatus: existingMapping.booking.status,
        guest: {
          id: existingMapping.booking.user?.id || '',
          name: guestName,
          email: existingMapping.booking.user?.email || '',
          phone: existingMapping.booking.user?.phone || '',
        },
      };
    }

    // 5. Date parsing & validation
    const checkIn = new Date(dto.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(dto.checkOutDate);
    checkOut.setHours(0, 0, 0, 0);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid checkInDate or checkOutDate provided');
    }

    if (checkIn >= checkOut) {
      throw new BadRequestException('checkInDate must be before checkOutDate');
    }

    const numberOfNights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

    // 6. Pre-Commit Restriction Validation
    await this.availabilityService.validateBookingRestrictions(
      propertyId,
      mapping.roomTypeId,
      checkIn,
      checkOut,
    );

    // 7. Physical Room Allocation
    const availableRooms = await this.availabilityService.getAvailableRooms(
      mapping.roomTypeId,
      checkIn,
      checkOut,
    );

    if (!availableRooms || availableRooms.length === 0) {
      throw new BadRequestException(`No physical rooms available for roomType ${dto.externalRoomTypeId} in selected date range`);
    }

    const assignedRoom = availableRooms[0];

    // 8. Resolve or Create Guest User
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: dto.guest.email },
          { phone: dto.guest.phone },
        ],
      },
    });

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          firstName: dto.guest.firstName,
          lastName: dto.guest.lastName,
          email: dto.guest.email,
          phone: dto.guest.phone,
        },
      });
    }

    const bookingNumber = `BK-CONN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // 9. Transactional Creation of Canonical Booking, ConnectivityReservationMapping & Outbox Events
    const result = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.booking.create({
        data: {
          bookingNumber,
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfNights,
          adultsCount: dto.adultsCount,
          childrenCount: dto.childrenCount || 0,
          baseAmount: dto.totalAmount,
          totalAmount: dto.totalAmount,
          status: 'CONFIRMED',
          isManualBooking: true,
          propertyId,
          roomTypeId: mapping.roomTypeId,
          roomId: assignedRoom.id,
          userId: user!.id,
          specialRequests: dto.specialRequests || null,
          bookingCurrency: dto.currency || 'INR',
          paidAmount: dto.totalAmount,
          paymentStatus: 'FULL',
          isSeenByProperty: false,
        },
        include: {
          room: true,
          roomType: true,
          user: true,
        },
      });

      const reservationMapping = await tx.connectivityReservationMapping.create({
        data: {
          bookingId: booking.id,
          partnerId,
          connectionId: connection.id,
          externalReservationId: dto.externalReservationId,
          externalPropertyId: connection.externalPropertyId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRatePlanId: dto.externalRatePlanId || mapping.externalRatePlanId || null,
        },
        include: {
          connection: true,
        },
      });

      // Phase 5A: Produce RESERVATION.CREATED Outbox Event within transaction
      await this.outboxService.createReservationEvent(
        tx,
        'RESERVATION.CREATED',
        partnerId,
        connection.id,
        reservationMapping,
        booking,
        user,
      );

      // Phase 5A: Produce AVAILABILITY.CHANGED Outbox Event within transaction
      await this.connectivityAvailabilityService.recalculateAndEmitAvailability(
        tx,
        propertyId,
        mapping.roomTypeId,
        dto.checkInDate,
        dto.checkOutDate,
      );

      return { booking, reservationMapping };
    });

    // 10. Audit Logging
    await this.logService.createLog({
      partnerId,
      connectionId: connection.id,
      endpoint: '/api/connectivity/v1/reservations',
      method: 'POST',
      statusCode: 201,
      requestPayload: dto,
      responsePayload: {
        status: 'SUCCESS',
        bookingId: result.booking.id,
        externalReservationId: dto.externalReservationId,
      },
    });

    const guestFullName = result.booking.user
      ? [result.booking.user.firstName, result.booking.user.lastName].filter(Boolean).join(' ')
      : 'Guest';

    return {
      status: 'SUCCESS',
      isExisting: false,
      message: `Reservation ${dto.externalReservationId} successfully created`,
      reservationId: result.reservationMapping.id,
      bookingId: result.booking.id,
      bookingNumber: result.booking.bookingNumber,
      externalReservationId: dto.externalReservationId,
      propertyId: connection.propertyId,
      externalPropertyId: connection.externalPropertyId,
      roomTypeId: mapping.roomTypeId,
      externalRoomTypeId: mapping.externalRoomTypeId,
      assignedRoomNumber: result.booking.room?.roomNumber || null,
      checkInDate: dto.checkInDate,
      checkOutDate: dto.checkOutDate,
      totalAmount: Number(result.booking.totalAmount),
      currency: result.booking.bookingCurrency,
      bookingStatus: result.booking.status,
      guest: {
        id: result.booking.user.id,
        name: guestFullName,
        email: result.booking.user.email || '',
        phone: result.booking.user.phone || '',
      },
    };
  }

  async getReservation(partner: any, reservationId: string, credentialEnv?: string) {
    const partnerId = partner.id;

    // Enforce global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.reservationSync) {
      throw new ForbiddenException('Reservation synchronization is currently disabled globally');
    }

    // Resolve reservation mapping by ID, externalReservationId, or bookingId
    const mapping = await this.prisma.connectivityReservationMapping.findFirst({
      where: {
        partnerId,
        OR: [
          { id: reservationId },
          { externalReservationId: reservationId },
          { bookingId: reservationId },
        ],
      },
      include: {
        booking: {
          include: {
            room: true,
            roomType: true,
            user: true,
          },
        },
        connection: {
          include: { property: { select: { slug: true } } },
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Reservation ${reservationId} not found for partner connection`);
    }

    if (credentialEnv) {
      this.connectionService['validateEnvironmentAccess'](credentialEnv, mapping.connection?.property?.slug);
    }

    const guestFullName = mapping.booking.user
      ? [mapping.booking.user.firstName, mapping.booking.user.lastName].filter(Boolean).join(' ')
      : 'Guest';

    await this.logService.createLog({
      partnerId,
      connectionId: mapping.connectionId,
      endpoint: `/api/connectivity/v1/reservations/${reservationId}`,
      method: 'GET',
      statusCode: 200,
      requestPayload: { reservationId },
      responsePayload: {
        reservationId: mapping.id,
        bookingId: mapping.booking.id,
        externalReservationId: mapping.externalReservationId,
      },
    });

    return {
      reservationId: mapping.id,
      bookingId: mapping.booking.id,
      bookingNumber: mapping.booking.bookingNumber,
      externalReservationId: mapping.externalReservationId,
      propertyId: mapping.connection.propertyId,
      externalPropertyId: mapping.connection.externalPropertyId,
      roomTypeId: mapping.booking.roomTypeId,
      externalRoomTypeId: mapping.externalRoomTypeId,
      externalRatePlanId: mapping.externalRatePlanId,
      assignedRoomNumber: mapping.booking.room?.roomNumber || null,
      checkInDate: mapping.booking.checkInDate.toISOString().slice(0, 10),
      checkOutDate: mapping.booking.checkOutDate.toISOString().slice(0, 10),
      adultsCount: mapping.booking.adultsCount,
      childrenCount: mapping.booking.childrenCount,
      totalAmount: Number(mapping.booking.totalAmount),
      currency: mapping.booking.bookingCurrency || 'INR',
      bookingStatus: mapping.booking.status,
      specialRequests: mapping.booking.specialRequests,
      createdAt: mapping.createdAt.toISOString(),
      guest: {
        id: mapping.booking.user.id,
        name: guestFullName,
        email: mapping.booking.user.email || '',
        phone: mapping.booking.user.phone || '',
      },
    };
  }

  async updateReservation(partner: any, reservationId: string, dto: UpdateConnectivityReservationDto, credentialEnv?: string) {
    const partnerId = partner.id;

    // 1. Enforce global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.reservationSync) {
      throw new ForbiddenException('Reservation synchronization is currently disabled globally');
    }

    // 2. Resolve reservation mapping with partner isolation
    const mapping = await this.prisma.connectivityReservationMapping.findFirst({
      where: {
        partnerId,
        OR: [
          { id: reservationId },
          { externalReservationId: reservationId },
          { bookingId: reservationId },
        ],
      },
      include: {
        booking: {
          include: {
            room: true,
            roomType: true,
            user: true,
          },
        },
        connection: {
          include: { property: { select: { slug: true } } },
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Reservation ${reservationId} not found for partner connection`);
    }

    if (credentialEnv) {
      this.connectionService['validateEnvironmentAccess'](credentialEnv, mapping.connection?.property?.slug);
    }

    if (mapping.booking.status === 'CANCELLED') {
      throw new BadRequestException(`Cannot modify cancelled reservation ${mapping.externalReservationId}`);
    }

    const propertyId = mapping.connection.propertyId;

    // 3. Resolve Target RoomType Mapping
    let targetRoomTypeId = mapping.booking.roomTypeId;
    let targetExternalRoomTypeId = mapping.externalRoomTypeId;

    if (dto.externalRoomTypeId && dto.externalRoomTypeId !== mapping.externalRoomTypeId) {
      const mappings = await this.mappingService.getRoomMappingsForConnection(partnerId, propertyId);
      const roomMapping = mappings.find(
        (m) => m.externalRoomTypeId === dto.externalRoomTypeId || m.roomTypeId === dto.externalRoomTypeId,
      );

      if (!roomMapping) {
        throw new BadRequestException(`RoomType ${dto.externalRoomTypeId} is not mapped for this property connection`);
      }

      targetRoomTypeId = roomMapping.roomTypeId;
      targetExternalRoomTypeId = roomMapping.externalRoomTypeId;
    }

    // 4. Resolve Target Dates
    const currentCheckInStr = mapping.booking.checkInDate.toISOString().slice(0, 10);
    const currentCheckOutStr = mapping.booking.checkOutDate.toISOString().slice(0, 10);

    const targetCheckInStr = dto.checkInDate || currentCheckInStr;
    const targetCheckOutStr = dto.checkOutDate || currentCheckOutStr;

    const checkIn = new Date(targetCheckInStr);
    checkIn.setHours(0, 0, 0, 0);
    const checkOut = new Date(targetCheckOutStr);
    checkOut.setHours(0, 0, 0, 0);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      throw new BadRequestException('Invalid checkInDate or checkOutDate provided');
    }

    if (checkIn >= checkOut) {
      throw new BadRequestException('checkInDate must be before checkOutDate');
    }

    const numberOfNights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000));

    // 5. Idempotency Check: Skip update if state matches request exactly
    const targetAdults = dto.adultsCount !== undefined ? dto.adultsCount : mapping.booking.adultsCount;
    const targetChildren = dto.childrenCount !== undefined ? dto.childrenCount : mapping.booking.childrenCount;
    const targetTotal = dto.totalAmount !== undefined ? dto.totalAmount : Number(mapping.booking.totalAmount);
    const targetSpecialRequests = dto.specialRequests !== undefined ? dto.specialRequests : (mapping.booking.specialRequests || '');

    const isDatesSame = targetCheckInStr === currentCheckInStr && targetCheckOutStr === currentCheckOutStr;
    const isRoomTypeSame = targetRoomTypeId === mapping.booking.roomTypeId;
    const isAdultsSame = targetAdults === mapping.booking.adultsCount;
    const isChildrenSame = targetChildren === mapping.booking.childrenCount;
    const isTotalSame = targetTotal === Number(mapping.booking.totalAmount);
    const isRequestsSame = targetSpecialRequests === (mapping.booking.specialRequests || '');

    if (isDatesSame && isRoomTypeSame && isAdultsSame && isChildrenSame && isTotalSame && isRequestsSame && !dto.guest) {
      const guestFullName = mapping.booking.user
        ? [mapping.booking.user.firstName, mapping.booking.user.lastName].filter(Boolean).join(' ')
        : 'Guest';

      return {
        status: 'SUCCESS',
        isExisting: true,
        message: `Reservation ${mapping.externalReservationId} state is already up to date`,
        reservationId: mapping.id,
        bookingId: mapping.booking.id,
        bookingNumber: mapping.booking.bookingNumber,
        externalReservationId: mapping.externalReservationId,
        propertyId: mapping.connection.propertyId,
        externalPropertyId: mapping.connection.externalPropertyId,
        roomTypeId: targetRoomTypeId,
        externalRoomTypeId: targetExternalRoomTypeId,
        assignedRoomNumber: mapping.booking.room?.roomNumber || null,
        checkInDate: targetCheckInStr,
        checkOutDate: targetCheckOutStr,
        totalAmount: targetTotal,
        currency: mapping.booking.bookingCurrency || 'INR',
        bookingStatus: mapping.booking.status,
        guest: {
          id: mapping.booking.user?.id || '',
          name: guestFullName,
          email: mapping.booking.user?.email || '',
          phone: mapping.booking.user?.phone || '',
        },
      };
    }

    // 6. Physical Room Reallocation & Availability Check
    let assignedRoomId = mapping.booking.roomId;

    if (!isDatesSame || !isRoomTypeSame) {
      // Revalidate restriction rules
      await this.availabilityService.validateBookingRestrictions(
        propertyId,
        targetRoomTypeId,
        checkIn,
        checkOut,
      );

      // Check if current room is retained
      let canRetainCurrentRoom = isRoomTypeSame;
      if (canRetainCurrentRoom) {
        canRetainCurrentRoom = await this.availabilityService.isRoomAvailable(
          mapping.booking.roomId,
          checkIn,
          checkOut,
          mapping.booking.id,
        );
      }

      if (!canRetainCurrentRoom) {
        const availableRooms = await this.availabilityService.getAvailableRooms(
          targetRoomTypeId,
          checkIn,
          checkOut,
          true,
          mapping.booking.id,
        );

        if (!availableRooms || availableRooms.length === 0) {
          throw new BadRequestException(`No physical rooms available for roomType ${targetExternalRoomTypeId} in requested date range`);
        }

        assignedRoomId = availableRooms[0].id;
      }
    }

    // 7. Execute Transactional Update & Outbox Events
    const result = await this.prisma.$transaction(async (tx) => {
      // Update Guest User if guest fields provided
      if (dto.guest && mapping.booking.user) {
        await tx.user.update({
          where: { id: mapping.booking.user.id },
          data: {
            ...(dto.guest.firstName ? { firstName: dto.guest.firstName } : {}),
            ...(dto.guest.lastName !== undefined ? { lastName: dto.guest.lastName } : {}),
            ...(dto.guest.email ? { email: dto.guest.email } : {}),
            ...(dto.guest.phone ? { phone: dto.guest.phone } : {}),
          },
        });
      }

      const updatedBooking = await tx.booking.update({
        where: { id: mapping.booking.id },
        data: {
          checkInDate: checkIn,
          checkOutDate: checkOut,
          numberOfNights,
          roomTypeId: targetRoomTypeId,
          roomId: assignedRoomId,
          adultsCount: targetAdults,
          childrenCount: targetChildren,
          baseAmount: targetTotal,
          totalAmount: targetTotal,
          specialRequests: dto.specialRequests !== undefined ? dto.specialRequests : mapping.booking.specialRequests,
          bookingCurrency: dto.currency || mapping.booking.bookingCurrency,
          rescheduleCount: { increment: 1 },
        },
        include: {
          room: true,
          roomType: true,
          user: true,
        },
      });

      let updatedMapping = mapping;
      if (targetExternalRoomTypeId !== mapping.externalRoomTypeId) {
        updatedMapping = await tx.connectivityReservationMapping.update({
          where: { id: mapping.id },
          data: {
            externalRoomTypeId: targetExternalRoomTypeId,
            externalRatePlanId: dto.externalRatePlanId || mapping.externalRatePlanId,
          },
          include: {
            booking: {
              include: {
                room: true,
                roomType: true,
                user: true,
              },
            },
            connection: {
              include: { property: { select: { slug: true } } },
            },
          },
        });
      }

      // Phase 5A: Produce RESERVATION.MODIFIED Outbox Event within transaction
      await this.outboxService.createReservationEvent(
        tx,
        'RESERVATION.MODIFIED',
        partnerId,
        mapping.connectionId,
        updatedMapping,
        updatedBooking,
        mapping.booking.user,
      );

      // Phase 5A: Produce AVAILABILITY.CHANGED Outbox Event if dates or roomType changed
      if (!isDatesSame || !isRoomTypeSame) {
        await this.connectivityAvailabilityService.recalculateAndEmitAvailability(
          tx,
          propertyId,
          targetRoomTypeId,
          targetCheckInStr,
          targetCheckOutStr,
        );
      }

      return { booking: updatedBooking, mapping: updatedMapping };
    });

    // 8. Audit Logging
    await this.logService.createLog({
      partnerId,
      connectionId: mapping.connectionId,
      endpoint: `/api/connectivity/v1/reservations/${reservationId}`,
      method: 'PUT',
      statusCode: 200,
      requestPayload: dto,
      responsePayload: {
        status: 'SUCCESS',
        bookingId: result.booking.id,
        externalReservationId: mapping.externalReservationId,
      },
    });

    const guestFullName = result.booking.user
      ? [result.booking.user.firstName, result.booking.user.lastName].filter(Boolean).join(' ')
      : 'Guest';

    return {
      status: 'SUCCESS',
      isExisting: false,
      message: `Reservation ${mapping.externalReservationId} successfully updated`,
      reservationId: mapping.id,
      bookingId: result.booking.id,
      bookingNumber: result.booking.bookingNumber,
      externalReservationId: mapping.externalReservationId,
      propertyId: mapping.connection.propertyId,
      externalPropertyId: mapping.connection.externalPropertyId,
      roomTypeId: targetRoomTypeId,
      externalRoomTypeId: targetExternalRoomTypeId,
      assignedRoomNumber: result.booking.room?.roomNumber || null,
      checkInDate: targetCheckInStr,
      checkOutDate: targetCheckOutStr,
      totalAmount: Number(result.booking.totalAmount),
      currency: result.booking.bookingCurrency,
      bookingStatus: result.booking.status,
      guest: {
        id: result.booking.user.id,
        name: guestFullName,
        email: result.booking.user.email || '',
        phone: result.booking.user.phone || '',
      },
    };
  }

  async cancelReservation(partner: any, reservationId: string, dto?: CancelConnectivityReservationDto, credentialEnv?: string) {
    const partnerId = partner.id;

    // 1. Enforce global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.reservationSync) {
      throw new ForbiddenException('Reservation synchronization is currently disabled globally');
    }

    // 2. Resolve reservation mapping with partner isolation
    const mapping = await this.prisma.connectivityReservationMapping.findFirst({
      where: {
        partnerId,
        OR: [
          { id: reservationId },
          { externalReservationId: reservationId },
          { bookingId: reservationId },
        ],
      },
      include: {
        booking: {
          include: {
            room: true,
            user: true,
          },
        },
        connection: {
          include: { property: { select: { slug: true } } },
        },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`Reservation ${reservationId} not found for partner connection`);
    }

    if (credentialEnv) {
      this.connectionService['validateEnvironmentAccess'](credentialEnv, mapping.connection?.property?.slug);
    }

    // 3. Idempotency Check: Return success if already cancelled
    if (mapping.booking.status === 'CANCELLED') {
      return {
        status: 'SUCCESS',
        isExisting: true,
        message: `Reservation ${mapping.externalReservationId} is already cancelled`,
        reservationId: mapping.id,
        bookingId: mapping.booking.id,
        bookingNumber: mapping.booking.bookingNumber,
        externalReservationId: mapping.externalReservationId,
        bookingStatus: 'CANCELLED',
        cancelledAt: mapping.booking.cancelledAt?.toISOString() || new Date().toISOString(),
      };
    }

    // 4. Transactional Cancellation & Physical Room Release & Outbox Event
    const checkInStr = mapping.booking.checkInDate.toISOString().slice(0, 10);
    const checkOutStr = mapping.booking.checkOutDate.toISOString().slice(0, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      // Remove room blocks associated with booking
      await tx.roomBlock.deleteMany({
        where: { bookingId: mapping.booking.id },
      });

      // Release physical room status to AVAILABLE
      await tx.room.update({
        where: { id: mapping.booking.roomId },
        data: { status: 'AVAILABLE' },
      });

      // Update Booking status to CANCELLED
      const cancelledBooking = await tx.booking.update({
        where: { id: mapping.booking.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Phase 5A: Produce RESERVATION.CANCELLED Outbox Event within transaction
      await this.outboxService.createReservationEvent(
        tx,
        'RESERVATION.CANCELLED',
        partnerId,
        mapping.connectionId,
        mapping,
        cancelledBooking,
        mapping.booking.user,
      );

      // Phase 5A: Produce AVAILABILITY.CHANGED Outbox Event on cancellation
      await this.connectivityAvailabilityService.recalculateAndEmitAvailability(
        tx,
        mapping.connection.propertyId,
        mapping.booking.roomTypeId,
        checkInStr,
        checkOutStr,
      );

      return cancelledBooking;
    });

    // 5. Audit Logging
    await this.logService.createLog({
      partnerId,
      connectionId: mapping.connectionId,
      endpoint: `/api/connectivity/v1/reservations/${reservationId}/cancel`,
      method: 'POST',
      statusCode: 200,
      requestPayload: dto || {},
      responsePayload: {
        status: 'SUCCESS',
        bookingId: result.id,
        externalReservationId: mapping.externalReservationId,
        bookingStatus: 'CANCELLED',
      },
    });

    return {
      status: 'SUCCESS',
      isExisting: false,
      message: `Reservation ${mapping.externalReservationId} successfully cancelled`,
      reservationId: mapping.id,
      bookingId: result.id,
      bookingNumber: result.bookingNumber,
      externalReservationId: mapping.externalReservationId,
      bookingStatus: result.status,
      cancelledAt: result.cancelledAt?.toISOString() || new Date().toISOString(),
    };
  }
}
