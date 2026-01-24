import { PrismaService } from '../prisma/prisma.service';
export declare class MarketingService {
    private prisma;
    constructor(prisma: PrismaService);
    getStats(userId: string): Promise<{
        totalProperties: number;
        totalEarnings: number;
        pendingEarnings: number;
    }>;
    getMyProperties(userId: string): Promise<{
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
