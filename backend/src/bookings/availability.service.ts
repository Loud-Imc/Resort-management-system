import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PropertyStatus } from '@prisma/client';

@Injectable()
export class AvailabilityService {
    constructor(private prisma: PrismaService) { }

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
     * Check if a specific room is available for the given date range
     */
    private async isRoomAvailable(
        roomId: string,
        checkInDate: Date,
        checkOutDate: Date,
    ): Promise<boolean> {
        // Check for overlapping bookings
        const overlappingBookings = await this.prisma.booking.findMany({
            where: {
                roomId,
                status: {
                    in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
                },
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
                ],
            },
        });

        if (overlappingBookings.length > 0) {
            return false;
        }

        // Check for room blocks
        const overlappingBlocks = await this.prisma.roomBlock.findMany({
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
    ) {
        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        // Required capacity per room
        const minAdultsPerRoom = Math.ceil(adults / rooms);
        const minChildrenPerRoom = Math.ceil(children / rooms);

        // 1. Get all room types that fit the guest capacity
        const suitableTypes = await this.prisma.roomType.findMany({
            where: {
                maxAdults: { gte: minAdultsPerRoom },
                maxChildren: { gte: minChildrenPerRoom },
                isPubliclyVisible: true, // Only public ones
                property: {
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    categoryId: categoryId || undefined,
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
                rooms: true, // Need rooms to check availability
                property: {
                    include: {
                        _count: {
                            select: {
                                rooms: true,
                                bookings: true
                            }
                        }
                    }
                }, // Needed for grouping by property
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

        const results: any[] = [];

        // 2. For each type, check availability
        for (const type of suitableTypes) {
            // Get count of available rooms for this type in date range
            const availableCount = await this.getAvailableRoomCount(
                type.id,
                checkInDate,
                checkOutDate,
            );

            if (availableCount >= rooms || includeSoldOut) {
                // Return the type with availability info
                const { rooms: _rooms, offers, ...typeData }: any = type;
                const activeOffer = offers[0] || null;

                results.push({
                    ...typeData,
                    availableCount,
                    activeOffer,
                    totalPrice: Number(type.basePrice), // Placeholder
                    isSoldOut: availableCount < rooms,
                });
            }
        }

        return results;
    }
}
