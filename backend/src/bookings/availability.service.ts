import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus } from '@prisma/client';
import { PricingService } from './pricing.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { format, eachDayOfInterval, differenceInDays } from 'date-fns';
import { DateUtils } from '../common/utils/date.utils';
import {
    solveAccommodationOptions,
    RoomTypeInventoryCandidate,
    validatePhysicalFeasibility,
    validateChildAges,
} from '../common/utils/occupancy-solver.util';
import { FlexibleDateRateDto } from './dto/search-rooms.dto';
@Injectable()
export class AvailabilityService {
    constructor(
        private prisma: PrismaService,
        private pricingService: PricingService,
        private systemSettingsService: SystemSettingsService,
    ) { }

    /**
     * Check room availability for a given date range.
     * For group bookings, it ensures enough aggregate capacity is available.
     */
    async checkAvailability(
        roomTypeId: string | undefined,
        checkInDate: Date,
        checkOutDate: Date,
        isGroupBooking: boolean = false,
        groupSize?: number,
        propertyId?: string,
        includeAllStatus: boolean = false,
        excludeBookingId?: string,
    ): Promise<boolean> {
        if (isGroupBooking && groupSize && propertyId) {
            const allocated = await this.allocateRoomsForGroup(
                propertyId,
                checkInDate,
                checkOutDate,
                groupSize,
                includeAllStatus,
                excludeBookingId
            );
            return allocated.length > 0;
        }

        if (!roomTypeId) return false;

        const availableRooms = await this.getAvailableRooms(
            roomTypeId,
            checkInDate,
            checkOutDate,
            includeAllStatus,
            excludeBookingId
        );
        return availableRooms.length > 0;
    }

    /**
     * Greedy allocation for group bookings.
     * Finds available rooms in the property's "Group Pool" and fills them until groupSize is met.
     */
    async allocateRoomsForGroup(
        propertyId: string,
        checkIn: Date,
        checkOut: Date,
        groupSize: number,
        includeAllStatus: boolean = false,
        excludeBookingId?: string,
    ) {
        // Find all RoomTypes in the Group Pool for this property
        const groupPoolTypes = await this.prisma.roomType.findMany({
            where: {
                propertyId,
                isAvailableForGroupBooking: true,
            }
        });

        // If no room types are in the pool, allocation fails.
        // The caller can use hasGroupPool() to distinguish this from a capacity issue.
        if (groupPoolTypes.length === 0) return [];

        // Find all available rooms across these types
        let allAvailableRooms: any[] = [];
        for (const type of groupPoolTypes) {
            const availableForType = await this.getAvailableRooms(type.id, checkIn, checkOut, includeAllStatus, excludeBookingId);
            const isV2 = (type as any).totalMaxOccupancy !== null && (type as any).totalMaxOccupancy !== undefined;
            const roomCapacity = isV2
                ? Number((type as any).totalMaxOccupancy)
                : ((type as any).groupMaxOccupancy || (type.maxAdults + (type.maxChildren || 0)));
            allAvailableRooms.push(...availableForType.map(r => ({
                ...r,
                roomType: type,
                capacity: roomCapacity
            })));
        }

        // Sort by capacity descending to fill larger rooms first
        allAvailableRooms.sort((a, b) => b.capacity - a.capacity);

        let allocatedRooms: any[] = [];
        let remainingHeadcount = groupSize;
        for (const room of allAvailableRooms) {
            if (remainingHeadcount <= 0) break;
            allocatedRooms.push(room);
            remainingHeadcount -= room.capacity;
        }

        if (remainingHeadcount > 0) {
            return []; // Not enough capacity
        }

        return allocatedRooms;
    }
    /**
     * Returns true if the property has at least one room type
     * configured for the group booking pool.
     */
    async hasGroupPool(propertyId: string): Promise<boolean> {
        const count = await this.prisma.roomType.count({
            where: { propertyId, isAvailableForGroupBooking: true },
        });
        return count > 0;
    }



