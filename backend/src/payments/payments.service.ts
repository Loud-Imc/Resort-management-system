import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';

@Injectable()
export class PaymentsService {
    private razorpay: Razorpay;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
        private mailService: MailService,
        private channelPartnersService: ChannelPartnersService,
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
                    roomType: true,
                },
            });

            if (!booking) {
                throw new NotFoundException('Booking not found');
            }

            if (booking.status !== 'PENDING_PAYMENT') {
                throw new BadRequestException('Booking is not pending payment');
            }

            // Calculate amount to charge
            let chargeAmount = Number(booking.totalAmount);
            if (booking.paymentOption === 'PARTIAL') {
                // If it's a partial payment, charge 1/3rd for the first payment
                // We use Math.round to avoid paise rounding issues with Razorpay
                chargeAmount = Math.round(chargeAmount / 3);
            }

            // Create Razorpay order
            const order = await this.razorpay.orders.create({
                amount: Math.round(chargeAmount * 100), // Convert to paise
                currency: 'INR',
                receipt: booking.bookingNumber,
                notes: {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    customerEmail: booking.user.email,
                    type: 'RESORT_BOOKING',
                    paymentOption: booking.paymentOption
                },
            });

            // Create payment record
            const payment = await this.prisma.payment.create({
                data: {
                    amount: chargeAmount,
                    currency: 'INR',
                    status: 'PENDING',
                    razorpayOrderId: order.id,
                    bookingId: booking.id,
                },
            });

            return {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
                booking: {
                    id: booking.id,
                    bookingNumber: booking.bookingNumber,
                    totalAmount: booking.totalAmount,
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
                    event: true,
                },
            });

            if (!eventBooking) {
                throw new NotFoundException('Event Booking not found');
            }

            if (eventBooking.status !== 'PENDING') {
                throw new BadRequestException('Event booking is not pending payment');
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

        // Verify signature
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', this.configService.get<string>('RAZORPAY_KEY_SECRET') || '')
            .update(body)
            .digest('hex');

        if (expectedSignature !== razorpaySignature) {
            // Update payment status to failed
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED' },
            });

            throw new BadRequestException('Invalid payment signature');
        }

        // Update payment record
        const updatedPayment = await this.prisma.payment.update({
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
            // Calculate new paid amount
            const newPaidAmount = Number(payment.booking.paidAmount) + Number(payment.amount);
            const isFullyPaid = newPaidAmount >= Number(payment.booking.totalAmount);

            // Update booking status and payment tracking
            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: payment.booking.confirmedAt || new Date(),
                    paidAmount: newPaidAmount,
                    paymentStatus: isFullyPaid ? 'FULL' : 'PARTIAL',
                },
            });

            // Create income record
            await this.prisma.income.create({
                data: {
                    amount: payment.amount,
                    source: 'ONLINE_BOOKING',
                    description: `Online booking ${payment.booking.bookingNumber}`,
                    bookingId: payment.bookingId,
                },
            });

            // Send confirmation email
            await this.mailService.sendBookingConfirmation(payment.booking);

            // Process Channel Partner Reward (Pending)
            if (payment.booking.channelPartnerId) {
                await this.channelPartnersService.processReferralCommission(
                    payment.bookingId,
                    payment.booking.channelPartnerId,
                    Number(payment.booking.totalAmount),
                    true // isPending = true
                );
            }
        } else if (payment.eventBookingId && payment.eventBooking) {
            // Update event booking status to PAID
            await this.prisma.eventBooking.update({
                where: { id: payment.eventBookingId },
                data: {
                    status: 'PAID',
                },
            });

            // Create income record for event
            await this.prisma.income.create({
                data: {
                    amount: payment.amount,
                    source: 'EVENT_BOOKING',
                    description: `Event booking ${payment.eventBooking.ticketId}`,
                    eventBookingId: payment.eventBookingId,
                },
            });
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
        // Verify webhook signature
        const webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');

        if (webhookSecret) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(body))
                .digest('hex');

            if (expectedSignature !== signature) {
                throw new BadRequestException('Invalid webhook signature');
            }
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
        const payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId: paymentData.order_id },
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
            console.error('Payment not found for order:', paymentData.order_id);
            return;
        }

        if (payment.status === 'PAID') {
            return; // Already processed
        }

        // Update payment
        await this.prisma.payment.update({
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

            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: payment.booking.confirmedAt || new Date(),
                    paidAmount: newPaidAmount,
                    paymentStatus: isFullyPaid ? 'FULL' : 'PARTIAL',
                },
            });

            // Create income record
            await this.prisma.income.create({
                data: {
                    amount: payment.amount,
                    source: 'ONLINE_BOOKING',
                    description: `Online booking ${payment.booking?.bookingNumber}`,
                    bookingId: payment.bookingId,
                },
            });

            // Send confirmation email
            await this.mailService.sendBookingConfirmation(payment.booking);

            // Process Channel Partner Reward (Pending)
            if (payment.booking?.channelPartnerId) {
                await this.channelPartnersService.processReferralCommission(
                    payment.bookingId,
                    payment.booking.channelPartnerId,
                    Number(payment.booking.totalAmount),
                    true // isPending = true
                );
            }
        } else if (payment.eventBookingId) {
            await this.prisma.eventBooking.update({
                where: { id: payment.eventBookingId },
                data: {
                    status: 'PAID',
                },
            });

            // Create income record for event
            await this.prisma.income.create({
                data: {
                    amount: payment.amount,
                    source: 'EVENT_BOOKING',
                    description: `Event booking ${payment.eventBooking?.ticketId}`,
                    eventBookingId: payment.eventBookingId,
                },
            });
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
     * Process refund
     */
    async processRefund(paymentId: string, amount?: number, reason?: string) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: true,
                eventBooking: true
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        if (payment.status !== 'PAID') {
            throw new BadRequestException('Payment is not in paid status');
        }

        if (!payment.razorpayPaymentId) {
            throw new BadRequestException('Razorpay payment ID not found');
        }

        const refundAmount = amount || Number(payment.amount);
        const bookingIdentifier = payment.booking?.bookingNumber || payment.eventBooking?.ticketId || 'Unknown';

        // Create refund in Razorpay
        const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100), // Convert to paise
            notes: {
                reason: reason || 'Booking cancellation',
                bookingIdentifier: bookingIdentifier,
            },
        });

        // Update payment record
        const isFullRefund = refundAmount >= Number(payment.amount);

        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                refundAmount,
                refundDate: new Date(),
                refundReason: reason,
            },
        });

        // Update booking status
        if (isFullRefund) {
            if (payment.bookingId) {
                await this.prisma.booking.update({
                    where: { id: payment.bookingId },
                    data: {
                        status: 'REFUNDED',
                        paidAmount: { decrement: refundAmount },
                        paymentStatus: 'UNPAID'
                    },
                });
            } else if (payment.eventBookingId) {
                await this.prisma.eventBooking.update({
                    where: { id: payment.eventBookingId },
                    data: { status: 'REFUNDED' },
                });
            }
        }

        return {
            success: true,
            refund: {
                id: refund.id,
                amount: refundAmount,
                status: refund.status,
            },
        };
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

        return this.prisma.payment.update({
            where: { id },
            data: {
                payoutStatus: 'PAID',
                ...financials
            },
        });
    }

    private calculateFinancials(payment: any) {
        try {
            let amount = 0;
            let commissionRate = 10; // Default 10%

            if (payment.bookingId && payment.booking?.property) {
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
     * Record a manual payment (Cash, UPI, etc.)
     */
    async recordManualPayment(dto: RecordManualPaymentDto, userId: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: dto.bookingId },
            include: { user: true }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Create payment record
        const payment = await this.prisma.payment.create({
            data: {
                amount: dto.amount,
                currency: 'INR',
                status: 'PAID',
                paymentMethod: dto.method,
                paymentDate: new Date(),
                bookingId: dto.bookingId,
                notes: dto.notes,
                platformFee: 0,
                netAmount: dto.amount,
            },
        });

        // Update booking paid amount
        const newPaidAmount = Number(booking.paidAmount) + Number(dto.amount);
        const isFullyPaid = newPaidAmount >= Number(booking.totalAmount);

        await this.prisma.booking.update({
            where: { id: dto.bookingId },
            data: {
                paidAmount: newPaidAmount,
                paymentStatus: isFullyPaid ? 'FULL' : 'PARTIAL',
                ...(booking.status === 'PENDING_PAYMENT' && { status: 'CONFIRMED', confirmedAt: new Date() })
            },
        });

        // Create income record
        await this.prisma.income.create({
            data: {
                amount: dto.amount,
                source: 'MANUAL_PAYMENT',
                description: `Manual payment (${dto.method}) for ${booking.bookingNumber}. ${dto.notes || ''}`,
                bookingId: dto.bookingId,
            },
        });

        return {
            success: true,
            payment,
            message: 'Manual payment recorded successfully',
        };
    }
}
