import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ChannelPartnersService {
    constructor(private readonly prisma: PrismaService) { }

    // Generate unique referral code
    private generateReferralCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'CP-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Register as a Channel Partner
    async register(userId: string) {
        // Check if user is already a CP
        const existing = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (existing) {
            throw new ConflictException('User is already a Channel Partner');
        }

        // Generate unique referral code
        let referralCode = this.generateReferralCode();
        let exists = await this.prisma.channelPartner.findUnique({
            where: { referralCode },
        });

        while (exists) {
            referralCode = this.generateReferralCode();
            exists = await this.prisma.channelPartner.findUnique({
                where: { referralCode },
            });
        }

        return this.prisma.channelPartner.create({
            data: {
                userId,
                referralCode,
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }

    // Get CP by referral code (for applying during booking)
    async findByReferralCode(referralCode: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { referralCode },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        if (!cp || !cp.isActive) {
            throw new NotFoundException('Invalid or inactive referral code');
        }

        return cp;
    }

    // Get current user's CP profile
    async getMyProfile(userId: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { userId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                },
                referrals: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        bookingNumber: true,
                        totalAmount: true,
                        cpCommission: true,
                        createdAt: true,
                        status: true,
                    },
                },
                transactions: {
                    take: 20,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!cp) {
            throw new NotFoundException('You are not registered as a Channel Partner');
        }

        return cp;
    }

    // Get CP dashboard stats
    async getStats(userId: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (!cp) {
            throw new NotFoundException('You are not registered as a Channel Partner');
        }

        const [totalReferrals, confirmedReferrals, thisMonthReferrals] = await Promise.all([
            this.prisma.booking.count({
                where: { channelPartnerId: cp.id },
            }),
            this.prisma.booking.count({
                where: {
                    channelPartnerId: cp.id,
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                },
            }),
            this.prisma.booking.count({
                where: {
                    channelPartnerId: cp.id,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);

        return {
            referralCode: cp.referralCode,
            commissionRate: cp.commissionRate,
            totalPoints: cp.totalPoints,
            availablePoints: cp.availablePoints,
            totalEarnings: cp.totalEarnings,
            paidOut: cp.paidOut,
            pendingBalance: Number(cp.totalEarnings) - Number(cp.paidOut),
            totalReferrals,
            confirmedReferrals,
            thisMonthReferrals,
        };
    }

    // Process referral commission (called after booking is confirmed)
    async processReferralCommission(bookingId: string, channelPartnerId: string, bookingAmount: number) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { id: channelPartnerId },
        });

        if (!cp || !cp.isActive) return null;

        const commission = bookingAmount * (Number(cp.commissionRate) / 100);
        const points = Math.floor(bookingAmount / 100); // 1 point per ₹100

        // Update CP earnings and points
        await this.prisma.channelPartner.update({
            where: { id: channelPartnerId },
            data: {
                totalEarnings: { increment: commission },
                totalPoints: { increment: points },
                availablePoints: { increment: points },
            },
        });

        // Record transaction
        await this.prisma.cPTransaction.create({
            data: {
                type: 'COMMISSION',
                amount: commission,
                points,
                description: `Commission for booking ${bookingId}`,
                channelPartnerId,
                bookingId,
            },
        });

        // Update booking with commission info
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { cpCommission: commission },
        });

        return { commission, points };
    }

    // Admin: List all CPs
    async findAll(page = 1, limit = 20) {
        const skip = (page - 1) * limit;

        const [cps, total] = await Promise.all([
            this.prisma.channelPartner.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    _count: {
                        select: { referrals: true },
                    },
                },
            }),
            this.prisma.channelPartner.count(),
        ]);

        return {
            data: cps,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    // Admin: Update CP commission rate
    async updateCommissionRate(id: string, commissionRate: number) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: { commissionRate },
        });
    }

    // Admin: Toggle CP active status
    async toggleActive(id: string, isActive: boolean) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: { isActive },
        });
    }
}
