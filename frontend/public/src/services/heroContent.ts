import api from './api';

export interface HeroContent {
    id: string;
    tagline?: string;
    heading: string;
    subheading: string;
}

export const heroContentApi = {
    getRandom: async (): Promise<HeroContent | null> => {
        try {
            const response = await api.get('/hero-content/random');
            return response.data;
        } catch (error) {
            console.error('Failed to fetch hero content', error);
            return null;
        }
    }
};
