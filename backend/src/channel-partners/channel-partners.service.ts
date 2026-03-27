import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReferralAbuseService } from '../common/services/referral-abuse.service';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ChannelPartnerStatus, RedemptionStatus, PartnerType } from '@prisma/client';
import { RegisterChannelPartnerDto } from './dto/register-channel-partner.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import * as bcrypt from 'bcrypt';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { normalizePhone } from '../common/utils/phone';

@Injectable()
export class ChannelPartnersService {
    private readonly logger = new Logger(ChannelPartnersService.name);

    private readonly activePointsCache = new Map<string, { points: number, expiresAt: number }>();

    constructor(
        private prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly notificationsService: NotificationsService,
        private readonly referralAbuseService: ReferralAbuseService,
        private readonly systemSettingsService: SystemSettingsService,
    ) { }

    // Generate unique referral code
    private generateReferralCode(): string {
        // High-entropy 10-char alphanumeric code generated via crypto.randomBytes
        // Backward-compatible: existing 6-char CP-XXXXXX codes still validate via findUnique
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const bytes = require('crypto').randomBytes(10);
        let code = 'CP';
        for (let i = 0; i < 10; i++) {
            code += chars[bytes[i] % chars.length];
        }
        return code;
    }

    // Register as a Channel Partner (Authenticated User version)
    async register(userId: string, dto?: any) {
        // Check if user is already a CP
        const existing = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (existing) {
            if (existing.status === ChannelPartnerStatus.APPROVED) {
                throw new ConflictException('You are already registered and approved as a Channel Partner.');
            }
            // If exists but not approved, we can update it if DTO is provided
            if (!dto) return existing;
        }

        // Generate unique referral code if new
        const referralCode = existing?.referralCode || await this.getUniqueReferralCode();

        // Get CP role
        const cpRole = await this.prisma.role.findFirst({
            where: { name: 'ChannelPartner', propertyId: null },
        });

        if (!cpRole) throw new NotFoundException('Channel Partner role not found');

        return this.prisma.$transaction(async (tx) => {
            // Add role if missing
            const userWithRoles = await tx.user.findUnique({
                where: { id: userId },
                include: { roles: { include: { role: true } } }
            });

            if (userWithRoles && !userWithRoles.roles.some(ur => ur.role.name === 'ChannelPartner')) {
                await tx.userRole.create({
                    data: { userId, roleId: cpRole.id }
                });
            }

            return tx.channelPartner.upsert({
                where: { userId },
                create: {
                    userId,
                    referralCode,
                    partnerType: dto?.partnerType || 'INDIVIDUAL',
                    status: ChannelPartnerStatus.PENDING,
                    organizationName: dto?.organizationName,
                    taxId: dto?.taxId,
                    businessAddress: dto?.businessAddress,
                    authorizedPersonName: dto?.authorizedPersonName,
                    aadhaarImage: dto?.aadhaarImage,
                    licenceImage: dto?.licenceImage,
                },
                update: {
                    partnerType: dto?.partnerType,
                    organizationName: dto?.organizationName,
                    taxId: dto?.taxId,
                    businessAddress: dto?.businessAddress,
                    authorizedPersonName: dto?.authorizedPersonName,
                    aadhaarImage: dto?.aadhaarImage,
                    licenceImage: dto?.licenceImage,
                },
                include: {
                    user: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                },
            });
        });
    }

