import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

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
}

export const bannerApi = {
    getActive: async (type?: BannerType): Promise<Banner[]> => {
        const response = await api.get('/banners/active', { params: { type } });
        return response.data;
    }
};
