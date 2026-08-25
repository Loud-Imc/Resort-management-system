import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivityConnectionService } from './connectivity-connection.service';
import { ConnectivityMappingService } from './connectivity-mapping.service';
import { ConnectivitySettingsService } from './connectivity-settings.service';
import { ConnectivityLogService } from './connectivity-log.service';
import { QueryAvailabilityDto } from '../dto/query-availability.dto';
import { UpdateAvailabilityDto } from '../dto/update-availability.dto';

@Injectable()
export class ConnectivityAvailabilityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionService: ConnectivityConnectionService,
    private readonly mappingService: ConnectivityMappingService,
    private readonly settingsService: ConnectivitySettingsService,
    private readonly logService: ConnectivityLogService,
  ) {}

  async getAvailability(partnerId: string, dto: QueryAvailabilityDto, credentialEnv?: string) {
    // 1. Enforce central global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.availabilitySync) {
      throw new ForbiddenException('Availability synchronization is currently disabled globally');
    }

    // 2. Validate partner connection for the target property (unless called internally as SYSTEM)
    let propertyId = dto.propertyId;
    let connection: any = null;

    if (partnerId !== 'SYSTEM') {
      connection = await this.connectionService.getConnectionForPartnerAndProperty(
        partnerId,
        dto.propertyId,
        credentialEnv,
      );
      propertyId = connection.propertyId;
    }

    // 3. Load registered RoomType mappings for this connection
    let targetMappings: any[] = [];
    if (partnerId !== 'SYSTEM' && connection) {
      const mappings = await this.mappingService.getRoomMappingsForConnection(partnerId, propertyId);
      if (!mappings || mappings.length === 0) {
        throw new NotFoundException(`No RoomType mappings registered for property connection ${connection.id}`);
      }
      targetMappings = mappings;
      if (dto.roomTypeId) {
        targetMappings = mappings.filter(
          (m) => m.roomTypeId === dto.roomTypeId || m.externalRoomTypeId === dto.roomTypeId,
        );
        if (targetMappings.length === 0) {
          throw new NotFoundException(`RoomType ${dto.roomTypeId} is not mapped for this property connection`);
        }
      }
    } else {
      const roomTypes = await this.prisma.roomType.findMany({ where: { propertyId, ...(dto.roomTypeId ? { id: dto.roomTypeId } : {}) } });
      targetMappings = roomTypes.map((rt) => ({ roomTypeId: rt.id, externalRoomTypeId: rt.name }));
    }

    // 4. Parse date range
    const start = new Date(dto.startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dto.endDate);
    end.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate provided');
    }
    if (start > end) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    // 5. Fetch all active bookings in date range for property
    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED', 'PENDING_PAYMENT'] },
        checkInDate: { lt: new Date(end.getTime() + 86400000) },
        checkOutDate: { gt: start },
      },
      select: {
        roomTypeId: true,
        checkInDate: true,
        checkOutDate: true,
      },
    });

    // 6. Fetch stop-sell restrictions in date range
    const stopSells = await this.prisma.stopSellRestriction.findMany({
      where: {
        propertyId,
        isActive: true,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    // 7. Fetch external availability allocation overrides in date range
    const overrides = await (this.prisma as any).connectivityAvailabilityOverride.findMany({
      where: {
        propertyId,
        date: { gte: start, lte: end },
      },
    });

    const availabilityResults: Array<{
      date: string;
      roomTypeId: string;
      externalRoomTypeId: string;
      sellableQuantity: number;
      physicalAvailability: number;
      externalAllocationCap: number | null;
      isStopSell: boolean;
    }> = [];

    // 8. Iterate mapped room types and calculate daily effective sellable quantity
    for (const mapping of targetMappings) {
      const roomTypeId = mapping.roomTypeId;

      // Count total enabled rooms in AVAILABLE or OCCUPIED status
      const totalRoomsCount = await this.prisma.room.count({
        where: {
          roomTypeId,
          propertyId,
          isEnabled: true,
          status: { in: ['AVAILABLE', 'OCCUPIED'] },
        },
      });

      const current = new Date(start);
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);

        // Check if StopSell applies for this date & roomType
        const hasStopSell = stopSells.some((ss) => {
          const ssStart = new Date(ss.startDate);
          ssStart.setHours(0, 0, 0, 0);
          const ssEnd = new Date(ss.endDate);
          ssEnd.setHours(23, 59, 59, 999);
          return (!ss.roomTypeId || ss.roomTypeId === roomTypeId) && dayStart <= ssEnd && dayEnd >= ssStart;
        });

        // Count overlapping active bookings for this date
        const bookedCount = bookings.filter((b) => {
          if (b.roomTypeId !== roomTypeId) return false;
          const bStart = new Date(b.checkInDate);
          bStart.setHours(0, 0, 0, 0);
          const bEnd = new Date(b.checkOutDate);
          bEnd.setHours(0, 0, 0, 0);
          return dayStart < bEnd && dayEnd > bStart;
        }).length;

        const physicalAvailability = hasStopSell ? 0 : Math.max(0, totalRoomsCount - bookedCount);

        // Find external allocation override cap for this date & roomType
        const override = overrides.find((o: any) => {
          if (o.roomTypeId !== roomTypeId) return false;
          const oDate = new Date(o.date);
          const y = oDate.getFullYear();
          const m = String(oDate.getMonth() + 1).padStart(2, '0');
          const d = String(oDate.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}` === dateStr;
        });

        let effectiveQuantity = physicalAvailability;
        let externalCap: number | null = null;

        if (override && override.allocatedQuantity !== undefined && override.allocatedQuantity !== null) {
          externalCap = Math.max(0, override.allocatedQuantity);
          // Effective Availability = MIN(Physical Availability, External Allocation Cap)
          effectiveQuantity = Math.min(physicalAvailability, externalCap);
        }

        availabilityResults.push({
          date: dateStr,
          roomTypeId: mapping.roomTypeId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          sellableQuantity: effectiveQuantity,
          physicalAvailability,
          externalAllocationCap: externalCap,
          isStopSell: hasStopSell,
        });

        current.setDate(current.getDate() + 1);
      }
    }

    return {
      propertyId,
      externalPropertyId: connection?.externalPropertyId || propertyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      availability: availabilityResults,
    };
  }

  async updateAvailability(partner: any, dto: UpdateAvailabilityDto) {
    const partnerId = partner.id;

    // 1. Enforce central global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.availabilitySync) {
      throw new ForbiddenException('Availability synchronization is currently disabled globally');
    }

    // 2. Validate partner connection for target property
    const connection = await this.connectionService.getConnectionForPartnerAndProperty(
      partnerId,
      dto.propertyId,
    );

    const propertyId = connection.propertyId;

    // 3. Load registered RoomType mappings for this connection
    const mappings = await this.mappingService.getRoomMappingsForConnection(partnerId, propertyId);
    if (!mappings || mappings.length === 0) {
      throw new NotFoundException(`No RoomType mappings registered for property connection ${connection.id}`);
    }

    if (!dto.availability || dto.availability.length === 0) {
      throw new BadRequestException('At least one availability update item must be provided');
    }

    const updatedOverrides: any[] = [];

    // 4. Process each availability update item
    for (const item of dto.availability) {
      const mapping = mappings.find(
        (m) => m.externalRoomTypeId === item.externalRoomTypeId || m.roomTypeId === item.externalRoomTypeId,
      );

      if (!mapping) {
        throw new BadRequestException(`RoomType ${item.externalRoomTypeId} is not mapped for this connection`);
      }

      const start = new Date(item.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(item.endDate);
      end.setHours(0, 0, 0, 0);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new BadRequestException(`Invalid date range [${item.startDate} to ${item.endDate}]`);
      }
      if (start > end) {
        throw new BadRequestException(`startDate (${item.startDate}) cannot be after endDate (${item.endDate})`);
      }

      const isReset = item.sellableQuantity === null || item.sellableQuantity === undefined;

      if (!isReset && item.sellableQuantity! < 0) {
        throw new BadRequestException('sellableQuantity cannot be negative');
      }

      const current = new Date(start);
      while (current <= end) {
        const dateObj = new Date(current);
        dateObj.setHours(0, 0, 0, 0);

        if (isReset) {
          // Remove/reset allocation cap override for this date
          await (this.prisma as any).connectivityAvailabilityOverride.deleteMany({
            where: {
              propertyId,
              roomTypeId: mapping.roomTypeId,
              date: dateObj,
            },
          });
        } else {
          // Upsert external allocation cap override record
          const override = await (this.prisma as any).connectivityAvailabilityOverride.upsert({
            where: {
              propertyId_roomTypeId_date: {
                propertyId,
                roomTypeId: mapping.roomTypeId,
                date: dateObj,
              },
            },
            create: {
              propertyId,
              roomTypeId: mapping.roomTypeId,
              date: dateObj,
              allocatedQuantity: item.sellableQuantity!,
            },
            update: {
              allocatedQuantity: item.sellableQuantity!,
            },
          });

          updatedOverrides.push({
            id: override.id,
            externalRoomTypeId: mapping.externalRoomTypeId,
            roomTypeId: mapping.roomTypeId,
            date: dateObj.toISOString().slice(0, 10),
            allocatedQuantity: override.allocatedQuantity,
          });
        }

        current.setDate(current.getDate() + 1);
      }
    }

    // 5. Log operation via ConnectivityLogService
    await this.logService.createLog({
      partnerId,
      connectionId: connection.id,
      endpoint: '/api/connectivity/v1/availability',
      method: 'PUT',
      statusCode: 200,
      requestPayload: dto,
      responsePayload: { status: 'SUCCESS', updatedOverridesCount: updatedOverrides.length },
    });

    return {
      status: 'SUCCESS',
      message: `Successfully processed availability allocation update(s)`,
      propertyId: connection.propertyId,
      externalPropertyId: connection.externalPropertyId,
      updatedOverrides,
    };
  }

  async recalculateAndEmitAvailability(
    tx: any,
    propertyId: string,
    roomTypeId: string,
    startDateStr: string,
    endDateStr: string,
  ) {
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.availabilitySync) {
      return [];
    }

    const prismaTx = tx || this.prisma;

    // Find all active partner connections for propertyId
    const connections = await prismaTx.connectivityPartnerConnection.findMany({
      where: {
        propertyId,
        status: 'ACTIVE',
      },
      include: {
        partner: true,
        roomMappings: {
          where: { roomTypeId },
        },
      },
    });

    if (!connections || connections.length === 0) {
      return [];
    }

    // Calculate current availability for roomTypeId
    const availResult = await this.getAvailability('SYSTEM', {
      propertyId,
      roomTypeId,
      startDate: startDateStr,
      endDate: endDateStr,
    }).catch(() => null);

    if (!availResult || !availResult.availability || availResult.availability.length === 0) {
      return [];
    }

    const outboxRecords: any[] = [];

    for (const conn of connections) {
      const mapping = conn.roomMappings[0];
      if (!mapping) continue;

      const minAvailable = Math.min(...availResult.availability.map((a: any) => a.sellableQuantity));

      const eventPayload = {
        eventId: `evt-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        eventType: 'AVAILABILITY.CHANGED',
        apiVersion: 'v1',
        timestamp: new Date().toISOString(),
        partnerId: conn.partnerId,
        connectionId: conn.id,
        propertyId,
        externalPropertyId: conn.externalPropertyId,
        data: {
          externalRoomTypeId: mapping.externalRoomTypeId,
          roomTypeId,
          startDate: startDateStr,
          endDate: endDateStr,
          availableQuantity: minAvailable,
        },
      };

      const outbox = await prismaTx.connectivityOutbox.create({
        data: {
          partnerId: conn.partnerId,
          connectionId: conn.id,
          eventType: 'AVAILABILITY.CHANGED',
          aggregateId: `${propertyId}_${roomTypeId}`,
          payload: eventPayload,
          status: 'PENDING',
        },
      });

      outboxRecords.push(outbox);
    }

    return outboxRecords;
  }
}
