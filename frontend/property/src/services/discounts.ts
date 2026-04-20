import api from './api';

export interface Offer {
    id: string;
    name: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    roomTypeIds: string[];
    roomTypes?: {
        id: string;
        name: string;
        property: {
            name: string;
        };
    }[];
}

export interface CreateOfferDto {
    name: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    startDate: string;
    endDate: string;
    roomTypeIds: string[];
    isActive?: boolean;
}

export const discountsService = {
    // Offers
    getOffers: async () => {
        const response = await api.get<Offer[]>('/discounts/offers');
        return response.data;
    },

    getOffer: async (id: string) => {
        const response = await api.get<Offer>(`/discounts/offers/${id}`);
        return response.data;
    },

    createOffer: async (data: CreateOfferDto) => {
        const response = await api.post<Offer>('/discounts/offers', data);
        return response.data;
    },

    updateOffer: async (id: string, data: Partial<CreateOfferDto>) => {
        const response = await api.put<Offer>(`/discounts/offers/${id}`, data);
        return response.data;
    },

    deleteOffer: async (id: string) => {
        const response = await api.delete(`/discounts/offers/${id}`);
        return response.data;
    }
};
