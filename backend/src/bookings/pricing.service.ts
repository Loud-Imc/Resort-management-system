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

        // Validate guest counts (Skip for group bookings as they use groupSize and per-head pricing)
        if (!isGroupBooking) {
            if (adultsCount > roomType.maxAdults) {
                throw new BadRequestException(
                    `Maximum ${roomType.maxAdults} adults allowed for this room type`,
                );
            }

            if (childrenCount > roomType.maxChildren) {
                throw new BadRequestException(
                    `Maximum ${roomType.maxChildren} children allowed for this room type`,
                );
            }
        } else if (isGroupBooking && groupSize) {
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
            const extraAdults = Math.max(0, adultsCount - 1); // First adult included in base
            extraAdultAmount = extraAdults * Number(roomType.extraAdultPrice) * numberOfNights;

            // 5. Calculate extra child charges
            const extraChildren = Math.max(0, childrenCount - roomType.freeChildrenCount);
            extraChildAmount = extraChildren * Number(roomType.extraChildPrice) * numberOfNights;
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

        // 8. Calculate tax based on dynamic GST tiers (Applied per room per night)
        const gstTiers = await this.systemSettingsService.getSetting('GST_TIERS') as any[];
        let totalTaxAmount = 0;

        // Iterate through each night to handle seasonal pricing variations
        for (let i = 0; i < numberOfNights; i++) {
            // Estimate price for this specific night (if seasonal pricing applies)
            // For now, we use the average nightly subtotal as we don't store nightly breakdown yet
            // but we ensure we handle room-by-room splits
            const subtotalThisNight = subtotal / numberOfNights;

            if (isGroupBooking && groupSize) {
                const roomCapacity = roomType.groupMaxOccupancy || (roomType.maxAdults + (roomType.maxChildren || 0)) || 1;
                let remainingGuests = groupSize;
                
                while (remainingGuests > 0) {
                    const guestsThisRoom = Math.min(remainingGuests, roomCapacity);
                    const roomTariffThisNight = (subtotalThisNight / groupSize) * guestsThisRoom;
                    
                    totalTaxAmount += this.calculateTaxForTariff(roomTariffThisNight, gstTiers);
                    remainingGuests -= guestsThisRoom;
                }
            } else {
                totalTaxAmount += this.calculateTaxForTariff(subtotalThisNight, gstTiers);
            }
        }

        const taxAmount = totalTaxAmount;
        const taxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 0;

        // 9. Apply referral discount if applicable
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

        // 10. Apply coupon discount (Apply at the end after Tax?) 
        // Usually coupons are applied to subtotal before tax, but let's follow the previous logic: subtotal + tax - discount
        let couponDiscountAmount = 0;
        if (couponCode) {
            couponDiscountAmount = await this.calculateCouponDiscount(
                couponCode,
                subtotal,
                checkInDate,
            );
        }

        // 11. Calculate final total
        const totalAmount = subtotal + taxAmount - couponDiscountAmount;

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
}
