import { PrismaService } from '../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
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
    getFinancialReport(startDate: Date, endDate: Date): Promise<{
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
    getOccupancyReport(startDate: Date, endDate: Date): Promise<{
        startDate: Date;
        endDate: Date;
        averageOccupancy: number;
        dailyStats: any[];
    }>;
}
