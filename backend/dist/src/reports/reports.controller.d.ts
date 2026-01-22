import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly reportsService;
    constructor(reportsService: ReportsService);
    getDashboardStats(): Promise<{
        date: Date;
        checkIns: number;
        checkOuts: number;
        occupancy: {
            total: number;
            occupied: number;
            percentage: number;
        };
        revenue: number | import("@prisma/client/runtime/library").Decimal;
        bookingsCreated: number;
        roomStatusSummary: {
            AVAILABLE: number;
            RESERVED: number;
            OCCUPIED: number;
            MAINTENANCE: number;
            BLOCKED: number;
        };
        superAdmin: {
            totalProperties: number;
            activeProperties: number;
            totalChannelPartners: number;
            activeChannelPartners: number;
            pendingCPCommissions: number | import("@prisma/client/runtime/library").Decimal;
        };
    }>;
    getFinancialReport(startDate: string, endDate: string): Promise<{
        period: {
            start: Date;
            end: Date;
        };
        summary: {
            totalIncome: number;
            totalExpenses: number;
            netProfit: number;
            profitMargin: number;
        };
        incomeBySource: {
            source: import(".prisma/client").$Enums.IncomeSource;
            _sum: {
                amount: import("@prisma/client/runtime/library").Decimal | null;
            };
        }[];
        expensesByCategory: {
            category: {
                name: string;
            };
            _sum: {
                amount: number;
            };
        }[];
    }>;
    getOccupancyReport(startDate: string, endDate: string): Promise<{
        startDate: Date;
        endDate: Date;
        averageOccupancy: number;
        dailyStats: any[];
    }>;
}
