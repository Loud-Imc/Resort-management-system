import api from './api';

export interface GlobalSetting {
    id: string;
    key: string;
    value: any;
    description?: string;
    updatedAt: string;
}

export const settingsService = {
    getAll: async () => {
        const response = await api.get<GlobalSetting[]>('/system-settings');
        return response.data;
    },

    update: async (key: string, value: any, description?: string) => {
        const response = await api.patch<GlobalSetting>('/system-settings', { key, value, description });
        return response.data;
    }
};
