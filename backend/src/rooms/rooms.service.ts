import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomDto, UpdateRoomDto, BlockRoomDto } from './dto/room.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class RoomsService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * Create a new room
     */
    async create(createRoomDto: CreateRoomDto, userId: string) {
        const { roomNumber, floor, roomTypeId, notes, isEnabled = true } = createRoomDto;

        // Check if room number already exists (in same property scope if applicable)
        const existingRoom = await this.prisma.room.findFirst({
            where: {
                roomNumber,
                propertyId: createRoomDto.propertyId
            },
        });

        if (existingRoom) {
            throw new ConflictException(`Room number ${roomNumber} already exists`);
        }

        // Verify room type exists
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

        const room = await this.prisma.room.create({
            data: {
                roomNumber,
                floor,
                roomTypeId,
                propertyId: createRoomDto.propertyId as string,
                notes,
                isEnabled,
                status: 'AVAILABLE',
            },
            include: {
                roomType: true,
            },
        });

        await this.auditService.createLog({
            action: 'CREATE',
            entity: 'Room',
            entityId: room.id,
            userId,
            newValue: room,
        });

        return room;
    }

    /**
     * Get all rooms with filters
     */
    async findAll(user: any, filters?: {
        roomTypeId?: string;
        floor?: number;
        status?: string;
        isEnabled?: boolean;
        propertyId?: string;
    }) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        // Define property scoping
        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return this.prisma.room.findMany({
            where: {
                roomTypeId: filters?.roomTypeId,
                floor: filters?.floor,
                status: filters?.status as any,
                isEnabled: filters?.isEnabled,
                propertyId: filters?.propertyId,
                property: !isGlobalAdmin ? propertyFilter : undefined, // Enforce isolation only for non-admins
            },
            include: {
                roomType: true,
                property: { select: { name: true } },
                bookings: {
                    where: {
                        status: 'CONFIRMED',
                        checkInDate: { lte: today },
                        checkOutDate: { gt: today },
                    },
                    take: 1,
                },
                blocks: {
                    where: {
                        endDate: { gte: new Date() },
                    },
                    orderBy: {
                        startDate: 'asc',
                    },
                },
            },
            orderBy: [
                { floor: 'asc' },
                { roomNumber: 'asc' },
            ],
        });
    }

    /**
     * Get room by ID
     */
    async findOne(id: string, user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const room = await this.prisma.room.findUnique({
            where: { id },
            include: {
                roomType: true,
                property: true,
                blocks: {
                    orderBy: {
                        startDate: 'desc',
                    },
                },
                bookings: {
                    where: {
                        status: {
                            in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
                        },
                    },
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                                phone: true,
                            },
                        },
                    },
                    orderBy: {
                        checkInDate: 'asc',
                    },
                },
            },
        });

        if (!room) {
            throw new NotFoundException('Room not found');
        }

        // Check ownership/staff access
        if (!isGlobalAdmin) {
            const isOwner = room.property?.ownerId === user.id;
            const isStaff = await this.prisma.propertyStaff.findUnique({
                where: { propertyId_userId: { propertyId: room.propertyId || '', userId: user.id } }
            });

            if (!isOwner && !isStaff) {
                throw new NotFoundException('Room not found'); // Hide existence for security
            }
        }

        return room;
    }

    /**
     * Update room
     */
    async update(id: string, updateRoomDto: UpdateRoomDto, user: any) {
        const room = await this.findOne(id, user);

        // If changing room number, check for conflicts (within same property if applicable)
        if (updateRoomDto.roomNumber && updateRoomDto.roomNumber !== room.roomNumber) {
            const existingRoom = await this.prisma.room.findFirst({
                where: {
                    roomNumber: updateRoomDto.roomNumber,
                    ...(room.propertyId && { propertyId: room.propertyId }),
                },
            });

            if (existingRoom) {
                throw new ConflictException(`Room number ${updateRoomDto.roomNumber} already exists`);
            }
        }

        // If changing room type, verify it exists
        if (updateRoomDto.roomTypeId) {
            const roomType = await this.prisma.roomType.findUnique({
                where: { id: updateRoomDto.roomTypeId },
            });

            if (!roomType) {
                throw new NotFoundException('Room type not found');
            }
        }

        const updated = await this.prisma.room.update({
            where: { id },
            data: {
                roomNumber: updateRoomDto.roomNumber,
                floor: updateRoomDto.floor,
                status: updateRoomDto.status as any,
                notes: updateRoomDto.notes,
                isEnabled: updateRoomDto.isEnabled,
                roomTypeId: updateRoomDto.roomTypeId,
            },
            include: {
                roomType: true,
            },
        });

        await this.auditService.createLog({
            action: 'UPDATE',
            entity: 'Room',
            entityId: id,
            userId: user.id,
            oldValue: room,
            newValue: updated,
        });

        return updated;
    }

    /**
     * Delete room (soft delete by disabling)
     */
    async remove(id: string, user: any) {
        const room = await this.findOne(id, user);

        // Check if room has active bookings
        const activeBookings = await this.prisma.booking.count({
            where: {
                roomId: id,
                status: {
                    in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
                },
            },
        });

        if (activeBookings > 0) {
            throw new BadRequestException('Cannot delete room with active bookings');
        }

        const updated = await this.prisma.room.update({
            where: { id },
            data: {
                isEnabled: false,
                status: 'MAINTENANCE',
            },
        });

        await this.auditService.createLog({
            action: 'DELETE',
            entity: 'Room',
            entityId: id,
            userId: user.id,
            oldValue: room,
            newValue: updated,
        });

        return { message: 'Room disabled successfully' };
    }

    /**
     * Block room for maintenance or owner use
     */
    async blockRoom(roomId: string, blockRoomDto: BlockRoomDto, user: any) {
        const room = await this.findOne(roomId, user);

        const startDate = new Date(blockRoomDto.startDate);
        const endDate = new Date(blockRoomDto.endDate);

        if (endDate <= startDate) {
            throw new BadRequestException('End date must be after start date');
        }

        // Check for overlapping blocks
        const overlappingBlocks = await this.prisma.roomBlock.findMany({
            where: {
                roomId,
                OR: [
                    {
                        AND: [
                            { startDate: { lte: startDate } },
                            { endDate: { gt: startDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { lt: endDate } },
                            { endDate: { gte: endDate } },
                        ],
                    },
                    {
                        AND: [
                            { startDate: { gte: startDate } },
                            { endDate: { lte: endDate } },
                        ],
                    },
                ],
            },
        });

        if (overlappingBlocks.length > 0) {
            throw new ConflictException('Room is already blocked for this period');
        }

        // Check for overlapping bookings
        const overlappingBookings = await this.prisma.booking.findMany({
            where: {
                roomId,
                status: {
                    in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
                },
                OR: [
                    {
                        AND: [
                            { checkInDate: { lte: startDate } },
                            { checkOutDate: { gt: startDate } },
                        ],
                    },
                    {
                        AND: [
                            { checkInDate: { lt: endDate } },
                            { checkOutDate: { gte: endDate } },
                        ],
                    },
                    {
                        AND: [
                            { checkInDate: { gte: startDate } },
                            { checkOutDate: { lte: endDate } },
                        ],
                    },
                ],
            },
        });

        if (overlappingBookings.length > 0) {
            throw new ConflictException('Room has bookings during this period');
        }

        const block = await this.prisma.roomBlock.create({
            data: {
                roomId,
                startDate,
                endDate,
                reason: blockRoomDto.reason,
                notes: blockRoomDto.notes,
                createdById: user.id,
            },
            include: {
                room: {
                    include: {
                        roomType: true,
                    },
                },
                createdBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });

        // Update room status if block starts today or earlier
        if (startDate <= new Date()) {
            await this.prisma.room.update({
                where: { id: roomId },
                data: { status: 'BLOCKED' },
            });
        }

        await this.auditService.createLog({
            action: 'BLOCK',
            entity: 'Room',
            entityId: roomId,
            userId: user.id,
            newValue: block,
        });

        return block;
    }

    /**
     * Remove room block
     */
    async removeBlock(blockId: string, user: any) {
        const block = await this.prisma.roomBlock.findUnique({
            where: { id: blockId },
            include: { room: true },
        });

        if (!block) {
            throw new NotFoundException('Block not found');
        }

        await this.prisma.roomBlock.delete({
            where: { id: blockId },
        });

        // Check if there are other active blocks for this room
        const activeBlocks = await this.prisma.roomBlock.count({
            where: {
                roomId: block.roomId,
                endDate: { gte: new Date() },
            },
        });

        // If no more active blocks, set room to available
        if (activeBlocks === 0) {
            await this.prisma.room.update({
                where: { id: block.roomId },
                data: { status: 'AVAILABLE' },
            });
        }

        await this.auditService.createLog({
            action: 'UNBLOCK',
            entity: 'Room',
            entityId: block.roomId,
            userId: user.id,
            oldValue: block,
        });

        return { message: 'Block removed successfully' };
    }

    /**
     * Get room blocks
     */
    async getRoomBlocks(roomId: string, user: any) {
        // Verify room access first
        await this.findOne(roomId, user);

        return this.prisma.roomBlock.findMany({
            where: { roomId },
            include: {
                createdBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                startDate: 'desc',
            },
        });
    }

    /**
     * Bulk create rooms
     */
    async bulkCreate(
        roomTypeId: string,
        startNumber: number,
        count: number,
        floor: number,
        userId: string,
    ) {
        // Verify room type exists
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

        const rooms: any[] = [];
        for (let i = 0; i < count; i++) {
            const roomNumber = `${floor}${String(startNumber + i).padStart(2, '0')}`;

            // Check if room number exists
            const existing = await this.prisma.room.findFirst({
                where: { roomNumber },
            });

            if (!existing) {
                const room = await this.prisma.room.create({
                    data: {
                        roomNumber,
                        floor,
                        roomTypeId,
                        propertyId: roomType.propertyId,
                        status: 'AVAILABLE',
                        isEnabled: true,
                    },
                });
                rooms.push(room);
            }
        }

        await this.auditService.createLog({
            action: 'BULK_CREATE',
            entity: 'Room',
            entityId: roomTypeId,
            userId,
            newValue: { count: rooms.length, rooms },
        });

        return {
            created: rooms.length,
            rooms,
        };
    }
}
