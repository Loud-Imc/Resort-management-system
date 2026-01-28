import api from './api';

export interface EventBooking {
    id: string;
    eventId: string;
    userId: string;
    ticketId: string;
    amountPaid: number;
    status: 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
    checkedIn: boolean;
    checkInTime?: string;
    createdAt: string;
    event?: any;
}

export interface CreateEventBookingDto {
    eventId: string;
    guestName?: string;
    guestEmail?: string;
    guestPhone?: string;
}

const eventBookingsService = {
    create: async (data: CreateEventBookingDto) => {
        const response = await api.post('/event-bookings', data);
        return response.data as EventBooking;
    },

    getMyBookings: async () => {
        const response = await api.get('/event-bookings/my/bookings');
        return response.data as EventBooking[];
    },

    getById: async (id: string) => {
        const response = await api.get(`/event-bookings/${id}`);
        return response.data as EventBooking;
    },
};

export default eventBookingsService;
