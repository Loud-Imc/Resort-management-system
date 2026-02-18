import api from './api';
import type { Booking, CreateBookingDto, CheckAvailabilityDto, PriceCalculationDto, PriceCalculationResult } from '../types/booking';

export const bookingsService = {
    getAll: async (params?: { status?: string; roomTypeId?: string; propertyId?: string }) => {
        const { data } = await api.get<Booking[]>('/bookings', { params });
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<Booking>(`/bookings/${id}`);
        return data;
    },

    checkAvailability: async (data: CheckAvailabilityDto) => {
        const response = await api.post<{ available: boolean; availableRooms: number }>(
            '/bookings/check-availability',
            data
        );
        return response.data;
    },

    calculatePrice: async (data: PriceCalculationDto) => {
        const response = await api.post<PriceCalculationResult>('/bookings/calculate-price', data);
        return response.data;
    },

    create: async (data: CreateBookingDto) => {
        const response = await api.post<Booking>('/bookings', data);
        return response.data;
    },

    checkIn: async ({ id, data: checkInData }: { id: string; data?: any }) => {
        const { data } = await api.post<Booking>(`/bookings/${id}/check-in`, checkInData);
        return data;
    },

    checkOut: async (id: string) => {
        const { data } = await api.post<Booking>(`/bookings/${id}/check-out`);
        return data;
    },

    cancel: async (id: string, reason?: string) => {
        const { data } = await api.post<Booking>(`/bookings/${id}/cancel`, { reason });
        return data;
    },
};
