import api from './api';
import type { Payment, RecordManualPaymentDto } from '../types/payment';

export const paymentsService = {
    getAll: async (propertyId?: string) => {
        const { data } = await api.get<Payment[]>('/payments', {
            params: propertyId ? { propertyId } : undefined,
        });
        return data;
    },

    getStats: async (propertyId?: string) => {
        const { data } = await api.get<{
            totalVolume: number;
            totalFees: number;
            netEarnings: number;
        }>('/payments/stats', {
            params: propertyId ? { propertyId } : undefined,
        });
        return data;
    },

    recordManual: async (data: RecordManualPaymentDto) => {
        const { data: response } = await api.post('/payments/manual', data);
        return response;
    }
};
