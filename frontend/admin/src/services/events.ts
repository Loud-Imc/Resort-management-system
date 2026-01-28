import api from './api';
import { Event, CreateEventDto } from '../types/event';

export const eventsService = {
    getAll: async () => {
        const response = await api.get<Event[]>('/events');
        return response.data;
    },

    getAllAdmin: async () => {
        const response = await api.get<Event[]>('/events/admin/all');
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<Event>(`/events/${id}`);
        return response.data;
    },

    create: async (data: CreateEventDto) => {
        const response = await api.post<Event>('/events', data);
        return response.data;
    },

    update: async (id: string, data: Partial<CreateEventDto> & { status?: string }) => {
        const response = await api.patch<Event>(`/events/${id}`, data);
        return response.data;
    },

    delete: async (id: string) => {
        const response = await api.delete(`/events/${id}`);
        return response.data;
    },

    approve: async (id: string) => {
        const response = await api.patch<Event>(`/events/${id}/approve`);
        return response.data;
    },
};
