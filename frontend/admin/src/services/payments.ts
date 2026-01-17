import api from './api';
import type { Payment, InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto } from '../types/payment';

export const paymentsService = {
    getAll: async () => {
        const { data } = await api.get<Payment[]>('/payments');
        return data;
    },

    initiate: async (data: InitiatePaymentDto) => {
        const { data: response } = await api.post('/payments/initiate', data);
        return response;
    },

    verify: async (data: VerifyPaymentDto) => {
        const { data: response } = await api.post('/payments/verify', data);
        return response;
    },

    refund: async (paymentId: string, data: ProcessRefundDto) => {
        const { data: response } = await api.post(`/payments/${paymentId}/refund`, data);
        return response;
    },

    getForBooking: async (bookingId: string) => {
        const { data } = await api.get<Payment[]>(`/payments/booking/${bookingId}`);
        return data;
    }
};
