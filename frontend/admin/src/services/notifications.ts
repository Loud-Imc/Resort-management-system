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
    async getAll(role?: string) {
        const response = await api.get<Notification[]>('/notifications', { params: { role } });
        return response.data;
    },

    async getUnreadCount(role?: string) {
        const response = await api.get<{ count: number }>('/notifications/unread-count', { params: { role } });
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
    },

    async broadcast(payload: {
        title: string;
        message: string;
        type: string;
        targetRoles?: string[];
        targetUsers?: string[];
        propertyId?: string;
    }) {
        const response = await api.post('/notifications/broadcast', payload);
        return response.data;
    }
};
