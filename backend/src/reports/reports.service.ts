import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
// Casting status values to any to bypass transitory prisma client sync issues in this specific service
const APPROVED = 'APPROVED' as any;

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
                    activeChannelPartners: await this.prisma.channelPartner.count({ where: { status: APPROVED } }),
                    pendingCPCommissions: await this.prisma.cPTransaction.aggregate({
                        where: { type: 'COMMISSION' },
                        _sum: { amount: true }
                    }).then(res => Number(res._sum?.amount || 0)),
                    platformStats: await this.prisma.payment.aggregate({
                        where: { status: 'PAID' },
                        _sum: {
                            amount: true,
                            platformFee: true,
                            netAmount: true,
                        } as any // Use any to bypass transitory type sync issues if they persist
                    }).then((res: any) => ({
                        totalVolume: Number(res._sum?.amount || 0),
                        totalFees: Number(res._sum?.platformFee || 0),
                        netEarnings: Number(res._sum?.netAmount || 0),
                    }))
                }
            })
        };
    }

    /**
     * Get financial report
     */
    async getFinancialReport(user: any, startDate: Date, endDate: Date, propertyId?: string) {
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


        // 5. Platform-Specific Financial Logic (Route Guide Business Dashboard)
        if (isGlobalAdmin && !propertyId) {
            const paidPayments = await this.prisma.payment.findMany({
                where: {
                    status: 'PAID',
                    paymentDate: { gte: startDate, lte: endDate }
                },
                include: {
                    booking: true
                }
            });

            const grossPlatformFees = paidPayments.reduce((sum, p: any) => sum + Number(p.platformFee || 0), 0);
            const totalCPCommission = paidPayments.reduce((sum, p: any) => sum + Number(p.booking?.cpCommission || 0), 0);
            const totalVolume = paidPayments.reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
            const estimatedGatewayFees = (totalVolume * 2.5) / 100;

            // Fetch platform-only operational expenses (where propertyId is null)
            const platformExpensesTotal = await this.prisma.expense.aggregate({
                where: {
                    propertyId: null,
                    date: { gte: startDate, lte: endDate }
                },
                _sum: { amount: true }
            });

            const operationalCost = Number(platformExpensesTotal._sum.amount || 0);
            const finalTotalIncome = grossPlatformFees;
            const finalTotalExpense = operationalCost + totalCPCommission + estimatedGatewayFees;
            const finalNetProfit = finalTotalIncome - finalTotalExpense;

            // Build platform-specific income sources
            const platformIncomeSources = [
                { source: 'BOOKING_COMMISSION', _sum: { amount: grossPlatformFees } }
            ];

            // Build platform-specific expense categories
            const platformExpenseCategories = [
                { category: { name: 'Operational Costs' }, _sum: { amount: operationalCost } },
                { category: { name: 'Partner Payouts' }, _sum: { amount: totalCPCommission } },
                { category: { name: 'Gateway Fees (Est.)' }, _sum: { amount: estimatedGatewayFees } }
            ];

            return {
                period: { start: startDate, end: endDate },
                summary: {
                    totalIncome: finalTotalIncome,
                    totalExpenses: finalTotalExpense,
                    netProfit: finalNetProfit,
                    profitMargin: finalTotalIncome > 0 ? Math.round((finalNetProfit / finalTotalIncome) * 100) : 0,
                    totalVolume // Reference for volume
                },
                incomeBySource: platformIncomeSources,
                expensesByCategory: platformExpenseCategories,
                isGlobal: true,
                platformSummary: { // Keep for detailed breakdown if needed
                    grossPlatformFees,
                    totalCPCommission,
                    estimatedGatewayFees,
                    operationalCost,
                    netPlatformProfit: finalNetProfit
                }
            };
        }

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
            isGlobal: isGlobalAdmin,
            platformSummary: null,
        };
    }

    /**
     * Get occupancy report
     */
    async getOccupancyReport(user: any, startDate: Date, endDate: Date, propertyId?: string) {
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
        if (isGlobalAdmin) {
            if (propertyId) {
                propertyFilter.id = propertyId;
            }
        } else {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
            if (propertyId) {
                propertyFilter.id = propertyId;
            }
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
            averageOccupancy: report.length > 0 ? Math.round(report.reduce((sum, item) => sum + item.occupancyRate, 0) / report.length) : 0,
            dailyStats: report
        };
    }

    /**
     * Get Room Performance Report
     */
    async getRoomPerformanceReport(user: any, startDate: Date, endDate: Date, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (isGlobalAdmin) {
            if (propertyId) propertyFilter.id = propertyId;
        } else {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
            if (propertyId) propertyFilter.id = propertyId;
        }

        const roomTypes = await this.prisma.roomType.findMany({
            where: {
                property: propertyFilter
            },
            include: {
                property: true,
                rooms: {
                    where: { isEnabled: true }
                }
            }
        });

        const performance = await Promise.all(roomTypes.map(async (rt) => {
            const bookings = await this.prisma.booking.findMany({
                where: {
                    roomTypeId: rt.id,
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                    checkInDate: { lte: endDate },
                    checkOutDate: { gte: startDate }
                }
            });

            const revenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
            const totalRooms = rt.rooms.length;

            // Calculate total possible room nights
            const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const possibleNights = totalRooms * diffDays;

            // Calculate actual occupied nights in range
            let occupiedNights = 0;
            bookings.forEach(b => {
                const bStart = b.checkInDate > startDate ? b.checkInDate : startDate;
                const bEnd = b.checkOutDate < endDate ? b.checkOutDate : endDate;
                const bDiff = Math.ceil(Math.abs(bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24));
                occupiedNights += bDiff > 0 ? bDiff : 0;
            });

            return {
                roomTypeId: rt.id,
                name: rt.name,
                propertyName: rt.property.name,
                revenue,
                bookingsCount: bookings.length,
                occupancyRate: possibleNights > 0 ? Math.round((occupiedNights / possibleNights) * 100) : 0
            };
        }));

        return performance;
    }

    /**
     * Get Partner Payout/Commission Report (Super Admin only)
     */
    async getPartnerReport(user: any, startDate: Date, endDate: Date) {
        const roles = user.roles || [];
        if (!roles.includes('SuperAdmin') && !roles.includes('Admin')) {
            throw new Error('Unauthorized');
        }

        const partners = await this.prisma.channelPartner.findMany({
            include: {
                user: true
            }
        });

        const report = await Promise.all(partners.map(async (cp) => {
            const bookings = await this.prisma.booking.findMany({
                where: {
                    channelPartnerId: cp.id,
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                    createdAt: { gte: startDate, lte: endDate }
                }
            });

            const totalBookings = bookings.length;
            const totalCPCommission = bookings.reduce((sum, b) => sum + Number(b.cpCommission || 0), 0);
            const totalVolume = bookings.reduce((sum, b) => sum + Number(b.totalAmount || 0), 0);

            return {
                id: cp.id,
                businessName: cp.organizationName || 'N/A',
                partnerName: `${cp.user.firstName} ${cp.user.lastName}`,
                totalBookings,
                totalVolume,
                totalCommission: totalCPCommission
            };
        }));

        return report;
    }
}
