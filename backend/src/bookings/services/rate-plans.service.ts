import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRatePlanDto, UpdateRatePlanDto, BulkPricingRuleDto, CreateCalendarEventMarkerDto } from '../dto/rate-plan.dto';
import { MealPlan, RatePlanPricingType, PricingAdjustmentType } from '@prisma/client';

@Injectable()
export class RatePlansService {
  private readonly logger = new Logger(RatePlansService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Seed default primary EP rate plan if a room type has no rate plans yet.
   */
  async ensureDefaultRatePlan(roomTypeId: string) {
    const existing = await this.prisma.ratePlan.findFirst({
      where: { roomTypeId, isActive: true },
    });

    if (existing) return existing;

    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${roomTypeId} not found.`);
    }

    this.logger.log(`Seeding default primary EP RatePlan for RoomType '${roomType.name}' (${roomTypeId})`);

    return this.prisma.ratePlan.create({
      data: {
        roomTypeId,
        name: `${roomType.name} EP (Room Only)`,
        code: 'EP',
        mealPlan: MealPlan.EP,
        isPrimary: true,
        pricingType: RatePlanPricingType.ABSOLUTE,
        basePrice: roomType.basePrice,
        extraAdultPrice: roomType.extraAdultPrice,
        extraChildPrice: roomType.extraChildPrice,
      },
    });
  }

  async getRatePlansForRoomType(roomTypeId: string) {
    await this.ensureDefaultRatePlan(roomTypeId);
    return this.prisma.ratePlan.findMany({
      where: { roomTypeId, isActive: true },
      include: {
        derivedFrom: true,
        pricingRules: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRatePlansForProperty(propertyId: string) {
    const roomTypes = await this.prisma.roomType.findMany({
      where: { propertyId },
      select: { id: true },
    });

    for (const rt of roomTypes) {
      await this.ensureDefaultRatePlan(rt.id);
    }

    return this.prisma.ratePlan.findMany({
      where: {
        roomType: { propertyId },
        isActive: true,
      },
      include: {
        roomType: {
          select: { id: true, name: true },
        },
        derivedFrom: true,
        pricingRules: {
          where: { isActive: true },
        },
      },
      orderBy: [{ roomTypeId: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createRatePlan(dto: CreateRatePlanDto) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: dto.roomTypeId },
    });

    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${dto.roomTypeId} not found.`);
    }

