import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto/property.dto';
import { RegisterPropertyDto } from './dto/register-property.dto';
import { Prisma, PropertyStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhone } from '../common/utils/phone';

@Injectable()
export class PropertiesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    // Generate URL-friendly slug from name
    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36);
    }

    async create(user: any, data: CreatePropertyDto) {
        const slug = await this.generateUniqueSlug(data.name);

        // Determine addedBy and commission logic
        const roles = user.roles || []; // Safety check
        const isMarketing = roles.includes('Marketing');
        const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        let addedById: string | null = null;
        let commission = new Prisma.Decimal(0);

        if (isMarketing) {
            addedById = user.id;
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
                commissionStatus: 'PENDING',
                latitude: data.latitude ? new Prisma.Decimal(data.latitude) : null,
                longitude: data.longitude ? new Prisma.Decimal(data.longitude) : null,
                isFeatured: data.isFeatured || false,
                status: PropertyStatus.APPROVED, // Manual creation by staff is auto-approved
                categoryId: data.categoryId || null,
            },
            include: {
                owner: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                addedBy: {
                    select: { id: true, firstName: true, email: true }
                },
                category: true,
            },
        });
    }

    async publicRegister(dto: RegisterPropertyDto) {
        // Check if user with email or phone already exists
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.ownerEmail },
                    { phone: normalizePhone(dto.ownerPhone) },
                ],
            },
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });

        // Find PropertyOwner role
        const ownerRole = await this.prisma.role.findFirst({
            where: { name: 'PropertyOwner', propertyId: null },
        });

        if (!ownerRole) {
            throw new NotFoundException('Property Owner role not found in system');
        }

        let user: any = existingUser;

        if (existingUser) {
            // 1. Verify password
            const isPasswordValid = await bcrypt.compare(dto.ownerPassword, existingUser.password);
            if (!isPasswordValid) {
                throw new ConflictException('A user with this email or phone already exists. Please enter the correct password to link your account.');
            }
            user = existingUser;
        }

        const slug = await this.generateUniqueSlug(dto.propertyName);
        const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);

        try {
            const result = await this.prisma.$transaction(async (tx) => {
                // 1. Create or Update User
                if (!user) {
                    user = await tx.user.create({
                        data: {
                            email: dto.ownerEmail,
                            password: hashedPassword,
                            firstName: dto.ownerFirstName,
                            lastName: dto.ownerLastName,
                            phone: normalizePhone(dto.ownerPhone),
                            isActive: true,
                            roles: {
                                create: {
                                    roleId: ownerRole.id,
                                },
                            },
                        },
                    });
                } else {
                    // Check if we need to add the role
                    const hasRole = user.roles.some((ur: any) => ur.role.name === 'PropertyOwner');
                    if (!hasRole) {
                        await tx.userRole.create({
                            data: {
                                userId: user.id,
                                roleId: ownerRole.id,
                            },
                        });
                    }
                }

                // 2. Create Property
                const property = await tx.property.create({
                    data: {
                        name: dto.propertyName,
                        slug,
                        description: dto.propertyDescription,
                        type: dto.propertyType,
                        categoryId: dto.categoryId || null,
                        address: dto.address,
                        city: dto.city,
                        state: dto.state,
                        country: dto.country,
                        pincode: dto.pincode,
                        phone: normalizePhone(dto.propertyPhone),
                        email: dto.propertyEmail,
                        ownerId: user.id,
                        images: dto.images || [],
                        amenities: dto.amenities || [],
                        licenceImage: dto.licenceImage,
                        gstNumber: dto.gstNumber,
                        ownerAadhaarNumber: dto.ownerAadhaarNumber,
                        ownerAadhaarImage: dto.ownerAadhaarImage,
                        allowsGroupBooking: dto.allowsGroupBooking || false,
                        status: PropertyStatus.PENDING,
                    },
                });

                return {
                    id: property.id,
                    slug: property.slug,
                    status: property.status,
                    owner: {
                        id: user.id,
                        email: user.email,
                    },
                };
            });
            // Notify admins of new registration
            await this.notificationsService.notifyPropertyRegistration(result);

            return result;
        } catch (error) {
            if (error.code === 'P2002') {
                throw new ConflictException('A user with this email or phone already exists. Please login with your existing credentials.');
            }
            throw error;
        }
    }

    private async generateUniqueSlug(name: string): Promise<string> {
        let slug = this.generateSlug(name);
        let exists = await this.prisma.property.findUnique({ where: { slug } });
        while (exists) {
            slug = this.generateSlug(name);
            exists = await this.prisma.property.findUnique({ where: { slug } });
        }
        return slug;
    }

    async findAll(query: PropertyQueryDto) {
        const { city, state, type, search, page = 1, limit = 10, latitude, longitude, radius } = query;
        const skip = (page - 1) * limit;

        let geoPropertyIds: string[] | null = null;

        // Handle geo-spatial search if lat/lng/radius are provided
        if (latitude !== undefined && longitude !== undefined && radius !== undefined) {
            const results = await this.prisma.$queryRaw<any[]>`
                SELECT id FROM properties
                WHERE (
                    6371 * acos(
                        cos(radians(${Number(latitude)})) * cos(radians(CAST(latitude AS DOUBLE PRECISION))) *
                        cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${Number(longitude)})) +
                        sin(radians(${Number(latitude)})) * sin(radians(CAST(latitude AS DOUBLE PRECISION)))
                    )
                ) <= ${Number(radius)}
            `;
            geoPropertyIds = results.map(r => r.id);
        }

        const where: Prisma.PropertyWhereInput = {
            isActive: true,
            status: PropertyStatus.APPROVED,
            roomTypes: {
                some: {
                    isPubliclyVisible: true
                }
            },
            ...(geoPropertyIds !== null && { id: { in: geoPropertyIds } }),
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(state && { state: { contains: state, mode: 'insensitive' } }),
            ...(type && { type }),
            ...(query.categoryId && { categoryId: query.categoryId }),
            ...(query.isFeatured !== undefined && { isFeatured: String(query.isFeatured) === 'true' }),
            ...(query.isVerified !== undefined && { isVerified: String(query.isVerified) === 'true' }),
            ...(query.allowsGroupBooking !== undefined && { allowsGroupBooking: String(query.allowsGroupBooking) === 'true' }),
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
                    category: true,
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
            ...(query.categoryId && { categoryId: query.categoryId }),
            ...(query.isFeatured !== undefined && { isFeatured: String(query.isFeatured) === 'true' }),
            ...(query.isVerified !== undefined && { isVerified: String(query.isVerified) === 'true' }),
            ...(query.allowsGroupBooking !== undefined && { allowsGroupBooking: String(query.allowsGroupBooking) === 'true' }),
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
                    category: true,
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
        const property = await this.prisma.property.findFirst({
            where: {
                slug,
                status: PropertyStatus.APPROVED
            },
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

    async findById(id: string, requestUser?: any) {
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

        // Scope check — only owner, staff, or admin can access property details
        if (requestUser) {
            const roles: string[] = requestUser.roles || [];
            const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
            const isOwner = property.ownerId === requestUser.id;
            const isStaff = property.staff.some((s) => s.userId === requestUser.id);

            if (!isAdmin && !isOwner && !isStaff) {
                throw new ForbiddenException('You do not have access to this property');
            }

            // Strip sensitive KYC and financial fields for non-admin callers
            if (!isAdmin) {
                const sanitized: any = { ...property };
                delete sanitized.ownerAadhaarNumber;
                delete sanitized.ownerAadhaarImage;
                delete sanitized.licenceImage;
                delete sanitized.gstNumber;
                delete sanitized.platformCommission;
                delete sanitized.marketingCommission;
                return sanitized;
            }
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
                categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
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

    // Admin: Update status (Approve/Reject)
    async updateStatus(id: string, status: PropertyStatus) {
        const property = await this.prisma.property.update({
            where: { id },
            data: {
                status,
                isVerified: status === PropertyStatus.APPROVED ? true : undefined,
            },
        });

        // Notify owner of status update
        await this.notificationsService.notifyPropertyStatusUpdate(property, status);

        return property;
    }

    // Admin: Toggle active status
    async toggleActive(id: string, isActive: boolean) {
        return this.prisma.property.update({
            where: { id },
            data: { isActive },
        });
    }

    // Google Places Autocomplete proxy — keeps API key server-side
    async getPlaceAutocomplete(input: string) {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) return [];
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=(cities)&key=${apiKey}`;
        const res = await fetch(url);
        const data: any = await res.json();
        if (!data.predictions) return [];
        return data.predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
        }));
    }

    // Geocode a free-text location string to lat/lng (used for nearby fallback)
    async geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) return null;
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(location)}&key=${apiKey}`;
        const res = await fetch(url);
        const data: any = await res.json();
        const result = data.results?.[0];
        if (!result) return null;
        return {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
        };
    }

    // Find nearby properties by lat/lng within a radius (km)
    async findNearby(lat: number, lng: number, radiusKm = 100) {
        const results = await this.prisma.$queryRaw<any[]>`
            SELECT id FROM properties
            WHERE status = 'APPROVED' AND "isActive" = true
            AND (
                6371 * acos(
                    cos(radians(${lat})) * cos(radians(CAST(latitude AS DOUBLE PRECISION))) *
                    cos(radians(CAST(longitude AS DOUBLE PRECISION)) - radians(${lng})) +
                    sin(radians(${lat})) * sin(radians(CAST(latitude AS DOUBLE PRECISION)))
                )
            ) <= ${radiusKm}
        `;
        if (!results.length) return [];
        const ids = results.map((r) => r.id);
        return this.prisma.property.findMany({
            where: { id: { in: ids }, isActive: true },
            include: {
                category: true,
                _count: { select: { rooms: true, bookings: true } },
            },
        });
    }
}
