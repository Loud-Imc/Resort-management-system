import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { format } from 'date-fns';
import { DateUtils } from '../common/utils/date.utils';
import * as ExcelJS from 'exceljs';
import * as path from 'path';
const pdfmakeDir = path.dirname(require.resolve('pdfmake/package.json'));
// Handle case sensitivity: Linux has 'Printer.js', Windows has 'printer.js'
let PdfPrinter: any;
let URLResolver: any;
let virtualFs: any;

try {
    PdfPrinter = require(path.join(pdfmakeDir, 'js', 'Printer')).default || require(path.join(pdfmakeDir, 'js', 'Printer'));
    URLResolver = require(path.join(pdfmakeDir, 'js', 'URLResolver')).default || require(path.join(pdfmakeDir, 'js', 'URLResolver'));
    virtualFs = require(path.join(pdfmakeDir, 'js', 'virtual-fs')).default || require(path.join(pdfmakeDir, 'js', 'virtual-fs'));
} catch {
    PdfPrinter = require(path.join(pdfmakeDir, 'js', 'printer')).default || require(path.join(pdfmakeDir, 'js', 'printer'));
    URLResolver = require(path.join(pdfmakeDir, 'js', 'urlresolver')).default || require(path.join(pdfmakeDir, 'js', 'urlresolver'));
    virtualFs = require(path.join(pdfmakeDir, 'js', 'virtual-fs')).default || require(path.join(pdfmakeDir, 'js', 'virtual-fs'));
}

import * as fs from 'fs';
const DEBUG_LOG = path.join(process.cwd(), 'pdf_debug.log');
const log = (msg: string) => {
    const timestamp = new Date().toISOString();
    fs.appendFileSync(DEBUG_LOG, `[${timestamp}] ${msg}\n`);
};

