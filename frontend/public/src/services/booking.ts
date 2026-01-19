import api from './api';
import { BookingSearchParams, CreateBookingDto } from '../types';

export const bookingService = {
    checkAvailability: async (params: BookingSearchParams) => {
        // Use the new search endpoint
        const { data } = await api.post<{ availableRoomTypes: any[] }>('/bookings/search', {
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.adults,
            children: params.children
        });
        return data;
    },

    createBooking: async (data: CreateBookingDto) => {
        const { data: response } = await api.post('/bookings/public', data);
        return response;
    },

    getFeaturedRooms: async () => {
        const { data } = await api.get<any[]>('/room-types?publicOnly=true');
        return data;
    }
};
