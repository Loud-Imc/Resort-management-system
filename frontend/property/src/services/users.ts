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
};
