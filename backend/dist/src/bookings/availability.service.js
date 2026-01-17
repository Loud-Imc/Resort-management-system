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
exports.AvailabilityService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AvailabilityService = class AvailabilityService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async checkAvailability(roomTypeId, checkInDate, checkOutDate) {
        const availableRooms = await this.getAvailableRooms(roomTypeId, checkInDate, checkOutDate);
        return availableRooms.length > 0;
    }
    async getAvailableRooms(roomTypeId, checkInDate, checkOutDate) {
        const allRooms = await this.prisma.room.findMany({
            where: {
                roomTypeId,
                isEnabled: true,
                status: 'AVAILABLE',
            },
        });
        const availableRooms = [];
        for (const room of allRooms) {
            const isAvailable = await this.isRoomAvailable(room.id, checkInDate, checkOutDate);
            if (isAvailable) {
                availableRooms.push(room);
            }
        }
        return availableRooms;
    }
    async isRoomAvailable(roomId, checkInDate, checkOutDate) {
        const overlappingBookings = await this.prisma.booking.findMany({
            where: {
                roomId,
                status: {
                    in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'],
                },
                OR: [
                    {
                        AND: [
                            { checkInDate: { lte: checkInDate } },
                            { checkOutDate: { gt: checkInDate } },
                        ],
                    },
                    {
                        AND: [
                            { checkInDate: { lt: checkOutDate } },
                            { checkOutDate: { gte: checkOutDate } },
                        ],
                    },
                    {
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
    async getAvailableRoomCount(roomTypeId, checkInDate, checkOutDate) {
        const availableRooms = await this.getAvailableRooms(roomTypeId, checkInDate, checkOutDate);
        return availableRooms.length;
    }
    async searchAvailableRoomTypes(checkInDate, checkOutDate, adults, children) {
        const suitableTypes = await this.prisma.roomType.findMany({
            where: {
                maxAdults: { gte: adults },
                maxChildren: { gte: children },
                isPubliclyVisible: true,
            },
            include: {
                rooms: true,
            },
        });
        const results = [];
        for (const type of suitableTypes) {
            const availableCount = await this.getAvailableRoomCount(type.id, checkInDate, checkOutDate);
            if (availableCount > 0) {
                const { rooms, ...typeData } = type;
                results.push({
                    ...typeData,
                    availableCount,
                    totalPrice: Number(type.basePrice),
                });
            }
        }
        return results;
    }
};
exports.AvailabilityService = AvailabilityService;
exports.AvailabilityService = AvailabilityService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AvailabilityService);
//# sourceMappingURL=availability.service.js.map