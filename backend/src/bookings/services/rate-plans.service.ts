import { Injectable, NotFoundException, BadRequestException, Logger, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ChannelsService } from '../../channels/channels.service';
import {
  CreateRatePlanDto,
  UpdateRatePlanDto,
  BulkPricingRuleDto,
  CreateCalendarEventMarkerDto,
  ApplyRestrictionsDto,
  SetInventoryOverrideDto,
} from '../dto/rate-plan.dto';
import { MealPlan, RatePlanPricingType, PricingAdjustmentType } from '@prisma/client';

@Injectable()
export class RatePlansService {
  private readonly logger = new Logger(RatePlansService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => ChannelsService)) private readonly channelsService?: ChannelsService,
  ) {}

  /**
   * Seed and standardize property-level rate plans (EP, CP, MAP, AP),
   * consolidating legacy per-room plans into the canonical 4 property tiers.
   */
  async ensureDefaultPropertyRatePlans(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found.`);
    }

    const existingPlans = await this.prisma.ratePlan.findMany({
      where: { propertyId, isActive: true },
      include: { roomTypePrices: true },
      orderBy: { createdAt: 'asc' },
    });

    // Detect legacy per-room plans (plans named after room types like "Lake View Haven EP (Room Only)")
    const rtNames = property.roomTypes.map((rt) => rt.name.trim().toLowerCase());
    const isLegacyPerRoomPlan = (name: string) => {
      const lower = name.trim().toLowerCase();
      return rtNames.some((rtn) => rtn.length > 2 && lower.includes(rtn) && lower.includes('ep'));
    };

    const legacyPlans = existingPlans.filter((p) => isLegacyPerRoomPlan(p.name));
    if (legacyPlans.length > 0) {
      this.logger.log(
        `Consolidating ${legacyPlans.length} legacy per-room rate plans for property '${property.name}' (${propertyId})`
      );
      for (const lp of legacyPlans) {
        await this.prisma.ratePlan.update({
          where: { id: lp.id },
          data: { isActive: false, isPrimary: false },
        });
      }
    }

    // Re-fetch remaining active plans after deactivating legacy per-room plans
    let activePlans = await this.prisma.ratePlan.findMany({
      where: { propertyId, isActive: true },
      include: { roomTypePrices: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    const standardPlans = [
      {
        name: 'Room Only (EP)',
        code: 'EP',
        mealPlan: MealPlan.EP,
        isPrimary: true,
        supplementAdult: 0,
        supplementChild: 0,
      },
      {
        name: 'Bed & Breakfast (CP)',
        code: 'CP',
        mealPlan: MealPlan.CP,
        isPrimary: false,
        supplementAdult: 250,
        supplementChild: 150,
      },
      {
        name: 'Half Board - Breakfast & Dinner (MAP)',
        code: 'MAP',
        mealPlan: MealPlan.MAP,
        isPrimary: false,
        supplementAdult: 700,
        supplementChild: 400,
      },
      {
        name: 'Full Board - All Meals (AP)',
        code: 'AP',
        mealPlan: MealPlan.AP,
        isPrimary: false,
        supplementAdult: 1200,
        supplementChild: 700,
      },
    ];

    // Ensure each of the 4 standard meal plans exists
    for (const sp of standardPlans) {
      let plan = activePlans.find((p) => p.mealPlan === sp.mealPlan);
      if (!plan) {
        plan = await this.prisma.ratePlan.create({
          data: {
            propertyId,
            name: sp.name,
            code: sp.code,
            mealPlan: sp.mealPlan,
            isPrimary: sp.isPrimary,
            pricingType: RatePlanPricingType.ABSOLUTE,
            basePrice: 0,
            extraAdultPrice: sp.supplementAdult,
            extraChildPrice: sp.supplementChild,
          },
          include: { roomTypePrices: true },
        });
        activePlans.push(plan);
      } else if (sp.isPrimary && !plan.isPrimary) {
        await this.prisma.ratePlan.update({
          where: { id: plan.id },
          data: { isPrimary: true },
        });
        plan.isPrimary = true;
      }
    }

    // Ensure only ONE plan is primary
    const primaryPlans = activePlans.filter((p) => p.isPrimary);
    if (primaryPlans.length > 1) {
      for (let i = 1; i < primaryPlans.length; i++) {
        await this.prisma.ratePlan.update({
          where: { id: primaryPlans[i].id },
          data: { isPrimary: false },
        });
        primaryPlans[i].isPrimary = false;
      }
    }

    // Ensure all room types have their RoomTypeRatePlanPrice records under each plan
    for (const plan of activePlans) {
      const sp = standardPlans.find((s) => s.mealPlan === plan.mealPlan);
      const adultOffset = sp ? sp.supplementAdult : 0;
      const childOffset = sp ? sp.supplementChild : 0;

      for (const rt of property.roomTypes) {
        const hasPrice = plan.roomTypePrices?.some((p) => p.roomTypeId === rt.id);
        if (!hasPrice) {
          const base = Number(rt.basePrice) + adultOffset * (Number(rt.baseAdults) || 2);
          const baseAc =
            rt.basePriceAc !== null
              ? Number(rt.basePriceAc) + adultOffset * (Number(rt.baseAdults) || 2)
              : null;

          await this.prisma.roomTypeRatePlanPrice.create({
            data: {
              ratePlanId: plan.id,
              roomTypeId: rt.id,
              basePrice: base,
              extraAdultPrice: Number(rt.extraAdultPrice) + adultOffset,
              extraChildPrice: Number(rt.extraChildPrice) + childOffset,
              basePriceAc: baseAc,
              extraAdultPriceAc:
                rt.extraAdultPriceAc !== null ? Number(rt.extraAdultPriceAc) + adultOffset : null,
              extraChildPriceAc:
                rt.extraChildPriceAc !== null ? Number(rt.extraChildPriceAc) + childOffset : null,
            },
          });
        }
      }
    }

    return this.prisma.ratePlan.findMany({
      where: { propertyId, isActive: true },
      include: {
        roomTypePrices: {
          include: {
            roomType: true,
          },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  /**
   * Explicitly reset a property's rate plans to the canonical 4 tiers (EP, CP, MAP, AP)
   */
  async resetPropertyRatePlans(propertyId: string) {
    // Deactivate all existing rate plans for this property
    await this.prisma.ratePlan.updateMany({
      where: { propertyId },
      data: { isActive: false, isPrimary: false },
    });

    return this.ensureDefaultPropertyRatePlans(propertyId);
  }

  async ensureDefaultRatePlan(roomTypeId: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });
    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${roomTypeId} not found.`);
    }
    const plans = await this.ensureDefaultPropertyRatePlans(roomType.propertyId);
    return plans.find(p => p.isPrimary) || plans[0];
  }

  async getRatePlansForRoomType(roomTypeId: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });
    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${roomTypeId} not found.`);
    }
    await this.ensureDefaultPropertyRatePlans(roomType.propertyId);
    return this.prisma.ratePlan.findMany({
      where: { propertyId: roomType.propertyId, isActive: true },
      include: {
        roomTypePrices: {
          where: { roomTypeId },
        },
        derivedFrom: true,
        pricingRules: {
          where: { isActive: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getRatePlansForProperty(propertyId: string) {
    await this.ensureDefaultPropertyRatePlans(propertyId);

    return this.prisma.ratePlan.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      include: {
        roomTypePrices: {
          include: {
            roomType: {
              select: { id: true, name: true, acOption: true, basePrice: true, basePriceAc: true },
            },
          },
        },
        derivedFrom: true,
        pricingRules: {
          where: { isActive: true },
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createRatePlan(dto: CreateRatePlanDto) {
    let propertyId = dto.propertyId;
    if (!propertyId && dto.roomTypeId) {
      const rt = await this.prisma.roomType.findUnique({ where: { id: dto.roomTypeId } });
      if (rt) propertyId = rt.propertyId;
    }

    if (!propertyId) {
      throw new BadRequestException('propertyId is required to create a RatePlan.');
    }

    if (dto.isPrimary) {
      await this.prisma.ratePlan.updateMany({
        where: { propertyId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const createdPlan = await this.prisma.ratePlan.create({
      data: {
        propertyId,
        name: dto.name,
        code: dto.code || dto.mealPlan,
        mealPlan: dto.mealPlan,
        isPrimary: dto.isPrimary || false,
        pricingType: dto.pricingType || RatePlanPricingType.ABSOLUTE,
        derivedFromId: dto.derivedFromId || null,
        derivedAmount: dto.derivedAmount !== undefined ? dto.derivedAmount : null,
        derivedPercentage: dto.derivedPercentage !== undefined ? dto.derivedPercentage : null,
        basePrice: dto.basePrice || 0,
        extraAdultPrice: dto.extraAdultPrice || 0,
        extraChildPrice: dto.extraChildPrice || 0,
        cancellationPolicyId: dto.cancellationPolicyId || null,
      },
    });

    if (dto.roomTypePrices && dto.roomTypePrices.length > 0) {
      for (const rtp of dto.roomTypePrices) {
        await this.prisma.roomTypeRatePlanPrice.upsert({
          where: {
            ratePlanId_roomTypeId: {
              ratePlanId: createdPlan.id,
              roomTypeId: rtp.roomTypeId,
            },
          },
          create: {
            ratePlanId: createdPlan.id,
            roomTypeId: rtp.roomTypeId,
            basePrice: rtp.basePrice,
            extraAdultPrice: rtp.extraAdultPrice || 0,
            extraChildPrice: rtp.extraChildPrice || 0,
            basePriceAc: rtp.basePriceAc !== undefined ? rtp.basePriceAc : null,
            extraAdultPriceAc: rtp.extraAdultPriceAc !== undefined ? rtp.extraAdultPriceAc : null,
            extraChildPriceAc: rtp.extraChildPriceAc !== undefined ? rtp.extraChildPriceAc : null,
          },
          update: {
            basePrice: rtp.basePrice,
            extraAdultPrice: rtp.extraAdultPrice || 0,
            extraChildPrice: rtp.extraChildPrice || 0,
            basePriceAc: rtp.basePriceAc !== undefined ? rtp.basePriceAc : null,
            extraAdultPriceAc: rtp.extraAdultPriceAc !== undefined ? rtp.extraAdultPriceAc : null,
            extraChildPriceAc: rtp.extraChildPriceAc !== undefined ? rtp.extraChildPriceAc : null,
          },
        });
      }
    } else {
      const roomTypes = await this.prisma.roomType.findMany({ where: { propertyId } });
      for (const rt of roomTypes) {
        await this.prisma.roomTypeRatePlanPrice.create({
          data: {
            ratePlanId: createdPlan.id,
            roomTypeId: rt.id,
            basePrice: dto.basePrice !== undefined ? dto.basePrice : rt.basePrice,
            extraAdultPrice: dto.extraAdultPrice !== undefined ? dto.extraAdultPrice : rt.extraAdultPrice,
            extraChildPrice: dto.extraChildPrice !== undefined ? dto.extraChildPrice : rt.extraChildPrice,
            basePriceAc: rt.basePriceAc,
            extraAdultPriceAc: rt.extraAdultPriceAc,
            extraChildPriceAc: rt.extraChildPriceAc,
          },
        });
      }
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
        where: { propertyId: ratePlan.propertyId, isPrimary: true, NOT: { id } },
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

    if (dto.roomTypePrices && dto.roomTypePrices.length > 0) {
      await this.updateRoomTypePrices(id, dto.roomTypePrices);
    }

    if (this.channelsService) {
      this.channelsService.pushAriForProperty(ratePlan.propertyId, 60).catch((err) => {
        this.logger.warn(`Failed to auto-sync Channex after rate plan update: ${err.message}`);
      });
    }

    return updatedPlan;
  }

  async updateRoomTypePrices(ratePlanId: string, prices: any[]) {
    for (const rtp of prices) {
      await this.prisma.roomTypeRatePlanPrice.upsert({
        where: {
          ratePlanId_roomTypeId: {
            ratePlanId,
            roomTypeId: rtp.roomTypeId,
          },
        },
        create: {
          ratePlanId,
          roomTypeId: rtp.roomTypeId,
          basePrice: rtp.basePrice,
          extraAdultPrice: rtp.extraAdultPrice ?? 0,
          extraChildPrice: rtp.extraChildPrice ?? 0,
          basePriceAc: rtp.basePriceAc ?? null,
          extraAdultPriceAc: rtp.extraAdultPriceAc ?? null,
          extraChildPriceAc: rtp.extraChildPriceAc ?? null,
        },
        update: {
          basePrice: rtp.basePrice,
          extraAdultPrice: rtp.extraAdultPrice ?? 0,
          extraChildPrice: rtp.extraChildPrice ?? 0,
          basePriceAc: rtp.basePriceAc ?? null,
          extraAdultPriceAc: rtp.extraAdultPriceAc ?? null,
          extraChildPriceAc: rtp.extraChildPriceAc ?? null,
        },
      });
    }
    return { success: true, count: prices.length };
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
   * Comprehensive Rate Matrix & Availability Grid Data Aggregator
   */
  async getPropertyRateMatrixData(propertyId: string, startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDateStr);
    end.setHours(23, 59, 59, 999);

    // 1. Fetch RoomTypes with physical rooms
    const roomTypes = await this.prisma.roomType.findMany({
      where: { propertyId },
      include: {
        rooms: {
          where: { isEnabled: true },
          select: { id: true, roomNumber: true, status: true, isEnabled: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Ensure default rate plans exist
    await this.ensureDefaultPropertyRatePlans(propertyId);

    // 2. Fetch Rate Plans with pricing rules and roomTypePrices
    const ratePlans = await this.prisma.ratePlan.findMany({
      where: {
        propertyId,
        isActive: true,
      },
      include: {
        roomTypePrices: {
          include: {
            roomType: {
              select: { id: true, name: true, amenities: true, acOption: true, basePrice: true, basePriceAc: true },
            },
          },
        },
        derivedFrom: true,
        pricingRules: {
          where: {
            isActive: true,
            startDate: { lte: end },
            endDate: { gte: start },
          },
          orderBy: [{ isFestivalRule: 'desc' }, { createdAt: 'desc' }],
        },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });

    // 3. Fetch RestrictionRules
    const restrictionRules = await this.prisma.restrictionRule.findMany({
      where: {
        propertyId,
        isActive: true,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    // 4. Fetch StopSellRestrictions
    const stopSells = await this.prisma.stopSellRestriction.findMany({
      where: {
        propertyId,
        isActive: true,
        startDate: { lte: end },
        endDate: { gte: start },
      },
    });

    // 5. Fetch ConnectivityAvailabilityOverrides
    const manualOverrides = await this.prisma.connectivityAvailabilityOverride.findMany({
      where: {
        propertyId,
        date: { gte: start, lte: end },
      },
    });

    // 6. Fetch Event Markers
    const eventMarkers = await this.getCalendarEventMarkers(propertyId, startDateStr, endDateStr);

    // 7. Fetch active bookings
    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED', 'PENDING_PAYMENT', 'CHECKED_OUT'] },
        checkInDate: { lte: end },
        checkOutDate: { gte: start },
      },
      select: {
        id: true,
        roomTypeId: true,
        roomId: true,
        checkInDate: true,
        checkOutDate: true,
        bookingRooms: {
          select: {
            id: true,
            roomId: true,
          },
        },
      },
    });

    // Build daily date string list
    const days: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const y = curr.getFullYear();
      const m = String(curr.getMonth() + 1).padStart(2, '0');
      const d = String(curr.getDate()).padStart(2, '0');
      days.push(`${y}-${m}-${d}`);
      curr.setDate(curr.getDate() + 1);
    }

    // 8. Build inventory map and restrictions map per roomTypeId and dateStr
    const inventory: Record<string, Record<string, {
      totalRooms: number;
      bookedCount: number;
      availableCount: number;
      manualOverride?: number;
      isStopSell: boolean;
    }>> = {};

    const restrictions: Record<string, Record<string, {
      minStayArrival?: number | null;
      minStayThrough?: number | null;
      maxStay?: number | null;
      closedToArrival: boolean;
      closedToDeparture: boolean;
      stopSell: boolean;
    }>> = {};

    for (const rt of roomTypes) {
      inventory[rt.id] = {};
      restrictions[rt.id] = {};
      const totalPhysical = rt.rooms.filter((r) => r.status !== 'MAINTENANCE').length;

      for (const dateStr of days) {
        // Bookings occupying this roomType on this date
        const activeBookings = bookings.filter((b) => {
          if (b.roomTypeId !== rt.id) return false;
          const bInStr = new Date(b.checkInDate).toISOString().split('T')[0];
          const bOutStr = new Date(b.checkOutDate).toISOString().split('T')[0];
          return dateStr >= bInStr && dateStr < bOutStr;
        });

        const bookedCount = activeBookings.reduce((sum, b) => sum + (b.bookingRooms?.length || 1), 0);
        const naturalAvailable = Math.max(0, totalPhysical - bookedCount);

        // Check manual override
        const override = manualOverrides.find((mo) => {
          const moDateStr = mo.date.toISOString().split('T')[0];
          return mo.roomTypeId === rt.id && moDateStr === dateStr;
        });

        // Restrictions evaluation
        const hasStopSell = stopSells.some((ss) => {
          const sStart = ss.startDate.toISOString().split('T')[0];
          const sEnd = ss.endDate.toISOString().split('T')[0];
          return (!ss.roomTypeId || ss.roomTypeId === rt.id) && dateStr >= sStart && dateStr <= sEnd;
        });

        const matchedRules = restrictionRules.filter((rr) => {
          const rStart = rr.startDate.toISOString().split('T')[0];
          const rEnd = rr.endDate.toISOString().split('T')[0];
          return (!rr.roomTypeId || rr.roomTypeId === rt.id) && dateStr >= rStart && dateStr <= rEnd;
        });

        const specificRule = matchedRules.find((r) => r.roomTypeId === rt.id) || matchedRules[0];

        const isStop = hasStopSell;
        const finalAvailable = override !== undefined ? Math.min(override.allocatedQuantity, naturalAvailable) : naturalAvailable;

        inventory[rt.id][dateStr] = {
          totalRooms: totalPhysical,
          bookedCount,
          availableCount: isStop ? 0 : finalAvailable,
          manualOverride: override ? override.allocatedQuantity : undefined,
          isStopSell: isStop,
        };

        restrictions[rt.id][dateStr] = {
          minStayArrival: specificRule?.minStayArrival ?? null,
          minStayThrough: specificRule?.minStayThrough ?? null,
          maxStay: specificRule?.maxStay ?? null,
          closedToArrival: specificRule?.closedToArrival ?? false,
          closedToDeparture: specificRule?.closedToDeparture ?? false,
          stopSell: isStop,
        };
      }
    }

    return {
      roomTypes,
      ratePlans,
      inventory,
      restrictions,
      eventMarkers,
    };
  }

  /**
   * Bulk Pricing & Restriction Rule Application (Weekdays vs Weekends, Festivals, Restrictions)
   */
  async applyBulkPricingRule(dto: BulkPricingRuleDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid date range provided.');
    }

    let targetRatePlanId = dto.ratePlanId;
    let targetRoomTypeId = dto.roomTypeId;
    let propertyId = dto.propertyId;

    if (targetRatePlanId && !targetRoomTypeId) {
      const rp = await this.prisma.ratePlan.findUnique({
        where: { id: targetRatePlanId },
      });
      if (!rp) {
        throw new NotFoundException(`RatePlan ${targetRatePlanId} not found.`);
      }
      propertyId = propertyId || rp.propertyId;
    } else if (!targetRatePlanId && targetRoomTypeId) {
      const primaryPlan = await this.ensureDefaultRatePlan(targetRoomTypeId);
      targetRatePlanId = primaryPlan?.id;
    }

    if (targetRoomTypeId && !propertyId) {
      const rt = await this.prisma.roomType.findUnique({ where: { id: targetRoomTypeId } });
      if (rt) propertyId = rt.propertyId;
    }

    let createdPricingRule: any = null;

    // 1. If price is specified, create PricingRule
    if (dto.price !== undefined && dto.price !== null) {
      const name = dto.isFestivalRule
        ? `Festival Override: ${dto.festivalName || 'Special Event'}`
        : dto.daysOfWeek && dto.daysOfWeek.length > 0
        ? `Bulk Day Rule (${dto.daysOfWeek.join(',')})`
        : `Date Range Rule (${dto.startDate} to ${dto.endDate})`;

      createdPricingRule = await this.prisma.pricingRule.create({
        data: {
          name,
          startDate: start,
          endDate: end,
          daysOfWeek: dto.daysOfWeek || [],
          adjustmentType: PricingAdjustmentType.SET_FIXED_PRICE,
          adjustmentValue: dto.price,
          roomTypeId: targetRoomTypeId || null,
          ratePlanId: targetRatePlanId || null,
          isFestivalRule: dto.isFestivalRule || false,
          festivalName: dto.festivalName || null,
        },
      });

      this.logger.log(`Created PricingRule '${name}' (${createdPricingRule.id})`);
    }

    // 2. If restrictions are provided (minStay, maxStay, CTA, CTD)
    if (
      propertyId &&
      (dto.minStayArrival !== undefined ||
        dto.minStayThrough !== undefined ||
        dto.maxStay !== undefined ||
        dto.closedToArrival !== undefined ||
        dto.closedToDeparture !== undefined)
    ) {
      await this.prisma.restrictionRule.create({
        data: {
          propertyId,
          roomTypeId: targetRoomTypeId || null,
          startDate: start,
          endDate: end,
          minStayArrival: dto.minStayArrival || null,
          minStayThrough: dto.minStayThrough || null,
          maxStay: dto.maxStay || null,
          closedToArrival: dto.closedToArrival || false,
          closedToDeparture: dto.closedToDeparture || false,
        },
      });
    }

    // 3. If Stop Sell is toggled
    if (propertyId && dto.stopSell !== undefined) {
      if (dto.stopSell) {
        await this.prisma.stopSellRestriction.create({
          data: {
            propertyId,
            roomTypeId: targetRoomTypeId || null,
            startDate: start,
            endDate: end,
          },
        });
      } else {
        // Deactivate existing stop sells in range
        await this.prisma.stopSellRestriction.updateMany({
          where: {
            propertyId,
            roomTypeId: targetRoomTypeId || null,
            startDate: { lte: end },
            endDate: { gte: start },
          },
          data: { isActive: false },
        });
      }
    }

    if (propertyId && this.channelsService) {
      const channelsService = this.channelsService;
      if (dto.channelId === 'PMS_ONLY') {
        this.logger.log(`[Pricing Update] channelId is PMS_ONLY, skipping external OTA sync.`);
      } else if (dto.channelId && dto.channelId !== 'ALL') {
        // Specific OTA targeted update
        this.prisma.channelRoomTypeMapping.findFirst({
          where: { roomTypeId: targetRoomTypeId },
        }).then(async (roomMapping) => {
          if (roomMapping && dto.price !== undefined) {
            await channelsService.pushDeltaAri(propertyId, [], [{
              date: dto.startDate,
              dateTo: dto.endDate,
              roomTypeId: targetRoomTypeId || '',
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              price: dto.price,
              channelId: dto.channelId,
            } as any]);
          } else {
            await channelsService.pushAriForProperty(propertyId, 60);
          }
        }).catch((err) => {
          this.logger.warn(`Failed targeted channel rate sync: ${err.message}`);
        });
      } else {
        // Sync to ALL connected OTAs
        channelsService.pushAriForProperty(propertyId, 60).catch((err) => {
          this.logger.warn(`Failed to auto-sync Channex after bulk pricing update: ${err.message}`);
        });
      }
    }

    return {
      success: true,
      pricingRule: createdPricingRule,
    };
  }

  /**
   * Set Manual Sellable Room Quantity Override
   */
  async setInventoryOverride(dto: SetInventoryOverrideDto) {
    const targetDate = new Date(`${dto.date}T00:00:00.000Z`);

    const physicalRoomsCount = await this.prisma.room.count({
      where: {
        roomTypeId: dto.roomTypeId,
        isEnabled: true,
        status: { not: 'MAINTENANCE' },
      },
    });

    if (dto.allocatedQuantity < 0) {
      throw new BadRequestException('Allocated quantity cannot be negative.');
    }

    if (dto.allocatedQuantity > physicalRoomsCount) {
      throw new BadRequestException(
        `Cannot set inventory count to ${dto.allocatedQuantity}. Total physical rooms under this room type is ${physicalRoomsCount}.`,
      );
    }

    const result = await this.prisma.connectivityAvailabilityOverride.upsert({
      where: {
        propertyId_roomTypeId_date: {
          propertyId: dto.propertyId,
          roomTypeId: dto.roomTypeId,
          date: targetDate,
        },
      },
      update: {
        allocatedQuantity: dto.allocatedQuantity,
      },
      create: {
        propertyId: dto.propertyId,
        roomTypeId: dto.roomTypeId,
        date: targetDate,
        allocatedQuantity: dto.allocatedQuantity,
      },
    });

    if (dto.propertyId && this.channelsService) {
      if (dto.channelId === 'PMS_ONLY') {
        this.logger.log(`[Inventory Override] channelId is PMS_ONLY, skipping external OTA sync.`);
      } else {
        this.channelsService.pushAriForProperty(dto.propertyId, 60).catch((err) => {
          this.logger.warn(`Failed to auto-sync Channex after inventory override: ${err.message}`);
        });
      }
    }

    return result;
  }

  /**
   * Apply Direct Restrictions
   */
  async applyRestrictions(dto: ApplyRestrictionsDto) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (dto.stopSell !== undefined) {
      if (dto.stopSell) {
        await this.prisma.stopSellRestriction.create({
          data: {
            propertyId: dto.propertyId,
            roomTypeId: dto.roomTypeId || null,
            startDate: start,
            endDate: end,
          },
        });
      } else {
        await this.prisma.stopSellRestriction.updateMany({
          where: {
            propertyId: dto.propertyId,
            roomTypeId: dto.roomTypeId || null,
            startDate: { lte: end },
            endDate: { gte: start },
          },
          data: { isActive: false },
        });
      }
    }

    const result = await this.prisma.restrictionRule.create({
      data: {
        propertyId: dto.propertyId,
        roomTypeId: dto.roomTypeId || null,
        startDate: start,
        endDate: end,
        minStayArrival: dto.minStayArrival || null,
        minStayThrough: dto.minStayThrough || null,
        maxStay: dto.maxStay || null,
        closedToArrival: dto.closedToArrival || false,
        closedToDeparture: dto.closedToDeparture || false,
      },
    });

    if (dto.propertyId && this.channelsService) {
      this.channelsService.pushAriForProperty(dto.propertyId, 60).catch((err) => {
        this.logger.warn(`Failed to auto-sync Channex after restriction update: ${err.message}`);
      });
    }

    return result;
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
