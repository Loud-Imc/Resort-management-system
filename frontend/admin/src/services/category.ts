import api from './api';
import { PropertyCategory, CreatePropertyCategoryDto, UpdatePropertyCategoryDto } from '../types/category';

export const categoryService = {
    async getAll(includeInactive = false): Promise<PropertyCategory[]> {
        const response = await api.get('/property-categories', {
            params: { all: includeInactive }
        });
        return response.data;
    },

    async getById(id: string): Promise<PropertyCategory> {
        const response = await api.get(`/property-categories/${id}`);
        return response.data;
    },

    async create(data: CreatePropertyCategoryDto): Promise<PropertyCategory> {
        const response = await api.post('/property-categories', data);
        return response.data;
    },

    async update(id: string, data: UpdatePropertyCategoryDto): Promise<PropertyCategory> {
        const response = await api.patch(`/property-categories/${id}`, data);
        return response.data;
    },

    async delete(id: string): Promise<void> {
        await api.delete(`/property-categories/${id}`);
    }
};

export default categoryService;
