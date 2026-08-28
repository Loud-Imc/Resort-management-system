import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivitySettingsService } from './connectivity-settings.service';
import { ConnectivityAvailabilityService } from './connectivity-availability.service';

@Injectable()
export class ConnectivityOutboxService {
  private readonly logger = new Logger(ConnectivityOutboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: ConnectivitySettingsService,
    @Inject(forwardRef(() => ConnectivityAvailabilityService))
    private readonly availabilityService: ConnectivityAvailabilityService,
  ) {}

  async createReservationEvent(
    tx: any,
    eventType: 'RESERVATION.CREATED' | 'RESERVATION.MODIFIED' | 'RESERVATION.CANCELLED',
    partnerId: string,
    connectionId: string,
    mapping: any,
    booking: any,
    user?: any,
  ) {
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.reservationSync) {
      return null;
    }

    const prismaTx = tx || this.prisma;

    const guestUser = user || booking?.user;
    const guestData = guestUser
      ? {
          firstName: guestUser.firstName || '',
          lastName: guestUser.lastName || '',
          email: guestUser.email || '',
          phone: guestUser.phone || '',
        }
      : null;

    const checkInStr =
      typeof booking.checkInDate === 'string'
        ? booking.checkInDate.slice(0, 10)
        : booking.checkInDate?.toISOString?.()?.slice(0, 10) || booking.checkInDate;

    const checkOutStr =
      typeof booking.checkOutDate === 'string'
        ? booking.checkOutDate.slice(0, 10)
        : booking.checkOutDate?.toISOString?.()?.slice(0, 10) || booking.checkOutDate;

    const payload = {
      eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      eventType,
      apiVersion: 'v1',
      timestamp: new Date().toISOString(),
      partnerId,
      connectionId,
      propertyId: mapping.connection?.propertyId || mapping.externalPropertyId,
      externalPropertyId: mapping.connection?.externalPropertyId || mapping.externalPropertyId,
      data: {
        reservationId: mapping.id,
        bookingNumber: booking.bookingNumber,
        externalReservationId: mapping.externalReservationId,
        externalRoomTypeId: mapping.externalRoomTypeId,
        roomTypeId: booking.roomTypeId,
        checkInDate: checkInStr,
        checkOutDate: checkOutStr,
        adultsCount: booking.adultsCount,
        childrenCount: booking.childrenCount || 0,
        totalAmount: Number(booking.totalAmount),
        currency: booking.bookingCurrency || 'INR',
        bookingStatus: booking.status,
        guest: guestData,
        specialRequests: booking.specialRequests || null,
      },
    };

