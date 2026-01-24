import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
    constructor(private prisma: PrismaService) { }

    async create(createRoomTypeDto: CreateRoomTypeDto) {
        return this.prisma.roomType.create({
            data: createRoomTypeDto,
        });
    }

    async findAll(publicOnly = false) {
        return this.prisma.roomType.findMany({
            where: publicOnly ? { isPubliclyVisible: true } : undefined,
            include: {
                // Include property name for context
                property: { select: { name: true, city: true } },
                rooms: {
                    where: { isEnabled: true },
                },
            },
        });
    }

    async findAllAdmin(user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin') || roles.includes('Marketing');

        const where: any = {};

        if (!isGlobalAdmin) {
            // Filter by properties assigned to this user
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

    async findOne(id: string) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id },
            include: {
                rooms: true,
            },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

        return roomType;
    }

    async update(id: string, updateRoomTypeDto: UpdateRoomTypeDto) {
        await this.findOne(id);

        return this.prisma.roomType.update({
            where: { id },
            data: updateRoomTypeDto,
        });
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.roomType.delete({
            where: { id },
        });
    }
}
