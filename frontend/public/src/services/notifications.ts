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
    async getAll() {
        const response = await api.get<Notification[]>('/notifications');
        return response.data;
    },

    async getUnreadCount() {
        const response = await api.get<{ count: number }>('/notifications/unread-count');
        return response.data;
    },

    async markAsRead(id: string) {
        const response = await api.patch<Notification>(`/notifications/${id}/read`);
        return response.data;
    },

    async markAllAsRead() {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    },

    async delete(id: string) {
        const response = await api.delete(`/notifications/${id}`);
        return response.data;
    }
};
