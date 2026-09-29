import { Injectable, NotFoundException, ConflictException, InternalServerErrorException, Logger, ForbiddenException, BadRequestException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { ConnectivityOutboxService } from '../connectivity/services/connectivity-outbox.service';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { PreviewOccupancyDto } from './dto/preview-occupancy.dto';
import { generateOccupancyCompositions, OccupancyComposition } from '../common/utils/occupancy.util';
import { ROOM_HIGHLIGHTS, ROOM_INCLUSIONS, ROOM_AMENITIES } from './constants/room-type-options.constant';

@Injectable()
export class RoomTypesService {
    private readonly logger = new Logger(RoomTypesService.name);

    constructor(
        private prisma: PrismaService,
        @Inject(forwardRef(() => ChannelsService)) private channelsService: ChannelsService,
        @Optional() @Inject(forwardRef(() => ConnectivityOutboxService)) private outboxService?: ConnectivityOutboxService,
    ) { }

    /**
     * Get predefined master options for room highlights, inclusions, and amenities.
     */
    public getMasterOptions() {
        return {
            highlights: [...ROOM_HIGHLIGHTS],
            inclusions: [...ROOM_INCLUSIONS],
            amenities: [...ROOM_AMENITIES],
        };
    }

    /**
     * Preview occupancy compositions for mobile apps and web clients.
     */
    public previewOccupancy(dto: PreviewOccupancyDto) {
        const isPhysAdultsSet = dto.maxPhysicalAdults !== undefined && dto.maxPhysicalAdults !== null;
        const isPhysChildrenSet = dto.maxPhysicalChildren !== undefined && dto.maxPhysicalChildren !== null;
        const isTotalMaxSet = dto.totalMaxOccupancy !== undefined && dto.totalMaxOccupancy !== null;
        const isTotalBaseSet = dto.totalBaseOccupancy !== undefined && dto.totalBaseOccupancy !== null;

        const totalMax = isTotalMaxSet
            ? Math.max(1, Number(dto.totalMaxOccupancy))
            : undefined;

        const effectivePhysAdults = isPhysAdultsSet
            ? Math.max(1, Number(dto.maxPhysicalAdults))
            : (totalMax !== undefined ? totalMax : (dto.baseAdults !== undefined ? Math.max(1, Number(dto.baseAdults)) : undefined));

        const effectivePhysChildren = isPhysChildrenSet
            ? Math.max(0, Number(dto.maxPhysicalChildren))
            : (totalMax !== undefined ? Math.max(0, totalMax - 1) : (dto.baseChildren !== undefined ? Math.max(0, Number(dto.baseChildren)) : undefined));

        const maxPhysicalInfants = Math.max(0, Number(dto.maxPhysicalInfants ?? 0));

        const totalBase = isTotalBaseSet
            ? Math.max(1, Number(dto.totalBaseOccupancy))
            : undefined;

        let maxPhysicalCompositions: OccupancyComposition[] = [];
        if (totalMax !== undefined && effectivePhysAdults !== undefined && effectivePhysChildren !== undefined) {
            maxPhysicalCompositions = generateOccupancyCompositions(
                effectivePhysAdults,
                effectivePhysChildren,
                totalMax
            );
        }

        let baseCompositions: OccupancyComposition[] = [];
        if (totalBase !== undefined) {
            let baseEffectiveMaxAdults = effectivePhysAdults !== undefined ? effectivePhysAdults : totalBase;
            let baseEffectiveMaxChildren = effectivePhysChildren !== undefined ? effectivePhysChildren : Math.max(0, totalBase - 1);

            if (dto.baseMaxAdults !== undefined && dto.baseMaxAdults !== null) {
                baseEffectiveMaxAdults = Math.min(baseEffectiveMaxAdults, Number(dto.baseMaxAdults));
            }
            if (dto.baseMaxChildren !== undefined && dto.baseMaxChildren !== null) {
                baseEffectiveMaxChildren = Math.min(baseEffectiveMaxChildren, Number(dto.baseMaxChildren));
            }

            baseCompositions = generateOccupancyCompositions(
                baseEffectiveMaxAdults,
                baseEffectiveMaxChildren,
                totalBase
            );
        }

        return {
            baseAdults: dto.baseAdults,
            baseChildren: dto.baseChildren,
            maxPhysicalAdults: isPhysAdultsSet ? Number(dto.maxPhysicalAdults) : null,
            maxPhysicalChildren: isPhysChildrenSet ? Number(dto.maxPhysicalChildren) : null,
            maxPhysicalInfants,
            totalBaseOccupancy: totalBase,
            totalMaxOccupancy: totalMax,
            baseMaxAdults: dto.baseMaxAdults,
            baseMaxChildren: dto.baseMaxChildren,
            baseCompositions,
            maxPhysicalCompositions,
        };
    }

    /**
     * Enrich RoomType entity with calculated occupancy compositions for mobile/web APIs.
     */
    public enrichRoomTypeWithOccupancy(roomType: any) {
        if (!roomType) return roomType;
        const isTotalMaxSet = roomType.totalMaxOccupancy !== null && roomType.totalMaxOccupancy !== undefined;
        const isTotalBaseSet = roomType.totalBaseOccupancy !== null && roomType.totalBaseOccupancy !== undefined;

        const totalMax = isTotalMaxSet
            ? Math.max(1, Number(roomType.totalMaxOccupancy))
            : (roomType.maxPhysicalAdults !== null && roomType.maxPhysicalAdults !== undefined && roomType.maxPhysicalChildren !== null && roomType.maxPhysicalChildren !== undefined
                ? Number(roomType.maxPhysicalAdults) + Number(roomType.maxPhysicalChildren)
                : undefined);

        const isPhysAdultsSet = roomType.maxPhysicalAdults !== null && roomType.maxPhysicalAdults !== undefined;
        const isPhysChildrenSet = roomType.maxPhysicalChildren !== null && roomType.maxPhysicalChildren !== undefined;

        const effectivePhysAdults = isPhysAdultsSet
            ? Math.max(1, Number(roomType.maxPhysicalAdults))
            : (totalMax !== undefined ? totalMax : Math.max(1, Number(roomType.maxAdults ?? 2)));

        const effectivePhysChildren = isPhysChildrenSet
            ? Math.max(0, Number(roomType.maxPhysicalChildren))
            : (totalMax !== undefined ? Math.max(0, totalMax - 1) : Math.max(0, Number(roomType.maxChildren ?? 0)));

        const maxPhysicalInfants = Math.max(0, Number(roomType.maxPhysicalInfants ?? 1));

        const totalBase = isTotalBaseSet
            ? Math.max(1, Number(roomType.totalBaseOccupancy))
            : (Math.max(1, Number(roomType.baseAdults ?? roomType.maxAdults ?? 2)) + Math.max(0, Number(roomType.baseChildren ?? roomType.maxChildren ?? 0)));

        let baseEffectiveMaxAdults = effectivePhysAdults;
        let baseEffectiveMaxChildren = effectivePhysChildren;

        if (isTotalBaseSet) {
            if (roomType.baseMaxAdults !== null && roomType.baseMaxAdults !== undefined) {
                baseEffectiveMaxAdults = Math.min(effectivePhysAdults, Number(roomType.baseMaxAdults));
            }
            if (roomType.baseMaxChildren !== null && roomType.baseMaxChildren !== undefined) {
                baseEffectiveMaxChildren = Math.min(effectivePhysChildren, Number(roomType.baseMaxChildren));
            }
        } else {
            baseEffectiveMaxAdults = Math.max(1, Number(roomType.baseAdults ?? roomType.maxAdults ?? 2));
            baseEffectiveMaxChildren = Math.max(0, Number(roomType.baseChildren ?? roomType.maxChildren ?? 0));
        }

        const baseCompositions = generateOccupancyCompositions(
            baseEffectiveMaxAdults,
            baseEffectiveMaxChildren,
            totalBase
        );
        const maxPhysicalCompositions = totalMax !== undefined ? generateOccupancyCompositions(
            effectivePhysAdults,
            effectivePhysChildren,
            totalMax
        ) : [];

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
            const isV2 = (rt as any).totalMaxOccupancy !== null && (rt as any).totalMaxOccupancy !== undefined;
            const physAdults = (rt as any).maxPhysicalAdults ?? rt.maxAdults ?? 2;
            const physChildren = (rt as any).maxPhysicalChildren ?? rt.maxChildren ?? 0;
            const capacityPerRoom = isV2
                ? Number((rt as any).totalMaxOccupancy)
                : (((rt as any).groupMaxOccupancy !== null && (rt as any).groupMaxOccupancy !== undefined)
                    ? Number((rt as any).groupMaxOccupancy)
                    : (Number(physAdults) + Number(physChildren)));
            const activeRoomCount = rt.rooms ? rt.rooms.length : 0;
            total += capacityPerRoom * activeRoomCount;
        }

        await this.prisma.property.update({
            where: { id: propertyId },
            data: { maxGroupCapacity: total > 0 ? total : null },
        });
    }

    private validatePricing(
        basePrice: number,
        originalPrice?: number | null,
        extraAdultPrice?: number | null,
        extraChildPrice?: number | null,
        acOption?: string | null,
        extraAdultPriceAc?: number | null,
        extraChildPriceAc?: number | null,
        basePriceAc?: number | null,
    ) {
        const effectiveHighestBasePrice = (acOption === 'BOTH' && basePriceAc !== null && basePriceAc !== undefined)
            ? Math.max(Number(basePrice), Number(basePriceAc))
            : Number(basePrice);

        if (originalPrice !== undefined && originalPrice !== null) {
            if (originalPrice <= effectiveHighestBasePrice) {
                throw new BadRequestException(
                    acOption === 'BOTH'
                        ? `Original price (MRP) must be higher than the highest base price (₹${effectiveHighestBasePrice})`
                        : `Original price (MRP) must be higher than the base price (₹${basePrice})`
                );
            }
        }

        const extraAdult = extraAdultPrice !== undefined && extraAdultPrice !== null ? Number(extraAdultPrice) : 0;
        const extraChild = extraChildPrice !== undefined && extraChildPrice !== null ? Number(extraChildPrice) : 0;

        if (extraAdult < 0) {
            throw new BadRequestException('Extra Adult Price cannot be negative.');
        }
        if (extraChild < 0) {
            throw new BadRequestException('Extra Child Price cannot be negative.');
        }
        if (extraChild > extraAdult) {
            throw new BadRequestException(`Extra Child Price (₹${extraChild}) cannot exceed Extra Adult Price (₹${extraAdult}).`);
        }
        if (basePrice > 0 && extraAdult > basePrice) {
            throw new BadRequestException(`Extra Adult Price (₹${extraAdult}) cannot exceed Room Base Price (₹${basePrice}).`);
        }

        if (acOption === 'BOTH') {
            const extraAdultAc = extraAdultPriceAc !== null && extraAdultPriceAc !== undefined ? Number(extraAdultPriceAc) : null;
            const extraChildAc = extraChildPriceAc !== null && extraChildPriceAc !== undefined ? Number(extraChildPriceAc) : null;

            if (extraAdultAc !== null) {
                if (extraAdultAc < 0) {
                    throw new BadRequestException('AC Extra Adult Price cannot be negative.');
                }
                if (extraAdultAc < extraAdult) {
                    throw new BadRequestException(`AC Extra Adult Price (₹${extraAdultAc}) cannot be less than Non-AC Extra Adult Price (₹${extraAdult}).`);
                }
            }
            if (extraChildAc !== null) {
                if (extraChildAc < 0) {
                    throw new BadRequestException('AC Extra Child Price cannot be negative.');
                }
                if (extraChildAc < extraChild) {
                    throw new BadRequestException(`AC Extra Child Price (₹${extraChildAc}) cannot be less than Non-AC Extra Child Price (₹${extraChild}).`);
                }
            }

            const effectiveAcAdult = extraAdultAc !== null ? extraAdultAc : extraAdult;
            const effectiveAcChild = extraChildAc !== null ? extraChildAc : extraChild;
            if (effectiveAcChild > effectiveAcAdult) {
                throw new BadRequestException(`AC Extra Child Price (₹${effectiveAcChild}) cannot exceed AC Extra Adult Price (₹${effectiveAcAdult}).`);
            }
        }
    }

    private validateOccupancyHierarchy(data: {
        maxPhysicalAdults?: number | null;
        maxPhysicalChildren?: number | null;
        maxPhysicalInfants?: number | null;
        freeChildrenCount?: number | null;
        totalBaseOccupancy?: number | null;
        totalMaxOccupancy?: number | null;
        baseMaxAdults?: number | null;
        baseMaxChildren?: number | null;
    }, isCreate = false) {
        const baseOcc = (data.totalBaseOccupancy !== undefined && data.totalBaseOccupancy !== null)
            ? Number(data.totalBaseOccupancy)
            : undefined;
        const maxOcc = (data.totalMaxOccupancy !== undefined && data.totalMaxOccupancy !== null)
            ? Number(data.totalMaxOccupancy)
            : undefined;
        const physAdults = (data.maxPhysicalAdults !== undefined && data.maxPhysicalAdults !== null)
            ? Number(data.maxPhysicalAdults)
            : undefined;
        const physChildren = (data.maxPhysicalChildren !== undefined && data.maxPhysicalChildren !== null)
            ? Number(data.maxPhysicalChildren)
            : undefined;
        const physInfants = (data.maxPhysicalInfants !== undefined && data.maxPhysicalInfants !== null)
            ? Number(data.maxPhysicalInfants)
            : undefined;

        if (isCreate) {
            if (baseOcc === undefined) {
                throw new BadRequestException('Total Base Occupancy is required.');
            }
            if (baseOcc < 1) {
                throw new BadRequestException('Total Base Occupancy must be at least 1.');
            }
            if (maxOcc === undefined) {
                throw new BadRequestException('Total Max Occupancy is required.');
            }
            if (maxOcc < 1) {
                throw new BadRequestException('Total Max Occupancy must be at least 1.');
            }
        } else {
            if (baseOcc !== undefined && baseOcc < 1) {
                throw new BadRequestException('Total Base Occupancy must be at least 1.');
            }
            if (maxOcc !== undefined && maxOcc < 1) {
                throw new BadRequestException('Total Max Occupancy must be at least 1.');
            }
        }

        if (baseOcc !== undefined && maxOcc !== undefined && maxOcc < baseOcc) {
            throw new BadRequestException(`Total Max Occupancy cannot be less than Total Base Occupancy (${baseOcc}).`);
        }

        // Physical Adults validation (OPTIONAL)
        if (physAdults !== undefined) {
            if (physAdults < 1) {
                throw new BadRequestException('Max Physical Adults must be at least 1.');
            }
            if (maxOcc !== undefined && physAdults > maxOcc) {
                throw new BadRequestException(`Max Physical Adults cannot exceed Total Max Occupancy (${maxOcc}).`);
            }
        }

        // Physical Children validation (OPTIONAL: 0 <= PC <= M - 1)
        if (physChildren !== undefined) {
            if (physChildren < 0) {
                throw new BadRequestException('Max Physical Children cannot be negative.');
            }
            if (maxOcc !== undefined && physChildren > maxOcc - 1) {
                throw new BadRequestException(`Max Physical Children cannot exceed Total Max Occupancy minus 1 (${maxOcc - 1}), because at least one adult is required.`);
            }
        }

        // Physical Adults + Children sum validation
        if (physAdults !== undefined && physChildren !== undefined && maxOcc !== undefined) {
            if (physAdults + physChildren > maxOcc) {
                throw new BadRequestException(`The sum of Max Physical Adults (${physAdults}) and Max Physical Children (${physChildren}) cannot exceed Total Max Occupancy (${maxOcc}).`);
            } else if (physAdults + physChildren < maxOcc) {
                throw new BadRequestException(`The sum of Max Physical Adults (${physAdults}) and Max Physical Children (${physChildren}) must equal Total Max Occupancy (${maxOcc}) (currently ${physAdults + physChildren}).`);
            }
        }

        // Free Children Count validation (0 <= Free Children Count <= max physical children allowed)
        const effectiveMaxChildren = physChildren !== undefined ? physChildren : (maxOcc !== undefined ? Math.max(0, maxOcc - 1) : undefined);
        if (data.freeChildrenCount !== undefined && data.freeChildrenCount !== null) {
            const fcc = Number(data.freeChildrenCount);
            if (fcc < 0) {
                throw new BadRequestException('Free Children Count cannot be negative.');
            }
            if (effectiveMaxChildren !== undefined && fcc > effectiveMaxChildren) {
                throw new BadRequestException(`Free Children Count (${fcc}) cannot exceed maximum physical children allowed (${effectiveMaxChildren}).`);
            }
        }

        // Physical Infants validation (OPTIONAL, independent of M)
        if (physInfants !== undefined && physInfants < 0) {
            throw new BadRequestException('Max Infants cannot be negative.');
        }

        // Base Max Adults / Base Max Children validation
        if (baseOcc === undefined) {
            if (data.baseMaxAdults !== undefined && data.baseMaxAdults !== null) {
                throw new BadRequestException('Set Total Base Occupancy first.');
            }
            if (data.baseMaxChildren !== undefined && data.baseMaxChildren !== null) {
                throw new BadRequestException('Set Total Base Occupancy first.');
            }
        } else {
            if (data.baseMaxAdults !== undefined && data.baseMaxAdults !== null) {
                const bma = Number(data.baseMaxAdults);
                if (bma < 1) {
                    throw new BadRequestException('Base Max Adults must be at least 1.');
                }
                if (bma > baseOcc) {
                    throw new BadRequestException(`Base Max Adults cannot exceed Total Base Occupancy (${baseOcc}).`);
                }
            }
            if (data.baseMaxChildren !== undefined && data.baseMaxChildren !== null) {
                const bmc = Number(data.baseMaxChildren);
                if (bmc < 0) {
                    throw new BadRequestException('Base Max Children cannot be negative.');
                }
                if (bmc > baseOcc) {
                    throw new BadRequestException(`Base Max Children cannot exceed Total Base Occupancy (${baseOcc}).`);
                }
            }
            if (data.baseMaxAdults !== undefined && data.baseMaxAdults !== null && data.baseMaxChildren !== undefined && data.baseMaxChildren !== null) {
                const bma = Number(data.baseMaxAdults);
                const bmc = Number(data.baseMaxChildren);
                if (bma + bmc > baseOcc) {
                    throw new BadRequestException(`The sum of Base Max Adults (${bma}) and Base Max Children (${bmc}) cannot exceed Total Base Occupancy (${baseOcc}).`);
                } else if (bma + bmc < baseOcc) {
                    throw new BadRequestException(`The sum of Base Max Adults (${bma}) and Base Max Children (${bmc}) must equal Total Base Occupancy (${baseOcc}) (currently ${bma + bmc}).`);
                }
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

        this.validatePricing(
            createRoomTypeDto.basePrice,
            createRoomTypeDto.originalPrice,
            createRoomTypeDto.extraAdultPrice,
            createRoomTypeDto.extraChildPrice,
            createRoomTypeDto.acOption,
            createRoomTypeDto.extraAdultPriceAc,
            createRoomTypeDto.extraChildPriceAc,
            createRoomTypeDto.basePriceAc,
        );
        this.validateOccupancyHierarchy(createRoomTypeDto, true);

        try {
            const { cancellationPolicy, cancellationPolicyId, ...rest } = createRoomTypeDto;

            const baseAdults = Number(rest.baseAdults ?? 2);
            const baseChildren = Number(rest.baseChildren ?? 0);
            const maxAdults = Number(rest.maxAdults ?? baseAdults);
            const maxChildren = Number(rest.maxChildren ?? 0);

            const physAdults = (rest.maxPhysicalAdults !== undefined && rest.maxPhysicalAdults !== null)
                ? Number(rest.maxPhysicalAdults)
                : Math.max(maxAdults, baseAdults, 2);
            const physChildren = (rest.maxPhysicalChildren !== undefined && rest.maxPhysicalChildren !== null)
                ? Number(rest.maxPhysicalChildren)
                : Math.max(maxChildren, baseChildren, 0);
            const physInfants = (rest.maxPhysicalInfants !== undefined && rest.maxPhysicalInfants !== null)
                ? Number(rest.maxPhysicalInfants)
                : 0;

            const totalBaseOccupancy = (rest.totalBaseOccupancy !== undefined && rest.totalBaseOccupancy !== null)
                ? Number(rest.totalBaseOccupancy)
                : (baseAdults + baseChildren);

            const totalMaxOccupancy = (rest.totalMaxOccupancy !== undefined && rest.totalMaxOccupancy !== null)
                ? Number(rest.totalMaxOccupancy)
                : (physAdults + physChildren);

            const isV2 = totalMaxOccupancy !== null && totalMaxOccupancy !== undefined;
            const computedGroupMax = isV2
                ? totalMaxOccupancy
                : ((createRoomTypeDto.groupMaxOccupancy !== undefined && createRoomTypeDto.groupMaxOccupancy !== null)
                    ? Number(createRoomTypeDto.groupMaxOccupancy)
                    : (physAdults + physChildren));

            const data: any = {
                ...rest,
                baseAdults,
                baseChildren,
                maxAdults,
                maxChildren,
                maxPhysicalAdults: physAdults,
                maxPhysicalChildren: physChildren,
                maxPhysicalInfants: physInfants,
                totalBaseOccupancy,
                totalMaxOccupancy,
                occupancyVersion: rest.occupancyVersion || 'V2',
                groupMaxOccupancy: computedGroupMax,
                cancellationPolicyText: cancellationPolicy,
                cancellationPolicyId: (cancellationPolicyId && cancellationPolicyId.trim() !== '') ? cancellationPolicyId : null,
            };

            // Remove any undefined keys to ensure clean Prisma payload
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

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
                ratePlanPrices: { include: { ratePlan: true }, orderBy: { createdAt: 'asc' } },
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
                ratePlanPrices: { include: { ratePlan: true }, orderBy: { createdAt: 'asc' } },
            },
            orderBy: { createdAt: 'asc' },
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
                ratePlanPrices: { include: { ratePlan: true }, orderBy: { createdAt: 'asc' } },
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
            const originalPrice = updateRoomTypeDto.originalPrice !== undefined 
                ? (updateRoomTypeDto.originalPrice !== null ? Number(updateRoomTypeDto.originalPrice) : null)
                : ((existing as any).originalPrice ? Number((existing as any).originalPrice) : null);

            const extraAdultPrice = updateRoomTypeDto.extraAdultPrice !== undefined
                ? (updateRoomTypeDto.extraAdultPrice !== null ? Number(updateRoomTypeDto.extraAdultPrice) : 0)
                : ((existing as any).extraAdultPrice !== null && (existing as any).extraAdultPrice !== undefined ? Number((existing as any).extraAdultPrice) : 0);
            const extraChildPrice = updateRoomTypeDto.extraChildPrice !== undefined
                ? (updateRoomTypeDto.extraChildPrice !== null ? Number(updateRoomTypeDto.extraChildPrice) : 0)
                : ((existing as any).extraChildPrice !== null && (existing as any).extraChildPrice !== undefined ? Number((existing as any).extraChildPrice) : 0);
            const acOption = updateRoomTypeDto.acOption !== undefined
                ? updateRoomTypeDto.acOption
                : (existing as any).acOption;
            const extraAdultPriceAc = updateRoomTypeDto.extraAdultPriceAc !== undefined
                ? (updateRoomTypeDto.extraAdultPriceAc !== null ? Number(updateRoomTypeDto.extraAdultPriceAc) : null)
                : ((existing as any).extraAdultPriceAc !== null && (existing as any).extraAdultPriceAc !== undefined ? Number((existing as any).extraAdultPriceAc) : null);
            const extraChildPriceAc = updateRoomTypeDto.extraChildPriceAc !== undefined
                ? (updateRoomTypeDto.extraChildPriceAc !== null ? Number(updateRoomTypeDto.extraChildPriceAc) : null)
                : ((existing as any).extraChildPriceAc !== null && (existing as any).extraChildPriceAc !== undefined ? Number((existing as any).extraChildPriceAc) : null);

            const basePriceAc = updateRoomTypeDto.basePriceAc !== undefined
                ? (updateRoomTypeDto.basePriceAc !== null ? Number(updateRoomTypeDto.basePriceAc) : null)
                : ((existing as any).basePriceAc !== null && (existing as any).basePriceAc !== undefined ? Number((existing as any).basePriceAc) : null);

            this.validatePricing(
                basePrice,
                originalPrice ?? undefined,
                extraAdultPrice,
                extraChildPrice,
                acOption,
                extraAdultPriceAc,
                extraChildPriceAc,
                basePriceAc,
            );

            const resolvedBaseOcc = updateRoomTypeDto.totalBaseOccupancy !== undefined ? updateRoomTypeDto.totalBaseOccupancy : existing.totalBaseOccupancy;
            const resolvedMaxOcc = updateRoomTypeDto.totalMaxOccupancy !== undefined ? updateRoomTypeDto.totalMaxOccupancy : existing.totalMaxOccupancy;
            const resolvedBMA = updateRoomTypeDto.baseMaxAdults !== undefined ? updateRoomTypeDto.baseMaxAdults : existing.baseMaxAdults;
            const resolvedBMC = updateRoomTypeDto.baseMaxChildren !== undefined ? updateRoomTypeDto.baseMaxChildren : existing.baseMaxChildren;
            const resolvedFreeChildren = updateRoomTypeDto.freeChildrenCount !== undefined ? updateRoomTypeDto.freeChildrenCount : existing.freeChildrenCount;

            const physAdults = updateRoomTypeDto.maxPhysicalAdults !== undefined
                ? (updateRoomTypeDto.maxPhysicalAdults !== null ? Number(updateRoomTypeDto.maxPhysicalAdults) : (resolvedMaxOcc ? Number(resolvedMaxOcc) : 2))
                : existing.maxPhysicalAdults;
            const physChildren = updateRoomTypeDto.maxPhysicalChildren !== undefined
                ? (updateRoomTypeDto.maxPhysicalChildren !== null ? Number(updateRoomTypeDto.maxPhysicalChildren) : null)
                : existing.maxPhysicalChildren;
            const physInfants = updateRoomTypeDto.maxPhysicalInfants !== undefined
                ? (updateRoomTypeDto.maxPhysicalInfants !== null ? Number(updateRoomTypeDto.maxPhysicalInfants) : null)
                : existing.maxPhysicalInfants;

            this.validateOccupancyHierarchy({
                maxPhysicalAdults: physAdults,
                maxPhysicalChildren: physChildren,
                maxPhysicalInfants: physInfants,
                freeChildrenCount: resolvedFreeChildren,
                totalBaseOccupancy: resolvedBaseOcc,
                totalMaxOccupancy: resolvedMaxOcc,
                baseMaxAdults: resolvedBMA,
                baseMaxChildren: resolvedBMC,
            }, false);

            const isV2 = resolvedMaxOcc !== null && resolvedMaxOcc !== undefined;
            let resolvedGroupMax: number | null = null;
            if (isV2) {
                resolvedGroupMax = Number(resolvedMaxOcc);
            } else if (updateRoomTypeDto.groupMaxOccupancy !== undefined) {
                resolvedGroupMax = updateRoomTypeDto.groupMaxOccupancy !== null ? Number(updateRoomTypeDto.groupMaxOccupancy) : null;
            } else if (existing.groupMaxOccupancy !== null && existing.groupMaxOccupancy !== undefined) {
                resolvedGroupMax = Number(existing.groupMaxOccupancy);
            } else {
                resolvedGroupMax = (Number(physAdults ?? 2)) + (Number(physChildren ?? 0));
            }

            const { cancellationPolicy, cancellationPolicyId, propertyId, ...rest } = updateRoomTypeDto;

            const data: any = {
                ...rest,
                groupMaxOccupancy: resolvedGroupMax,
                originalPrice,
            };

            if (updateRoomTypeDto.maxPhysicalAdults !== undefined) {
                data.maxPhysicalAdults = physAdults;
            }
            if (updateRoomTypeDto.maxPhysicalChildren !== undefined) {
                data.maxPhysicalChildren = physChildren;
            }
            if (updateRoomTypeDto.maxPhysicalInfants !== undefined) {
                data.maxPhysicalInfants = physInfants;
            }

            if (cancellationPolicy !== undefined) {
                data.cancellationPolicyText = (cancellationPolicy && cancellationPolicy.trim() !== '') ? cancellationPolicy.trim() : null;
            }

            if (cancellationPolicyId !== undefined) {
                data.cancellationPolicyId = (cancellationPolicyId && cancellationPolicyId.trim() !== '') ? cancellationPolicyId.trim() : null;
            }

            // Remove any undefined keys, but KEEP null values so Prisma sets them to NULL
            Object.keys(data).forEach(key => data[key] === undefined && delete data[key]);

            const updated = await this.prisma.roomType.update({
                where: { id },
                data,
            });

            // Sync whenever pool membership or capacity changes
            const poolChanged =
                updateRoomTypeDto.isAvailableForGroupBooking !== undefined ||
                updateRoomTypeDto.groupMaxOccupancy !== undefined ||
                updateRoomTypeDto.totalMaxOccupancy !== undefined;
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
