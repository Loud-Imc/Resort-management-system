import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, ForbiddenException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { ConnectivityOutboxService } from '../connectivity/services/connectivity-outbox.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { PreviewOccupancyDto } from './dto/preview-occupancy.dto';
import { generateOccupancyCompositions } from '../common/utils/occupancy.util';

@Injectable()
export class RoomTypesService {
    private readonly logger = new Logger(RoomTypesService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => ChannelsService)) private channelsService: ChannelsService,
        @Optional() @Inject(forwardRef(() => ConnectivityOutboxService)) private outboxService?: ConnectivityOutboxService,
    ) { }

    /**
     * Preview occupancy compositions for mobile apps and web clients.
     */
    public previewOccupancy(dto: PreviewOccupancyDto) {
        const baseAdults = Math.max(1, Number(dto.baseAdults ?? 2));
        const baseChildren = Math.max(0, Number(dto.baseChildren ?? 0));
        const maxPhysicalAdults = Math.max(1, Number(dto.maxPhysicalAdults ?? baseAdults));
        const maxPhysicalChildren = Math.max(0, Number(dto.maxPhysicalChildren ?? baseChildren));
        const maxPhysicalInfants = Math.max(0, Number(dto.maxPhysicalInfants ?? 1));

        const baseCompositions = generateOccupancyCompositions(
            baseAdults,
            baseChildren,
            baseAdults + baseChildren
        );
        const maxPhysicalCompositions = generateOccupancyCompositions(
            maxPhysicalAdults,
            maxPhysicalChildren,
            maxPhysicalAdults + maxPhysicalChildren
        );

        return {
            baseAdults,
            baseChildren,
            maxPhysicalAdults,
            maxPhysicalChildren,
            maxPhysicalInfants,
            baseCompositions,
            maxPhysicalCompositions,
        };
    }

    /**
     * Enrich RoomType entity with calculated occupancy compositions for mobile/web APIs.
     */
    public enrichRoomTypeWithOccupancy(roomType: any) {
        if (!roomType) return roomType;
        const baseAdults = Math.max(1, Number(roomType.baseAdults ?? roomType.maxAdults ?? 2));
        const baseChildren = Math.max(0, Number(roomType.baseChildren ?? roomType.maxChildren ?? 0));
        const maxPhysicalAdults = Math.max(1, Number(roomType.maxPhysicalAdults ?? baseAdults));
        const maxPhysicalChildren = Math.max(0, Number(roomType.maxPhysicalChildren ?? baseChildren));
        const maxPhysicalInfants = Math.max(0, Number(roomType.maxPhysicalInfants ?? 1));

        const baseCompositions = generateOccupancyCompositions(
            baseAdults,
            baseChildren,
            baseAdults + baseChildren
        );
        const maxPhysicalCompositions = generateOccupancyCompositions(
            maxPhysicalAdults,
            maxPhysicalChildren,
            maxPhysicalAdults + maxPhysicalChildren
        );

        return {
            ...roomType,
            occupancyCompositions: {
                base: baseCompositions,
                maxPhysical: maxPhysicalCompositions,
                maxPhysicalInfants,
            },
        };
    }

    /**
     * Recompute and persist property.maxGroupCapacity as the SUM of
     * (maxPhysicalAdults + maxPhysicalChildren) * active physical room count
     * for all room types with isAvailableForGroupBooking=true.
     * Called automatically after create/update/delete of any room type or room.
     */
    public async syncPropertyGroupCapacity(propertyId: string): Promise<void> {
        const roomTypes = await this.prisma.roomType.findMany({
            where: { propertyId, isAvailableForGroupBooking: true },
            include: {
                rooms: {
                    where: { isEnabled: true },
                },
            },
        });

        let total = 0;
        for (const rt of roomTypes) {
            const physAdults = rt.maxPhysicalAdults ?? rt.maxAdults ?? 2;
            const physChildren = rt.maxPhysicalChildren ?? rt.maxChildren ?? 0;
            const capacityPerRoom = Number(physAdults) + Number(physChildren);
            const activeRoomCount = rt.rooms ? rt.rooms.length : 0;
            total += capacityPerRoom * activeRoomCount;
        }

        await this.prisma.property.update({
            where: { id: propertyId },
            data: { maxGroupCapacity: total > 0 ? total : null },
        });
    }

    private validatePricing(basePrice: number, originalPrice?: number) {
        if (originalPrice !== undefined && originalPrice !== null) {
            if (originalPrice <= basePrice) {
                throw new BadRequestException('Original price (MRP) must be higher than the base price');
            }
        }
    }

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

        this.validatePricing(createRoomTypeDto.basePrice, createRoomTypeDto.originalPrice);

        try {
            const { cancellationPolicy, cancellationPolicyId, ...rest } = createRoomTypeDto;

            const physAdults = rest.maxPhysicalAdults ?? rest.maxAdults ?? 2;
            const physChildren = rest.maxPhysicalChildren ?? rest.maxChildren ?? 0;
            const computedGroupMax = Number(physAdults) + Number(physChildren);

            const data: any = {
                ...rest,
                groupMaxOccupancy: computedGroupMax,
                cancellationPolicyText: cancellationPolicy,
                cancellationPolicyId: (cancellationPolicyId && cancellationPolicyId.trim() !== '') ? cancellationPolicyId : null,
            };

            const roomType = await this.prisma.roomType.create({ data });

            // Sync property group capacity if this room type is in the pool
            if (roomType.isAvailableForGroupBooking) {
                await this.syncPropertyGroupCapacity(roomType.propertyId);
            }

            // [PRC-01] Auto-sync with Channex in background
            this.channelsService.pushAriForProperty(roomType.propertyId, 60).catch(err => {
                this.logger.error(`Auto-sync failed for property ${roomType.propertyId} after room type creation: ${err.message}`, err.stack);
            });

            return this.enrichRoomTypeWithOccupancy(roomType);
        } catch (error: any) {
            this.logger.error(`Failed to create room type: ${error.message}`, error.stack);
            if (error.code === 'P2002') {
                throw new ConflictException('A room type with this name already exists for this property.');
            }
            throw new InternalServerErrorException('Failed to create room type. Please check the logs.');
        }
    }

    async findAll(publicOnly = false, propertyId?: string) {
        const roomTypes = await this.prisma.roomType.findMany({
            where: {
                ...(publicOnly ? { isPubliclyVisible: true } : {}),
                ...(propertyId ? { propertyId } : {}),
            },
            include: {
                property: { select: { name: true, city: true, defaultCancellationPolicyId: true } },
                rooms: {
                    where: { isEnabled: true },
                },
                cancellationPolicy: true,
            },
        });
        return roomTypes.map((rt) => this.enrichRoomTypeWithOccupancy(rt));
    }

    async findAllAdmin(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        const roomTypes = await this.prisma.roomType.findMany({
            where: {
                ...(propertyId ? { propertyId } : {}),
                property: !isGlobalAdmin ? propertyFilter : undefined,
            },
            include: {
                property: { select: { name: true, city: true, defaultCancellationPolicyId: true } },
                rooms: true,
                cancellationPolicy: true,
            },
        });
        return roomTypes.map((rt) => this.enrichRoomTypeWithOccupancy(rt));
    }

    async findOne(id: string, requestUser?: any) {
        const roomType = await this.prisma.roomType.findUnique({
            where: { id },
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        city: true,
                        ownerId: true,
                        defaultCancellationPolicyId: true,
                        staff: true,
                    },
                },
                rooms: true,
                cancellationPolicy: true,
            },
        });

        if (!roomType) {
            throw new NotFoundException('Room type not found');
        }

        if (requestUser) {
            const roles: string[] = requestUser.roles || [];
            const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
            const isOwner = roomType.property.ownerId === requestUser.id;
            const isStaff = roomType.property.staff.some((s) => s.userId === requestUser.id);
            if (!isAdmin && !isOwner && !isStaff) {
                throw new ForbiddenException('You do not have permission to view this room type');
            }
        }

        return this.enrichRoomTypeWithOccupancy(roomType);
    }

    async update(id: string, updateRoomTypeDto: UpdateRoomTypeDto, requestUser?: any) {
        try {
            const existing = await this.findOne(id, requestUser);

            const basePrice = updateRoomTypeDto.basePrice !== undefined ? updateRoomTypeDto.basePrice : Number((existing as any).basePrice);
            const originalPrice = updateRoomTypeDto.originalPrice !== undefined ? updateRoomTypeDto.originalPrice : ((existing as any).originalPrice ? Number((existing as any).originalPrice) : undefined);

            this.validatePricing(basePrice, originalPrice);

            const physAdults = updateRoomTypeDto.maxPhysicalAdults ?? updateRoomTypeDto.maxAdults ?? existing.maxPhysicalAdults ?? existing.maxAdults ?? 2;
            const physChildren = updateRoomTypeDto.maxPhysicalChildren ?? updateRoomTypeDto.maxChildren ?? existing.maxPhysicalChildren ?? existing.maxChildren ?? 0;

            const data: any = {
                ...updateRoomTypeDto,
                groupMaxOccupancy: Number(physAdults) + Number(physChildren),
                cancellationPolicyText: updateRoomTypeDto.cancellationPolicy,
            };

            if (updateRoomTypeDto.cancellationPolicyId !== undefined) {
                data.cancellationPolicyId = (updateRoomTypeDto.cancellationPolicyId && updateRoomTypeDto.cancellationPolicyId.trim() !== '') ? updateRoomTypeDto.cancellationPolicyId : null;
            }

            const updated = await this.prisma.roomType.update({
                where: { id },
                data,
            });

            // Sync whenever pool membership or capacity changes
            const poolChanged =
                updateRoomTypeDto.isAvailableForGroupBooking !== undefined ||
                updateRoomTypeDto.groupMaxOccupancy !== undefined;
            if (poolChanged || existing.isAvailableForGroupBooking || updated.isAvailableForGroupBooking) {
                await this.syncPropertyGroupCapacity(updated.propertyId);
            }

            // Produce Connectivity Outbox Events (RATE.CHANGED / CONTENT.CHANGED)
            if (this.outboxService) {
                if (updateRoomTypeDto.basePrice !== undefined && Number(updateRoomTypeDto.basePrice) !== Number(existing.basePrice)) {
                    const today = new Date().toISOString().slice(0, 10);
                    const nextYear = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10);
                    await this.outboxService.createRateEventForProperty(
                        null,
                        updated.propertyId,
                        updated.id,
                        today,
                        nextYear,
                        Number(updated.basePrice),
                        'INR',
                    ).catch(err => this.logger.error(`Failed to produce RATE.CHANGED event: ${err.message}`));
                }

                await this.outboxService.createContentEventForProperty(
                    null,
                    updated.propertyId,
                    'ROOM_TYPE_DETAILS',
                ).catch(err => this.logger.error(`Failed to produce CONTENT.CHANGED event: ${err.message}`));
            }

            // [PRC-01] Auto-sync with Channex in background
            this.channelsService.pushAriForProperty(updated.propertyId, 60).catch(err => {
                this.logger.error(`Auto-sync failed for property ${updated.propertyId} after room type update: ${err.message}`, err.stack);
            });

            return updated;
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
        const existing = await this.findOne(id, requestUser);

        try {
            const deleted = await this.prisma.roomType.delete({
                where: { id },
            });

            // Recalculate capacity if this room type was in the pool
            if (existing.isAvailableForGroupBooking) {
                await this.syncPropertyGroupCapacity(existing.propertyId);
            }

            // [PRC-01] Auto-sync with Channex in background
            this.channelsService.pushAriForProperty(existing.propertyId, 60).catch(err => {
                this.logger.error(`Auto-sync failed for property ${existing.propertyId} after room type deletion: ${err.message}`, err.stack);
            });

            return deleted;
        } catch (error) {
            if (error.code === 'P2003') {
                throw new BadRequestException('Cannot delete room type because physical rooms or bookings depend on it');
            }
            throw new InternalServerErrorException('Failed to delete room type.');
        }
    }
}
