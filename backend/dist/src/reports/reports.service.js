"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ReportsService = class ReportsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const checkIns = await this.prisma.booking.count({
            where: {
                checkInDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { in: ['CONFIRMED', 'CHECKED_IN'] },
            },
        });
        const checkOuts = await this.prisma.booking.count({
            where: {
                checkOutDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
            },
        });
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
        });
        const rawAvailableCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'AVAILABLE' }
        });
        const reservedCount = await this.prisma.room.count({
            where: {
                isEnabled: true,
                status: 'AVAILABLE',
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
            where: { isEnabled: true, status: 'OCCUPIED' }
        });
        const maintenanceCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'MAINTENANCE' }
        });
        const blockedCount = await this.prisma.room.count({
            where: { isEnabled: true, status: 'BLOCKED' }
        });
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
            bookingsCreated: bookedToday,
            roomStatusSummary: {
                AVAILABLE: availableCount,
                RESERVED: reservedCount,
                OCCUPIED: occupiedCount,
                MAINTENANCE: maintenanceCount,
                BLOCKED: blockedCount
            },
            superAdmin: {
                totalProperties: await this.prisma.property.count(),
                activeProperties: await this.prisma.property.count({ where: { isActive: true } }),
                totalChannelPartners: await this.prisma.channelPartner.count(),
                activeChannelPartners: await this.prisma.channelPartner.count({ where: { isActive: true } }),
                pendingCPCommissions: await this.prisma.cPTransaction.aggregate({
                    where: { type: 'COMMISSION' },
                    _sum: { amount: true }
                }).then(res => res._sum.amount || 0)
            }
        };
    }
    async getFinancialReport(startDate, endDate) {
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
        });
        const expenseByCategory = expenses.reduce((acc, curr) => {
            const catName = curr.category.name;
            if (!acc[catName])
                acc[catName] = 0;
            acc[catName] += Number(curr.amount);
            return acc;
        }, {});
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
    async getOccupancyReport(startDate, endDate) {
        const dates = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
        }
        const report = [];
        const totalRooms = await this.prisma.room.count({ where: { isEnabled: true } });
        for (const date of dates) {
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);
            const occupied = await this.prisma.booking.count({
                where: {
                    status: { in: ['CHECKED_IN', 'CONFIRMED'] },
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
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReportsService);
//# sourceMappingURL=reports.service.js.map