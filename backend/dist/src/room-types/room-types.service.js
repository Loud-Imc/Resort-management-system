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
exports.RoomTypesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let RoomTypesService = class RoomTypesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createRoomTypeDto) {
        return this.prisma.roomType.create({
            data: createRoomTypeDto,
        });
    }
    async findAll(publicOnly = false) {
        return this.prisma.roomType.findMany({
            where: publicOnly ? { isPubliclyVisible: true } : undefined,
            include: {
                property: { select: { name: true, city: true } },
                rooms: {
                    where: { isEnabled: true },
                },
            },
        });
    }
    async findAllAdmin(user) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin') || roles.includes('Marketing');
        const where = {};
        if (!isGlobalAdmin) {
            where.property = {
                staff: { some: { userId: user.id } }
            };
        }
        return this.prisma.roomType.findMany({
            where,
            include: {
                property: { select: { name: true, city: true } },
                _count: {
                    select: { rooms: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }
    async findOne(id) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id },
            include: {
                rooms: true,
            },
        });
        if (!roomType) {
            throw new common_1.NotFoundException('Room type not found');
        }
        return roomType;
    }
    async update(id, updateRoomTypeDto) {
        await this.findOne(id);
        return this.prisma.roomType.update({
            where: { id },
            data: updateRoomTypeDto,
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.roomType.delete({
            where: { id },
        });
    }
};
exports.RoomTypesService = RoomTypesService;
exports.RoomTypesService = RoomTypesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomTypesService);
//# sourceMappingURL=room-types.service.js.map