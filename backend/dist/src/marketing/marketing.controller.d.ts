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
        slug: string;
        city: string;
        state: string;
        isVerified: boolean;
        marketingCommission: import("@prisma/client/runtime/library").Decimal;
        commissionStatus: import(".prisma/client").$Enums.CommissionStatus;
    }[]>;
}
