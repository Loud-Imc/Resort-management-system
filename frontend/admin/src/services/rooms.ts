import api from './api';
import type { Room, CreateRoomDto, UpdateRoomDto, BlockRoomDto } from '../types/room';

export const roomsService = {
    // Get all rooms
    getAll: async (params?: { status?: string; roomTypeId?: string }) => {
        const { data } = await api.get<Room[]>('/rooms', { params });
        return data;
    },

    // Get single room
    getById: async (id: string) => {
        const { data } = await api.get<Room>(`/rooms/${id}`);
        return data;
    },

    // Create room
    create: async (data: CreateRoomDto) => {
        const response = await api.post<Room>('/rooms', data);
        return response.data;
    },

    // Update room
    update: async (id: string, data: UpdateRoomDto) => {
        const response = await api.patch<Room>(`/rooms/${id}`, data);
        return response.data;
    },

    // Delete room
    delete: async (id: string) => {
        await api.delete(`/rooms/${id}`);
    },

    // Block room
    block: async (id: string, data: BlockRoomDto) => {
        const response = await api.post(`/rooms/${id}/block`, data);
        return response.data;
    },

    // Unblock room
    unblock: async (id: string) => {
        const response = await api.post(`/rooms/${id}/unblock`);
        return response.data;
    }
};
