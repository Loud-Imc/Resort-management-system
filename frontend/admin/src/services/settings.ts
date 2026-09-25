import api from './api';

export interface GlobalSetting {
    id: string;
    key: string;
    value: any;
    description?: string;
    updatedAt: string;
}

export interface SystemHealth {
    status: 'healthy' | 'warning' | 'critical';
    timestamp: string;
    uptimeSeconds: number;
    uptimeFormatted: string;
    database: {
        status: 'healthy' | 'degraded' | 'down';
        latencyMs: number;
        size: string;
        error?: string | null;
    };
    disk: {
        totalGb: number;
        freeGb: number;
        usedGb: number;
        usedPercentage: number;
        status: 'healthy' | 'warning' | 'critical';
    };
    memory: {
        totalMb: number;
        usedMb: number;
        freeMb: number;
        usedPercentage: number;
        processRssMb: number;
        status: 'healthy' | 'warning' | 'critical';
    };
    system: {
        nodeVersion: string;
        platform: string;
        cpus: number;
    };
}

export const settingsService = {
    getAll: async () => {
        const response = await api.get<GlobalSetting[]>('/system-settings');
        return response.data;
    },

    update: async (key: string, value: any, description?: string) => {
        const response = await api.patch<GlobalSetting>('/system-settings', { key, value, description });
        return response.data;
    },

    getHealth: async () => {
        const response = await api.get<SystemHealth>('/system-settings/health');
        return response.data;
    }
};
