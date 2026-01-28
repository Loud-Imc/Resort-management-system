import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class ChannelPartnersService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    private generateReferralCode;
    register(userId: string): Promise<{
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
        commissionRate: Prisma.Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: Prisma.Decimal;
        paidOut: Prisma.Decimal;
    }>;
    findByReferralCode(referralCode: string): Promise<{
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
        commissionRate: Prisma.Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: Prisma.Decimal;
        paidOut: Prisma.Decimal;
    }>;
    getMyProfile(userId: string): Promise<{
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
            totalAmount: Prisma.Decimal;
            cpCommission: Prisma.Decimal | null;
        }[];
        transactions: {
            id: string;
            description: string | null;
            createdAt: Date;
            type: import(".prisma/client").$Enums.CPTransactionType;
            bookingId: string | null;
            channelPartnerId: string;
            amount: Prisma.Decimal;
            points: number;
        }[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: Prisma.Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: Prisma.Decimal;
        paidOut: Prisma.Decimal;
    }>;
    getStats(userId: string): Promise<{
        referralCode: string;
        commissionRate: Prisma.Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: Prisma.Decimal;
        paidOut: Prisma.Decimal;
        pendingBalance: number;
        totalReferrals: number;
        confirmedReferrals: number;
        thisMonthReferrals: number;
    }>;
    processReferralCommission(bookingId: string, channelPartnerId: string, bookingAmount: number): Promise<{
        commission: number;
        points: number;
    } | null>;
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
            commissionRate: Prisma.Decimal;
            totalPoints: number;
            availablePoints: number;
            totalEarnings: Prisma.Decimal;
            paidOut: Prisma.Decimal;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    updateCommissionRate(id: string, commissionRate: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: Prisma.Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: Prisma.Decimal;
        paidOut: Prisma.Decimal;
    }>;
    toggleActive(id: string, isActive: boolean): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        userId: string;
        referralCode: string;
        commissionRate: Prisma.Decimal;
        totalPoints: number;
        availablePoints: number;
        totalEarnings: Prisma.Decimal;
        paidOut: Prisma.Decimal;
    }>;
}
