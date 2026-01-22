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
exports.ChannelPartnersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ChannelPartnersService = class ChannelPartnersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'CP-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    async register(userId) {
        const existing = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });
        if (existing) {
            throw new common_1.ConflictException('User is already a Channel Partner');
        }
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
    async findByReferralCode(referralCode) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { referralCode },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        if (!cp || !cp.isActive) {
            throw new common_1.NotFoundException('Invalid or inactive referral code');
        }
        return cp;
    }
    async getMyProfile(userId) {
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
            throw new common_1.NotFoundException('You are not registered as a Channel Partner');
        }
        return cp;
    }
    async getStats(userId) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });
        if (!cp) {
            throw new common_1.NotFoundException('You are not registered as a Channel Partner');
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
    async processReferralCommission(bookingId, channelPartnerId, bookingAmount) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { id: channelPartnerId },
        });
        if (!cp || !cp.isActive)
            return null;
        const commission = bookingAmount * (Number(cp.commissionRate) / 100);
        const points = Math.floor(bookingAmount / 100);
        await this.prisma.channelPartner.update({
            where: { id: channelPartnerId },
            data: {
                totalEarnings: { increment: commission },
                totalPoints: { increment: points },
                availablePoints: { increment: points },
            },
        });
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
        await this.prisma.booking.update({
            where: { id: bookingId },
            data: { cpCommission: commission },
        });
        return { commission, points };
    }
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
    async updateCommissionRate(id, commissionRate) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: { commissionRate },
        });
    }
    async toggleActive(id, isActive) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: { isActive },
        });
    }
};
exports.ChannelPartnersService = ChannelPartnersService;
exports.ChannelPartnersService = ChannelPartnersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ChannelPartnersService);
//# sourceMappingURL=channel-partners.service.js.map