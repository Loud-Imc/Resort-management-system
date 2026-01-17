export declare class InitiatePaymentDto {
    bookingId: string;
}
export declare class VerifyPaymentDto {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
}
export declare class ProcessRefundDto {
    amount?: number;
    reason?: string;
}
