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

    getForBooking: async (bookingId: string) => {
        const { data } = await api.get<Payment[]>(`/payments/booking/${bookingId}`);
        return data;
    },

    confirmPayout: async (paymentId: string) => {
        const { data } = await api.post(`/payments/${paymentId}/payout/confirm`);
        return data;
    },

    // ============================================
    // MAKER-CHECKER (MANUAL PAYMENTS & REFUNDS)
    // ============================================

    // Request manual payment (Maker)
    async requestManualPayment(dto: RecordManualPaymentDto) {
        const { data } = await api.post('/payments/manual/request', dto);
        return data;
    },

    // Approve manual payment (Checker)
    async approveManualPayment(requestId: string) {
        const { data } = await api.patch(`/payments/manual/approve/${requestId}`);
        return data;
    },

    // Request refund (Maker)
    async requestRefund(paymentId: string, dto: ProcessRefundDto) {
        const { data } = await api.post(`/payments/${paymentId}/refund/request`, dto);
        return data;
    },

    // Approve refund (Checker)
    async approveRefund(requestId: string) {
        const { data } = await api.post(`/payments/refund/requests/${requestId}/approve`);
        return data;
    },

    // Get all refund requests
    async getAllRefundRequests(params?: any) {
        const { data } = await api.get('/payments/refund/requests', { params });
        return data;
    }
};
