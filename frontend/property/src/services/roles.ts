import api from './api';

export interface Role {
    id: string;
    name: string;
    description?: string;
    category?: 'SYSTEM' | 'PROPERTY' | 'EVENT';
    isSystem: boolean;
    permissions?: string[];
}

export const rolesService = {
    getAll: async (): Promise<Role[]> => {
        const { data } = await api.get<Role[]>('/roles');
        return data;
    },

    getById: async (id: string): Promise<Role> => {
        const { data } = await api.get<Role>(`/roles/${id}`);
        return data;
    },

    getPermissions: async (): Promise<any[]> => {
        const { data } = await api.get<any[]>('/roles/permissions');
        return data;
    },

    create: async (data: any): Promise<Role> => {
        const { data: createdRole } = await api.post<Role>('/roles', data);
        return createdRole;
    },

    update: async (id: string, data: any): Promise<Role> => {
        const { data: updatedRole } = await api.patch<Role>(`/roles/${id}`, data);
        return updatedRole;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/roles/${id}`);
    },

    getRoles: async (params?: { propertyId?: string, category?: string }): Promise<Role[]> => {
        const { data } = await api.get<Role[]>('/roles', { params });
        return data;
    },
};

