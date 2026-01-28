import { ChannelPartnersService } from './channel-partners.service';
import { UpdateCommissionRateDto } from './dto/channel-partner.dto';
export declare class ChannelPartnersController {
    private readonly cpService;
    constructor(cpService: ChannelPartnersService);
    validateCode(code: string): Promise<{
        user: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: import("@prisma/client/runtime/library").Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        paidOut: import("@prisma/client/runtime/library").Decimal;
    }>;
    register(req: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: import("@prisma/client/runtime/library").Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        paidOut: import("@prisma/client/runtime/library").Decimal;
    }>;
    getMyProfile(req: any): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            phone: string | null;
        };
        referrals: {
            id: string;
            createdAt: Date;
            status: import(".prisma/client").$Enums.BookingStatus;
            bookingNumber: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            cpCommission: import("@prisma/client/runtime/library").Decimal | null;
        }[];
        transactions: {
            id: string;
            description: string | null;
            createdAt: Date;
            type: import(".prisma/client").$Enums.CPTransactionType;
            bookingId: string | null;
            channelPartnerId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            points: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: import("@prisma/client/runtime/library").Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        paidOut: import("@prisma/client/runtime/library").Decimal;
    }>;
    getStats(req: any): Promise<{
        referralCode: string;
        commissionRate: import("@prisma/client/runtime/library").Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        paidOut: import("@prisma/client/runtime/library").Decimal;
        pendingBalance: number;
        totalReferrals: number;
        confirmedReferrals: number;
        thisMonthReferrals: number;
    }>;
    findAll(page?: number, limit?: number): Promise<{
        data: ({
            _count: {
                referrals: number;
            };
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            isActive: boolean;
            userId: string;
            referralCode: string;
            commissionRate: import("@prisma/client/runtime/library").Decimal;
            totalPoints: number;
            availablePoints: number;
            totalEarnings: import("@prisma/client/runtime/library").Decimal;
            paidOut: import("@prisma/client/runtime/library").Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateCommissionRate(id: string, data: UpdateCommissionRateDto): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: import("@prisma/client/runtime/library").Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        paidOut: import("@prisma/client/runtime/library").Decimal;
    }>;
    toggleActive(id: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: import("@prisma/client/runtime/library").Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: import("@prisma/client/runtime/library").Decimal;
        paidOut: import("@prisma/client/runtime/library").Decimal;
    }>;
}
