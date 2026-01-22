import api from './api';
import { Property, CreatePropertyDto, UpdatePropertyDto, PropertyQueryParams, PropertyListResponse } from '../types/property';

// Property API Service
export const propertyService = {
    // Get all properties (public view)
    async getAll(params?: PropertyQueryParams): Promise<PropertyListResponse> {
        const response = await api.get('/properties', { params });
        return response.data;
    },

    // Get all properties (admin view - includes inactive)
    async getAllAdmin(params?: PropertyQueryParams): Promise<PropertyListResponse> {
        const response = await api.get('/properties/admin/all', { params });
        return response.data;
    },

    // Get properties owned by current user
    async getMyProperties(): Promise<Property[]> {
        const response = await api.get('/properties/my/properties');
        return response.data;
    },

    // Get property by ID
    async getById(id: string): Promise<Property> {
        const response = await api.get(`/properties/id/${id}`);
        return response.data;
    },

    // Get property by slug (public)
    async getBySlug(slug: string): Promise<Property> {
        const response = await api.get(`/properties/${slug}`);
        return response.data;
    },

    // Create new property
    async create(data: CreatePropertyDto): Promise<Property> {
        const response = await api.post('/properties', data);
        return response.data;
    },

    // Update property
    async update(id: string, data: UpdatePropertyDto): Promise<Property> {
        const response = await api.put(`/properties/${id}`, data);
        return response.data;
    },

    // Delete property
    async delete(id: string): Promise<void> {
        await api.delete(`/properties/${id}`);
    },

    // Admin: Verify property
    async verify(id: string): Promise<Property> {
        const response = await api.put(`/properties/${id}/verify`);
        return response.data;
    },

    // Admin: Toggle property active status
    async toggleActive(id: string, isActive: boolean): Promise<Property> {
        const response = await api.put(`/properties/${id}/toggle-active`, { isActive });
        return response.data;
    },
};

export default propertyService;
