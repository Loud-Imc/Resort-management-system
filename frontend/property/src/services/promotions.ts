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
  paymentId?: string;
  createdAt: string;
}

export interface AvailabilityResponse {
  city: string;
  activeCount: number;
  availableSlots: number;
  isFull: boolean;
}

export const promotionsService = {
  getAll: async (params?: { propertyId?: string; status?: string }): Promise<PromotionRequest[]> => {
    const response = await api.get('/promotions', { params });
    return response.data;
  },

  getAvailability: async (propertyId: string): Promise<AvailabilityResponse> => {
    const response = await api.get(`/promotions/availability/${propertyId}`);
    return response.data;
  },

  submit: async (propertyId: string, data: { type: string; startDate: string; endDate: string }): Promise<PromotionRequest> => {
    const response = await api.post(`/promotions/requests/${propertyId}`, data);
    return response.data;
  },

  initiatePayment: async (id: string): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> => {
    const response = await api.post(`/promotions/${id}/initiate-payment`);
    return response.data;
  },

  verifyPayment: async (id: string, data: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string }): Promise<PromotionRequest> => {
    const response = await api.post(`/promotions/${id}/verify-payment`, data);
    return response.data;
  },
};
