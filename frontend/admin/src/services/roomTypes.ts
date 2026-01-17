import api from './api';
import type { RoomType, CreateRoomTypeDto, UpdateRoomTypeDto } from '../types/room';

export const roomTypesService = {
    getAll: async () => {
        const { data } = await api.get<RoomType[]>('/room-types');
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<RoomType>(`/room-types/${id}`);
        return data;
    },

    create: async (data: CreateRoomTypeDto) => {
        const { data: created } = await api.post<RoomType>('/room-types', data);
        return created;
    },

    update: async (id: string, data: UpdateRoomTypeDto) => {
        const { data: updated } = await api.patch<RoomType>(`/room-types/${id}`, data);
        return updated;
    },

    delete: async (id: string) => {
        await api.delete(`/room-types/${id}`);
    },
};
