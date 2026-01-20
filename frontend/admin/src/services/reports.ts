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
}

export const reportsService = {
    getDashboardStats: async () => {
        const { data } = await api.get<DashboardStats>('/reports/dashboard');
        return data;
    },

    getFinancialReport: async (startDate: string, endDate: string) => {
        const { data } = await api.get<any>('/reports/financial', {
            params: { startDate, endDate },
        });
        return data;
    },
};
