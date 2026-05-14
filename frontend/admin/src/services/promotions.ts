import api from './api';

export interface PromotionRequest {
  id: string;
  propertyId: string;
  type: 'HOMEPAGE_FEATURED' | 'SEARCH_SPONSORED';
  status: 'PENDING_APPROVAL' | 'WAITLISTED' | 'PAYMENT_PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED';
  startDate: string;
  endDate: string;
  price: string;
  paymentDeadline?: string;
  createdAt: string;
  property: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
}

export const promotionsService = {
  getAll: async (params?: { status?: string; district?: string }): Promise<PromotionRequest[]> => {
    const response = await api.get('/promotions', { params });
    return response.data;
  },

  approve: async (id: string, price: number): Promise<PromotionRequest> => {
    const response = await api.post(`/promotions/${id}/approve`, { price });
    return response.data;
  },

  reject: async (id: string): Promise<PromotionRequest> => {
    const response = await api.post(`/promotions/${id}/reject`);
    return response.data;
  },
};
