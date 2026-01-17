import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
        // Get all enabled rooms of this type
        const allRooms = await this.prisma.room.findMany({
            where: {
                roomTypeId,
                isEnabled: true,
                status: 'AVAILABLE',
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
    ) {
        // 1. Get all room types that fit the guest capacity
        const suitableTypes = await this.prisma.roomType.findMany({
            where: {
                maxAdults: { gte: adults },
                maxChildren: { gte: children },
                isPubliclyVisible: true, // Only public ones
            },
            include: {
                rooms: true, // Need rooms to check availability
            },
        });

        const results: any[] = [];

        // 2. For each type, check if there's at least one room available
        for (const type of suitableTypes) {
            // Get count of available rooms for this type in date range
            const availableCount = await this.getAvailableRoomCount(
                type.id,
                checkInDate,
                checkOutDate,
            );

            if (availableCount > 0) {
                // Return the type with availability info
                // Calculate base price for the duration (simple logic for now)

                // Exclude the raw rooms list from response
                const { rooms, ...typeData } = type;

                results.push({
                    ...typeData,
                    availableCount,
                    // If we had a pricing service here, we'd calculate total price
                    totalPrice: Number(type.basePrice), // Placeholder, ideally calculated based on nights
                });
            }
        }

        return results;
    }
}
