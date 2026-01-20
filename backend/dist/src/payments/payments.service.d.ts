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
            createdAt: Date;
            bookingId: string;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.PaymentStatus;
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
            user: {
                id: string;
                createdAt: Date;
                email: string;
                password: string;
                firstName: string;
                lastName: string;
                phone: string | null;
                isActive: boolean;
                updatedAt: Date;
            };
            roomType: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
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
        } & {
            id: string;
            createdAt: Date;
            userId: string;
            updatedAt: Date;
            roomTypeId: string;
            status: import(".prisma/client").$Enums.BookingStatus;
            checkInDate: Date;
            roomId: string;
            bookingNumber: string;
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
            specialRequests: string | null;
            isManualBooking: boolean;
            bookingSourceId: string | null;
            agentId: string | null;
            commissionAmount: import("@prisma/client/runtime/library").Decimal;
            couponId: string | null;
            confirmedAt: Date | null;
            checkedInAt: Date | null;
            checkedOutAt: Date | null;
            cancelledAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        bookingId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
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
        createdAt: Date;
        bookingId: string;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.PaymentStatus;
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
