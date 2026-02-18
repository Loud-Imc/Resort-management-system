import api from './api';

export const rolesService = {
    getAll: async (params?: any) => {
        const { data } = await api.get('/roles', { params });
        return data;
    },
    getById: async (id: string) => {
        const { data } = await api.get(`/roles/${id}`);
        return data;
    },
    create: async (dto: any) => {
        const { data } = await api.post('/roles', dto);
        return data;
    },
    update: async (id: string, dto: any) => {
        const { data } = await api.put(`/roles/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/roles/${id}`);
        return data;
    },
    getPermissions: async () => {
        const { data } = await api.get('/roles/permissions');
        return data;
    },
};
