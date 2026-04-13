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
    getDashboardStats: async (propertyId?: string): Promise<DashboardStats> => {
        const { data } = await api.get<DashboardStats>('/reports/dashboard', {
            params: propertyId ? { propertyId } : undefined,
        });
        return data;
    },

    getFinancialReport: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<any>('/reports/financial', {
            params: { startDate, endDate, propertyId },
        });
        return data;
    },

    getFinancialDetails: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<any>('/reports/financial/details', {
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

    getRevenueReport: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get('/reports/revenue', {
            params: { propertyId, startDate, endDate },
        });
        return data;
    },

    exportExcel: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get('/reports/export/excel', {
            params: { startDate, endDate, propertyId },
            responseType: 'blob',
        });

        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Report_${startDate}_${endDate}.xlsx`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },

    exportPdf: async (startDate: string, endDate: string, propertyId?: string) => {
        console.log(`[reportsService] Exporting PDF for ${startDate} to ${endDate}`);
        try {
            const { data } = await api.get('/reports/export/pdf', {
                params: { startDate, endDate, propertyId },
                responseType: 'blob',
            });
            console.log(`[reportsService] PDF blob received, size: ${data.size} bytes`);

            const url = window.URL.createObjectURL(new Blob([data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Report_${startDate}_${endDate}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            console.log(`[reportsService] PDF download triggered`);
        } catch (error: any) {
            console.error(`[reportsService] Error exporting PDF:`, error);
            throw error;
        }
    },

    getGstReport: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<any>('/reports/gst', {
            params: { startDate, endDate, propertyId },
        });
        return data;
    },

    exportGstPdf: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get('/reports/export/gst-pdf', {
            params: { startDate, endDate, propertyId },
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `GST_Report_${startDate}_${endDate}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    },
};
