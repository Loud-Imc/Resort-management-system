import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
// Handle case sensitivity: Linux has 'Printer.js', Windows has 'printer.js'
let PdfPrinter: any;
try {
    PdfPrinter = require(path.join(pdfmakeDir, 'js', 'Printer'));
} catch {
    PdfPrinter = require(path.join(pdfmakeDir, 'js', 'printer'));
}

// Casting status values to any to bypass transitory prisma client sync issues in this specific service
const APPROVED = 'APPROVED' as any;

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);
    constructor(private prisma: PrismaService) { }

    private setEndOfDay(date: Date): Date {
        const d = new Date(date);
        d.setHours(23, 59, 59, 999);
        return d;
    }

    private setStartOfDay(date: Date): Date {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    private getPreviousPeriod(start: Date, end: Date): { start: Date, end: Date } {
        const duration = end.getTime() - start.getTime();
        const prevEnd = new Date(start.getTime() - 1);
        const prevStart = new Date(prevEnd.getTime() - duration);
        return { start: prevStart, end: prevEnd };
    }

    /**
     * Get dashboard statistics (Today's overview)
     */
    async getDashboardStats(user: any, propertyId?: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        // Define property scoping
        const propertyFilter: any = {};
        if (isGlobalAdmin) {
            if (propertyId) {
                propertyFilter.id = propertyId;
            }
        } else {
            // Filter by properties where user is staff or owner
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
            if (propertyId) {
                propertyFilter.id = propertyId;
            }
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
                        where: { type: 'COMMISSION', status: 'FINALIZED' },
                        _sum: { amount: true }
                    }).then(res => Number(res._sum?.amount || 0)),
                    platformStats: await this.prisma.payment.aggregate({
                        where: { status: { in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] } },
                        _sum: {
                            amount: true,
                            platformFee: true,
                            netAmount: true,
                        }
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
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);
        const prev = this.getPreviousPeriod(sDate, eDate);

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

        // Helper to fetch core metrics for a period
        const fetchMetrics = async (start: Date, end: Date) => {
            const [income, expense, bookingsCount, occupiedNights, totalRooms, publicCount, cpCount, propertyCount, partialCount] = await Promise.all([
                this.prisma.income.aggregate({
                    where: {
                        date: { gte: start, lte: end },
                        OR: [
                            { booking: { property: propertyFilter } },
                            { eventBooking: { event: { property: propertyFilter } } },
                            // If global (propertyFilter is empty or has all properties), include platform-level income
                            ...(isGlobalAdmin && !propertyId ? [{ propertyId: null }] : [])
                        ]
                    },
                    _sum: { amount: true }
                }),
                this.prisma.expense.aggregate({
                    where: {
                        date: { gte: start, lte: end },
                        property: propertyFilter
                    },
                    _sum: { amount: true }
                }),
                this.prisma.booking.count({
                    where: {
                        createdAt: { gte: start, lte: end },
                        room: { property: propertyFilter }
                    }
                }),
                // For ADR/RevPAR, we need occupied room nights in this period
                this.prisma.booking.findMany({
                    where: {
                        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                        checkInDate: { lte: end },
                        checkOutDate: { gte: start },
                        room: { property: propertyFilter }
                    },
                    select: { checkInDate: true, checkOutDate: true }
                }).then(bookings => {
                    return bookings.reduce((sum, b) => {
                        const bStart = b.checkInDate > start ? b.checkInDate : start;
                        const bEnd = b.checkOutDate < end ? b.checkOutDate : end;
                        const nights = Math.ceil(Math.abs(bEnd.getTime() - bStart.getTime()) / (1000 * 60 * 60 * 24));
                        return sum + (nights > 0 ? nights : 0);
                    }, 0);
                }),
                this.prisma.room.count({
                    where: { isEnabled: true, property: propertyFilter }
                }),
                this.prisma.booking.count({
                    where: {
                        createdAt: { gte: start, lte: end },
                        room: { property: propertyFilter },
                        isManualBooking: false,
                        OR: [
                            { channelPartnerId: null },
                            { user: { roles: { some: { role: { name: 'Customer' } } } } }
                        ]
                    }
                }), // Public Website (Guest-led)
                this.prisma.booking.count({
                    where: {
                        createdAt: { gte: start, lte: end },
                        room: { property: propertyFilter },
                        isManualBooking: false,
                        channelPartnerId: { not: null },
                        user: { roles: { some: { role: { name: 'ChannelPartner' } } } }
                    }
                }), // CP Dashboard (Partner-led)
                this.prisma.booking.count({
                    where: { createdAt: { gte: start, lte: end }, room: { property: propertyFilter }, isManualBooking: true }
                }), // Property Dashboard
                this.prisma.booking.count({
                    where: { createdAt: { gte: start, lte: end }, room: { property: propertyFilter }, paymentOption: 'PARTIAL' }
                }) // Partial Payments
            ]);

            const totalIncome = Number(income._sum?.amount || 0);
            const totalExpense = Number(expense._sum?.amount || 0);
            const netProfit = totalIncome - totalExpense;

            const bookingsBySource = {
                online: publicCount,
                partner: cpCount,
                property: propertyCount,
                partial: partialCount
            };

            // Duration in days for RevPAR calculation
            const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            const availableNights = totalRooms * days;

            const adr = occupiedNights > 0 ? totalIncome / occupiedNights : 0;
            const revPar = availableNights > 0 ? totalIncome / availableNights : 0;

            return { totalIncome, totalExpense, netProfit, bookingsCount, adr, revPar, totalVolume: totalIncome, bookingsBySource }; // totalVolume as alias for totalIncome for legacy compatibility
        };

        const currentMetrics = await fetchMetrics(sDate, eDate);
        const prevMetrics = await fetchMetrics(prev.start, prev.end);

        // Calculate Growth Rates
        const calculateGrowth = (curr: number, prev: number) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        const growth = {
            revenue: calculateGrowth(currentMetrics.totalIncome, prevMetrics.totalIncome),
            bookings: calculateGrowth(currentMetrics.bookingsCount, prevMetrics.bookingsCount),
            profit: calculateGrowth(currentMetrics.netProfit, prevMetrics.netProfit),
            adr: calculateGrowth(currentMetrics.adr, prevMetrics.adr),
            revPar: calculateGrowth(currentMetrics.revPar, prevMetrics.revPar),
        };

        // 3. Income by Source
        const incomeBySource = await this.prisma.income.groupBy({
            by: ['source'],
            where: {
                date: { gte: sDate, lte: eDate },
                property: propertyId ? { id: propertyId } : (isGlobalAdmin ? undefined : propertyFilter)
            },
            _sum: { amount: true },
            _count: { _all: true }
        });

        // Platform-Specific Financial Logic
        let platformSummary: any = null;
        if (isGlobalAdmin && !propertyId) {
            const paidPayments = await this.prisma.payment.findMany({
                where: {
                    status: { in: ['PAID', 'REFUNDED', 'PARTIALLY_REFUNDED'] },
                    paymentDate: { gte: sDate, lte: eDate }
                },
                include: {
                    booking: {
                        include: {
                            cpTransactions: { where: { type: 'COMMISSION', status: 'FINALIZED' } },
                            property: true
                        }
                    }
                }
            });

            const grossPlatformFees = paidPayments.reduce((sum, p: any) => sum + Number(p.platformFee || 0), 0);
            const totalCPCommission = paidPayments.reduce((sum, p: any) => {
                const commission = p.booking?.cpTransactions?.reduce((cSum, ctx) => cSum + Number(ctx.amount), 0) || 0;
                return sum + commission;
            }, 0);
            const totalVolume = paidPayments.reduce((sum, p: any) => sum + Number(p.amount || 0), 0);
            const estimatedGatewayFees = (totalVolume * 2.5) / 100;

            // Breakdown of fees by property
            const platformFeeBreakdown = paidPayments.reduce((acc: any[], p: any) => {
                const propertyName = p.booking?.property?.name || 'Unknown Property';
                const fee = Number(p.platformFee || 0);
                if (fee === 0) return acc;

                const existing = acc.find(a => a.organizationName === propertyName);
                if (existing) {
                    existing.fee += fee;
                    existing.count++;
                } else {
                    acc.push({ organizationName: propertyName, fee, count: 1 });
                }
                return acc;
            }, []);

            const platformExpensesTotal = await this.prisma.expense.aggregate({
                where: { propertyId: null, date: { gte: sDate, lte: eDate } },
                _sum: { amount: true }
            });
            const operationalCost = Number(platformExpensesTotal._sum.amount || 0);

            // Income Sources Aggregation
            const incomeBreakdownArray = await this.prisma.income.findMany({
                where: { date: { gte: sDate, lte: eDate } },
                include: { property: true }
            });

            const cpRegistrationIncomes = incomeBreakdownArray.filter(i => i.source === 'CP_REGISTRATION_FEE');
            const cpFees = cpRegistrationIncomes.reduce((sum, item) => sum + Number(item.amount), 0);

            // Extract CP IDs and fetch partners
            const cpRegistrationDetails: any[] = [];
            if (cpRegistrationIncomes.length > 0) {
                const cpIds = cpRegistrationIncomes.map(item => {
                    const match = item.description?.match(/CP ID: ([a-f0-9-]+)/i);
                    return match ? match[1].trim() : null;
                }).filter(Boolean) as string[];

                const partners = await this.prisma.channelPartner.findMany({
                    where: { id: { in: cpIds } },
                    include: { user: true }
                });

                for (const item of cpRegistrationIncomes) {
                    const match = item.description?.match(/CP ID: ([a-f0-9-]+)/i);
                    const cpId = match ? match[1].trim() : null;
                    const partner = partners.find(p => p.id === cpId);

                    const partnerName = partner?.organizationName ||
                        partner?.authorizedPersonName ||
                        (partner?.user ? `${partner.user.firstName} ${partner.user.lastName}`.trim() : 'Unknown Partner');

                    cpRegistrationDetails.push({
                        partnerName,
                        amount: Number(item.amount),
                        date: item.date
                    });
                }
            }

            platformSummary = {
                grossPlatformFees,
                totalCPCommission,
                estimatedGatewayFees,
                operationalCost,
                cpRegistrationFees: cpFees,
                cpRegistrationDetails,
                platformFeeBreakdown: platformFeeBreakdown.sort((a, b) => b.fee - a.fee),
                netPlatformProfit: (grossPlatformFees + cpFees) - (operationalCost + totalCPCommission + estimatedGatewayFees)
            };
        }

        // 4. Expenses by Category
        const expensesByCategory = await this.prisma.expense.groupBy({
            by: ['categoryId'],
            where: {
                date: { gte: sDate, lte: eDate },
                property: propertyId ? { id: propertyId } : (isGlobalAdmin ? undefined : propertyFilter)
            },
            _sum: { amount: true },
        });

        const categoryIds = expensesByCategory.map(item => item.categoryId);
        const categories = await this.prisma.expenseCategory.findMany({
            where: { id: { in: categoryIds } }
        });

        return {
            period: { start: sDate, end: eDate },
            summary: {
                ...currentMetrics,
                profitMargin: currentMetrics.totalIncome > 0 ? Math.round((currentMetrics.netProfit / currentMetrics.totalIncome) * 100) : 0,
                growth
            },
            incomeBySource: incomeBySource.map(item => ({
                source: item.source,
                _sum: { amount: item._sum.amount },
                _count: item._count._all
            })),
            expensesByCategory: expensesByCategory.map(item => ({
                category: { name: categories.find(c => c.id === item.categoryId)?.name || 'Unknown' },
                _sum: { amount: item._sum.amount }
            })),
            isGlobal: isGlobalAdmin && !propertyId,
            platformSummary,
        };
    }

    /**
     * Get occupancy report
     */
    async getOccupancyReport(user: any, startDate: Date, endDate: Date, propertyId?: string) {
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

        // Get all dates in range
        const dates: Date[] = [];
        let currentDate = new Date(sDate);
        while (currentDate <= eDate) {
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
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

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
                    checkInDate: { lte: eDate },
                    checkOutDate: { gte: sDate }
                }
            });

            const revenue = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
            const totalRooms = rt.rooms.length;

            // Calculate total possible room nights
            const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const possibleNights = totalRooms * diffDays;

            // Calculate actual occupied nights in range
            let occupiedNights = 0;
            bookings.forEach(b => {
                const bStart = b.checkInDate > sDate ? b.checkInDate : sDate;
                const bEnd = b.checkOutDate < eDate ? b.checkOutDate : eDate;
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
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

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
            const transactions = await this.prisma.cPTransaction.findMany({
                where: {
                    channelPartnerId: cp.id,
                    type: 'COMMISSION',
                    status: 'FINALIZED',
                    createdAt: { gte: sDate, lte: eDate }
                },
                include: {
                    booking: true
                }
            });

            const totalBookings = new Set(transactions.map(t => t.bookingId)).size;
            const totalCPCommission = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
            const totalVolume = transactions.reduce((sum, t) => sum + Number(t.booking?.totalAmount || 0), 0);

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

    async generateExcelReport(user: any, startDate: Date, endDate: Date, propertyId?: string): Promise<Buffer> {
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

        try {
            const financial = await this.getFinancialReport(user, sDate, eDate, propertyId);
            const occupancy = await this.getOccupancyReport(user, sDate, eDate, propertyId);
            const roomPerf = await this.getRoomPerformanceReport(user, sDate, eDate, propertyId);

            let propertyName = "Global Network Analytics";
            if (propertyId) {
                const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
                if (property) propertyName = property.name;
            }

            const workbook = new ExcelJS.Workbook();
            const primaryColor = 'FF227C8A';
            const darkTeal = 'FF093F4A';
            const lightTeal = 'FFF1F8FA';

            // Helper to style a sheet
            const styleSheet = (ws: ExcelJS.Worksheet, title: string) => {
                // Add Header
                ws.mergeCells('A1:D1');
                const mainHeader = ws.getCell('A1');
                mainHeader.value = 'ROUTE GUIDE';
                mainHeader.font = { name: 'Arial Black', color: { argb: 'FFFFFFFF' }, size: 20 };
                mainHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: darkTeal } };
                mainHeader.alignment = { horizontal: 'center', vertical: 'middle' };

                ws.mergeCells('A2:D2');
                const subTitle = ws.getCell('A2');
                subTitle.value = `${title} - ${propertyName}`;
                subTitle.font = { name: 'Arial', color: { argb: 'FFFFFFFF' }, size: 14, bold: true };
                subTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };
                subTitle.alignment = { horizontal: 'center', vertical: 'middle' };

                ws.mergeCells('A3:D3');
                const dateCell = ws.getCell('A3');
                dateCell.value = `Period: ${sDate.toLocaleDateString()} to ${eDate.toLocaleDateString()}`;
                dateCell.font = { italic: true, size: 10 };
                dateCell.alignment = { horizontal: 'center' };

                ws.getRow(5).font = { bold: true, color: { argb: 'FFFFFFFF' } };
                ws.getRow(5).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: primaryColor } };

                ws.getRow(1).height = 40;
                ws.getRow(2).height = 25;
            };

            // 1. Overview Sheet
            const summarySheet = workbook.addWorksheet('Overview');
            styleSheet(summarySheet, 'Performance Summary');
            summarySheet.columns = [
                { header: 'Metric', key: 'metric', width: 30 },
                { header: 'Value', key: 'value', width: 25 },
                { header: '', key: '', width: 10 },
                { header: '', key: '', width: 10 },
            ];
            summarySheet.getRow(5).values = ['Key Metric', 'Performance Value'];
            summarySheet.addRows([
                { metric: 'Total Gross Volume', value: `₹${(financial.summary?.totalVolume || financial.summary?.totalIncome || 0).toLocaleString()}` },
                { metric: 'Total Confirmed Bookings', value: (financial.summary?.bookingsCount || 0) },
                { metric: 'Average Occupancy Rate', value: `${occupancy.averageOccupancy || 0}%` },
                { metric: 'Net Revenue/Profit', value: `₹${(financial.summary?.netProfit || 0).toLocaleString()}` },
            ]);

            // 2. Financials Sheet
            const finSheet = workbook.addWorksheet('Revenue Sources');
            styleSheet(finSheet, 'Revenue Breakdown');
            finSheet.columns = [
                { header: 'Booking Source', key: 'source', width: 30 },
                { header: 'Total Revenue Generated', key: 'amount', width: 25 },
                { header: '', key: '', width: 10 },
                { header: '', key: '', width: 10 },
            ];
            finSheet.getRow(5).values = ['Source Channel', 'Revenue Amount'];
            (financial.incomeBySource || []).forEach((item: any) => {
                finSheet.addRow({
                    source: (item.source || 'Direct').replace(/_/g, ' '),
                    amount: `₹${Number(item._sum?.amount || 0).toLocaleString()}`,
                });
            });

            // 3. Room Performance
            const roomSheet = workbook.addWorksheet('Unit Analysis');
            styleSheet(roomSheet, 'Room Type Performance');
            roomSheet.columns = [
                { header: 'Accommodation Type', key: 'name', width: 30 },
                { header: 'Bookings', key: 'count', width: 15 },
                { header: 'Revenue', key: 'revenue', width: 20 },
                { header: 'Occupancy %', key: 'rate', width: 15 },
            ];
            roomSheet.getRow(5).values = ['Unit Type', 'Bookings', 'Revenue', 'Occ %'];
            (roomPerf || []).forEach((item: any) => {
                roomSheet.addRow({
                    name: item.name || 'Unknown',
                    count: item.bookingsCount || 0,
                    revenue: `₹${(item.revenue || 0).toLocaleString()}`,
                    rate: `${item.occupancyRate || 0}%`,
                });
            });

            // Global Zebra Striping & Borders
            workbook.worksheets.forEach(ws => {
                ws.eachRow((row, rowNumber) => {
                    if (rowNumber > 5) {
                        if (rowNumber % 2 === 0) {
                            row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightTeal } };
                        }
                        row.eachCell(cell => {
                            cell.border = {
                                top: { style: 'thin', color: { argb: 'FFDDEEFE' } },
                                bottom: { style: 'thin', color: { argb: 'FFDDEEFE' } },
                                left: { style: 'thin', color: { argb: 'FFDDEEFE' } },
                                right: { style: 'thin', color: { argb: 'FFDDEEFE' } }
                            };
                        });
                    }
                });
            });

            const xlsxBuffer = await workbook.xlsx.writeBuffer();
            return Buffer.from(xlsxBuffer);
        } catch (error) {
            this.logger.error(`Error generating Excel report: ${error.message}`, error.stack);
            throw error;
        }
    }

    async generatePdfReport(user: any, startDate: Date, endDate: Date, propertyId?: string): Promise<Buffer> {
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

        try {
            const financial = await this.getFinancialReport(user, sDate, eDate, propertyId);
            const occupancy = await this.getOccupancyReport(user, sDate, eDate, propertyId);
            const roomPerf = await this.getRoomPerformanceReport(user, sDate, eDate, propertyId);

            let propertyName = "Global Network Analytics";
            if (propertyId) {
                const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
                if (property) propertyName = property.name;
            }

            const fonts = {
                Roboto: {
                    normal: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
                    bold: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
                    italics: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
                    bolditalics: path.join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf')
                }
            };

            const PrinterConstruct = PdfPrinter.default || PdfPrinter;
            const printer = new PrinterConstruct(fonts);

            const docDefinition: any = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                content: [
                    // Header
                    {
                        columns: [
                            {
                                width: '*',
                                stack: [
                                    { text: 'ROUTE GUIDE', style: 'brandLogo' },
                                    { text: 'Performance Analytics Report', style: 'brandSub' }
                                ]
                            },
                            {
                                width: 'auto',
                                stack: [
                                    { text: 'BUSINESS PERFORMANCE', style: 'docTitle' },
                                    { text: `Period: ${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`, style: 'docPeriod' }
                                ],
                                alignment: 'right'
                            }
                        ],
                        margin: [0, 0, 0, 30]
                    },

                    // Property Title
                    {
                        table: {
                            widths: ['*'],
                            body: [[{ text: propertyName.toUpperCase(), style: 'propertyBanner' }]]
                        },
                        layout: 'noBorders',
                        margin: [0, 0, 0, 20]
                    },

                    // KPI Grid
                    {
                        columns: [
                            {
                                width: '*',
                                stack: [
                                    { text: 'TOTAL REVENUE', style: 'kpiLabel' },
                                    { text: `₹${(financial.summary?.totalVolume || financial.summary?.totalIncome || 0).toLocaleString()}`, style: 'kpiValue' }
                                ]
                            },
                            {
                                width: '*',
                                stack: [
                                    { text: 'CONFIRMED BOOKINGS', style: 'kpiLabel' },
                                    { text: (financial.summary?.bookingsCount || 0).toString(), style: 'kpiValue' }
                                ]
                            },
                            {
                                width: '*',
                                stack: [
                                    { text: 'AVG. OCCUPANCY', style: 'kpiLabel' },
                                    { text: `${occupancy.averageOccupancy || 0}%`, style: 'kpiValue' }
                                ]
                            },
                            {
                                width: '*',
                                stack: [
                                    { text: 'NET PROFIT', style: 'kpiLabel' },
                                    { text: `₹${(financial.summary?.netProfit || 0).toLocaleString()}`, style: 'kpiValue', color: '#0d9488' }
                                ]
                            }
                        ],
                        margin: [0, 0, 0, 40]
                    },

                    // Charts Placeholder / Summary Table
                    { text: 'REVENUE BY SOURCE', style: 'sectionHeader' },
                    {
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [
                                    { text: 'Source Channel', style: 'tableHeader' },
                                    { text: 'Revenue', style: 'tableHeader', alignment: 'right' }
                                ],
                                ...((financial.incomeBySource || []).map(item => [
                                    { text: (item.source || 'Direct').replace(/_/g, ' '), style: 'tableCell' },
                                    { text: `₹${Number(item._sum?.amount || 0).toLocaleString()}`, style: 'tableCellBold', alignment: 'right' }
                                ]))
                            ]
                        },
                        layout: 'lightHorizontalLines',
                        margin: [0, 5, 0, 30]
                    },

                    { text: 'ACCOMMODATION PERFORMANCE', style: 'sectionHeader' },
                    {
                        table: {
                            headerRows: 1,
                            widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                [
                                    { text: 'UNIT TYPE', style: 'tableHeader' },
                                    { text: 'BOOKINGS', style: 'tableHeader', alignment: 'center' },
                                    { text: 'OCC. %', style: 'tableHeader', alignment: 'center' },
                                    { text: 'TOTAL REVENUE', style: 'tableHeader', alignment: 'right' }
                                ],
                                ...(roomPerf || []).map((item) => [
                                    { text: item.name || 'Unknown', style: 'tableCell' },
                                    { text: (item.bookingsCount || 0).toString(), style: 'tableCell', alignment: 'center' },
                                    { text: `${item.occupancyRate || 0}%`, style: 'tableCell', alignment: 'center' },
                                    { text: `₹${(item.revenue || 0).toLocaleString()}`, style: 'tableCellBold', alignment: 'right' }
                                ])
                            ]
                        },
                        layout: {
                            paddingTop: (i) => i === 0 ? 10 : 8,
                            paddingBottom: (i) => i === 0 ? 10 : 8,
                            fillColor: (i) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null),
                            hLineColor: () => '#e2e8f0',
                        }
                    },

                    {
                        text: 'Disclaimer: This report is generated automatically by Route Guide Analytics. Data might have slight variations based on real-time processing.',
                        style: 'disclaimer',
                        margin: [0, 40, 0, 0]
                    }
                ],
                footer: (currentPage, pageCount) => ({
                    columns: [
                        { text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, style: 'footer' },
                        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', style: 'footer' }
                    ],
                    margin: [40, 0, 40, 0]
                }),
                styles: {
                    brandLogo: { fontSize: 24, bold: true, color: '#227c8a', letterSpacing: 2 },
                    brandSub: { fontSize: 9, color: '#64748b' },
                    docTitle: { fontSize: 14, bold: true, color: '#0f172a' },
                    docPeriod: { fontSize: 10, color: '#64748b' },
                    propertyBanner: { fontSize: 16, bold: true, color: 'white', fillColor: '#093f4a', alignment: 'center', margin: [0, 10, 0, 10] },
                    kpiLabel: { fontSize: 8, bold: true, color: '#64748b', letterSpacing: 1 },
                    kpiValue: { fontSize: 18, bold: true, color: '#227c8a', margin: [0, 2, 0, 0] },
                    sectionHeader: { fontSize: 11, bold: true, color: '#0f172a', margin: [0, 10, 0, 10], letterSpacing: 0.5 },
                    tableHeader: { fontSize: 9, bold: true, color: '#ffffff', margin: [0, 5, 0, 5] },
                    tableCell: { fontSize: 10, color: '#1e293b' },
                    tableCellBold: { fontSize: 10, bold: true, color: '#0f172a' },
                    disclaimer: { fontSize: 8, italic: true, color: '#94a3b8' },
                    footer: { fontSize: 8, color: '#cbd5e1' }
                },
                defaultStyle: { font: 'Roboto' }
            };

            return new Promise(async (resolve, reject) => {
                try {
                    const pdfDoc = await printer.createPdfKitDocument(docDefinition);
                    const chunks: any[] = [];
                    pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
                    pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                    pdfDoc.on('error', (err: any) => reject(err));
                    pdfDoc.end();
                } catch (e) {
                    reject(e);
                }
            });
        } catch (error) {
            this.logger.error(`Error generating PDF report: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getAbandonedBookings(user: any, startDate: Date, endDate: Date, propertyId?: string) {
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

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

        const abandonedBookings = await this.prisma.booking.findMany({
            where: {
                status: 'PENDING_PAYMENT',
                createdAt: {
                    gte: sDate,
                    lte: eDate,
                },
                room: {
                    property: propertyFilter
                }
            },
            include: {
                user: true,
                room: {
                    include: {
                        property: true,
                        roomType: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return abandonedBookings.map(b => ({
            id: b.id,
            guestName: b.user ? `${b.user.firstName} ${b.user.lastName}` : 'Guest',
            guestEmail: b.user?.email || 'N/A',
            propertyName: b.room?.property?.name || 'N/A',
            roomType: b.room?.roomType?.name || 'N/A',
            checkIn: b.checkInDate,
            checkOut: b.checkOutDate,
            amount: b.totalAmount,
            createdAt: b.createdAt
        }));
    }
}
