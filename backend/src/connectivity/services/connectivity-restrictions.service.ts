import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivityConnectionService } from './connectivity-connection.service';
import { ConnectivityMappingService } from './connectivity-mapping.service';
import { ConnectivitySettingsService } from './connectivity-settings.service';
import { ConnectivityOutboxService } from './connectivity-outbox.service';
import { AvailabilityService } from '../../bookings/availability.service';
import { QueryRestrictionsDto } from '../dto/query-restrictions.dto';
import { UpdateRestrictionsDto } from '../dto/update-restrictions.dto';

@Injectable()
export class ConnectivityRestrictionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionService: ConnectivityConnectionService,
    private readonly mappingService: ConnectivityMappingService,
    private readonly settingsService: ConnectivitySettingsService,
    private readonly availabilityService: AvailabilityService,
    @Optional() @Inject(forwardRef(() => ConnectivityOutboxService))
    private readonly outboxService?: ConnectivityOutboxService,
  ) {}

  async getRestrictions(partnerId: string, dto: QueryRestrictionsDto, credentialEnv?: string) {
    // 1. Enforce central global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.restrictionSync) {
      throw new ForbiddenException('Restriction synchronization is currently disabled globally');
    }

    // 2. Validate partner connection for the target property
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

    // Filter by specific roomTypeId if requested in query DTO
    let targetMappings = mappings;
    if (dto.roomTypeId) {
      targetMappings = mappings.filter(
        (m) => m.roomTypeId === dto.roomTypeId || m.externalRoomTypeId === dto.roomTypeId,
      );
      if (targetMappings.length === 0) {
        throw new NotFoundException(`RoomType ${dto.roomTypeId} is not mapped for this property connection`);
      }
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

    const restrictionResults: Array<{
      date: string;
      roomTypeId: string;
      externalRoomTypeId: string;
      stopSell: boolean;
      minStayArrival: number | null;
      minStayThrough: number | null;
      maxStay: number | null;
      closedToArrival: boolean;
      closedToDeparture: boolean;
    }> = [];

    // 5. Evaluate effective restrictions per mapped RoomType
    for (const mapping of targetMappings) {
      const roomTypeId = mapping.roomTypeId;
      const dailyMap = await this.availabilityService.evaluateRestrictions(
        propertyId,
        roomTypeId,
        dto.startDate,
        dto.endDate,
      );

      const current = new Date(start);
      while (current <= end) {
        const year = current.getFullYear();
        const month = String(current.getMonth() + 1).padStart(2, '0');
        const day = String(current.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        const eff = dailyMap.get(dateStr) || {
          stopSell: false,
          minStayArrival: null,
          minStayThrough: null,
          maxStay: null,
          closedToArrival: false,
          closedToDeparture: false,
        };

        restrictionResults.push({
          date: dateStr,
          roomTypeId: mapping.roomTypeId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          stopSell: eff.stopSell,
          minStayArrival: eff.minStayArrival,
          minStayThrough: eff.minStayThrough,
          maxStay: eff.maxStay,
          closedToArrival: eff.closedToArrival,
          closedToDeparture: eff.closedToDeparture,
        });

        current.setDate(current.getDate() + 1);
      }
    }

    return {
      propertyId: connection.propertyId,
      externalPropertyId: connection.externalPropertyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      restrictions: restrictionResults,
    };
  }

  async updateRestrictions(partnerIdOrPartner: string | any, dto: UpdateRestrictionsDto, credentialEnv?: string) {
    const partnerId = typeof partnerIdOrPartner === 'string' ? partnerIdOrPartner : partnerIdOrPartner.id;

    // 1. Enforce central global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.restrictionSync) {
      throw new ForbiddenException('Restriction synchronization is currently disabled globally');
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

    if (!dto.restrictions || dto.restrictions.length === 0) {
      throw new BadRequestException('At least one restriction update item must be provided');
    }

    const updatedRules: any[] = [];

    // 4. Process each restriction update item
    for (const item of dto.restrictions) {
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

      if (item.minStayArrival !== undefined && item.minStayArrival !== null && item.minStayArrival < 1) {
        throw new BadRequestException('minStayArrival must be at least 1');
      }
      if (item.minStayThrough !== undefined && item.minStayThrough !== null && item.minStayThrough < 1) {
        throw new BadRequestException('minStayThrough must be at least 1');
      }
      if (item.maxStay !== undefined && item.maxStay !== null && item.maxStay < 1) {
        throw new BadRequestException('maxStay must be at least 1');
      }

      const minVal = item.minStayArrival || item.minStayThrough;
      if (minVal && item.maxStay && item.maxStay < minVal) {
        throw new BadRequestException(`maxStay (${item.maxStay}) cannot be less than minStay (${minVal})`);
      }

      // Upsert or create RestrictionRule record
      const rule = await (this.prisma as any).restrictionRule.create({
        data: {
          propertyId,
          roomTypeId: mapping.roomTypeId,
          startDate: start,
          endDate: end,
          minStayArrival: item.minStayArrival ?? null,
          minStayThrough: item.minStayThrough ?? null,
          maxStay: item.maxStay ?? null,
          closedToArrival: item.closedToArrival ?? false,
          closedToDeparture: item.closedToDeparture ?? false,
          isActive: true,
        },
      });

      // Produce RESTRICTION.CHANGED Outbox Event (with originatingPartnerId echo suppression)
      if (this.outboxService) {
        await this.outboxService.createRestrictionEventForProperty(
          null,
          propertyId,
          mapping.roomTypeId,
          item.startDate,
          item.endDate,
          {
            minStay: item.minStayArrival || item.minStayThrough,
            maxStay: item.maxStay,
            closedToArrival: item.closedToArrival,
            closedToDeparture: item.closedToDeparture,
            stopSell: Boolean((item as any).stopSell || (item.closedToArrival && item.closedToDeparture)),
          },
          partnerId,
        );
      }

      updatedRules.push({
        id: rule.id,
        externalRoomTypeId: mapping.externalRoomTypeId,
        roomTypeId: mapping.roomTypeId,
        startDate: item.startDate,
        endDate: item.endDate,
        minStayArrival: rule.minStayArrival,
        minStayThrough: rule.minStayThrough,
        maxStay: rule.maxStay,
        closedToArrival: rule.closedToArrival,
        closedToDeparture: rule.closedToDeparture,
      });
    }

    return {
      status: 'SUCCESS',
      message: `Successfully processed ${updatedRules.length} restriction rule(s)`,
      propertyId: connection.propertyId,
      externalPropertyId: connection.externalPropertyId,
      updatedRules,
    };
  }
}
