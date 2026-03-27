import { Injectable, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    AdjustmentType,
    RequestStatus,
    SettlementStatus,
    RedemptionStatus,
    BookingStatus,
    BookingPaymentStatus
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { Decimal } from '@prisma/client/runtime/library';
import Razorpay = require('razorpay');

@Injectable()
export class FinancialsService {
    private readonly logger = new Logger(FinancialsService.name);

    private razorpay: Razorpay;

    constructor(
        private prisma: PrismaService,
        private notifications: NotificationsService,
        private audit: AuditService,
        private configService: ConfigService,
    ) {
        this.razorpay = new Razorpay({
            key_id: this.configService.get<string>('RAZORPAY_KEY_ID'),
            key_secret: this.configService.get<string>('RAZORPAY_KEY_SECRET'),
        });
    }

    // ============================================
    // MAKER-CHECKER WALLET/POINTS ADJUSTMENTS
    // ============================================

    async createAdjustmentRequest(
        requester: any,
        dto: { targetId: string; amount: number; type: AdjustmentType; reason: string }
    ) {
        return this.prisma.financialAdjustmentRequest.create({
            data: {
                amount: dto.amount,
                type: dto.type,
                targetId: dto.targetId,
                reason: dto.reason,
                requestedById: requester.id,
                status: RequestStatus.PENDING,
            },
        });
    }

    async approveAdjustmentRequest(approver: any, requestId: string) {
        const request = await this.prisma.financialAdjustmentRequest.findUnique({
            where: { id: requestId },
        });

        if (!request) throw new BadRequestException('Adjustment request not found');
        if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request already processed');
        if (request.requestedById === approver.id) {
            throw new ForbiddenException('Maker cannot be the checker (Cannot approve own request)');
        }

        return this.prisma.$transaction(async (tx) => {
            // Get current state for audit log
            let oldValue = 0;
            const targetCp = await tx.channelPartner.findFirst({ where: { userId: request.targetId } });
            if (targetCp) {
                oldValue = request.type === AdjustmentType.WALLET ? targetCp.walletBalance.toNumber() : targetCp.totalPoints;
            }

            // 1. Update Request
            const updatedRequest = await tx.financialAdjustmentRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.APPROVED,
                    approvedById: approver.id,
                },
            });

            // 2. Apply Adjustment
            if (targetCp) {
                if (request.type === AdjustmentType.WALLET) {
                    await tx.channelPartner.update({
                        where: { id: targetCp.id },
                        data: { walletBalance: { increment: request.amount } },
                    });

                    await tx.cPTransaction.create({
                        data: {
                            channelPartnerId: targetCp.id,
                            amount: request.amount,
                            type: 'COMMISSION',
                            description: `Admin Adjustment: ${request.reason}`,
                            referenceId: request.id,
                        }
                    });
                } else {
                    await tx.channelPartner.update({
                        where: { id: targetCp.id },
                        data: { totalPoints: { increment: Number(request.amount) } },
                    });
                }
            } else {
                this.logger.warn(`Target ${request.targetId} is not a Channel Partner. Adjustment applied to request only.`);
            }

            await this.audit.createLog({
                userId: approver.id,
                action: 'FINANCIAL_ADJUSTMENT_APPROVED',
                entity: 'financialAdjustmentRequest',
                entityId: requestId,
                oldValue: { balance: oldValue },
                newValue: {
                    balance: oldValue + Number(request.amount),
                    amount: request.amount,
                    type: request.type,
                    reason: request.reason
                }
            });

            return updatedRequest;
        });
    }

    // ============================================
    // PROPERTY SETTLEMENT SYSTEM
    // ============================================

    async calculateSettlement(user: any, bookingId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: {
                property: true,
                cpTransactions: { where: { type: 'COMMISSION' } }
            },
        });

        if (!booking) throw new BadRequestException('Booking not found');
        if (booking.status !== BookingStatus.CHECKED_OUT || booking.paymentStatus !== BookingPaymentStatus.FULL) {
            throw new BadRequestException('Booking must be CHECKED_OUT and FULL for settlement calculation');
        }

        const existing = await this.prisma.propertySettlement.findUnique({ where: { bookingId } });
        if (existing) return existing;

        if (!booking.property) throw new BadRequestException('Property details not found for this booking');

        const grossAmount = booking.totalAmount;
        const platformFeeRate = (booking.property as any).platformCommission || 0;
        const platformFee = grossAmount.mul(platformFeeRate).div(100);

        const cpCommission = booking.cpTransactions.reduce(
            (acc, tx) => acc.add(tx.amount),
            new Decimal(0)
        );

        const netPayout = grossAmount.minus(platformFee).minus(cpCommission);

        return this.prisma.propertySettlement.create({
            data: {
                bookingId,
                propertyId: booking.propertyId as string,
                grossAmount,
                platformFee,
                cpCommission,
                netPayout,
                status: SettlementStatus.CALCULATED,
                createdById: user.id,
            },
        });
    }

    async updateSettlementStatus(
        user: any,
        settlementId: string,
        status: SettlementStatus,
        dto?: { referenceId?: string; method?: string }
    ) {
        const settlement = await this.prisma.propertySettlement.findUnique({
            where: { id: settlementId },
            include: { booking: true }
        });

        if (!settlement) throw new BadRequestException('Settlement not found');

        // Maker-Checker Guards
        if (status === SettlementStatus.APPROVED) {
            if (settlement.createdById === user.id) {
                throw new ForbiddenException('Maker-Checker Violation: You cannot approve a settlement you calculated yourself.');
            }

            const refundDeadline = new Decimal(24);
            const checkoutDate = settlement.booking.checkOutDate;
            const now = new Date();
            const hoursSinceCheckout = (now.getTime() - checkoutDate.getTime()) / (1000 * 60 * 60);

            if (hoursSinceCheckout < refundDeadline.toNumber()) {
                throw new BadRequestException('Settlement cannot be approved within the 24h refund window');
            }
        }

        if (status === SettlementStatus.PAID) {
            if (settlement.approvedById === user.id) {
                throw new ForbiddenException('Safety Guard: Payout processor must be different from the Approver.');
            }
        }

        const oldStatus = settlement.status;

        const updated = await this.prisma.propertySettlement.update({
            where: { id: settlementId },
            data: {
                status,
                ...(status === SettlementStatus.APPROVED && { approvedById: user.id }),
                ...(status === SettlementStatus.PAID && { payoutById: user.id, processedAt: new Date() }),
                ...(dto?.referenceId && { referenceId: dto.referenceId }),
                ...(dto?.method && { method: dto.method }),
            },
        });

        await this.audit.createLog({
            userId: user.id,
            action: `SETTLEMENT_${status}`,
            entity: 'propertySettlement',
            entityId: settlementId,
            oldValue: { status: oldStatus },
            newValue: {
                status,
                referenceId: dto?.referenceId,
                method: dto?.method,
                netPayout: settlement.netPayout
            }
        });

        return updated;
    }

    // ============================================
    // CP REDEMPTION LIFECYCLE
    // ============================================

    async createRedemptionRequest(cp: any, amount: number) {
        if (amount <= 0) throw new BadRequestException('Invalid amount');

        const activeRequest = await this.prisma.cPRedemptionRequest.findFirst({
            where: {
                cpId: cp.id,
                status: { in: [RedemptionStatus.REQUESTED, RedemptionStatus.PROCESSING] }
            }
        });

        if (activeRequest) {
            throw new BadRequestException('An active redemption request is already in progress for this partner');
        }

        return this.prisma.cPRedemptionRequest.create({
            data: {
                cpId: cp.id,
                amount: new Decimal(amount),
                status: RedemptionStatus.REQUESTED,
            },
        });
    }

    async updateRedemptionStatus(
        user: any,
        requestId: string,
        status: RedemptionStatus,
        dto?: { referenceId?: string; method?: string }
    ) {
        const request = await this.prisma.cPRedemptionRequest.findUnique({
            where: { id: requestId },
            include: { channelPartner: true }
        });

        if (!request) throw new BadRequestException('Redemption request not found');

        // Maker-Checker Guards
        if (status === RedemptionStatus.APPROVED) {
            // Usually requested by CP, so we just check if Admin didn't request on their behalf
            // if (request.requestedById === user.id) ...
        }

        if (status === RedemptionStatus.PAID) {
            if (request.approverId === user.id) {
                throw new ForbiddenException('Safety Guard: Payout processor must be different from the Approver.');
            }
        }

        const oldStatus = request.status;

        return this.prisma.$transaction(async (tx) => {
            if (status === RedemptionStatus.APPROVED && request.status === RedemptionStatus.REQUESTED) {
                if (request.channelPartner.walletBalance.lessThan(request.amount)) {
                    throw new BadRequestException('Insufficient wallet balance to lock for redemption');
                }

                await tx.channelPartner.update({
                    where: { id: request.cpId },
                    data: { walletBalance: { decrement: request.amount } }
                });
            }

            if (status === RedemptionStatus.FAILED && request.status === RedemptionStatus.PROCESSING) {
                await tx.channelPartner.update({
                    where: { id: request.cpId },
                    data: { walletBalance: { increment: request.amount } }
                });
            }

            const updated = await tx.cPRedemptionRequest.update({
                where: { id: requestId },
                data: {
                    status,
                    ...(status === RedemptionStatus.APPROVED && { approverId: user.id }),
                    ...(status === RedemptionStatus.PAID && { payoutById: user.id }),
                    ...(dto?.referenceId && { referenceId: dto.referenceId }),
                    ...(dto?.method && { method: dto.method }),
                }
            });

            await this.audit.createLog({
                userId: user.id,
                action: `REDEMPTION_${status}`,
                entity: 'cpRedemptionRequest',
                entityId: requestId,
                oldValue: { status: oldStatus },
                newValue: {
                    status,
                    amount: request.amount,
                    referenceId: dto?.referenceId
                }
            });

            return updated;
        });
    }

    // ============================================
    // RECONCILIATION SYSTEM
    // ============================================

    async checkDiscrepancies() {
        // Find payments that are not in a final state and are older than 30 mins
        const payments = await this.prisma.payment.findMany({
            where: {
                status: { in: ['PENDING', 'FAILED'] },
                razorpayOrderId: { not: null },
                createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) }
            },
            include: {
                booking: { include: { user: true } }
            }
        });

        const discrepancies: any[] = [];

        for (const payment of payments) {
            try {
                // Fetch actual status from Razorpay
                // Note: We check by Order ID to see if any successful payment exists for it
                if (!payment.razorpayOrderId) continue;

                const gatewayPayments: any = await this.razorpay.orders.fetchPayments(payment.razorpayOrderId);

                // If any payment for this order is 'captured', but DB says PENDING/FAILED
                const successfulPayment = gatewayPayments.items?.find(p => p.status === 'captured');

                if (successfulPayment) {
                    discrepancies.push({
                        paymentId: payment.id,
                        dbStatus: payment.status,
                        gatewayStatus: 'PAID',
                        razorpayPaymentId: successfulPayment.id,
                        amount: payment.amount,
                        userName: payment.booking?.user?.firstName + ' ' + payment.booking?.user?.lastName
                    });
                }
            } catch (error) {
                this.logger.error(`Error fetching Razorpay status for Order ${payment.razorpayOrderId}: ${error.message}`);
                // In case of error (e.g. rate limit), we skip this payment for now
            }
        }

        return discrepancies;
    }

    async flagDiscrepancy(user: any, paymentId: string, gatewayStatus: string) {
        const payment = await this.prisma.payment.findUnique({ where: { id: paymentId } });
        if (!payment) throw new BadRequestException('Payment not found');

        // Check for existing pending reconciliation
        const existing = await this.prisma.paymentReconciliation.findUnique({
            where: { paymentId }
        });

        if (existing && existing.status === 'APPROVED') {
            throw new BadRequestException('This payment has already been reconciled and resolved.');
        }

        if (existing && existing.status === 'PENDING') {
            throw new BadRequestException('A discrepancy for this payment has already been flagged and is awaiting resolution.');
        }

        return this.prisma.paymentReconciliation.upsert({
            where: { paymentId },
            update: {
                gatewayStatus,
                dbStatus: payment.status,
                reconciledById: user.id,
                status: 'PENDING',
                notes: `Flagged for reconciliation by ${user.firstName} ${user.lastName}`
            },
            create: {
                paymentId,
                gatewayStatus,
                dbStatus: payment.status,
                reconciledById: user.id,
                status: 'PENDING',
                notes: `Flagged for reconciliation by ${user.firstName} ${user.lastName}`
            }
        });
    }

    async resolveDiscrepancy(user: any, paymentId: string, notes: string) {
        const reconciliation = await this.prisma.paymentReconciliation.findUnique({
            where: { paymentId }
        });

        if (!reconciliation) throw new BadRequestException('No pending reconciliation found for this payment. Please flag it first.');
        if (reconciliation.status !== 'PENDING') throw new BadRequestException('Reconciliation already processed.');

        if (reconciliation.reconciledById === user.id) {
            throw new ForbiddenException('Maker-Checker Violation: The same admin who flagged the discrepancy cannot resolve it.');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Update Reconciliation Record
            await tx.paymentReconciliation.update({
                where: { paymentId },
                data: {
                    status: 'APPROVED',
                    resolvedById: user.id,
                    notes: `${reconciliation.notes}\n\nResolved by ${user.firstName} ${user.lastName}: ${notes}`,
                }
            });

            // 2. Update Payment Status to match Gateway
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: { status: 'PAID' }
            });

            await this.audit.createLog({
                userId: user.id,
                action: 'RECONCILIATION_RESOLVED',
                entity: 'paymentReconciliation',
                entityId: reconciliation.id,
                oldValue: { status: 'PENDING' },
                newValue: { status: 'APPROVED', dbStatus: 'PAID' }
            });

            return updatedPayment;
        });
    }

    // ============================================
    // LISTING METHODS
    // ============================================

    async getAllSettlements(params: { status?: SettlementStatus; propertyId?: string } = {}) {
        return this.prisma.propertySettlement.findMany({
            where: {
                ...(params.status && { status: params.status }),
                ...(params.propertyId && { propertyId: params.propertyId }),
            },
            include: {
                property: { select: { id: true, name: true } },
                booking: { select: { id: true, totalAmount: true } },
                createdBy: { select: { id: true, firstName: true } },
                approvedBy: { select: { id: true, firstName: true } },
                payoutBy: { select: { id: true, firstName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllRedemptions(params: { status?: RedemptionStatus; cpId?: string } = {}) {
        return this.prisma.cPRedemptionRequest.findMany({
            where: {
                ...(params.status && { status: params.status }),
                ...(params.cpId && { cpId: params.cpId }),
            },
            include: {
                channelPartner: { select: { id: true, authorizedPersonName: true, organizationName: true } },
                approver: { select: { id: true, firstName: true } },
                payoutBy: { select: { id: true, firstName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async getAllAdjustments(params: { status?: RequestStatus; targetId?: string } = {}) {
        return this.prisma.financialAdjustmentRequest.findMany({
            where: {
                ...(params.status && { status: params.status }),
                ...(params.targetId && { targetId: params.targetId }),
            },
            include: {
                requestedBy: { select: { id: true, firstName: true } },
                approvedBy: { select: { id: true, firstName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
