import api from './api';

export interface PropertyIcal {
  id: string;
  propertyId: string;
  icalUrl: string;
  platformName: string;
  lastSyncedAt: string | null;
  status: 'ACTIVE' | 'FAILED';
  createdAt: string;
  updatedAt: string;
}

export const icalService = {
  getLinks: async (propertyId: string): Promise<PropertyIcal[]> => {
    const response = await api.get(`/ical/settings/${propertyId}`);
    return response.data;
  },

  addLink: async (propertyId: string, data: { icalUrl: string; platformName: string; bookingSourceId?: string }): Promise<PropertyIcal> => {
    const response = await api.post(`/ical/settings/${propertyId}`, data);
    return response.data;
  },

  deleteLink: async (syncId: string): Promise<void> => {
    await api.delete(`/ical/settings/${syncId}`);
  },

  triggerSync: async (syncId: string): Promise<void> => {
    await api.post(`/ical/sync/${syncId}`);
  }
};
