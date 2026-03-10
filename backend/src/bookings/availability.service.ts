import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus } from '@prisma/client';
import { PricingService } from './pricing.service';

@Injectable()
export class AvailabilityService {
    constructor(
        private prisma: PrismaService,
        private pricingService: PricingService,
    ) { }

    /**
     * Check room availability for a given date range
     * Considers: existing bookings, room blocks, room status
     */
    async checkAvailability(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
    ): Promise<boolean> {
        const availableRooms = await this.getAvailableRooms(
            roomTypeId,
            checkInDate,
            checkOutDate,
        );
        return availableRooms.length > 0;
    }

    async getAvailableRooms(
        roomTypeId: string,
        checkInDate: Date,
        checkOutDate: Date,
    ) {
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        // Get all enabled rooms of this type
        const allRooms = await this.prisma.room.findMany({
            where: {
                roomTypeId,
                isEnabled: true,
                status: {
                    in: ['AVAILABLE', 'OCCUPIED'],
                },
            },
        });

        // Filter out rooms with overlapping bookings
        const availableRooms: any[] = [];

        for (const room of allRooms) {
            const isAvailable = await this.isRoomAvailable(
                room.id,
                checkInDate,
                checkOutDate,
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
        checkInDate: Date,
        checkOutDate: Date,
        prismaClient?: any,
    ): Promise<boolean> {
        const db = prismaClient || this.prisma;

        // Check for overlapping bookings
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        const overlappingBookings = await db.booking.findMany({
            where: {
                roomId,
                AND: [
                    {
                        OR: [
                            { status: { in: ['CONFIRMED', 'RESERVED', 'CHECKED_IN'] } },
                            {
                                AND: [
                                    { status: 'PENDING_PAYMENT' },
                                    { createdAt: { gte: thirtyMinutesAgo } } // Only block if it's recent (last 30 mins)
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
            },
        });

        if (overlappingBookings.length > 0) {
            return false;
        }

        // Check for room blocks
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
            },
        });

        if (overlappingBlocks.length > 0) {
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
    ): Promise<number> {
        const availableRooms = await this.getAvailableRooms(
            roomTypeId,
            checkInDate,
            checkOutDate,
        );
        return availableRooms.length;
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

        // Handle geo-spatial search if lat/lng/radius are provided
        if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
            const results = await this.prisma.$queryRaw<any[]>`
                SELECT id FROM properties
                WHERE (
                    6371 * acos(
                        cos(radians(${Number(latitude)})) * cos(radians(CAST(latitude AS DOUBLE PRECISION))) *
                        cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${Number(longitude)})) +
                        sin(radians(${Number(latitude)})) * sin(radians(CAST(latitude AS DOUBLE PRECISION)))
                    )
                ) <= ${Number(radius)}
            `;
            geoPropertyIds = results.map(r => r.id);
        }

        // Required capacity per room
        const minAdultsPerRoom = Math.ceil(adults / rooms);
        const minChildrenPerRoom = Math.ceil(children / rooms);

        const results: any[] = [];

        if (isGroupBooking) {
            // Group Booking Search: Check total capacity of the property's group pool
            const properties = await this.prisma.property.findMany({
                where: {
                    allowsGroupBooking: true,
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    categoryId: categoryId || undefined,
                    ...(geoPropertyIds !== null && { id: { in: geoPropertyIds } }),
                    ...(location && {
                        OR: [
                            { city: { contains: location, mode: 'insensitive' } },
                            { address: { contains: location, mode: 'insensitive' } },
                            { state: { contains: location, mode: 'insensitive' } },
                            { name: { contains: location, mode: 'insensitive' } },
                        ]
                    }),
                    ...(type && type !== 'ALL' && { type: type as any }),
                    maxGroupCapacity: groupSize ? { gte: groupSize } : undefined,
                },
                include: {
                    roomTypes: {
                        where: { isAvailableForGroupBooking: true },
                    }
                }
            });

            for (const property of properties) {
                if (property.roomTypes.length === 0) continue;

                let totalPoolCapacity = 0;
                for (const rt of property.roomTypes) {
                    const availableCount = await this.getAvailableRoomCount(rt.id, checkInDate, checkOutDate);
                    const roomCapacity = (rt as any).groupMaxOccupancy || (rt.maxAdults + rt.maxChildren);
                    totalPoolCapacity += availableCount * roomCapacity;
                }

                if (totalPoolCapacity >= (groupSize || 0)) {
                    // Use the first room type as a delegate for pricing (it uses property-level group price anyway)
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
                            ...delegateType,
                            name: 'Group Stay Package',
                            description: `Whole property access for your group of ${groupSize} guests.`,
                            property,
                            availableCount: 1, // Represented as 1 package
                            totalPrice: pricing.convertedTotal,
                            isSoldOut: false,
                            isGroupPackage: true
                        });
                    } catch (err) {
                        console.error(`[AvailabilityService] Error calculating group price for property ${property.id}:`, err.message);
                        // If pricing fails (e.g. missing price-per-head), we skip this property for now
                        continue;
                    }
                } else if (includeSoldOut) {
                    const delegateType = property.roomTypes[0];
                    results.push({
                        ...delegateType,
                        name: 'Group Stay Package',
                        property,
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
        // 1. Get all room types that fit the guest capacity
        const suitableTypes = await this.prisma.roomType.findMany({
            where: {
                maxAdults: { gte: minAdultsPerRoom },
                maxChildren: { gte: minChildrenPerRoom },
                isPubliclyVisible: true,
                propertyId: propertyId || undefined,
                property: {
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    categoryId: categoryId || undefined,
                    ...(geoPropertyIds !== null && { id: { in: geoPropertyIds } }),
                    ...(location && {
                        OR: [
                            { city: { contains: location, mode: 'insensitive' } },
                            { address: { contains: location, mode: 'insensitive' } },
                            { state: { contains: location, mode: 'insensitive' } },
                            { name: { contains: location, mode: 'insensitive' } },
                        ]
                    }),
                    ...(type && type !== 'ALL' && { type: type as any }),
                }
            },
            include: {
                rooms: true,
                property: {
                    include: {
                        _count: {
                            select: {
                                rooms: true,
                                bookings: true
                            }
                        }
                    }
                },
                offers: {
                    where: {
                        isActive: true,
                        startDate: { lte: checkOutDate },
                        endDate: { gte: checkInDate },
                    },
                    take: 1,
                },
            },
        });

        // 2. For each type, check availability
        for (const type of suitableTypes) {
            const availableCount = await this.getAvailableRoomCount(
                type.id,
                checkInDate,
                checkOutDate,
            );

            if (availableCount >= rooms || includeSoldOut) {
                const { rooms: _rooms, offers, ...typeData }: any = type;
                const activeOffer = offers[0] || null;

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
                    undefined
                );

                results.push({
                    ...typeData,
                    availableCount,
                    activeOffer,
                    totalPrice: pricing.convertedTotal,
                    isSoldOut: availableCount < rooms,
                });
            }
        }

        return results;
    }
}
