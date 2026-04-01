import api from './api';

export interface PropertyStaff {
    id: string;
    role: { name: string } | string;
    propertyId: string;
    userId: string;
    user: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
}

const staffService = {
    getStaff: async (propertyId: string): Promise<PropertyStaff[]> => {
        const { data } = await api.get<PropertyStaff[]>(`/properties/${propertyId}/staff`);
        return data;
    },
    addStaff: async (propertyId: string, userId: string, roleId: string): Promise<PropertyStaff> => {
        const { data } = await api.post<PropertyStaff>(`/properties/${propertyId}/staff`, { userId, roleId });
        return data;
    },
    removeStaff: async (propertyId: string, userId: string): Promise<void> => {
        await api.delete(`/properties/${propertyId}/staff/${userId}`);
    },
    updateStaff: async (propertyId: string, userId: string, data: { roleId?: string; firstName?: string; lastName?: string; phone?: string; email?: string }): Promise<PropertyStaff> => {
        const { data: response } = await api.patch<PropertyStaff>(`/properties/${propertyId}/staff/${userId}`, data);
        return response;
    },
};

export default staffService;
