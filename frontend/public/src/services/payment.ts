import api from './api';

export const paymentService = {
    initiatePayment: async (bookingId: string) => {
        const { data } = await api.post<{
            orderId: string;
            amount: number;
            currency: string;
            keyId: string;
            booking: any;
            payment: any;
        }>('/payments/public/initiate', { bookingId });
        return data;
    },

    verifyPayment: async (verificationData: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
        bookingId?: string;
    }) => {
        const { data } = await api.post('/payments/verify', verificationData);
        return data;
    }
};
