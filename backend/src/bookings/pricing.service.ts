import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PricingBreakdown {
    baseAmount: number;
    extraAdultAmount: number;
    extraChildAmount: number;
    taxAmount: number;
    offerDiscountAmount: number;
    couponDiscountAmount: number;
    referralDiscountAmount: number;
    discountAmount: number;
    totalAmount: number;
    numberOfNights: number;
    pricePerNight: number;
    taxRate: number;
    // Multi-currency Support
    baseCurrency: string;
    targetCurrency: string;
    exchangeRate: number;
    convertedTotal: number;
    // Group Booking
    roomCount?: number;
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
    ): Promise<PricingBreakdown> {
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
        const checkOut = new Date(checkOutDate);
        const numberOfNights = Math.ceil(
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (numberOfNights <= 0) {
            throw new BadRequestException('Check-out date must be after check-in date');
        }

        // For standard bookings: guests beyond maxAdults/maxChildren are permitted
        // but incur extra charges (calculated below). Group bookings use groupSize capacity.
        if (isGroupBooking && groupSize) {
            // Validate against property capacity if global group booking is enabled, otherwise room capacity
            const maxGroupCap = (roomType.property as any).allowsGroupBooking
                ? (roomType.property as any).maxGroupCapacity || 999
                : (roomType.groupMaxOccupancy || (roomType.maxAdults * 2));

            if (groupSize > maxGroupCap) {
                throw new BadRequestException(
                    `Maximum ${maxGroupCap} guests allowed for group booking in this ${(roomType.property as any).allowsGroupBooking ? 'property' : 'room type'}`,
                );
            }
        }

        // 3. Calculate base price
        let baseAmount = 0;
        let extraAdultAmount = 0;
        let extraChildAmount = 0;
        let basePricePerNight = 0;

        if (isGroupBooking && groupSize) {
            if (!roomType.isAvailableForGroupBooking) {
                console.warn(`[PricingService] Group booking attempted on non-group roomType: ${roomTypeId}`);
                throw new BadRequestException('This room type is not available for group booking pool');
            }
            const propertyGroupPricePerHead = (roomType.property as any).groupPricePerHead;
            const propertyGroupPriceAdult = (roomType.property as any).groupPriceAdult;
            const propertyGroupPriceChild = (roomType.property as any).groupPriceChild;

            if (propertyGroupPriceAdult === null || propertyGroupPriceAdult === undefined) {
                // Backward compatibility: use the old per-head price for both if new ones aren't set
                if (propertyGroupPricePerHead === null || propertyGroupPricePerHead === undefined) {
                    console.error(`[PricingService] Missing group pricing for property: ${roomType.property.name}`);
                    throw new BadRequestException(`Group pricing is not configured for property: ${roomType.property.name}`);
                }
                basePricePerNight = Number(propertyGroupPricePerHead) * groupSize;
            } else {
                const adultPrice = Number(propertyGroupPriceAdult);
                const childPrice = propertyGroupPriceChild !== null ? Number(propertyGroupPriceChild) : adultPrice;

                // Use breakdown if available, otherwise fallback to groupSize * adultPrice
                const totalSpecifiedGuests = (adultsCount || 0) + (childrenCount || 0);
                if (totalSpecifiedGuests > 0) {
                    basePricePerNight = (adultPrice * (adultsCount || 0)) + (childPrice * (childrenCount || 0));
                } else {
                    basePricePerNight = adultPrice * groupSize;
                }
            }
            baseAmount = basePricePerNight * numberOfNights;
        } else {
            // Standard pricing (nights * base price for 1 adult)
            basePricePerNight = Number(roomType.basePrice);
            baseAmount = basePricePerNight * numberOfNights;

            // 4. Calculate extra adult charges
            // Extra adults are only charged when guest count exceeds the room's maxAdults capacity
            const extraAdults = Math.max(0, adultsCount - roomType.maxAdults);
            extraAdultAmount = extraAdults * Number(roomType.extraAdultPrice) * numberOfNights;

            // 5. Calculate extra child charges
            // Extra children are only charged when guest count exceeds the room's maxChildren capacity
            const extraChildren = Math.max(0, childrenCount - roomType.maxChildren);
            extraChildAmount = extraChildren * Number(roomType.extraChildPrice) * numberOfNights;
        }

        // 6. Apply seasonal pricing rules if any
        const pricingRule = await this.getApplicablePricingRule(
            roomTypeId,
            checkInDate,
            checkOutDate,
        );

        let subtotal = baseAmount + extraAdultAmount + extraChildAmount;
        console.log("baseAmount", baseAmount);
        console.log("extraAdultAmount", extraAdultAmount);
        console.log("extraChildAmount", extraChildAmount);
        console.log("subtotal *****123", subtotal);
        if (pricingRule) {
            if (pricingRule.adjustmentType === 'PERCENTAGE') {
                const adjustment = (subtotal * Number(pricingRule.adjustmentValue)) / 100;
                subtotal += adjustment;
            } else {
                subtotal += Number(pricingRule.adjustmentValue);
            }
        }

        // 7. Check for active Room Type Offers (Direct Discounts)
        const activeOffer = await this.prisma.offer.findFirst({
            where: {
                roomTypeId,
                isActive: true,
                startDate: { lte: checkOutDate },
                endDate: { gte: checkInDate },
            },
        });

        let offerDiscountAmount = 0;
        if (activeOffer) {
            offerDiscountAmount = (subtotal * Number(activeOffer.discountPercentage)) / 100;
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
        for (let i = 0; i < numberOfNights; i++) {
            // Per-night taxable amount (average across nights)
            const subtotalThisNight = subtotal / numberOfNights;

            if (isGroupBooking && groupSize) {
                // Split into rooms using room capacity, calculate GST per room
                const roomCapacity = roomType.groupMaxOccupancy || (roomType.maxAdults + (roomType.maxChildren || 0)) || 1;
                const numberOfRooms = Math.ceil(groupSize / roomCapacity);
                const roomTariffThisNight = subtotalThisNight / numberOfRooms;

                // Apply GST slab separately for each room
                for (let r = 0; r < numberOfRooms; r++) {
                    totalTaxAmount += this.calculateTaxForTariff(roomTariffThisNight, gstTiers);
                }
            } else {
                // Standard booking: single room tariff per night
                totalTaxAmount += this.calculateTaxForTariff(subtotalThisNight, gstTiers);
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

        // Calculate estimated room count for group bookings
        let roomCount = 1;
        if (isGroupBooking && groupSize) {
            const roomCapacity = roomType.groupMaxOccupancy || (roomType.maxAdults + (roomType.maxChildren || 0)) || 1;
            roomCount = Math.ceil(groupSize / roomCapacity);
        }

        return {
            baseAmount,
            extraAdultAmount,
            extraChildAmount,
            taxAmount,
            offerDiscountAmount,
            couponDiscountAmount,
            referralDiscountAmount,
            discountAmount: offerDiscountAmount + couponDiscountAmount + referralDiscountAmount,
            totalAmount,
            numberOfNights,
            pricePerNight: basePricePerNight,
            taxRate: Math.round(taxRate * 100),
            baseCurrency,
            targetCurrency,
            exchangeRate,
            convertedTotal: totalAmount * exchangeRate,
            roomCount,
            // Transparency: inform the consumer whether the cap was enforced
            ...(capApplied && { discountCapApplied: true, discountCapPct: maxDiscountFraction * 100 }),
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
        roomCount: number
    ): Promise<{ baseAmount: number; taxAmount: number }> {
        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];

        // Target total per room per night
        const totalPerRoomPerNight = overrideTotal / (numberOfNights * roomCount);

        let targetTaxRate = 0;
        let validTariff = 0;

        if (gstTiers && Array.isArray(gstTiers)) {
            // Sort tiers descending to test highest rates first (safest for overlaps)
            const sortedTiers = [...gstTiers].sort((a, b) => b.rate - a.rate);

            for (const tier of sortedTiers) {
                const tierRate = tier.rate / 100;

                // Test tariff if this tier's rate was applied:
                // Since Total = Tariff + (Tariff * Rate), Tariff = Total / (1 + Rate)
                const testTariff = totalPerRoomPerNight / (1 + tierRate);

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
}
