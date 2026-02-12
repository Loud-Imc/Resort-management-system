import api from './api';
import type { User, CreateUserDto, UpdateUserDto } from '../types/user';

export const usersService = {
    getAll: async (params?: { propertyId?: string }) => {
        const { data } = await api.get<User[]>('/users', { params });
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<User>(`/users/${id}`);
        return data;
    },

    create: async (data: CreateUserDto) => {
        const { data: created } = await api.post<User>('/users', data);
        return created;
    },

    update: async (id: string, data: UpdateUserDto) => {
        const { data: updated } = await api.patch<User>(`/users/${id}`, data);
        return updated;
    },

    delete: async (id: string) => {
        await api.delete(`/users/${id}`);
    },
};
