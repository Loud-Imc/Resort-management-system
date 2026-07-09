import api from './api';
import type { Payment, RecordManualPaymentDto } from '../types/payment';

export const paymentsService = {
    getAll: async (propertyId?: string, startDate?: string, endDate?: string) => {
        const { data } = await api.get<Payment[]>('/payments', {
            params: { propertyId, startDate, endDate },
        });
        return data;
    },

    getStats: async (propertyId?: string, startDate?: string, endDate?: string) => {
        const { data } = await api.get<{
            totalVolume: number;
            totalFees: number;
            netEarnings: number;
        }>('/payments/stats', {
            params: { propertyId, startDate, endDate },
        });
        return data;
    },

    recordManual: async (data: RecordManualPaymentDto) => {
        const { data: response } = await api.post('/payments/property/manual', data);
        return response;
    }
};
