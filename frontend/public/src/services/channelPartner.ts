import api from './api';

export const channelPartnerService = {
    getMyProfile: async () => {
        const { data } = await api.get('/channel-partners/me');
        return data;
    },
    getStats: async () => {
        const { data } = await api.get('/channel-partners/me/stats');
        return data;
    },
    getTransactions: async () => {
        const { data } = await api.get('/channel-partners/me/transactions');
        return data;
    },
    topUpWallet: async (amount: number, description: string) => {
        const { data } = await api.post('/channel-partners/me/top-up', { amount, description });
        return data;
    },
};
