import api from './api';

export interface ChannelPropertyMapping {
  id: string;
  propertyId: string;
  channelName: string;
  externalPropertyId: string;
  isActive: boolean;
  roomMappings: ChannelRoomTypeMapping[];
}

export interface ChannelRoomTypeMapping {
  id: string;
  propertyMappingId: string;
  roomTypeId: string;
  externalRoomTypeId: string;
  externalRatePlanId?: string;
  roomType?: {
    id: string;
    name: string;
    basePrice: number;
  };
}

export interface ChannelCatalogField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean' | 'info';
  required?: boolean;
  placeholder?: string;
  options?: string[];
  default?: any;
  description?: string;
}

export interface ChannelCatalogItem {
  key: string;
  title: string;
  category: string;
  color: string;
  fields: ChannelCatalogField[];
}

export const channelsService = {
  getCatalog: async (): Promise<ChannelCatalogItem[]> => {
    const response = await api.get('/channels/catalog');
    return response.data;
  },

  getMappings: async (propertyId: string): Promise<ChannelPropertyMapping[]> => {
    const response = await api.get(`/channels/mappings/${propertyId}`);
    return response.data;
  },

  enableSync: async (propertyId: string, channelName = 'CHANNEX'): Promise<any> => {
    const response = await api.post(`/channels/enable/${propertyId}?channelName=${channelName}`);
    return response.data;
  },

  disableSync: async (propertyId: string, channelName = 'CHANNEX'): Promise<any> => {
    const response = await api.post(`/channels/disable/${propertyId}?channelName=${channelName}`);
    return response.data;
  },

  pushAri: async (propertyId: string, days = 60): Promise<any> => {
    const response = await api.post(`/channels/push/${propertyId}?days=${days}`);
    return response.data;
  },

  simulateBooking: async (propertyId: string, otaName = 'MakeMyTrip'): Promise<any> => {
    const response = await api.post(`/channels/simulate-booking/${propertyId}?otaName=${encodeURIComponent(otaName)}`);
    return response.data;
  },

  connectOta: async (propertyId: string, otaKey: string, hotelId: string, settings: any): Promise<any> => {
    const response = await api.post('/channels/connect-ota', {
      propertyId,
      otaKey,
      hotelId,
      settings,
    });
    return response.data;
  },

  disconnectOta: async (propertyId: string, otaKey: string): Promise<any> => {
    const response = await api.post('/channels/disconnect-ota', {
      propertyId,
      otaKey,
    });
    return response.data;
  },

  getIframeUrl: async (propertyId: string): Promise<{ url: string }> => {
    const response = await api.get(`/channels/iframe-url/${propertyId}`);
    return response.data;
  },

  updateCurrency: async (propertyId: string, currency: string): Promise<any> => {
    const response = await api.post(`/channels/update-currency/${propertyId}`, { currency });
    return response.data;
  },
};
