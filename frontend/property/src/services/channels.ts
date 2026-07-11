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

export const channelsService = {
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
};
