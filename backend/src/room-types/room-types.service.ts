import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';

@Injectable()
export class RoomTypesService {
    private readonly logger = new Logger(RoomTypesService.name);

    constructor(private prisma: PrismaService) { }

    async create(createRoomTypeDto: CreateRoomTypeDto, requestUser?: any) {
        if (requestUser) {
            const property = await this.prisma.property.findUnique({
                where: { id: createRoomTypeDto.propertyId },
                include: { staff: true },
            });
            if (!property) throw new NotFoundException('Property not found');
            const roles: string[] = requestUser.roles || [];
            const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
            const isOwner = property.ownerId === requestUser.id;
            const isStaff = property.staff.some((s) => s.userId === requestUser.id);
            if (!isAdmin && !isOwner && !isStaff) {
                throw new ForbiddenException('You do not have permission to add room types to this property');
            }
        }

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

    async findOne(id: string, requestUser?: any) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id },
            include: {
                rooms: true,
                cancellationPolicy: true,
                property: { select: { ownerId: true, defaultCancellationPolicyId: true, staff: true } },
            },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

        // Access Control Logic
        if (!requestUser) {
            // Guest access: only publicly visible room types
            if (!roomType.isPubliclyVisible) {
                throw new NotFoundException('Room type not found'); // Hide existence of private types
            }
        } else {
            // Authenticated user: Check roles/ownership
            const roles: string[] = requestUser.roles || [];
            const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin') || roles.includes('Marketing');
            const isOwner = roomType.property.ownerId === requestUser.id;
            const isStaff = roomType.property.staff.some((s) => s.userId === requestUser.id);

            // Allow access if:
            // 1. User is Admin/Owner/Staff
            // 2. Room type is publicly visible
            if (!isAdmin && !isOwner && !isStaff && !roomType.isPubliclyVisible) {
                throw new ForbiddenException('You do not have permission to access this room type');
            }
        }

        return roomType;
    }

    async update(id: string, updateRoomTypeDto: UpdateRoomTypeDto, requestUser?: any) {
        try {
            await this.findOne(id, requestUser);
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

    async remove(id: string, requestUser?: any) {
        await this.findOne(id, requestUser);

        try {
            return await this.prisma.roomType.delete({
                where: { id },
            });
        } catch (error) {
            if (error.code === 'P2003') {
                throw new BadRequestException('Cannot delete room type because physical rooms or bookings depend on it');
            }
            throw new InternalServerErrorException('Failed to delete room type.');
        }
    }
}
