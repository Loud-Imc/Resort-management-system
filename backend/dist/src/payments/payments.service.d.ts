import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
export declare class PaymentsService {
    private prisma;
    private configService;
    private razorpay;
    constructor(prisma: PrismaService, configService: ConfigService);
    initiatePayment(bookingId: string): Promise<{
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
    }>;
    verifyPayment(razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string): Promise<{
        success: boolean;
        payment: {
            id: string;
            status: import(".prisma/client").$Enums.PaymentStatus;
            createdAt: Date;
            updatedAt: Date;
            bookingId: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            razorpayOrderId: string | null;
            razorpayPaymentId: string | null;
            razorpaySignature: string | null;
            paymentMethod: string | null;
            paymentDate: Date | null;
            refundAmount: import("@prisma/client/runtime/library").Decimal | null;
            refundDate: Date | null;
            refundReason: string | null;
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
        booking: {
            roomType: {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                description: string | null;
                name: string;
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
                isActive: boolean;
                firstName: string;
                lastName: string;
                email: string;
                phone: string | null;
                password: string;
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
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            createdAt: Date;
            updatedAt: Date;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
            roomId: string;
            roomTypeId: string;
            userId: string;
            bookingSourceId: string | null;
            agentId: string | null;
            couponId: string | null;
        };
    } & {
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        razorpaySignature: string | null;
        paymentMethod: string | null;
        paymentDate: Date | null;
        refundAmount: import("@prisma/client/runtime/library").Decimal | null;
        refundDate: Date | null;
        refundReason: string | null;
    })[]>;
    getPaymentDetails(bookingId: string): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.PaymentStatus;
        createdAt: Date;
        updatedAt: Date;
        bookingId: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        currency: string;
        razorpayOrderId: string | null;
        razorpayPaymentId: string | null;
        razorpaySignature: string | null;
        paymentMethod: string | null;
        paymentDate: Date | null;
        refundAmount: import("@prisma/client/runtime/library").Decimal | null;
        refundDate: Date | null;
        refundReason: string | null;
    }[]>;
}
