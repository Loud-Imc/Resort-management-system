import api from './api';

export const paymentService = {
    initiatePayment: async (params: { bookingId?: string; eventBookingId?: string }) => {
        const { data } = await api.post<{
            orderId: string;
            amount: number;
            currency: string;
            keyId: string;
            booking?: any;
            eventBooking?: any;
            payment: any;
        }>('/payments/public/initiate', params);
        return data;
    },

    initiateQrPayment: async (params: { bookingId: string }) => {
        const { data } = await api.post<{
            qrCodeId: string;
            paymentSource: string;
            upiUri: string;
            amount: number;
            currency: string;
        }>('/payments/public/initiate-qr', params);
        return data;
    },

    verifyPayment: async (verificationData: {
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }) => {
        const { data } = await api.post('/payments/verify', verificationData);
        return data;
    }
};
