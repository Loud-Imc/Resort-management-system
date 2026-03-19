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
    ): Promise<boolean> {
        if (isGroupBooking && groupSize && propertyId) {
            const allocated = await this.allocateRoomsForGroup(
                propertyId,
                checkInDate,
                checkOutDate,
                groupSize
            );
            return allocated.length > 0;
        }

        if (!roomTypeId) return false;

        const availableRooms = await this.getAvailableRooms(
            roomTypeId,
            checkInDate,
            checkOutDate,
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
            const availableForType = await this.getAvailableRooms(type.id, checkIn, checkOut);
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
                    },
                    _count: { select: { rooms: true } }
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
                            availableCount: 1,
                            totalPrice: pricing.convertedTotal,
                            baseAmount: pricing.baseAmount,
                            taxAmount: pricing.taxAmount,
                            taxRate: pricing.taxRate,
                            pricePerNight: pricing.pricePerNight,
                            numberOfNights: pricing.numberOfNights,
                            isSoldOut: false,
                            isGroupPackage: true
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
                    undefined
                );

                results.push({
                    id: type.id,
                    name: type.name,
                    basePrice: type.basePrice,
                    images: (type as any).images,
                    maxAdults: type.maxAdults,
                    maxChildren: type.maxChildren,
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
                    totalPrice: pricing.convertedTotal,
                    baseAmount: pricing.baseAmount,
                    taxAmount: pricing.taxAmount,
                    taxRate: pricing.taxRate,
                    pricePerNight: pricing.pricePerNight,
                    numberOfNights: pricing.numberOfNights,
                    isSoldOut: availableCount < rooms,
                });
            }
        }

        return results;
    }
}
