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
  SetMultiChannelInventoryOverrideDto,
  SetMultiChannelPriceOverrideDto,
  ApplyBulkInventoryOverrideDto,
  QueryRateRestrictionLogsDto,
} from '../dto/rate-plan.dto';
import { MealPlan, RatePlanPricingType, PricingAdjustmentType } from '@prisma/client';
import { DateUtils } from '../../common/utils/date.utils';

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

    // Ensure all room types have their RoomTypeRatePlanPrice records under each plan properly calculated & synced
    for (const plan of activePlans) {
      await this.syncRoomTypePricesForPlan(plan.id);
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
    const plans = await this.prisma.ratePlan.findMany({
      where: { propertyId: roomType.propertyId, isActive: true },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    });
    return plans.find(p => p.isPrimary) || plans[0] || null;
  }

  async getRatePlansForRoomType(roomTypeId: string) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });
    if (!roomType) {
      throw new NotFoundException(`RoomType with ID ${roomTypeId} not found.`);
    }
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
      await this.syncRoomTypePricesForPlan(createdPlan.id);
    }

    return createdPlan;
  }

  async updateRatePlan(id: string, dto: UpdateRatePlanDto, user?: any) {
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
    } else if (dto.extraAdultPrice !== undefined || dto.extraChildPrice !== undefined) {
      await this.syncRoomTypePricesForPlan(id);

      await this.recordRateRestrictionLog({
        propertyId: ratePlan.propertyId,
        user,
        actionType: 'RATE_UPDATE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 86400000),
        summary: `Updated meal prices for ${ratePlan.name}: Adult ₹${dto.extraAdultPrice ?? ratePlan.extraAdultPrice}, Child ₹${dto.extraChildPrice ?? ratePlan.extraChildPrice}`,
        details: {
          ratePlanId: ratePlan.id,
          ratePlanName: ratePlan.name,
          adultPrice: dto.extraAdultPrice,
          childPrice: dto.extraChildPrice,
        },
      });
    }

    if (this.channelsService) {
      this.channelsService.pushAriForProperty(ratePlan.propertyId, 60).catch((err) => {
        this.logger.warn(`Failed to auto-sync Channex after rate plan update: ${err.message}`);
      });
    }

    return updatedPlan;
  }

  /**
   * Calculates the base meal supplement for a room type under a given rate plan.
   * If adult/child breakdown is configured, uses (baseMaxAdults * adultMealRate) + (baseMaxChildren * childMealRate).
   * Otherwise, treats all base occupants as adults: (totalBaseOccupancy * adultMealRate).
   */
  calculateBaseMealSupplement(rt: any, plan: any): number {
    const adultMealRate = Number(plan.extraAdultPrice || 0);
    const childMealRate = Number(plan.extraChildPrice || 0);

    // If Room Only (EP) or meal rates are 0, no meal supplement
    if (plan.mealPlan === MealPlan.EP || (adultMealRate === 0 && childMealRate === 0)) {
      return 0;
    }

    const totalBase =
      rt.totalBaseOccupancy !== null && rt.totalBaseOccupancy !== undefined
        ? Number(rt.totalBaseOccupancy)
        : null;
    const baseMaxAdults =
      rt.baseMaxAdults !== null && rt.baseMaxAdults !== undefined
        ? Number(rt.baseMaxAdults)
        : null;
    const baseMaxChildren =
      rt.baseMaxChildren !== null && rt.baseMaxChildren !== undefined
        ? Number(rt.baseMaxChildren)
        : null;

    let adultCount = 0;
    let childCount = 0;

    if (baseMaxAdults !== null || baseMaxChildren !== null) {
      const breakdownSum = (baseMaxAdults || 0) + (baseMaxChildren || 0);
      const effectiveTotal = totalBase ?? (breakdownSum > 0 ? breakdownSum : 2);
      adultCount =
        baseMaxAdults !== null
          ? baseMaxAdults
          : Math.max(0, effectiveTotal - (baseMaxChildren || 0));
      childCount =
        baseMaxChildren !== null
          ? baseMaxChildren
          : Math.max(0, effectiveTotal - adultCount);
    } else {
      // Case 2: Adult / Child breakdown left empty -> All base occupants are counted as adults
      adultCount =
        totalBase ??
        (rt.baseAdults !== null && rt.baseAdults !== undefined
          ? Number(rt.baseAdults)
          : 2);
      childCount = 0;
    }

    return adultCount * adultMealRate + childCount * childMealRate;
  }

  async syncRoomTypePricesForPlan(ratePlanId: string) {
    const plan = await this.prisma.ratePlan.findUnique({
      where: { id: ratePlanId },
      include: { property: { include: { roomTypes: true } } },
    });
    if (!plan || !plan.property) return;

    const adultOffset = Number(plan.extraAdultPrice || 0);
    const childOffset = Number(plan.extraChildPrice || 0);

    for (const rt of plan.property.roomTypes) {
      const mealSupplement = this.calculateBaseMealSupplement(rt, plan);
      const base = Number(rt.basePrice) + mealSupplement;
      const baseAc =
        rt.basePriceAc !== null && rt.basePriceAc !== undefined
          ? Number(rt.basePriceAc) + mealSupplement
          : null;

      await this.prisma.roomTypeRatePlanPrice.upsert({
        where: {
          ratePlanId_roomTypeId: {
            ratePlanId: plan.id,
            roomTypeId: rt.id,
          },
        },
        create: {
          ratePlanId: plan.id,
          roomTypeId: rt.id,
          basePrice: base,
          extraAdultPrice: Number(rt.extraAdultPrice || 0) + adultOffset,
          extraChildPrice: Number(rt.extraChildPrice || 0) + childOffset,
          basePriceAc: baseAc,
          extraAdultPriceAc:
            rt.extraAdultPriceAc !== null && rt.extraAdultPriceAc !== undefined
              ? Number(rt.extraAdultPriceAc) + adultOffset
              : null,
          extraChildPriceAc:
            rt.extraChildPriceAc !== null && rt.extraChildPriceAc !== undefined
              ? Number(rt.extraChildPriceAc) + childOffset
              : null,
        },
        update: {
          basePrice: base,
          extraAdultPrice: Number(rt.extraAdultPrice || 0) + adultOffset,
          extraChildPrice: Number(rt.extraChildPrice || 0) + childOffset,
          basePriceAc: baseAc,
          extraAdultPriceAc:
            rt.extraAdultPriceAc !== null && rt.extraAdultPriceAc !== undefined
              ? Number(rt.extraAdultPriceAc) + adultOffset
              : null,
          extraChildPriceAc:
            rt.extraChildPriceAc !== null && rt.extraChildPriceAc !== undefined
              ? Number(rt.extraChildPriceAc) + childOffset
              : null,
        },
      });
    }
  }

  async syncRatePlansForRoomType(roomTypeId: string) {
    const rt = await this.prisma.roomType.findUnique({
      where: { id: roomTypeId },
    });
    if (!rt) return;

    const plans = await this.prisma.ratePlan.findMany({
      where: { propertyId: rt.propertyId, isActive: true },
    });

    for (const plan of plans) {
      const mealSupplement = this.calculateBaseMealSupplement(rt, plan);
      const base = Number(rt.basePrice) + mealSupplement;
      const baseAc =
        rt.basePriceAc !== null && rt.basePriceAc !== undefined
          ? Number(rt.basePriceAc) + mealSupplement
          : null;
      const adultOffset = Number(plan.extraAdultPrice || 0);
      const childOffset = Number(plan.extraChildPrice || 0);

      await this.prisma.roomTypeRatePlanPrice.upsert({
        where: {
          ratePlanId_roomTypeId: {
            ratePlanId: plan.id,
            roomTypeId: rt.id,
          },
        },
        create: {
          ratePlanId: plan.id,
          roomTypeId: rt.id,
          basePrice: base,
          extraAdultPrice: Number(rt.extraAdultPrice || 0) + adultOffset,
          extraChildPrice: Number(rt.extraChildPrice || 0) + childOffset,
          basePriceAc: baseAc,
          extraAdultPriceAc:
            rt.extraAdultPriceAc !== null && rt.extraAdultPriceAc !== undefined
              ? Number(rt.extraAdultPriceAc) + adultOffset
              : null,
          extraChildPriceAc:
            rt.extraChildPriceAc !== null && rt.extraChildPriceAc !== undefined
              ? Number(rt.extraChildPriceAc) + childOffset
              : null,
        },
        update: {
          basePrice: base,
          extraAdultPrice: Number(rt.extraAdultPrice || 0) + adultOffset,
          extraChildPrice: Number(rt.extraChildPrice || 0) + childOffset,
          basePriceAc: baseAc,
          extraAdultPriceAc:
            rt.extraAdultPriceAc !== null && rt.extraAdultPriceAc !== undefined
              ? Number(rt.extraAdultPriceAc) + adultOffset
              : null,
          extraChildPriceAc:
            rt.extraChildPriceAc !== null && rt.extraChildPriceAc !== undefined
              ? Number(rt.extraChildPriceAc) + childOffset
              : null,
        },
      });
    }
  }

  async syncAllRatePlansForProperty(propertyId: string) {
    const plans = await this.prisma.ratePlan.findMany({
      where: { propertyId, isActive: true },
    });
    for (const plan of plans) {
      await this.syncRoomTypePricesForPlan(plan.id);
    }
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

    // 2. Ensure rate plans & room type package prices are synchronized, then fetch
    await this.syncAllRatePlansForProperty(propertyId);

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

    const allPhysicalRooms = roomTypes.flatMap((rt) => rt.rooms);
    const allPhysicalRoomIds = allPhysicalRooms.map((r) => r.id);

    // 7. Fetch active bookings with physical room allocations (bookingRooms)
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

    // 7.1 Fetch active room blocks (manual holds, maintenance blocks, legacy blocks)
    const roomBlocks = await this.prisma.roomBlock.findMany({
      where: {
        roomId: { in: allPhysicalRoomIds },
        startDate: { lte: end },
        endDate: { gte: start },
      },
      select: {
        id: true,
        roomId: true,
        startDate: true,
        endDate: true,
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
      channelOverrides?: Record<string, number>;
      isStopSell: boolean;
    }>> = {};

    const restrictions: Record<string, Record<string, {
      minStayArrival?: number | null;
      minStayThrough?: number | null;
      maxStay?: number | null;
      closedToArrival: boolean;
      closedToDeparture: boolean;
      stopSell: boolean;
      channelRestrictions?: Record<string, any>;
    }>> = {};

    for (const rt of roomTypes) {
      inventory[rt.id] = {};
      restrictions[rt.id] = {};
      const rtPhysicalRoomIds = new Set(rt.rooms.map((r) => r.id));
      const totalPhysical = rt.rooms.filter((r) => r.status !== 'MAINTENANCE').length;

      for (const dateStr of days) {
        // Collect unique unavailable physical room IDs for this room type on this date
        const unavailableRoomIds = new Set<string>();
        let unassignedCount = 0;

        // A. Process active bookings occupying physical rooms of this roomType on dateStr
        for (const b of bookings) {
          const bInStr = DateUtils.toCalendarDateStr(b.checkInDate);
          const bOutStr = DateUtils.toCalendarDateStr(b.checkOutDate);

          if (dateStr >= bInStr && dateStr < bOutStr) {
            let hasAssignedDoors = false;

            // 1. Multi-room booking allocations via bookingRooms
            if (b.bookingRooms && b.bookingRooms.length > 0) {
              for (const br of b.bookingRooms) {
                if (br.roomId) {
                  hasAssignedDoors = true;
                  if (rtPhysicalRoomIds.has(br.roomId)) {
                    unavailableRoomIds.add(br.roomId);
                  }
                }
              }
            }

            // 2. Direct single-room booking allocation via b.roomId
            if (b.roomId) {
              hasAssignedDoors = true;
              if (rtPhysicalRoomIds.has(b.roomId)) {
                unavailableRoomIds.add(b.roomId);
              }
            }

            // 3. Fallback for unallocated booking (no physical door assigned yet) booked under this roomTypeId
            if (!hasAssignedDoors && b.roomTypeId === rt.id) {
              unassignedCount++;
            }
          }
        }

        // B. Process manual room blocks occupying physical rooms of this roomType on dateStr
        for (const rb of roomBlocks) {
          const rbStartStr = DateUtils.toCalendarDateStr(rb.startDate);
          const rbEndStr = DateUtils.toCalendarDateStr(rb.endDate);

          if (dateStr >= rbStartStr && dateStr < rbEndStr) {
            if (rb.roomId && rtPhysicalRoomIds.has(rb.roomId)) {
              unavailableRoomIds.add(rb.roomId);
            }
          }
        }

        const bookedCount = unavailableRoomIds.size + unassignedCount;
        const naturalAvailable = Math.max(0, totalPhysical - bookedCount);

        // Check manual override
        const override = manualOverrides.find((mo: any) => {
          const moDateStr = mo.date.toISOString().split('T')[0];
          return mo.roomTypeId === rt.id && moDateStr === dateStr && (mo.channelTarget === 'ALL' || !mo.channelTarget);
        });

        // Collect all channel overrides for this room type and date
        const channelOverridesMap: Record<string, number> = {};
        for (const mo of manualOverrides) {
          const moDateStr = mo.date.toISOString().split('T')[0];
          if (mo.roomTypeId === rt.id && moDateStr === dateStr) {
            channelOverridesMap[(mo as any).channelTarget || 'ALL'] = mo.allocatedQuantity;
          }
        }

        // Restrictions evaluation per channel target
        const channelRestrictionsMap: Record<string, {
          minStayArrival: number | null;
          minStayThrough: number | null;
          maxStay: number | null;
          closedToArrival: boolean;
          closedToDeparture: boolean;
          stopSell: boolean;
        }> = {};
        const currentDOW = new Date(dateStr).getDay();

        // Find all rules matching date & roomType & day of week
        const matchedRules = restrictionRules.filter((rr: any) => {
          const rStart = rr.startDate.toISOString().split('T')[0];
          const rEnd = rr.endDate.toISOString().split('T')[0];
          const matchesDate = dateStr >= rStart && dateStr <= rEnd;
          const matchesRoomType = !rr.roomTypeId || rr.roomTypeId === rt.id;
          const matchesDOW = !rr.daysOfWeek || rr.daysOfWeek.length === 0 || rr.daysOfWeek.includes(currentDOW);
          return matchesDate && matchesRoomType && matchesDOW;
        });

        // Matched stop sells
        const matchedStopSells = stopSells.filter((ss: any) => {
          const sStart = ss.startDate.toISOString().split('T')[0];
          const sEnd = ss.endDate.toISOString().split('T')[0];
          return (!ss.roomTypeId || ss.roomTypeId === rt.id) && dateStr >= sStart && dateStr <= sEnd;
        });

        // Determine targets to compute
        const allTargets = new Set<string>(['ALL', 'OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL']);
        matchedRules.forEach((r: any) => { if (r.channelTarget) allTargets.add(r.channelTarget); });
        matchedStopSells.forEach((s: any) => { if (s.channelTarget) allTargets.add(s.channelTarget); });

        for (const target of Array.from(allTargets)) {
          const targetRules = matchedRules.filter((r: any) => r.channelTarget === target || r.channelTarget === 'ALL');
          const specificTargetRule = targetRules.find((r: any) => r.roomTypeId === rt.id && r.channelTarget === target)
            || targetRules.find((r: any) => r.roomTypeId === rt.id && r.channelTarget === 'ALL')
            || targetRules.find((r: any) => !r.roomTypeId && r.channelTarget === target)
            || targetRules[0];

          const isTargetStopSell = matchedStopSells.some((ss: any) => ss.channelTarget === target || ss.channelTarget === 'ALL');

          channelRestrictionsMap[target] = {
            minStayArrival: specificTargetRule?.minStayArrival ?? null,
            minStayThrough: specificTargetRule?.minStayThrough ?? null,
            maxStay: specificTargetRule?.maxStay ?? null,
            closedToArrival: specificTargetRule?.closedToArrival ?? false,
            closedToDeparture: specificTargetRule?.closedToDeparture ?? false,
            stopSell: isTargetStopSell,
          };
        }

        const fallbackRes = channelRestrictionsMap['ALL'] || channelRestrictionsMap['OREEDU_PMS'] || {
          minStayArrival: null,
          minStayThrough: null,
          maxStay: null,
          closedToArrival: false,
          closedToDeparture: false,
          stopSell: false,
        };

        const isStop = channelRestrictionsMap['OREEDU_PMS']?.stopSell ?? fallbackRes.stopSell;
        const finalAvailable = override !== undefined ? Math.min(override.allocatedQuantity, naturalAvailable) : naturalAvailable;

        inventory[rt.id][dateStr] = {
          totalRooms: totalPhysical,
          bookedCount,
          availableCount: isStop ? 0 : finalAvailable,
          manualOverride: override ? override.allocatedQuantity : undefined,
          channelOverrides: channelOverridesMap,
          isStopSell: isStop,
        };

        restrictions[rt.id][dateStr] = {
          minStayArrival: fallbackRes.minStayArrival,
          minStayThrough: fallbackRes.minStayThrough,
          maxStay: fallbackRes.maxStay,
          closedToArrival: fallbackRes.closedToArrival,
          closedToDeparture: fallbackRes.closedToDeparture,
          stopSell: isStop,
          channelRestrictions: channelRestrictionsMap,
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
  async applyBulkPricingRule(dto: BulkPricingRuleDto, user?: any) {
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

    // Resolve concrete internal and external channel targets
    const internalTargets: string[] = [];
    const externalOtaTargets: string[] = [];

    if (dto.channelTargets && dto.channelTargets.length > 0) {
      for (const t of dto.channelTargets) {
        if (t === 'ALL') {
          internalTargets.push('OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL');
        } else if (['OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL'].includes(t)) {
          internalTargets.push(t);
        } else {
          externalOtaTargets.push(t);
        }
      }
    } else if (dto.channelId === 'PMS_ONLY') {
      internalTargets.push('OREEDU_PMS');
    } else if (dto.channelId && dto.channelId !== 'ALL') {
      externalOtaTargets.push(dto.channelId);
    } else {
      // Default: All internal platforms
      internalTargets.push('OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL');
    }

    const uniqueInternalTargets = Array.from(new Set(internalTargets));
    const createdRules: any[] = [];
    let createdPricingRule: any = null;

    // 1. If price is specified, create explicit PricingRule per internal channel target
    if (dto.price !== undefined && dto.price !== null && uniqueInternalTargets.length > 0) {
      for (const target of uniqueInternalTargets) {
        const name = dto.isFestivalRule
          ? `Festival Override [${target}]: ${dto.festivalName || 'Special Event'}`
          : dto.daysOfWeek && dto.daysOfWeek.length > 0
          ? `Bulk Day Rule [${target}] (${dto.daysOfWeek.join(',')})`
          : `Date Range Rule [${target}] (${dto.startDate} to ${dto.endDate})`;

        const rule = await (this.prisma.pricingRule as any).create({
          data: {
            name,
            startDate: start,
            endDate: end,
            daysOfWeek: dto.daysOfWeek || [],
            adjustmentType: PricingAdjustmentType.SET_FIXED_PRICE,
            adjustmentValue: dto.price,
            roomTypeId: targetRoomTypeId || null,
            ratePlanId: targetRatePlanId || null,
            channelTarget: target,
            isAc: dto.isAc !== undefined ? dto.isAc : null,
            isFestivalRule: dto.isFestivalRule || false,
            festivalName: dto.festivalName || null,
          },
        });
        createdRules.push(rule);
        this.logger.log(`Created PricingRule '${name}' (${rule.id}) for target '${target}'`);
      }
      createdPricingRule = createdRules[0] || null;
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
      if (uniqueInternalTargets.length > 0) {
        for (const target of uniqueInternalTargets) {
          await (this.prisma.restrictionRule as any).create({
            data: {
              propertyId,
              roomTypeId: targetRoomTypeId || null,
              channelTarget: target,
              startDate: start,
              endDate: end,
              daysOfWeek: dto.daysOfWeek || [],
              minStayArrival: dto.minStayArrival !== undefined ? dto.minStayArrival : null,
              minStayThrough: dto.minStayThrough !== undefined ? dto.minStayThrough : null,
              maxStay: dto.maxStay !== undefined ? dto.maxStay : null,
              closedToArrival: dto.closedToArrival ?? false,
              closedToDeparture: dto.closedToDeparture ?? false,
            },
          });
          this.logger.log(`Created RestrictionRule for target '${target}' (${dto.startDate} to ${dto.endDate})`);
        }
      }
    }

    // 3. If Stop Sell is toggled
    if (propertyId && dto.stopSell !== undefined) {
      if (uniqueInternalTargets.length > 0) {
        for (const target of uniqueInternalTargets) {
          if (dto.stopSell) {
            await (this.prisma.stopSellRestriction as any).create({
              data: {
                propertyId,
                roomTypeId: targetRoomTypeId || null,
                channelTarget: target,
                startDate: start,
                endDate: end,
              },
            });
            this.logger.log(`Activated StopSell for target '${target}' (${dto.startDate} to ${dto.endDate})`);
          } else {
            // Deactivate existing stop sells in range for target
            await (this.prisma.stopSellRestriction as any).updateMany({
              where: {
                propertyId,
                roomTypeId: targetRoomTypeId || null,
                channelTarget: { in: [target, 'ALL'] },
                startDate: { lte: end },
                endDate: { gte: start },
              },
              data: { isActive: false },
            });
            this.logger.log(`Deactivated StopSell for target '${target}' (${dto.startDate} to ${dto.endDate})`);
          }
        }
      }
    }

    // 4. Record Audit Log for this bulk operation
    if (propertyId) {
      if (dto.price !== undefined && dto.price !== null) {
        await this.recordRateRestrictionLog({
          propertyId,
          user,
          actionType: 'RATE_UPDATE',
          roomTypeId: targetRoomTypeId || null,
          channelId: dto.channelId || null,
          channelName: dto.channelId === 'PMS_ONLY' ? 'Direct PMS Only' : (dto.channelId && dto.channelId !== 'ALL' ? `Channel ${dto.channelId}` : 'All Channels'),
          startDate: start,
          endDate: end,
          daysOfWeek: dto.daysOfWeek || [],
          summary: `Set nightly base rate to ₹${dto.price} (${dto.startDate} to ${dto.endDate})`,
          details: { price: dto.price, daysOfWeek: dto.daysOfWeek, isFestivalRule: dto.isFestivalRule, festivalName: dto.festivalName },
        });
      }

      if (dto.minStayArrival || dto.minStayThrough || dto.closedToArrival || dto.closedToDeparture) {
        await this.recordRateRestrictionLog({
          propertyId,
          user,
          actionType: 'RESTRICTION_UPDATE',
          roomTypeId: targetRoomTypeId || null,
          startDate: start,
          endDate: end,
          summary: `Stay restrictions updated (${dto.startDate} to ${dto.endDate}): ${dto.minStayArrival ? `Min Stay ${dto.minStayArrival}N, ` : ''}${dto.closedToArrival ? 'CTA, ' : ''}${dto.closedToDeparture ? 'CTD' : ''}`.trim(),
          details: { minStayArrival: dto.minStayArrival, minStayThrough: dto.minStayThrough, closedToArrival: dto.closedToArrival, closedToDeparture: dto.closedToDeparture },
        });
      }

      if (dto.stopSell !== undefined) {
        await this.recordRateRestrictionLog({
          propertyId,
          user,
          actionType: 'STOP_SELL_TOGGLE',
          roomTypeId: targetRoomTypeId || null,
          channelId: dto.channelId || null,
          channelName: dto.channelId === 'PMS_ONLY' ? 'Direct PMS Only' : (dto.channelId && dto.channelId !== 'ALL' ? `Channel ${dto.channelId}` : 'All Channels'),
          startDate: start,
          endDate: end,
          summary: `Stop sell ${dto.stopSell ? 'ACTIVATED' : 'DEACTIVATED'} (${dto.startDate} to ${dto.endDate})`,
          details: { stopSell: dto.stopSell },
        });
      }
    }

    if (propertyId && this.channelsService) {
      const channelsService = this.channelsService;
      if (externalOtaTargets.length > 0) {
        this.prisma.channelRoomTypeMapping.findFirst({
          where: { roomTypeId: targetRoomTypeId },
        }).then(async (roomMapping) => {
          if (roomMapping) {
            const updates = externalOtaTargets.map((otaId) => ({
              date: dto.startDate,
              dateTo: dto.endDate,
              roomTypeId: targetRoomTypeId || '',
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              channelId: otaId,
              price: dto.price !== undefined ? dto.price : undefined,
              minStayArrival: dto.minStayArrival !== undefined ? dto.minStayArrival : undefined,
              minStayThrough: dto.minStayThrough !== undefined ? dto.minStayThrough : undefined,
              maxStay: dto.maxStay !== undefined ? dto.maxStay : undefined,
              stopSell: dto.stopSell !== undefined ? dto.stopSell : undefined,
              closedToArrival: dto.closedToArrival !== undefined ? dto.closedToArrival : undefined,
              closedToDeparture: dto.closedToDeparture !== undefined ? dto.closedToDeparture : undefined,
            }));
            await channelsService.pushDeltaAri(propertyId, [], updates as any);
          } else {
            await channelsService.pushAriForProperty(propertyId, 60);
          }
        }).catch((err) => {
          this.logger.warn(`Failed targeted channel rate/restriction sync: ${err.message}`);
        });
      } else if (dto.channelId === 'PMS_ONLY' || (dto.channelTargets && externalOtaTargets.length === 0 && !dto.channelTargets.includes('ALL'))) {
        this.logger.log(`[Restrictions/Pricing Update] Target is purely internal portals, skipping external OTA sync.`);
      } else if (dto.channelId && dto.channelId !== 'ALL') {
        // Specific OTA targeted update
        this.prisma.channelRoomTypeMapping.findFirst({
          where: { roomTypeId: targetRoomTypeId },
        }).then(async (roomMapping) => {
          if (roomMapping) {
            await channelsService.pushDeltaAri(propertyId, [], [{
              date: dto.startDate,
              dateTo: dto.endDate,
              roomTypeId: targetRoomTypeId || '',
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              channelId: dto.channelId,
              price: dto.price !== undefined ? dto.price : undefined,
              minStayArrival: dto.minStayArrival !== undefined ? dto.minStayArrival : undefined,
              minStayThrough: dto.minStayThrough !== undefined ? dto.minStayThrough : undefined,
              maxStay: dto.maxStay !== undefined ? dto.maxStay : undefined,
              stopSell: dto.stopSell !== undefined ? dto.stopSell : undefined,
              closedToArrival: dto.closedToArrival !== undefined ? dto.closedToArrival : undefined,
              closedToDeparture: dto.closedToDeparture !== undefined ? dto.closedToDeparture : undefined,
            } as any]);
          } else {
            await channelsService.pushAriForProperty(propertyId, 60);
          }
        }).catch((err) => {
          this.logger.warn(`Failed targeted channel rate/restriction sync: ${err.message}`);
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
  async setInventoryOverride(dto: SetInventoryOverrideDto, user?: any) {
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

    const channelTarget = dto.channelTarget || dto.channelId || 'ALL';

    const result = await (this.prisma.connectivityAvailabilityOverride as any).upsert({
      where: {
        propertyId_roomTypeId_channelTarget_date: {
          propertyId: dto.propertyId,
          roomTypeId: dto.roomTypeId,
          channelTarget,
          date: targetDate,
        },
      },
      update: {
        allocatedQuantity: dto.allocatedQuantity,
      },
      create: {
        propertyId: dto.propertyId,
        roomTypeId: dto.roomTypeId,
        channelTarget,
        date: targetDate,
        allocatedQuantity: dto.allocatedQuantity,
      },
    });

    if (dto.propertyId) {
      await this.recordRateRestrictionLog({
        propertyId: dto.propertyId,
        user,
        actionType: 'INVENTORY_OVERRIDE',
        roomTypeId: dto.roomTypeId,
        channelId: dto.channelId || null,
        channelName: channelTarget === 'PMS_ONLY' ? 'Direct PMS Only' : channelTarget,
        startDate: targetDate,
        endDate: targetDate,
        summary: `Inventory override [${channelTarget}]: ${dto.allocatedQuantity} rooms on ${dto.date}`,
        details: { allocatedQuantity: dto.allocatedQuantity, date: dto.date, channelTarget },
      });
    }

    if (dto.propertyId && this.channelsService) {
      if (channelTarget === 'PMS_ONLY' || channelTarget === 'OREEDU_PMS') {
        this.logger.log(`[Inventory Override] channelTarget is PMS, skipping external OTA sync.`);
      } else {
        this.channelsService.pushAriForProperty(dto.propertyId, 60).catch((err) => {
          this.logger.warn(`Failed to auto-sync Channex after inventory override: ${err.message}`);
        });
      }
    }

    return result;
  }

  /**
   * Set Multi-Channel Inventory Overrides (Channel Allotment Caps)
   */
  async setMultiChannelInventoryOverride(dto: SetMultiChannelInventoryOverrideDto, user?: any) {
    const targetDate = new Date(`${dto.date}T00:00:00.000Z`);

    const physicalRoomsCount = await this.prisma.room.count({
      where: {
        roomTypeId: dto.roomTypeId,
        isEnabled: true,
        status: { not: 'MAINTENANCE' },
      },
    });

    for (const alloc of dto.allocations) {
      if (alloc.allocatedQuantity < 0) {
        throw new BadRequestException(`Allocated quantity cannot be negative for target ${alloc.channelTarget}.`);
      }
      if (alloc.allocatedQuantity > physicalRoomsCount) {
        throw new BadRequestException(
          `Cannot set inventory count to ${alloc.allocatedQuantity} for ${alloc.channelTarget}. Total physical rooms is ${physicalRoomsCount}.`,
        );
      }
    }

    const savedRecords: any[] = [];
    const externalOtaUpdates: Array<{ otaId: string; quantity: number }> = [];

    for (const alloc of dto.allocations) {
      const rec = await (this.prisma.connectivityAvailabilityOverride as any).upsert({
        where: {
          propertyId_roomTypeId_channelTarget_date: {
            propertyId: dto.propertyId,
            roomTypeId: dto.roomTypeId,
            channelTarget: alloc.channelTarget,
            date: targetDate,
          },
        },
        update: {
          allocatedQuantity: alloc.allocatedQuantity,
        },
        create: {
          propertyId: dto.propertyId,
          roomTypeId: dto.roomTypeId,
          channelTarget: alloc.channelTarget,
          date: targetDate,
          allocatedQuantity: alloc.allocatedQuantity,
        },
      });
      savedRecords.push(rec);

      if (!['ALL', 'OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL'].includes(alloc.channelTarget)) {
        externalOtaUpdates.push({ otaId: alloc.channelTarget, quantity: alloc.allocatedQuantity });
      }
    }

    // Record audit log
    if (dto.propertyId) {
      await this.recordRateRestrictionLog({
        propertyId: dto.propertyId,
        user,
        actionType: 'INVENTORY_OVERRIDE',
        roomTypeId: dto.roomTypeId,
        channelId: null,
        channelName: dto.allocations.map((a) => a.channelTarget).join(', '),
        startDate: targetDate,
        endDate: targetDate,
        summary: `Multi-channel inventory override for ${dto.allocations.length} channels on ${dto.date}`,
        details: { allocations: dto.allocations, date: dto.date },
      });
    }

    // Sync to Channex if external OTAs are present or if ALL is present
    let otaSyncResults: Array<{ channelId: string; channelName?: string; status: string; rooms: number }> = [];
    if (dto.propertyId && this.channelsService) {
      const hasAll = dto.allocations.some((a) => a.channelTarget === 'ALL');
      if (externalOtaUpdates.length > 0 || hasAll) {
        try {
          const roomMapping = await this.prisma.channelRoomTypeMapping.findFirst({
            where: { roomTypeId: dto.roomTypeId },
          });
          if (roomMapping) {
            const updates = (externalOtaUpdates.length > 0
              ? externalOtaUpdates
              : [{ otaId: 'ALL', quantity: dto.allocations.find((a) => a.channelTarget === 'ALL')?.allocatedQuantity || 0 }]
            ).map((u) => ({
              date: dto.date,
              roomTypeId: dto.roomTypeId,
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              availableRooms: u.quantity,
              channelId: u.otaId !== 'ALL' ? u.otaId : undefined,
              stopSell: u.quantity === 0,
            }));
            await this.channelsService.pushDeltaAri(dto.propertyId, updates, []);
            otaSyncResults = updates.map((u) => ({
              channelId: u.channelId || 'ALL',
              status: 'SUCCESS',
              rooms: u.availableRooms,
            }));
          } else {
            await this.channelsService.pushAriForProperty(dto.propertyId, 60);
            otaSyncResults = [{ channelId: 'ALL', status: 'SUCCESS', rooms: dto.allocations[0]?.allocatedQuantity || 0 }];
          }
        } catch (err: any) {
          this.logger.warn(`Failed Channex sync after multi-channel inventory override: ${err.message}`);
          otaSyncResults = [{ channelId: 'ALL', status: 'FAILED', rooms: 0 }];
        }
      }
    }

    return {
      success: true,
      propertyId: dto.propertyId,
      roomTypeId: dto.roomTypeId,
      date: dto.date,
      appliedAllocations: savedRecords,
      channexSync: {
        synced: otaSyncResults.length > 0 && otaSyncResults.every((r) => r.status === 'SUCCESS'),
        details: otaSyncResults,
      },
    };
  }

  /**
   * Bulk Multi-Channel Inventory Override across date ranges & days of the week.
   * Ensures 100% table consistency with individual matrix cell edits by writing
   * directly to connectivityAvailabilityOverride and synchronizing external OTAs via Channex.
   */
  async applyBulkInventoryOverride(dto: ApplyBulkInventoryOverrideDto, user?: any) {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid date range provided.');
    }

    if (dto.allocatedQuantity < 0) {
      throw new BadRequestException('Allocated quantity cannot be negative.');
    }

    if (!dto.channelTargets || dto.channelTargets.length === 0) {
      throw new BadRequestException('At least one target channel must be selected.');
    }

    // Determine target room types
    let targetRoomTypeIds: string[] = [];
    if (dto.roomTypeId === 'ALL') {
      const roomTypes = await this.prisma.roomType.findMany({
        where: { propertyId: dto.propertyId },
        select: { id: true },
      });
      targetRoomTypeIds = roomTypes.map((rt) => rt.id);
    } else {
      targetRoomTypeIds = [dto.roomTypeId];
    }

    // Check physical rooms count per target room type
    for (const rtId of targetRoomTypeIds) {
      const physicalRoomsCount = await this.prisma.room.count({
        where: {
          roomTypeId: rtId,
          isEnabled: true,
          status: { not: 'MAINTENANCE' },
        },
      });
      if (dto.allocatedQuantity > physicalRoomsCount) {
        throw new BadRequestException(
          `Cannot set inventory count to ${dto.allocatedQuantity}. Physical room count is ${physicalRoomsCount}.`,
        );
      }
    }

    // Calculate dates matching days of week filter
    const datesToApply: string[] = [];
    const curr = new Date(start);
    while (curr <= end) {
      const dayOfWeek = curr.getDay(); // 0 is Sunday, 1 is Monday...
      if (!dto.daysOfWeek || dto.daysOfWeek.length === 0 || dto.daysOfWeek.includes(dayOfWeek)) {
        datesToApply.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }

    if (datesToApply.length === 0) {
      throw new BadRequestException('No dates match the selected day-of-week criteria in this range.');
    }

    let savedRecordsCount = 0;
    const externalOtaTargets = dto.channelTargets.filter(
      (t) => !['ALL', 'OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL'].includes(t),
    );

    for (const rtId of targetRoomTypeIds) {
      for (const dateStr of datesToApply) {
        const targetDate = new Date(`${dateStr}T00:00:00.000Z`);
        for (const channelTarget of dto.channelTargets) {
          await (this.prisma.connectivityAvailabilityOverride as any).upsert({
            where: {
              propertyId_roomTypeId_channelTarget_date: {
                propertyId: dto.propertyId,
                roomTypeId: rtId,
                channelTarget,
                date: targetDate,
              },
            },
            update: {
              allocatedQuantity: dto.allocatedQuantity,
            },
            create: {
              propertyId: dto.propertyId,
              roomTypeId: rtId,
              channelTarget,
              date: targetDate,
              allocatedQuantity: dto.allocatedQuantity,
            },
          });
          savedRecordsCount++;
        }
      }
    }

    // Record audit log
    await this.recordRateRestrictionLog({
      propertyId: dto.propertyId,
      user,
      actionType: 'INVENTORY_OVERRIDE',
      roomTypeId: dto.roomTypeId === 'ALL' ? null : dto.roomTypeId,
      channelId: null,
      channelName: dto.channelTargets.join(', '),
      startDate: start,
      endDate: end,
      daysOfWeek: dto.daysOfWeek || [],
      summary: `Bulk inventory override [${dto.allocatedQuantity} rooms] across ${datesToApply.length} days for ${dto.channelTargets.length} channels`,
      details: {
        allocatedQuantity: dto.allocatedQuantity,
        roomTypeId: dto.roomTypeId,
        channelTargets: dto.channelTargets,
        totalDates: datesToApply.length,
      },
    });

    // Channex Delta ARI Sync for External OTAs or ALL
    const hasAll = dto.channelTargets.includes('ALL');
    if (this.channelsService && (externalOtaTargets.length > 0 || hasAll)) {
      try {
        for (const rtId of targetRoomTypeIds) {
          const roomMapping = await this.prisma.channelRoomTypeMapping.findFirst({
            where: { roomTypeId: rtId },
          });
          if (roomMapping) {
            const updates: any[] = [];
            const targetsToPush = externalOtaTargets.length > 0 ? externalOtaTargets : ['ALL'];
            for (const dateStr of datesToApply) {
              for (const otaId of targetsToPush) {
                updates.push({
                  date: dateStr,
                  roomTypeId: rtId,
                  externalRoomTypeId: roomMapping.externalRoomTypeId,
                  availableRooms: dto.allocatedQuantity,
                  channelId: otaId !== 'ALL' ? otaId : undefined,
                  stopSell: dto.allocatedQuantity === 0,
                });
              }
            }
            if (updates.length > 0) {
              await this.channelsService.pushDeltaAri(dto.propertyId, updates, []);
            }
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed Channex sync after bulk inventory override: ${err.message}`);
      }
    }

    return {
      success: true,
      propertyId: dto.propertyId,
      roomTypeId: dto.roomTypeId,
      appliedCount: savedRecordsCount,
      datesCount: datesToApply.length,
      allocatedQuantity: dto.allocatedQuantity,
    };
  }

  /**
   * Set Multi-Channel Price Override with AC/Non-AC separation and Channex delta ARI push
   */
  async setMultiChannelPriceOverride(dto: SetMultiChannelPriceOverrideDto, user?: any) {
    const start = new Date(`${dto.date}T00:00:00.000Z`);
    const end = new Date(`${dto.date}T23:59:59.999Z`);

    for (const item of dto.prices) {
      if (item.price < 0) {
        throw new BadRequestException(`Price cannot be negative for target ${item.channelTarget}.`);
      }
    }

    const savedRules: any[] = [];
    const externalOtaUpdates: Array<{ otaId: string; price: number }> = [];

    let targetRatePlanId = dto.ratePlanId;
    if (!targetRatePlanId) {
      const primaryPlan = await this.prisma.ratePlan.findFirst({
        where: { propertyId: dto.propertyId, isPrimary: true, isActive: true },
      });
      if (primaryPlan) targetRatePlanId = primaryPlan.id;
    }

    const isAcFilter = dto.isAc !== undefined ? dto.isAc : null;

    for (const item of dto.prices) {
      // Remove any existing single-day rule on this exact date for this room, channelTarget, and isAc mode
      await (this.prisma.pricingRule as any).deleteMany({
        where: {
          roomTypeId: dto.roomTypeId,
          channelTarget: item.channelTarget,
          isAc: isAcFilter,
          startDate: { gte: start },
          endDate: { lte: end },
        },
      });

      const variantTag = dto.isAc === true ? 'AC' : dto.isAc === false ? 'Non-AC' : 'General';
      const name = `Daily Tariff [${item.channelTarget}] (${variantTag}) ${dto.date}`;

      const rule = await (this.prisma.pricingRule as any).create({
        data: {
          name,
          startDate: start,
          endDate: end,
          daysOfWeek: [],
          adjustmentType: PricingAdjustmentType.SET_FIXED_PRICE,
          adjustmentValue: item.price,
          roomTypeId: dto.roomTypeId,
          ratePlanId: targetRatePlanId || null,
          channelTarget: item.channelTarget,
          isAc: isAcFilter,
          isActive: true,
        },
      });
      savedRules.push(rule);

      if (!['ALL', 'OREEDU_PMS', 'OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL'].includes(item.channelTarget)) {
        externalOtaUpdates.push({ otaId: item.channelTarget, price: item.price });
      }
    }

    // Record audit log
    if (dto.propertyId) {
      const variantTag = dto.isAc === true ? 'AC' : dto.isAc === false ? 'Non-AC' : 'All';
      await this.recordRateRestrictionLog({
        propertyId: dto.propertyId,
        user,
        actionType: 'RATE_UPDATE',
        roomTypeId: dto.roomTypeId,
        channelId: null,
        channelName: dto.prices.map((p) => p.channelTarget).join(', '),
        startDate: start,
        endDate: end,
        summary: `Multi-channel ${variantTag} tariff override on ${dto.date}: ${dto.prices.map((p) => `${p.channelTarget}: ₹${p.price}`).join(' | ')}`,
        details: { prices: dto.prices, isAc: dto.isAc, date: dto.date },
      });
    }

    // Push ARI delta to Channex if external OTAs are present or if ALL is present
    let otaSyncResults: Array<{ channelId: string; channelName?: string; status: string; price: number }> = [];
    if (dto.propertyId && this.channelsService) {
      const hasAll = dto.prices.some((p) => p.channelTarget === 'ALL');
      if (externalOtaUpdates.length > 0 || hasAll) {
        try {
          const roomMapping = await this.prisma.channelRoomTypeMapping.findFirst({
            where: { roomTypeId: dto.roomTypeId },
          });
          if (roomMapping) {
            const updates = (externalOtaUpdates.length > 0
              ? externalOtaUpdates
              : [{ otaId: 'ALL', price: dto.prices.find((p) => p.channelTarget === 'ALL')?.price || 0 }]
            ).map((u) => ({
              date: dto.date,
              dateTo: dto.date,
              roomTypeId: dto.roomTypeId,
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              price: u.price,
              channelId: u.otaId !== 'ALL' ? u.otaId : undefined,
            }));
            await this.channelsService.pushDeltaAri(dto.propertyId, [], updates as any);
            otaSyncResults = updates.map((u) => ({
              channelId: u.channelId || 'ALL',
              channelName: u.channelId ? `Channel ${u.channelId}` : 'All Connected OTAs',
              status: 'SUCCESS',
              price: u.price,
            }));
          } else {
            otaSyncResults = (externalOtaUpdates.length > 0 ? externalOtaUpdates : [{ otaId: 'ALL', price: 0 }]).map((u) => ({
              channelId: u.otaId,
              channelName: `Channel ${u.otaId}`,
              status: 'SKIPPED_NO_MAPPING',
              price: u.price,
            }));
          }
        } catch (err: any) {
          this.logger.warn(`Failed targeted channel price sync: ${err.message}`);
          otaSyncResults = (externalOtaUpdates.length > 0 ? externalOtaUpdates : [{ otaId: 'ALL', price: 0 }]).map((u) => ({
            channelId: u.otaId,
            channelName: `Channel ${u.otaId}`,
            status: 'FAILED',
            price: u.price,
          }));
        }
      }
    }

    return {
      success: true,
      propertyId: dto.propertyId,
      roomTypeId: dto.roomTypeId,
      date: dto.date,
      isAc: dto.isAc,
      appliedPrices: savedRules,
      channexSync: {
        synced: otaSyncResults.length > 0 && otaSyncResults.every((r) => r.status === 'SUCCESS'),
        details: otaSyncResults,
      },
    };
  }

  /**
   * Apply Direct Restrictions
   */
  async applyRestrictions(dto: ApplyRestrictionsDto, user?: any) {
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

    if (dto.propertyId) {
      if (dto.stopSell !== undefined) {
        await this.recordRateRestrictionLog({
          propertyId: dto.propertyId,
          user,
          actionType: 'STOP_SELL_TOGGLE',
          roomTypeId: dto.roomTypeId || null,
          startDate: start,
          endDate: end,
          summary: `Stop sell ${dto.stopSell ? 'ACTIVATED' : 'DEACTIVATED'} (${dto.startDate} to ${dto.endDate})`,
          details: { stopSell: dto.stopSell },
        });
      }

      if (dto.minStayArrival || dto.minStayThrough || dto.closedToArrival || dto.closedToDeparture) {
        await this.recordRateRestrictionLog({
          propertyId: dto.propertyId,
          user,
          actionType: 'RESTRICTION_UPDATE',
          roomTypeId: dto.roomTypeId || null,
          startDate: start,
          endDate: end,
          summary: `Stay restrictions applied (${dto.startDate} to ${dto.endDate})`,
          details: { minStayArrival: dto.minStayArrival, minStayThrough: dto.minStayThrough, closedToArrival: dto.closedToArrival, closedToDeparture: dto.closedToDeparture },
        });
      }
    }

    if (dto.propertyId && this.channelsService) {
      this.channelsService.pushAriForProperty(dto.propertyId, 60).catch((err) => {
        this.logger.warn(`Failed to auto-sync Channex after restriction update: ${err.message}`);
      });
    }

    return result;
  }

  /**
   * Get Active Restriction Rules for a Property
   */
  async getActiveRestrictionRules(propertyId: string, roomTypeId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const where: any = {
      propertyId,
      isActive: true,
      endDate: { gte: today },
    };

    if (roomTypeId && roomTypeId !== 'ALL') {
      where.roomTypeId = roomTypeId;
    }

    return (this.prisma as any).restrictionRule.findMany({
      where,
      include: {
        roomType: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * Clear an Active Restriction Rule & Sync Removal to Channels
   */
  async clearRestrictionRule(id: string, user?: any) {
    const rule = await (this.prisma as any).restrictionRule.findUnique({
      where: { id },
      include: { roomType: true },
    });

    if (!rule) {
      throw new NotFoundException('Restriction rule not found');
    }

    await (this.prisma as any).restrictionRule.update({
      where: { id },
      data: { isActive: false },
    });

    // Record audit log
    await this.recordRateRestrictionLog({
      propertyId: rule.propertyId,
      user,
      actionType: 'RESTRICTION_UPDATE',
      roomTypeId: rule.roomTypeId,
      startDate: rule.startDate,
      endDate: rule.endDate,
      daysOfWeek: rule.daysOfWeek || [],
      summary: `Stay restriction rule CLEARED for ${rule.roomType?.name || 'All Rooms'} (${rule.startDate.toISOString().split('T')[0]} to ${rule.endDate.toISOString().split('T')[0]})`,
      details: {
        clearedRuleId: id,
        channelTarget: rule.channelTarget,
        previousMinStay: rule.minStayArrival,
        wasCta: rule.closedToArrival,
        wasCtd: rule.closedToDeparture,
      },
    });

    // If connected to Channex and roomTypeId is mapped, push ARI delta to restore defaults
    if (rule.propertyId && this.channelsService) {
      const startDateStr = rule.startDate.toISOString().split('T')[0];
      const endDateStr = rule.endDate.toISOString().split('T')[0];

      if (rule.roomTypeId) {
        this.prisma.channelRoomTypeMapping.findFirst({
          where: { roomTypeId: rule.roomTypeId },
        }).then(async (roomMapping) => {
          if (roomMapping && this.channelsService) {
            await this.channelsService.pushDeltaAri(rule.propertyId, [], [{
              date: startDateStr,
              dateTo: endDateStr,
              roomTypeId: rule.roomTypeId,
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              channelId: rule.channelTarget !== 'ALL' && !['OREEDU_OTA_PORTAL', 'OREEDU_CP_PORTAL', 'OREEDU_PMS'].includes(rule.channelTarget) ? rule.channelTarget : undefined,
              minStayArrival: 1,
              minStayThrough: 1,
              maxStay: null,
              closedToArrival: false,
              closedToDeparture: false,
            }] as any);
          } else if (this.channelsService) {
            await this.channelsService.pushAriForProperty(rule.propertyId, 60);
          }
        }).catch((err) => {
          this.logger.warn(`Failed to sync Channex ARI on rule clear: ${err.message}`);
        });
      } else if (this.channelsService) {
        this.channelsService.pushAriForProperty(rule.propertyId, 60).catch((err) => {
          this.logger.warn(`Failed to sync Channex ARI on rule clear: ${err.message}`);
        });
      }
    }

    return { success: true, message: 'Stay restriction rule cleared and synced across channels' };
  }

  async recordRateRestrictionLog(data: {
    propertyId: string;
    user?: any;
    actionType: any;
    roomTypeId?: string | null;
    channelId?: string | null;
    channelName?: string;
    startDate: Date | string;
    endDate: Date | string;
    daysOfWeek?: number[];
    summary: string;
    details?: any;
    syncStatus?: any;
  }) {
    try {
      let roomTypeName: string | null = null;
      if (data.roomTypeId) {
        const rt = await this.prisma.roomType.findUnique({
          where: { id: data.roomTypeId },
          select: { name: true },
        });
        roomTypeName = rt ? rt.name : data.roomTypeId;
      } else {
        roomTypeName = 'All Room Types';
      }

      const userId = data.user?.id || null;
      const userName = data.user?.name || data.user?.email || 'PMS Staff';
      const userRole = (data.user?.roles?.[0] as string) || (data.user?.role as string) || 'STAFF';

      const start = typeof data.startDate === 'string' ? new Date(data.startDate) : data.startDate;
      const end = typeof data.endDate === 'string' ? new Date(data.endDate) : data.endDate;

      await (this.prisma as any).rateRestrictionLog.create({
        data: {
          propertyId: data.propertyId,
          userId,
          userName,
          userRole,
          actionType: data.actionType,
          roomTypeId: data.roomTypeId || null,
          roomTypeName,
          channelId: data.channelId || null,
          channelName: data.channelName || (data.channelId ? `Channel ${data.channelId}` : 'All Channels'),
          startDate: start,
          endDate: end,
          daysOfWeek: data.daysOfWeek || [],
          summary: data.summary,
          details: data.details || null,
          syncStatus: data.syncStatus || 'SUCCESS',
        },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to record rate/restriction audit log: ${err.message}`);
    }
  }

  async getRateRestrictionLogs(propertyId: string, query: QueryRateRestrictionLogsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: any = { propertyId };

    if (query.roomTypeId && query.roomTypeId !== 'ALL') {
      where.roomTypeId = query.roomTypeId;
    }

    if (query.actionType && query.actionType !== 'ALL') {
      const normalizedAction = query.actionType.toUpperCase();
      if (normalizedAction === 'STOP_SELL' || normalizedAction === 'STOP_SELL_REMOVED' || normalizedAction === 'STOP_SELL_TOGGLE') {
        where.actionType = 'STOP_SELL_TOGGLE';
      } else if (normalizedAction === 'RESTRICTION_CHANGE' || normalizedAction === 'RESTRICTION_UPDATE') {
        where.actionType = 'RESTRICTION_UPDATE';
      } else if (['RATE_UPDATE', 'RESTRICTION_UPDATE', 'STOP_SELL_TOGGLE', 'INVENTORY_OVERRIDE'].includes(normalizedAction)) {
        where.actionType = normalizedAction;
      }
    }

    if (query.startDate) {
      where.endDate = { gte: new Date(query.startDate) };
    }

    if (query.endDate) {
      where.startDate = { lte: new Date(query.endDate) };
    }

    const [total, logs] = await Promise.all([
      (this.prisma as any).rateRestrictionLog.count({ where }),
      (this.prisma as any).rateRestrictionLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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
