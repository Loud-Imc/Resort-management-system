"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let RoomsService = class RoomsService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async create(createRoomDto, userId) {
        const { roomNumber, floor, roomTypeId, notes, isEnabled = true } = createRoomDto;
        const existingRoom = await this.prisma.room.findFirst({
            where: { roomNumber },
        });
        if (existingRoom) {
            throw new common_1.ConflictException(`Room number ${roomNumber} already exists`);
        }
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
        });
        if (!roomType) {
            throw new common_1.NotFoundException('Room type not found');
        }
        const room = await this.prisma.room.create({
            data: {
                roomNumber,
                floor,
                roomTypeId,
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
    async findAll(filters) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return this.prisma.room.findMany({
            where: {
                roomTypeId: filters?.roomTypeId,
                floor: filters?.floor,
                status: filters?.status,
                isEnabled: filters?.isEnabled,
            },
            include: {
                roomType: true,
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
    async findOne(id) {
        const room = await this.prisma.room.findUnique({
            where: { id },
            include: {
                roomType: true,
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
            throw new common_1.NotFoundException('Room not found');
        }
        return room;
    }
    async update(id, updateRoomDto, userId) {
        const room = await this.findOne(id);
        if (updateRoomDto.roomNumber && updateRoomDto.roomNumber !== room.roomNumber) {
            const existingRoom = await this.prisma.room.findFirst({
                where: {
                    roomNumber: updateRoomDto.roomNumber,
                    ...(room.propertyId && { propertyId: room.propertyId }),
                },
            });
            if (existingRoom) {
                throw new common_1.ConflictException(`Room number ${updateRoomDto.roomNumber} already exists`);
            }
        }
        if (updateRoomDto.roomTypeId) {
            const roomType = await this.prisma.roomType.findUnique({
                where: { id: updateRoomDto.roomTypeId },
            });
            if (!roomType) {
                throw new common_1.NotFoundException('Room type not found');
            }
        }
        const updated = await this.prisma.room.update({
            where: { id },
            data: {
                roomNumber: updateRoomDto.roomNumber,
                floor: updateRoomDto.floor,
                status: updateRoomDto.status,
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
            userId,
            oldValue: room,
            newValue: updated,
        });
        return updated;
    }
    async remove(id, userId) {
        const room = await this.findOne(id);
        const activeBookings = await this.prisma.booking.count({
            where: {
                roomId: id,
                status: {
                    in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
                },
            },
        });
        if (activeBookings > 0) {
            throw new common_1.BadRequestException('Cannot delete room with active bookings');
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
            userId,
            oldValue: room,
            newValue: updated,
        });
        return { message: 'Room disabled successfully' };
    }
    async blockRoom(roomId, blockRoomDto, userId) {
        const room = await this.findOne(roomId);
        const startDate = new Date(blockRoomDto.startDate);
        const endDate = new Date(blockRoomDto.endDate);
        if (endDate <= startDate) {
            throw new common_1.BadRequestException('End date must be after start date');
        }
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
            throw new common_1.ConflictException('Room is already blocked for this period');
        }
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
            throw new common_1.ConflictException('Room has bookings during this period');
        }
        const block = await this.prisma.roomBlock.create({
            data: {
                roomId,
                startDate,
                endDate,
                reason: blockRoomDto.reason,
                notes: blockRoomDto.notes,
                createdById: userId,
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
            userId,
            newValue: block,
        });
        return block;
    }
    async removeBlock(blockId, userId) {
        const block = await this.prisma.roomBlock.findUnique({
            where: { id: blockId },
            include: { room: true },
        });
        if (!block) {
            throw new common_1.NotFoundException('Block not found');
        }
        await this.prisma.roomBlock.delete({
            where: { id: blockId },
        });
        const activeBlocks = await this.prisma.roomBlock.count({
            where: {
                roomId: block.roomId,
                endDate: { gte: new Date() },
            },
        });
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
            userId,
            oldValue: block,
        });
        return { message: 'Block removed successfully' };
    }
    async getRoomBlocks(roomId) {
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
    async bulkCreate(roomTypeId, startNumber, count, floor, userId) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: roomTypeId },
        });
        if (!roomType) {
            throw new common_1.NotFoundException('Room type not found');
        }
        const rooms = [];
        for (let i = 0; i < count; i++) {
            const roomNumber = `${floor}${String(startNumber + i).padStart(2, '0')}`;
            const existing = await this.prisma.room.findFirst({
                where: { roomNumber },
            });
            if (!existing) {
                const room = await this.prisma.room.create({
                    data: {
                        roomNumber,
                        floor,
                        roomTypeId,
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
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map