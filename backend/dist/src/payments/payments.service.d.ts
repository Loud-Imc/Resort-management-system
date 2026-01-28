import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class PaymentsService {
    private prisma;
    private configService;
    private razorpay;
    constructor(prisma: PrismaService, configService: ConfigService);
    initiatePayment(bookingId?: string, eventBookingId?: string): Promise<{
        orderId: string;
        amount: string | number;
        currency: string;
        keyId: string | undefined;
        booking: {
            id: string;
            bookingNumber: string;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
        };
        payment: {
            id: string;
        };
        eventBooking?: undefined;
    } | {
        orderId: string;
        amount: string | number;
        currency: string;
        keyId: string | undefined;
        eventBooking: {
            id: string;
            ticketId: string;
            amountPaid: import("@prisma/client/runtime/library").Decimal;
        };
        payment: {
            id: string;
        };
        booking?: undefined;
    }>;
    verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<{
        success: boolean;
        payment: {
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            bookingId: string | null;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            paymentMethod: string | null;
            paymentDate: Date | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundDate: Date | null;
            refundReason: string | null;
            eventBookingId: string | null;
        };
        message: string;
    }>;
    handleWebhook(body: any, signature: string): Promise<{
        success: boolean;
    }>;
    private handlePaymentCaptured;
    private handlePaymentFailed;
    processRefund(paymentId: string, amount?: number, reason?: string): Promise<{
        success: boolean;
        refund: {
            id: string;
            amount: number;
            status: "pending" | "processed" | "failed";
        };
    }>;
    findAll(): Promise<({
        booking: ({
            roomType: {
                id: string;
                propertyId: string | null;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                amenities: string[];
                basePrice: import("@prisma/client/runtime/library").Decimal;
                extraAdultPrice: import("@prisma/client/runtime/library").Decimal;
                extraChildPrice: import("@prisma/client/runtime/library").Decimal;
                freeChildrenCount: number;
                maxAdults: number;
                maxChildren: number;
                isPubliclyVisible: boolean;
                images: string[];
            };
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                password: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                isActive: boolean;
                commissionPercentage: import("@prisma/client/runtime/library").Decimal | null;
            };
        } & {
            id: string;
            bookingNumber: string;
            checkInDate: Date;
            checkOutDate: Date;
            numberOfNights: number;
            adultsCount: number;
            childrenCount: number;
            baseAmount: import("@prisma/client/runtime/library").Decimal;
            extraAdultAmount: import("@prisma/client/runtime/library").Decimal;
            extraChildAmount: import("@prisma/client/runtime/library").Decimal;
            taxAmount: import("@prisma/client/runtime/library").Decimal;
            discountAmount: import("@prisma/client/runtime/library").Decimal;
            totalAmount: import("@prisma/client/runtime/library").Decimal;
            isPriceOverridden: boolean;
            overrideReason: string | null;
            status: import(".prisma/client").$Enums.BookingStatus;
            specialRequests: string | null;
            isManualBooking: boolean;
            propertyId: string | null;
            roomId: string;
            roomTypeId: string;
            userId: string;
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            channelPartnerId: string | null;
            cpCommission: import("@prisma/client/runtime/library").Decimal | null;
            cpDiscount: import("@prisma/client/runtime/library").Decimal | null;
            createdAt: Date;
            updatedAt: Date;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        }) | null;
        eventBooking: ({
            user: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                email: string;
                password: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                isActive: boolean;
                commissionPercentage: import("@prisma/client/runtime/library").Decimal | null;
            };
            event: {
                id: string;
                status: import(".prisma/client").$Enums.EventStatus;
                propertyId: string | null;
                createdAt: Date;
                updatedAt: Date;
                isActive: boolean;
                description: string | null;
                images: string[];
                title: string;
                date: Date;
                location: string;
                price: string | null;
                organizerType: import(".prisma/client").$Enums.EventOrganizerType;
                createdById: string;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.EventBookingStatus;
            userId: string;
            createdAt: Date;
            updatedAt: Date;
            ticketId: string;
            eventId: string;
            amountPaid: import("@prisma/client/runtime/library").Decimal;
            guestName: string | null;
            guestEmail: string | null;
            guestPhone: string | null;
            checkedIn: boolean;
            checkInTime: Date | null;
        }) | null;
    } & {
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        razorpaySignature: string | null;
        paymentMethod: string | null;
        paymentDate: Date | null;
        refundAmount: import("@prisma/client/runtime/library").Decimal | null;
        refundDate: Date | null;
        refundReason: string | null;
        eventBookingId: string | null;
    })[]>;
    getPaymentDetails(bookingId: string): Promise<{
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string | null;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        razorpaySignature: string | null;
        paymentMethod: string | null;
        paymentDate: Date | null;
        refundAmount: import("@prisma/client/runtime/library").Decimal | null;
        refundDate: Date | null;
        refundReason: string | null;
        eventBookingId: string | null;
    }[]>;
}
