import api from './api';
import type { User } from '../types/user';

export const usersService = {
    getAll: async (params?: any) => {
        const { data } = await api.get<User[]>('/users', { params });
        return data;
    },
    getById: async (id: string) => {
        const { data } = await api.get<User>(`/users/${id}`);
        return data;
    },
    findByPhone: async (phone: string) => {
        const { data } = await api.get<User>(`/users/by-phone/${encodeURIComponent(phone)}`);
        return data;
    },
    create: async (userData: any) => {
        const { data } = await api.post<User>('/users', userData);
        return data;
    },
    update: async (id: string, userData: any) => {
        const { data } = await api.put<User>(`/users/${id}`, userData);
        return data;
    },
    delete: async (id: string) => {
        await api.delete(`/users/${id}`);
    },
    downloadAllGuestsReport: async (filters: { userIds: string[] }) => {
        const response = await api.post('/users/report/guests/pdf', filters, {
            responseType: 'blob'
        });
        return response.data;
    },
    downloadIndividualGuestReport: async (id: string, filters: any) => {
        const response = await api.get(`/users/${id}/report/pdf`, {
            params: filters,
            responseType: 'blob'
        });
        return response.data;
    }
};
