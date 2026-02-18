import api from './api';
import type { Room, CreateRoomDto, UpdateRoomDto, BlockRoomDto } from '../types/room';

export const roomsService = {
    getAll: async (params?: { status?: string; roomTypeId?: string; propertyId?: string }) => {
        const { data } = await api.get<Room[]>('/rooms', { params });
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<Room>(`/rooms/${id}`);
        return data;
    },

    create: async (data: CreateRoomDto) => {
        const response = await api.post<Room>('/rooms', data);
        return response.data;
    },

    update: async (id: string, data: UpdateRoomDto) => {
        const response = await api.patch<Room>(`/rooms/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        await api.delete(`/rooms/${id}`);
    },

    block: async (id: string, data: BlockRoomDto) => {
        const response = await api.post(`/rooms/${id}/block`, data);
        return response.data;
    },

    unblock: async (id: string) => {
        const response = await api.post(`/rooms/${id}/unblock`);
        return response.data;
    },
};
