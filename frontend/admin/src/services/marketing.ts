import api from './api';
import { Property } from '../types/property';

export interface MarketingStats {
    totalProperties: number;
    totalEarnings: number;
    pendingEarnings: number;
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
};
