"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const Razorpay = require("razorpay");
const crypto = __importStar(require("crypto"));
let PaymentsService = class PaymentsService {
    prisma;
    configService;
    razorpay;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        const keyId = this.configService.get('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
        console.log(`[PaymentsService] Loading Razorpay Key ID: ${keyId?.substring(0, 8)}...`);
        this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }
    async initiatePayment(bookingId, eventBookingId) {
        if (!bookingId && !eventBookingId) {
            throw new common_1.BadRequestException('Either bookingId or eventBookingId is required');
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
                throw new common_1.NotFoundException('Booking not found');
            }
            if (booking.status !== 'PENDING_PAYMENT') {
                throw new common_1.BadRequestException('Booking is not pending payment');
            }
            const order = await this.razorpay.orders.create({
                amount: Math.round(Number(booking.totalAmount) * 100),
                currency: 'INR',
                receipt: booking.bookingNumber,
                notes: {
                    bookingId: booking.id,
                    bookingNumber: booking.bookingNumber,
                    customerEmail: booking.user.email,
                    type: 'RESORT_BOOKING'
                },
            });
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
                keyId: this.configService.get('RAZORPAY_KEY_ID'),
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
        else {
            const eventBooking = await this.prisma.eventBooking.findUnique({
                where: { id: eventBookingId },
                include: {
                    user: true,
                    event: true,
                },
            });
            if (!eventBooking) {
                throw new common_1.NotFoundException('Event Booking not found');
            }
            if (eventBooking.status !== 'PENDING') {
                throw new common_1.BadRequestException('Event booking is not pending payment');
            }
            const order = await this.razorpay.orders.create({
                amount: Math.round(Number(eventBooking.amountPaid) * 100),
                currency: 'INR',
                receipt: eventBooking.ticketId,
                notes: {
                    eventBookingId: eventBooking.id,
                    ticketId: eventBooking.ticketId,
                    customerEmail: eventBooking.user.email,
                    type: 'EVENT_BOOKING'
                },
            });
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
                keyId: this.configService.get('RAZORPAY_KEY_ID'),
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
    async verifyPayment(razorpayOrderId, razorpayPaymentId, razorpaySignature) {
        const payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId },
            include: {
                booking: true,
                eventBooking: true
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        const body = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSignature = crypto
            .createHmac('sha256', this.configService.get('RAZORPAY_KEY_SECRET') || '')
            .update(body)
            .digest('hex');
        if (expectedSignature !== razorpaySignature) {
            await this.prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED' },
            });
            throw new common_1.BadRequestException('Invalid payment signature');
        }
        const updatedPayment = await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'PAID',
                razorpayPaymentId,
                razorpaySignature,
                paymentDate: new Date(),
            },
        });
        if (payment.bookingId && payment.booking) {
            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                },
            });
            await this.prisma.income.create({
                data: {
                    amount: payment.amount,
                    source: 'ONLINE_BOOKING',
                    description: `Online booking ${payment.booking.bookingNumber}`,
                    bookingId: payment.bookingId,
                },
            });
        }
        else if (payment.eventBookingId && payment.eventBooking) {
            await this.prisma.eventBooking.update({
                where: { id: payment.eventBookingId },
                data: {
                    status: 'PAID',
                },
            });
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
    async handleWebhook(body, signature) {
        const webhookSecret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
        if (webhookSecret) {
            const expectedSignature = crypto
                .createHmac('sha256', webhookSecret)
                .update(JSON.stringify(body))
                .digest('hex');
            if (expectedSignature !== signature) {
                throw new common_1.BadRequestException('Invalid webhook signature');
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
    async handlePaymentCaptured(paymentData) {
        const payment = await this.prisma.payment.findUnique({
            where: { razorpayOrderId: paymentData.order_id },
            include: {
                booking: true,
                eventBooking: true
            },
        });
        if (!payment) {
            console.error('Payment not found for order:', paymentData.order_id);
            return;
        }
        if (payment.status === 'PAID') {
            return;
        }
        await this.prisma.payment.update({
            where: { id: payment.id },
            data: {
                status: 'PAID',
                razorpayPaymentId: paymentData.id,
                paymentMethod: paymentData.method,
                paymentDate: new Date(paymentData.created_at * 1000),
            },
        });
        if (payment.bookingId) {
            await this.prisma.booking.update({
                where: { id: payment.bookingId },
                data: {
                    status: 'CONFIRMED',
                    confirmedAt: new Date(),
                },
            });
            await this.prisma.income.create({
                data: {
                    amount: payment.amount,
                    source: 'ONLINE_BOOKING',
                    description: `Online booking ${payment.booking?.bookingNumber}`,
                    bookingId: payment.bookingId,
                },
            });
        }
        else if (payment.eventBookingId) {
            await this.prisma.eventBooking.update({
                where: { id: payment.eventBookingId },
                data: {
                    status: 'PAID',
                },
            });
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
    async handlePaymentFailed(paymentData) {
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
    async processRefund(paymentId, amount, reason) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                booking: true,
                eventBooking: true
            },
        });
        if (!payment) {
            throw new common_1.NotFoundException('Payment not found');
        }
        if (payment.status !== 'PAID') {
            throw new common_1.BadRequestException('Payment is not in paid status');
        }
        if (!payment.razorpayPaymentId) {
            throw new common_1.BadRequestException('Razorpay payment ID not found');
        }
        const refundAmount = amount || Number(payment.amount);
        const bookingIdentifier = payment.booking?.bookingNumber || payment.eventBooking?.ticketId || 'Unknown';
        const refund = await this.razorpay.payments.refund(payment.razorpayPaymentId, {
            amount: Math.round(refundAmount * 100),
            notes: {
                reason: reason || 'Booking cancellation',
                bookingIdentifier: bookingIdentifier,
            },
        });
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
        if (isFullRefund) {
            if (payment.bookingId) {
                await this.prisma.booking.update({
                    where: { id: payment.bookingId },
                    data: { status: 'REFUNDED' },
                });
            }
            else if (payment.eventBookingId) {
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
    async findAll() {
        return this.prisma.payment.findMany({
            include: {
                booking: {
                    include: {
                        user: true,
                        roomType: true,
                    },
                },
                eventBooking: {
                    include: {
                        user: true,
                        event: true,
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async getPaymentDetails(bookingId) {
        return this.prisma.payment.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map