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
}

import { CurrenciesService } from '../currencies/currencies.service';

@Injectable()
export class PricingService {
    private readonly DEFAULT_TAX_RATE = 0.12; // 12% default

    constructor(
        private prisma: PrismaService,
        private currenciesService: CurrenciesService
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
    ): Promise<PricingBreakdown> {
        // 1. Get room type pricing configuration
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
            include: { property: true },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
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

        // Validate guest counts
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

        // 3. Calculate base price (nights * base price for 1 adult)
        const basePricePerNight = Number(roomType.basePrice);
        const baseAmount = basePricePerNight * numberOfNights;

        // 4. Calculate extra adult charges
        const extraAdults = Math.max(0, adultsCount - 1); // First adult included in base
        const extraAdultAmount = extraAdults * Number(roomType.extraAdultPrice) * numberOfNights;

        // 5. Calculate extra child charges
        const extraChildren = Math.max(0, childrenCount - roomType.freeChildrenCount);
        const extraChildAmount = extraChildren * Number(roomType.extraChildPrice) * numberOfNights;

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

        // 8. Calculate tax based on property settings
        const propertyTaxRate = (roomType.property as any).taxRate !== undefined
            ? Number((roomType.property as any).taxRate) / 100
            : this.DEFAULT_TAX_RATE;

        const taxAmount = subtotal * propertyTaxRate;

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
            taxRate: (roomType.property as any).taxRate !== undefined
                ? Number((roomType.property as any).taxRate)
                : this.DEFAULT_TAX_RATE * 100,
            baseCurrency,
            targetCurrency,
            exchangeRate,
            // Add converted total for convenience
            convertedTotal: totalAmount * exchangeRate,
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
