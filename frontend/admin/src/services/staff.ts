import api from './api';

export interface PropertyStaff {
    id: string;
    role: string;
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
        const response = await api.get(`/properties/${propertyId}/staff`);
        return response.data;
    },

    addStaff: async (propertyId: string, userId: string, role: string): Promise<PropertyStaff> => {
        const response = await api.post(`/properties/${propertyId}/staff`, { userId, role });
        return response.data;
    },

    removeStaff: async (propertyId: string, userId: string): Promise<void> => {
        await api.delete(`/properties/${propertyId}/staff/${userId}`);
    },
};

export default staffService;
