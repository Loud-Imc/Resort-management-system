import api from './api';

export interface OfflineCP {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    companyName?: string;
    defaultCommission?: number;
    notes?: string;
    isActive: boolean;
    propertyId: string;
    createdAt: string;
    updatedAt: string;
    _count?: {
        bookings: number;
    };
}

export interface CreateOfflineCpDto {
    name: string;
    phone?: string;
    email?: string;
    companyName?: string;
    defaultCommission?: number;
    notes?: string;
    propertyId: string;
}

export const offlineCpsService = {
    getAllForProperty: async (propertyId: string) => {
        const { data } = await api.get<OfflineCP[]>('/offline-cps', { params: { propertyId } });
        return data;
    },
    getOne: async (id: string) => {
        const { data } = await api.get<OfflineCP>(`/offline-cps/${id}`);
        return data;
    },
    create: async (dto: CreateOfflineCpDto) => {
        const { data } = await api.post<OfflineCP>('/offline-cps', dto);
        return data;
    },
    update: async (id: string, dto: Partial<CreateOfflineCpDto>) => {
        const { data } = await api.patch<OfflineCP>(`/offline-cps/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/offline-cps/${id}`);
        return data;
    },
};
