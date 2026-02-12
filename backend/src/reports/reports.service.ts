import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    /**
     * Get dashboard statistics (Today's overview)
     */
    async getDashboardStats(user: any) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        // Define property scoping
        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            // Filter by properties where user is staff or owner
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        // 1. Today's check-ins
        const checkIns = await this.prisma.booking.count({
            where: {
                checkInDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                room: { property: propertyFilter }
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
                room: { property: propertyFilter }
            },
        });

        // 3. Current Occupancy
        const totalRooms = await this.prisma.room.count({
            where: { isEnabled: true, property: propertyFilter },
        });

        const occupiedRooms = await this.prisma.booking.count({
            where: {
                status: 'CHECKED_IN',
                checkInDate: { lte: new Date() },
                checkOutDate: { gt: new Date() },
                room: { property: propertyFilter }
            },
        });

        const bookedToday = await this.prisma.booking.count({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow
                },
                room: { property: propertyFilter }
            }
        })

        // 3.5 Room Status Summary
        const rawAvailableCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'AVAILABLE', property: propertyFilter }
        });

        const reservedCount = await this.prisma.room.count({
            where: {
                isEnabled: true,
                status: 'AVAILABLE',
                property: propertyFilter,
                bookings: {
                    some: {
                        status: 'CONFIRMED',
                        checkInDate: { lte: today },
                        checkOutDate: { gt: today }
                    }
                }
            }
        });

        const availableCount = rawAvailableCount - reservedCount;

        const occupiedCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'OCCUPIED', property: propertyFilter }
        });
        const maintenanceCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'MAINTENANCE', property: propertyFilter }
        });
        const blockedCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'BLOCKED', property: propertyFilter }
        });

        // 4. Today's Revenue (Income created today)
        const incomeToday = await this.prisma.income.aggregate({
            where: {
                date: {
                    gte: today,
                    lt: tomorrow,
                },
                OR: [
                    { booking: { property: propertyFilter } },
                    { eventBooking: { event: { property: propertyFilter } } }
                ]
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
            revenue: Number(incomeToday._sum.amount || 0),
            bookingsCreated: bookedToday,
            roomStatusSummary: {
                AVAILABLE: availableCount,
                RESERVED: reservedCount,
                OCCUPIED: occupiedCount,
                MAINTENANCE: maintenanceCount,
                BLOCKED: blockedCount
            },
            // Super Admin Stats (Only if global admin)
            ...(isGlobalAdmin && {
                superAdmin: {
                    totalProperties: await this.prisma.property.count(),
                    activeProperties: await this.prisma.property.count({ where: { isActive: true } }),
                    totalChannelPartners: await this.prisma.channelPartner.count(),
                    activeChannelPartners: await this.prisma.channelPartner.count({ where: { isActive: true } }),
                    pendingCPCommissions: await this.prisma.cPTransaction.aggregate({
                        where: { type: 'COMMISSION' },
                        _sum: { amount: true }
                    }).then(res => Number(res._sum.amount || 0))
                }
            })
        };
    }

    /**
     * Get financial report
     */
    async getFinancialReport(user: any, startDate: Date, endDate: Date) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        // 1. Total Income
        const income = await this.prisma.income.aggregate({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                OR: [
                    { booking: { property: propertyFilter } },
                    { eventBooking: { event: { property: propertyFilter } } }
                ]
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
                property: propertyFilter
            },
            _sum: {
                amount: true,
            },
        });

        const totalIncome = Number(income._sum?.amount || 0);
        const totalExpense = Number(expense._sum?.amount || 0);
        const netProfit = totalIncome - totalExpense;

        // 3. Income by Source
        const incomeBySource = await this.prisma.income.groupBy({
            by: ['source'],
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                propertyId: propertyFilter.OR ? { in: (await this.prisma.property.findMany({ where: propertyFilter, select: { id: true } })).map(p => p.id) } : undefined
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
                },
                propertyId: propertyFilter.OR ? { in: (await this.prisma.property.findMany({ where: propertyFilter, select: { id: true } })).map(p => p.id) } : undefined
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
    async getOccupancyReport(user: any, startDate: Date, endDate: Date) {
        // Get all dates in range
        const dates: Date[] = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        const report: any[] = [];
        const totalRooms = await this.prisma.room.count({
            where: { isEnabled: true, property: propertyFilter }
        });

        for (const date of dates) {
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);

            const occupied = await this.prisma.booking.count({
                where: {
                    status: { in: ['CHECKED_IN', 'CONFIRMED'] }, // Include confirmed for future dates
                    checkInDate: { lte: date },
                    checkOutDate: { gt: date },
                    room: { property: propertyFilter }
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
