import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BookingsService } from '../bookings/bookings.service';
import Razorpay = require('razorpay');
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
    private razorpay: Razorpay;

    constructor(
        private prisma: PrismaService,
        private configService: ConfigService,
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
    async initiatePayment(bookingId: string) {
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

        // Create Razorpay order
        const order = await this.razorpay.orders.create({
            amount: Math.round(Number(booking.totalAmount) * 100), // Convert to paise
            currency: 'INR',
            receipt: booking.bookingNumber,
            notes: {
                bookingId: booking.id,
                bookingNumber: booking.bookingNumber,
                customerEmail: booking.user.email,
            },
        });

        // Create payment record
        const payment = await this.prisma.payment.create({
            data: {
                amount: booking.totalAmount,
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
            include: { booking: true },
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
            },
        });

        // Update booking status to CONFIRMED
        await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
                status: 'CONFIRMED',
                confirmedAt: new Date(),
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
            include: { booking: true },
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
            },
        });

        // Confirm booking
        await this.prisma.booking.update({
            where: { id: payment.bookingId },
            data: {
                status: 'CONFIRMED',
                confirmedAt: new Date(),
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
            include: { booking: true },
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

        // Create refund in Razorpay
        const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100), // Convert to paise
            notes: {
                reason: reason || 'Booking cancellation',
                bookingNumber: payment.booking.bookingNumber,
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
            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: { status: 'REFUNDED' },
            });
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

    async findAll() {
        return this.prisma.payment.findMany({
            include: {
                booking: {
                    include: {
                        user: true,
                        roomType: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
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
}
