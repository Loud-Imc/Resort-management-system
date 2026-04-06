import api from './api';

export type BannerType = 'HERO' | 'PROMO';

export interface Banner {
    id: string;
    title: string;
    description?: string;
    imageUrl: string;
    linkUrl?: string;
    buttonText?: string;
    badgeText?: string;
    type: BannerType;
    isActive: boolean;
    position: number;
    createdAt: string;
    updatedAt: string;
}

export const bannerService = {
    getBanners: async (type?: BannerType): Promise<Banner[]> => {
        const response = await api.get('/banners', { params: { type } });
        return response.data;
    },

    getBanner: async (id: string): Promise<Banner> => {
        const response = await api.get(`/banners/${id}`);
        return response.data;
    },

    createBanner: async (data: Partial<Banner>): Promise<Banner> => {
        const response = await api.post('/banners', data);
        return response.data;
    },

    updateBanner: async (id: string, data: Partial<Banner>): Promise<Banner> => {
        const response = await api.patch(`/banners/${id}`, data);
        return response.data;
    },

    deleteBanner: async (id: string): Promise<void> => {
        await api.delete(`/banners/${id}`);
    },
};
