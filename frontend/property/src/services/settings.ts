import api from './api';

export interface PublicSettings {
    DEFAULT_PLATFORM_COMMISSION: number;
}

export const settingsService = {
    getPublicSettings: async (): Promise<PublicSettings> => {
        const response = await api.get('/system-settings/public');
        return response.data;
    },
};
