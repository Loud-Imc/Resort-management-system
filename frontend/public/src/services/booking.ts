import api from './api';
import { BookingSearchParams, CreateBookingDto } from '../types';

export const bookingService = {
    checkAvailability: async (params: BookingSearchParams) => {
        // Use the new search endpoint
        const { data } = await api.post<{ availableRoomTypes: any[] }>('/bookings/search', {
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.adults,
            children: params.children,
            location: params.location,
            type: params.type,
            includeSoldOut: params.includeSoldOut
        });
        return data;
    },

    // Alias for compatibility
    searchRooms: async (params: BookingSearchParams) => {
        return bookingService.checkAvailability(params);
    },

    createBooking: async (data: CreateBookingDto) => {
        const { data: response } = await api.post('/bookings/public', data);
        return response;
    },

    createAuthenticatedBooking: async (data: CreateBookingDto) => {
        const { data: response } = await api.post('/bookings', data);
        return response;
    },

    getMyBookings: async () => {
        const { data } = await api.get<any[]>('/bookings');
        return data;
    },

    getFeaturedRooms: async () => {
        const { data } = await api.get<any[]>('/room-types?publicOnly=true');
        return data;
    },

    getRoomType: async (id: string) => {
        const { data } = await api.get(`/room-types/${id}`);
        return data;
    },

    calculatePrice: async (params: {
        roomTypeId: string;
        checkInDate: string;
        checkOutDate: string;
        adultsCount: number;
        childrenCount: number;
        couponCode?: string;
        referralCode?: string;
    }) => {
        const { data } = await api.post('/bookings/calculate-price', params);
        return data;
    },

    getBookingById: async (id: string) => {
        const { data } = await api.get(`/bookings/${id}`);
        return data;
    }
};
