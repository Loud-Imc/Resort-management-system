import axios from 'axios';
import { Property, PropertySearchParams, PropertyListResponse, ChannelPartnerInfo, PropertyCategory } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: `${API_URL}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Property API Service for public marketplace
export const propertyApi = {
    // Get all properties with search/filters
    async getAll(params?: PropertySearchParams): Promise<PropertyListResponse> {
        const response = await api.get('/properties', { params });
        return response.data;
    },

    // Get property by slug
    async getBySlug(slug: string): Promise<Property> {
        const response = await api.get(`/properties/${slug}`);
        return response.data;
    },

    // Get featured properties for homepage
    async getFeatured(limit = 6): Promise<Property[]> {
        const response = await api.get('/properties', {
            params: { limit, isFeatured: true }
        });
        return response.data.data;
    },

    // Get all active property categories
    async getCategories(): Promise<PropertyCategory[]> {
        const response = await api.get('/property-categories');
        return response.data;
    },

    // Get nearby properties by lat/lng
    async getNearby(lat: number, lng: number, radius = 100): Promise<Property[]> {
        const response = await api.get('/properties/nearby', { params: { lat, lng, radius } });
        return response.data;
    },

    // Get location autocomplete suggestions
    async autocomplete(input: string): Promise<{ placeId: string; description: string; mainText: string; secondaryText: string }[]> {
        const response = await api.get('/properties/autocomplete', { params: { input } });
        return response.data;
    },
};

// Channel Partner API Service
export const channelPartnerApi = {
    // Validate a referral code
    async validateCode(code: string): Promise<ChannelPartnerInfo | null> {
        try {
            const response = await api.get(`/channel-partners/validate/${code}`);
            return {
                referralCode: response.data.referralCode,
                partnerName: response.data.user ?
                    `${response.data.user.firstName} ${response.data.user.lastName}` : undefined,
            };
        } catch (error) {
            return null;
        }
    },
};

export default api;
