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
    const { data } = await api.get<Notification[]>('/notifications');
    return data;
  },

  getUnreadCount: async () => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data;
  },

  markAsRead: async (id: string) => {
    const { data } = await api.patch<Notification>(`/notifications/${id}/read`);
    return data;
  },

  markAllAsRead: async () => {
    const { data } = await api.patch('/notifications/read-all');
    return data;
  },

  delete: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