    /**
     * High-Performance Batch Availability Resolver.
     * Executes in only 3-4 indexed DB queries total for ANY number of room types or properties,
     * computing all physical room statuses, stop-sells, bookings, and blocks in-memory.
     */
    async getBatchRoomAvailability(
        roomTypeIds: string[],
        checkInDate: Date | string,
        checkOutDate: Date | string,
        excludeBookingId?: string,
        allowedRoomIds?: string[]
    ): Promise<{
        availableCountMap: Map<string, number>;
        availableRoomsMap: Map<string, any[]>;
    }> {
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        if (checkIn.getTime() === checkOut.getTime()) {
            checkOut.setHours(23, 59, 59, 999);
        }

        const availableCountMap = new Map<string, number>();
        const availableRoomsMap = new Map<string, any[]>();

        if (!roomTypeIds || roomTypeIds.length === 0) {
            return { availableCountMap, availableRoomsMap };
        }

        const uniqueRoomTypeIds = Array.from(new Set(roomTypeIds));

        // 1. Fetch Room Types with property info & enabled rooms in a single query
        const roomTypes = await this.prisma.roomType.findMany({
            where: { id: { in: uniqueRoomTypeIds } },
            include: {
                property: {
                    select: {
                        id: true,
                        defaultCheckOutTime: true
                    }
                },
                rooms: {
                    where: {
                        isEnabled: true,
                        status: { in: ['AVAILABLE', 'OCCUPIED'] }
                    },
                    select: {
                        id: true,
                        roomNumber: true,
                        status: true,
                        isEnabled: true,
                        roomTypeId: true,
                        propertyId: true,
                    }
                }
            }
        });

        const propertyIds = Array.from(new Set(roomTypes.map(rt => rt.propertyId).filter(Boolean)));
        let allPhysicalRooms = roomTypes.flatMap(rt => 
            (rt.rooms || []).map((r: any) => ({ ...r, roomTypeId: r?.roomTypeId || rt.id }))
        ).filter((r: any) => Boolean(r && r.id));

        if (allPhysicalRooms.length === 0) {
            const roomPromises = uniqueRoomTypeIds.map(async (rtId) => {
                const rooms = await this.prisma.room.findMany({
                    where: {
                        roomTypeId: rtId,
                        isEnabled: true,
                        status: { in: ['AVAILABLE', 'OCCUPIED'] }
                    },
                    select: {
                        id: true,
                        roomNumber: true,
                        status: true,
                        isEnabled: true,
                        roomTypeId: true,
                        propertyId: true,
                    }
                });
                return (rooms || []).map((r: any) => ({ ...r, roomTypeId: r?.roomTypeId || rtId }));
            });
            const fetchedRoomsArrays = await Promise.all(roomPromises);
            allPhysicalRooms = fetchedRoomsArrays.flat();
        }

        if (allowedRoomIds && allowedRoomIds.length > 0) {
            allPhysicalRooms = allPhysicalRooms.filter((r: any) => allowedRoomIds.includes(r.id));
        }

        const allRoomIds = allPhysicalRooms.map((r: any) => r.id);

        if (allRoomIds.length === 0) {
            uniqueRoomTypeIds.forEach(id => {
                availableCountMap.set(id, 0);
                availableRoomsMap.set(id, []);
            });
            return { availableCountMap, availableRoomsMap };
        }

        const roomsByTypeId = new Map<string, any[]>();
        for (const r of allPhysicalRooms) {
            if (r.roomTypeId) {
                if (!roomsByTypeId.has(r.roomTypeId)) {
                    roomsByTypeId.set(r.roomTypeId, []);
                }
                roomsByTypeId.get(r.roomTypeId)!.push(r);
            }
        }

        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        // 2. Batch fetch active Stop-Sell restrictions
        const stopSells = await this.prisma.stopSellRestriction.findMany({
            where: {
                propertyId: { in: propertyIds },
                isActive: true,
                OR: [
                    { roomTypeId: null },
                    { roomTypeId: { in: uniqueRoomTypeIds } }
                ],
                startDate: { lte: checkOut },
                endDate: { gte: checkIn }
            },
            select: {
                propertyId: true,
                roomTypeId: true
            }
        });

        const blockedRoomTypeIds = new Set<string>();
        for (const ss of stopSells) {
            if (ss.roomTypeId) {
                blockedRoomTypeIds.add(ss.roomTypeId);
            } else if (ss.propertyId) {
                // Property-wide stop-sell blocks all room types of that property
                roomTypes.filter(rt => rt.propertyId === ss.propertyId).forEach(rt => blockedRoomTypeIds.add(rt.id));
            }
        }

        // 3. Batch fetch overlapping bookings
        const overlappingBookings = await this.prisma.booking.findMany({
            where: {
                OR: [
                    { roomId: { in: allRoomIds } },
                    { bookingRooms: { some: { roomId: { in: allRoomIds } } } }
                ],
                AND: [
                    {
                        OR: [
                            { status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] } },
                            {
                                AND: [
                                    { status: 'PENDING_PAYMENT' },
                                    { createdAt: { gte: thirtyMinutesAgo } }
                                ]
                            }
                        ]
                    },
                    {
                        OR: [
                            {
                                AND: [
                                    { checkInDate: { lte: checkIn } },
                                    { checkOutDate: { gt: checkIn } },
                                ]
                            },
                            {
                                AND: [
                                    { checkInDate: { lt: checkOut } },
                                    { checkOutDate: { gte: checkOut } },
                                ]
                            },
                            {
                                AND: [
                                    { checkInDate: { gte: checkIn } },
                                    { checkOutDate: { lte: checkOut } },
                                ]
                            }
                        ]
                    }
                ],
                NOT: excludeBookingId ? { id: excludeBookingId } : undefined,
            },
            select: {
                id: true,
                roomId: true,
                bookingRooms: {
                    select: { roomId: true }
                }
            }
        });

        const bookedRoomIds = new Set<string>();
        for (const b of overlappingBookings) {
            if (b.roomId) bookedRoomIds.add(b.roomId);
            if (b.bookingRooms) {
                for (const br of b.bookingRooms) {
                    if (br.roomId) bookedRoomIds.add(br.roomId);
                }
            }
        }

        // 4. Batch fetch overlapping RoomBlocks
        const overlappingBlocks = await this.prisma.roomBlock.findMany({
            where: {
                roomId: { in: allRoomIds },
                OR: [
                    {
                        AND: [
                            { startDate: { lte: checkIn } },
                            { endDate: { gt: checkIn } }
                        ]
                    },
                    {
                        AND: [
                            { startDate: { lt: checkOut } },
                            { endDate: { gte: checkOut } }
                        ]
                    },
                    {
                        AND: [
                            { startDate: { gte: checkIn } },
                            { endDate: { lte: checkOut } }
                        ]
                    }
                ]
            },
            select: { roomId: true }
        });

        for (const block of overlappingBlocks) {
            bookedRoomIds.add(block.roomId);
        }

        // 5. Smart-today check handling (fast in-memory threshold check)
        const todayStr = DateUtils.getTodayStr();
        const checkInStr = DateUtils.toCalendarDateStr(checkIn);
        const isTodayCheckIn = checkInStr <= todayStr;

        for (const rt of roomTypes) {
            if (blockedRoomTypeIds.has(rt.id)) {
                availableCountMap.set(rt.id, 0);
                availableRoomsMap.set(rt.id, []);
                continue;
            }

            const candidateRooms = (rt.rooms && rt.rooms.length > 0)
                ? rt.rooms
                : (roomsByTypeId.get(rt.id) || []);

            const freeRooms: any[] = [];
            for (const room of candidateRooms) {
                if (!room || room.status === 'MAINTENANCE') continue;
                if (bookedRoomIds.has(room.id)) continue;

                // If checkIn is today and room is occupied, verify turnover threshold
                if (isTodayCheckIn && room.status === 'OCCUPIED') {
                    const checkOutTimeStr = rt.property?.defaultCheckOutTime || '11:00';
                    const [hours, minutes] = checkOutTimeStr.split(':').map(Number);
                    const checkoutThreshold = new Date();
                    checkoutThreshold.setHours(hours, minutes, 0, 0);
                    checkoutThreshold.setMinutes(checkoutThreshold.getMinutes() + 60);
                    if (new Date() > checkoutThreshold) {
                        continue; // Overstay block
                    }
                }

                freeRooms.push(room);
            }

            availableCountMap.set(rt.id, freeRooms.length);
            availableRoomsMap.set(rt.id, freeRooms);
        }

        // Ensure every requested roomTypeId has an entry
        for (const id of uniqueRoomTypeIds) {
            if (!availableCountMap.has(id)) {
                availableCountMap.set(id, 0);
                availableRoomsMap.set(id, []);
            }
        }


        return { availableCountMap, availableRoomsMap };
    }

    async getAvailableRooms(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
        includeAllStatus: boolean = false,
        excludeBookingId?: string,
    ) {
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        if (new Date(checkInDate).getTime() === new Date(checkOutDate).getTime()) {
            checkOut.setHours(23, 59, 59, 999);
        }

        let availableRooms: any[] = [];

        if (!includeAllStatus) {
            const { availableRoomsMap } = await this.getBatchRoomAvailability(
                [roomTypeId],
                checkInDate,
                checkOutDate,
                excludeBookingId,
            );
            availableRooms = availableRoomsMap.get(roomTypeId) || [];
        } else {
            // Admin includeAllStatus fallback
            const allRooms = await this.prisma.room.findMany({
                where: {
                    roomTypeId,
                    isEnabled: true,
                },
            });

            for (const room of allRooms) {
                const isAvailable = await this.isRoomAvailable(
                    room.id,
                    checkInDate,
                    checkOutDate,
                    excludeBookingId,
                );
                if (isAvailable) {
                    availableRooms.push(room);
                }
            }
        }

        // ─── Consolidation Sorting ──────────────────────────────────────────────
        // Sort available rooms by "booking density" (most booked first) in a single batch query
        if (availableRooms.length > 1) {
            try {
                const roomType = await this.prisma.roomType.findUnique({
                    where: { id: roomTypeId },
                    select: { propertyId: true },
                });
                const propertyId = roomType?.propertyId;

                let windowDays = 90;
                if (propertyId) {
                    const farthestBooking = await this.prisma.booking.findFirst({
                        where: {
                            propertyId,
                            status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] },
                            checkOutDate: { gte: checkIn },
                        },
                        orderBy: { checkOutDate: 'desc' },
                        select: { checkOutDate: true },
                    });

                    if (farthestBooking) {
                        const daysToFarthest = differenceInDays(
                            new Date(farthestBooking.checkOutDate),
                            checkIn,
                        );
                        windowDays = Math.min(Math.max(daysToFarthest, 90), 730);
                    }

                    const windowEnd = new Date(checkIn);
                    windowEnd.setDate(windowEnd.getDate() + windowDays);

                    const roomIds = availableRooms.map(r => r.id);
                    // Fetch all upcoming bookings for this property in a single fast query
                    const upcomingBookings = await this.prisma.booking.findMany({
                        where: {
                            OR: [
                                { roomId: { in: roomIds } },
                                { bookingRooms: { some: { roomId: { in: roomIds } } } },
                            ],
                            status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] },
                            checkInDate: { lte: windowEnd },
                            checkOutDate: { gte: checkIn },
                        },
                        select: {
                            roomId: true,
                            checkInDate: true,
                            checkOutDate: true,
                            bookingRooms: { select: { roomId: true } }
                        },
                    });

                    for (const room of availableRooms) {
                        let bookedNights = 0;
                        for (const b of upcomingBookings) {
                            const isThisRoom = b.roomId === room.id || b.bookingRooms?.some(br => br.roomId === room.id);
                            if (!isThisRoom) continue;

                            const bIn = new Date(b.checkInDate) < checkIn ? checkIn : new Date(b.checkInDate);
                            const bOut = new Date(b.checkOutDate) > windowEnd ? windowEnd : new Date(b.checkOutDate);
                            bookedNights += Math.max(0, differenceInDays(bOut, bIn));
                        }
                        room.consolidationScore = bookedNights;
                    }

                    availableRooms.sort((a, b) => (b.consolidationScore ?? 0) - (a.consolidationScore ?? 0));
                }
            } catch (err: any) {
                console.warn('[ConsolidationSort] Scoring failed, using default order:', err?.message);
            }
        }

        return availableRooms;
    }


    /**
     * Check if a specific room is available for the given date range.
     * Accepts an optional prismaClient to run within an existing transaction.
     */
    async isRoomAvailable(
        roomId: string,
        checkIn: Date | string,
        checkOut: Date | string,
        excludeBookingId?: string,
        prismaClient?: any
    ): Promise<boolean> {
        // Run the battle-tested legacy logic
        const legacyResult = await this.isRoomAvailableLegacy(roomId, checkIn, checkOut, excludeBookingId, prismaClient);

        // Phase 4: Parallel Background Execution
        // We run the new unified BookingRoom logic asynchronously so it doesn't block the API
        this.isRoomAvailableV2(roomId, checkIn, checkOut, excludeBookingId, prismaClient)
            .then(v2Result => {
                if (legacyResult !== v2Result) {
                    console.error(`[PHASE_4_MISMATCH] Room ${roomId} | Legacy: ${legacyResult} | Unified: ${v2Result} | Dates: ${new Date(checkIn).toISOString()} to ${new Date(checkOut).toISOString()}`);
                }
            })
            .catch(err => {
                console.error(`[PHASE_4_ERROR] Unified availability check failed for room ${roomId}:`, err);
            });

        return legacyResult;
    }

    /**
     * Legacy isRoomAvailable (Phase 1-3 logic)
     */
    async isRoomAvailableLegacy(
        roomId: string,
        checkIn: Date | string,
        checkOut: Date | string,
        excludeBookingId?: string,
        prismaClient?: any
    ): Promise<boolean> {
        const db = prismaClient || this.prisma;

        // 1. Fetch Room and check basic status
        const room = await db.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true, isEnabled: true, status: true, property: { select: { defaultCheckOutTime: true } } }
        });

        if (!room || !room.isEnabled) return false;

        // Strict Status Blocks: If room is Maintenance, it cannot be booked at all.
        // We do NOT check for 'BLOCKED' here because blocks have specific start/end dates.
        // The RoomBlock overlap query below will accurately determine if it is blocked for the requested dates.
        if (room.status === 'MAINTENANCE') {
            return false;
        }

        const checkInDate = new Date(checkIn);
        checkInDate.setHours(0, 0, 0, 0);
        const checkOutDate = new Date(checkOut);
        checkOutDate.setHours(0, 0, 0, 0);

        if (checkInDate.getTime() === checkOutDate.getTime()) {
            checkOutDate.setHours(23, 59, 59, 999);
        }

        // Time-aware Smart Today check
        const todayStr = DateUtils.getTodayStr();
        const checkInStr = DateUtils.toCalendarDateStr(checkInDate);
        
        if (checkInStr <= todayStr && room.status === 'OCCUPIED') {
            const checkOutTimeStr = room.property?.defaultCheckOutTime || '11:00';
            const [hours, minutes] = checkOutTimeStr.split(':').map(Number);
            
            const checkoutThreshold = new Date();
            checkoutThreshold.setHours(hours, minutes, 0, 0);
            checkoutThreshold.setMinutes(checkoutThreshold.getMinutes() + 60); // 60 mins grace period
            
            const now = new Date();
            if (now > checkoutThreshold) {
                console.log(`[SMART_TODAY_CHECK] Room ID: ${room.id} | Room Number: ${room.roomNumber} | Decision: BLOCK | Reason: OVERSTAY`);
                return false;
            } else {
                // Safety verification query
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                
                const tomorrowMidnight = new Date(todayMidnight);
                tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

                const activeBooking = await db.booking.findFirst({
                    where: {
                        OR: [
                            { roomId: room.id },
                            { roomBlocks: { some: { roomId: room.id } } }
                        ],
                        status: 'CHECKED_IN',
                        checkOutDate: {
                            gte: todayMidnight,
                            lt: tomorrowMidnight
                        }
                    }
                });

                if (activeBooking) {
                    console.log(`[SMART_TODAY_CHECK] Room ID: ${room.id} | Room Number: ${room.roomNumber} | Decision: ALLOW_TURNOVER | Reason: CHECKED_IN_BOOKING_FOUND`);
                    // continue existing overlap query logic
                } else {
                    console.log(`[SMART_TODAY_CHECK] Room ID: ${room.id} | Room Number: ${room.roomNumber} | Decision: BLOCK | Reason: MANUAL_OCCUPIED`);
                    return false;
                }
            }
        }

        // 2. Check for overlapping bookings
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        const overlappingBookings = await db.booking.findMany({
            where: {
                OR: [
                    { roomId },
                    { bookingRooms: { some: { roomId } } }
                ],
                AND: [
                    {
                        OR: [
                            { status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] } }, 
                            {
                                AND: [
                                    { status: 'PENDING_PAYMENT' },
                                    { createdAt: { gte: thirtyMinutesAgo } } // Blocks for 30 minutes to allow payment
                                ]
                            }
                        ]
                    },
                    {
                        OR: [
                            {
                                // New booking starts during existing booking
                                AND: [
                                    { checkInDate: { lte: checkInDate } },
                                    { checkOutDate: { gt: checkInDate } },
                                ],
                            },
                            {
                                // New booking ends during existing booking
                                AND: [
                                    { checkInDate: { lt: checkOutDate } },
                                    { checkOutDate: { gte: checkOutDate } },
                                ],
                            },
                            {
                                // New booking completely contains existing booking
                                AND: [
                                    { checkInDate: { gte: checkInDate } },
                                    { checkOutDate: { lte: checkOutDate } },
                                ],
                            },
                        ]
                    }
                ],
                NOT: excludeBookingId ? { id: excludeBookingId } : undefined,
            },
        });

        if (overlappingBookings.length > 0) {
            return false;
        }

        // 3. Check for room blocks
        const overlappingBlocks = await db.roomBlock.findMany({
            where: {
                roomId,
                OR: [
                    {
                        AND: [
                            { startDate: { lte: checkInDate } },
                            { endDate: { gt: checkInDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { lt: checkOutDate } },
                            { endDate: { gte: checkOutDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { gte: checkInDate } },
                            { endDate: { lte: checkOutDate } },
                        ],
                    },
                ],
                ...(excludeBookingId ? {
                    NOT: { bookingId: excludeBookingId }
                } : {}),
            },
        });

        let validBlocks = overlappingBlocks;
        if (overlappingBlocks.length > 0) {
            // Find active bookings for this room that overlap with the blocks
            const activeBookings = await db.booking.findMany({
                where: {
                    OR: [
                        { roomId },
                        { bookingRooms: { some: { roomId } } }
                    ],
                    status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] },
                    ...(excludeBookingId ? { NOT: { id: excludeBookingId } } : {}),
                },
                select: { checkInDate: true, checkOutDate: true },
            });

            validBlocks = overlappingBlocks.filter((b: any) => {
                const blockStart = new Date(b.startDate); blockStart.setHours(0, 0, 0, 0);
                const blockEnd = new Date(b.endDate); blockEnd.setHours(0, 0, 0, 0);

                const overlapsWithBooking = activeBookings.some((bk: any) => {
                    const checkIn = new Date(bk.checkInDate); checkIn.setHours(0, 0, 0, 0);
                    const checkOut = new Date(bk.checkOutDate); checkOut.setHours(0, 0, 0, 0);
                    // Check overlap: checkIn < blockEnd && checkOut > blockStart
                    return checkIn < blockEnd && checkOut > blockStart;
                });

                return !overlapsWithBooking;
            });
        }

        if (validBlocks.length > 0) {
            return false;
        }

        return true;
    }

    /**
     * Phase 4: Unified BookingRoom availability logic
     * This fully replaces the dual Booking + RoomBlock overlap query.
     */
    private async isRoomAvailableV2(
        roomId: string,
        checkIn: Date | string,
        checkOut: Date | string,
        excludeBookingId?: string,
        prismaClient?: any
    ): Promise<boolean> {
        const db = prismaClient || this.prisma;

        // 1. Fetch Room and check basic status
        const room = await db.room.findUnique({
            where: { id: roomId },
            select: { id: true, roomNumber: true, isEnabled: true, status: true, property: { select: { defaultCheckOutTime: true } } }
        });

        if (!room || !room.isEnabled) return false;

        // Strict Status Blocks: If room is Maintenance, it cannot be booked at all.
        // We do NOT check for 'BLOCKED' here because blocks have specific start/end dates.
        // The RoomBlock overlap query below will accurately determine if it is blocked for the requested dates.
        if (room.status === 'MAINTENANCE') {
            return false;
        }

        const checkInDate = new Date(checkIn);
        checkInDate.setHours(0, 0, 0, 0);
        const checkOutDate = new Date(checkOut);
        checkOutDate.setHours(0, 0, 0, 0);

        if (checkInDate.getTime() === checkOutDate.getTime()) {
            checkOutDate.setHours(23, 59, 59, 999);
        }

        // Time-aware Smart Today check
        const todayStr = DateUtils.getTodayStr();
        const checkInStr = DateUtils.toCalendarDateStr(checkInDate);
        
        if (checkInStr <= todayStr && room.status === 'OCCUPIED') {
            const checkOutTimeStr = room.property?.defaultCheckOutTime || '11:00';
            const [hours, minutes] = checkOutTimeStr.split(':').map(Number);
            
            const checkoutThreshold = new Date();
            checkoutThreshold.setHours(hours, minutes, 0, 0);
            checkoutThreshold.setMinutes(checkoutThreshold.getMinutes() + 60);
            
            const now = new Date();
            if (now > checkoutThreshold) {
                return false;
            } else {
                const todayMidnight = new Date();
                todayMidnight.setHours(0, 0, 0, 0);
                const tomorrowMidnight = new Date(todayMidnight);
                tomorrowMidnight.setDate(tomorrowMidnight.getDate() + 1);

                // Phase 4 difference: Use the new unified bookingRooms relation!
                // The any-cast avoids TS errors before 'prisma generate' is run by the user.
                const activeBooking = await db.booking.findFirst({
                    where: {
                        ...({ bookingRooms: { some: { roomId: room.id } } } as any),
                        status: 'CHECKED_IN',
                        checkOutDate: { gte: todayMidnight, lt: tomorrowMidnight }
                    }
                });

                if (!activeBooking) {
                    return false;
                }
            }
        }

        // 2. The new unified overlap query using bookingRooms
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        // Phase 4 difference: We drop db.booking and db.roomBlock queries completely.
        // We use db.bookingRoom directly.
        if (!(db as any).bookingRoom) return true; // Fail gracefully if prisma not generated yet

        const overlappingBookingRooms = await (db as any).bookingRoom.findMany({
            where: {
                roomId,
                booking: {
                    AND: [
                        {
                            OR: [
                                { status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED'] } }, 
                                {
                                    AND: [
                                        { status: 'PENDING_PAYMENT' },
                                        { createdAt: { gte: thirtyMinutesAgo } }
                                    ]
                                }
                            ]
                        },
                        {
                            OR: [
                                { AND: [{ checkInDate: { lte: checkInDate } }, { checkOutDate: { gt: checkInDate } }] },
                                { AND: [{ checkInDate: { lt: checkOutDate } }, { checkOutDate: { gte: checkOutDate } }] },
                                { AND: [{ checkInDate: { gte: checkInDate } }, { checkOutDate: { lte: checkOutDate } }] },
                            ]
                        }
                    ],
                    NOT: excludeBookingId ? { id: excludeBookingId } : undefined,
                }
            }
        });

        if (overlappingBookingRooms.length > 0) {
            return false;
        }

        return true;
    }

    /**
     * Get available room count for a room type
     */
    async getAvailableRoomCount(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
        includeAllStatus: boolean = false,
        excludeBookingId?: string,
    ): Promise<number> {
        const availableRooms = await this.getAvailableRooms(
            roomTypeId,
            checkInDate,
            checkOutDate,
            includeAllStatus,
            excludeBookingId,
        );
        return availableRooms.length;
    }

    /**
     * Get day-by-day availability for a calendar view
     */
    async getCalendarAvailability(
        propertyId: string,
        startDate: string,
        endDate: string,
        roomTypeId?: string,
        isGroupBooking: boolean = false,
        excludeBookingId?: string
    ) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        let totalRoomsOfType = 0;
        let groupPoolRoomTypeIds: string[] = [];

        if (isGroupBooking) {
            const groupPoolTypes = await this.prisma.roomType.findMany({
                where: { propertyId, isAvailableForGroupBooking: true }
            });
            groupPoolRoomTypeIds = groupPoolTypes.map(rt => rt.id);
            totalRoomsOfType = await this.prisma.room.count({
                where: { propertyId, roomTypeId: { in: groupPoolRoomTypeIds }, isEnabled: true }
            });
        } else if (roomTypeId) {
            totalRoomsOfType = await this.prisma.room.count({
                where: { propertyId, roomTypeId, isEnabled: true }
            });
        }

        const bookings = await this.prisma.booking.findMany({
            where: {
                propertyId,
                status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED', 'PENDING_PAYMENT'] },
                id: excludeBookingId ? { not: excludeBookingId } : undefined,
                OR: [
                    {
                        checkInDate: { lte: end },
                        checkOutDate: { gte: start }
                    }
                ]
            },
            include: {
                bookingRooms: {
                    include: { room: true }
                }
            }
        });

        // Load active stop sell restrictions for the range
        const stopSells = await this.prisma.stopSellRestriction.findMany({
            where: {
                propertyId,
                isActive: true,
                startDate: { lte: end },
                endDate: { gte: start }
            }
        });

        // Load active room blocks for the range
        const blocksWhere: any = {};
        if (isGroupBooking) {
            blocksWhere.room = {
                propertyId,
                roomTypeId: { in: groupPoolRoomTypeIds },
                isEnabled: true
            };
        } else if (roomTypeId) {
            blocksWhere.room = {
                propertyId,
                roomTypeId,
                isEnabled: true
            };
        } else {
            blocksWhere.room = {
                propertyId,
                isEnabled: true
            };
        }

        blocksWhere.AND = [
            { startDate: { lte: end } },
            { endDate: { gte: start } }
        ];

        if (excludeBookingId) {
            blocksWhere.NOT = { bookingId: excludeBookingId };
        }

        const roomBlocks = await this.prisma.roomBlock.findMany({
            where: blocksWhere,
            select: {
                id: true,
                startDate: true,
                endDate: true,
                roomId: true
            }
        });

        const calendarDays = eachDayOfInterval({ start, end });
        const result: Record<string, { available: number, total: number, isFull: boolean }> = {};

        for (const day of calendarDays) {
            const dateStr = format(day, 'yyyy-MM-dd');
            let occupiedRooms = 0;

            for (const b of bookings) {
                if (b.status === 'PENDING_PAYMENT') {
                    const thirtyMinsAgo = new Date(Date.now() - 30 * 60000);
                    if (b.createdAt < thirtyMinsAgo) continue;
                }

                const bCheckIn = new Date(b.checkInDate);
                bCheckIn.setHours(0, 0, 0, 0);
                const bCheckOut = new Date(b.checkOutDate);
                bCheckOut.setHours(0, 0, 0, 0);

                if (day >= bCheckIn && day < bCheckOut) {
                    if (isGroupBooking) {
                        occupiedRooms += b.bookingRooms.filter((br: any) => 
                            br.room?.roomTypeId && groupPoolRoomTypeIds.includes(br.room.roomTypeId)
                        ).length;
                    } else if (roomTypeId) {
                        occupiedRooms += b.bookingRooms.filter((br: any) => 
                            br.room?.roomTypeId === roomTypeId
                        ).length;
                    }
                }
            }

            let blockedRooms = 0;
            for (const blk of roomBlocks) {
                const blkStart = new Date(blk.startDate);
                blkStart.setHours(0, 0, 0, 0);
                const blkEnd = new Date(blk.endDate);
                blkEnd.setHours(0, 0, 0, 0);

                if (day >= blkStart && day < blkEnd) {
                    blockedRooms++;
                }
            }

            const dayStart = new Date(day);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(day);
            dayEnd.setHours(23, 59, 59, 999);

            const hasStopSell = stopSells.some(ss => {
                const ssStart = new Date(ss.startDate);
                ssStart.setHours(0, 0, 0, 0);
                const ssEnd = new Date(ss.endDate);
                ssEnd.setHours(23, 59, 59, 999);

                const matchesRoomType = !ss.roomTypeId || (roomTypeId && ss.roomTypeId === roomTypeId) || (isGroupBooking && groupPoolRoomTypeIds.includes(ss.roomTypeId));
                return matchesRoomType && dayStart <= ssEnd && dayEnd >= ssStart;
            });

            const availableCount = hasStopSell ? 0 : Math.max(0, totalRoomsOfType - occupiedRooms - blockedRooms);
            result[dateStr] = {
                available: availableCount,
                total: totalRoomsOfType,
                isFull: totalRoomsOfType > 0 && availableCount === 0
            };
        }

        return result;
    }
    /**
     * Search for all room types available for the given criteria
     */
    async searchAvailableRoomTypes(
        checkInDate: Date,
        checkOutDate: Date,
        adults: number,
        children: number,
        location?: string,
        type?: string,
        includeSoldOut: boolean = false,
        rooms: number = 1,
        categoryId?: string,
        latitude?: number,
        longitude?: number,
        radius?: number,
        currency: string = 'INR',
        propertyId?: string,
        isGroupBooking: boolean = false,
        groupSize?: number,
        infants: number = 0,
        childAges?: number[],
        includeFlexibleDates: boolean = false,
        roomTypeIds?: string[],
        roomIds?: string[],
    ) {
        if (!isGroupBooking && children > 0) {
            validateChildAges(children, childAges);
        }

        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        let geoPropertyIds: string[] | null = null;

        // Handle geo-spatial search if lat/lng are provided
        const defaultRadius = await this.systemSettingsService.getSetting('SEARCH_RADIUS') || 50;
        const searchRadius = radius ?? defaultRadius;
        if (latitude !== undefined && longitude !== undefined) {
            const results = await this.prisma.$queryRaw<any[]>`
                SELECT id FROM properties
                WHERE (
                    6371 * acos(
                        cos(radians(${Number(latitude)})) * cos(radians(CAST(latitude AS DOUBLE PRECISION))) *
                        cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${Number(longitude)})) +
                        sin(radians(${Number(latitude)})) * sin(radians(CAST(latitude AS DOUBLE PRECISION)))
                    )
                ) <= ${Number(searchRadius)}
            `;
            geoPropertyIds = results.map(r => r.id);
        }

        // Required capacity per room for legacy V1 calculations
        const minAdultsPerRoom = Math.ceil(adults / Math.max(1, rooms));
        const minChildrenPerRoom = Math.ceil(children / Math.max(1, rooms));

        const locationFilter = location ? [
            { city: { contains: location, mode: 'insensitive' } },
            { city: { startsWith: location.substring(0, Math.min(location.length, 6)), mode: 'insensitive' } },
            { address: { contains: location, mode: 'insensitive' } },
            { state: { contains: location, mode: 'insensitive' } },
            { name: { contains: location, mode: 'insensitive' } },
        ] : [];

        const geoOrLocationFilter = () => {
            if (propertyId) return { id: propertyId };
            if (geoPropertyIds !== null) {
                return {
                    OR: [
                        { id: { in: geoPropertyIds } },
                        ...(location ? [{
                            AND: [
                                { latitude: null },
                                { OR: locationFilter as any }
                            ]
                        }] : [])
                    ]
                };
            }
            if (location) {
                return { OR: locationFilter as any };
            }
            return {};
        };

        const results: any[] = [];

        if (isGroupBooking) {
            // Group Booking Search: Check total capacity of the property's group pool
            const properties = await this.prisma.property.findMany({
                where: {
                    // Enablement check
                    OR: [
                        { allowsGroupBooking: true },
                        { roomTypes: { some: { isAvailableForGroupBooking: true, ...(roomTypeIds && roomTypeIds.length > 0 ? { id: { in: roomTypeIds } } : {}) } } }
                    ],
                    // Property-wide capacity cap (if set)
                    AND: [
                        {
                            OR: [
                                { maxGroupCapacity: null },
                                { maxGroupCapacity: groupSize ? { gte: groupSize } : undefined }
                            ]
                        }
                    ],
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    categoryId: (categoryId && categoryId !== 'all') ? categoryId : undefined,
                    ...geoOrLocationFilter(),

                    ...(type && type !== 'ALL' && { type: type as any }),
                },
                include: {
                    roomTypes: {
                        where: { 
                            isAvailableForGroupBooking: true,
                            ...(roomTypeIds && roomTypeIds.length > 0 ? { id: { in: roomTypeIds } } : {})
                        },
                    },
                    _count: { select: { rooms: true } }
                }
            });

            const allGroupTypeIds = properties.flatMap(p => p.roomTypes.map(rt => rt.id));
            const { availableCountMap } = await this.getBatchRoomAvailability(allGroupTypeIds, checkInDate, checkOutDate, undefined, roomIds);

            // Preload pricing context for group pricing
            const [globalGstTiers, allOffers, allPricingRules] = await Promise.all([
                this.systemSettingsService?.getSetting ? this.systemSettingsService.getSetting('GST_TIERS').then(r => (r as any[]) || []).catch(() => []) : Promise.resolve([]),
                this.prisma.offer?.findMany ? this.prisma.offer.findMany({ where: { isActive: true }, include: { roomTypes: { select: { id: true } } } }).catch(() => []) : Promise.resolve([]),
                this.prisma.pricingRule?.findMany ? this.prisma.pricingRule.findMany({ where: { isActive: true } }).catch(() => []) : Promise.resolve([]),
            ]);
            const preloadedPricingContext = { gstTiers: globalGstTiers, offers: allOffers, pricingRules: allPricingRules };

            const groupResults = await Promise.all(
                properties.map(async (property) => {
                    if (property.roomTypes.length === 0) return [];

                    // Fallback for stale Prisma client
                    let isGroupInclusive = (property as any).isGroupGstInclusive;
                    if (isGroupInclusive === undefined) {
                        try {
                            const rawProps = await this.prisma.$queryRaw<any[]>`SELECT "isGroupGstInclusive" FROM properties WHERE id = ${property.id}`;
                            isGroupInclusive = rawProps?.[0]?.isGroupGstInclusive || false;
                        } catch (e) {
                            isGroupInclusive = false;
                        }
                    }
                    (property as any).isGroupGstInclusive = isGroupInclusive;

                    let totalPoolCapacity = 0;
                    for (const rt of property.roomTypes) {
                        const availableCount = availableCountMap.get(rt.id) || 0;
                        const isV2 = (rt as any).totalMaxOccupancy !== null && (rt as any).totalMaxOccupancy !== undefined;
                        const roomCapacity = isV2
                            ? Number((rt as any).totalMaxOccupancy)
                            : ((rt as any).groupMaxOccupancy || (rt.maxAdults + rt.maxChildren));
                        totalPoolCapacity += availableCount * roomCapacity;
                    }

                    const propResults: any[] = [];
                    if (totalPoolCapacity >= (groupSize || 0)) {
                        // Use the first room type as a delegate for pricing
                        const delegateType = property.roomTypes[0];
                        (delegateType as any).property = property;
                        try {
                            const pricing = await this.pricingService.calculatePrice(
                                delegateType.id,
                                checkInDate,
                                checkOutDate,
                                adults,
                                children,
                                undefined,
                                undefined,
                                currency,
                                true,
                                groupSize,
                                undefined,
                                undefined,
                                undefined,
                                true,
                                undefined,
                                undefined,
                                infants,
                                childAges,
                                delegateType,
                                preloadedPricingContext
                            );

                            propResults.push({
                                id: delegateType.id,
                                name: 'Group Stay Package',
                                description: `Whole property access for your group of ${groupSize} guests.`,
                                basePrice: delegateType.basePrice,
                                propertyId: delegateType.propertyId,
                                images: (delegateType.images && delegateType.images.length > 0) ? delegateType.images : (property.images && property.images.length > 0 ? property.images : [property.coverImage].filter(Boolean)),
                                amenities: delegateType.amenities || property.amenities || [],
                                maxAdults: delegateType.maxAdults,
                                maxChildren: delegateType.maxChildren,
                                size: (delegateType as any).size,
                                property: {
                                    id: property.id,
                                    name: property.name,
                                    slug: property.slug,
                                    type: property.type,
                                    city: property.city,
                                    state: property.state,
                                    coverImage: property.coverImage,
                                    isVerified: property.isVerified,
                                    rating: property.rating,
                                    reviewCount: property.reviewCount,
                                    groupPriceAdult: (property as any).groupPriceAdult,
                                    groupPricePerHead: (property as any).groupPricePerHead,
                                    isGroupGstInclusive: (property as any).isGroupGstInclusive,
                                    _count: property._count,
                                },
                                availableCount: 1,
                                originalPrice: (delegateType as any).originalPrice,
                                totalPrice: pricing.convertedTotal,
                                baseAmount: pricing.baseAmount,
                                taxAmount: pricing.taxAmount,
                                taxRate: pricing.taxRate,
                                pricePerNight: pricing.pricePerNight,
                                numberOfNights: pricing.numberOfNights,
                                isSoldOut: false,
                                isGroupPackage: true,
                                isGstInclusive: pricing.isGstInclusive,
                            });
                        } catch (err) {
                            return [];
                        }
                    } else if (includeSoldOut) {
                        const delegateType = property.roomTypes[0];
                        propResults.push({
                            id: delegateType.id,
                            name: 'Group Stay Package',
                            basePrice: delegateType.basePrice,
                            propertyId: delegateType.propertyId,
                            images: (delegateType.images && delegateType.images.length > 0) ? delegateType.images : (property.images && property.images.length > 0 ? property.images : [property.coverImage].filter(Boolean)),
                            amenities: delegateType.amenities || property.amenities || [],
                            maxAdults: delegateType.maxAdults,
                            maxChildren: delegateType.maxChildren,
                            size: (delegateType as any).size,
                            description: `Whole property access for your group of ${groupSize} guests.`,
                            property: {
                                id: property.id,
                                name: property.name,
                                slug: property.slug,
                                type: property.type,
                                city: property.city,
                                state: property.state,
                                coverImage: property.coverImage,
                                isVerified: property.isVerified,
                                rating: property.rating,
                                reviewCount: property.reviewCount,
                                groupPriceAdult: (property as any).groupPriceAdult,
                                groupPricePerHead: (property as any).groupPricePerHead,
                                isGroupGstInclusive: (property as any).isGroupGstInclusive,
                                _count: property._count,
                            },
                            availableCount: 0,
                            totalPrice: 0,
                            isSoldOut: true,
                            isGroupPackage: true
                        });
                    }
                    return propResults;
                })
            );
            const flatGroupResults = groupResults.flat();
            if ((propertyId || includeFlexibleDates) && properties.length > 0) {
                const targetProp = properties[0];
                const groupStay = flatGroupResults.find((r: any) => r.isGroupPackage);
                const offsetZeroPrice = groupStay && !groupStay.isSoldOut ? groupStay.totalPrice : null;
                const offsetZeroIsSoldOut = !groupStay || groupStay.isSoldOut;

                const flexibleDateRates = await this.computeFlexibleDateRates(
                    targetProp,
                    targetProp.roomTypes || [],
                    checkInDate,
                    checkOutDate,
                    adults,
                    children,
                    childAges,
                    infants,
                    rooms,
                    true,
                    groupSize,
                    currency,
                    preloadedPricingContext,
                    offsetZeroPrice,
                    offsetZeroIsSoldOut,
                    false
                );

                (flatGroupResults as any).flexibleDateRates = flexibleDateRates;
            }

            return flatGroupResults;
        }

        // Standard Search: Non-Lossy Candidate Database Pre-Filter
        const occupancyCandidateFilter: any = {
            OR: [
                {
                    OR: [
                        { property: { occupancyVersion: 'V2' } },
                        { occupancyVersion: 'V2' },
                    ],
                    maxPhysicalAdults: { gte: 1 },
                    totalMaxOccupancy: { gte: 1 },
                },
                {
                    property: {
                        NOT: { occupancyVersion: 'V2' },
                    },
                    NOT: { occupancyVersion: 'V2' },
                    OR: [
                        { maxPhysicalAdults: { gte: minAdultsPerRoom } },
                        { maxAdults: { gte: minAdultsPerRoom } },
                    ],
                },
            ],
        };

        const suitableTypes = await this.prisma.roomType.findMany({
            where: {
                ...(propertyId ? {
                    propertyId,
                    isPubliclyVisible: true,
                    ...(roomTypeIds && roomTypeIds.length > 0 ? { id: { in: roomTypeIds } } : {}),
                    rooms: {
                        some: { 
                            isEnabled: true,
                            ...(roomIds && roomIds.length > 0 ? { id: { in: roomIds } } : {})
                        }
                    },
                    ...occupancyCandidateFilter,
                } : {
                    isPubliclyVisible: true,
                    ...(roomTypeIds && roomTypeIds.length > 0 ? { id: { in: roomTypeIds } } : {}),
                    rooms: {
                        some: { 
                            isEnabled: true,
                            ...(roomIds && roomIds.length > 0 ? { id: { in: roomIds } } : {})
                        }
                    },
                    ...occupancyCandidateFilter,
                    property: {
                        isActive: true,
                        status: PropertyStatus.APPROVED,
                        categoryId: (categoryId && categoryId !== 'all') ? categoryId : undefined,
                        ...geoOrLocationFilter(),
                        ...(type && type !== 'ALL' && { type: type as any }),
                    }
                })
            },
            include: {
                property: {
                    include: {
                        _count: { select: { rooms: true } }
                    }
                }
            },
        });

        const allSuitableTypeIds = suitableTypes.map(rt => rt.id);
        const { availableCountMap } = await this.getBatchRoomAvailability(allSuitableTypeIds, checkInDate, checkOutDate, undefined, roomIds);

        // Preload global GST tiers, offers, and pricing rules once in parallel
        const [globalGstTiers, allOffers, allPricingRules] = await Promise.all([
            this.systemSettingsService?.getSetting ? this.systemSettingsService.getSetting('GST_TIERS').then(r => (r as any[]) || []).catch(() => []) : Promise.resolve([]),
            this.prisma.offer?.findMany ? this.prisma.offer.findMany({ where: { isActive: true }, include: { roomTypes: { select: { id: true } } } }).catch(() => []) : Promise.resolve([]),
            this.prisma.pricingRule?.findMany ? this.prisma.pricingRule.findMany({ where: { isActive: true } }).catch(() => []) : Promise.resolve([]),
        ]);
        const preloadedPricingContext = { gstTiers: globalGstTiers, offers: allOffers, pricingRules: allPricingRules };

        const allAccommodationSolutions: any[] = [];

        // Group suitable room types by property
        const propertyMap = new Map<string, any[]>();
        for (const rt of suitableTypes) {
            if (!propertyMap.has(rt.propertyId)) {
                propertyMap.set(rt.propertyId, []);
            }
            propertyMap.get(rt.propertyId)!.push(rt);
        }

        const propertyExecutionPromises = Array.from(propertyMap.entries()).map(async ([propId, propRoomTypes]) => {
            const propResults: any[] = [];
            const propSolutions: any[] = [];

            const firstType = propRoomTypes[0];
            const property = firstType.property;
            // Property.occupancyVersion or RoomType.occupancyVersion is the authoritative RUNTIME ACTIVATION switch.
            const isV2Property = (property as any)?.occupancyVersion === 'V2' || propRoomTypes.some((rt: any) => rt.occupancyVersion === 'V2');

            if (isV2Property) {
                // V2 Canonical Search & Accommodation Solver Path (All room counts resolved in-memory from batch)
                const availableCandidates: RoomTypeInventoryCandidate[] = propRoomTypes
                    .filter((rt: any) => (availableCountMap.get(rt.id) || 0) > 0 && rt.maxPhysicalAdults >= 1)
                    .map((rt: any) => ({
                        id: rt.id,
                        name: rt.name,
                        totalBaseOccupancy: rt.totalBaseOccupancy ?? ((rt.baseAdults ?? 2) + (rt.baseChildren ?? 1)),
                        totalMaxOccupancy: rt.totalMaxOccupancy ?? (rt.maxPhysicalAdults + (rt.maxPhysicalChildren || 0)),
                        maxPhysicalAdults: rt.maxPhysicalAdults,
                        maxPhysicalChildren: rt.maxPhysicalChildren,
                        maxPhysicalInfants: rt.maxPhysicalInfants ?? 1,
                        baseMaxAdults: rt.baseMaxAdults,
                        baseMaxChildren: rt.baseMaxChildren,
                        freeChildrenCount: rt.freeChildrenCount ?? 0,
                        basePrice: Number(rt.basePrice),
                        extraAdultPrice: Number(rt.extraAdultPrice),
                        extraChildPrice: Number(rt.extraChildPrice),
                        availableQuantity: availableCountMap.get(rt.id) || 0,
                    }));

                const solutions = solveAccommodationOptions(
                    { adults, children, infants: infants || 0, childAges, requestedRooms: rooms || 1 },
                    availableCandidates
                );

                const isPropertyGstApplicable = Boolean(property.isGstApplicable && property.gstNumber);
                const gstTiers = isPropertyGstApplicable ? globalGstTiers : [];

                const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                const propertySolutions = solutions.map((sol, idx) => {
                    const enrichedRooms = sol.rooms.map(r => {
                        const rt = propRoomTypes.find(t => t.id === r.roomTypeId);
                        return {
                            roomTypeId: r.roomTypeId,
                            roomTypeName: r.roomTypeName,
                            images: (rt as any)?.images || [],
                            adults: r.adults,
                            children: r.children,
                            childAges: r.childAges || [],
                            infants: r.infants,
                            extraAdults: r.extraAdults,
                            extraChildren: r.extraChildren,
                            freeChildren: r.freeChildren || 0,
                            paidChildren: r.paidChildren || 0,
                            basePricePerNight: r.basePricePerNight,
                            extraAdultChargePerNight: r.extraAdultChargePerNight,
                            extraChildChargePerNight: r.extraChildChargePerNight,
                            totalPricePerNight: r.totalPricePerNight,
                            availableQuantity: availableCountMap.get(r.roomTypeId) || 0,
                            maxPhysicalAdults: r.maxPhysicalAdults,
                            maxPhysicalChildren: r.maxPhysicalChildren,
                            maxPhysicalInfants: r.maxPhysicalInfants,
                            totalMaxOccupancy: r.totalMaxOccupancy,
                            totalBaseOccupancy: r.totalBaseOccupancy,
                        };
                    });

                    const totalBasePerNight = sol.rooms.reduce((s, r) => s + r.basePricePerNight, 0);
                    const totalExtraPerNight = sol.rooms.reduce((s, r) => s + r.extraAdultChargePerNight + r.extraChildChargePerNight, 0);
                    const totalPricePerNight = sol.pricingSummary?.totalPerNight ?? (totalBasePerNight + totalExtraPerNight);
                    const baseAmount = totalBasePerNight * nights;
                    const extraAmount = totalExtraPerNight * nights;
                    const totalAmountBeforeTax = totalPricePerNight * nights;

                    let taxAmount = 0;
                    if (isPropertyGstApplicable && gstTiers && gstTiers.length > 0) {
                        for (const r of sol.rooms) {
                            const roomTariffThisNight = r.totalPricePerNight;
                            const roomTaxThisNight = this.pricingService.calculateTaxForTariff(roomTariffThisNight, gstTiers);
                            taxAmount += roomTaxThisNight * nights;
                        }
                    }
                    taxAmount = Number(taxAmount.toFixed(2));
                    const totalPrice = Number((totalAmountBeforeTax + taxAmount).toFixed(2));
                    const effectivePricePerNight = Number((totalPrice / nights).toFixed(2));
                    const effectiveTaxRate = (isPropertyGstApplicable && totalAmountBeforeTax > 0)
                        ? Math.round((taxAmount / totalAmountBeforeTax) * 100)
                        : 0;

                    return {
                        id: `${property.id}_sol_${idx}`,
                        propertyId: property.id,
                        property: {
                            id: property.id,
                            name: property.name,
                            slug: property.slug,
                            type: property.type,
                            city: property.city,
                            state: property.state,
                            coverImage: property.coverImage,
                            isVerified: property.isVerified,
                            rating: property.rating,
                            reviewCount: property.reviewCount,
                        },
                        totalRooms: sol.totalRooms,
                        isRecommended: sol.isRecommended ?? false,
                        badge: sol.badge ?? null,
                        roomTypeCounts: sol.roomTypeCounts,
                        numberOfNights: nights,
                        pricing: {
                            baseAmount,
                            extraAmount,
                            taxAmount,
                            taxRate: effectiveTaxRate,
                            isGstInclusive: false,
                            totalPrice,
                            pricePerNight: effectivePricePerNight,
                            numberOfNights: nights,
                            currency: currency || 'INR',
                        },
                        rooms: enrichedRooms,
                    };
                });
                propSolutions.push(...propertySolutions);

                await Promise.all(
                    propRoomTypes.map(async (rt) => {
                        const availableCount = availableCountMap.get(rt.id) || 0;
                        // Find if there is a solution that uses this RoomType (pure solution preferred, or participating in mixed solution)
                        const matchingSol = solutions.find(s => s.roomTypeCounts[rt.id] === s.totalRooms)
                            || solutions.find(s => (s.roomTypeCounts[rt.id] || 0) > 0);

                        if (matchingSol) {
                            const neededRooms = matchingSol.roomTypeCounts[rt.id] || matchingSol.totalRooms;
                            let pricing: any;
                            try {
                                const roomAllocations = matchingSol.rooms.filter(r => r.roomTypeId === rt.id);
                                const extraA = roomAllocations.reduce((sum, r) => sum + r.extraAdults, 0);
                                const extraC = roomAllocations.reduce((sum, r) => sum + r.extraChildren, 0);

                                pricing = await this.pricingService.calculatePrice(
                                    rt.id,
                                    checkInDate,
                                    checkOutDate,
                                    adults,
                                    children,
                                    undefined,
                                    undefined,
                                    currency,
                                    false,
                                    undefined,
                                    neededRooms,
                                    undefined,
                                    undefined,
                                    true,
                                    extraA,
                                    extraC,
                                    infants,
                                    childAges,
                                    rt,
                                    preloadedPricingContext
                                );
                            } catch (err: any) {
                                console.warn(`[searchAvailableRoomTypes] V2 Pricing fallback for roomType ${rt.id}:`, err?.message);
                                const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                                pricing = {
                                    originalConvertedTotal: Number(rt.basePrice) * neededRooms * nights,
                                    convertedTotal: Number(rt.basePrice) * neededRooms * nights,
                                    baseAmount: Number(rt.basePrice) * neededRooms * nights,
                                    taxAmount: 0,
                                    taxRate: 0,
                                    pricePerNight: Number(rt.basePrice) * neededRooms,
                                    numberOfNights: nights,
                                    isGstInclusive: false,
                                    offerDiscountAmount: 0,
                                };
                            }

                            propResults.push({
                                id: rt.id,
                                name: rt.name,
                                basePrice: rt.basePrice,
                                images: (rt as any).images,
                                maxAdults: rt.maxAdults,
                                maxChildren: rt.maxChildren,
                                maxPhysicalAdults: (rt as any).maxPhysicalAdults,
                                maxPhysicalChildren: (rt as any).maxPhysicalChildren,
                                neededRooms,
                                size: (rt as any).size,
                                propertyId: rt.propertyId,
                                property: {
                                    id: property.id,
                                    name: property.name,
                                    slug: property.slug,
                                    type: property.type,
                                    city: property.city,
                                    state: property.state,
                                    coverImage: property.coverImage,
                                    isVerified: property.isVerified,
                                    rating: property.rating,
                                    reviewCount: property.reviewCount,
                                    groupPriceAdult: property.groupPriceAdult,
                                    groupPricePerHead: property.groupPricePerHead,
                                    _count: property._count,
                                },
                                availableCount,
                                originalPrice: pricing.originalConvertedTotal > pricing.convertedTotal ? pricing.originalConvertedTotal : (rt as any).originalPrice,
                                totalPrice: pricing.convertedTotal,
                                baseAmount: pricing.baseAmount,
                                offerDiscountAmount: pricing.offerDiscountAmount,
                                taxAmount: pricing.taxAmount,
                                taxRate: pricing.taxRate,
                                pricePerNight: pricing.pricePerNight,
                                discountedPricePerNight: pricing.numberOfNights > 0
                                    ? (pricing.totalAmount - pricing.taxAmount) / pricing.numberOfNights
                                    : pricing.pricePerNight,
                                numberOfNights: pricing.numberOfNights,
                                isSoldOut: false,
                                isGstInclusive: pricing.isGstInclusive,
                                isRecommended: matchingSol.isRecommended ?? false,
                                badge: matchingSol.badge ?? null,
                                offerName: pricing.offerName,
                                offerDescription: pricing.offerDescription,
                                offerStartDate: pricing.offerStartDate,
                                offerEndDate: pricing.offerEndDate,
                                offerDiscountType: pricing.offerDiscountType,
                                offerDiscountValue: pricing.offerDiscountValue,
                            });
                        } else if (includeSoldOut) {
                            const isActuallySoldOut = availableCount === 0;
                            propResults.push({
                                id: rt.id,
                                name: rt.name,
                                basePrice: rt.basePrice,
                                images: (rt as any).images,
                                maxAdults: rt.maxAdults,
                                maxChildren: rt.maxChildren,
                                maxPhysicalAdults: (rt as any).maxPhysicalAdults,
                                maxPhysicalChildren: (rt as any).maxPhysicalChildren,
                                neededRooms: rooms || 1,
                                size: (rt as any).size,
                                propertyId: rt.propertyId,
                                property: {
                                    id: property.id,
                                    name: property.name,
                                    slug: property.slug,
                                    type: property.type,
                                    city: property.city,
                                    state: property.state,
                                    coverImage: property.coverImage,
                                    isVerified: property.isVerified,
                                    rating: property.rating,
                                    reviewCount: property.reviewCount,
                                    groupPriceAdult: property.groupPriceAdult,
                                    groupPricePerHead: property.groupPricePerHead,
                                    _count: property._count,
                                },
                                availableCount: availableCount,
                                totalPrice: 0,
                                isSoldOut: isActuallySoldOut,
                                isPartyIncompatible: !isActuallySoldOut,
                                isGstInclusive: (rt as any).isGstInclusive ?? false,
                            });
                        }
                    })
                );
            } else {
                // V1 Legacy Search Loop with batch availability counts
                await Promise.all(
                    propRoomTypes.map(async (type) => {
                        const availableCount = availableCountMap.get(type.id) || 0;

                        const typeMaxA = (type as any).maxPhysicalAdults ?? type.maxAdults ?? 2;
                        const typeMaxC = (type as any).maxPhysicalChildren ?? type.maxChildren ?? 1;
                        const neededRoomsForAdults = Math.ceil(adults / Math.max(typeMaxA, 1));
                        const neededRoomsForChildren = children > 0 ? Math.ceil(children / Math.max(typeMaxC, 1)) : 0;
                        const neededRooms = Math.max(rooms || 1, neededRoomsForAdults, neededRoomsForChildren);

                        if (availableCount >= (propertyId ? 1 : neededRooms) || includeSoldOut) {
                            let pricing: any;
                            try {
                                pricing = await this.pricingService.calculatePrice(
                                    type.id,
                                    checkInDate,
                                    checkOutDate,
                                    adults,
                                    children,
                                    undefined,
                                    undefined,
                                    currency,
                                    false,
                                    undefined,
                                    neededRooms,
                                    undefined,
                                    undefined,
                                    true,
                                    undefined,
                                    undefined,
                                    infants,
                                    childAges,
                                    type,
                                    preloadedPricingContext
                                );
                            } catch (err: any) {
                                console.warn(`[searchAvailableRoomTypes] Pricing fallback for roomType ${type.id}:`, err?.message);
                                const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
                                pricing = {
                                    originalConvertedTotal: Number(type.basePrice) * neededRooms * nights,
                                    convertedTotal: Number(type.basePrice) * neededRooms * nights,
                                    baseAmount: Number(type.basePrice) * neededRooms * nights,
                                    taxAmount: 0,
                                    taxRate: 0,
                                    pricePerNight: Number(type.basePrice) * neededRooms,
                                    numberOfNights: nights,
                                    isGstInclusive: false,
                                    offerDiscountAmount: 0,
                                };
                            }

                            propResults.push({
                                id: type.id,
                                name: type.name,
                                basePrice: type.basePrice,
                                images: (type as any).images,
                                maxAdults: type.maxAdults,
                                maxChildren: type.maxChildren,
                                maxPhysicalAdults: (type as any).maxPhysicalAdults,
                                maxPhysicalChildren: (type as any).maxPhysicalChildren,
                                neededRooms,
                                size: (type as any).size,
                                propertyId: type.propertyId,
                                property: {
                                    id: type.property.id,
                                    name: type.property.name,
                                    slug: type.property.slug,
                                    type: type.property.type,
                                    city: type.property.city,
                                    state: type.property.state,
                                    coverImage: type.property.coverImage,
                                    isVerified: type.property.isVerified,
                                    rating: type.property.rating,
                                    reviewCount: type.property.reviewCount,
                                    groupPriceAdult: type.property.groupPriceAdult,
                                    groupPricePerHead: type.property.groupPricePerHead,
                                    _count: type.property._count,
                                },
                                availableCount,
                                originalPrice: pricing.originalConvertedTotal > pricing.convertedTotal ? pricing.originalConvertedTotal : (type as any).originalPrice,
                                totalPrice: pricing.convertedTotal,
                                baseAmount: pricing.baseAmount,
                                offerDiscountAmount: pricing.offerDiscountAmount,
                                taxAmount: pricing.taxAmount,
                                taxRate: pricing.taxRate,
                                pricePerNight: pricing.pricePerNight,
                                discountedPricePerNight: pricing.numberOfNights > 0
                                    ? (pricing.totalAmount - pricing.taxAmount) / pricing.numberOfNights
                                    : pricing.pricePerNight,
                                numberOfNights: pricing.numberOfNights,
                                isSoldOut: availableCount < (propertyId ? 1 : neededRooms),
                                isGstInclusive: pricing.isGstInclusive,
                                offerName: pricing.offerName,
                                offerDescription: pricing.offerDescription,
                                offerStartDate: pricing.offerStartDate,
                                offerEndDate: pricing.offerEndDate,
                                offerDiscountType: pricing.offerDiscountType,
                                offerDiscountValue: pricing.offerDiscountValue,
                            });
                        }
                    })
                );
            }

            return { propResults, propSolutions };
        });

        const executedProperties = await Promise.all(propertyExecutionPromises);
        for (const exec of executedProperties) {
            results.push(...exec.propResults);
            allAccommodationSolutions.push(...exec.propSolutions);
        }

        // Sort results: Available rooms first, lowest price first
        results.sort((a, b) => {
            if (a.isSoldOut !== b.isSoldOut) return a.isSoldOut ? 1 : -1;
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return (a.totalPrice || 0) - (b.totalPrice || 0);
        });

        (results as any).accommodationSolutions = allAccommodationSolutions;

        // Compute flexible date rates if propertyId is provided or includeFlexibleDates is requested
        if (propertyId || includeFlexibleDates) {
            const targetPropId = propertyId || (propertyMap.size > 0 ? propertyMap.keys().next().value : null);
            if (targetPropId) {
                let targetRoomTypes = propertyMap.get(targetPropId) || [];
                let targetProperty = targetRoomTypes[0]?.property;

                if (!targetProperty || targetRoomTypes.length === 0) {
                    const prop = await this.prisma.property.findUnique({
                        where: { id: targetPropId },
                        include: {
                            roomTypes: {
                                where: { isPubliclyVisible: true },
                                include: {
                                    rooms: { where: { isEnabled: true } }
                                }
                            },
                            _count: { select: { rooms: true } }
                        }
                    });
                    if (prop) {
                        targetProperty = prop;
                        targetRoomTypes = (prop.roomTypes || []).map(rt => ({ ...rt, property: prop }));
                    }
                }

                if (targetProperty) {
                    const targetSolutions = allAccommodationSolutions.filter(s => s.propertyId === targetPropId);
                    const targetResults = results.filter(r => r.propertyId === targetPropId);
                    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));

                    let offsetZeroPrice: number | null = null;
                    let offsetZeroIsSoldOut = true;
                    let offsetZeroHasSolution = false;

                    if (targetSolutions.length > 0) {
                        offsetZeroPrice = Math.min(...targetSolutions.map(s => s.pricing?.totalPrice ?? s.totalPrice));
                        offsetZeroIsSoldOut = false;
                        offsetZeroHasSolution = true;
                    } else {
                        const nonSoldOut = targetResults.filter(r => !r.isSoldOut);
                        if (nonSoldOut.length > 0) {
                            offsetZeroPrice = Math.min(...nonSoldOut.map(r => r.totalPrice ?? (r.pricePerNight * nights)));
                            offsetZeroIsSoldOut = false;
                            offsetZeroHasSolution = false;
                        }
                    }

                    const flexibleDateRates = await this.computeFlexibleDateRates(
                        targetProperty,
                        targetRoomTypes,
                        checkInDate,
                        checkOutDate,
                        adults,
                        children,
                        childAges,
                        infants,
                        rooms,
                        isGroupBooking,
                        groupSize,
                        currency,
                        preloadedPricingContext,
                        offsetZeroPrice,
                        offsetZeroIsSoldOut,
                        offsetZeroHasSolution
                    );

                    console.log(`[AvailabilityService] Computed ${flexibleDateRates?.length} flexible date rates for property ${targetPropId}`);
                    (results as any).flexibleDateRates = flexibleDateRates;
                }
            }
        }

        return results;
    }


    /**
     * Computes the lowest bookable accommodation rate for the target property
     * across the 5 surrounding dates (offsets -1, 0, 1, 2, 3 or 0, 1, 2, 3, 4 if today is selected).
     * Uses the V2 Accommodation Solver to guarantee that party composition is respected.
     */
    async computeFlexibleDateRates(
        property: any,
        propRoomTypes: any[],
        checkInDate: Date,
        checkOutDate: Date,
        adults: number,
        children: number,
        childAges: number[] | undefined,
        infants: number,
        rooms: number,
        isGroupBooking: boolean,
        groupSize: number | undefined,
        currency: string = 'INR',
        preloadedPricingContext: any,
        offsetZeroPrice: number | null,
        offsetZeroIsSoldOut: boolean,
        offsetZeroHasSolution: boolean,
    ): Promise<FlexibleDateRateDto[]> {
        const stayLength = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const checkInMinus1 = new Date(checkInDate);
        checkInMinus1.setDate(checkInMinus1.getDate() - 1);
        checkInMinus1.setHours(0, 0, 0, 0);

        let offsets = [-1, 0, 1, 2, 3];
        if (checkInMinus1.getTime() < today.getTime()) {
            offsets = [0, 1, 2, 3, 4];
        }

        const isV2Property = (property as any)?.occupancyVersion === 'V2' || propRoomTypes.some((rt: any) => rt.occupancyVersion === 'V2');
        const isPropertyGstApplicable = Boolean(property.isGstApplicable && property.gstNumber);
        const gstTiers = isPropertyGstApplicable ? (preloadedPricingContext?.gstTiers || []) : [];

        const dateRatesPromises = offsets.map(async (offset) => {
            const cin = new Date(checkInDate);
            cin.setDate(cin.getDate() + offset);
            cin.setHours(0, 0, 0, 0);

            const cout = new Date(cin);
            cout.setDate(cout.getDate() + stayLength);
            cout.setHours(0, 0, 0, 0);

            if (offset === 0) {
                return {
                    checkInDate: cin.toISOString(),
                    checkOutDate: cout.toISOString(),
                    stayLength,
                    price: offsetZeroPrice,
                    pricePerNight: offsetZeroPrice !== null ? Number((offsetZeroPrice / stayLength).toFixed(2)) : null,
                    isSoldOut: offsetZeroIsSoldOut,
                    isSelected: true,
                    isCheapest: false,
                    priceDifference: 0,
                    hasSolution: offsetZeroHasSolution,
                };
            }

            try {
                if (isGroupBooking) {
                    const isAvailable = await this.checkAvailability(
                        undefined,
                        cin,
                        cout,
                        true,
                        groupSize || (adults + children),
                        property.id
                    );

                    if (isAvailable && propRoomTypes.length > 0) {
                        const delegateType = propRoomTypes[0];
                        const pricing = await this.pricingService.calculatePrice(
                            delegateType.id,
                            cin,
                            cout,
                            adults,
                            children,
                            undefined,
                            undefined,
                            currency,
                            true,
                            groupSize,
                            1,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            undefined,
                            infants,
                            childAges,
                            delegateType,
                            preloadedPricingContext
                        );

                        const totalP = pricing.convertedTotal || pricing.totalAmount;
                        return {
                            checkInDate: cin.toISOString(),
                            checkOutDate: cout.toISOString(),
                            stayLength,
                            price: totalP,
                            pricePerNight: pricing.numberOfNights > 0 ? Number((totalP / pricing.numberOfNights).toFixed(2)) : null,
                            isSoldOut: false,
                            isSelected: false,
                            isCheapest: false,
                            priceDifference: null,
                            hasSolution: false,
                        };
                    } else {
                        return {
                            checkInDate: cin.toISOString(),
                            checkOutDate: cout.toISOString(),
                            stayLength,
                            price: null,
                            pricePerNight: null,
                            isSoldOut: true,
                            isSelected: false,
                            isCheapest: false,
                            priceDifference: null,
                            hasSolution: false,
                        };
                    }
                }

                const { availableCountMap } = await this.getBatchRoomAvailability(
                    propRoomTypes.map(rt => rt.id),
                    cin,
                    cout
                );

                if (isV2Property) {
                    const availableCandidates: RoomTypeInventoryCandidate[] = propRoomTypes
                        .filter((rt: any) => (availableCountMap.get(rt.id) || 0) > 0 && rt.maxPhysicalAdults >= 1)
                        .map((rt: any) => ({
                            id: rt.id,
                            name: rt.name,
                            totalBaseOccupancy: rt.totalBaseOccupancy ?? ((rt.baseAdults ?? 2) + (rt.baseChildren ?? 1)),
                            totalMaxOccupancy: rt.totalMaxOccupancy ?? (rt.maxPhysicalAdults + (rt.maxPhysicalChildren || 0)),
                            maxPhysicalAdults: rt.maxPhysicalAdults,
                            maxPhysicalChildren: rt.maxPhysicalChildren,
                            maxPhysicalInfants: rt.maxPhysicalInfants ?? 1,
                            baseMaxAdults: rt.baseMaxAdults,
                            baseMaxChildren: rt.baseMaxChildren,
                            freeChildrenCount: rt.freeChildrenCount ?? 0,
                            basePrice: Number(rt.basePrice),
                            extraAdultPrice: Number(rt.extraAdultPrice),
                            extraChildPrice: Number(rt.extraChildPrice),
                            availableQuantity: availableCountMap.get(rt.id) || 0,
                        }));

                    const solutions = solveAccommodationOptions(
                        { adults, children, infants: infants || 0, childAges, requestedRooms: rooms || 1 },
                        availableCandidates
                    );

                    if (solutions && solutions.length > 0) {
                        const solutionPrices = solutions.map(sol => {
                            const totalBasePerNight = sol.rooms.reduce((s, r) => s + r.basePricePerNight, 0);
                            const totalExtraPerNight = sol.rooms.reduce((s, r) => s + r.extraAdultChargePerNight + r.extraChildChargePerNight, 0);
                            const totalPricePerNight = sol.pricingSummary?.totalPerNight ?? (totalBasePerNight + totalExtraPerNight);
                            const totalAmountBeforeTax = totalPricePerNight * stayLength;

                            let taxAmount = 0;
                            if (isPropertyGstApplicable && gstTiers && gstTiers.length > 0) {
                                for (const r of sol.rooms) {
                                    const roomTaxThisNight = this.pricingService.calculateTaxForTariff(r.totalPricePerNight, gstTiers);
                                    taxAmount += roomTaxThisNight * stayLength;
                                }
                            }
                            return Number((totalAmountBeforeTax + taxAmount).toFixed(2));
                        });

                        const minPrice = Math.min(...solutionPrices);
                        return {
                            checkInDate: cin.toISOString(),
                            checkOutDate: cout.toISOString(),
                            stayLength,
                            price: minPrice,
                            pricePerNight: Number((minPrice / stayLength).toFixed(2)),
                            isSoldOut: false,
                            isSelected: false,
                            isCheapest: false,
                            priceDifference: null,
                            hasSolution: true,
                        };
                    } else {
                        return {
                            checkInDate: cin.toISOString(),
                            checkOutDate: cout.toISOString(),
                            stayLength,
                            price: null,
                            pricePerNight: null,
                            isSoldOut: true,
                            isSelected: false,
                            isCheapest: false,
                            priceDifference: null,
                            hasSolution: false,
                        };
                    }
                } else {
                    const availableRoomTypes = propRoomTypes.filter(rt => (availableCountMap.get(rt.id) || 0) >= rooms);
                    if (availableRoomTypes.length > 0) {
                        const prices = await Promise.all(
                            availableRoomTypes.map(async (rt) => {
                                try {
                                    const p = await this.pricingService.calculatePrice(
                                        rt.id,
                                        cin,
                                        cout,
                                        adults,
                                        children,
                                        undefined,
                                        undefined,
                                        currency,
                                        false,
                                        undefined,
                                        rooms,
                                        undefined,
                                        undefined,
                                        undefined,
                                        undefined,
                                        undefined,
                                        infants,
                                        childAges,
                                        rt,
                                        preloadedPricingContext
                                    );
                                    return p.convertedTotal || p.totalAmount;
                                } catch {
                                    return null;
                                }
                            })
                        );
                        const validPrices = prices.filter((p): p is number => p !== null && !isNaN(p));
                        if (validPrices.length > 0) {
                            const minPrice = Math.min(...validPrices);
                            return {
                                checkInDate: cin.toISOString(),
                                checkOutDate: cout.toISOString(),
                                stayLength,
                                price: minPrice,
                                pricePerNight: Number((minPrice / stayLength).toFixed(2)),
                                isSoldOut: false,
                                isSelected: false,
                                isCheapest: false,
                                priceDifference: null,
                                hasSolution: false,
                            };
                        }
                    }

                    return {
                        checkInDate: cin.toISOString(),
                        checkOutDate: cout.toISOString(),
                        stayLength,
                        price: null,
                        pricePerNight: null,
                        isSoldOut: true,
                        isSelected: false,
                        isCheapest: false,
                        priceDifference: null,
                        hasSolution: false,
                    };
                }
            } catch (err) {
                return {
                    checkInDate: cin.toISOString(),
                    checkOutDate: cout.toISOString(),
                    stayLength,
                    price: null,
                    pricePerNight: null,
                    isSoldOut: true,
                    isSelected: false,
                    isCheapest: false,
                    priceDifference: null,
                    hasSolution: false,
                };
            }
        });

        const rawRates = await Promise.all(dateRatesPromises);

        const selectedRate = rawRates.find(r => r.isSelected);
        const availableRates = rawRates.filter(r => !r.isSoldOut && r.price !== null);
        const minWindowPrice = availableRates.length > 0 ? Math.min(...availableRates.map(r => r.price!)) : null;

        return rawRates.map(rate => {
            const isCheapest = rate.price !== null && minWindowPrice !== null && rate.price <= minWindowPrice;
            const priceDifference = (selectedRate?.price != null && rate.price != null)
                ? Number((rate.price - selectedRate.price).toFixed(2))
                : null;

            return {
                ...rate,
                isCheapest,
                priceDifference,
            };
        });
    }


    /**
     * Centralized Evaluation Engine for Restrictions (Stop Sell, Min Stay, Max Stay, CTA, CTD).
     * Applies resolution priority: RoomType-specific rule overrides Property-wide fallback.
     * Evaluates overlapping rules using most restrictive parameters.
     */
    async evaluateRestrictions(
        propertyId: string,
        roomTypeId: string | null,
        checkInDate: Date | string,
        checkOutDate: Date | string,
    ) {
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        const stopSells = await this.prisma.stopSellRestriction.findMany({
            where: {
                propertyId,
                isActive: true,
                ...(roomTypeId ? { OR: [{ roomTypeId: null }, { roomTypeId }] } : {}),
                startDate: { lte: checkOut },
                endDate: { gte: checkIn },
            },
        });

        const restrictionRules = await this.prisma.restrictionRule.findMany({
            where: {
                propertyId,
                isActive: true,
                ...(roomTypeId ? { OR: [{ roomTypeId: null }, { roomTypeId }] } : {}),
                startDate: { lte: checkOut },
                endDate: { gte: checkIn },
            },
        });

        const current = new Date(checkIn);
        const dailyEffectiveMap: Map<string, {
            stopSell: boolean;
            minStayArrival: number | null;
            minStayThrough: number | null;
            maxStay: number | null;
            closedToArrival: boolean;
            closedToDeparture: boolean;
        }> = new Map();

        while (current <= checkOut) {
            const year = current.getFullYear();
            const month = String(current.getMonth() + 1).padStart(2, '0');
            const day = String(current.getDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;

            const dayStart = new Date(current);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(current);
            dayEnd.setHours(23, 59, 59, 999);

            const hasStopSell = stopSells.some((ss) => {
                const ssStart = new Date(ss.startDate);
                ssStart.setHours(0, 0, 0, 0);
                const ssEnd = new Date(ss.endDate);
                ssEnd.setHours(23, 59, 59, 999);
                return (!ss.roomTypeId || !roomTypeId || ss.roomTypeId === roomTypeId) && dayStart <= ssEnd && dayEnd >= ssStart;
            });

            const matchingRules = restrictionRules.filter((rr: any) => {
                const rrStart = new Date(rr.startDate);
                rrStart.setHours(0, 0, 0, 0);
                const rrEnd = new Date(rr.endDate);
                rrEnd.setHours(23, 59, 59, 999);
                return (!rr.roomTypeId || !roomTypeId || rr.roomTypeId === roomTypeId) && dayStart <= rrEnd && dayEnd >= rrStart;
            });

            const specificRules = matchingRules.filter((rr: any) => rr.roomTypeId && rr.roomTypeId === roomTypeId);
            const rulesToEvaluate = specificRules.length > 0 ? specificRules : matchingRules;

            let effMinStayArrival: number | null = null;
            let effMinStayThrough: number | null = null;
            let effMaxStay: number | null = null;
            let effCTA = false;
            let effCTD = false;

            for (const r of rulesToEvaluate) {
                if (r.minStayArrival !== null && r.minStayArrival !== undefined) {
                    effMinStayArrival = effMinStayArrival === null ? Number(r.minStayArrival) : Math.max(effMinStayArrival, Number(r.minStayArrival));
                }
                if (r.minStayThrough !== null && r.minStayThrough !== undefined) {
                    effMinStayThrough = effMinStayThrough === null ? Number(r.minStayThrough) : Math.max(effMinStayThrough, Number(r.minStayThrough));
                }
                if (r.maxStay !== null && r.maxStay !== undefined) {
                    effMaxStay = effMaxStay === null ? Number(r.maxStay) : Math.min(effMaxStay, Number(r.maxStay));
                }
                if (r.closedToArrival) effCTA = true;
                if (r.closedToDeparture) effCTD = true;
            }

            dailyEffectiveMap.set(dateStr, {
                stopSell: hasStopSell,
                minStayArrival: effMinStayArrival,
                minStayThrough: effMinStayThrough,
                maxStay: effMaxStay,
                closedToArrival: effCTA,
                closedToDeparture: effCTD,
            });

            current.setDate(current.getDate() + 1);
        }

        return dailyEffectiveMap;
    }

    /**
     * Shared Business Validation Layer for Booking Creation.
     * Validates Check-In/Check-Out against active Restrictions before transaction commit.
     */
    async validateBookingRestrictions(
        propertyId: string,
        roomTypeId: string,
        checkInDate: Date | string,
        checkOutDate: Date | string,
    ): Promise<void> {
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
        const dailyMap = await this.evaluateRestrictions(propertyId, roomTypeId, checkInDate, checkOutDate);

        const yearIn = checkIn.getFullYear();
        const monthIn = String(checkIn.getMonth() + 1).padStart(2, '0');
        const dayIn = String(checkIn.getDate()).padStart(2, '0');
        const checkInStr = `${yearIn}-${monthIn}-${dayIn}`;

        const yearOut = checkOut.getFullYear();
        const monthOut = String(checkOut.getMonth() + 1).padStart(2, '0');
        const dayOut = String(checkOut.getDate()).padStart(2, '0');
        const checkOutStr = `${yearOut}-${monthOut}-${dayOut}`;

        const arrivalRules = dailyMap.get(checkInStr);
        const departureRules = dailyMap.get(checkOutStr);

        if (arrivalRules?.closedToArrival) {
            throw new BadRequestException(`Check-in is closed on ${checkInStr} (CTA restriction)`);
        }

        if (departureRules?.closedToDeparture) {
            throw new BadRequestException(`Check-out is closed on ${checkOutStr} (CTD restriction)`);
        }

        if (arrivalRules?.minStayArrival && nights < arrivalRules.minStayArrival) {
            throw new BadRequestException(`Minimum stay requirement of ${arrivalRules.minStayArrival} night(s) not met for arrival on ${checkInStr}`);
        }

        const current = new Date(checkIn);
        while (current < checkOut) {
            const y = current.getFullYear();
            const m = String(current.getMonth() + 1).padStart(2, '0');
            const d = String(current.getDate()).padStart(2, '0');
            const dateStr = `${y}-${m}-${d}`;

            const dayRules = dailyMap.get(dateStr);
            if (dayRules) {
                if (dayRules.stopSell) {
                    throw new BadRequestException(`Room is unavailable on ${dateStr} due to Stop Sell restriction`);
                }
                if (dayRules.minStayThrough && nights < dayRules.minStayThrough) {
                    throw new BadRequestException(`Minimum stay requirement of ${dayRules.minStayThrough} night(s) not met for date ${dateStr}`);
                }
                if (dayRules.maxStay && nights > dayRules.maxStay) {
                    throw new BadRequestException(`Maximum stay limit of ${dayRules.maxStay} night(s) exceeded for date ${dateStr}`);
                }
            }
            current.setDate(current.getDate() + 1);
        }
    }
}
