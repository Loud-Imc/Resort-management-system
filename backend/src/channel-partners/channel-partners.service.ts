import { Injectable, NotFoundException, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, ChannelPartnerStatus, RedemptionStatus } from '@prisma/client';
import { RegisterChannelPartnerDto } from './dto/register-channel-partner.dto';
import { ConfigService } from '@nestjs/config';
import { NotificationsService } from '../notifications/notifications.service';
import * as bcrypt from 'bcrypt';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class ChannelPartnersService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // Generate unique referral code
    private generateReferralCode(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'CP-';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Register as a Channel Partner (Manual/Staff version)
    async register(userId: string) {
        // Check if user is already a CP
        const existing = await this.prisma.channelPartner.findUnique({
            where: { userId },
        });

        if (existing) {
            throw new ConflictException('User is already a Channel Partner');
        }

        // Generate unique referral code
        const referralCode = await this.getUniqueReferralCode();

        return this.prisma.channelPartner.create({
            data: {
                userId,
                referralCode,
                status: ChannelPartnerStatus.APPROVED, // Manual registration by staff is auto-approved
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
            },
        });
    }

    // Public Registration for Channel Partners
    async publicRegister(dto: RegisterChannelPartnerDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Check for existing user by phone
        const existingPhone = await this.prisma.user.findUnique({
            where: { phone: dto.phone },
        });

        if (existingPhone) {
            throw new ConflictException('Phone number already registered');
        }

        const referralCode = await this.getUniqueReferralCode();
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Find ChannelPartner role
        const cpRole = await this.prisma.role.findFirst({
            where: { name: 'ChannelPartner', propertyId: null },
        });

        if (!cpRole) {
            throw new NotFoundException('Channel Partner role not found in system');
        }

        let result: any;
        result = await this.prisma.$transaction(async (tx) => {
            // 1. Create User
            const user = await tx.user.create({
                data: {
                    email: dto.email,
                    password: hashedPassword,
                    firstName: dto.firstName,
                    lastName: dto.lastName,
                    phone: dto.phone,
                    isActive: true, // User is active, but CP status is PENDING
                    roles: {
                        create: {
                            roleId: cpRole.id,
                        },
                    },
                },
            });

            // 2. Create Channel Partner record
            const cp = await tx.channelPartner.create({
                data: {
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
                    commissionRate: 10.0, // Default base commission
                },
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
    async findByReferralCode(referralCode: string) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { referralCode },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });

        if (!cp || cp.status !== ChannelPartnerStatus.APPROVED) {
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
                        }
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
    async processReferralCommission(bookingId: string, channelPartnerId: string, bookingAmount: number, isPending = true) {
        const cp = await this.prisma.channelPartner.findUnique({
            where: { id: channelPartnerId },
        });

        if (!cp || cp.status !== ChannelPartnerStatus.APPROVED) return null;

        // Determine commission rate based on levels if not overridden
        let currentRate = Number(cp.commissionRate);
        if (!cp.isRateOverridden) {
            const level = await this.getCurrentLevel(cp.totalPoints);
            if (level) {
                currentRate = Number(level.commissionRate);
            }
        }

        const commission = bookingAmount * (currentRate / 100);
        const points = Math.floor(bookingAmount / 100); // 1 point per ₹100

        // Update CP earnings and points (Pending vs Finalized)
        await this.prisma.channelPartner.update({
            where: { id: channelPartnerId },
            data: {
                ...(isPending ? {
                    pendingEarnings: { increment: commission },
                    pendingPoints: { increment: points },
                } : {
                    totalEarnings: { increment: commission },
                    totalPoints: { increment: points },
                    availablePoints: { increment: points },
                })
            },
        });

        // Record transaction
        await this.prisma.cPTransaction.create({
            data: {
                type: 'COMMISSION',
                status: isPending ? 'PENDING' : 'FINALIZED',
                amount: commission,
                points,
                description: `Commission for booking ${bookingId} (${isPending ? 'Pending Check-in' : 'Finalized'})`,
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

    // Finalize referral commission (called after customer checks in)
    async finalizeReferralCommission(bookingId: string) {
        const transaction = await this.prisma.cPTransaction.findFirst({
            where: {
                bookingId,
                type: 'COMMISSION',
                status: 'PENDING'
            }
        });

        if (!transaction) return;

        // Move from pending to available
        await this.prisma.$transaction([
            this.prisma.channelPartner.update({
                where: { id: transaction.channelPartnerId },
                data: {
                    pendingEarnings: { decrement: transaction.amount },
                    pendingPoints: { decrement: transaction.points },
                    totalEarnings: { increment: transaction.amount },
                    totalPoints: { increment: transaction.points },
                    availablePoints: { increment: transaction.points },
                }
            }),
            this.prisma.cPTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'FINALIZED',
                    description: `${transaction.description} - Finalized on Check-in`
                }
            })
        ]);
    }

    // Revert referral commission (called after booking cancellation)
    async revertReferralCommission(bookingId: string) {
        const transaction = await this.prisma.cPTransaction.findFirst({
            where: {
                bookingId,
                type: 'COMMISSION'
            }
        });

        if (!transaction) return;

        // Only revert if it's PENDING or FINALIZED
        if (transaction.status === 'PENDING') {
            await this.prisma.$transaction([
                this.prisma.channelPartner.update({
                    where: { id: transaction.channelPartnerId },
                    data: {
                        pendingEarnings: { decrement: transaction.amount },
                        pendingPoints: { decrement: transaction.points },
                    }
                }),
                this.prisma.cPTransaction.update({
                    where: { id: transaction.id },
                    data: { status: 'VOID' }
                })
            ]);
        } else if (transaction.status === 'FINALIZED') {
            await this.prisma.$transaction([
                this.prisma.channelPartner.update({
                    where: { id: transaction.channelPartnerId },
                    data: {
                        totalEarnings: { decrement: transaction.amount },
                        totalPoints: { decrement: transaction.points },
                        availablePoints: { decrement: transaction.points },
                    }
                }),
                this.prisma.cPTransaction.update({
                    where: { id: transaction.id },
                    data: { status: 'VOID' }
                })
            ]);
        }
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

        return {
            ...cp,
            pendingBalance: Number(cp.totalEarnings) - Number(cp.paidOut),
            totalReferrals,
            confirmedReferrals,
            thisMonthReferrals,
            referralBookings,
            referralDiscountRate: cp.referralDiscountRate,
        };
    }

    async adminGetTransactions(id: string) {
        return this.prisma.cPTransaction.findMany({
            where: { channelPartnerId: id },
            orderBy: { createdAt: 'desc' },
        });
    }

    // Get current level based on points
    private async getCurrentLevel(points: number) {
        return this.prisma.partnerLevel.findFirst({
            where: {
                minPoints: { lte: points },
            },
            orderBy: {
                minPoints: 'desc',
            },
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
    async updateCommissionRate(id: string, commissionRate: number, isRateOverridden = true) {
        return this.prisma.channelPartner.update({
            where: { id },
            data: {
                commissionRate,
                isRateOverridden
            },
        });
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
        if (firstName) userUpdateData.firstName = firstName;
        if (lastName) userUpdateData.lastName = lastName;
        if (email) userUpdateData.email = email;
        if (phone) userUpdateData.phone = phone;
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
                    description: description || `Wallet top-up of ₹${amount}`,
                    channelPartnerId,
                    bookingId: referenceId, // Using bookingId field as a general reference for now
                }
            });

            return cp;
        });
    }

    async deductWalletBalance(channelPartnerId: string, amount: number, description: string, referenceId?: string) {
        return this.prisma.$transaction(async (tx) => {
            const cp = await tx.channelPartner.findUnique({ where: { id: channelPartnerId } });
            if (!cp || Number(cp.walletBalance) < amount) {
                throw new BadRequestException('Insufficient wallet balance');
            }

            const updated = await tx.channelPartner.update({
                where: { id: channelPartnerId },
                data: { walletBalance: { decrement: amount } },
            });

            await tx.cPTransaction.create({
                data: {
                    type: 'WALLET_PAYMENT' as any,
                    status: 'FINALIZED',
                    amount: -amount,
                    description: description || `Wallet payment of ₹${amount}`,
                    channelPartnerId,
                    bookingId: referenceId,
                },
            });

            return updated;
        });
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
            receipt: `cp_reg_${cp.id.substring(0, 8)}_${Date.now()}`,
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

        // Auto-approve and mark as paid
        return this.prisma.$transaction(async (tx) => {
            const updatedCp = await tx.channelPartner.update({
                where: { id: channelPartnerId },
                data: {
                    status: ChannelPartnerStatus.APPROVED,
                    registrationFeePaid: true,
                },
            });

            // Record as platform income
            await tx.income.create({
                data: {
                    amount: 1000,
                    source: 'CP_REGISTRATION_FEE' as any,
                    description: `Channel Partner registration fee for CP ID: ${channelPartnerId}`,
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
            receipt: `wallet_topup_${cp.id}_${Date.now()}`,
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

        return this.addWalletBalance(cp.id, amount, `Wallet top-up via Razorpay (${razorpayPaymentId})`, razorpayPaymentId);
    }

    async refundWalletPayment(channelPartnerId: string, amount: number, description: string, bookingId: string) {
        return this.prisma.$transaction(async (tx) => {
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
                    description: description || `Refund for cancelled booking ${bookingId}`,
                    channelPartnerId,
                    bookingId,
                }
            });

            return cp;
        });
    }
}
