import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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
    event?: {
        title: string;
        date: string;
        location: string;
    };
    user?: {
        firstName: string;
        lastName: string;
        email: string;
    };
}

const eventBookingAdminService = {
    getAll: async () => {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${API_URL}/event-bookings/admin/all`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data as EventBooking[];
    },

    verifyTicket: async (ticketId: string) => {
        const token = localStorage.getItem('token');
        const response = await axios.patch(`${API_URL}/event-bookings/verify/${ticketId}`, {}, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return response.data as EventBooking;
    },
};

export default eventBookingAdminService;
