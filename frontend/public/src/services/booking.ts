import api from './api';
import { BookingSearchParams, CreateBookingDto, AvailabilityResponse } from '../types';

export const bookingService = {
    checkAvailability: async (params: BookingSearchParams) => {
        const { data } = await api.post<AvailabilityResponse>('/bookings/search', {
            checkInDate: params.checkInDate,
            checkOutDate: params.checkOutDate,
            adults: params.adults,
            children: params.children,
            childAges: params.childAges,
            infants: params.infants,
            location: params.location,
            type: params.type,
            categoryId: params.categoryId,
            includeSoldOut: params.includeSoldOut,
            rooms: params.rooms,
            latitude: params.latitude,
            longitude: params.longitude,
            radius: params.radius,
            currency: params.currency,
            propertyId: params.propertyId,
            isGroupBooking: params.isGroupBooking,
            groupSize: params.groupSize,
            includeFlexibleDates: params.includeFlexibleDates,
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
        const { data } = await api.get<any[]>('/bookings/me');
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
        roomTypeId?: string;
        propertyId?: string;
        roomAllocations?: any[];
        checkInDate: string;
        checkOutDate: string;
        adultsCount?: number;
        childrenCount?: number;
        childAges?: number[];
        infantsCount?: number;
        roomsCount?: number;
        roomCount?: number;
        couponCode?: string;
        referralCode?: string;
        currency?: string;
        isGroupBooking?: boolean;
        groupSize?: number;
        generalCode?: string;
        ratePlanId?: string;
        mealPlan?: string;
        isAcSelected?: boolean;
    }) => {
        const { data } = await api.post('/bookings/calculate-price', params);
        return data;
    },

    getBookingById: async (id: string) => {
        const { data } = await api.get(`/bookings/public/${id}`);
        return data;
    },

    cancelBooking: async (id: string, reason?: string) => {
        const { data } = await api.post(`/bookings/${id}/cancel`, { reason });
        return data;
    }
};