    if (dto.isPrimary) {
      // Demote other primary rate plans for this room type
      await this.prisma.ratePlan.updateMany({
        where: { roomTypeId: dto.roomTypeId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const createData: any = {
      roomTypeId: dto.roomTypeId,
      name: dto.name,
      code: dto.code || dto.mealPlan,
      mealPlan: dto.mealPlan,
      isPrimary: dto.isPrimary || false,
      pricingType: dto.pricingType || RatePlanPricingType.ABSOLUTE,
      derivedFromId: dto.derivedFromId || null,
      derivedAmount: dto.derivedAmount !== undefined ? dto.derivedAmount : null,
      derivedPercentage: dto.derivedPercentage !== undefined ? dto.derivedPercentage : null,
      basePrice: dto.basePrice,
      extraAdultPrice: dto.extraAdultPrice,
      extraChildPrice: dto.extraChildPrice,
      cancellationPolicyId: dto.cancellationPolicyId || null,
    };

    const createdPlan = await this.prisma.ratePlan.create({
      data: createData,
    });

    if (dto.acType) {
      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "rate_plans" SET "acType" = $1::"AcType" WHERE "id" = $2`,
          dto.acType,
          createdPlan.id,
        );
      } catch (err) {
        this.logger.warn(`Could not set acType on rate_plans: ${err.message}`);
      }
    }

    if (createdPlan.isPrimary) {
      await this.prisma.roomType.update({
        where: { id: createdPlan.roomTypeId },
        data: {
          basePrice: Number(createdPlan.basePrice),
          extraAdultPrice: Number(createdPlan.extraAdultPrice ?? 0),
          extraChildPrice: Number(createdPlan.extraChildPrice ?? 0),
        },
      });
    }

    return createdPlan;
  }

  async updateRatePlan(id: string, dto: UpdateRatePlanDto) {
    const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id } });
    if (!ratePlan) {
      throw new NotFoundException(`RatePlan with ID ${id} not found.`);
    }

    if (dto.isPrimary) {
      await this.prisma.ratePlan.updateMany({
        where: { roomTypeId: ratePlan.roomTypeId, isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      });
    }

    const updateData: any = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.code !== undefined && { code: dto.code }),
      ...(dto.mealPlan !== undefined && { mealPlan: dto.mealPlan }),
      ...(dto.isPrimary !== undefined && { isPrimary: dto.isPrimary }),
      ...(dto.pricingType !== undefined && { pricingType: dto.pricingType }),
      ...(dto.derivedFromId !== undefined && { derivedFromId: dto.derivedFromId }),
      ...(dto.derivedAmount !== undefined && { derivedAmount: dto.derivedAmount }),
      ...(dto.derivedPercentage !== undefined && { derivedPercentage: dto.derivedPercentage }),
      ...(dto.basePrice !== undefined && { basePrice: dto.basePrice }),
      ...(dto.extraAdultPrice !== undefined && { extraAdultPrice: dto.extraAdultPrice }),
      ...(dto.extraChildPrice !== undefined && { extraChildPrice: dto.extraChildPrice }),
      ...(dto.cancellationPolicyId !== undefined && { cancellationPolicyId: dto.cancellationPolicyId }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
    };

    const updatedPlan = await this.prisma.ratePlan.update({
      where: { id },
      data: updateData,
    });

    if (dto.acType !== undefined) {
      try {
        await this.prisma.$executeRawUnsafe(
          `UPDATE "rate_plans" SET "acType" = $1::"AcType" WHERE "id" = $2`,
          dto.acType,
          id,
        );
      } catch (err) {
        this.logger.warn(`Could not set acType on rate_plans: ${err.message}`);
      }
    }

    if (updatedPlan.isPrimary) {
      await this.prisma.roomType.update({
        where: { id: updatedPlan.roomTypeId },
        data: {
          basePrice: Number(updatedPlan.basePrice),
          extraAdultPrice: Number(updatedPlan.extraAdultPrice ?? 0),
          extraChildPrice: Number(updatedPlan.extraChildPrice ?? 0),
        },
      });
    }

    return updatedPlan;
  }

  async deleteRatePlan(id: string) {
    const ratePlan = await this.prisma.ratePlan.findUnique({ where: { id } });
    if (!ratePlan) {
      throw new NotFoundException(`RatePlan with ID ${id} not found.`);
    }

    if (ratePlan.isPrimary) {
      throw new BadRequestException(`Cannot delete primary RatePlan. Promote another RatePlan to primary first.`);
    }

    return this.prisma.ratePlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Bulk Pricing Rule Application (Weekdays vs Weekends, Festivals, Date Overrides)
   */
  async applyBulkPricingRule(dto: BulkPricingRuleDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid date range provided.');
    }

    let targetRatePlanId = dto.ratePlanId;
    let targetRoomTypeId = dto.roomTypeId;

    if (targetRatePlanId && !targetRoomTypeId) {
      const rp = await this.prisma.ratePlan.findUnique({ where: { id: targetRatePlanId } });
      if (!rp) {
        throw new NotFoundException(`RatePlan ${targetRatePlanId} not found.`);
      }
      targetRoomTypeId = rp.roomTypeId;
    } else if (!targetRatePlanId && targetRoomTypeId) {
      const primaryPlan = await this.ensureDefaultRatePlan(targetRoomTypeId);
      targetRatePlanId = primaryPlan.id;
    }

    if (!targetRoomTypeId) {
      throw new BadRequestException('Either roomTypeId or ratePlanId must be provided.');
    }

    const name = dto.isFestivalRule
      ? `Festival Override: ${dto.festivalName || 'Special Event'}`
      : dto.daysOfWeek && dto.daysOfWeek.length > 0
      ? `Bulk Day Rule (${dto.daysOfWeek.join(',')})`
      : `Date Range Rule (${dto.startDate} to ${dto.endDate})`;

    const rule = await this.prisma.pricingRule.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        daysOfWeek: dto.daysOfWeek || [],
        adjustmentType: PricingAdjustmentType.SET_FIXED_PRICE,
        adjustmentValue: dto.price,
        roomTypeId: targetRoomTypeId,
        ratePlanId: targetRatePlanId,
        isFestivalRule: dto.isFestivalRule || false,
        festivalName: dto.festivalName || null,
      },
    });

    this.logger.log(`Created PricingRule '${name}' (${rule.id}) for RoomType ${targetRoomTypeId} RatePlan ${targetRatePlanId}`);

    return rule;
  }

  /**
   * Calendar Event & Festival Markers
   */
  async getCalendarEventMarkers(propertyId: string, startDate?: string, endDate?: string) {
    const whereClause: any = {
      OR: [
        { propertyId: null }, // National/Global Holidays
        { propertyId },
      ],
    };

    if (startDate && endDate) {
      whereClause.startDate = { lte: new Date(endDate) };
      whereClause.endDate = { gte: new Date(startDate) };
    }

    return this.prisma.calendarEventMarker.findMany({
      where: whereClause,
      orderBy: { startDate: 'asc' },
    });
  }

  async createCalendarEventMarker(dto: CreateCalendarEventMarkerDto) {
    return this.prisma.calendarEventMarker.create({
      data: {
        propertyId: dto.propertyId || null,
        title: dto.title,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        colorTag: dto.colorTag || '#EF4444',
      },
    });
  }

  async deleteCalendarEventMarker(id: string) {
    return this.prisma.calendarEventMarker.delete({
      where: { id },
    });
  }
}
