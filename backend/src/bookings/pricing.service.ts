import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { format } from 'date-fns';
import { DateUtils } from '../common/utils/date.utils';

export interface PricingBreakdown {
    baseAmount: number;
    grossBaseAmount: number;
    extraAdultAmount: number;
    grossExtraAdultAmount: number;
    extraChildAmount: number;
    grossExtraChildAmount: number;
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
    private readonly DEFAULT_TAX_RATE = 0.12; // 12% default
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
    ): Promise<PricingBreakdown> {
        console.log(`[PricingService] calculatePrice inputs - gen: ${generalCode} (${typeof generalCode}), coup: ${couponCode} (${typeof couponCode}), ref: ${referralCode} (${typeof referralCode})`);
        // Resolve generalCode if provided
        if (generalCode && !couponCode && !referralCode) {
            const trimmed = generalCode.trim().toUpperCase();
            // Check if it's a coupon first
            const coupon = await this.prisma.coupon.findUnique({ where: { code: trimmed } });
            console.log(`[PricingService] Coupon lookup for ${trimmed}: ${coupon ? 'FOUND' : 'NOT FOUND'}`);
            if (coupon) {
                couponCode = trimmed;
            } else {
                // If not a coupon, check if it's a referral code
                const cp = await this.prisma.channelPartner.findFirst({
                    where: { referralCode: trimmed, status: 'APPROVED' as any }
                });
                console.log(`[PricingService] CP lookup for ${trimmed}: ${cp ? 'FOUND' : 'NOT FOUND'} (Status: ${cp?.status})`);
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
        console.log("adultcount", adultsCount);
        console.log("childrenCount", childrenCount);
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            include: { property: true },
        }) as any;

        if (!roomType) {
            console.error(`[PricingService] Room type not found: ${roomTypeId}`);
            throw new NotFoundException('Room type not found');
        }

        if (!roomType.property) {
            console.error(`[PricingService] Property relation missing for roomType: ${roomTypeId}`);
            throw new BadRequestException('Property information missing for this room type');
        }

        const baseCurrency = (roomType.property as any).baseCurrency || 'INR';

        // 2. Calculate number of nights
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        const numberOfNights = Math.round(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (numberOfNights < 0) {
            throw new BadRequestException('Check-out date cannot be before check-in date');
        }

        // For standard bookings: guests beyond maxAdults/maxChildren are permitted
        // but incur extra charges (calculated below). Group bookings use groupSize capacity.
        // Removed the strict groupSize > maxGroupCap validation because it incorrectly limits multi-room group bookings 
        // to a single room's capacity. Aggregate capacity is handled by AvailabilityService.

        // 3. Normalize prices if room type is GST inclusive
        let effectiveBasePrice = Number(roomType.basePrice);
        let effectiveExtraAdultPrice = Number(roomType.extraAdultPrice);
        let effectiveExtraChildPrice = Number(roomType.extraChildPrice);

        if (roomType.isGstInclusive) {
            // Reverse-calculate components for base amount (per room per night)
            const normalizedBase = await this.calculateReverseGST(effectiveBasePrice, 1, 1);
            effectiveBasePrice = normalizedBase.baseAmount;

            // Reverse-calculate extra adult price (treated as its own tariff per night)
            if (effectiveExtraAdultPrice > 0) {
                const normalizedAdult = await this.calculateReverseGST(effectiveExtraAdultPrice, 1, 1);
                effectiveExtraAdultPrice = normalizedAdult.baseAmount;
            }

            // Reverse-calculate extra child price
            if (effectiveExtraChildPrice > 0) {
                const normalizedChild = await this.calculateReverseGST(effectiveExtraChildPrice, 1, 1);
                effectiveExtraChildPrice = normalizedChild.baseAmount;
            }
        }

        // 4. Calculate base price
        let baseAmount = 0;
        let extraAdultAmount = 0;
        let extraChildAmount = 0;
        let extraAdults = 0;
        let extraChildren = 0;
        let basePricePerNight = 0;
        let isGroupInclusive = false;
        
        // Pre-calculate room count for accurate GST slab reverse-calculation
        const stdCapacity = (Number(roomType.maxAdults) || 2) + (Number(roomType.maxChildren) || 0);
        const roomCapacity = roomType.groupMaxOccupancy || stdCapacity || 1;
        const calculatedRoomCount = (isGroupBooking && groupSize)
            ? (requestedRoomCount || Math.ceil(groupSize / roomCapacity))
            : (requestedRoomCount || 1);
        let finalRoomCount = Math.max(1, calculatedRoomCount);

        if (isGroupBooking && groupSize) {
            // ... (group booking logic stays same, using property-level prices which we current assume are exclusive)
            // If the user wants property-level group prices to be inclusive too, we'd need another flag.
            // For now focusing on RoomType prices as requested.
            if (!roomType.isAvailableForGroupBooking) {
                console.warn(`[PricingService] Group booking attempted on non-group roomType: ${roomTypeId}`);
                throw new BadRequestException('This room type is not available for group booking pool');
            }
            const propertyGroupPricePerHead = (roomType.property as any).groupPricePerHead;
            const propertyGroupPriceAdult = (roomType.property as any).groupPriceAdult;
            const propertyGroupPriceChild = (roomType.property as any).groupPriceChild;
            
            isGroupInclusive = (roomType.property as any).isGroupGstInclusive;
            if (isGroupInclusive === undefined || isGroupInclusive === null) {
                // Fallback for stale Prisma client or null value
                try {
                    const rawProps = await this.prisma.$queryRaw<any[]>`SELECT "isGroupGstInclusive" FROM properties WHERE id = ${roomType.propertyId}`;
                    isGroupInclusive = rawProps?.[0]?.isGroupGstInclusive ?? false;
                } catch (e) {
                    isGroupInclusive = false;
                }
            }

            // 1. Target room count was already pre-calculated above for slab accuracy

            // 2. Calculate the total inclusive price for the group per night
            let totalInclusivePerNight = 0;
            if (propertyGroupPriceAdult === null || propertyGroupPriceAdult === undefined) {
                if (propertyGroupPricePerHead === null || propertyGroupPricePerHead === undefined) {
                    console.error(`[PricingService] Missing group pricing for property: ${roomType.property.name}`);
                    throw new BadRequestException(`Group pricing is not configured for property: ${roomType.property.name}`);
                }
                totalInclusivePerNight = Number(propertyGroupPricePerHead) * groupSize;
            } else {
                const adultPrice = Number(propertyGroupPriceAdult);
                const childPrice = propertyGroupPriceChild !== null ? Number(propertyGroupPriceChild) : adultPrice;
                const totalSpecifiedGuests = (adultsCount || 0) + (childrenCount || 0);
                
                if (totalSpecifiedGuests > 0) {
                    totalInclusivePerNight = (adultPrice * (adultsCount || 0)) + (childPrice * (childrenCount || 0));
                } else {
                    totalInclusivePerNight = adultPrice * groupSize;
                }
            }

            // 3. Convert inclusive total to base total using accurate roomCount-based slab
            if (isGroupInclusive) {
                const normalized = await this.calculateReverseGST(totalInclusivePerNight, 1, finalRoomCount, groupSize);
                basePricePerNight = Number((normalized.baseAmount / groupSize).toFixed(2));
                baseAmount = normalized.baseAmount * Math.max(1, numberOfNights);
            } else {
                basePricePerNight = Number((totalInclusivePerNight / groupSize).toFixed(2));
                baseAmount = totalInclusivePerNight * Math.max(1, numberOfNights);
            }

            console.log(`[PricingService] Group Booking Pricing Debug:`, {
                propertyName: roomType.property.name,
                isGroupInclusive,
                totalInclusivePerNight,
                baseAmount,
                finalRoomCount
            });
        } else {
            // Standard pricing (nights * base price for X rooms)
            const rooms = requestedRoomCount || 1;
            basePricePerNight = effectiveBasePrice * rooms;
            baseAmount = basePricePerNight * Math.max(1, numberOfNights);

            // 4. Calculate extra adult charges
            // Use explicit extraAdultsCount if provided, else fallback to total guest count minus base capacity
            const effectiveBaseAdults = Number(roomType.baseAdults ?? roomType.maxAdults ?? 2) * rooms;
            extraAdults = extraAdultsCount !== undefined && extraAdultsCount !== null
                ? Math.max(0, Number(extraAdultsCount))
                : Math.max(0, adultsCount - effectiveBaseAdults);
            extraAdultAmount = extraAdults * effectiveExtraAdultPrice * Math.max(1, numberOfNights);

            // 5. Calculate extra child charges
            const effectiveBaseChildren = Number(roomType.baseChildren ?? roomType.maxChildren ?? 1) * rooms;
            extraChildren = extraChildrenCount !== undefined && extraChildrenCount !== null
                ? Math.max(0, Number(extraChildrenCount))
                : Math.max(0, childrenCount - effectiveBaseChildren);
            extraChildAmount = extraChildren * effectiveExtraChildPrice * Math.max(1, numberOfNights);
        }

        // 6. Apply seasonal pricing rules if any
        const pricingRule = await this.getApplicablePricingRule(
            roomTypeId,
            checkInDate,
            checkOutDate,
        );

        let subtotal = baseAmount + extraAdultAmount + extraChildAmount;
        if (pricingRule) {
            if (pricingRule.adjustmentType === 'PERCENTAGE') {
                const adjustment = (subtotal * Number(pricingRule.adjustmentValue)) / 100;
                subtotal += adjustment;
            } else {
                subtotal += Number(pricingRule.adjustmentValue);
            }
        }

        // CAPTURE ORIGINAL SUBTOTAL (Pre-offer/coupon/referral)
        const subtotalBeforeDiscounts = subtotal;
        let originalTaxAmount = 0;
        const gstTiersForOriginal = await this.systemSettingsService.getSetting('GST_TIERS') as any[];
        const originalEffectiveNights = Math.max(1, numberOfNights);

        // GST calculation logic below uses finalRoomCount pre-calculated above

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
        const originalTotal = subtotalBeforeDiscounts + originalTaxAmount;

        // 7. Check for active Room Type Offers (Direct Discounts)
        const allOffers = await this.prisma.offer.findMany({
            where: {
                roomTypes: { some: { id: roomTypeId } },
                isActive: true,
            },
        });

        const activeOffer = allOffers.find(offer =>
            DateUtils.areNightIntervalsOverlapping(checkInDate, checkOutDate, offer.startDate, offer.endDate)
        );

        let offerDiscountAmount = 0;
        if (activeOffer) {
            const offer = activeOffer as any;
            if (offer.discountType === 'PERCENTAGE') {
                offerDiscountAmount = Math.round((subtotal * Number(offer.discountValue)) / 100);
            } else {
                offerDiscountAmount = Math.round(Number(offer.discountValue));
            }
            subtotal -= offerDiscountAmount;
        }

        // 8. Apply referral discount if applicable (BEFORE tax per Indian GST rules)
        let referralDiscountAmount = 0;
        if (referralCode) {
            const cp = await this.prisma.channelPartner.findFirst({
                where: { referralCode, status: 'APPROVED' as any }
            });

            if (!cp) {
                throw new BadRequestException('Invalid referral code or partner not approved');
            }

            const discountRate = Number(cp.referralDiscountRate || 0);
            referralDiscountAmount = (subtotal * discountRate) / 100;
            subtotal -= referralDiscountAmount;
        }

        // 9. Apply coupon discount (BEFORE tax per Indian GST rules - tax on transaction value)
        let couponDiscountAmount = 0;
        if (couponCode) {
            couponDiscountAmount = await this.calculateCouponDiscount(
                couponCode,
                subtotal,
                checkInDate,
            );
            subtotal -= couponDiscountAmount;
            console.log(`[PricingService] Coupon discount applied: ${couponDiscountAmount}, new subtotal: ${subtotal}`);
        }

        // 9a. Global discount cap — applied AFTER all individual discounts, BEFORE tax
        // Cap value is loaded from GlobalSettings (MAX_DISCOUNT_PCT, fallback 30%).
        // Trims coupon first, then referral if still over cap. Offer is never reduced.
        const maxDiscountPctSetting = await this.systemSettingsService.getSetting('MAX_DISCOUNT_PCT');
        const maxDiscountFraction = (typeof maxDiscountPctSetting === 'number' ? maxDiscountPctSetting : (this.FALLBACK_MAX_DISCOUNT_PCT * 100)) / 100;

        const grossPreDiscount = baseAmount + extraAdultAmount + extraChildAmount +
            (pricingRule ? (pricingRule.adjustmentType === 'PERCENTAGE'
                ? (baseAmount + extraAdultAmount + extraChildAmount) * Number(pricingRule.adjustmentValue) / 100
                : Number(pricingRule.adjustmentValue)) : 0);
        const maxAllowedDiscount = grossPreDiscount * maxDiscountFraction;
        let totalDiscount = offerDiscountAmount + referralDiscountAmount + couponDiscountAmount;
        let capApplied = false;

        if (totalDiscount > maxAllowedDiscount) {
            capApplied = true;
            const overageAmount = totalDiscount - maxAllowedDiscount;

            // Trim coupon first
            const couponTrim = Math.min(couponDiscountAmount, overageAmount);
            couponDiscountAmount -= couponTrim;
            subtotal += couponTrim; // restore trimmed amount to subtotal
            let remainingOverage = overageAmount - couponTrim;

            // Trim referral next if still over cap
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
        // GST is calculated on the fully-discounted subtotal (transaction value)
        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];
        let totalTaxAmount = 0;

        // Iterate through each night to handle seasonal pricing variations
        const taxEffectiveNights = Math.max(1, numberOfNights);
        for (let i = 0; i < taxEffectiveNights; i++) {
            // Per-night taxable amount (average across nights)
            const subtotalThisNight = subtotal / taxEffectiveNights;
            if (isGroupBooking && groupSize && groupSize > 0) {
                const headTariffThisNight = subtotalThisNight / groupSize;
                const headTax = this.calculateTaxForTariff(headTariffThisNight, gstTiers);
                totalTaxAmount += headTax * groupSize;
            } else {
                const roomTariffThisNight = subtotalThisNight / finalRoomCount;
                // Apply GST slab separately for each room
                for (let r = 0; r < finalRoomCount; r++) {
                    totalTaxAmount += this.calculateTaxForTariff(roomTariffThisNight, gstTiers);
                }
            }
        }

        const taxAmount = totalTaxAmount;
        const taxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 0;

        // 11. Calculate final total (subtotal already has all discounts applied)
        console.log("subtotal *****", subtotal);
        console.log("taxAmount *****", taxAmount);
        const totalAmount = subtotal + taxAmount;
        console.log("totalAmount *****", totalAmount);
        // 12. Handle Currency Conversion
        let exchangeRate = 1.0;
        if (targetCurrency !== baseCurrency) {
            exchangeRate = await this.currenciesService.convert(1, baseCurrency, targetCurrency);
        }

        // The consolidated roomCount used for pricing/tax logic
        const roomCount = finalRoomCount;

        const cleanFloat = (val: number) => {
            const rounded = Math.round(val);
            if (Math.abs(val - rounded) < 0.05) return rounded;
            return Number(val.toFixed(2));
        };

        const isGstInc = isGroupBooking ? !!isGroupInclusive : !!roomType.isGstInclusive;
        const taxMultiplier = 1 + (taxRate / 100);

        const grossBaseAmount = isGstInc
            ? cleanFloat((Number(roomType.basePrice) || 0) * roomCount * Math.max(1, numberOfNights))
            : cleanFloat(baseAmount);

        const grossExtraAdultAmount = isGstInc
            ? cleanFloat((Number(roomType.extraAdultPrice) || 0) * (extraAdults || 0) * Math.max(1, numberOfNights))
            : cleanFloat(extraAdultAmount);

        const grossExtraChildAmount = isGstInc
            ? cleanFloat((Number(roomType.extraChildPrice) || 0) * (extraChildren || 0) * Math.max(1, numberOfNights))
            : cleanFloat(extraChildAmount);

        const grossOfferDiscountAmount = isGstInc
            ? Math.round(offerDiscountAmount * taxMultiplier)
            : Math.round(offerDiscountAmount);

        const grossCouponDiscountAmount = isGstInc
            ? cleanFloat(couponDiscountAmount * taxMultiplier)
            : cleanFloat(couponDiscountAmount);

        const grossReferralDiscountAmount = isGstInc
            ? cleanFloat(referralDiscountAmount * taxMultiplier)
            : cleanFloat(referralDiscountAmount);

        const finalTotalAmount = isGstInc
            ? Math.max(0, Math.round(grossBaseAmount + grossExtraAdultAmount + grossExtraChildAmount - grossOfferDiscountAmount - grossCouponDiscountAmount - grossReferralDiscountAmount))
            : cleanFloat(totalAmount);

        const finalTaxAmount = isGstInc && taxRate > 0
            ? cleanFloat(finalTotalAmount * (taxRate / (100 + taxRate)))
            : cleanFloat(totalTaxAmount);

        const result = {
            baseAmount: isGstInc ? cleanFloat(finalTotalAmount - finalTaxAmount) : cleanFloat(baseAmount),
            grossBaseAmount,
            extraAdultAmount: cleanFloat(extraAdultAmount),
            grossExtraAdultAmount,
            extraChildAmount: cleanFloat(extraChildAmount),
            grossExtraChildAmount,
            taxAmount: finalTaxAmount,
            offerDiscountAmount: Math.round(offerDiscountAmount),
            grossOfferDiscountAmount,
            couponDiscountAmount: cleanFloat(couponDiscountAmount),
            grossCouponDiscountAmount,
            referralDiscountAmount: cleanFloat(referralDiscountAmount),
            grossReferralDiscountAmount,
            discountAmount: cleanFloat(offerDiscountAmount + couponDiscountAmount + referralDiscountAmount),
            totalAmount: finalTotalAmount,
            originalTotal: cleanFloat(originalTotal),
            numberOfNights,
            pricePerNight: basePricePerNight,
            taxRate: Math.round(taxRate),
            baseCurrency,
            targetCurrency,
            exchangeRate,
            convertedTotal: isGstInc && exchangeRate === 1.0 ? finalTotalAmount : cleanFloat(finalTotalAmount * exchangeRate),
            originalConvertedTotal: cleanFloat(originalTotal * exchangeRate),
            roomCount,
            baseAdults: Number(roomType.baseAdults ?? roomType.maxAdults ?? 2),
            baseChildren: Number(roomType.baseChildren ?? roomType.maxChildren ?? 1),
            maxPhysicalAdults: Number(roomType.maxPhysicalAdults ?? 4),
            maxPhysicalChildren: Number(roomType.maxPhysicalChildren ?? 2),
            // Transparency: inform the consumer whether the cap was enforced
            ...(capApplied && { discountCapApplied: true, discountCapPct: maxDiscountFraction * 100 }),
            appliedCodeType: referralCode ? 'REFERRAL' : (couponCode ? 'COUPON' : 'NONE') as 'REFERRAL' | 'COUPON' | 'NONE',
            referralPartnerId: referralCode ? (await this.prisma.channelPartner.findFirst({ where: { referralCode } }))?.id : undefined,
            partialPaymentPct: Number(await this.systemSettingsService.getSetting('PARTIAL_PAYMENT_PCT') || 33.33),
            isGstInclusive: isGstInc,
            offerName: (offerDiscountAmount > 0 && activeOffer) ? activeOffer.name : undefined,
            offerDescription: (offerDiscountAmount > 0 && activeOffer) ? (activeOffer.description ?? undefined) : undefined,
            offerStartDate: (offerDiscountAmount > 0 && activeOffer) ? (activeOffer.startDate ? activeOffer.startDate.toISOString() : undefined) : undefined,
            offerEndDate: (offerDiscountAmount > 0 && activeOffer) ? (activeOffer.endDate ? activeOffer.endDate.toISOString() : undefined) : undefined,
            offerDiscountType: (offerDiscountAmount > 0 && activeOffer) ? activeOffer.discountType : undefined,
            offerDiscountValue: (offerDiscountAmount > 0 && activeOffer) ? Number(activeOffer.discountValue) : undefined,
        };

        // --- MANAGE OVERRIDES ---
        if (overrideTotal !== undefined && overrideTotal !== null) {
            let finalOverrideBreakdown;
            if (isOverrideInclusive) {
                // Return total is forced to overrideTotal, reverse calculate base/tax
                finalOverrideBreakdown = await this.calculateReverseGST(
                    overrideTotal,
                    numberOfNights,
                    roomCount,
                    isGroupBooking ? groupSize : undefined
                );
            } else {
                // Return base is forced to overrideTotal, add tax on top
                finalOverrideBreakdown = await this.calculateExclusiveGST(
                    overrideTotal,
                    numberOfNights,
                    roomCount,
                    isGroupBooking ? groupSize : undefined
                );
            }

            result.baseAmount = finalOverrideBreakdown.baseAmount;
            result.grossBaseAmount = isOverrideInclusive ? overrideTotal : finalOverrideBreakdown.baseAmount;
            result.taxAmount = finalOverrideBreakdown.taxAmount;
            result.totalAmount = result.baseAmount + result.taxAmount;
            result.convertedTotal = Number((result.totalAmount * exchangeRate).toFixed(2));

            // Zero out other components to keep breakdown clean for overrides
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

        console.log(`[PricingService] Final result: total=${result.totalAmount}, type=${result.appliedCodeType}`);
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
        groupSize?: number
    ): Promise<{ baseAmount: number; taxAmount: number }> {
        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];

        // Target base per unit (head or room) per night
        const divisor = (groupSize && groupSize > 0) ? groupSize : roomCount;
        const basePerUnitPerNight = overrideBase / (numberOfNights * divisor);

        let targetTaxRate = 0.12; // default fallback

        if (gstTiers && Array.isArray(gstTiers)) {
            // Find which tier this base price falls into
            for (const tier of gstTiers) {
                if (basePerUnitPerNight >= tier.min && (tier.max === null || tier.max === undefined || basePerUnitPerNight <= tier.max)) {
                    targetTaxRate = tier.rate / 100;
                    break;
                }
            }
        }

        const exactTaxAmount = overrideBase * targetTaxRate;

        return {
            baseAmount: Number(overrideBase.toFixed(2)),
            taxAmount: Number(exactTaxAmount.toFixed(2))
        };
    }

    /**
     * Get applicable pricing rule for the date range
     */
    private async getApplicablePricingRule(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
    ) {
        const pricingRules = await this.prisma.pricingRule.findMany({
            where: {
                isActive: true,
                OR: [
                    { roomTypeId },
                    { roomTypeId: null }, // Global rules
                ],
                AND: [
                    { startDate: { lte: checkOutDate } },
                    { endDate: { gte: checkInDate } },
                ],
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Return the first matching rule (most recent)
        return pricingRules[0] || null;
    }

    /**
     * Calculate coupon discount
     */
    private async calculateCouponDiscount(
        couponCode: string,
        subtotal: number,
        bookingDate: Date,
    ): Promise<number> {
        const trimmedCode = couponCode.trim().toUpperCase();
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: trimmedCode },
        });

        if (!coupon) {
            throw new BadRequestException('Invalid coupon code');
        }

        if (!coupon.isActive) {
            throw new BadRequestException('Coupon is not active');
        }

        const checkIn = new Date(bookingDate);
        const validFrom = new Date(coupon.validFrom);
        validFrom.setHours(0, 0, 0, 0); // Be lenient: valid from start of day

        const validUntil = new Date(coupon.validUntil);
        validUntil.setHours(23, 59, 59, 999); // Be lenient: valid until end of day

        if (checkIn < validFrom || checkIn > validUntil) {
            throw new BadRequestException('Coupon is not valid for this date');
        }

        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new BadRequestException('Coupon usage limit reached');
        }

        if (coupon.minBookingAmount && subtotal < Number(coupon.minBookingAmount)) {
            throw new BadRequestException(
                `Minimum booking amount of ${coupon.minBookingAmount} required for this coupon`,
            );
        }

        let discount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discount = (subtotal * Number(coupon.discountValue)) / 100;
        } else if (coupon.discountType === 'FIXED_AMOUNT') {
            discount = Number(coupon.discountValue);
        }

        // Discount cannot exceed subtotal
        return Math.min(discount, subtotal);
    }

    /**
     * Calculate tax for a single tariff unit (one room for one night)
     */
    private calculateTaxForTariff(tariff: number, gstTiers: any[]): number {
        let taxRate = 0.12; // Default fallback 12%
        if (gstTiers && Array.isArray(gstTiers)) {
            const applicableTier = gstTiers.find(tier =>
                tariff >= tier.min &&
                (tier.max === null || tier.max === undefined || tariff <= tier.max)
            );
            if (applicableTier) {
                taxRate = applicableTier.rate / 100;
            }
        }
        return tariff * taxRate;
    }

    /**
     * Validate pricing override (for manual bookings)
     */
    validatePriceOverride(
        calculatedTotal: number,
        overrideTotal: number,
    ): boolean {
        // Allow override within reasonable bounds (e.g., not less than 50% of calculated)
        const minAllowed = calculatedTotal * 0.5;
        return overrideTotal >= minAllowed;
    }

    /**
     * Reverse-calculate GST and Base Amount from a given Total amount.
     * Used when an admin overrides the total price of a booking.
     */
    async calculateReverseGST(
        overrideTotal: number,
        numberOfNights: number,
        roomCount: number,
        groupSize?: number
    ): Promise<{ baseAmount: number; taxAmount: number }> {
        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];

        // Target total per unit (head or room) per night
        const divisor = (groupSize && groupSize > 0) ? groupSize : roomCount;
        const totalPerUnitPerNight = overrideTotal / (numberOfNights * divisor);

        let targetTaxRate = 0;
        let validTariff = 0;

        if (gstTiers && Array.isArray(gstTiers)) {
            // Sort tiers descending to test highest rates first (safest for overlaps)
            const sortedTiers = [...gstTiers].sort((a, b) => b.rate - a.rate);

            for (const tier of sortedTiers) {
                const tierRate = tier.rate / 100;

                // Test tariff if this tier's rate was applied:
                // Since Total = Tariff + (Tariff * Rate), Tariff = Total / (1 + Rate)
                const testTariff = totalPerUnitPerNight / (1 + tierRate);

                // Check if this testTariff actually falls into this tier's bracket
                if (testTariff >= tier.min && (tier.max === null || tier.max === undefined || testTariff <= tier.max)) {
                    targetTaxRate = tierRate;
                    validTariff = testTariff;
                    break;
                }
            }
        }

        // If no tier matched (should not happen with default 0-1000, 1000-7500, etc)
        // Fallback to 12% reverse calculation
        if (!validTariff) {
            targetTaxRate = 0.12;
        }

        // Calculate precise tax and base using the selected rate
        // Tax = Total - (Total / (1 + Rate))
        const exactTaxAmount = overrideTotal - (overrideTotal / (1 + targetTaxRate));
        const exactBaseAmount = overrideTotal - exactTaxAmount;

        return {
            baseAmount: Number(exactBaseAmount.toFixed(2)),
            taxAmount: Number(exactTaxAmount.toFixed(2))
        };
    }

    /**
     * Single Source of Truth for Published Room Prices across the entire PMS ecosystem.
     * Evaluates daily published selling rates cleanly without requiring dummy or fake booking parameters.
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

        if (!roomType) {
            throw new NotFoundException(`Room type not found: ${roomTypeId}`);
        }
        if (!roomType.property) {
            throw new BadRequestException('Property information missing for this room type');
        }

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

        // Load GST tiers exactly once
        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];

        const results: PublishedDailyRateQuote[] = [];
        const current = new Date(checkIn);

        while (current < checkOut) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            
            const nextDate = new Date(current);
            nextDate.setDate(nextDate.getDate() + 1);

            const originalBasePrice = Number(roomType.basePrice);
            let effectiveBasePrice = originalBasePrice;
            const isGstInclusive = Boolean(roomType.isGstInclusive);
            const gstMode: 'INCLUSIVE' | 'EXCLUSIVE' = isGstInclusive ? 'INCLUSIVE' : 'EXCLUSIVE';

            // Reverse-calculate GST if room type is GST inclusive
            if (isGstInclusive) {
                const normalized = await this.calculateReverseGST(effectiveBasePrice, 1, 1);
                effectiveBasePrice = normalized.baseAmount;
            }

            // Apply seasonal pricing rules if any
            const pricingRule = await this.getApplicablePricingRule(
                roomTypeId,
                current,
                nextDate,
            );

            let subtotal = effectiveBasePrice;
            let appliedPricingRule: { id: string; name: string; adjustmentType: string; adjustmentValue: number } | undefined = undefined;

            if (pricingRule) {
                if (pricingRule.adjustmentType === 'PERCENTAGE') {
                    const adjustment = (subtotal * Number(pricingRule.adjustmentValue)) / 100;
                    subtotal += adjustment;
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

            // Check for active Room Type Offers (Direct Discounts)
            const allDailyOffers = await this.prisma.offer.findMany({
                where: {
                    roomTypes: { some: { id: roomTypeId } },
                    isActive: true,
                },
            });

            const activeOffer = allDailyOffers.find(offer =>
                DateUtils.isNightInOfferRange(dateStr, offer.startDate, offer.endDate)
            );

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

            // Calculate GST based on dynamic GST tiers for 1 room
            const taxAmountRaw = this.calculateTaxForTariff(effectivePriceBeforeTax, gstTiers);
            const taxAmount = Number(taxAmountRaw.toFixed(2));
            const taxRate = effectivePriceBeforeTax > 0 ? Math.round((taxAmountRaw / effectivePriceBeforeTax) * 100) : 0;

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
