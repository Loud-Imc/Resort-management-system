import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
    constructor(private prisma: PrismaService) { }

    async create(createRoomTypeDto: CreateRoomTypeDto) {
        const { cancellationPolicy, ...rest } = createRoomTypeDto;
        return this.prisma.roomType.create({
            data: {
                ...rest,
                cancellationPolicyText: cancellationPolicy,
            },
        });
    }

    async findAll(publicOnly = false, propertyId?: string) {
        return this.prisma.roomType.findMany({
            where: {
                ...(publicOnly ? { isPubliclyVisible: true } : {}),
                ...(propertyId ? { propertyId } : {}),
            },
            include: {
                // Include property name for context
                property: { select: { name: true, city: true, defaultCancellationPolicyId: true } },
                rooms: {
                    where: { isEnabled: true },
                },
                cancellationPolicy: true,
            },
        });
    }

    async findAllAdmin(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin') || roles.includes('Marketing');

        const where: any = {};

        if (!isGlobalAdmin) {
            where.property = {
                OR: [
                    { ownerId: user.id },
                    { staff: { some: { userId: user.id } } }
                ]
            };
        }

        if (propertyId) {
            where.propertyId = propertyId;
        }

        return this.prisma.roomType.findMany({
            where,
            include: {
                property: { select: { name: true, city: true, defaultCancellationPolicyId: true } },
                cancellationPolicy: true,
                _count: {
                    select: { rooms: true }
                }
            },
            orderBy: { name: 'asc' }
        });
    }

    async findOne(id: string) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id },
            include: {
                rooms: true,
                cancellationPolicy: true,
                property: { select: { defaultCancellationPolicyId: true } },
            },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

        return roomType;
    }

    async update(id: string, updateRoomTypeDto: UpdateRoomTypeDto) {
        await this.findOne(id);
        const { cancellationPolicy, ...rest } = updateRoomTypeDto;

        return this.prisma.roomType.update({
            where: { id },
            data: {
                ...rest,
                cancellationPolicyText: cancellationPolicy,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.roomType.delete({
            where: { id },
        });
    }
}
