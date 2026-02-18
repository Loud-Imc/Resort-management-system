import api from './api';
import type { Property } from '../types/property';

export const propertiesService = {
    getById: async (id: string): Promise<Property> => {
        const { data } = await api.get<Property>(`/properties/id/${id}`);
        return data;
    },

    update: async (id: string, payload: any): Promise<Property> => {
        const { data } = await api.put<Property>(`/properties/${id}`, payload);
        return data;
    },

    toggleActive: async (id: string, isActive: boolean): Promise<Property> => {
        const { data } = await api.put<Property>(`/properties/${id}/toggle-active`, { isActive });
        return data;
    },
};
