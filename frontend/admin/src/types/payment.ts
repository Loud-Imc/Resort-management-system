export interface Payment {
    id: string;
    amount: number;
    currency: string;
    status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
    payoutStatus: 'PENDING' | 'PAID' | 'CANCELLED';
    platformFee?: number;
    netAmount?: number;
    paymentMethod?: string;
    paymentDate?: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    refundAmount?: number;
    refundDate?: string;
    refundReason?: string;
    bookingId: string;
    booking?: {
        bookingNumber: string;
        user: {
            firstName: string;
            lastName: string;
            email: string;
        };
        roomType: {
            name: string;
        };
        property: {
            name: string;
            platformCommission?: number;
        };
    };
    createdAt: string;
}

export interface InitiatePaymentDto {
    bookingId: string;
}

export interface VerifyPaymentDto {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}

export interface ProcessRefundDto {
    amount?: number;
    reason?: string;
}
