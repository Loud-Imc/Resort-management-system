import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get dashboard statistics (Today's overview)
     */
    async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // 1. Today's check-ins
        const checkIns = await this.prisma.booking.count({
            where: {
                checkInDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            },
        });

        // 2. Today's check-outs
        const checkOuts = await this.prisma.booking.count({
            where: {
                checkOutDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            },
        });

        // 3. Current Occupancy
        const totalRooms = await this.prisma.room.count({
            where: { isEnabled: true },
        });

        const occupiedRooms = await this.prisma.booking.count({
            where: {
                status: 'CHECKED_IN',
                checkInDate: { lte: new Date() },
                checkOutDate: { gt: new Date() },
            },
        });

        const bookedToday = await this.prisma.booking.count({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow
                }
            }
        })

        // 4. Today's Revenue (Income created today)
        const incomeToday = await this.prisma.income.aggregate({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
            },
            _sum: {
                amount: true,
            },
        });

        return {
            date: today,
            checkIns,
            checkOuts,
            occupancy: {
                total: totalRooms,
                occupied: occupiedRooms,
                percentage: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
            },
            revenue: incomeToday._sum.amount || 0,
            bookingsCreated: bookedToday
        };
    }

    /**
     * Get financial report
     */
    async getFinancialReport(startDate: Date, endDate: Date) {
        // 1. Total Income
        const income = await this.prisma.income.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // 2. Total Expenses
        const expense = await this.prisma.expense.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        const totalIncome = Number(income._sum.amount || 0);
        const totalExpense = Number(expense._sum.amount || 0);
        const netProfit = totalIncome - totalExpense;

        // 3. Income by Source
        const incomeBySource = await this.prisma.income.groupBy({
            by: ['source'],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            _sum: {
                amount: true,
            },
        });

        // 4. Expense by Category
        const expenses = await this.prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate
                }
            },
            include: {
                category: true
            }
        })

        const expenseByCategory = expenses.reduce((acc, curr) => {
            const catName = curr.category.name;
            if (!acc[catName]) acc[catName] = 0;
            acc[catName] += Number(curr.amount);
            return acc;
        }, {} as Record<string, number>)


        return {
            period: {
                start: startDate,
                end: endDate,
            },
            summary: {
                totalIncome,
                totalExpenses: totalExpense,
                netProfit,
                profitMargin: totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0,
            },
            incomeBySource: incomeBySource.map(item => ({
                source: item.source,
                _sum: { amount: item._sum.amount }
            })),
            expensesByCategory: Object.entries(expenseByCategory).map(([category, amount]) => ({
                category: { name: category },
                _sum: { amount }
            })),
        };
    }

    /**
     * Get occupancy report
     */
    async getOccupancyReport(startDate: Date, endDate: Date) {
        // Get all dates in range
        const dates: Date[] = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const report: any[] = [];
        const totalRooms = await this.prisma.room.count({ where: { isEnabled: true } });

        for (const date of dates) {
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);

            const occupied = await this.prisma.booking.count({
                where: {
                    status: { in: ['CHECKED_IN', 'CONFIRMED'] }, // Include confirmed for future dates
                    checkInDate: { lte: date },
                    checkOutDate: { gt: date },
                },
            });

            report.push({
                date,
                totalRooms,
                occupied,
                occupancyRate: totalRooms > 0 ? Math.round((occupied / totalRooms) * 100) : 0,
            });
        }

        return {
            startDate,
            endDate,
            averageOccupancy: Math.round(report.reduce((sum, item) => sum + item.occupancyRate, 0) / report.length),
            dailyStats: report
        };
    }
}
