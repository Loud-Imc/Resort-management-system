import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { format } from 'date-fns';
import { DateUtils } from '../common/utils/date.utils';
import {
    validatePhysicalFeasibility,
    calculateCanonicalSurcharges,
    solveAccommodationOptions,
    validateChildAges,
} from '../common/utils/occupancy-solver.util';

export interface PricingBreakdown {
    baseAmount: number;
    grossBaseAmount: number;
    extraAdultAmount: number;
    grossExtraAdultAmount: number;
    extraAdultsCount?: number;
    extraChildAmount: number;
    grossExtraChildAmount: number;
    extraChildrenCount?: number;
    taxAmount: number;
    offerDiscountAmount: number;
    grossOfferDiscountAmount: number;
    couponDiscountAmount: number;
    grossCouponDiscountAmount: number;
    referralDiscountAmount: number;
    grossReferralDiscountAmount: number;
    discountAmount: number;
    totalAmount: number;
    originalTotal: number;
    numberOfNights: number;
    pricePerNight: number;
    taxRate: number;
    // Multi-currency Support
    baseCurrency: string;
    targetCurrency: string;
    exchangeRate: number;
    convertedTotal: number;
    originalConvertedTotal: number;
    // Group Booking
    roomCount?: number;
    // Code Detection Info
    appliedCodeType?: 'COUPON' | 'REFERRAL' | 'NONE';
    referralPartnerId?: string;
    partialPaymentPct?: number;
    isGstInclusive?: boolean;
    offerName?: string;
    offerDescription?: string;
    offerStartDate?: string;
    offerEndDate?: string;
    offerDiscountType?: string;
    offerDiscountValue?: number;
    // Rate Plan & AC
    ratePlanId?: string;
    mealPlan?: string;
    isAcSelected?: boolean;
}

export interface PublishedRateBreakdown {
    originalBasePrice: number;
    basePrice: number;
    effectivePriceBeforeTax: number;
    taxAmount: number;
    taxRate: number;
    isGstInclusive: boolean;
    gstMode: 'INCLUSIVE' | 'EXCLUSIVE';
    appliedPricingRule?: {
        id: string;
        name: string;
        adjustmentType: string;
        adjustmentValue: number;
    };
    appliedOffer?: {
        id: string;
        name: string;
        discountType: string;
        discountValue: number;
    };
}

export interface PublishedDailyRateQuote {
    date: string;
    roomTypeId: string;
    publishedPrice: number;
    convertedPublishedPrice: number;
    baseCurrency: string;
    targetCurrency: string;
    exchangeRate: number;
    breakdown: PublishedRateBreakdown;
}

