import api from './api';
import { ChannelPartner, CPStats, CPListResponse } from '../types/channel-partner';

// Channel Partner API Service
export const channelPartnerService = {
    // Register current user as CP
    async register(): Promise<ChannelPartner> {
        const response = await api.post('/channel-partners/register');
        return response.data;
    },

    // Get current user's CP profile
    async getMyProfile(): Promise<ChannelPartner> {
        const response = await api.get('/channel-partners/me');
        return response.data;
    },

    // Get current user's CP stats
    async getMyStats(): Promise<CPStats> {
        const response = await api.get('/channel-partners/me/stats');
        return response.data;
    },

    // Validate a referral code (public)
    async validateCode(code: string): Promise<{ valid: boolean; partnerName?: string }> {
        try {
            const response = await api.get(`/channel-partners/validate/${code}`);
            return {
                valid: true,
                partnerName: response.data.user ?
                    `${response.data.user.firstName} ${response.data.user.lastName}` : undefined,
            };
        } catch (error) {
            return { valid: false };
        }
    },

    // Admin: List all channel partners
    async getAll(page = 1, limit = 20): Promise<CPListResponse> {
        const response = await api.get('/channel-partners', { params: { page, limit } });
        return response.data;
    },

    // Admin: Update commission rate
    async updateCommissionRate(id: string, commissionRate: number): Promise<ChannelPartner> {
        const response = await api.put(`/channel-partners/${id}/commission-rate`, { commissionRate });
        return response.data;
    },

    // Admin: Toggle active status
    async toggleActive(id: string, isActive: boolean): Promise<ChannelPartner> {
        const response = await api.put(`/channel-partners/${id}/toggle-active`, { isActive });
        return response.data;
    },
};

export default channelPartnerService;