    // Public Registration for Channel Partners
    async publicRegister(dto: RegisterChannelPartnerDto) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.email },
                    { phone: normalizePhone(dto.phone) },
                ],
            },
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });

        // Find ChannelPartner role
        const cpRole = await this.prisma.role.findFirst({
            where: { name: 'ChannelPartner', propertyId: null },
        });

        if (!cpRole) {
            throw new NotFoundException('Channel Partner role not found in system');
        }

        let user: any = existingUser;

        if (existingUser) {
            // 1. Verify password
            const isPasswordValid = await bcrypt.compare(dto.password, existingUser.password);
            if (!isPasswordValid) {
                throw new ConflictException('A user with this email or phone already exists. Please enter the correct password to link your account.');
            }

            // 2. Check if already has the CP record
            const existingCP = await this.prisma.channelPartner.findUnique({
                where: { userId: existingUser.id },
            });

            if (existingCP) {
                if (existingCP.status === ChannelPartnerStatus.APPROVED) {
                    throw new ConflictException('You are already registered and approved as a Channel Partner.');
                }
                // If PENDING or REJECTED, we allow updating the existing record in the transaction below
                user = existingUser;
            }
        }

        const referralCode = await this.getUniqueReferralCode();
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        let result: any;
        try {
            result = await this.prisma.$transaction(async (tx) => {
                // 1. Create or Update User
                if (!user) {
                    user = await tx.user.create({
                        data: {
                            email: dto.email,
                            password: hashedPassword,
                            firstName: dto.firstName,
                            lastName: dto.lastName,
                            phone: normalizePhone(dto.phone),
                            isActive: true, // User is active, but CP status is PENDING
                            roles: {
                                create: {
                                    roleId: cpRole.id,
                                },
                            },
                        },
                    });
                } else {
                    // Check if we need to add the role
                    const hasRole = user.roles.some((ur: any) => ur.role.name === 'ChannelPartner');
                    if (!hasRole) {
                        await tx.userRole.create({
                            data: {
                                userId: user.id,
                                roleId: cpRole.id,
                            },
                        });
                    }
                }

                // 2. Create or Update Channel Partner record
                const cp = await tx.channelPartner.upsert({
                    where: { userId: user.id },
                    create: {
                        userId: user.id,
                        referralCode,
                        partnerType: dto.partnerType,
                        status: ChannelPartnerStatus.PENDING,
                        organizationName: dto.organizationName,
                        taxId: dto.taxId,
                        businessAddress: dto.businessAddress,
                        authorizedPersonName: dto.authorizedPersonName,
                        aadhaarImage: dto.aadhaarImage,
                        licenceImage: dto.licenceImage,
                    },
                    update: {
                        partnerType: dto.partnerType,
                        organizationName: dto.organizationName,
                        taxId: dto.taxId,
                        businessAddress: dto.businessAddress,
                        authorizedPersonName: dto.authorizedPersonName,
                        aadhaarImage: dto.aadhaarImage,
                        licenceImage: dto.licenceImage,
                    }
                });

                return {
                    id: cp.id,
                    referralCode: cp.referralCode,
                    status: cp.status,
                    user: {
                        id: user.id,
                        email: user.email,
                        firstName: user.firstName,
                        lastName: user.lastName,
                    },
                };
            });
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('A user with this email or phone already exists. Please login with your existing credentials.');
            }
            throw error;
        }

        // Notify admins of new registration
        await this.notificationsService.notifyCPRegistration(result);

        return result;
    }

    private async getUniqueReferralCode(): Promise<string> {
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
        return referralCode;
    }

    // Get CP by referral code (for applying during booking)
    async findByReferralCode(referralCode: string, clientIp?: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { referralCode },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        if (!cp || cp.status !== ChannelPartnerStatus.APPROVED) {
            // Record failure for this IP — only invalid attempts are penalized
            if (clientIp) this.referralAbuseService.recordFailure(clientIp);
            throw new NotFoundException('Invalid or inactive referral code');
        }

        // Valid code found — reset failure counter so legitimate users are never blocked
        if (clientIp) this.referralAbuseService.resetFailures(clientIp);

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
                    take: 50,
                    orderBy: { createdAt: 'desc' },
                    select: {
                        id: true,
                        bookingNumber: true,
                        totalAmount: true,
                        cpCommission: true,
                        createdAt: true,
                        status: true,
                        checkInDate: true,
                        checkOutDate: true,
                        property: {
                            select: { name: true }
                        },
                        user: {
                            select: { firstName: true, lastName: true }
                        },
                        paidAmount: true,
                        paymentStatus: true
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

        const activePoints = await this.getActivePoints(cp.id);

        return {
            id: cp.id,
            referralCode: cp.referralCode,
            overrideCommissionRate: cp.overrideCommissionRate,
            totalPoints: cp.totalPoints,
            activePoints,
            availablePoints: cp.availablePoints,
            pendingPoints: cp.pendingPoints,
            totalEarnings: cp.totalEarnings,
            pendingEarnings: cp.pendingEarnings,
            paidOut: cp.paidOut,
            pendingBalance: Number(cp.totalEarnings) - Number(cp.paidOut),
            totalReferrals,
            confirmedReferrals,
            thisMonthReferrals,
            status: cp.status,
            referralDiscountRate: cp.referralDiscountRate,
            walletBalance: cp.walletBalance,
            registrationFeePaid: cp.registrationFeePaid,
        };
    }

    // Process referral commission (initially as PENDING on payment)
    async processReferralCommission(bookingId: string, channelPartnerId: string, bookingAmount: number, tx?: Prisma.TransactionClient, triggerSource?: 'MANUAL_CHECKIN' | 'AUTO_FINALIZATION' | 'DELAYED_PAYMENT') {
        const client = tx || this.prisma;

        // 1. Check for ANY existing COMMISSION transaction (Idempotency + Option A Strict Guard)
        const existingTransaction = await client.cPTransaction.findUnique({
            where: {
                bookingId_type: {
                    bookingId,
                    type: 'COMMISSION'
                }
            }
        });

        if (existingTransaction) {
            this.logger.log(`Commission already exists(status: ${existingTransaction.status}) for booking ${bookingId}.Skipping.`);
            return null;
        }

        const cp = await client.channelPartner.findUnique({
            where: { id: channelPartnerId },
        });

        if (!cp || cp.status !== ChannelPartnerStatus.APPROVED) return null;

        const booking = await client.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking) return null;

        const commission = Number(booking.cpCommission) || 0;
        const pointsPerUnit = await this.systemSettingsService.getSetting('LOYALTY_POINTS_PER_UNIT') || 1;
        const unitAmount = await this.systemSettingsService.getSetting('LOYALTY_UNIT_AMOUNT') || 100;

        // Validation & Safety
        if (unitAmount <= 0) {
            this.logger.error(`Invalid LOYALTY_UNIT_AMOUNT: ${unitAmount}. Falling back to 100.`);
        }
        const safeUnitAmount = unitAmount > 0 ? unitAmount : 100;
        const safePointsPerUnit = pointsPerUnit >= 0 ? pointsPerUnit : 0;

        const points = Math.floor(Number(booking.commissionableAmount) / safeUnitAmount) * safePointsPerUnit;

        this.logger.log(`[Commission][${triggerSource || 'UNKNOWN'}] Points calculated: ${points} (based on unitAmount ${safeUnitAmount}, pointsPerUnit ${safePointsPerUnit}, and commissionableAmount ${booking.commissionableAmount}) for booking ${booking.bookingNumber}`);

        const isPrepaid = booking.paymentMethod === ('WALLET' as any);

        try {
            await client.channelPartner.update({
                where: { id: channelPartnerId },
                data: {
                    ...((!isPrepaid) ? { totalEarnings: { increment: commission } } : {}),
                    totalPoints: { increment: points },
                    availablePoints: { increment: points },
                },
            });

            const transaction = await client.cPTransaction.create({
                data: {
                    type: 'COMMISSION',
                    status: 'FINALIZED',
                    amount: commission || 0,
                    points,
                    description: isPrepaid
                        ? `Commission for booking ${booking.bookingNumber}(Prepaid via upfront discount) [${triggerSource || 'LEGACY'}]`
                        : `Commission for booking ${booking.bookingNumber} [${triggerSource || 'LEGACY'}]`,
                    channelPartnerId,
                    bookingId,
                    isPrepaid,
                },
            });

            // Invalidate active points cache on new commission
            this.activePointsCache.delete(channelPartnerId);

            return transaction;
        } catch (error) {
            if (error.code === 'P2002') {
                this.logger.warn(`Simultaneous commission creation detected for booking ${bookingId}.Conflict handled.`);
                return null;
            }
            throw error;
        }
    }

    // Finalize referral commission (obsolete, replaced by direct check-in trigger)
    async finalizeReferralCommission(bookingId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId }
        });

        if (!booking || !booking.channelPartnerId) return;

        return this.processReferralCommission(bookingId, booking.channelPartnerId, Number(booking.totalAmount));
    }

    // Revert referral commission (called after booking cancellation)
    // Revert ALL commission transactions (called after booking cancellation)
    async revertReferralCommission(bookingId: string) {
        return await this.prisma.$transaction(async (tx) => {
            // Find ALL active (non-VOID) commission records for this booking
            const transactions = await tx.cPTransaction.findMany({
                where: {
                    bookingId,
                    type: 'COMMISSION',
                    status: { not: 'VOID' },
                }
            });

            if (!transactions.length) {
                this.logger.log(`No active commission transactions found for booking ${bookingId}.Nothing to revert.`);
                return;
            }

            for (const transaction of transactions) {
                const isPrepaid = (transaction as any).isPrepaid || false;

                if (transaction.status === 'FINALIZED') {
                    await tx.channelPartner.update({
                        where: { id: transaction.channelPartnerId },
                        data: {
                            // Wallet bookings: commission was given as discount (not credited to balance) → skip earnings decrement
                            // Normal bookings: commission was credited to balance → reverse it
                            ...(!isPrepaid && { totalEarnings: { decrement: transaction.amount } }),
                            // Always reverse points to restore pre-booking tier state
                            totalPoints: { decrement: transaction.points },
                            availablePoints: { decrement: transaction.points },
                        }
                    });
                } else if (transaction.status === 'PENDING') {
                    // Legacy PENDING state
                    await tx.channelPartner.update({
                        where: { id: transaction.channelPartnerId },
                        data: {
                            pendingEarnings: { decrement: transaction.amount },
                            pendingPoints: { decrement: transaction.points },
                        }
                    });
                }

                // Mark VOID to prevent any future double-reversal
                await tx.cPTransaction.update({
                    where: { id: transaction.id },
                    data: { status: 'VOID' }
                });

                this.logger.log(
                    `Reverted COMMISSION tx ${transaction.id} for booking ${bookingId}. ` +
                    `Prepaid: ${isPrepaid}. Earnings reversed: ${!isPrepaid}.` +
                    `Points reversed: ${transaction.points}.`
                );
            }
        });
    }

    // Admin: List all CPs
    async findAll(page = 1, limit = 20, status?: ChannelPartnerStatus) {
        const skip = (page - 1) * limit;

        const where: Prisma.ChannelPartnerWhereInput = {
            ...(status && { status }),
        };

        const [cps, total] = await Promise.all([
            this.prisma.channelPartner.findMany({
                where,
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
            this.prisma.channelPartner.count({ where }),
        ]);

        return {
            data: cps,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
        };
    }

    // Admin: Get a single partner's details with referral bookings
    async adminGetPartnerDetails(id: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { id },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
                },
                _count: {
                    select: { referrals: true },
                },
            },
        });

        if (!cp) throw new NotFoundException('Channel partner not found');

        const [referralBookings, totalReferrals, confirmedReferrals, thisMonthReferrals] = await Promise.all([
            this.prisma.booking.findMany({
                where: { channelPartnerId: id },
                orderBy: { createdAt: 'desc' },
                take: 50,
                select: {
                    id: true,
                    bookingNumber: true,
                    totalAmount: true,
                    cpCommission: true,
                    status: true,
                    checkInDate: true,
                    checkOutDate: true,
                    createdAt: true,
                    user: {
                        select: { firstName: true, lastName: true, email: true },
                    },
                    property: {
                        select: { id: true, name: true },
                    },
                    paidAmount: true,
                    paymentStatus: true
                },
            }),
            this.prisma.booking.count({ where: { channelPartnerId: id } }),
            this.prisma.booking.count({
                where: {
                    channelPartnerId: id,
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                },
            }),
            this.prisma.booking.count({
                where: {
                    channelPartnerId: id,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);

        const activePoints = await this.getActivePoints(cp.id);

        return {
            data: {
                ...cp,
                activePoints,
                pendingBalance: Number(cp.totalEarnings) - Number(cp.paidOut),
                totalReferrals,
                confirmedReferrals,
                thisMonthReferrals,
                referralBookings,
            }
        };
    }

    async adminGetTransactions(id: string) {
        return this.prisma.cPTransaction.findMany({
            where: { channelPartnerId: id },
            orderBy: { createdAt: 'desc' },
        });
    }


    // Admin: Approve/Reject/Deactivate CP
    async updateStatus(id: string, status: ChannelPartnerStatus) {
        const cp = await this.prisma.channelPartner.update({
            where: { id },
            data: { status },
            include: { user: true }
        });

        // Notify CP of status update
        const isApproved = status === ChannelPartnerStatus.APPROVED;
        await this.notificationsService.createNotification({
            userId: cp.userId,
            title: isApproved ? 'Partner Account Approved! 🎉' : 'Account Update',
            message: isApproved
                ? 'Your Channel Partner account has been approved. You can now start referring bookings!'
                : `Your account status has been updated to ${status}.`,
            type: 'CP_STATUS_UPDATE',
            data: { status }
        });

        return cp;
    }

    // Admin: Override commission rate
    async updateCommissionRate(id: string, overrideCommissionRate: number | null) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: { overrideCommissionRate },
        });
    }

    /**
     * Helper: Resolve dynamic commission rate priorities
     * Note: This determines the rate at BOOKING CREATION time.
     */
    async getCommissionRate(context: { channelPartnerId: string, propertyId?: string }): Promise<{ rate: number, source: string }> {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { id: context.channelPartnerId }
        });

        if (!cp) throw new NotFoundException('Channel Partner not found');

        // Priority 1: CP Override
        if (cp.overrideCommissionRate !== null) {
            return { rate: Number(cp.overrideCommissionRate), source: 'CP override' };
        }

        // Priority 2: Active Partner Level (Tier)
        // Resolves tier based on rolling 12-month performance
        const level = await this.getCurrentLevel(cp.id);
        if (level) {
            return { rate: Number(level.commissionRate), source: `Tier (${level.name})` };
        }

        // Priority 3: Property Standard Rate
        if (context.propertyId) {
            const property = await this.prisma.property.findUnique({
                where: { id: context.propertyId }
            });
            if (property) {
                return { rate: Number(property.platformCommission), source: 'Property (Standard)' };
            }
        }

        // Priority 4: Global Default
        const defaultRate = await this.systemSettingsService.getSetting('DEFAULT_COMMISSION_RATE') || 10;
        return { rate: Number(defaultRate), source: 'Global' };
    }

    /**
     * Calculate active points earned in the sliding 12-month window.
     * Uses in-memory cache with 5-min TTL.
     */
    async getActivePoints(channelPartnerId: string): Promise<number> {
        const now = Date.now();
        const cached = this.activePointsCache.get(channelPartnerId);
        if (cached && now < cached.expiresAt) {
            return cached.points;
        }

        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

        const result = await this.prisma.cPTransaction.aggregate({
            where: {
                channelPartnerId,
                type: 'COMMISSION',
                status: 'FINALIZED',
                createdAt: { gte: twelveMonthsAgo }
            },
            _sum: { points: true }
        });

        const activePoints = result._sum.points || 0;

        // Cache for 5 minutes
        this.activePointsCache.set(channelPartnerId, {
            points: activePoints,
            expiresAt: now + (5 * 60 * 1000)
        });

        return activePoints;
    }

    /**
     * Helper: Determine current tier level from sliding 12-month performance.
     * Tier selection strategy: Highest matching level (minPoints <= activePoints).
     */
    async getCurrentLevel(channelPartnerId: string) {
        const activePoints = await this.getActivePoints(channelPartnerId);

        const level = await this.prisma.partnerLevel.findFirst({
            where: { minPoints: { lte: activePoints } },
            orderBy: { minPoints: 'desc' },
        });

        if (level) {
            this.logger.log(`[Tier Resolution] CP ${channelPartnerId} activePoints: ${activePoints} -> Level: ${level.name}`);
        }

        return level;
    }
    // Admin: Update referral discount rate
    async updateReferralDiscountRate(id: string, referralDiscountRate: number) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: { referralDiscountRate },
        });
    }

    // ============================================
    // REWARDS REDEMPTION
    // ============================================

    async redeemReward(userId: string, rewardId: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (!cp) {
            throw new NotFoundException('Channel Partner not found');
        }

        const reward = await this.prisma.reward.findUnique({
            where: { id: rewardId, isActive: true },
        });

        if (!reward) {
            throw new NotFoundException('Reward not found or inactive');
        }

        if (cp.availablePoints < reward.pointCost) {
            throw new ForbiddenException('Insufficient points');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Deduct points
            await tx.channelPartner.update({
                where: { id: cp.id },
                data: {
                    availablePoints: {
                        decrement: reward.pointCost,
                    },
                },
            });

            // 2. Create redemption record
            return tx.cPRewardRedemption.create({
                data: {
                    channelPartnerId: cp.id,
                    rewardId: reward.id,
                    status: RedemptionStatus.PENDING,
                },
                include: {
                    reward: true,
                },
            });
        });
    }

    async getMyRedemptions(userId: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (!cp) {
            throw new NotFoundException('Channel Partner not found');
        }

        return this.prisma.cPRewardRedemption.findMany({
            where: { channelPartnerId: cp.id },
            include: {
                reward: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findAllRedemptions(status?: RedemptionStatus) {
        return this.prisma.cPRewardRedemption.findMany({
            where: status ? { status } : {},
            include: {
                reward: true,
                channelPartner: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async updateRedemptionStatus(id: string, status: RedemptionStatus, notes?: string) {
        return this.prisma.cPRewardRedemption.update({
            where: { id },
            data: { status, notes },
        });
    }

    // Update my profile
    async updateMyProfile(userId: string, dto: any) {
        const {
            firstName, lastName, email, phone, password,
            bankName, accountHolderName, accountNumber, ifscCode, upiId,
            notificationPrefs
        } = dto;

        // 1. Update User Record if personal info provided
        const userUpdateData: any = {};
        const currentUser = await this.prisma.user.findUnique({ where: { id: userId } });

        if (firstName) userUpdateData.firstName = firstName;
        if (lastName) userUpdateData.lastName = lastName;

        if (email && email !== currentUser?.email) {
            const existingEmail = await this.prisma.user.findUnique({ where: { email } });
            if (existingEmail) throw new ConflictException('Email already exists');
            userUpdateData.email = email;
        }

        if (phone && phone !== currentUser?.phone) {
            const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
            if (existingPhone) throw new ConflictException('Phone number already exists');
            userUpdateData.phone = phone;
        }

        if (password) userUpdateData.password = await bcrypt.hash(password, 10);

        if (Object.keys(userUpdateData).length > 0) {
            await this.prisma.user.update({
                where: { id: userId },
                data: userUpdateData,
            });
        }

        // 2. Update Channel Partner Record if payout/notification info provided
        const cpUpdateData: any = {};
        if (bankName !== undefined) cpUpdateData.bankName = bankName;
        if (accountHolderName !== undefined) cpUpdateData.accountHolderName = accountHolderName;
        if (accountNumber !== undefined) cpUpdateData.accountNumber = accountNumber;
        if (ifscCode !== undefined) cpUpdateData.ifscCode = ifscCode;
        if (upiId !== undefined) cpUpdateData.upiId = upiId;
        if (notificationPrefs !== undefined) cpUpdateData.notificationPrefs = notificationPrefs;

        if (Object.keys(cpUpdateData).length > 0) {
            await this.prisma.channelPartner.update({
                where: { userId },
                data: cpUpdateData,
            });
        }

        return this.getMyProfile(userId);
    }

    async getMyTransactions(userId: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (!cp) {
            throw new NotFoundException('Channel Partner not found');
        }

        return this.prisma.cPTransaction.findMany({
            where: { channelPartnerId: cp.id },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Wallet Management
    async addWalletBalance(channelPartnerId: string, amount: number, description: string, referenceId?: string) {
        return this.prisma.$transaction(async (tx) => {
            const cp = await tx.channelPartner.update({
                where: { id: channelPartnerId },
                data: {
                    walletBalance: { increment: amount }
                }
            });

            await tx.cPTransaction.create({
                data: {
                    type: 'WALLET_TOPUP',
                    status: 'FINALIZED',
                    amount,
                    description: description || `Wallet top - up of ₹${amount} `,
                    channelPartnerId,
                    bookingId: referenceId, // Using bookingId field as a general reference for now
                }
            });

            return cp;
        });
    }

    async deductWalletBalance(channelPartnerId: string, amount: number, description: string, referenceId?: string, tx?: Prisma.TransactionClient): Promise<string> {
        if (tx) {
            return (await this.executeWalletDeduction(tx, channelPartnerId, amount, description, referenceId)).id;
        }
        return this.prisma.$transaction(async (newTx) => {
            return (await this.executeWalletDeduction(newTx, channelPartnerId, amount, description, referenceId)).id;
        });
    }

    private async executeWalletDeduction(tx: Prisma.TransactionClient, channelPartnerId: string, amount: number, description: string, referenceId?: string) {
        // Acquire row-level lock to prevent concurrent negative balance races
        await tx.$queryRaw`SELECT id FROM channel_partners WHERE id = ${channelPartnerId} FOR UPDATE`;

        const cp = await tx.channelPartner.findUnique({ where: { id: channelPartnerId } });
        if (!cp || Number(cp.walletBalance) < amount) {
            throw new BadRequestException('Insufficient wallet balance');
        }

        await tx.channelPartner.update({
            where: { id: channelPartnerId },
            data: { walletBalance: { decrement: amount } },
        });

        const transaction = await tx.cPTransaction.create({
            data: {
                type: 'WALLET_PAYMENT' as any,
                status: 'FINALIZED',
                amount: -amount,
                description: description || `Wallet payment of ₹${amount} `,
                channelPartnerId,
                bookingId: referenceId, // Keeping this for backward compatibility if referenceId is a bookingId
                referenceId: referenceId, // Also storing it as referenceId
            },
        });

        return transaction;
    }

    // ============================================
    // RAZORPAY REGISTRATION FEE (₹1000)
    // ============================================

    async initiateRegistrationPayment(channelPartnerId: string) {
        const cp = await this.prisma.channelPartner.findUnique({ where: { id: channelPartnerId } });
        if (!cp) throw new NotFoundException('Channel partner not found');

        const amount = 1000; // Fixed registration fee
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt: `cp_reg_${cp.id.substring(0, 8)}_${Date.now()} `,
            notes: {
                channelPartnerId: cp.id,
                type: 'CP_REGISTRATION_FEE',
            },
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId,
            channelPartnerId: cp.id,
        };
    }

    async verifyRegistrationPayment(
        channelPartnerId: string,
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string,
    ) {
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';

        const body = `${razorpayOrderId}|${razorpayPaymentId}`;
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            throw new BadRequestException('Invalid payment signature');
        }

        // Only mark as paid, DO NOT AUTO-APPROVE. Requires manual admin vetting.
        return this.prisma.$transaction(async (tx) => {
            const updatedCp = await tx.channelPartner.update({
                where: { id: channelPartnerId },
                data: {
                    registrationFeePaid: true,
                },
            });

            // Record as platform income
            await tx.income.create({
                data: {
                    amount: 1000,
                    source: 'CP_REGISTRATION_FEE' as any,
                    description: `Channel Partner registration fee for CP ID: ${channelPartnerId} `,
                },
            });

            return updatedCp;
        });
    }

    // ============================================
    // RAZORPAY WALLET TOP-UP
    // ============================================

    async initiateWalletTopUp(userId: string, amount: number) {
        if (!amount || amount < 100) {
            throw new BadRequestException('Minimum top-up amount is ₹100');
        }

        const cp = await this.prisma.channelPartner.findUnique({ where: { userId } });
        if (!cp) throw new NotFoundException('Channel partner not found');

        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        const razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });

        const order = await razorpay.orders.create({
            amount: Math.round(amount * 100), // paise
            currency: 'INR',
            receipt: `wallet_topup_${cp.id}_${Date.now()} `,
            notes: {
                channelPartnerId: cp.id,
                type: 'CP_WALLET_TOPUP',
            },
        });

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId,
            channelPartnerId: cp.id,
        };
    }

    async verifyAndTopUp(
        userId: string,
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string,
        amount: number,
    ) {
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET') || '';

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            throw new BadRequestException('Invalid payment signature');
        }

        const cp = await this.prisma.channelPartner.findUnique({ where: { userId } });
        if (!cp) throw new NotFoundException('Channel partner not found');

        return this.addWalletBalance(cp.id, amount, `Wallet top - up via Razorpay(${razorpayPaymentId})`, razorpayPaymentId);
    }

    async refundWalletPayment(channelPartnerId: string, amount: number, description: string, referenceId: string) {
        return this.prisma.$transaction(async (tx) => {
            // 1. Idempotency Check (Key: referenceId + type)
            const existingRefund = await tx.cPTransaction.findUnique({
                where: {
                    referenceId_type: {
                        referenceId,
                        type: 'REFUND' as any
                    }
                }
            });

            if (existingRefund) {
                console.log(`[ChannelPartnerService] Refund already processed for reference: ${referenceId} `);
                return tx.channelPartner.findUnique({ where: { id: channelPartnerId } });
            }

            // 2. Validation: Link to original WALLET_PAYMENT
            const originalPayment = await tx.cPTransaction.findFirst({
                where: {
                    referenceId: referenceId,
                    type: 'WALLET_PAYMENT' as any
                }
            });

            if (!originalPayment) {
                throw new BadRequestException(`Invalid reference ID for refund.No wallet payment found for ${referenceId}`);
            }

            // Cross-account validation
            if (originalPayment.channelPartnerId !== channelPartnerId) {
                throw new BadRequestException(`Security alert: Transaction ${referenceId} does not belong to partner ${channelPartnerId} `);
            }

            if (Number(amount) > Number(originalPayment.amount) + 0.01) {
                throw new BadRequestException(`Refund amount(₹${amount}) exceeds original payment(₹${originalPayment.amount})`);
            }

            // 3. Perform Refund
            const cp = await tx.channelPartner.update({
                where: { id: channelPartnerId },
                data: {
                    walletBalance: { increment: amount }
                }
            });

            await tx.cPTransaction.create({
                data: {
                    type: 'REFUND' as any,
                    status: 'FINALIZED',
                    amount,
                    description: description || `Refund for original transaction ${referenceId} `,
                    channelPartnerId,
                    bookingId: originalPayment.bookingId,
                    referenceId,
                }
            });

            return cp;
        });
    }
}
