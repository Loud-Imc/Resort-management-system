"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let PricingService = class PricingService {
    prisma;
    TAX_RATE = 0.18;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async calculatePrice(roomTypeId, checkInDate, checkOutDate, adultsCount, childrenCount, couponCode) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
        });
        if (!roomType) {
            throw new common_1.NotFoundException('Room type not found');
        }
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        const numberOfNights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
        if (numberOfNights <= 0) {
            throw new common_1.BadRequestException('Check-out date must be after check-in date');
        }
        if (adultsCount > roomType.maxAdults) {
            throw new common_1.BadRequestException(`Maximum ${roomType.maxAdults} adults allowed for this room type`);
        }
        if (childrenCount > roomType.maxChildren) {
            throw new common_1.BadRequestException(`Maximum ${roomType.maxChildren} children allowed for this room type`);
        }
        const basePricePerNight = Number(roomType.basePrice);
        const baseAmount = basePricePerNight * numberOfNights;
        const extraAdults = Math.max(0, adultsCount - 1);
        const extraAdultAmount = extraAdults * Number(roomType.extraAdultPrice) * numberOfNights;
        const extraChildren = Math.max(0, childrenCount - roomType.freeChildrenCount);
        const extraChildAmount = extraChildren * Number(roomType.extraChildPrice) * numberOfNights;
        const pricingRule = await this.getApplicablePricingRule(roomTypeId, checkInDate, checkOutDate);
        let subtotal = baseAmount + extraAdultAmount + extraChildAmount;
        if (pricingRule) {
            if (pricingRule.adjustmentType === 'PERCENTAGE') {
                const adjustment = (subtotal * Number(pricingRule.adjustmentValue)) / 100;
                subtotal += adjustment;
            }
            else {
                subtotal += Number(pricingRule.adjustmentValue);
            }
        }
        const taxAmount = subtotal * this.TAX_RATE;
        let discountAmount = 0;
        if (couponCode) {
            discountAmount = await this.calculateCouponDiscount(couponCode, subtotal, checkInDate);
        }
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
    async getApplicablePricingRule(roomTypeId, checkInDate, checkOutDate) {
        const pricingRules = await this.prisma.pricingRule.findMany({
            where: {
                isActive: true,
                OR: [
                    { roomTypeId },
                    { roomTypeId: null },
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
        return pricingRules[0] || null;
    }
    async calculateCouponDiscount(couponCode, subtotal, bookingDate) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { code: couponCode },
        });
        if (!coupon) {
            throw new common_1.BadRequestException('Invalid coupon code');
        }
        if (!coupon.isActive) {
            throw new common_1.BadRequestException('Coupon is not active');
        }
        const now = new Date(bookingDate);
        if (now < coupon.validFrom || now > coupon.validUntil) {
            throw new common_1.BadRequestException('Coupon is not valid for this date');
        }
        if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
            throw new common_1.BadRequestException('Coupon usage limit reached');
        }
        if (coupon.minBookingAmount && subtotal < Number(coupon.minBookingAmount)) {
            throw new common_1.BadRequestException(`Minimum booking amount of ${coupon.minBookingAmount} required for this coupon`);
        }
        let discount = 0;
        if (coupon.discountType === 'PERCENTAGE') {
            discount = (subtotal * Number(coupon.discountValue)) / 100;
        }
        else {
            discount = Number(coupon.discountValue);
        }
        return Math.min(discount, subtotal);
    }
    validatePriceOverride(calculatedTotal, overrideTotal) {
        const minAllowed = calculatedTotal * 0.5;
        return overrideTotal >= minAllowed;
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PricingService);
//# sourceMappingURL=pricing.service.js.map