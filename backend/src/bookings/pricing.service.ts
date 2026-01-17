import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';

export interface PricingBreakdown {
    baseAmount: number;
    extraAdultAmount: number;
    extraChildAmount: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    numberOfNights: number;
    pricePerNight: number;
    taxRate: number;
}

@Injectable()
export class PricingService {
    private readonly TAX_RATE = 0.18; // 18% GST

    constructor(private prisma: PrismaService) { }

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
    ): Promise<PricingBreakdown> {
        // 1. Get room type pricing configuration
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

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

        // 7. Calculate tax (18% GST)
        const taxAmount = subtotal * this.TAX_RATE;

        // 8. Apply coupon discount if valid
        let discountAmount = 0;
        if (couponCode) {
            discountAmount = await this.calculateCouponDiscount(
                couponCode,
                subtotal,
                checkInDate,
            );
        }

        // 9. Calculate final total
        const totalAmount = subtotal + taxAmount - discountAmount;

        return {
            baseAmount,
            extraAdultAmount,
            extraChildAmount,
            taxAmount,
            discountAmount,
            totalAmount,
            numberOfNights,
            pricePerNight: basePricePerNight,
            taxRate: this.TAX_RATE,
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
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: couponCode },
        });

        if (!coupon) {
            throw new BadRequestException('Invalid coupon code');
        }

        if (!coupon.isActive) {
            throw new BadRequestException('Coupon is not active');
        }

        const now = new Date(bookingDate);
        if (now < coupon.validFrom || now > coupon.validUntil) {
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
        } else {
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
