import api from './api';

export interface DashboardStats {
    date: string;
    checkIns: number;
    checkOuts: number;
    occupancy: {
        total: number;
        occupied: number;
        percentage: number;
    };
    revenue: number;
    bookingsCreated: number;
    roomStatusSummary: {
        AVAILABLE: number;
        RESERVED: number;
        OCCUPIED: number;
        MAINTENANCE: number;
        BLOCKED: number;
    };
    superAdmin?: {
        totalProperties: number;
        activeProperties: number;
        totalChannelPartners: number;
        activeChannelPartners: number;
        pendingCPCommissions: number;
        platformStats?: {
            totalVolume: number;
            count: number;
            totalFees: number;
            netEarnings: number;
        };
    };
}

export const reportsService = {
    getDashboardStats: async (propertyId?: string) => {
        const { data } = await api.get<DashboardStats>('/reports/dashboard', {
            params: { propertyId }
        });
        return data;
    },

    getFinancialReport: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<any>('/reports/financial', {
            params: { startDate, endDate, propertyId },
        });
        return data;
    },

    getOccupancyReport: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<any>('/reports/occupancy', {
            params: { startDate, endDate, propertyId },
        });
        return data;
    },

    getRoomPerformanceReport: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<any[]>('/reports/room-performance', {
            params: { startDate, endDate, propertyId },
        });
        return data;
    },

    getPartnerReport: async (startDate: string, endDate: string) => {
        const { data } = await api.get<any[]>('/reports/partners', {
            params: { startDate, endDate },
        });
        return data;
    },
};
