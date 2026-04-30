import api from './api';
import { Property } from '../types/property';

export interface MarketingStats {
    totalProperties: number;
    totalEarnings: number;
    pendingEarnings: number;
}

export interface PartnerLevel {
    id: string;
    name: string;
    minPoints: number;
    commissionRate: number;
    pointsPerUnit: number;
    unitAmount: number;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface Reward {
    id: string;
    name: string;
    description?: string;
    pointCost: number;
    imageUrl?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export const marketingService = {
    getStats: async (): Promise<MarketingStats> => {
        const response = await api.get('/marketing/stats');
        return response.data;
    },

    getMyProperties: async (): Promise<Property[]> => {
        const response = await api.get('/marketing/properties');
        return response.data;
    },

    // --- Partner Levels (Tiers) ---
    getLevels: async (): Promise<PartnerLevel[]> => {
        const response = await api.get('/marketing/levels');
        return response.data;
    },

    createLevel: async (data: Partial<PartnerLevel>): Promise<PartnerLevel> => {
        const response = await api.post('/marketing/levels', data);
        return response.data;
    },

    updateLevel: async (id: string, data: Partial<PartnerLevel>): Promise<PartnerLevel> => {
        const { id: _, createdAt, updatedAt, ...updateData } = data;
        const response = await api.put(`/marketing/levels/${id}`, updateData);
        return response.data;
    },

    deleteLevel: async (id: string): Promise<void> => {
        await api.delete(`/marketing/levels/${id}`);
    },

    // --- Rewards Catalog ---
    getRewards: async (): Promise<Reward[]> => {
        const response = await api.get('/marketing/rewards/admin');
        return response.data;
    },

    createReward: async (data: Partial<Reward>): Promise<Reward> => {
        const response = await api.post('/marketing/rewards', data);
        return response.data;
    },

    updateReward: async (id: string, data: Partial<Reward>): Promise<Reward> => {
        const { id: _, createdAt, updatedAt, ...updateData } = data;
        const response = await api.put(`/marketing/rewards/${id}`, updateData);
        return response.data;
    },

    deleteReward: async (id: string): Promise<void> => {
        await api.delete(`/marketing/rewards/${id}`);
    },
};
