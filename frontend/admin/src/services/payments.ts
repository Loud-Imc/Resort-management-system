import api from './api';
import type { Payment, InitiatePaymentDto, VerifyPaymentDto, ProcessRefundDto, RecordManualPaymentDto } from '../types/payment';

export const paymentsService = {
    getAll: async (propertyId?: string) => {
        const { data } = await api.get<Payment[]>('/payments', {
            params: { propertyId }
        });
        return data;
    },

    getStats: async (propertyId?: string) => {
        const { data } = await api.get<{
            totalVolume: number;
            totalFees: number;
            netEarnings: number;
            count: number;
        }>('/payments/stats', {
            params: { propertyId }
        });
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
    },

    confirmPayout: async (paymentId: string) => {
        const { data } = await api.post(`/payments/${paymentId}/payout/confirm`);
        return data;
    },

    recordManual: async (data: RecordManualPaymentDto) => {
        const { data: response } = await api.post('/payments/manual', data);
        return response;
    }
};
