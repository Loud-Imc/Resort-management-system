import api from './api';

export interface CancellationRule {
    hoursBeforeCheckIn: number;
    refundPercentage: number;
}

export interface CancellationPolicy {
    id: string;
    name: string;
    description?: string;
    propertyId: string;
    rules: CancellationRule[];
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export const cancellationPoliciesService = {
    getAll: async (propertyId: string): Promise<CancellationPolicy[]> => {
        const res = await api.get(`/cancellation-policies?propertyId=${propertyId}`);
        return res.data;
    },

    getById: async (id: string): Promise<CancellationPolicy> => {
        const res = await api.get(`/cancellation-policies/${id}`);
        return res.data;
    },

    create: async (data: any): Promise<CancellationPolicy> => {
        const res = await api.post('/cancellation-policies', data);
        return res.data;
    },

    update: async (id: string, data: any): Promise<CancellationPolicy> => {
        const res = await api.patch(`/cancellation-policies/${id}`, data);
        return res.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/cancellation-policies/${id}`);
    }
};
