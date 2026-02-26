import api from './api';

export interface Review {
    id: string;
    rating: number;
    comment?: string;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
        avatar?: string;
    };
    roomType?: {
        name: string;
    };
}

export interface ReviewStats {
    average: number;
    count: number;
}

export const reviewService = {
    create: async (data: {
        propertyId: string;
        roomTypeId?: string;
        rating: number;
        comment?: string;
    }) => {
        const response = await api.post<Review>('/reviews', data);
        return response.data;
    },

    getForProperty: async (propertyId: string) => {
        const response = await api.get<Review[]>(`/reviews/property/${propertyId}`);
        return response.data;
    },

    getForRoomType: async (roomTypeId: string) => {
        const response = await api.get<Review[]>(`/reviews/room-type/${roomTypeId}`);
        return response.data;
    },

    getStats: async (propertyId: string) => {
        const response = await api.get<ReviewStats>(`/reviews/stats/${propertyId}`);
        return response.data;
    }
};
