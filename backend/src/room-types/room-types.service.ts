import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
    private readonly logger = new Logger(RoomTypesService.name);

    constructor(private prisma: PrismaService) { }

    async create(createRoomTypeDto: CreateRoomTypeDto) {
        try {
            const { cancellationPolicy, cancellationPolicyId, ...rest } = createRoomTypeDto;

            const data: any = {
                ...rest,
                cancellationPolicyText: cancellationPolicy,
                // Clean up empty strings for foreign keys
                cancellationPolicyId: (cancellationPolicyId && cancellationPolicyId.trim() !== '') ? cancellationPolicyId : null,
            };

            return await this.prisma.roomType.create({ data });
        } catch (error) {
            this.logger.error(`Error creating room type: ${error.message}`, error.stack);

            if (error.code === 'P2002') {
                throw new ConflictException('A room type with this name already exists for this property.');
            }

            throw new InternalServerErrorException('Failed to create room type. Please check the logs.');
        }
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
        try {
            await this.findOne(id);
            const { cancellationPolicy, cancellationPolicyId, ...rest } = updateRoomTypeDto;

            const data: any = {
                ...rest,
                cancellationPolicyText: cancellationPolicy,
            };

            // Clean up empty strings for foreign keys
            if (cancellationPolicyId !== undefined) {
                data.cancellationPolicyId = (cancellationPolicyId && cancellationPolicyId.trim() !== '') ? cancellationPolicyId : null;
            }

            return await this.prisma.roomType.update({
                where: { id },
                data,
            });
        } catch (error) {
            this.logger.error(`Error updating room type ${id}: ${error.message}`, error.stack);

            if (error.code === 'P2002') {
                throw new ConflictException('A room type with this name already exists for this property.');
            }

            if (error instanceof NotFoundException) throw error;

            throw new InternalServerErrorException('Failed to update room type. Please check the logs.');
        }
    }

    async remove(id: string) {
        await this.findOne(id);

        return this.prisma.roomType.delete({
            where: { id },
        });
    }
}
