import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus } from '@prisma/client';
import { PricingService } from './pricing.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { format, eachDayOfInterval } from 'date-fns';
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
            allAvailableRooms.push(...availableForType.map(r => ({
                ...r,
                roomType: type,
                capacity: (type as any).groupMaxOccupancy || (type.maxAdults + (type.maxChildren || 0))
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

        // For same-day availability checks, we don't normalize to start-of-day 
        // to allow booking a room immediately after someone else checked out.
        // However, we want to ensure we don't miss accidental overlaps if input times are weird.
        if (new Date(checkInDate).getTime() === new Date(checkOutDate).getTime()) {
            // Same day: ensure it spans a bit of time for the query
            checkOut.setHours(23, 59, 59, 999);
        }

        // Get all enabled rooms of this type
        const allRooms = await this.prisma.room.findMany({
            where: {
                roomTypeId,
                isEnabled: true,
                ...(includeAllStatus ? {} : {
                    status: {
                        in: ['AVAILABLE', 'OCCUPIED'],
                    },
                }),
            },
        });

        // Filter out rooms with overlapping bookings
        const availableRooms: any[] = [];

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

        // Strict Status Blocks: If room is Maintenance or Blocked, it cannot be booked at all.
        if (room.status === 'MAINTENANCE' || room.status === 'BLOCKED') {
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
        const todayStr = new Date().toISOString().split('T')[0];
        const checkInStr = checkInDate.toISOString().split('T')[0];
        
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
                roomId,
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

        if (overlappingBlocks.length > 0) {
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

        if (room.status === 'MAINTENANCE' || room.status === 'BLOCKED') {
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
        const todayStr = new Date().toISOString().split('T')[0];
        const checkInStr = checkInDate.toISOString().split('T')[0];
        
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

            const availableCount = Math.max(0, totalRoomsOfType - occupiedRooms);
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
    ) {
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

        // Required capacity per room
        const minAdultsPerRoom = Math.ceil(adults / rooms);
        const minChildrenPerRoom = Math.ceil(children / rooms);

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
                        { roomTypes: { some: { isAvailableForGroupBooking: true } } }
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
                        where: { isAvailableForGroupBooking: true },
                    },
                    _count: { select: { rooms: true } }
                }
            });

            for (const property of properties) {
                if (property.roomTypes.length === 0) continue;

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
                    const availableCount = await this.getAvailableRoomCount(rt.id, checkInDate, checkOutDate);
                    const roomCapacity = (rt as any).groupMaxOccupancy || (rt.maxAdults + rt.maxChildren);
                    totalPoolCapacity += availableCount * roomCapacity;
                }

                if (totalPoolCapacity >= (groupSize || 0)) {
                    // Use the first room type as a delegate for pricing
                    const delegateType = property.roomTypes[0];
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
                            groupSize
                        );

                        results.push({
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
                        continue;
                    }
                } else if (includeSoldOut) {
                    const delegateType = property.roomTypes[0];
                    results.push({
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
            }
            return results;
        }

        // Standard Search logic
        const suitableTypes = await this.prisma.roomType.findMany({
            where: {
                maxAdults: { gte: minAdultsPerRoom },
                maxChildren: { gte: minChildrenPerRoom },
                isPubliclyVisible: true,
                propertyId: propertyId || undefined,
                rooms: {
                    some: { isEnabled: true }
                },
                property: {
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    categoryId: (categoryId && categoryId !== 'all') ? categoryId : undefined,
                    ...geoOrLocationFilter(),
                    ...(type && type !== 'ALL' && { type: type as any }),
                }
            },
            include: {
                property: {
                    include: {
                        _count: { select: { rooms: true } }
                    }
                }
            },
        });

        for (const type of suitableTypes) {
            const availableCount = await this.getAvailableRoomCount(
                type.id,
                checkInDate,
                checkOutDate,
            );

            if (availableCount >= rooms || includeSoldOut) {
                const pricing = await this.pricingService.calculatePrice(
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
                    rooms
                );

                results.push({
                    id: type.id,
                    name: type.name,
                    basePrice: type.basePrice,
                    images: (type as any).images,
                    maxAdults: type.maxAdults,
                    maxChildren: type.maxChildren,
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
                    isSoldOut: availableCount < rooms,
                    isGstInclusive: pricing.isGstInclusive,
                });
            }
        }

        return results;
    }
}
