import api from './api';

export interface Coupon {
    id: string;
    code: string;
    description?: string;
    discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
    discountValue: number;
    validFrom: string;
    validUntil: string;
    maxUses?: number;
    usedCount: number;
    minBookingAmount?: number;
    isActive: boolean;
    createdAt: string;
}

export interface Offer {
    id: string;
    name: string;
    description?: string;
    discountPercentage: number;
    startDate: string;
    endDate: string;
    isActive: boolean;
    roomTypeId: string;
    roomType?: {
        name: string;
        property: {
            name: string;
        };
    };
    createdAt: string;
}

export const discountService = {
    // Coupons
    getCoupons: async () => {
        const response = await api.get<Coupon[]>('/discounts/coupons');
        return response.data;
    },
    getCoupon: async (id: string) => {
        const response = await api.get<Coupon>(`/discounts/coupons/${id}`);
        return response.data;
    },
    createCoupon: async (data: Partial<Coupon>) => {
        const response = await api.post<Coupon>('/discounts/coupons', data);
        return response.data;
    },
    updateCoupon: async (id: string, data: Partial<Coupon>) => {
        const response = await api.put<Coupon>(`/discounts/coupons/${id}`, data);
        return response.data;
    },
    deleteCoupon: async (id: string) => {
        await api.delete(`/discounts/coupons/${id}`);
    },

    // Offers
    getOffers: async () => {
        const response = await api.get<Offer[]>('/discounts/offers');
        return response.data;
    },
    getOffer: async (id: string) => {
        const response = await api.get<Offer>(`/discounts/offers/${id}`);
        return response.data;
    },
    createOffer: async (data: Partial<Offer>) => {
        const response = await api.post<Offer>('/discounts/offers', data);
        return response.data;
    },
    updateOffer: async (id: string, data: Partial<Offer>) => {
        const response = await api.put<Offer>(`/discounts/offers/${id}`, data);
        return response.data;
    },
    deleteOffer: async (id: string) => {
        await api.delete(`/discounts/offers/${id}`);
    }
};
