import api from './api';
import type { Role } from '../types/user';

export const rolesService = {
    getAll: async () => {
        const { data } = await api.get<Role[]>('/roles');
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<Role>(`/roles/${id}`);
        return data;
    },

    create: async (data: Partial<Role>) => {
        const { data: created } = await api.post<Role>('/roles', data);
        return created;
    },

    update: async (id: string, data: Partial<Role>) => {
        const { data: updated } = await api.patch<Role>(`/roles/${id}`, data);
        return updated;
    },

    delete: async (id: string) => {
        await api.delete(`/roles/${id}`);
    },

    getPermissions: async () => {
        const { data } = await api.get<{ id: string; name: string; module: string; description: string }[]>('/roles/permissions');
        return data;
    }
};
