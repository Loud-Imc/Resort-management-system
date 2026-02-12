import api from './api';
import type { Booking, CreateBookingDto, CheckAvailabilityDto, PriceCalculationDto, PriceCalculationResult } from '../types/booking';

export const bookingsService = {
    // Get all bookings with filtering
    getAll: async (params?: { status?: string; roomTypeId?: string; propertyId?: string }) => {
        const { data } = await api.get<Booking[]>('/bookings', { params });
        return data;
    },

    // Get single booking
    getById: async (id: string) => {
        const { data } = await api.get<Booking>(`/bookings/${id}`);
        return data;
    },

    // Check availability
    checkAvailability: async (data: CheckAvailabilityDto) => {
        const response = await api.post<{ available: boolean; availableRooms: number }>(
            '/bookings/check-availability',
            data
        );
        return response.data;
    },

    // Calculate price
    calculatePrice: async (data: PriceCalculationDto) => {
        const response = await api.post<PriceCalculationResult>('/bookings/calculate-price', data);
        return response.data;
    },

    // Create booking
    create: async (data: CreateBookingDto) => {
        const response = await api.post<Booking>('/bookings', data);
        return response.data;
    },

    // Check in
    checkIn: async (id: string) => {
        const { data } = await api.post<Booking>(`/bookings/${id}/check-in`);
        return data;
    },

    // Check out
    checkOut: async (id: string) => {
        const { data } = await api.post<Booking>(`/bookings/${id}/check-out`);
        return data;
    },

    // Cancel booking
    cancel: async (id: string, reason?: string) => {
        const { data } = await api.post<Booking>(`/bookings/${id}/cancel`, { reason });
        return data;
    },
};
