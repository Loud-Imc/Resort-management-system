import { PrismaService } from '../prisma/prisma.service';
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
export declare class PricingService {
    private prisma;
    private readonly TAX_RATE;
    constructor(prisma: PrismaService);
    calculatePrice(roomTypeId: string, checkInDate: Date, checkOutDate: Date, adultsCount: number, childrenCount: number, couponCode?: string): Promise<PricingBreakdown>;
    private getApplicablePricingRule;
    private calculateCouponDiscount;
    validatePriceOverride(calculatedTotal: number, overrideTotal: number): boolean;
}
