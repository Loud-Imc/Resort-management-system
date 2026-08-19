import api from './api';

export const otaService = {
  // Dashboard
  getDashboard: async () => {
    const { data } = await api.get('/ota-portal/dashboard');
    return data;
  },
  activatePms: async () => {
    const { data } = await api.post('/ota-portal/dashboard/activate-pms');
    return data;
  },

  // Bookings
  getBookings: async () => {
    const { data } = await api.get<any[]>('/ota-portal/bookings');
    return data;
  },
  getBooking: async (id: string) => {
    const { data } = await api.get(`/ota-portal/bookings/${id}`);
    return data;
  },
  cancelBooking: async (id: string, reason: string) => {
    const { data } = await api.post(`/ota-portal/bookings/${id}/cancel`, { reason });
    return data;
  },

  // Guests
  getGuests: async () => {
    const { data } = await api.get<any[]>('/ota-portal/guests');
    return data;
  },
  getGuestDetails: async (key: string) => {
    const { data } = await api.get(`/ota-portal/guests/${key}`);
    return data;
  },

  // Room Types
  getRoomTypes: async () => {
    const { data } = await api.get<any[]>('/ota-portal/room-types');
    return data;
  },
  createRoomType: async (dto: any) => {
    const { data } = await api.post('/ota-portal/room-types', dto);
    return data;
  },
  updateRoomType: async (id: string, dto: any) => {
    const { data } = await api.put(`/ota-portal/room-types/${id}`, dto);
    return data;
  },
  deleteRoomType: async (id: string) => {
    const { data } = await api.delete(`/ota-portal/room-types/${id}`);
    return data;
  },

  // Rooms
  getRooms: async () => {
    const { data } = await api.get<any[]>('/ota-portal/rooms');
    return data;
  },
  createRoom: async (dto: any) => {
    const { data } = await api.post('/ota-portal/rooms', dto);
    return data;
  },
  deleteRoom: async (id: string) => {
    const { data } = await api.delete(`/ota-portal/rooms/${id}`);
    return data;
  },
  getCalendarAvailability: async (startDate: string, endDate: string, roomTypeId?: string) => {
    const { data } = await api.get('/ota-portal/rooms/calendar/availability', {
      params: { startDate, endDate, roomTypeId },
    });
    return data;
  },

  // Offers & Marketing
  getOffers: async () => {
    const { data } = await api.get<any[]>('/ota-portal/offers');
    return data;
  },
  createOffer: async (dto: any) => {
    const { data } = await api.post('/ota-portal/offers', dto);
    return data;
  },
  deleteOffer: async (id: string) => {
    const { data } = await api.delete(`/ota-portal/offers/${id}`);
    return data;
  },

  // Promotional Boosters
  getPromotions: async () => {
    const { data } = await api.get<any[]>('/ota-portal/promotions');
    return data;
  },
  getPromotionsAvailability: async () => {
    const { data } = await api.get('/ota-portal/promotions/availability');
    return data;
  },
  requestPromotion: async (dto: any) => {
    const { data } = await api.post('/ota-portal/promotions', dto);
    return data;
  },
  initiatePromotionPayment: async (id: string) => {
    const { data } = await api.post(`/ota-portal/promotions/${id}/initiate-payment`);
    return data;
  },
  verifyPromotionPayment: async (id: string, verificationData: any) => {
    const { data } = await api.post(`/ota-portal/promotions/${id}/verify-payment`, verificationData);
    return data;
  },

  // My Property
  getMyProperty: async () => {
    const { data } = await api.get('/ota-portal/properties/my');
    return data;
  },
  updateMyProperty: async (dto: any) => {
    const { data } = await api.put('/ota-portal/properties/my', dto);
    return data;
  },
  getMyPolicies: async () => {
    const { data } = await api.get<any[]>('/ota-portal/properties/my/policies');
    return data;
  },
  createMyPolicy: async (dto: any) => {
    const { data } = await api.post('/ota-portal/properties/my/policies', dto);
    return data;
  },
  deleteMyPolicy: async (id: string) => {
    const { data } = await api.delete(`/ota-portal/properties/my/policies/${id}`);
    return data;
  },

  // Categories
  getCategories: async () => {
    const { data } = await api.get('/property-categories');
    return data;
  },

  // File Upload
  uploadFile: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post('/uploads', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
  // Properties switcher list
  getMyProperties: async () => {
    const { data } = await api.get('/properties/my/properties');
    return data;
  },
};
