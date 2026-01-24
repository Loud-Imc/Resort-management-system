import { MarketingService } from './marketing.service';
export declare class MarketingController {
    private readonly marketingService;
    constructor(marketingService: MarketingService);
    getStats(req: any): Promise<{
        totalProperties: number;
        totalEarnings: number;
        pendingEarnings: number;
    }>;
    getMyProperties(req: any): Promise<{
        id: string;
        name: string;
        createdAt: Date;
        isActive: boolean;
        images: string[];
        city: string;
        state: string;
        marketingCommission: import("@prisma/client/runtime/library").Decimal;
        commissionStatus: import(".prisma/client").$Enums.CommissionStatus;
        slug: string;
        isVerified: boolean;
    }[]>;
}
