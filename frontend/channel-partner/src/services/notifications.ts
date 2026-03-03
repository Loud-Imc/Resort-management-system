import api from './api';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  data: any;
  createdAt: string;
}

export const notificationsService = {
  getAll: async () => {
    const response = await api.get<Notification[]>('/notifications');
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data;
  },

  markAsRead: async (id: string) => {
    const response = await api.patch<Notification>(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  delete: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
