import api from './api';

export interface HeroContent {
    id: string;
    tagline?: string;
    heading: string;
    subheading?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export const heroContentService = {
    getAll: async (): Promise<HeroContent[]> => {
        const response = await api.get('/hero-content');
        return response.data;
    },

    getOne: async (id: string): Promise<HeroContent> => {
        const response = await api.get(`/hero-content/${id}`);
        return response.data;
    },

    create: async (data: Partial<HeroContent>): Promise<HeroContent> => {
        const response = await api.post('/hero-content', data);
        return response.data;
    },

    update: async (id: string, data: Partial<HeroContent>): Promise<HeroContent> => {
        const response = await api.patch(`/hero-content/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/hero-content/${id}`);
    },
};
