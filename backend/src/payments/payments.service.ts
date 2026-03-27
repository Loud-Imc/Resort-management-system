import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import { NotificationsService } from '../notifications/notifications.service';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';
import { RequestStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class PaymentsService {
    private razorpay: Razorpay;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private mailService: MailService,
        private channelPartnersService: ChannelPartnersService,
        private notificationsService: NotificationsService,
        private audit: AuditService,
    ) {
        const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        console.log(`[PaymentsService] Loading Razorpay Key ID: ${keyId?.substring(0, 8)}...`);

        this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }

    /**
     * Initiate payment - Create Razorpay order
     */
    async initiatePayment(bookingId?: string, eventBookingId?: string) {
        if (!bookingId && !eventBookingId) {
            throw new BadRequestException('Either bookingId or eventBookingId is required');
        }

        if (bookingId) {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    user: true,
                    roomType: { include: { property: true } },
                },
            });

            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            if (booking.status !== 'PENDING_PAYMENT' && booking.status !== 'RESERVED') {
                throw new BadRequestException('Booking is not in a payable status');
            }

            // Expiry Check: If status is PENDING_PAYMENT, it must be within the 30-minute window
            if (booking.status === 'PENDING_PAYMENT') {
                const thirtyMinutesAgo = new Date();
                thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
                if (booking.createdAt < thirtyMinutesAgo) {
                    throw new BadRequestException('This booking session has expired (30-minute limit). Please return to the search page to re-book.');
                }
            }

            // Calculate amount to charge
            const totalAmount = Number(booking.amountInBookingCurrency);
            const paidAmountInBookingCurrency = Number(booking.paidAmount) / Number(booking.exchangeRate || 1);
            let chargeAmount = totalAmount - paidAmountInBookingCurrency;

            const currency = booking.bookingCurrency || 'INR';

            if (booking.status === 'PENDING_PAYMENT' && booking.paymentOption === 'PARTIAL') {
                // If it's a first-time partial payment, charge 1/3rd
                chargeAmount = Math.round(totalAmount / 3);
            }

            if (chargeAmount <= 0) {
                throw new BadRequestException('Booking is already fully paid');
            }

            // Check for existing PENDING payment to prevent duplicate orders
            const existingPayment = await this.prisma.payment.findFirst({
                where: {
                    bookingId: booking.id,
                    status: 'PENDING',
                },
                orderBy: { createdAt: 'desc' },
            });

            if (existingPayment?.razorpayOrderId) {
                return {
                    orderId: existingPayment.razorpayOrderId,
                    amount: this.convertToSmallestUnit(Number(existingPayment.amount), existingPayment.currency || currency),
                    currency: existingPayment.currency || currency,
                    keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
                    booking: {
                        id: booking.id,
                        bookingNumber: booking.bookingNumber,
                        totalAmount: booking.totalAmount,
                        paidAmount: booking.paidAmount,
                    },
                    payment: {
                        id: existingPayment.id,
                    },
                };
            }

            // Create Razorpay order
            const order = await this.razorpay.orders.create({
                amount: this.convertToSmallestUnit(chargeAmount, currency),
                currency: currency,
                receipt: booking.bookingNumber,
                notes: {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    customerEmail: booking.user.email,
                    type: 'RESORT_BOOKING',
                    paymentOption: booking.paymentOption,
                    originalAmount: booking.totalAmount.toString(),
                    bookingCurrency: currency
                },
            });

            // Create payment record
            const payment = await this.prisma.payment.create({
                data: {
                    amount: chargeAmount,
                    currency: currency,
                    status: 'PENDING',
                    razorpayOrderId: order.id,
                    bookingId: booking.id,
                    commissionRate: booking.roomType?.property?.platformCommission || 10,
                },
            });

            return {
                orderId: order.id,
                amount: this.convertToSmallestUnit(chargeAmount, currency),
                currency: currency,
                keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
                booking: {
                    id: booking.id,
                    bookingNumber: booking.bookingNumber,
                    totalAmount: booking.totalAmount,
                    paidAmount: booking.paidAmount,
                },
                payment: {
                    id: payment.id,
                },
            };
        } else {
            // Event Booking logic
            const eventBooking = await this.prisma.eventBooking.findUnique({
                where: { id: eventBookingId },
                include: {
                    user: true,
                    event: { include: { property: true } },
                },
            });

            if (!eventBooking) {
                throw new NotFoundException('Event Booking not found');
            }

            if (eventBooking.status !== 'PENDING') {
                throw new BadRequestException('Event booking is not pending payment');
            }

            // Check for existing PENDING payment to prevent duplicate orders
            const existingPayment = await this.prisma.payment.findFirst({
                where: {
                    eventBookingId: eventBooking.id,
                    status: 'PENDING',
                },
                orderBy: { createdAt: 'desc' },
            });

            if (existingPayment?.razorpayOrderId) {
                return {
                    orderId: existingPayment.razorpayOrderId,
                    amount: this.convertToSmallestUnit(Number(existingPayment.amount), existingPayment.currency || 'INR'),
                    currency: existingPayment.currency || 'INR',
                    keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
                    eventBooking: {
                        id: eventBooking.id,
                        ticketId: eventBooking.ticketId,
                        amountPaid: eventBooking.amountPaid,
                    },
                    payment: {
                        id: existingPayment.id,
                    },
                };
            }

            // Create Razorpay order
            const order = await this.razorpay.orders.create({
                amount: Math.round(Number(eventBooking.amountPaid) * 100), // Convert to paise
                currency: 'INR',
                receipt: eventBooking.ticketId,
                notes: {
                    eventBookingId: eventBooking.id,
                    ticketId: eventBooking.ticketId,
                    customerEmail: eventBooking.user.email,
                    type: 'EVENT_BOOKING'
                },
            });

            // Create payment record
            const payment = await this.prisma.payment.create({
                data: {
                    amount: eventBooking.amountPaid,
                    currency: 'INR',
                    status: 'PENDING',
                    razorpayOrderId: order.id,
                    eventBookingId: eventBooking.id,
                    commissionRate: eventBooking.event?.property?.platformCommission || 10,
                },
            });

            return {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
                eventBooking: {
                    id: eventBooking.id,
                    ticketId: eventBooking.ticketId,
                    amountPaid: eventBooking.amountPaid,
                },
                payment: {
                    id: payment.id,
                },
            };
        }
    }

    /**
     * Initiate QR Payment - Create Razorpay QR Code
     */
    async initiateQrPayment(bookingId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { user: true },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        const currency = booking.bookingCurrency || 'INR';
        const totalAmount = Number(booking.amountInBookingCurrency);
        const paidAmountInBookingCurrency = Number(booking.paidAmount) / Number(booking.exchangeRate || 1);
        let chargeAmount = totalAmount - paidAmountInBookingCurrency;

        if (booking.status === 'PENDING_PAYMENT' && booking.paymentOption === 'PARTIAL') {
            chargeAmount = Math.round(totalAmount / 3);
        }

        if (chargeAmount <= 0) {
            throw new BadRequestException('Booking is already fully paid');
        }

        // Create Razorpay QR Code
        try {
            const qrCode = await (this.razorpay as any).qrCode.create({
                type: 'upi_qr',
                name: `Booking ${booking.bookingNumber}`,
                usage: 'single_payment',
                fixed_amount: true,
                payment_amount: this.convertToSmallestUnit(chargeAmount, currency),
                amount: this.convertToSmallestUnit(chargeAmount, currency),
                description: `Payment for booking ${booking.bookingNumber}`,
                notes: {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    type: 'RESORT_BOOKING_QR'
                },
            });

            return {
                qrCodeId: qrCode.id,
                paymentSource: qrCode.image_url,
                upiUri: qrCode.payment_source,
                amount: chargeAmount,
                currency: currency,
            };
        } catch (error: any) {
            console.error('[PaymentsService] QR Code Creation Failed:', error);
            throw new BadRequestException(error.description || error.message || 'Failed to create payment QR code');
        }
    }

    /**
     * Verify payment signature
     */
    async verifyPayment(
        razorpayOrderId: string,
        razorpayPaymentId: string,
        razorpaySignature: string,
    ) {
        const payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId },
            include: {
                booking: {
                    include: {
                        user: true,
                        roomType: true,
                        property: true,
                    }
                },
                eventBooking: {
                    include: {
                        user: true,
                        event: true,
                    }
                }
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        // Verify signature (pure CPU — outside transaction)
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET') || '')
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED' },
            });
            throw new BadRequestException('Invalid payment signature');
        }

        // All DB mutations inside a transaction with idempotency re-check
        const updatedPayment = await this.prisma.$transaction(async (tx) => {
            // Re-fetch payment status inside the transaction to prevent race with webhook
            const freshPayment = await tx.payment.findUnique({
                where: { id: payment.id },
                select: { status: true },
            });

            if (freshPayment?.status === 'PAID') {
                // Webhook already processed this payment — return existing record
                return null;
            }

            // Update payment record
            const paid = await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'PAID',
                    razorpayPaymentId,
                    razorpaySignature,
                    paymentDate: new Date(),
                    ...this.calculateFinancials(payment),
                },
            });

            if (payment.bookingId && payment.booking) {
                const exchangeRate = Number(payment.booking.exchangeRate || 1);
                const amountInINR = Number(payment.amount) * exchangeRate;
                const newPaidAmount = Number(payment.booking.paidAmount) + amountInINR;
                const isFullyPaid = newPaidAmount >= Number(payment.booking.totalAmount);

                await tx.booking.update({
                    where: { id: payment.bookingId },
                    data: {
                        status: isFullyPaid ? 'CONFIRMED' : 'RESERVED',
                        confirmedAt: payment.booking.confirmedAt || new Date(),
                        paidAmount: newPaidAmount,
                        paymentStatus: isFullyPaid ? 'FULL' : 'PARTIAL',
                    },
                });

                await tx.income.create({
                    data: {
                        amount: Number(payment.amount) * Number(payment.booking.exchangeRate || 1),
                        source: 'ONLINE_BOOKING',
                        description: `Online booking ${payment.booking.bookingNumber} (${payment.amount} ${payment.currency} @ ${payment.booking.exchangeRate})`,
                        bookingId: payment.bookingId,
                        paymentId: payment.id,
                    },
                });
            } else if (payment.eventBookingId && payment.eventBooking) {
                await tx.eventBooking.update({
                    where: { id: payment.eventBookingId },
                    data: { status: 'PAID' },
                });

                await tx.income.create({
                    data: {
                        amount: payment.amount,
                        source: 'EVENT_BOOKING',
                        description: `Event booking ${payment.eventBooking.ticketId}`,
                        eventBookingId: payment.eventBookingId,
                    },
                });
            }

            return paid;
        });

        // If the webhook already processed it, still return success to the client
        if (!updatedPayment) {
            return {
                success: true,
                payment: { id: payment.id, status: 'PAID' },
                message: 'Payment already verified',
            };
        }

        // Post-transaction side effects (notifications, CP commission)
        if (payment.bookingId && payment.booking) {
            const refreshedBooking = await this.prisma.booking.findUnique({
                where: { id: payment.bookingId },
                include: {
                    user: true,
                    roomType: true,
                    property: { include: { owner: true } },
                    channelPartner: { include: { user: true } }
                }
            });

            if (refreshedBooking) {
                await this.notificationsService.broadcastNewBooking(refreshedBooking);

                // Delayed Commission Trigger
                // If already checked in and now fully paid, trigger payout
                if (refreshedBooking.channelPartnerId &&
                    refreshedBooking.status === 'CHECKED_IN' &&
                    refreshedBooking.paymentStatus === 'FULL') {
                    await this.channelPartnersService.processReferralCommission(
                        refreshedBooking.id,
                        refreshedBooking.channelPartnerId,
                        Number(refreshedBooking.totalAmount),
                        undefined,
                        'DELAYED_PAYMENT'
                    );
                }
            }
        }

        return {
            success: true,
            payment: updatedPayment,
            message: 'Payment verified successfully',
        };
    }

    /**
     * Handle Razorpay webhook
     */
    async handleWebhook(body: any, signature: string) {
        // Verify webhook signature — MANDATORY
        const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');

        if (!webhookSecret) {
            console.error('[PaymentsService] RAZORPAY_WEBHOOK_SECRET is not configured. Rejecting webhook.');
            throw new BadRequestException('Webhook signature verification is not configured');
        }

        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(JSON.stringify(body))
            .digest('hex');

        if (expectedSignature !== signature) {
            throw new BadRequestException('Invalid webhook signature');
        }

        const event = body.event;
        const payloadData = body.payload.payment.entity;

        switch (event) {
            case 'payment.captured':
                await this.handlePaymentCaptured(payloadData);
                break;
            case 'payment.failed':
                await this.handlePaymentFailed(payloadData);
                break;
            default:
                console.log(`Unhandled webhook event: ${event}`);
        }

        return { success: true };
    }

    /**
     * Handle payment captured event
     */
    private async handlePaymentCaptured(paymentData: any) {
        let payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId: paymentData.order_id || 'NONE' },
            include: {
                booking: {
                    include: {
                        user: true,
                        roomType: true,
                        property: true,
                    }
                },
                eventBooking: {
                    include: {
                        user: true,
                        event: true,
                    }
                }
            },
        });

        // For QR Payments, the order_id might be missing or different
        // We can find the booking via notes
        if (!payment && paymentData.notes?.bookingId) {
            const bookingId = paymentData.notes.bookingId;
            const bookingInfo = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { property: true }
            });

            payment = await this.prisma.payment.create({
                data: {
                    amount: Number(paymentData.amount) / 100,
                    currency: paymentData.currency,
                    status: 'PENDING',
                    razorpayPaymentId: paymentData.id,
                    razorpayOrderId: paymentData.order_id,
                    bookingId: bookingId,
                    paymentMethod: paymentData.method,
                    commissionRate: bookingInfo?.property?.platformCommission || 10,
                },
                include: {
                    booking: {
                        include: {
                            user: true,
                            roomType: true,
                            property: true,
                        }
                    },
                    eventBooking: true
                }
            }) as any;
        }

        if (!payment) {
            console.error('Payment not found for order:', paymentData.order_id);
            return;
        }

        if (payment.status === 'PAID') {
            return; // Already processed
        }

        // Wrap all mutations in a transaction to prevent race conditions with verifyPayment
        await this.prisma.$transaction(async (tx) => {
            // Re-fetch payment inside transaction to ensure idempotency
            const freshPayment = await tx.payment.findUnique({
                where: { id: payment.id },
                select: { status: true }
            });

            if (freshPayment?.status === 'PAID') {
                return; // Webhook or verify API already processed this
            }

            // Update payment
            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: 'PAID',
                    razorpayPaymentId: paymentData.id,
                    paymentMethod: paymentData.method,
                    paymentDate: new Date(paymentData.created_at * 1000),
                    ...this.calculateFinancials(payment),
                },
            });

            // Confirm booking or event booking
            if (payment.bookingId && payment.booking) {
                const newPaidAmount = Number(payment.booking.paidAmount) + Number(payment.amount);
                const isFullyPaid = newPaidAmount >= Number(payment.booking.totalAmount);

                await tx.booking.update({
                    where: { id: payment.bookingId },
                    data: {
                        status: isFullyPaid ? 'CONFIRMED' : 'RESERVED',
                        confirmedAt: payment.booking.confirmedAt || new Date(),
                        paidAmount: newPaidAmount,
                        paymentStatus: isFullyPaid ? 'FULL' : 'PARTIAL',
                    },
                });

                // Create income record
                await tx.income.create({
                    data: {
                        amount: payment.amount,
                        source: 'ONLINE_BOOKING',
                        description: `Online booking ${payment.booking?.bookingNumber}`,
                        bookingId: payment.bookingId,
                        paymentId: payment.id,
                    },
                });
            } else if (payment.eventBookingId) {
                await tx.eventBooking.update({
                    where: { id: payment.eventBookingId },
                    data: {
                        status: 'PAID',
                    },
                });

                // Create income record for event
                await tx.income.create({
                    data: {
                        amount: payment.amount,
                        source: 'EVENT_BOOKING',
                        description: `Event booking ${payment.eventBooking?.ticketId}`,
                        eventBookingId: payment.eventBookingId,
                    },
                });
            }
        });

        // Notifications and CP Rewards can happen securely outside the transaction
        if (payment.bookingId && payment.booking) {
            // Fetch refreshed booking
            const refreshedBooking = await this.prisma.booking.findUnique({
                where: { id: payment.bookingId },
                include: {
                    user: true,
                    roomType: true,
                    property: { include: { owner: true } },
                    channelPartner: { include: { user: true } }
                }
            });

            if (refreshedBooking) {
                await this.notificationsService.broadcastNewBooking(refreshedBooking);
            }
        }
    }

    /**
     * Handle payment failed event
     */
    private async handlePaymentFailed(paymentData: any) {
        const payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId: paymentData.order_id },
        });

        if (!payment) {
            return;
        }

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'FAILED',
                razorpayPaymentId: paymentData.id,
            },
        });
    }

    /**
     * Request a refund (Maker)
     */
    async requestRefund(user: any, paymentId: string, amount?: number, reason?: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: { booking: true }
        });

        if (!payment) throw new NotFoundException('Payment not found');
        if (payment.status !== 'PAID' && payment.status !== 'PARTIALLY_REFUNDED') {
            throw new BadRequestException('Payment is not in a refundable status');
        }

        const refundAmount = amount || Number(payment.amount);
        const currentRefundAmount = Number(payment.refundAmount || 0);

        if (currentRefundAmount + refundAmount > Number(payment.amount)) {
            throw new BadRequestException(`Cannot refund ${refundAmount}. Maximum refundable amount is ${Number(payment.amount) - currentRefundAmount}`);
        }

        // Check for existing pending request
        const existing = await this.prisma.refundRequest.findFirst({
            where: { paymentId, status: RequestStatus.PENDING }
        });
        if (existing) throw new BadRequestException('A pending refund request already exists for this payment');

        return this.prisma.refundRequest.create({
            data: {
                paymentId,
                amount: refundAmount,
                reason,
                requestedById: user.id,
                status: RequestStatus.PENDING,
            }
        });
    }

    /**
     * Approve and Process refund (Checker)
     */
    async approveRefund(user: any, requestId: string) {
        const request = await this.prisma.refundRequest.findUnique({
            where: { id: requestId },
            include: {
                payment: {
                    include: {
                        booking: true,
                        eventBooking: true
                    }
                }
            }
        });

        if (!request) throw new NotFoundException('Refund request not found');
        if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request already processed');
        if (request.requestedById === user.id) {
            throw new ForbiddenException('Maker-Checker Violation: You cannot approve a refund you requested yourself.');
        }

        const { payment, amount: refundAmount, reason } = request;
        const bookingIdentifier = payment.booking?.bookingNumber || payment.eventBooking?.ticketId || 'Unknown';

        // ============================================
        // FINANCIAL SAFETY GUARDS (PHASE 1)
        // ============================================
        if (payment.bookingId) {
            const settlement = await this.prisma.propertySettlement.findUnique({
                where: { bookingId: payment.bookingId }
            });

            if (settlement && (settlement.status === 'PAID' || settlement.status === 'PROCESSING' || settlement.status === 'APPROVED')) {
                throw new BadRequestException(
                    `Cannot refund. Property Settlement is already ${settlement.status}. ` +
                    'Admin must initiate a recovery/reversal flow from the property owner first.'
                );
            }
        }

        // Execute Razorpay Refund
        const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId as string, {
            amount: Math.round(Number(refundAmount) * 100),
            notes: {
                reason: reason || 'Booking cancellation',
                bookingIdentifier: bookingIdentifier,
                requestId: request.id
            },
        });

        const currentRefundTotal = Number(payment.refundAmount || 0) + Number(refundAmount);
        const isFullRefund = currentRefundTotal >= Number(payment.amount);

        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Update Request
            await tx.refundRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.APPROVED,
                    approvedById: user.id,
                    razorpayRefundId: refund.id
                }
            });

            // 2. Update Payment
            const commissionRate = Number(payment.commissionRate ?? 10);
            const refundPlatformFee = (Number(refundAmount) * commissionRate) / 100;
            const refundNetAmount = Number(refundAmount) - refundPlatformFee;

            await tx.payment.update({
                where: { id: payment.id },
                data: {
                    status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                    refundAmount: { increment: refundAmount },
                    refundDate: new Date(),
                    refundReason: reason,
                    platformFee: { decrement: refundPlatformFee },
                    netAmount: { decrement: refundNetAmount },
                },
            });

            // 3. Update Booking
            if (payment.bookingId) {
                await tx.booking.update({
                    where: { id: payment.bookingId },
                    data: {
                        ...(isFullRefund && { status: 'REFUNDED', paymentStatus: 'UNPAID' }),
                        paidAmount: { decrement: refundAmount },
                    },
                });

                await tx.income.create({
                    data: {
                        amount: -Number(refundAmount),
                        source: 'REFUND' as any,
                        description: `Approved Refund for booking ${payment.booking?.bookingNumber}. Reason: ${reason || 'N/A'}`,
                        bookingId: payment.bookingId,
                        paymentId: payment.id,
                        propertyId: payment.booking?.propertyId,
                    }
                });
            }

            return true;
        });

        await this.audit.createLog({
            userId: user.id,
            action: 'REFUND_APPROVED',
            entity: 'refundRequest',
            entityId: requestId,
            oldValue: { status: 'PENDING' },
            newValue: { status: 'APPROVED', amount: refundAmount, razorpayRefundId: refund.id }
        });

        // Send refund receipt notifications (after transaction commits)
        if (payment.bookingId) {
            try {
                const bookingWithDetails = await this.prisma.booking.findUnique({
                    where: { id: payment.bookingId },
                    include: { user: true, property: true, roomType: true },
                });
                if (bookingWithDetails) {
                    // Email receipt
                    try {
                        await this.mailService.sendRefundReceipt(bookingWithDetails, Number(refundAmount));
                    } catch (err) {
                        console.error('[approveRefund] Refund receipt email failed:', err);
                    }
                    // Inbox + Push notification
                    try {
                        await this.notificationsService.createNotification({
                            userId: bookingWithDetails.userId,
                            title: 'Refund Initiated ✅',
                            message: `A refund of ₹${Number(refundAmount).toLocaleString('en-IN')} for booking ${bookingWithDetails.bookingNumber} has been processed. Please allow 5–7 business days.`,
                            type: 'REFUND_PROCESSED',
                            data: { bookingId: bookingWithDetails.id, refundAmount: Number(refundAmount) },
                        });
                    } catch (err) {
                        console.error('[approveRefund] Inbox notification failed:', err);
                    }
                }
            } catch (err) {
                console.error('[approveRefund] Failed to send refund notifications:', err);
            }
        }

        return { success: true, refundId: refund.id };
    }

    /**
     * Confirm payout to property owner
     */
    async confirmPayout(id: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id },
            include: {
                booking: {
                    include: { property: true }
                },
                eventBooking: {
                    include: { event: { include: { property: true } } }
                }
            }
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'PAID') {
            throw new BadRequestException('Can only confirm payouts for paid transactions');
        }

        const financials = this.calculateFinancials(payment);

        const updatedPayment = await this.prisma.payment.update({
            where: { id },
            data: {
                payoutStatus: 'PAID',
                ...financials
            },
            include: {
                booking: { include: { property: true } },
                eventBooking: { include: { event: { include: { property: true } } } }
            }
        });

        // Notify property owner of payout
        await this.notificationsService.notifyPayoutConfirmed(updatedPayment);

        return updatedPayment;
    }

    private calculateFinancials(payment: any) {
        try {
            let amount = 0;
            let commissionRate = 10; // Default 10%

            if (payment.commissionRate !== null && payment.commissionRate !== undefined) {
                commissionRate = Number(payment.commissionRate);
                amount = Number(payment.amount);
            } else if (payment.bookingId && payment.booking?.property) {
                amount = Number(payment.amount);
                commissionRate = Number(payment.booking.property.platformCommission ?? 10);
            } else if (payment.eventBookingId && payment.eventBooking?.event?.property) {
                amount = Number(payment.amount);
                commissionRate = Number(payment.eventBooking.event.property.platformCommission ?? 10);
            } else {
                // If we can't find property/commission, return defaults or empty
                // For now, let's still calculate with 10% if amount exists
                if (payment.amount) {
                    amount = Number(payment.amount);
                    return {
                        platformFee: (amount * 10) / 100,
                        netAmount: (amount * 90) / 100,
                    };
                }
                return {};
            }

            const platformFee = (amount * commissionRate) / 100;
            const netAmount = amount - platformFee;

            return {
                platformFee,
                netAmount,
            };
        } catch (error) {
            console.error('[PaymentsService] Error calculating financials:', error);
            return {};
        }
    }

    async findAll(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (propertyId) {
            propertyFilter.id = propertyId;
        } else if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        const finalFilter = (propertyId || !isGlobalAdmin) ? {
            OR: [
                { booking: { property: propertyFilter } },
                { eventBooking: { event: { property: propertyFilter } } }
            ]
        } : {};

        return this.prisma.payment.findMany({
            where: finalFilter,
            include: {
                booking: {
                    include: {
                        user: true,
                        roomType: true,
                        property: true,
                    },
                },
                eventBooking: {
                    include: {
                        user: true,
                        event: {
                            include: { property: true }
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    async getStats(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (propertyId) {
            propertyFilter.id = propertyId;
        } else if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        const finalFilter = (propertyId || !isGlobalAdmin) ? {
            status: 'PAID' as any,
            OR: [
                { booking: { property: propertyFilter } },
                { eventBooking: { event: { property: propertyFilter } } }
            ]
        } : { status: 'PAID' as any };

        const stats = await this.prisma.payment.aggregate({
            where: finalFilter,
            _sum: {
                amount: true,
                platformFee: true,
                netAmount: true,
            },
            _count: {
                id: true,
            },
        });

        return {
            totalVolume: Number(stats._sum.amount || 0),
            totalFees: Number(stats._sum.platformFee || 0),
            netEarnings: Number(stats._sum.netAmount || 0),
            count: stats._count.id,
        };
    }

    /**
     * Get payment details
     */
    async getPaymentDetails(bookingId: string) {
        return this.prisma.payment.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Request a manual payment (Maker)
     */
    async requestManualPayment(user: any, dto: RecordManualPaymentDto) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: { user: true, property: true }
        });

        if (!booking) throw new NotFoundException('Booking not found');

        // Prevent Overpayment Request
        const currentPaid = Number(booking.paidAmount);
        const total = Number(booking.totalAmount);
        if (currentPaid + Number(dto.amount) > total + 0.01) {
            throw new BadRequestException(`Amount exceeds balance. Remaining: ${total - currentPaid}`);
        }

        const request = await this.prisma.manualPaymentRequest.create({
            data: {
                bookingId: dto.bookingId,
                amount: dto.amount,
                method: dto.method,
                notes: dto.notes,
                requestedById: user.id
            }
        });

        await this.audit.createLog({
            userId: user.id,
            action: 'MANUAL_PAYMENT_REQUESTED',
            entity: 'manualPaymentRequest',
            entityId: request.id,
            newValue: { amount: dto.amount, method: dto.method }
        });

        return { success: true, requestId: request.id, message: 'Manual payment request created' };
    }

    /**
     * Approve a manual payment (Checker)
     */
    async approveManualPayment(user: any, requestId: string) {
        const request = await this.prisma.manualPaymentRequest.findUnique({
            where: { id: requestId },
            include: {
                booking: { include: { property: true } }
            }
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.status !== 'PENDING') throw new BadRequestException('Request already processed');
        if (request.requestedById === user.id) {
            throw new ForbiddenException('Maker-Checker Violation: You cannot approve a request you created.');
        }

        const { booking, amount, method, notes } = request;

        const result = await this.prisma.$transaction(async (tx) => {
            // 1. Update Request
            await tx.manualPaymentRequest.update({
                where: { id: requestId },
                data: { status: 'APPROVED' as any, approvedById: user.id }
            });

            const newPaidAmount = Number(booking.paidAmount) + Number(amount);
            const totalAmount = Number(booking.totalAmount);
            const commissionRate = Number(booking.property?.platformCommission ?? 10);
            const platformFee = (Number(amount) * commissionRate) / 100;
            const netAmount = Number(amount) - platformFee;

            // 2. Create payment record
            const payment = await tx.payment.create({
                data: {
                    amount: amount,
                    currency: 'INR',
                    status: 'PAID',
                    paymentMethod: method,
                    paymentDate: new Date(),
                    bookingId: request.bookingId,
                    notes: `Approved Manual Payment: ${notes || ''}`,
                    platformFee: platformFee,
                    netAmount: netAmount,
                    commissionRate: commissionRate,
                },
            });

            // 3. Update booking paid amount
            const isFullyPaid = newPaidAmount >= totalAmount - 0.01;
            await tx.booking.update({
                where: { id: request.bookingId },
                data: {
                    paidAmount: newPaidAmount,
                    paymentStatus: isFullyPaid ? 'FULL' : 'PARTIAL',
                    ...(booking.status === 'PENDING_PAYMENT' && { status: 'CONFIRMED', confirmedAt: new Date() })
                },
            });

            // 4. Create income record
            await tx.income.create({
                data: {
                    amount: amount,
                    source: 'MANUAL_PAYMENT',
                    description: `Approved Manual payment (${method}) for ${booking.bookingNumber}`,
                    bookingId: request.bookingId,
                    paymentId: payment.id,
                },
            });

            return payment;
        });

        await this.audit.createLog({
            userId: user.id,
            action: 'MANUAL_PAYMENT_APPROVED',
            entity: 'manualPaymentRequest',
            entityId: requestId,
            oldValue: { status: 'PENDING' },
            newValue: { status: 'APPROVED', paymentId: result.id }
        });

        return { success: true, payment: result };
    }

    async findAllRefundRequests(status?: RequestStatus) {
        return this.prisma.refundRequest.findMany({
            where: {
                ...(status && { status }),
            },
            include: {
                payment: {
                    include: {
                        booking: { select: { id: true, bookingNumber: true, totalAmount: true } },
                        eventBooking: { select: { id: true, ticketId: true, amountPaid: true } },
                    },
                },
                requestedBy: { select: { id: true, firstName: true, lastName: true } },
                approvedBy: { select: { id: true, firstName: true, lastName: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Converts an amount to the smallest unit (e.g., paise for INR)
     */
    private convertToSmallestUnit(amount: number, currency: string): number {
        const c = currency.toUpperCase();

        // Zero-decimal currencies
        const zeroDecimal = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VUV', 'VND', 'XAF', 'XBA', 'XBB', 'XBC', 'XBD', 'XOF', 'XPF'];
        if (zeroDecimal.includes(c)) return Math.round(amount);

        // Three-decimal currencies
        const threeDecimal = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'];
        if (threeDecimal.includes(c)) return Math.round(amount * 1000);

        // Default (Two decimals)
        return Math.round(amount * 100);
    }
}
