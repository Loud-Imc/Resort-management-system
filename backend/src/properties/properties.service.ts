import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto/property.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PropertiesService {
    constructor(private readonly prisma: PrismaService) { }

    // Generate URL-friendly slug from name
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36);
    }

    async create(user: any, data: CreatePropertyDto) {
        const slug = this.generateSlug(data.name);

        // Determine addedBy and commission logic
        const roles = user.roles || []; // Safety check
        const isMarketing = roles.includes('Marketing');
        const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        let addedById: string | null = null;
        let commission = new Prisma.Decimal(0);

        if (isMarketing) {
            addedById = user.id;
            // Assuming commission comes from data for now, or could be fixed/config based
            if (data.marketingCommission) {
                commission = new Prisma.Decimal(data.marketingCommission);
            }
        } else if (isAdmin && data.addedById) {
            addedById = data.addedById;
            if (data.marketingCommission) {
                commission = new Prisma.Decimal(data.marketingCommission);
            }
        }

        const ownerId = data.ownerId || user.id;

        return this.prisma.property.create({
            data: {
                ...data,
                slug,
                ownerId,
                addedById,
                marketingCommission: commission,
                commissionStatus: commission.greaterThan(0) ? 'PENDING' : 'PENDING',
                latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
                longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
                isFeatured: data.isFeatured || false,
            },
            include: {
                owner: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                addedBy: {
                    select: { id: true, firstName: true, email: true }
                }
            },
        });
    }

    async findAll(query: PropertyQueryDto) {
        const { city, state, type, search, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const where: Prisma.PropertyWhereInput = {
            isActive: true,
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(state && { state: { contains: state, mode: 'insensitive' } }),
            ...(type && { type }),
            ...(query.isFeatured !== undefined && { isFeatured: String(query.isFeatured) === 'true' }),
            ...(query.isVerified !== undefined && { isVerified: String(query.isVerified) === 'true' }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { city: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };

        const [properties, total] = await Promise.all([
            this.prisma.property.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                    _count: {
                        select: { rooms: true, bookings: true },
                    },
                },
            }),
            this.prisma.property.count({ where }),
        ]);

        return {
            data: properties,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findAllAdmin(user: any, query: PropertyQueryDto) {
        const { city, state, type, search, page = 1, limit = 10 } = query;
        const skip = (page - 1) * limit;

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin') || roles.includes('Marketing');

        const where: Prisma.PropertyWhereInput = {
            // If not global admin, restrict to assigned properties
            ...(!isGlobalAdmin && {
                OR: [
                    { ownerId: user.id },
                    { staff: { some: { userId: user.id } } }
                ]
            }),

            // Filters
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(state && { state: { contains: state, mode: 'insensitive' } }),
            ...(type && { type }),
            ...(query.isFeatured !== undefined && { isFeatured: String(query.isFeatured) === 'true' }),
            ...(query.isVerified !== undefined && { isVerified: String(query.isVerified) === 'true' }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { city: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                    { owner: { email: { contains: search, mode: 'insensitive' } } },
                ],
            }),
        };

        const [properties, total] = await Promise.all([
            this.prisma.property.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    owner: {
                        select: { id: true, firstName: true, lastName: true, email: true },
                    },
                    _count: {
                        select: { rooms: true, bookings: true },
                    },
                },
            }),
            this.prisma.property.count({ where }),
        ]);

        return {
            data: properties,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findBySlug(slug: string) {
        const property = await this.prisma.property.findUnique({
            where: { slug },
            include: {
                owner: {
                    select: { id: true, firstName: true, lastName: true, phone: true },
                },
                roomTypes: {
                    where: { isPubliclyVisible: true },
                    include: {
                        rooms: {
                            where: { isEnabled: true },
                            select: { id: true, roomNumber: true, status: true },
                        },
                        offers: {
                            where: {
                                isActive: true,
                                startDate: { lte: new Date() },
                                endDate: { gte: new Date() },
                            },
                        },
                    },
                },
                _count: {
                    select: { rooms: true, bookings: true },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        return property;
    }

    async findById(id: string) {
        const property = await this.prisma.property.findUnique({
            where: { id },
            include: {
                owner: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                roomTypes: true,
                rooms: true,
                staff: {
                    include: {
                        user: {
                            select: { id: true, firstName: true, lastName: true, email: true },
                        },
                    },
                },
            },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        return property;
    }

    async findByOwner(ownerId: string) {
        return this.prisma.property.findMany({
            where: { ownerId },
            include: {
                _count: {
                    select: { rooms: true, bookings: true, staff: true },
                },
            },
        });
    }

    async update(id: string, user: any, data: UpdatePropertyDto) {
        const property = await this.prisma.property.findUnique({
            where: { id },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        const roles = user.roles || [];
        const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (property.ownerId !== user.id && !isAdmin) {
            throw new ForbiddenException('You can only update your own properties');
        }

        // Prepare data for update, handling restricted fields
        const updateData: any = { ...data };

        // If not admin, prevent changing ownership/marketing fields
        if (!isAdmin) {
            delete updateData.ownerId;
            delete updateData.addedById;
            delete updateData.marketingCommission;
            delete updateData.commissionStatus;
            delete updateData.isFeatured;
        } else {
            // Admin logic
            // 1. Handle Owner ID
            if (updateData.ownerId) {
                // Verify owner exists
                const ownerExists = await this.prisma.user.findUnique({ where: { id: updateData.ownerId } });
                if (!ownerExists) {
                    throw new NotFoundException(`Owner user with ID ${updateData.ownerId} not found`);
                }
            } else {
                // If empty or null/undefined, remove it to prevent accidental nulling of required field
                delete updateData.ownerId;
            }

            // 2. Handle Added By ID
            if (updateData.addedById) {
                // Verify user exists
                const addedByExists = await this.prisma.user.findUnique({ where: { id: updateData.addedById } });
                if (!addedByExists) {
                    // If invalid ID sent, either throw or ignore. Throwing is safer.
                    throw new NotFoundException(`AddedBy user with ID ${updateData.addedById} not found`);
                }
            } else {
                // If empty or null, remove it. If you want to allow clearing, you'd check for explicit null.
                // Assuming empty string means "no change" or "clear" depends on intent.
                // Frontend sends '' for default. If we assume '' means "no change", we delete it.
                // If we want to allow clearing, we'd need a specific flag or value.
                // For now, let's assume invalid/empty means "don't touch".
                delete updateData.addedById;
            }
        }

        return this.prisma.property.update({
            where: { id },
            data: {
                ...updateData,
                latitude: data.latitude ? new Prisma.Decimal(data.latitude) : undefined,
                longitude: data.longitude ? new Prisma.Decimal(data.longitude) : undefined,
            },
        });
    }

    async delete(id: string, userId: string) {
        const property = await this.prisma.property.findUnique({
            where: { id },
        });

        if (!property) {
            throw new NotFoundException('Property not found');
        }

        if (property.ownerId !== userId) {
            throw new ForbiddenException('You can only delete your own properties');
        }

        return this.prisma.property.delete({ where: { id } });
    }

    // Admin: Verify a property
    async verify(id: string) {
        return this.prisma.property.update({
            where: { id },
            data: { isVerified: true },
        });
    }

    // Admin: Toggle active status
    async toggleActive(id: string, isActive: boolean) {
        return this.prisma.property.update({
            where: { id },
            data: { isActive },
        });
    }
}
