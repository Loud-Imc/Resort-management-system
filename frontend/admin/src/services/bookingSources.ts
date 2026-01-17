import api from './api';

export interface BookingSource {
    id: string;
    name: string;
    description?: string;
    commission: number;
    isActive: boolean;
}

export interface CreateBookingSourceDto {
    name: string;
    description?: string;
    commission?: number;
    isActive?: boolean;
}

export interface UpdateBookingSourceDto extends Partial<CreateBookingSourceDto> { }

export const bookingSourcesService = {
    getAll: async () => {
        const { data } = await api.get<BookingSource[]>('/booking-sources');
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<BookingSource>(`/booking-sources/${id}`);
        return data;
    },

    create: async (data: CreateBookingSourceDto) => {
        const { data: response } = await api.post<BookingSource>('/booking-sources', data);
        return response;
    },

    update: async (id: string, data: UpdateBookingSourceDto) => {
        const { data: response } = await api.patch<BookingSource>(`/booking-sources/${id}`, data);
        return response;
    },

    delete: async (id: string) => {
        await api.delete(`/booking-sources/${id}`);
    }
};
