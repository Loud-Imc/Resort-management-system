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
  getAll: async (role?: string) => {
    const response = await api.get<Notification[]>('/notifications', { params: { role } });
    return response as unknown as Notification[];
  },

  getUnreadCount: async (role?: string) => {
    const response = await api.get<{ count: number }>('/notifications/unread-count', { params: { role } });
    return response as unknown as { count: number };
  },

  markAsRead: async (id: string) => {
    const response = await api.patch<Notification>(`/notifications/${id}/read`);
    return response as unknown as Notification;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/read-all');
    return response as unknown as any;
  },

  delete: async (id: string) => {
    await api.delete(`/notifications/${id}`);
  },
};
