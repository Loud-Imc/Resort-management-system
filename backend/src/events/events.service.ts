import { Injectable, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
    constructor(private prisma: PrismaService) { }

    async create(createEventDto: CreateEventDto, userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user) throw new UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');

        // Auto-approve if created by SuperAdmin
        const status = isSuperAdmin ? 'APPROVED' : 'PENDING';

        const { propertyId, organizerType, ...rest } = createEventDto;
        const sanitizedPropertyId = organizerType === 'EXTERNAL' || !propertyId ? null : propertyId;

        return this.prisma.event.create({
            data: {
                ...rest,
                organizerType,
                propertyId: sanitizedPropertyId,
                status: status as any,
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

    async findAll(query: { status?: string; propertyId?: string; organizerType?: string }) {
        return this.prisma.event.findMany({
            where: {
                ...(query.status && { status: query.status as any }),
                ...(query.propertyId && { propertyId: query.propertyId }),
                ...(query.organizerType && { organizerType: query.organizerType as any }),
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

    async findAllAdmin(userId: string, propertyId?: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user) throw new UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');

        if (isSuperAdmin) {
            return this.prisma.event.findMany({
                where: propertyId ? { propertyId } : undefined,
                include: { property: true, createdBy: true },
                orderBy: { createdAt: 'desc' },
            });
        }

        // Others only see what they created or events for properties they manage
        return this.prisma.event.findMany({
            where: {
                AND: [
                    propertyId ? { propertyId } : {},
                    {
                        OR: [
                            { createdById: userId },
                            { property: { staff: { some: { userId } } } },
                            { property: { ownerId: userId } },
                        ],
                    }
                ]
            },
            include: { property: true, createdBy: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const event = await this.prisma.event.findUnique({
            where: { id },
            include: { property: true, createdBy: true },
        });
        if (!event) throw new NotFoundException('Event not found');
        return event;
    }

    async update(id: string, updateEventDto: UpdateEventDto, userId: string) {
        const event = await this.findOne(id);

        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user) throw new UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');
        const isOwner = event.createdById === userId;

        if (!isSuperAdmin && !isOwner) {
            throw new ForbiddenException('You do not have permission to update this event');
        }

        return this.prisma.event.update({
            where: { id },
            data: updateEventDto as any,
        });
    }

    async remove(id: string, userId: string) {
        await this.update(id, { isActive: false } as any, userId);
        return { message: 'Event marked as inactive' };
    }

    async approve(id: string, userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        if (!user) throw new UnauthorizedException('User not found');
        const isSuperAdmin = user.roles.some((r) => r.role.name === 'SuperAdmin');

        if (!isSuperAdmin) {
            throw new ForbiddenException('Only SuperAdmin can approve events');
        }

        return this.prisma.event.update({
            where: { id },
            data: { status: 'APPROVED' },
        });
    }
}
