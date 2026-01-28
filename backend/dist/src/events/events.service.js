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
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EventsService = class EventsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createEventDto, userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');
        const status = isSuperAdmin ? 'APPROVED' : 'PENDING';
        const { propertyId, organizerType, ...rest } = createEventDto;
        const sanitizedPropertyId = organizerType === 'EXTERNAL' || !propertyId ? null : propertyId;
        return this.prisma.event.create({
            data: {
                ...rest,
                organizerType,
                propertyId: sanitizedPropertyId,
                status: status,
                createdById: userId,
            },
            include: {
                property: true,
                createdBy: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
    }
    async findAll(query) {
        return this.prisma.event.findMany({
            where: {
                ...(query.status && { status: query.status }),
                ...(query.propertyId && { propertyId: query.propertyId }),
                ...(query.organizerType && { organizerType: query.organizerType }),
                isActive: true,
            },
            include: {
                property: true,
            },
            orderBy: {
                date: 'asc',
            },
        });
    }
    async findAllAdmin(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');
        if (isSuperAdmin) {
            return this.prisma.event.findMany({
                include: { property: true, createdBy: true },
                orderBy: { createdAt: 'desc' },
            });
        }
        return this.prisma.event.findMany({
            where: {
                OR: [
                    { createdById: userId },
                    { property: { staff: { some: { userId } } } },
                    { property: { ownerId: userId } },
                ],
            },
            include: { property: true, createdBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id) {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: { property: true, createdBy: true },
        });
        if (!event)
            throw new common_1.NotFoundException('Event not found');
        return event;
    }
    async update(id, updateEventDto, userId) {
        const event = await this.findOne(id);
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');
        const isOwner = event.createdById === userId;
        if (!isSuperAdmin && !isOwner) {
            throw new common_1.ForbiddenException('You do not have permission to update this event');
        }
        return this.prisma.event.update({
            where: { id },
            data: updateEventDto,
        });
    }
    async remove(id, userId) {
        await this.update(id, { isActive: false }, userId);
        return { message: 'Event marked as inactive' };
    }
    async approve(id, userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');
        if (!isSuperAdmin) {
            throw new common_1.ForbiddenException('Only SuperAdmin can approve events');
        }
        return this.prisma.event.update({
            where: { id },
            data: { status: 'APPROVED' },
        });
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventsService);
//# sourceMappingURL=events.service.js.map