// Casting status values to any to bypass transitory prisma client sync issues in this specific service
const APPROVED = 'APPROVED' as any;
const SettlementStatus = { PAID: 'PAID' } as any;

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name);
    constructor(
        private prisma: PrismaService,
        private roomsService: RoomsService
    ) { }

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
     * Get unified dashboard statistics with date-aware room status, block details, and calendar metrics
     */
    async getDashboardUnified(user: any, propertyId?: string, dateStr?: string, monthStr?: string) {
        const targetDate = DateUtils.parseCalendarDate(dateStr || new Date());
        const today = DateUtils.parseCalendarDate(new Date());
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
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
            if (propertyId) {
                propertyFilter.id = propertyId;
            }
        }

        // 1. Today's check-ins
        const checkIns = await (this.prisma as any).bookingRoom.count({
            where: {
                booking: {
                    checkInDate: { gte: today, lt: tomorrow },
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                },
                room: { property: propertyFilter }
            },
        });

        // 2. Today's check-outs
        const checkOuts = await (this.prisma as any).bookingRoom.count({
            where: {
                booking: {
                    checkOutDate: { gte: today, lt: tomorrow },
                    status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
                },
                room: { property: propertyFilter }
            },
        });

        // 3. Current Occupancy
        const totalRooms = await this.prisma.room.count({
            where: { isEnabled: true, property: propertyFilter },
        });

        const occupiedRooms = await (this.prisma as any).bookingRoom.count({
            where: {
                booking: {
                    status: 'CHECKED_IN',
                    checkInDate: { lte: new Date() },
                    checkOutDate: { gt: new Date() },
                },
                room: { property: propertyFilter }
            }
        });

        const bookedToday = await this.prisma.booking.count({
            where: {
                checkInDate: { gte: today, lt: tomorrow },
                room: { property: propertyFilter }
            }
        });

        // 4. Fetch dynamic rooms with block & booking details for targetDate
        const allRooms = await this.roomsService.findAll(user, { propertyId, date: format(targetDate, 'yyyy-MM-dd') });

        let availableCount = 0;
        let occupiedCount = 0;
        let maintenanceCount = 0;
        let blockedCount = 0;
        let reservedCount = 0;
        let outTodayCount = 0;

        const roomsList = allRooms.map((room: any) => {
            switch (room.status) {
                case 'AVAILABLE': availableCount++; break;
                case 'OCCUPIED': occupiedCount++; break;
                case 'OUT_TODAY': outTodayCount++; break;
                case 'MAINTENANCE': maintenanceCount++; break;
                case 'BLOCKED': blockedCount++; break;
                case 'RESERVED': reservedCount++; break;
            }

            // Find block details for targetDate if blocked
            let activeBlockDetails: any = null;
            if (room.blocks && room.blocks.length > 0) {
                const b = room.blocks.find((blk: any) => {
                    const blkStart = new Date(blk.startDate); blkStart.setHours(0, 0, 0, 0);
                    const blkEnd = new Date(blk.endDate); blkEnd.setHours(0, 0, 0, 0);
                    return targetDate >= blkStart && targetDate < blkEnd;
                });
                if (b) {
                    activeBlockDetails = {
                        id: b.id,
                        reason: b.reason,
                        notes: b.notes,
                        startDate: b.startDate,
                        endDate: b.endDate,
                    };
                }
            }

            // Find active booking for targetDate
            const bookingRoomsList = room.bookingRooms || [];
            const activeBookingForTarget = bookingRoomsList.find((br: any) => {
                const checkIn = new Date(br.booking.checkInDate); checkIn.setHours(0, 0, 0, 0);
                const checkOut = new Date(br.booking.checkOutDate); checkOut.setHours(0, 0, 0, 0);
                return targetDate >= checkIn && targetDate < checkOut;
            })?.booking;

            const checkoutBookingTarget = bookingRoomsList.find((br: any) => {
                const checkOut = new Date(br.booking.checkOutDate); checkOut.setHours(0, 0, 0, 0);
                return targetDate.getTime() === checkOut.getTime();
            })?.booking;

            let guestName = '';
            if (activeBookingForTarget) {
                const g = activeBookingForTarget.guests?.[0] || activeBookingForTarget.user;
                if (g?.firstName) guestName = `${g.firstName} ${g.lastName || ''}`.trim();
            } else if (checkoutBookingTarget) {
                const g = checkoutBookingTarget.guests?.[0] || checkoutBookingTarget.user;
                if (g?.firstName) guestName = `${g.firstName} ${g.lastName || ''}`.trim();
            }

            return {
                id: room.id,
                roomNumber: room.roomNumber,
                floor: room.floor,
                roomTypeId: room.roomTypeId,
                status: room.status,
                guestName: guestName || null,
                blockDetails: activeBlockDetails,
                _activeBooking: activeBookingForTarget || null,
                _checkoutBooking: checkoutBookingTarget || null,
            };
        }).sort((a: any, b: any) => {
            if (a.floor === b.floor) {
                return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
            }
            return (a.floor || 0) - (b.floor || 0);
        });

        // 5. Financial Overview
        const incomeToday = await this.prisma.income.aggregate({
            where: {
                OR: [
                    {
                        bookingId: { not: null },
                        booking: { checkInDate: { gte: today, lt: tomorrow }, property: propertyFilter }
                    },
                    {
                        eventBookingId: { not: null },
                        eventBooking: { event: { date: { gte: today, lt: tomorrow }, property: propertyFilter } }
                    },
                    {
                        bookingId: null,
                        eventBookingId: null,
                        date: { gte: today, lt: tomorrow },
                        ...(isGlobalAdmin ? {} : { property: propertyFilter })
                    }
                ]
            },
            _sum: { amount: true },
        });

        const feesToday = await this.prisma.payment.aggregate({
            where: {
                paymentDate: { gte: today, lt: tomorrow },
                status: 'PAID',
                booking: { property: propertyFilter }
            },
            _sum: { platformFee: true },
        });

        return {
            date: targetDate,
            checkIns,
            checkOuts,
            occupancy: {
                total: totalRooms,
                occupied: occupiedRooms,
                percentage: totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
            },
            revenue: Number(incomeToday._sum.amount || 0),
            todayFees: Number(feesToday._sum.platformFee || 0),
            bookingsCreated: bookedToday,
            statusSummary: {
                AVAILABLE: availableCount,
                OUT_TODAY: outTodayCount,
                RESERVED: reservedCount,
                OCCUPIED: occupiedCount,
                MAINTENANCE: maintenanceCount,
                BLOCKED: blockedCount,
                TOTAL: roomsList.length,
            },
            roomsList,
        };
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

        // 1. Today's check-ins (Phase 6 BookingRoom Logic - accurately counts total doors instead of parent bookings)
        const checkIns = await (this.prisma as any).bookingRoom.count({
            where: {
                booking: {
                    checkInDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    status: { in: ['CONFIRMED', 'CHECKED_IN'] },
                },
                room: { property: propertyFilter }
            },
        });

        // 2. Today's check-outs (Phase 6 BookingRoom Logic)
        const checkOuts = await (this.prisma as any).bookingRoom.count({
            where: {
                booking: {
                    checkOutDate: {
                        gte: today,
                        lt: tomorrow,
                    },
                    status: { in: ['CHECKED_IN', 'CHECKED_OUT'] },
                },
                room: { property: propertyFilter }
            },
        });

        // 3. Current Occupancy (Phase 6 BookingRoom Logic - eliminates messy RoomBlock array looping)
        const totalRooms = await this.prisma.room.count({
            where: { isEnabled: true, property: propertyFilter },
        });

        const occupiedRooms = await (this.prisma as any).bookingRoom.count({
            where: {
                booking: {
                    status: 'CHECKED_IN',
                    checkInDate: { lte: new Date() },
                    checkOutDate: { gt: new Date() },
                },
                room: { property: propertyFilter }
            }
        });

        const bookedToday = await this.prisma.booking.count({
            where: {
                checkInDate: {
                    gte: today,
                    lt: tomorrow
                },
                room: { property: propertyFilter }
            }
        })

        // 3.5 Room Status Summary (Dynamic logic via RoomsService)
        let availableCount = 0;
        let occupiedCount = 0;
        let maintenanceCount = 0;
        let blockedCount = 0;
        let reservedCount = 0;

        const allRooms = await this.roomsService.findAll(user, { propertyId });
        
        for (const room of allRooms) {
            switch (room.status) {
                case 'AVAILABLE':
                    availableCount++;
                    break;
                case 'OCCUPIED':
                case 'OUT_TODAY':
                    occupiedCount++;
                    break;
                case 'MAINTENANCE':
                    maintenanceCount++;
                    break;
                case 'BLOCKED':
                    blockedCount++;
                    break;
                case 'RESERVED':
                    reservedCount++;
                    break;
            }
        }

        // 4. Today's Revenue (Income created today)
        const incomeToday = await this.prisma.income.aggregate({
            where: {
                OR: [
                    {
                        bookingId: { not: null },
                        booking: {
                            checkInDate: { gte: today, lt: tomorrow },
                            property: propertyFilter
                        }
                    },
                    {
                        eventBookingId: { not: null },
                        eventBooking: {
                            event: {
                                date: { gte: today, lt: tomorrow },
                                property: propertyFilter
                            }
                        }
                    },
                    {
                        bookingId: null,
                        eventBookingId: null,
                        date: { gte: today, lt: tomorrow },
                        ...(isGlobalAdmin ? {} : { property: propertyFilter })
                    }
                ]
            },
            _sum: {
                amount: true,
            },
        });

        // 4.5 Today's Platform Fees
        const feesToday = await this.prisma.payment.aggregate({
            where: {
                paymentDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: 'PAID',
                booking: { property: propertyFilter }
            },
            _sum: {
                platformFee: true,
            },
        });

        // 5. Rooms list for dashboard grid (Lite version) - using dynamic statuses from allRooms!
        const roomsList = allRooms.map((room: any) => ({
            id: room.id,
            roomNumber: room.roomNumber,
            status: room.status,
            roomTypeId: room.roomTypeId,
            floor: room.floor,
        })).sort((a: any, b: any) => {
            if (a.floor === b.floor) {
                return a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true });
            }
            return (a.floor || 0) - (b.floor || 0);
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
            todayFees: Number(feesToday._sum.platformFee || 0),
            bookingsCreated: bookedToday,
            roomStatusSummary: {
                AVAILABLE: availableCount,
                RESERVED: reservedCount,
                OCCUPIED: occupiedCount,
                MAINTENANCE: maintenanceCount,
                BLOCKED: blockedCount
            },
            roomsList,
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
                    pendingPropertyCommissions: await this.prisma.propertySettlement.aggregate({
                        where: { status: { in: ['CALCULATED', 'APPROVED'] } },
                        _sum: { platformFee: true }
                    }).then(res => Number(res._sum?.platformFee || 0)),
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
            const [income, expense, bookingsCount, occupiedNights, totalRooms, publicCount, cpCount, propertyCount, partialData, platformFees, cashPayments, generalIncome] = await Promise.all([
                this.prisma.income.aggregate({
                    where: {
                        OR: [
                            // Booking income: recognized on check-in date
                            {
                                bookingId: { not: null },
                                booking: {
                                    checkInDate: { gte: start, lte: end },
                                    property: propertyFilter
                                }
                            },
                            // Event booking income: recognized on event date
                            {
                                eventBookingId: { not: null },
                                eventBooking: {
                                    event: {
                                        date: { gte: start, lte: end },
                                        property: propertyFilter
                                    }
                                }
                            },
                            // General/Manual income (no booking, no event)
                            {
                                bookingId: null,
                                eventBookingId: null,
                                date: { gte: start, lte: end },
                                ...(isGlobalAdmin && !propertyId ? {} : { property: propertyFilter })
                            }
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
                        checkInDate: { gte: start, lte: end },
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
                        checkInDate: { gte: start, lte: end },
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
                        checkInDate: { gte: start, lte: end },
                        room: { property: propertyFilter },
                        isManualBooking: false,
                        channelPartnerId: { not: null },
                        user: { roles: { some: { role: { name: 'ChannelPartner' } } } }
                    }
                }), // CP Dashboard (Partner-led)
                this.prisma.booking.count({
                    where: { checkInDate: { gte: start, lte: end }, room: { property: propertyFilter }, isManualBooking: true }
                }), // Property Dashboard
                this.prisma.booking.aggregate({
                    where: { checkInDate: { gte: start, lte: end }, room: { property: propertyFilter }, paymentOption: 'PARTIAL' },
                    _count: true,
                    _sum: { paidAmount: true }
                }), // Partial Payments
                this.prisma.payment.aggregate({
                    where: {
                        OR: [
                            {
                                bookingId: { not: null },
                                booking: {
                                    checkInDate: { gte: start, lte: end },
                                    property: propertyFilter
                                }
                            },
                            {
                                bookingId: null,
                                paymentDate: { gte: start, lte: end }
                            }
                        ],
                        status: 'PAID'
                    },
                    _sum: { platformFee: true }
                }),
                this.prisma.payment.findMany({
                    where: {
                        status: 'PAID',
                        paymentDate: { gte: start, lte: end },
                        booking: { property: propertyFilter }
                    },
                    select: {
                        amount: true,
                        paymentMethod: true
                    }
                }),
                this.prisma.income.aggregate({
                    where: {
                        bookingId: null,
                        eventBookingId: null,
                        date: { gte: start, lte: end },
                        ...(isGlobalAdmin && !propertyId ? {} : { property: propertyFilter })
                    },
                    _sum: { amount: true }
                })
            ]);

            const totalIncome = Number(income._sum?.amount || 0);
            const totalExpense = Number(expense._sum?.amount || 0);
            const totalPlatformFees = Number(platformFees._sum?.platformFee || 0);
            const netProfit = totalIncome - totalExpense - totalPlatformFees;

            const bookingsBySource = {
                online: publicCount,
                partner: cpCount,
                property: propertyCount,
                partial: partialData._count,
                partialAmount: Number(partialData._sum?.paidAmount || 0)
            };

            const cashInflowByMethod = cashPayments.reduce((acc: Record<string, number>, p: any) => {
                const method = p.paymentMethod || 'UNKNOWN';
                acc[method] = (acc[method] || 0) + Number(p.amount);
                return acc;
            }, {} as Record<string, number>);

            // General/manual income is also cash inflow in the period (attribute to CASH by default)
            const manualAmount = Number(generalIncome._sum?.amount || 0);
            if (manualAmount > 0) {
                cashInflowByMethod['CASH'] = (cashInflowByMethod['CASH'] || 0) + manualAmount;
            }

            const totalCashInflow = Object.values(cashInflowByMethod).reduce((a, b) => a + b, 0);

            // Duration in days for RevPAR calculation
            const days = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
            const availableNights = totalRooms * days;

            const adr = occupiedNights > 0 ? totalIncome / occupiedNights : 0;
            const revPar = availableNights > 0 ? totalIncome / availableNights : 0;

            return { totalIncome, totalExpenses: totalExpense, totalPlatformFees, netProfit, bookingsCount, adr, revPar, totalVolume: totalIncome, bookingsBySource, totalCashInflow, cashInflowByMethod }; // totalVolume as alias for totalIncome for legacy compatibility
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
        const rawIncomes = await this.prisma.income.findMany({
            where: {
                OR: [
                    {
                        bookingId: { not: null },
                        booking: {
                            checkInDate: { gte: sDate, lte: eDate },
                            property: propertyId ? { id: propertyId } : (isGlobalAdmin ? undefined : propertyFilter)
                        }
                    },
                    {
                        eventBookingId: { not: null },
                        eventBooking: {
                            event: {
                                date: { gte: sDate, lte: eDate },
                                property: propertyId ? { id: propertyId } : (isGlobalAdmin ? undefined : propertyFilter)
                            }
                        }
                    },
                    {
                        bookingId: null,
                        eventBookingId: null,
                        date: { gte: sDate, lte: eDate },
                        ...(isGlobalAdmin && !propertyId ? {} : { property: propertyFilter })
                    }
                ]
            },
            include: { property: true }
        });

        const incomeBySourceMap = new Map<string, { _sum: { amount: number }, _count: { _all: number } }>();
        for (const item of rawIncomes) {
            const source = item.source || 'UNKNOWN';
            if (!incomeBySourceMap.has(source)) {
                incomeBySourceMap.set(source, { _sum: { amount: 0 }, _count: { _all: 0 } });
            }
            const agg = incomeBySourceMap.get(source)!;
            agg._sum.amount += Number(item.amount || 0);
            agg._count._all += 1;
        }
        
        const incomeBySource = Array.from(incomeBySourceMap.entries()).map(([source, agg]) => ({
            source,
            _sum: agg._sum,
            _count: agg._count
        }));

        // Platform-Specific Financial Logic
        let platformSummary: any = null;
        if (isGlobalAdmin && !propertyId) {
            // Fetch settlements in this period to get ACCURATE profit (Realized Fees)
            const paidSettlements = await this.prisma.propertySettlement.findMany({
                where: {
                    status: SettlementStatus.PAID,
                    processedAt: { gte: sDate, lte: eDate }
                },
                include: { property: true, booking: { include: { cpTransactions: { where: { type: 'COMMISSION' } } } } }
            });

            const grossPlatformFees = paidSettlements.reduce((sum, s) => sum + Number(s.platformFee), 0);
            const totalCPCommission = paidSettlements.reduce((sum, s) => sum + Number(s.cpCommission), 0);

            // Total volume for gateway fee calculation (using booking totals for settled items)
            const totalVolume = paidSettlements.reduce((sum, s) => sum + Number(s.grossAmount), 0);
            const estimatedGatewayFees = (totalVolume * 2.5) / 100;

            // Breakdown of fees by property
            const platformFeeBreakdown = paidSettlements.reduce((acc: any[], s: any) => {
                const propertyName = s.property?.name || 'Unknown Property';
                const fee = Number(s.platformFee || 0);
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
            const incomeBreakdownArray = rawIncomes;

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
     * Get financial details (Booking & Income list)
     */
    async getFinancialDetails(user: any, startDate: Date, endDate: Date, propertyId?: string) {
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

        const bookings = await this.prisma.booking.findMany({
            where: {
                checkInDate: { gte: sDate, lte: eDate },
                room: { property: propertyFilter }
            },
            include: { user: { select: { firstName: true, lastName: true } }, room: true, roomType: true }
        });

        const incomes = await this.prisma.income.findMany({
            where: {
                OR: [
                    {
                        bookingId: { not: null },
                        booking: {
                            checkInDate: { gte: sDate, lte: eDate },
                            property: propertyFilter
                        }
                    },
                    {
                        eventBookingId: { not: null },
                        eventBooking: {
                            event: {
                                date: { gte: sDate, lte: eDate },
                                property: propertyFilter
                            }
                        }
                    },
                    {
                        bookingId: null,
                        eventBookingId: null,
                        date: { gte: sDate, lte: eDate },
                        ...(isGlobalAdmin && !propertyId ? {} : { property: propertyFilter })
                    }
                ]
            },
            include: { booking: { include: { user: { select: { firstName: true, lastName: true } } } }, payment: true }
        });

        const platformFeeDetails = await this.prisma.payment.findMany({
            where: {
                status: 'PAID',
                platformFee: { gt: 0 },
                OR: [
                    {
                        bookingId: { not: null },
                        booking: {
                            checkInDate: { gte: sDate, lte: eDate },
                            property: propertyFilter
                        }
                    },
                    {
                        bookingId: null,
                        paymentDate: { gte: sDate, lte: eDate },
                        ...(isGlobalAdmin && !propertyId ? {} : {}) // Adjust if payments without booking have property link
                    }
                ]
            },
            include: { booking: { include: { user: { select: { firstName: true, lastName: true } } } } }
        });

        return { bookings, incomes, platformFeeDetails };
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

            const activeBookings = await this.prisma.booking.findMany({
                where: {
                    status: { in: ['CHECKED_IN', 'CONFIRMED'] }, // Include confirmed for future dates
                    checkInDate: { lte: date },
                    checkOutDate: { gt: date },
                    room: { property: propertyFilter }
                },
                select: {
                    roomId: true,
                    roomBlocks: {
                        select: { roomId: true }
                    }
                }
            });

            const activeBlocks = await this.prisma.roomBlock.findMany({
                where: {
                    startDate: { lte: date },
                    endDate: { gt: date },
                    room: { property: propertyFilter }
                },
                select: {
                    roomId: true
                }
            });

            const uniqueOccupiedRooms = new Set<string>();
            activeBookings.forEach(b => {
                if (b.roomId) uniqueOccupiedRooms.add(b.roomId);
                b.roomBlocks?.forEach(rb => {
                    if (rb.roomId) uniqueOccupiedRooms.add(rb.roomId);
                });
            });

            activeBlocks.forEach(block => {
                if (block.roomId) uniqueOccupiedRooms.add(block.roomId);
            });

            const occupied = uniqueOccupiedRooms.size;

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
            const stayingBookings = await this.prisma.booking.findMany({
                where: {
                    roomTypeId: rt.id,
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                    checkInDate: { lte: eDate },
                    checkOutDate: { gte: sDate }
                }
            });

            // Count bookings created in this range
            const bookingsCount = await this.prisma.booking.count({
                where: {
                    roomTypeId: rt.id,
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                    checkInDate: { gte: sDate, lte: eDate }
                }
            });

            // Sum actual incomes recorded in this range for this room type
            const incomeAggregate = await this.prisma.income.aggregate({
                where: {
                    bookingId: { not: null },
                    booking: {
                        roomTypeId: rt.id,
                        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                        checkInDate: { gte: sDate, lte: eDate }
                    }
                },
                _sum: { amount: true }
            });
            const revenue = Number(incomeAggregate._sum.amount || 0);

            const totalRooms = rt.rooms.length;

            // Calculate total possible room nights
            const diffTime = Math.abs(eDate.getTime() - sDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            const possibleNights = totalRooms * diffDays;

            // Calculate actual occupied nights in range
            let occupiedNights = 0;
            stayingBookings.forEach(b => {
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
                bookingsCount,
                occupancyRate: possibleNights > 0 ? Math.round((occupiedNights / possibleNights) * 100) : 0,
                occupiedNights,
                possibleNights
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

    async generateExcelReport(user: any, startDate: Date, endDate: Date, propertyId?: string, section?: string): Promise<Buffer> {
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

        try {
            const financial = await this.getFinancialReport(user, sDate, eDate, propertyId);
            const occupancy = await this.getOccupancyReport(user, sDate, eDate, propertyId);
            const roomPerf = await this.getRoomPerformanceReport(user, sDate, eDate, propertyId);
            
            // Fetch Expenses
            const expenses = await this.prisma.expense.findMany({
                where: {
                    date: { gte: sDate, lte: eDate },
                    propertyId: propertyId || undefined,
                },
                include: { category: true }
            });
            const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

            let propertyName = "Global Network Analytics";
            if (propertyId) {
                const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
                if (property) propertyName = property.name;
            }

            const workbook = new ExcelJS.Workbook();
            const primaryColor = 'FF227C8A';
            const darkTeal = 'FF093F4A';
            const lightTeal = 'FFF1F8FA';

            const styleSheet = (ws: ExcelJS.Worksheet, title: string) => {
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

            const wantsAll = !section;

            if (wantsAll || section === 'summary') {
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
                    { metric: 'Total Gross Volume (Revenue)', value: `₹${(financial.summary?.totalVolume || financial.summary?.totalIncome || 0).toLocaleString()}` },
                    { metric: 'Total Platform Fees', value: `₹${(financial.summary?.totalPlatformFees || 0).toLocaleString()}` },
                    { metric: 'Total Confirmed Bookings', value: (financial.summary?.bookingsCount || 0) },
                    { metric: 'Average Occupancy Rate', value: `${occupancy.averageOccupancy || 0}%` },
                    { metric: 'Total Expenses', value: `₹${totalExpenses.toLocaleString()}` },
                    { metric: 'Net Revenue/Profit', value: `₹${(financial.summary?.netProfit || 0).toLocaleString()}` },
                ]);
            }

            if (wantsAll || section === 'sources') {
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
            }

            if (wantsAll || section === 'occupancy') {
                const occSheet = workbook.addWorksheet('Occupancy Trend');
                styleSheet(occSheet, 'Occupancy Trend');
                occSheet.columns = [
                    { header: 'Date', key: 'date', width: 20 },
                    { header: 'Occupancy Rate (%)', key: 'rate', width: 20 },
                    { header: 'Occupied Rooms', key: 'occupied', width: 20 },
                    { header: 'Total Rooms', key: 'total', width: 20 },
                ];
                occSheet.getRow(5).values = ['Date', 'Occupancy Rate (%)', 'Occupied Rooms', 'Total Rooms'];
                (occupancy.dailyStats || []).forEach((day: any) => {
                    occSheet.addRow({
                        date: new Date(day.date).toLocaleDateString(),
                        rate: day.occupancyRate,
                        occupied: day.occupied,
                        total: day.total,
                    });
                });
            }

            if (wantsAll || section === 'room-performance') {
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
            }

            if (wantsAll || section === 'expenses') {
                const expSheet = workbook.addWorksheet('Expenses');
                styleSheet(expSheet, 'Expenses Details');
                expSheet.columns = [
                    { header: 'Date', key: 'date', width: 15 },
                    { header: 'Category', key: 'category', width: 25 },
                    { header: 'Description', key: 'desc', width: 40 },
                    { header: 'Amount', key: 'amount', width: 20 },
                    { header: 'Status', key: 'status', width: 15 },
                ];
                expSheet.getRow(5).values = ['Date', 'Category', 'Description', 'Amount', 'Status'];
                expenses.forEach((exp: any) => {
                    expSheet.addRow({
                        date: new Date(exp.date).toLocaleDateString(),
                        category: exp.category?.name || 'Uncategorized',
                        desc: exp.description || 'N/A',
                        amount: `₹${Number(exp.amount).toLocaleString()}`,
                        status: exp.isPaid ? 'PAID' : 'PENDING'
                    });
                });
            }

            workbook.worksheets.forEach(ws => {
                ws.eachRow((row, rowNumber) => {
                    if (rowNumber > 5) {
                        if (rowNumber % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: lightTeal } };
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

    async generatePdfReport(user: any, startDate: Date, endDate: Date, propertyId?: string, section?: string, search?: string): Promise<Buffer> {
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

        try {
            const financial = await this.getFinancialReport(user, sDate, eDate, propertyId);
            const occupancy = await this.getOccupancyReport(user, sDate, eDate, propertyId);
            const roomPerf = await this.getRoomPerformanceReport(user, sDate, eDate, propertyId);
            const expenses = await this.prisma.expense.findMany({
                where: {
                    date: { gte: sDate, lte: eDate },
                    propertyId: propertyId || undefined,
                },
                include: { category: true }
            });
            const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

            let propertyName = "Global Network Analytics";
            if (propertyId) {
                const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
                if (property) propertyName = property.name;
            }

            log(`Generating PDF for property: ${propertyName}, period: ${sDate.toISOString()} to ${eDate.toISOString()}`);
            const fonts = {
                Roboto: {
                    normal: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
                    bold: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
                    italics: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
                    bolditalics: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf')
                }
            };

            const urlResolver = new URLResolver(virtualFs);
            const printer = new PdfPrinter(fonts, virtualFs, urlResolver);
            const wantsAll = !section;

            const contentBlocks: any[] = [];

            // Header (Always included)
            contentBlocks.push(
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { image: path.join(process.cwd(), 'src', 'assets', 'Route-guide.png'), width: 120 },
                                { text: section ? `${section.toUpperCase()} REPORT` : 'PERFORMANCE ANALYTICS REPORT', style: 'brandSub', margin: [0, 5, 0, 0] }
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
                {
                    table: { widths: ['*'], body: [[{ text: propertyName.toUpperCase(), style: 'propertyBanner' }]] },
                    layout: 'noBorders', margin: [0, 0, 0, 20]
                }
            );

            if (wantsAll || section === 'summary') {
                contentBlocks.push(
                    {
                        columns: [
                            { width: '*', stack: [{ text: 'TOTAL REVENUE', style: 'kpiLabel' }, { text: `₹${(financial.summary?.totalVolume || financial.summary?.totalIncome || 0).toLocaleString()}`, style: 'kpiValue' }] },
                            { width: '*', stack: [{ text: 'PLATFORM FEES', style: 'kpiLabel' }, { text: `₹${(financial.summary?.totalPlatformFees || 0).toLocaleString()}`, style: 'kpiValue' }] },
                            { width: '*', stack: [{ text: 'CONFIRMED BOOKINGS', style: 'kpiLabel' }, { text: (financial.summary?.bookingsCount || 0).toString(), style: 'kpiValue' }] },
                        ], margin: [0, 0, 0, 20]
                    },
                    {
                        columns: [
                            { width: '*', stack: [{ text: 'AVG. OCCUPANCY', style: 'kpiLabel' }, { text: `${occupancy.averageOccupancy || 0}%`, style: 'kpiValue' }] },
                            { width: '*', stack: [{ text: 'TOTAL EXPENSES', style: 'kpiLabel' }, { text: `₹${totalExpenses.toLocaleString()}`, style: 'kpiValue', color: '#ef4444' }] },
                            { width: '*', stack: [{ text: 'NET PROFIT', style: 'kpiLabel' }, { text: `₹${(financial.summary?.netProfit || 0).toLocaleString()}`, style: 'kpiValue', color: '#0d9488' }] }
                        ], margin: [0, 0, 0, 40]
                    }
                );
            }

            if (wantsAll || section === 'sources') {
                contentBlocks.push(
                    { text: 'REVENUE BY SOURCE', style: 'sectionHeader' },
                    {
                        table: {
                            widths: ['*', 'auto'],
                            body: [
                                [ { text: 'Source Channel', style: 'tableHeader' }, { text: 'Revenue', style: 'tableHeader', alignment: 'right' } ],
                                ...((financial.incomeBySource || []).map(item => [
                                    { text: (item.source || 'Direct').replace(/_/g, ' '), style: 'tableCell' },
                                    { text: `₹${Number(item._sum?.amount || 0).toLocaleString()}`, style: 'tableCellBold', alignment: 'right' }
                                ]))
                            ]
                        }, layout: 'lightHorizontalLines', margin: [0, 5, 0, 30]
                    }
                );
            }

            if (wantsAll || section === 'occupancy') {
                contentBlocks.push(
                    { text: 'OCCUPANCY TREND', style: 'sectionHeader' },
                    {
                        table: {
                            headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                [ { text: 'DATE', style: 'tableHeader' }, { text: 'RATE (%)', style: 'tableHeader', alignment: 'center' }, { text: 'OCCUPIED', style: 'tableHeader', alignment: 'center' }, { text: 'TOTAL', style: 'tableHeader', alignment: 'center' } ],
                                ...(occupancy.dailyStats || []).map((day: any) => [
                                    { text: new Date(day.date).toLocaleDateString(), style: 'tableCell' },
                                    { text: `${day.occupancyRate}%`, style: 'tableCell', alignment: 'center' },
                                    { text: (day.occupied || 0).toString(), style: 'tableCell', alignment: 'center' },
                                    { text: (day.total || 0).toString(), style: 'tableCell', alignment: 'center' }
                                ])
                            ]
                        },
                        layout: {
                            paddingTop: (i) => i === 0 ? 10 : 8, paddingBottom: (i) => i === 0 ? 10 : 8,
                            fillColor: (i) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null), hLineColor: () => '#e2e8f0',
                        }, margin: [0, 5, 0, 30]
                    }
                );
            }

            if (wantsAll || section === 'room-performance') {
                contentBlocks.push(
                    { text: 'ACCOMMODATION PERFORMANCE', style: 'sectionHeader' },
                    {
                        table: {
                            headerRows: 1, widths: ['*', 'auto', 'auto', 'auto'],
                            body: [
                                [ { text: 'UNIT TYPE', style: 'tableHeader' }, { text: 'BOOKINGS', style: 'tableHeader', alignment: 'center' }, { text: 'OCC. %', style: 'tableHeader', alignment: 'center' }, { text: 'TOTAL REVENUE', style: 'tableHeader', alignment: 'right' } ],
                                ...(roomPerf || []).map((item) => [
                                    { text: item.name || 'Unknown', style: 'tableCell' },
                                    { text: (item.bookingsCount || 0).toString(), style: 'tableCell', alignment: 'center' },
                                    { text: `${item.occupancyRate || 0}%`, style: 'tableCell', alignment: 'center' },
                                    { text: `₹${(item.revenue || 0).toLocaleString()}`, style: 'tableCellBold', alignment: 'right' }
                                ])
                            ]
                        },
                        layout: {
                            paddingTop: (i) => i === 0 ? 10 : 8, paddingBottom: (i) => i === 0 ? 10 : 8,
                            fillColor: (i) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null), hLineColor: () => '#e2e8f0',
                        }, margin: [0, 5, 0, 30]
                    }
                );
            }

            if (wantsAll || section === 'expenses') {
                contentBlocks.push(
                    { text: 'EXPENSES BREAKDOWN', style: 'sectionHeader' },
                    {
                        table: {
                            headerRows: 1, widths: ['auto', '*', '*', 'auto', 'auto'],
                            body: [
                                [ { text: 'DATE', style: 'tableHeader' }, { text: 'CATEGORY', style: 'tableHeader' }, { text: 'DESCRIPTION', style: 'tableHeader' }, { text: 'STATUS', style: 'tableHeader', alignment: 'center' }, { text: 'AMOUNT', style: 'tableHeader', alignment: 'right' } ],
                                ...expenses.map((exp: any) => [
                                    { text: new Date(exp.date).toLocaleDateString(), style: 'tableCell' },
                                    { text: exp.category?.name || 'Uncategorized', style: 'tableCell' },
                                    { text: exp.description || 'N/A', style: 'tableCell' },
                                    { text: exp.isPaid ? 'PAID' : 'PENDING', style: 'tableCell', alignment: 'center' },
                                    { text: `₹${Number(exp.amount).toLocaleString()}`, style: 'tableCellBold', alignment: 'right' }
                                ])
                            ]
                        },
                        layout: {
                            paddingTop: (i) => i === 0 ? 10 : 8, paddingBottom: (i) => i === 0 ? 10 : 8,
                            fillColor: (i) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null), hLineColor: () => '#e2e8f0',
                        }, margin: [0, 5, 0, 30]
                    }
                );
            }

            if (section === 'bookings_details' || section === 'revenue_details' || section === 'platform_fees_details') {
                const details = await this.getFinancialDetails(user, sDate, eDate, propertyId);

                if (section === 'bookings_details') {
                    contentBlocks.push(
                        { text: 'BOOKINGS DETAILS', style: 'sectionHeader' },
                        {
                            table: {
                                headerRows: 1, widths: ['auto', 'auto', 'auto', '*', 'auto', 'auto', 'auto'],
                                body: [
                                    [ { text: 'BOOKING #', style: 'tableHeader' }, { text: 'DATE', style: 'tableHeader' }, { text: 'DATES', style: 'tableHeader' }, { text: 'GUEST', style: 'tableHeader' }, { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }, { text: 'TAC', style: 'tableHeader', alignment: 'right' }, { text: 'STATUS', style: 'tableHeader', alignment: 'center' } ],
                                    ...details.bookings.map((b: any) => {
                                        const tac = Number(b.cpCommission || b.offlineCpCommission || 0);
                                        return [
                                            { text: `#${b.bookingNumber}`, style: 'tableCellBold' },
                                            { text: new Date(b.createdAt).toLocaleDateString(), style: 'tableCell' },
                                            { text: `${new Date(b.checkInDate).toLocaleDateString()} - ${new Date(b.checkOutDate).toLocaleDateString()}`, style: 'tableCell' },
                                            { text: b.user ? `${b.user.firstName} ${b.user.lastName}` : 'N/A', style: 'tableCell' },
                                            { text: `₹${Number(b.totalAmount).toLocaleString()}`, style: 'tableCellBold', alignment: 'right' },
                                            { text: tac > 0 ? `₹${tac.toLocaleString()}` : '—', style: 'tableCell', alignment: 'right' },
                                            { text: b.status, style: 'tableCell', alignment: 'center' }
                                        ];
                                    })
                                ]
                            },
                            layout: {
                                paddingTop: (i: number) => i === 0 ? 10 : 8, paddingBottom: (i: number) => i === 0 ? 10 : 8,
                                fillColor: (i: number) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null), hLineColor: () => '#e2e8f0',
                            }, margin: [0, 5, 0, 30]
                        }
                    );
                } else if (section === 'revenue_details') {
                    contentBlocks.push(
                        { text: 'REVENUE DETAILS', style: 'sectionHeader' },
                        {
                            table: {
                                headerRows: 1, widths: ['auto', 'auto', '*', 'auto'],
                                body: [
                                    [ { text: 'DATE RECEIVED', style: 'tableHeader' }, { text: 'SOURCE', style: 'tableHeader' }, { text: 'DESCRIPTION', style: 'tableHeader' }, { text: 'AMOUNT', style: 'tableHeader', alignment: 'right' } ],
                                    ...details.incomes.map((i: any) => [
                                        { text: new Date(i.date).toLocaleDateString(), style: 'tableCell' },
                                        { text: i.source.replace(/_/g, ' '), style: 'tableCellBold' },
                                        { text: i.description + (i.booking ? ` (Booking #${i.booking.bookingNumber})` : ''), style: 'tableCell' },
                                        { text: `₹${Number(i.amount).toLocaleString()}`, style: 'tableCellBold', alignment: 'right', color: '#059669' }
                                    ])
                                ]
                            },
                            layout: {
                                paddingTop: (i: number) => i === 0 ? 10 : 8, paddingBottom: (i: number) => i === 0 ? 10 : 8,
                                fillColor: (i: number) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null), hLineColor: () => '#e2e8f0',
                            }, margin: [0, 5, 0, 30]
                        }
                    );
                } else if (section === 'platform_fees_details') {
                    contentBlocks.push(
                        { text: 'PLATFORM FEES DETAILS', style: 'sectionHeader' },
                        {
                            table: {
                                headerRows: 1, widths: ['auto', '*', 'auto', 'auto'],
                                body: [
                                    [ { text: 'PAYMENT DATE', style: 'tableHeader' }, { text: 'BOOKING # / GUEST', style: 'tableHeader' }, { text: 'PAID AMOUNT', style: 'tableHeader', alignment: 'right' }, { text: 'PLATFORM FEE', style: 'tableHeader', alignment: 'right' } ],
                                    ...details.platformFeeDetails.map((p: any) => [
                                        { text: new Date(p.paymentDate).toLocaleDateString(), style: 'tableCell' },
                                        { text: `#${p.booking?.bookingNumber} - ${p.booking?.user?.firstName} ${p.booking?.user?.lastName}`, style: 'tableCell' },
                                        { text: `₹${Number(p.paidAmount).toLocaleString()}`, style: 'tableCell', alignment: 'right' },
                                        { text: `₹${Number(p.platformFee).toLocaleString()}`, style: 'tableCellBold', alignment: 'right', color: '#ea580c' }
                                    ])
                                ]
                            },
                            layout: {
                                paddingTop: (i: number) => i === 0 ? 10 : 8, paddingBottom: (i: number) => i === 0 ? 10 : 8,
                                fillColor: (i: number) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null), hLineColor: () => '#e2e8f0',
                            }, margin: [0, 5, 0, 30]
                        }
                    );
                }
            }

            contentBlocks.push({
                text: 'Disclaimer: This report is generated automatically by Route Guide Analytics. Data might have slight variations based on real-time processing.',
                style: 'disclaimer', margin: [0, 40, 0, 0]
            });

            const docDefinition: any = {
                pageSize: 'A4',
                pageMargins: [40, 60, 40, 60],
                content: contentBlocks,
                footer: (currentPage, pageCount) => ({
                    columns: [
                        { text: `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, style: 'footer' },
                        { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', style: 'footer' }
                    ], margin: [40, 0, 40, 0]
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

            const pdfDoc = await printer.createPdfKitDocument(docDefinition);

            return new Promise((resolve, reject) => {
                const chunks: any[] = [];
                pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
                pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
                pdfDoc.on('error', (err: any) => reject(err));
                pdfDoc.end();
            });
        } catch (error) {
            log(`Error generating PDF report: ${error.message}\nStack: ${error.stack}`);
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

    async getGstReport(user: any, startDate: Date, endDate: Date, propertyId?: string) {
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

        const bookings = await this.prisma.booking.findMany({
            where: {
                status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
                checkInDate: {
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
                confirmedAt: 'asc'
            }
        });

        const reportData = bookings.map(b => {
            const total = Number(b.totalAmount);
            const tax = Number(b.taxAmount || 0);
            const taxable = total - tax;

            return {
                id: b.id,
                bookingNumber: b.bookingNumber,
                date: b.confirmedAt,
                guestName: b.user ? `${b.user.firstName} ${b.user.lastName}` : 'Guest',
                gstNumber: b.gstNumber || 'N/A',
                propertyName: b.room?.property?.name || 'N/A',
                roomType: b.room?.roomType?.name || 'N/A',
                totalAmount: total,
                taxableAmount: taxable,
                taxAmount: tax,
            };
        });

        const summary = {
            totalVolume: reportData.reduce((sum, item) => sum + item.totalAmount, 0),
            totalTaxable: reportData.reduce((sum, item) => sum + item.taxableAmount, 0),
            totalTax: reportData.reduce((sum, item) => sum + item.taxAmount, 0),
            bookingCount: reportData.length,
        };

        return {
            summary,
            details: reportData
        };
    }

    async generateGstPdfReport(user: any, startDate: Date, endDate: Date, propertyId?: string): Promise<Buffer> {
        const report = await this.getGstReport(user, startDate, endDate, propertyId);
        const sDate = this.setStartOfDay(startDate);
        const eDate = this.setEndOfDay(endDate);

        let propertyName = "Global Network Analytics";
        let propertyGst = "N/A";
        if (propertyId) {
            const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
            if (property) {
                propertyName = property.name;
                propertyGst = property.gstNumber || 'N/A';
            }
        }

        const fonts = {
            Roboto: {
                normal: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-Regular.ttf'),
                bold: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-Medium.ttf'),
                italics: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-Italic.ttf'),
                bolditalics: path.join(pdfmakeDir, 'fonts', 'Roboto', 'Roboto-MediumItalic.ttf')
            }
        };

        const urlResolver = new URLResolver(virtualFs);
        const printer = new PdfPrinter(fonts, virtualFs, urlResolver);

        const docDefinition: any = {
            pageSize: 'A4',
            pageOrientation: 'landscape',
            pageMargins: [40, 60, 40, 60],
            content: [
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'GST COMPLIANCE REPORT', style: 'docTitle' },
                                { text: propertyName, style: 'propertyName' },
                                { text: `GSTIN: ${propertyGst}`, style: 'gstInfo' }
                            ]
                        },
                        {
                            width: 'auto',
                            stack: [
                                { image: path.join(process.cwd(), 'src', 'assets', 'Route-guide.png'), width: 120 },
                                { text: `Period: ${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`, style: 'docPeriod', margin: [0, 5, 0, 0] }
                            ],
                            alignment: 'right'
                        }
                    ],
                    margin: [0, 0, 0, 30]
                },

                // Summary Cards
                {
                    columns: [
                        {
                            width: '*',
                            stack: [
                                { text: 'TOTAL TAXABLE VALUE', style: 'kpiLabel' },
                                { text: `₹${report.summary.totalTaxable.toLocaleString()}`, style: 'kpiValue' }
                            ]
                        },
                        {
                            width: '*',
                            stack: [
                                { text: 'TOTAL GST COLLECTED', style: 'kpiLabel' },
                                { text: `₹${report.summary.totalTax.toLocaleString()}`, style: 'kpiValue', color: '#0d9488' }
                            ]
                        },
                        {
                            width: '*',
                            stack: [
                                { text: 'GROSS VOLUME', style: 'kpiLabel' },
                                { text: `₹${report.summary.totalVolume.toLocaleString()}`, style: 'kpiValue' }
                            ]
                        }
                    ],
                    margin: [0, 0, 0, 40]
                },

                // Detailed Table
                {
                    table: {
                        headerRows: 1,
                        widths: ['auto', 'auto', '*', 'auto', 'auto', 'auto', 'auto'],
                        body: [
                            [
                                { text: 'DATE', style: 'tableHeader' },
                                { text: 'BOOKING #', style: 'tableHeader' },
                                { text: 'GUEST NAME', style: 'tableHeader' },
                                { text: 'GUEST GST', style: 'tableHeader' },
                                { text: 'TAXABLE', style: 'tableHeader', alignment: 'right' },
                                { text: 'GST', style: 'tableHeader', alignment: 'right' },
                                { text: 'TOTAL', style: 'tableHeader', alignment: 'right' }
                            ],
                            ...report.details.map(item => [
                                { text: item.date ? new Date(item.date).toLocaleDateString() : 'N/A', style: 'tableCell' },
                                { text: item.bookingNumber, style: 'tableCell' },
                                { text: item.guestName, style: 'tableCell' },
                                { text: item.gstNumber, style: 'tableCell' },
                                { text: `₹${item.taxableAmount.toLocaleString()}`, style: 'tableCell', alignment: 'right' },
                                { text: `₹${item.taxAmount.toLocaleString()}`, style: 'tableCell', alignment: 'right' },
                                { text: `₹${item.totalAmount.toLocaleString()}`, style: 'tableCellBold', alignment: 'right' }
                            ])
                        ]
                    },
                    layout: {
                        fillColor: (i) => i === 0 ? '#093f4a' : (i % 2 === 0 ? '#f8fafc' : null),
                        hLineColor: () => '#e2e8f0',
                    }
                }
            ],
            footer: (currentPage, pageCount) => ({
                columns: [
                    { text: `Generated by Route Guide Analytics`, style: 'footer' },
                    { text: `Page ${currentPage} of ${pageCount}`, alignment: 'right', style: 'footer' }
                ],
                margin: [40, 0, 40, 0]
            }),
            styles: {
                brandLogo: { fontSize: 14, bold: true, color: '#227c8a' },
                docTitle: { fontSize: 18, bold: true, color: '#0f172a' },
                propertyName: { fontSize: 12, bold: true, color: '#1e293b', margin: [0, 5, 0, 0] },
                gstInfo: { fontSize: 10, color: '#64748b' },
                docPeriod: { fontSize: 10, color: '#64748b' },
                kpiLabel: { fontSize: 8, bold: true, color: '#64748b', letterSpacing: 1 },
                kpiValue: { fontSize: 16, bold: true, color: '#227c8a', margin: [0, 2, 0, 0] },
                tableHeader: { fontSize: 9, bold: true, color: '#ffffff', margin: [0, 5, 0, 5] },
                tableCell: { fontSize: 9, color: '#1e293b' },
                tableCellBold: { fontSize: 9, bold: true, color: '#0f172a' },
                footer: { fontSize: 8, color: '#cbd5e1' }
            },
            defaultStyle: { font: 'Roboto' }
        };

        const pdfDoc = await printer.createPdfKitDocument(docDefinition);
        return new Promise((resolve, reject) => {
            const chunks: any[] = [];
            pdfDoc.on('data', (chunk: any) => chunks.push(chunk));
            pdfDoc.on('end', () => resolve(Buffer.concat(chunks)));
            pdfDoc.on('error', (err: any) => reject(err));
            pdfDoc.end();
        });
    }
}