import { CurrenciesService } from '../currencies/currencies.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class PricingService {
    // MAX_DISCOUNT_PCT is now stored in GlobalSettings (key: 'MAX_DISCOUNT_PCT').
    // Use SystemSettingsService.getSetting() — no hardcoded value here.
    private readonly FALLBACK_MAX_DISCOUNT_PCT = 0.30; // used only if DB value missing

    constructor(
        private prisma: PrismaService,
        private currenciesService: CurrenciesService,
        private systemSettingsService: SystemSettingsService
    ) { }

    /**
     * Calculate booking price based on room type, dates, and guest count
     * This is the core pricing engine - all pricing logic is backend-driven
     */
    async calculatePrice(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
        adultsCount: number,
        childrenCount: number,
        couponCode?: string,
        referralCode?: string,
        targetCurrency: string = 'INR',
        isGroupBooking: boolean = false,
        groupSize?: number,
        requestedRoomCount?: number,
        generalCode?: string,
        overrideTotal?: number,
        isOverrideInclusive: boolean = true,
        extraAdultsCount?: number,
        extraChildrenCount?: number,
        infantsCount: number = 0,
        childAges?: number[],
        preloadedRoomType?: any,
        preloadedContext?: { gstTiers?: any[]; offers?: any[]; pricingRules?: any[] },
        ratePlanId?: string,
        isAcSelected?: boolean,
        mealPlan?: any,
    ): Promise<PricingBreakdown> {
        // Resolve generalCode if provided
        if (generalCode && !couponCode && !referralCode) {
            const trimmed = generalCode.trim().toUpperCase();
            // Check if it's a coupon first
            const coupon = await this.prisma.coupon.findUnique({ where: { code: trimmed } });
            if (coupon) {
                couponCode = trimmed;
            } else {
                // If not a coupon, check if it's a referral code
                const cp = await this.prisma.channelPartner.findFirst({
                    where: { referralCode: trimmed, status: 'APPROVED' as any }
                });
                if (cp) {
                    referralCode = trimmed;
                } else {
                    // If neither, we'll let the individual logic below throw the error
                    // Defaulting to coupon so it throws "Invalid coupon code"
                    couponCode = trimmed;
                }
            }
        }

        // 1. Get room type pricing configuration
        const roomType = preloadedRoomType || (await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            include: { property: true },
        })) as any;

        if (!roomType) {
            console.error(`[PricingService] Room type not found: ${roomTypeId}`);
            throw new NotFoundException('Room type not found');
        }

        if (!roomType.property) {
            console.error(`[PricingService] Property relation missing for roomType: ${roomTypeId}`);
            throw new BadRequestException('Property information missing for this room type');
        }

        // Property.occupancyVersion or RoomType.occupancyVersion is the authoritative RUNTIME ACTIVATION switch.
        // RoomType.occupancyVersion represents configuration/readiness state.
        const isV2 = (roomType.property as any)?.occupancyVersion === 'V2' || (roomType as any)?.occupancyVersion === 'V2';

        if (isV2 && (roomType.property as any)?.occupancyVersion === 'V2') {
            // Under a V2 Property, all RoomTypes must be V2-ready with non-null canonical fields
            if (
                roomType.occupancyVersion !== 'V2' ||
                roomType.totalBaseOccupancy === null || roomType.totalBaseOccupancy === undefined ||
                roomType.totalMaxOccupancy === null || roomType.totalMaxOccupancy === undefined ||
                roomType.maxPhysicalAdults === null || roomType.maxPhysicalAdults === undefined ||
                roomType.maxPhysicalChildren === null || roomType.maxPhysicalChildren === undefined
            ) {
                throw new BadRequestException(
                    `RoomType ${roomTypeId} (${roomType.name}) under V2 Property (${roomType.property.name}) is not V2-ready or is missing required canonical occupancy fields (totalBaseOccupancy, totalMaxOccupancy, maxPhysicalAdults, maxPhysicalChildren).`
                );
            }
        }

        const baseCurrency = (roomType.property as any).baseCurrency || 'INR';

        // 2. Calculate number of nights
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        const numberOfNights = Math.max(1, Math.round(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        ));

        if (checkIn > checkOut) {
            throw new BadRequestException('Check-out date cannot be before check-in date');
        }

        // 3. Resolve authoritative AC selection and Rate Plan pricing
        let authoritativeIsAc = true;
        if (roomType.acOption === 'NON_AC_ONLY') {
            authoritativeIsAc = false;
        } else if (roomType.acOption === 'AC_ONLY') {
            authoritativeIsAc = true;
        } else if (roomType.acOption === 'BOTH') {
            authoritativeIsAc = isAcSelected !== undefined ? Boolean(isAcSelected) : true;
        }

        let targetRatePlan: any = null;
        let roomTypeRatePrice: any = null;

        if (ratePlanId) {
            targetRatePlan = await this.prisma.ratePlan.findUnique({
                where: { id: ratePlanId },
                include: { roomTypePrices: { where: { roomTypeId } } },
            });
            roomTypeRatePrice = targetRatePlan?.roomTypePrices?.[0];
        } else if (mealPlan) {
            targetRatePlan = await this.prisma.ratePlan.findFirst({
                where: { propertyId: roomType.propertyId, mealPlan, isActive: true },
                include: { roomTypePrices: { where: { roomTypeId } } },
            });
            roomTypeRatePrice = targetRatePlan?.roomTypePrices?.[0];
        }

        let rawBasePrice = Number(roomType.basePrice);
        let rawExtraAdultPrice = Number(roomType.extraAdultPrice);
        let rawExtraChildPrice = Number(roomType.extraChildPrice);

        if (roomTypeRatePrice) {
            if (authoritativeIsAc && roomTypeRatePrice.basePriceAc !== null && roomTypeRatePrice.basePriceAc !== undefined) {
                rawBasePrice = Number(roomTypeRatePrice.basePriceAc);
                rawExtraAdultPrice = roomTypeRatePrice.extraAdultPriceAc !== null ? Number(roomTypeRatePrice.extraAdultPriceAc) : Number(roomTypeRatePrice.extraAdultPrice);
                rawExtraChildPrice = roomTypeRatePrice.extraChildPriceAc !== null ? Number(roomTypeRatePrice.extraChildPriceAc) : Number(roomTypeRatePrice.extraChildPrice);
            } else {
                rawBasePrice = Number(roomTypeRatePrice.basePrice);
                rawExtraAdultPrice = Number(roomTypeRatePrice.extraAdultPrice);
                rawExtraChildPrice = Number(roomTypeRatePrice.extraChildPrice);
            }
        } else {
            if (authoritativeIsAc && roomType.basePriceAc !== null && roomType.basePriceAc !== undefined) {
                rawBasePrice = Number(roomType.basePriceAc);
                rawExtraAdultPrice = roomType.extraAdultPriceAc !== null ? Number(roomType.extraAdultPriceAc) : Number(roomType.extraAdultPrice);
                rawExtraChildPrice = roomType.extraChildPriceAc !== null ? Number(roomType.extraChildPriceAc) : Number(roomType.extraChildPrice);
            } else {
                rawBasePrice = Number(roomType.basePrice);
                rawExtraAdultPrice = Number(roomType.extraAdultPrice);
                rawExtraChildPrice = Number(roomType.extraChildPrice);
            }
        }

        // 4. Normalize prices if room type is GST inclusive (Only if property is GST registered)
        const isPropertyGstApplicable = Boolean((roomType.property as any)?.isGstApplicable && (roomType.property as any)?.gstNumber);
        const isRoomGstInclusive = isPropertyGstApplicable && Boolean(roomType.isGstInclusive);

        let effectiveBasePrice = rawBasePrice;
        let effectiveExtraAdultPrice = rawExtraAdultPrice;
        let effectiveExtraChildPrice = rawExtraChildPrice;

        if (isRoomGstInclusive) {
            // Reverse-calculate components for base amount (per room per night)
            const normalizedBase = await this.calculateReverseGST(effectiveBasePrice, 1, 1, undefined, true, preloadedContext?.gstTiers);
            effectiveBasePrice = normalizedBase.baseAmount;

            // Reverse-calculate extra adult price (treated as its own tariff per night)
            if (effectiveExtraAdultPrice > 0) {
                const normalizedAdult = await this.calculateReverseGST(effectiveExtraAdultPrice, 1, 1, undefined, true, preloadedContext?.gstTiers);
                effectiveExtraAdultPrice = normalizedAdult.baseAmount;
            }

            // Reverse-calculate extra child price
            if (effectiveExtraChildPrice > 0) {
                const normalizedChild = await this.calculateReverseGST(effectiveExtraChildPrice, 1, 1, undefined, true, preloadedContext?.gstTiers);
                effectiveExtraChildPrice = normalizedChild.baseAmount;
            }
        }

        // 5. Calculate base price
        let baseAmount = 0;
        let extraAdultAmount = 0;
        let extraChildAmount = 0;
        let extraAdults = 0;
        let extraChildren = 0;
        let basePricePerNight = 0;
        let isGroupInclusive = false;
        
        const stdCapacity = (Number(roomType.maxAdults) || 2) + (Number(roomType.maxChildren) || 0);
        const isV2Cap = (roomType as any).totalMaxOccupancy !== null && (roomType as any).totalMaxOccupancy !== undefined;
        const roomCapacity = isV2Cap ? Number((roomType as any).totalMaxOccupancy) : (roomType.groupMaxOccupancy || stdCapacity || 1);
        const calculatedRoomCount = (isGroupBooking && groupSize)
            ? (requestedRoomCount || Math.ceil(groupSize / roomCapacity))
            : (requestedRoomCount || 1);
        let finalRoomCount = Math.max(1, calculatedRoomCount);

        if (isGroupBooking && groupSize) {
            if (!roomType.isAvailableForGroupBooking) {
                console.warn(`[PricingService] Group booking attempted on non-group roomType: ${roomTypeId}`);
                throw new BadRequestException('This room type is not available for group booking pool');
            }
            const propertyGroupPricePerHead = (roomType.property as any).groupPricePerHead;
            const propertyGroupPriceAdult = (roomType.property as any).groupPriceAdult;
            const propertyGroupPriceChild = (roomType.property as any).groupPriceChild;
            
            const rawGroupInclusive = (roomType.property as any).isGroupGstInclusive;
            isGroupInclusive = isPropertyGstApplicable && Boolean(rawGroupInclusive);

            // Target room count was already pre-calculated above for slab accuracy

            // Calculate the total inclusive price for the group per night
            let totalInclusivePerNight = 0;
            if (propertyGroupPriceAdult === null || propertyGroupPriceAdult === undefined) {
                if (propertyGroupPricePerHead === null || propertyGroupPricePerHead === undefined) {
                    throw new BadRequestException('Group price per head is not configured for this property');
                }
                totalInclusivePerNight = Number(propertyGroupPricePerHead) * groupSize;
            } else {
                const adultRate = Number(propertyGroupPriceAdult);
                const childRate = Number(propertyGroupPriceChild || 0);
                totalInclusivePerNight = (adultRate * adultsCount) + (childRate * childrenCount);
            }

            // Task 2.4: Group Booking Per-Head Meal Plan Supplement
            const activeMealPlan = targetRatePlan?.mealPlan || mealPlan || 'EP';
            let groupMealSupplement = 0;
            if (activeMealPlan === 'CP') {
                groupMealSupplement = (adultsCount * 250) + (childrenCount * 150);
            } else if (activeMealPlan === 'MAP') {
                groupMealSupplement = (adultsCount * 700) + (childrenCount * 400);
            } else if (activeMealPlan === 'AP') {
                groupMealSupplement = (adultsCount * 1200) + (childrenCount * 700);
            }
            totalInclusivePerNight += groupMealSupplement;

            // Convert inclusive total to base total using accurate roomCount-based slab
            if (isGroupInclusive) {
                // Slabs are applied per room (distribute tariff equally across required rooms)
                const normalized = await this.calculateReverseGST(totalInclusivePerNight, 1, finalRoomCount, undefined, true, preloadedContext?.gstTiers);
                basePricePerNight = normalized.baseAmount;
            } else {
                basePricePerNight = totalInclusivePerNight;
            }

            baseAmount = basePricePerNight * numberOfNights;
        } else {
            // Standard booking pricing
            const baseAdults = roomType.baseAdults !== null && roomType.baseAdults !== undefined
                ? Number(roomType.baseAdults)
                : (Number(roomType.maxAdults) || 2);
            const baseChildren = roomType.baseChildren !== null && roomType.baseChildren !== undefined
                ? Number(roomType.baseChildren)
                : (Number(roomType.maxChildren) || 2);

            const rooms = finalRoomCount;
            basePricePerNight = effectiveBasePrice * rooms;
            baseAmount = effectiveBasePrice * numberOfNights * rooms;

            if (isV2) {
                // V2 Canonical Pricing Integration: Authoritative server calculation with child ages
                if (childrenCount > 0) {
                    validateChildAges(childrenCount, childAges);
                }

                if (rooms === 1) {
                    // Single room physical validation & surcharge calculation
                    const feasibility = validatePhysicalFeasibility(
                        { adults: adultsCount, children: childrenCount, infants: infantsCount || 0, childAges },
                        {
                            totalMaxOccupancy: roomType.totalMaxOccupancy,
                            maxPhysicalAdults: roomType.maxPhysicalAdults,
                            maxPhysicalChildren: roomType.maxPhysicalChildren,
                            maxPhysicalInfants: roomType.maxPhysicalInfants ?? 1,
                        }
                    );
                    if (!feasibility.isValid) {
                        throw new BadRequestException(`Occupancy exceeds physical capacity: ${feasibility.violations.join('; ')}`);
                    }

                    const surcharges = calculateCanonicalSurcharges(
                        { adults: adultsCount, children: childrenCount, infants: infantsCount || 0, childAges },
                        {
                            totalBaseOccupancy: roomType.totalBaseOccupancy,
                            totalMaxOccupancy: roomType.totalMaxOccupancy,
                            maxPhysicalAdults: roomType.maxPhysicalAdults,
                            maxPhysicalChildren: roomType.maxPhysicalChildren,
                            maxPhysicalInfants: roomType.maxPhysicalInfants ?? 1,
                            baseMaxAdults: roomType.baseMaxAdults,
                            baseMaxChildren: roomType.baseMaxChildren,
                            freeChildrenCount: roomType.freeChildrenCount ?? 0,
                            extraAdultPrice: effectiveExtraAdultPrice,
                            extraChildPrice: effectiveExtraChildPrice,
                        }
                    );
                    extraAdults = surcharges.extraAdultsCount;
                    extraChildren = surcharges.extraChildrenCount;
                } else {
                    // Multi-room same type allocation via Canonical Solver
                    const solutions = solveAccommodationOptions(
                        { adults: adultsCount, children: childrenCount, infants: infantsCount || 0, childAges, requestedRooms: rooms },
                        [{
                            id: roomType.id,
                            name: roomType.name,
                            totalBaseOccupancy: roomType.totalBaseOccupancy,
                            totalMaxOccupancy: roomType.totalMaxOccupancy,
                            maxPhysicalAdults: roomType.maxPhysicalAdults,
                            maxPhysicalChildren: roomType.maxPhysicalChildren,
                            maxPhysicalInfants: roomType.maxPhysicalInfants ?? 1,
                            baseMaxAdults: roomType.baseMaxAdults,
                            baseMaxChildren: roomType.baseMaxChildren,
                            freeChildrenCount: roomType.freeChildrenCount ?? 0,
                            basePrice: effectiveBasePrice,
                            extraAdultPrice: effectiveExtraAdultPrice,
                            extraChildPrice: effectiveExtraChildPrice,
                            availableQuantity: rooms,
                        }]
                    );

                    if (solutions.length === 0) {
                        throw new BadRequestException(`Guest party (${adultsCount} adults, ${childrenCount} children, ${infantsCount || 0} infants) cannot be accommodated in ${rooms} room(s) of type ${roomType.name}`);
                    }

                    const chosenSol = solutions.find(s => s.totalRooms === rooms) || solutions[0];
                    extraAdults = chosenSol.rooms.reduce((sum, r) => sum + r.extraAdults, 0);
                    extraChildren = chosenSol.rooms.reduce((sum, r) => sum + r.extraChildren, 0);
                }

                extraAdultAmount = extraAdults * effectiveExtraAdultPrice * Math.max(1, numberOfNights);
                extraChildAmount = extraChildren * effectiveExtraChildPrice * Math.max(1, numberOfNights);
            } else {
                // V1 Legacy Pricing Path (Unchanged)
                const effectiveBaseAdults = Number(roomType.baseAdults ?? roomType.totalBaseOccupancy ?? roomType.maxAdults ?? 2) * rooms;
                extraAdults = extraAdultsCount !== undefined && extraAdultsCount !== null
                    ? Math.max(0, Number(extraAdultsCount))
                    : Math.max(0, adultsCount - effectiveBaseAdults);
                extraAdultAmount = extraAdults * effectiveExtraAdultPrice * Math.max(1, numberOfNights);

                const effectiveBaseChildren = Number(roomType.baseChildren ?? roomType.baseMaxChildren ?? roomType.maxChildren ?? 1) * rooms;
                extraChildren = extraChildrenCount !== undefined && extraChildrenCount !== null
                    ? Math.max(0, Number(extraChildrenCount))
                    : Math.max(0, childrenCount - effectiveBaseChildren);
                extraChildAmount = extraChildren * effectiveExtraChildPrice * Math.max(1, numberOfNights);
            }
        }

        // 6. Apply Pricing Rules (Seasonal/Dynamic Pricing)
        const pricingRule = preloadedContext?.pricingRules
            ? preloadedContext.pricingRules.find((r: any) => r.roomTypeId === roomTypeId && r.isActive && DateUtils.areNightIntervalsOverlapping(checkInDate, checkOutDate, r.startDate, r.endDate))
            : await this.getApplicablePricingRule(roomTypeId, checkInDate, checkOutDate);

        let subtotal = baseAmount + extraAdultAmount + extraChildAmount;
        if (pricingRule) {
            if (pricingRule.adjustmentType === 'PERCENTAGE') {
                subtotal += (subtotal * Number(pricingRule.adjustmentValue)) / 100;
            } else if (pricingRule.adjustmentType === 'SET_FIXED_PRICE') {
                subtotal = Number(pricingRule.adjustmentValue) + extraAdultAmount + extraChildAmount;
            } else {
                subtotal += Number(pricingRule.adjustmentValue);
            }
        }

        // CAPTURE ORIGINAL SUBTOTAL (Pre-offer/coupon/referral)
        const subtotalBeforeDiscounts = subtotal;
        let originalTaxAmount = 0;
        const originalEffectiveNights = Math.max(1, numberOfNights);

        if (isPropertyGstApplicable) {
            const gstTiersForOriginal = preloadedContext?.gstTiers || (await this.systemSettingsService.getSetting('GST_TIERS') as any[]);
            for (let i = 0; i < originalEffectiveNights; i++) {
                const subtotalThisNight = subtotalBeforeDiscounts / originalEffectiveNights;
                if (isGroupBooking && groupSize && groupSize > 0) {
                    const headTariffThisNight = subtotalThisNight / groupSize;
                    const headTax = this.calculateTaxForTariff(headTariffThisNight, gstTiersForOriginal);
                    originalTaxAmount += headTax * groupSize;
                } else {
                    const roomTariffThisNight = subtotalThisNight / finalRoomCount;
                    for (let r = 0; r < finalRoomCount; r++) {
                        originalTaxAmount += this.calculateTaxForTariff(roomTariffThisNight, gstTiersForOriginal);
                    }
                }
            }
        }
        const originalTotal = subtotalBeforeDiscounts + originalTaxAmount;

        // 7. Check for active Room Type Offers
        const allOffers = preloadedContext?.offers
            ? preloadedContext.offers.filter((o: any) => o.isActive && (o.roomTypes ? o.roomTypes.some((rt: any) => rt.id === roomTypeId) : true))
            : await this.prisma.offer.findMany({ where: { roomTypes: { some: { id: roomTypeId } }, isActive: true } });
        const activeOffer = allOffers.find((o: any) => DateUtils.areNightIntervalsOverlapping(checkInDate, checkOutDate, o.startDate, o.endDate));

        let offerDiscountAmount = 0;
        if (activeOffer) {
            const offer = activeOffer as any;
            if (offer.discountType === 'PERCENTAGE') {
                offerDiscountAmount = (subtotal * Number(offer.discountValue)) / 100;
            } else if (offer.discountType === 'FIXED_AMOUNT') {
                offerDiscountAmount = Number(offer.discountValue);
            }
            offerDiscountAmount = Math.min(offerDiscountAmount, subtotal);
            subtotal -= offerDiscountAmount;
        }

        // 8. Apply Referral Discount if provided
        let referralDiscountAmount = 0;
        if (referralCode) {
            const cp = await this.prisma.channelPartner.findFirst({
                where: { referralCode: referralCode.trim().toUpperCase(), status: 'APPROVED' as any }
            });
            if (cp) {
                const discountRate = cp.referralDiscountRate ? Number(cp.referralDiscountRate) : 5.0;
                referralDiscountAmount = (subtotal * discountRate) / 100;
                referralDiscountAmount = Math.min(referralDiscountAmount, subtotal);
                subtotal -= referralDiscountAmount;
            }
        }

        // 9. Apply Coupon Code Discount if provided
        let couponDiscountAmount = 0;
        if (couponCode) {
            couponDiscountAmount = await this.applyCoupon(couponCode, subtotal);
            subtotal -= couponDiscountAmount;
        }

        // Combined Discount Ceiling Enforcement
        const maxDiscountPctSetting = await this.systemSettingsService.getSetting('MAX_DISCOUNT_PCT');
        const maxDiscountPct = (typeof maxDiscountPctSetting === 'number' ? maxDiscountPctSetting : 30) / 100;
        const maxAllowedDiscount = subtotalBeforeDiscounts * maxDiscountPct;
        let totalDiscount = offerDiscountAmount + referralDiscountAmount + couponDiscountAmount;

        if (totalDiscount > maxAllowedDiscount) {
            const overage = totalDiscount - maxAllowedDiscount;
            let remainingOverage = overage;

            if (couponDiscountAmount > 0) {
                const couponTrim = Math.min(couponDiscountAmount, remainingOverage);
                couponDiscountAmount -= couponTrim;
                remainingOverage -= couponTrim;
                subtotal += couponTrim;
            }

            if (remainingOverage > 0) {
                const referralTrim = Math.min(referralDiscountAmount, remainingOverage);
                referralDiscountAmount -= referralTrim;
                subtotal += referralTrim;
            }

            totalDiscount = offerDiscountAmount + referralDiscountAmount + couponDiscountAmount;
        }

        // Ensure no negative pricing (safety guard)
        subtotal = Math.max(0, subtotal);

        // 10. Calculate GST based on dynamic GST tiers (Applied per room per night)
        let totalTaxAmount = 0;
        if (isPropertyGstApplicable) {
            const gstTiers = preloadedContext?.gstTiers || (await this.systemSettingsService.getSetting('GST_TIERS') as any[]);
            const taxEffectiveNights = Math.max(1, numberOfNights);
            for (let i = 0; i < taxEffectiveNights; i++) {
                const subtotalThisNight = subtotal / taxEffectiveNights;
                if (isGroupBooking && groupSize && groupSize > 0) {
                    const headTariffThisNight = subtotalThisNight / groupSize;
                    const headTax = this.calculateTaxForTariff(headTariffThisNight, gstTiers);
                    totalTaxAmount += headTax * groupSize;
                } else {
                    const roomTariffThisNight = subtotalThisNight / finalRoomCount;
                    for (let r = 0; r < finalRoomCount; r++) {
                        totalTaxAmount += this.calculateTaxForTariff(roomTariffThisNight, gstTiers);
                    }
                }
            }
        }

        const taxAmount = totalTaxAmount;
        const taxRate = (isPropertyGstApplicable && subtotal > 0) ? Math.round((taxAmount / subtotal) * 100) : 0;
        const totalAmount = subtotal + taxAmount;

        // 12. Handle Currency Conversion
        let exchangeRate = 1.0;
        if (targetCurrency !== baseCurrency) {
            exchangeRate = await this.currenciesService.convert(1, baseCurrency, targetCurrency);
        }

        const roomCount = finalRoomCount;

        const cleanFloat = (val: number) => {
            const rounded = Math.round(val);
            if (Math.abs(val - rounded) < 0.05) return rounded;
            return Number(val.toFixed(2));
        };

        const isGstInc = isPropertyGstApplicable && (isGroupBooking ? !!isGroupInclusive : !!roomType.isGstInclusive);

        let grossOfferDiscountAmount = offerDiscountAmount;
        let grossReferralDiscountAmount = referralDiscountAmount;
        let grossCouponDiscountAmount = couponDiscountAmount;

        if (isGstInc && taxRate > 0) {
            const grossMultiplier = 1 + (taxRate / 100);
            grossOfferDiscountAmount = cleanFloat(offerDiscountAmount * grossMultiplier);
            grossReferralDiscountAmount = cleanFloat(referralDiscountAmount * grossMultiplier);
            grossCouponDiscountAmount = cleanFloat(couponDiscountAmount * grossMultiplier);
        }

        const finalTotalAmount = cleanFloat(totalAmount);
        const finalTaxAmount = isGstInc && taxRate > 0
            ? cleanFloat(finalTotalAmount - (finalTotalAmount / (1 + (taxRate / 100))))
            : cleanFloat(totalTaxAmount);

        const result: PricingBreakdown = {
            baseAmount: isGstInc ? cleanFloat(finalTotalAmount - finalTaxAmount) : cleanFloat(baseAmount),
            grossBaseAmount: isGstInc
                ? cleanFloat((basePricePerNight * numberOfNights * (isGroupBooking ? 1 : roomCount)) * (1 + (taxRate / 100)))
                : cleanFloat(baseAmount),
            extraAdultAmount: cleanFloat(extraAdultAmount),
            grossExtraAdultAmount: isGstInc && taxRate > 0 ? cleanFloat(extraAdultAmount * (1 + (taxRate / 100))) : cleanFloat(extraAdultAmount),
            extraAdultsCount: extraAdults,
            extraChildAmount: cleanFloat(extraChildAmount),
            grossExtraChildAmount: isGstInc && taxRate > 0 ? cleanFloat(extraChildAmount * (1 + (taxRate / 100))) : cleanFloat(extraChildAmount),
            extraChildrenCount: extraChildren,
            taxAmount: finalTaxAmount,
            taxRate,
            offerDiscountAmount: cleanFloat(offerDiscountAmount),
            grossOfferDiscountAmount,
            couponDiscountAmount: cleanFloat(couponDiscountAmount),
            grossCouponDiscountAmount,
            referralDiscountAmount: cleanFloat(referralDiscountAmount),
            grossReferralDiscountAmount,
            discountAmount: cleanFloat(totalDiscount),
            totalAmount: finalTotalAmount,
            originalTotal: isGstInc ? cleanFloat(originalTotal) : cleanFloat(originalTotal),
            numberOfNights,
            pricePerNight: cleanFloat(basePricePerNight),
            baseCurrency,
            targetCurrency,
            exchangeRate,
            convertedTotal: Number((finalTotalAmount * exchangeRate).toFixed(2)),
            originalConvertedTotal: Number((originalTotal * exchangeRate).toFixed(2)),
            roomCount,
            appliedCodeType: couponCode ? 'COUPON' : (referralCode ? 'REFERRAL' : 'NONE'),
            referralPartnerId: referralCode ? (await this.prisma.channelPartner.findFirst({ where: { referralCode: referralCode.trim().toUpperCase() } }))?.id : undefined,
            isGstInclusive: isGstInc,
            offerName: activeOffer ? ((activeOffer as any).title || activeOffer.name) : undefined,
            offerDescription: activeOffer?.description || undefined,
            offerStartDate: activeOffer?.startDate ? format(new Date(activeOffer.startDate), 'yyyy-MM-dd') : undefined,
            offerEndDate: activeOffer?.endDate ? format(new Date(activeOffer.endDate), 'yyyy-MM-dd') : undefined,
            offerDiscountType: activeOffer?.discountType || undefined,
            offerDiscountValue: activeOffer?.discountValue ? Number(activeOffer.discountValue) : undefined,
            ratePlanId: targetRatePlan?.id || ratePlanId,
            mealPlan: targetRatePlan?.mealPlan || mealPlan || 'EP',
            isAcSelected: authoritativeIsAc,
        };

        // 13. If Price Override was provided by admin/desk
        if (overrideTotal !== undefined && overrideTotal !== null) {
            let finalOverrideBreakdown: { baseAmount: number; taxAmount: number; taxRate: number };
            if (isOverrideInclusive) {
                finalOverrideBreakdown = await this.calculateReverseGST(
                    overrideTotal,
                    numberOfNights,
                    roomCount,
                    isGroupBooking ? groupSize : undefined,
                    isPropertyGstApplicable
                );
            } else {
                finalOverrideBreakdown = await this.calculateExclusiveGST(
                    overrideTotal,
                    numberOfNights,
                    roomCount,
                    isGroupBooking ? groupSize : undefined,
                    isPropertyGstApplicable
                );
            }

            result.baseAmount = finalOverrideBreakdown.baseAmount;
            result.grossBaseAmount = isOverrideInclusive ? overrideTotal : finalOverrideBreakdown.baseAmount;
            result.taxAmount = finalOverrideBreakdown.taxAmount;
            result.taxRate = finalOverrideBreakdown.taxRate;
            result.totalAmount = result.baseAmount + result.taxAmount;
            result.convertedTotal = Number((result.totalAmount * exchangeRate).toFixed(2));

            result.extraAdultAmount = 0;
            result.grossExtraAdultAmount = 0;
            result.extraChildAmount = 0;
            result.grossExtraChildAmount = 0;
            result.offerDiscountAmount = 0;
            result.grossOfferDiscountAmount = 0;
            result.couponDiscountAmount = 0;
            result.grossCouponDiscountAmount = 0;
            result.referralDiscountAmount = 0;
            result.grossReferralDiscountAmount = 0;
            result.discountAmount = 0;
        }

        return result;
    }

    /**
     * Calculate GST on top of a given Base amount.
     * Used when an admin overrides the BASE price of a booking.
     */
    async calculateExclusiveGST(
        overrideBase: number,
        numberOfNights: number,
        roomCount: number,
        groupSize?: number,
        isGstApplicable: boolean = true
    ): Promise<{ baseAmount: number; taxAmount: number; taxRate: number }> {
        if (!isGstApplicable) {
            return {
                baseAmount: Number(overrideBase.toFixed(2)),
                taxAmount: 0,
                taxRate: 0
            };
        }

        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];
        const divisor = (groupSize && groupSize > 0) ? groupSize : roomCount;
        const basePerUnitPerNight = overrideBase / (Math.max(1, numberOfNights) * Math.max(1, divisor));

        const applicableTier = this.getApplicableTier(basePerUnitPerNight, gstTiers);
        const targetTaxRate = applicableTier.rate / 100;
        const exactTaxAmount = overrideBase * targetTaxRate;

        return {
            baseAmount: Number(overrideBase.toFixed(2)),
            taxAmount: Number(exactTaxAmount.toFixed(2)),
            taxRate: applicableTier.rate
        };
    }

    /**
     * Get applicable pricing rule for the date range
     */
    private async getApplicablePricingRule(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
        ratePlanId?: string,
    ) {
        const pricingRules = await this.prisma.pricingRule.findMany({
            where: {
                roomTypeId,
                isActive: true,
                ...(ratePlanId ? { OR: [{ ratePlanId }, { ratePlanId: null }] } : {}),
            },
            orderBy: [
                { isFestivalRule: 'desc' }, // Festival rules take high priority
                { createdAt: 'desc' },
            ],
        });

        const dayOfWeek = checkInDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

        const matchingRules = pricingRules.filter(rule => {
            const isOverlapping = DateUtils.areNightIntervalsOverlapping(checkInDate, checkOutDate, rule.startDate, rule.endDate);
            if (!isOverlapping) return false;

            // If rule specifies daysOfWeek (e.g. weekends [5,6,0] or weekdays [1,2,3,4]), check matching
            if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
                return rule.daysOfWeek.includes(dayOfWeek);
            }

            return true;
        });

        if (matchingRules.length === 0) return null;

        // Sort matching rules by specificity:
        // 1. RatePlan-specific rule over generic roomType rule
        // 2. Exact single-day rule over range rule
        // 3. Shorter date span over broad date span
        // 4. Festival rule
        // 5. Newest rule
        matchingRules.sort((a, b) => {
            if (ratePlanId) {
                const aPlan = a.ratePlanId === ratePlanId ? 1 : 0;
                const bPlan = b.ratePlanId === ratePlanId ? 1 : 0;
                if (aPlan !== bPlan) return bPlan - aPlan;
            }

            const aDuration = Math.abs(new Date(a.endDate).getTime() - new Date(a.startDate).getTime());
            const bDuration = Math.abs(new Date(b.endDate).getTime() - new Date(b.startDate).getTime());
            if (aDuration !== bDuration) return aDuration - bDuration; // shorter duration wins

            if (a.isFestivalRule !== b.isFestivalRule) return a.isFestivalRule ? -1 : 1;

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        return matchingRules[0];
    }

    /**
     * Apply coupon code and calculate discount
     */
    private async applyCoupon(couponCode: string, subtotal: number): Promise<number> {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: couponCode.trim().toUpperCase() },
        });

        if (!coupon) {
            throw new BadRequestException('Invalid coupon code');
        }

        if (!coupon.isActive) {
            throw new BadRequestException('Coupon is no longer active');
        }

        const now = new Date();
        if (now < coupon.validFrom || now > coupon.validUntil) {
            throw new BadRequestException('Coupon has expired');
        }

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new BadRequestException('Coupon usage limit reached');
        }

        if (coupon.minBookingAmount && subtotal < Number(coupon.minBookingAmount)) {
            throw new BadRequestException(
                `Minimum booking amount for this coupon is ₹${coupon.minBookingAmount}`,
            );
        }

        let discount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discount = (subtotal * Number(coupon.discountValue)) / 100;
        } else if (coupon.discountType === 'FIXED_AMOUNT') {
            discount = Number(coupon.discountValue);
        }

        return Math.min(discount, subtotal);
    }

    /**
     * Resolve applicable GST tier for a given room tariff per unit per night.
     * Handles continuous boundaries and edge cases gracefully with zero gaps.
     */
    public getApplicableTier(tariff: number, gstTiers: any[]): any {
        if (!gstTiers || !Array.isArray(gstTiers) || gstTiers.length === 0) {
            throw new BadRequestException('GST tax tiers not configured in system settings');
        }

        const sortedTiers = [...gstTiers].sort((a, b) => a.min - b.min);

        // 1. Direct match with inclusive bounds
        const directMatch = sortedTiers.find(tier =>
            tariff >= tier.min &&
            (tier.max === null || tier.max === undefined || tariff <= tier.max)
        );
        if (directMatch) return directMatch;

        // 2. Check for fractional boundary gap (e.g. 7500.01 - 7500.99 between max 7500 and min 7501)
        for (let i = 0; i < sortedTiers.length - 1; i++) {
            const current = sortedTiers[i];
            const next = sortedTiers[i + 1];
            if (current.max !== null && current.max !== undefined && tariff > current.max && tariff < next.min) {
                return next;
            }
        }

        // 3. Fallback if tariff exceeds highest defined tier
        const lastTier = sortedTiers[sortedTiers.length - 1];
        if (tariff >= lastTier.min) {
            return lastTier;
        }

        // 4. Fallback if tariff is below lowest defined tier
        return sortedTiers[0];
    }

    /**
     * Calculate tax for a single tariff unit (one room for one night)
     */
    public calculateTaxForTariff(tariff: number, gstTiers: any[]): number {
        const applicableTier = this.getApplicableTier(tariff, gstTiers);
        const taxRate = applicableTier.rate / 100;
        return tariff * taxRate;
    }

    /**
     * Validate pricing override (for manual bookings)
     */
    validatePriceOverride(
        calculatedTotal: number,
        overrideTotal: number,
    ): boolean {
        const minAllowed = calculatedTotal * 0.5;
        return overrideTotal >= minAllowed;
    }

    /**
     * Reverse-calculate GST and Base Amount from a given Total amount.
     * Used when a room type is GST inclusive or when an admin overrides the total price of a booking.
     */
    async calculateReverseGST(
        overrideTotal: number,
        numberOfNights: number,
        roomCount: number,
        groupSize?: number,
        isGstApplicable: boolean = true,
        preloadedGstTiers?: any[]
    ): Promise<{ baseAmount: number; taxAmount: number; taxRate: number }> {
        if (!isGstApplicable) {
            return {
                baseAmount: Number(overrideTotal.toFixed(2)),
                taxAmount: 0,
                taxRate: 0
            };
        }

        const gstTiers = preloadedGstTiers || (await this.systemSettingsService.getSetting('GST_TIERS') as any[]);
        if (!gstTiers || !Array.isArray(gstTiers) || gstTiers.length === 0) {
            throw new BadRequestException('GST tax tiers not configured in system settings');
        }

        const divisor = (groupSize && groupSize > 0) ? groupSize : roomCount;
        const totalPerUnitPerNight = overrideTotal / (Math.max(1, numberOfNights) * Math.max(1, divisor));

        let targetTaxRate = 0;
        const sortedTiers = [...gstTiers].sort((a, b) => b.rate - a.rate);

        for (const tier of sortedTiers) {
            const tierRate = tier.rate / 100;
            const testTariff = totalPerUnitPerNight / (1 + tierRate);

            if (testTariff >= tier.min && (tier.max === null || tier.max === undefined || testTariff <= tier.max)) {
                targetTaxRate = tierRate;
                break;
            }
        }

        if (targetTaxRate === 0) {
            const applicableTier = this.getApplicableTier(totalPerUnitPerNight, gstTiers);
            targetTaxRate = applicableTier.rate / 100;
        }

        const exactTaxAmount = overrideTotal - (overrideTotal / (1 + targetTaxRate));
        const exactBaseAmount = overrideTotal - exactTaxAmount;

        return {
            baseAmount: Number(exactBaseAmount.toFixed(2)),
            taxAmount: Number(exactTaxAmount.toFixed(2)),
            taxRate: Math.round(targetTaxRate * 100)
        };
    }

    /**
     * Single Source of Truth for Published Room Prices across the entire PMS ecosystem.
     */
    async getPublishedDailyRates(
        roomTypeId: string,
        startDate: Date | string,
        endDate: Date | string,
        targetCurrency?: string,
        ratePlanId?: string,
    ): Promise<PublishedDailyRateQuote[]> {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            include: { property: true },
        }) as any;

        if (!roomType || !roomType.property) {
            throw new BadRequestException('Room type or property configuration missing');
        }

        const isPropertyGstApplicable = Boolean(roomType.property.isGstApplicable && roomType.property.gstNumber);
        const baseCurrency = (roomType.property as any).baseCurrency || 'INR';
        let exchangeRate = 1.0;
        const targetCurr = targetCurrency || baseCurrency;
        if (targetCurr !== baseCurrency) {
            exchangeRate = await this.currenciesService.convert(1, baseCurrency, targetCurr);
        }

        const checkIn = new Date(startDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(endDate);
        checkOut.setHours(0, 0, 0, 0);

        let gstTiers: any[] = [];
        if (isPropertyGstApplicable) {
            gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];
        }

        // If a specific rate plan was requested, load it for its base price
        let targetRatePlan: any = null;
        if (ratePlanId) {
            targetRatePlan = await this.prisma.ratePlan.findUnique({
                where: { id: ratePlanId },
            });
        }

        const results: PublishedDailyRateQuote[] = [];
        const current = new Date(checkIn);

        while (current < checkOut) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const nextDate = new Date(current);
            nextDate.setDate(nextDate.getDate() + 1);

            const originalBasePrice = targetRatePlan?.basePrice ? Number(targetRatePlan.basePrice) : Number(roomType.basePrice);
            let effectiveBasePrice = originalBasePrice;
            const isGstInclusive = isPropertyGstApplicable && Boolean(roomType.isGstInclusive);
            const gstMode: 'INCLUSIVE' | 'EXCLUSIVE' = isGstInclusive ? 'INCLUSIVE' : 'EXCLUSIVE';

            // Reverse-calculate GST if room type is GST inclusive
            if (isGstInclusive) {
                const normalized = await this.calculateReverseGST(effectiveBasePrice, 1, 1, undefined, true);
                effectiveBasePrice = normalized.baseAmount;
            }

            const pricingRule = await this.getApplicablePricingRule(roomTypeId, current, nextDate, ratePlanId);

            let subtotal = effectiveBasePrice;
            let appliedPricingRule: { id: string; name: string; adjustmentType: string; adjustmentValue: number } | undefined = undefined;

            if (pricingRule) {
                if (pricingRule.adjustmentType === 'PERCENTAGE') {
                    subtotal += (subtotal * Number(pricingRule.adjustmentValue)) / 100;
                } else if (pricingRule.adjustmentType === 'SET_FIXED_PRICE') {
                    subtotal = Number(pricingRule.adjustmentValue);
                } else {
                    subtotal += Number(pricingRule.adjustmentValue);
                }
                appliedPricingRule = {
                    id: pricingRule.id,
                    name: pricingRule.name || 'Seasonal Pricing Rule',
                    adjustmentType: pricingRule.adjustmentType,
                    adjustmentValue: Number(pricingRule.adjustmentValue),
                };
            }

            const allDailyOffers = await this.prisma.offer.findMany({ where: { roomTypes: { some: { id: roomTypeId } }, isActive: true } });
            const activeOffer = allDailyOffers.find(offer => DateUtils.isNightInOfferRange(dateStr, offer.startDate, offer.endDate));

            let appliedOffer: {
                id: string;
                name: string;
                description?: string;
                startDate?: Date;
                endDate?: Date;
                discountType: string;
                discountValue: number;
            } | undefined = undefined;

            if (activeOffer) {
                const offer = activeOffer as any;
                let offerDiscountAmount = 0;
                if (offer.discountType === 'PERCENTAGE') {
                    offerDiscountAmount = (subtotal * Number(offer.discountValue)) / 100;
                } else {
                    offerDiscountAmount = Number(offer.discountValue);
                }
                subtotal -= offerDiscountAmount;
                appliedOffer = {
                    id: offer.id,
                    name: offer.title || offer.name || 'Promotional Offer',
                    description: offer.description ?? undefined,
                    startDate: offer.startDate ?? undefined,
                    endDate: offer.endDate ?? undefined,
                    discountType: offer.discountType,
                    discountValue: Number(offer.discountValue),
                };
            }

            subtotal = Math.max(0, subtotal);
            const effectivePriceBeforeTax = Number(subtotal.toFixed(2));

            let taxAmount = 0;
            let taxRate = 0;
            if (isPropertyGstApplicable) {
                const taxAmountRaw = this.calculateTaxForTariff(effectivePriceBeforeTax, gstTiers);
                taxAmount = Number(taxAmountRaw.toFixed(2));
                taxRate = effectivePriceBeforeTax > 0 ? Math.round((taxAmountRaw / effectivePriceBeforeTax) * 100) : 0;
            }

            const publishedPrice = Number((effectivePriceBeforeTax + taxAmount).toFixed(2));
            const convertedPublishedPrice = Number((publishedPrice * exchangeRate).toFixed(2));

            results.push({
                date: dateStr,
                roomTypeId,
                publishedPrice,
                convertedPublishedPrice,
                baseCurrency,
                targetCurrency: targetCurr,
                exchangeRate,
                breakdown: {
                    originalBasePrice,
                    basePrice: Number(effectiveBasePrice.toFixed(2)),
                    effectivePriceBeforeTax,
                    taxAmount,
                    taxRate,
                    isGstInclusive,
                    gstMode,
                    appliedPricingRule,
                    appliedOffer,
                },
            });

            current.setDate(current.getDate() + 1);
        }

        return results;
    }

    async getPublishedDailyRate(
        roomTypeId: string,
        date: Date | string,
        targetCurrency?: string,
        ratePlanId?: string,
    ): Promise<PublishedDailyRateQuote> {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(nextD.getDate() + 1);

        const rates = await this.getPublishedDailyRates(roomTypeId, d, nextD, targetCurrency, ratePlanId);
        if (!rates || rates.length === 0) {
            throw new NotFoundException(`Could not determine published rate for date ${date}`);
        }
        return rates[0];
    }
}
