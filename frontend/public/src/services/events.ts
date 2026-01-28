import api from './api';

export interface Event {
    id: string;
    title: string;
    description?: string;
    date: string;
    location: string;
    price?: string;
    images: string[];
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
    organizerType: 'PROPERTY' | 'EXTERNAL';
    propertyId?: string;
    property?: {
        id: string;
        name: string;
    };
}

const eventsService = {
    getAll: async (params?: { propertyId?: string }) => {
        const response = await api.get<Event[]>('/events', { params });
        return response.data;
    },

    getById: async (id: string) => {
        const response = await api.get<Event>(`/events/${id}`);
        return response.data;
    },
};

export default eventsService;