    return prismaTx.connectivityOutbox.create({
      data: {
        partnerId,
        connectionId,
        eventType,
        aggregateId: mapping.id,
        payload,
        status: 'PENDING',
      },
    });
  }

  async createReservationEventForBooking(
    tx: any,
    eventType: 'RESERVATION.CREATED' | 'RESERVATION.MODIFIED' | 'RESERVATION.CANCELLED',
    propertyId: string | null | undefined,
    booking: any,
    user?: any,
  ) {
    if (!propertyId || !booking) {
      return [];
    }

    try {
      const capabilities = await this.settingsService.getGlobalCapabilities();
      if (!capabilities.reservationSync) {
        return [];
      }

      const prismaTx = tx || this.prisma;

      // Find all active partner connections for this property
      const connections = await prismaTx.connectivityPartnerConnection.findMany({
        where: { propertyId, status: 'ACTIVE' },
        include: {
          partner: true,
          roomMappings: { where: { roomTypeId: booking.roomTypeId } },
        },
      });

      if (!connections || connections.length === 0) {
        return [];
      }

      const events: any[] = [];

      for (const conn of connections) {
        const roomMapping = conn.roomMappings[0];
        const externalRoomTypeId = roomMapping?.externalRoomTypeId || booking.roomType?.name || 'DEFAULT';

        // Find or create mapping for this booking & partner connection
        let mapping = await prismaTx.connectivityReservationMapping.findFirst({
          where: {
            bookingId: booking.id,
            partnerId: conn.partnerId,
          },
        });

        if (!mapping) {
          mapping = await prismaTx.connectivityReservationMapping.create({
            data: {
              bookingId: booking.id,
              partnerId: conn.partnerId,
              connectionId: conn.id,
              externalReservationId: booking.bookingNumber,
              externalPropertyId: conn.externalPropertyId,
              externalRoomTypeId: externalRoomTypeId,
            },
          });
        }

        const event = await this.createReservationEvent(
          tx,
          eventType,
          conn.partnerId,
          conn.id,
          {
            ...mapping,
            connection: conn,
          },
          booking,
          user,
        );

        if (event) {
          events.push(event);
        }
      }

      return events;
    } catch (err: any) {
      this.logger.warn(
        `[ConnectivityOutbox] Skipped outbox event generation for booking ${booking?.id || ''}: ${err?.message || err}`,
      );
      return [];
    }
  }

  async createAvailabilityEvent(
    tx: any,
    partnerId: string,
    connectionId: string,
    propertyId: string,
    externalPropertyId: string,
    roomTypeId: string,
    externalRoomTypeId: string,
    startDate: string,
    endDate: string,
    availableQuantity: number,
  ) {
    try {
      const capabilities = await this.settingsService.getGlobalCapabilities();
      if (!capabilities.availabilitySync) {
        return null;
      }

      const prismaTx = tx || this.prisma;

      const payload = {
        eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        eventType: 'AVAILABILITY.CHANGED',
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        partnerId,
        connectionId,
        propertyId,
        externalPropertyId,
        data: {
          externalRoomTypeId,
          roomTypeId,
          startDate,
          endDate,
          availableQuantity,
        },
      };

      return await prismaTx.connectivityOutbox.create({
        data: {
          partnerId,
          connectionId,
          eventType: 'AVAILABILITY.CHANGED',
          aggregateId: `${propertyId}_${roomTypeId}`,
          payload,
          status: 'PENDING',
        },
      });
    } catch (err: any) {
      this.logger.warn(`[ConnectivityOutbox] Skipped createAvailabilityEvent: ${err?.message || err}`);
      return null;
    }
  }

  async emitAvailabilityChange(
    tx: any,
    propertyId: string | null | undefined,
    roomTypeId: string | null | undefined,
    startDate: string | Date,
    endDate: string | Date,
  ) {
    if (!propertyId || !roomTypeId) {
      return [];
    }

    try {
      const startDateStr: string =
        typeof startDate === 'string'
          ? startDate.slice(0, 10)
          : startDate?.toISOString?.()?.slice(0, 10) || String(startDate);

      const endDateStr: string =
        typeof endDate === 'string'
          ? endDate.slice(0, 10)
          : endDate?.toISOString?.()?.slice(0, 10) || String(endDate);

      return await this.availabilityService.recalculateAndEmitAvailability(
        tx,
        propertyId,
        roomTypeId,
        startDateStr,
        endDateStr,
      );
    } catch (err: any) {
      this.logger.warn(`[ConnectivityOutbox] Skipped emitAvailabilityChange: ${err?.message || err}`);
      return [];
    }
  }

  async createRateEventForProperty(
    tx: any,
    propertyId: string,
    roomTypeId: string,
    startDate: string,
    endDate: string,
    price: number,
    currency: string = 'INR',
    originatingPartnerId?: string,
  ) {
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.rateSync) {
      return [];
    }

    const prismaTx = tx || this.prisma;
    const connections = await prismaTx.connectivityPartnerConnection.findMany({
      where: {
        propertyId,
        status: { in: ['ACTIVE', 'DEGRADED'] },
        ...(originatingPartnerId ? { partnerId: { not: originatingPartnerId } } : {}),
      },
      include: {
        roomMappings: { where: { roomTypeId } },
      },
    });

    if (!connections || connections.length === 0) {
      return [];
    }

    const events: any[] = [];
    for (const conn of connections) {
      const roomMapping = conn.roomMappings[0];
      const externalRoomTypeId = roomMapping?.externalRoomTypeId || 'DEFAULT';
      const externalRatePlanId = roomMapping?.externalRatePlanId || null;

      const payload = {
        eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        eventType: 'RATE.CHANGED',
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        partnerId: conn.partnerId,
        connectionId: conn.id,
        propertyId,
        externalPropertyId: conn.externalPropertyId,
        data: {
          externalRoomTypeId,
          externalRatePlanId,
          startDate,
          endDate,
          price: Number(price),
          currency,
        },
      };

      const event = await prismaTx.connectivityOutbox.create({
        data: {
          partnerId: conn.partnerId,
          connectionId: conn.id,
          eventType: 'RATE.CHANGED',
          aggregateId: `PROPERTY:${propertyId}:ROOMTYPE:${roomTypeId}:RATES`,
          payload,
          status: 'PENDING',
        },
      });
      events.push(event);
    }
    return events;
  }

  async createRestrictionEventForProperty(
    tx: any,
    propertyId: string,
    roomTypeId: string,
    startDate: string,
    endDate: string,
    restrictions: {
      minStay?: number;
      maxStay?: number;
      closedToArrival?: boolean;
      closedToDeparture?: boolean;
      stopSell?: boolean;
    },
    originatingPartnerId?: string,
  ) {
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.restrictionSync) {
      return [];
    }

    const prismaTx = tx || this.prisma;
    const connections = await prismaTx.connectivityPartnerConnection.findMany({
      where: {
        propertyId,
        status: { in: ['ACTIVE', 'DEGRADED'] },
        ...(originatingPartnerId ? { partnerId: { not: originatingPartnerId } } : {}),
      },
      include: {
        roomMappings: { where: { roomTypeId } },
      },
    });

    if (!connections || connections.length === 0) {
      return [];
    }

    const events: any[] = [];
    for (const conn of connections) {
      const roomMapping = conn.roomMappings[0];
      const externalRoomTypeId = roomMapping?.externalRoomTypeId || 'DEFAULT';

      const payload = {
        eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        eventType: 'RESTRICTION.CHANGED',
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        partnerId: conn.partnerId,
        connectionId: conn.id,
        propertyId,
        externalPropertyId: conn.externalPropertyId,
        data: {
          externalRoomTypeId,
          startDate,
          endDate,
          restrictions: {
            minStay: restrictions.minStay ?? null,
            maxStay: restrictions.maxStay ?? null,
            closedToArrival: Boolean(restrictions.closedToArrival),
            closedToDeparture: Boolean(restrictions.closedToDeparture),
            stopSell: Boolean(restrictions.stopSell),
          },
        },
      };

      const event = await prismaTx.connectivityOutbox.create({
        data: {
          partnerId: conn.partnerId,
          connectionId: conn.id,
          eventType: 'RESTRICTION.CHANGED',
          aggregateId: `PROPERTY:${propertyId}:ROOMTYPE:${roomTypeId}:RESTRICTIONS`,
          payload,
          status: 'PENDING',
        },
      });
      events.push(event);
    }
    return events;
  }

  async createContentEventForProperty(
    tx: any,
    propertyId: string,
    changeType: 'PROPERTY_DETAILS' | 'ROOM_TYPE_DETAILS' | 'AMENITIES_AND_POLICIES' | 'PHOTOS' | 'POLICIES',
  ) {
    const prismaTx = tx || this.prisma;
    const connections = await prismaTx.connectivityPartnerConnection.findMany({
      where: {
        propertyId,
        status: { in: ['ACTIVE', 'DEGRADED'] },
      },
    });

    if (!connections || connections.length === 0) {
      return [];
    }

    const events: any[] = [];
    for (const conn of connections) {
      const payload = {
        eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        eventType: 'CONTENT.CHANGED',
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        partnerId: conn.partnerId,
        connectionId: conn.id,
        propertyId,
        externalPropertyId: conn.externalPropertyId,
        data: {
          changeType,
          contentUrl: `/api/connectivity/v1/content?externalPropertyId=${encodeURIComponent(conn.externalPropertyId)}`,
        },
      };

      const event = await prismaTx.connectivityOutbox.create({
        data: {
          partnerId: conn.partnerId,
          connectionId: conn.id,
          eventType: 'CONTENT.CHANGED',
          aggregateId: `PROPERTY:${propertyId}:CONTENT`,
          payload,
          status: 'PENDING',
        },
      });
      events.push(event);
    }
    return events;
  }
}
