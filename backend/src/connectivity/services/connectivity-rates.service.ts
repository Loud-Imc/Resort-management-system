import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivityConnectionService } from './connectivity-connection.service';
import { ConnectivityMappingService } from './connectivity-mapping.service';
import { ConnectivitySettingsService } from './connectivity-settings.service';
import { ConnectivityLogService } from './connectivity-log.service';
import { ConnectivityOutboxService } from './connectivity-outbox.service';
import { PricingService } from '../../bookings/pricing.service';
import { QueryRatesDto } from '../dto/query-rates.dto';
import { UpdateRatesDto } from '../dto/update-rates.dto';
import { PricingAdjustmentType } from '@prisma/client';

@Injectable()
export class ConnectivityRatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly connectionService: ConnectivityConnectionService,
    private readonly mappingService: ConnectivityMappingService,
    private readonly settingsService: ConnectivitySettingsService,
    private readonly logService: ConnectivityLogService,
    private readonly pricingService: PricingService,
    @Optional() @Inject(forwardRef(() => ConnectivityOutboxService))
    private readonly outboxService?: ConnectivityOutboxService,
  ) {}

  async getRates(partnerId: string, dto: QueryRatesDto) {
    // 1. Enforce central global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.rateSync) {
      throw new ForbiddenException('Rate synchronization is currently disabled globally');
    }

    // 2. Validate partner connection for the target property
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
    const end = new Date(dto.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid startDate or endDate provided');
    }
    if (start > end) {
      throw new BadRequestException('startDate cannot be after endDate');
    }

    const rateResults: Array<{
      date: string;
      roomTypeId: string;
      externalRoomTypeId: string;
      externalRatePlanId: string | null;
      price: number;
      currency: string;
      baseAmount: number;
      taxAmount: number;
      isGstInclusive: boolean;
    }> = [];

    // 5. Query PricingService for each mapped RoomType
    for (const mapping of targetMappings) {
      const dailyQuotes = await this.pricingService.getPublishedDailyRates(
        mapping.roomTypeId,
        dto.startDate,
        dto.endDate,
        dto.currency,
        mapping.externalRatePlanId || undefined,
      );

      for (const quote of dailyQuotes) {
        rateResults.push({
          date: quote.date,
          roomTypeId: mapping.roomTypeId,
          externalRoomTypeId: mapping.externalRoomTypeId,
          externalRatePlanId: mapping.externalRatePlanId,
          price: Number(quote.convertedPublishedPrice || quote.publishedPrice),
          currency: quote.targetCurrency || quote.baseCurrency,
          baseAmount: Number(quote.breakdown.basePrice),
          taxAmount: Number(quote.breakdown.taxAmount),
          isGstInclusive: Boolean(quote.breakdown.isGstInclusive),
        });
      }
    }

    return {
      propertyId: connection.propertyId,
      externalPropertyId: connection.externalPropertyId,
      currency: dto.currency || 'INR',
      startDate: dto.startDate,
      endDate: dto.endDate,
      rates: rateResults,
    };
  }

  async updateRates(partner: any, dto: UpdateRatesDto) {
    const partnerId = partner.id;

    // 1. Enforce central global capability switch
    const capabilities = await this.settingsService.getGlobalCapabilities();
    if (!capabilities.rateSync) {
      throw new ForbiddenException('Rate synchronization is currently disabled globally');
    }

    // 2. Validate partner connection for the target property
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

    if (!dto.rates || dto.rates.length === 0) {
      throw new BadRequestException('At least one rate update item must be provided');
    }

    const updatedRules: any[] = [];
    const ruleName = `EXTERNAL_RATE_SYNC:${partner.code || 'PARTNER'}`;

    // 4. Process each rate update item
    for (const item of dto.rates) {
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
      if (item.price === undefined || item.price === null || item.price <= 0) {
        throw new BadRequestException('Price must be greater than 0');
      }

      // Load target RoomType to compute adjustment value against basePrice
      const roomType = await this.prisma.roomType.findUnique({
        where: { id: mapping.roomTypeId },
        select: { id: true, propertyId: true, basePrice: true },
      });

      if (!roomType) {
        throw new NotFoundException(`RoomType ${mapping.roomTypeId} not found`);
      }
      if (roomType.propertyId !== propertyId) {
        throw new BadRequestException(`RoomType ${mapping.roomTypeId} does not belong to target property ${propertyId}`);
      }

      const basePrice = Number(roomType.basePrice || 0);
      const targetPrice = Number(item.price);
      // Adjustment value = Target Price - Base Price
      const adjustmentValue = Number((targetPrice - basePrice).toFixed(2));

      // Check for existing rule to maintain idempotency & avoid duplicate active rules
      const existingRule = await this.prisma.pricingRule.findFirst({
        where: {
          name: ruleName,
          roomTypeId: roomType.id,
          startDate: start,
          endDate: end,
        },
      });

      let rule: any;
      if (existingRule) {
        rule = await this.prisma.pricingRule.update({
          where: { id: existingRule.id },
          data: {
            adjustmentType: PricingAdjustmentType.FIXED_AMOUNT,
            adjustmentValue,
            isActive: true,
          },
        });
      } else {
        rule = await this.prisma.pricingRule.create({
          data: {
            name: ruleName,
            description: `External rate sync from partner ${partner.name || partner.code}`,
            startDate: start,
            endDate: end,
            adjustmentType: PricingAdjustmentType.FIXED_AMOUNT,
            adjustmentValue,
            roomTypeId: roomType.id,
            isActive: true,
          },
        });
      }

      // Produce RATE.CHANGED Outbox Event (with originatingPartnerId echo suppression)
      if (this.outboxService) {
        await this.outboxService.createRateEventForProperty(
          null,
          propertyId,
          roomType.id,
          item.startDate,
          item.endDate,
          targetPrice,
          dto.currency || 'INR',
          partnerId,
        );
      }

      updatedRules.push({
        id: rule.id,
        externalRoomTypeId: mapping.externalRoomTypeId,
        roomTypeId: roomType.id,
        startDate: item.startDate,
        endDate: item.endDate,
        price: targetPrice,
        basePrice,
        adjustmentValue,
        ruleName: rule.name,
      });
    }

    // 5. Log operation via ConnectivityLogService
    await this.logService.createLog({
      partnerId,
      connectionId: connection.id,
      endpoint: '/api/connectivity/v1/rates',
      method: 'PUT',
      statusCode: 200,
      requestPayload: dto,
      responsePayload: { status: 'SUCCESS', updatedRulesCount: updatedRules.length },
    });

    return {
      status: 'SUCCESS',
      message: `Successfully processed ${updatedRules.length} rate rule(s)`,
      propertyId: connection.propertyId,
      externalPropertyId: connection.externalPropertyId,
      currency: dto.currency || 'INR',
      updatedRules,
    };
  }
}
