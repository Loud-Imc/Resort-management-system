import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto/property.dto';
import { RegisterPropertyDto } from './dto/register-property.dto';
import { Prisma, PropertyStatus, RequestStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';
import { normalizePhone } from '../common/utils/phone';
import { AuditService } from '../audit/audit.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class PropertiesService {
    private readonly logger = new Logger(PropertiesService.name);
    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
        private readonly audit: AuditService,
        private readonly systemSettings: SystemSettingsService,
    ) { }

    /**
     * Send OTP for Commission Verification
     */
    async sendCommissionOtp(phone: string, commission: number) {
        const normalized = normalizePhone(phone);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Upsert OTP
        await this.prisma.oneTimePassword.deleteMany({
            where: { phone: normalized, type: 'COMMISSION_VERIFICATION' }
        });

        await this.prisma.oneTimePassword.create({
            data: {
                phone: normalized,
                code,
                type: 'COMMISSION_VERIFICATION',
                expiresAt
            }
        });

        const message = `Your OTP for confirming the ${commission}% platform commission is ${code}. Please enter this to complete your registration.`;

        await this.notificationsService.sendWhatsApp(normalized, message);

        this.logger.log(`Commission OTP (${code}) sent via WhatsApp to ${normalized}`);

        return { success: true, message: 'Verification code sent' };
    }

    /**
     * Verify OTP for Commission
     */
    async verifyCommissionOtp(phone: string, code: string) {
        const normalized = normalizePhone(phone);
        this.logger.log(`Attempting to verify commission OTP for ${normalized} with code ${code}`);
        const otp = await this.prisma.oneTimePassword.findFirst({
            where: {
                phone: normalized,
                type: 'COMMISSION_VERIFICATION',
                code,
                expiresAt: { gte: new Date() }
            }
        });

        if (!otp) {
            this.logger.warn(`Commission OTP verification failed for ${normalized}. Code used: ${code}`);
            throw new BadRequestException('Invalid or expired verification code');
        }

        // Delete OTP after verification
        await this.prisma.oneTimePassword.delete({ where: { id: otp.id } });

        return { success: true, message: 'Commission verified successfully' };
    }

    // Generate URL-friendly slug from name
    private async generateUniqueSlug(name: string): Promise<string> {
        const baseSlug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

        let slug = baseSlug;
        let count = 0;
        let exists = true;

        while (exists) {
            const check = await this.prisma.property.findUnique({ where: { slug } });
            if (!check) {
                exists = false;
            } else {
                count++;
                slug = `${baseSlug}-${count}`;
            }
        }
        return slug;
    }

    /**
     * Create a Property Request (Maker - Marketing/Admin)
     */
    async createRequest(user: any, dto: any) {
        const request = await this.prisma.propertyRequest.create({
            data: {
                name: dto.name,
                location: dto.location,
                ownerEmail: dto.ownerEmail,
                ownerPhone: dto.ownerPhone,
                details: dto.details || {},
                requestedById: user.id,
            }
        });

        await this.notificationsService.notifyPropertyRequest(request);

        await this.audit.createLog({
            action: 'PROPERTY_REQUEST_CREATED',
            entity: 'PropertyRequest',
            entityId: request.id,
            userId: user.id,
            newValue: {
                name: request.name,
                ownerEmail: request.ownerEmail
            }
        });

        return request;
    }

    /**
     * Approve a Property Request (Checker - Admin)
     */
    async approveRequest(user: any, requestId: string) {
        const request = await this.prisma.propertyRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request already processed');

        const details = request.details as any || {};

        // // Validation Before Approval
        // if (!details.images || !Array.isArray(details.images) || details.images.length === 0) {
        //     throw new BadRequestException('Cannot approve: Property must have at least one image.');
        // }
        // if (!details.amenities || !Array.isArray(details.amenities) || details.amenities.length === 0) {
        //     throw new BadRequestException('Cannot approve: Property must have at least one amenity.');
        // }
        if (!request.ownerEmail || !request.ownerPhone) {
            throw new BadRequestException('Cannot approve: Missing owner contact details.');
        }

        // Finalize the creation
        return this.prisma.$transaction(async (tx) => {
            // 1. Find Owner — use the user who submitted the request first,
            //    then fall back to email/phone lookup for manually created requests.
            let owner = await tx.user.findUnique({
                where: { id: request.requestedById }
            });

            // Validate the found user is the actual owner (not a system admin for legacy requests)
            if (!owner || owner.email !== request.ownerEmail) {
                owner = await tx.user.findFirst({
                    where: {
                        OR: [
                            { email: request.ownerEmail },
                            { phone: normalizePhone(request.ownerPhone) }
                        ]
                    }
                });
            }

            if (!owner) {
                // Last resort: create user with a secure random temp password
                const ownerRole = await tx.role.findFirst({ where: { name: 'PropertyOwner', propertyId: null } });
                if (!ownerRole) throw new NotFoundException('PropertyOwner role not found in system');
                const tempPassword = await bcrypt.hash(`resort@${Date.now()}`, 10);
                owner = await tx.user.create({
                    data: {
                        email: request.ownerEmail,
                        phone: normalizePhone(request.ownerPhone),
                        password: tempPassword,
                        firstName: request.name.split(' ')[0],
                        lastName: 'Owner',
                        roles: { create: { roleId: ownerRole.id } }
                    }
                });
            }

            // 2. Create Property
            const slug = await this.generateUniqueSlug(request.name);
            const property = await tx.property.create({
                data: {
                    name: request.name,
                    slug,
                    address: details.address || request.location,
                    city: details.city || 'TBD',
                    state: details.state || 'TBD',
                    country: details.country || 'India',
                    pincode: details.pincode || '',
                    type: details.type || 'RESORT',
                    email: details.propertyEmail || request.ownerEmail,
                    phone: details.propertyPhone || request.ownerPhone,
                    ownerId: owner.id,
                    addedById: request.referredById || null,
                    status: PropertyStatus.APPROVED,
                    isVerified: true,
                    description: details.description || '',
                    images: details.images || [],
                    amenities: details.amenities || [],
                    licenceImage: details.licenceImage || null,
                    gstNumber: details.gstNumber || null,
                    ownerAadhaarNumber: details.ownerAadhaarNumber || null,
                    ownerAadhaarImage: details.ownerAadhaarImage || null,
                    allowsGroupBooking: details.allowsGroupBooking || false,
                    maxGroupCapacity: details.maxGroupCapacity || null,
                    platformCommission: details.platformCommission
                        ? new Prisma.Decimal(details.platformCommission)
                        : new Prisma.Decimal(await this.systemSettings.getSetting('DEFAULT_PLATFORM_COMMISSION') ?? 10.00),
                }
            });

            // 3. Update Request
            await tx.propertyRequest.update({
                where: { id: requestId },
                data: {
                    status: RequestStatus.APPROVED,
                    approvedById: user.id,
                    propertyId: property.id
                }
            });

            await this.audit.createLog({
                action: 'PROPERTY_REQUEST_APPROVED',
                entity: 'Property',
                entityId: property.id,
                userId: user.id,
                newValue: {
                    requestId,
                    propertyName: property.name,
                    ownerId: owner.id
                }
            });

            return property;
        });
    }

    /**
     * Reject a Property Request (Checker - Admin)
     */
    async rejectRequest(user: any, requestId: string, reason: string) {
        if (!reason) throw new BadRequestException('Rejection reason is mandatory');

        const request = await this.prisma.propertyRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Request already processed');

        const updated = await this.prisma.propertyRequest.update({
            where: { id: requestId },
            data: {
                status: RequestStatus.REJECTED,
                reason,
                rejectedById: user.id,
                rejectedAt: new Date()
            }
        });

        await this.audit.createLog({
            action: 'PROPERTY_REQUEST_REJECTED',
            entity: 'PropertyRequest',
            entityId: requestId,
            userId: user.id,
            newValue: { reason }
        });

        return updated;
    }

    /**
     * Get Property Requests for current user (Owner)
     */
    async findMyRequests(userId: string) {
        return this.prisma.propertyRequest.findMany({
            where: { requestedById: userId },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Update Property Request details (Owner)
     */
    async updateRequest(userId: string, requestId: string, payload: any) {
        const request = await this.prisma.propertyRequest.findUnique({
            where: { id: requestId }
        });

        if (!request) throw new NotFoundException('Request not found');
        if (request.requestedById !== userId) throw new ForbiddenException('You can only update your own requests');
        if (request.status !== RequestStatus.PENDING) throw new BadRequestException('Cannot update a processed request');

        const details = (request.details as any) || {};
        const newDetails = { ...details, ...payload };

        let name = request.name;
        if (payload.name) {
            name = payload.name;
            delete newDetails.name;
        }

        return this.prisma.propertyRequest.update({
            where: { id: requestId },
            data: {
                name,
                details: newDetails
            }
        });
    }

    async findAllRequests(status?: RequestStatus) {
        return this.prisma.propertyRequest.findMany({
            where: status ? { status } : {},
            include: {
                requestedBy: { select: { id: true, firstName: true, email: true } },
                approvedBy: { select: { id: true, firstName: true, email: true } },
                rejectedBy: { select: { id: true, firstName: true, email: true } },
                property: { select: { id: true, name: true, slug: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async impersonate(user: any, propertyId: string) {
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId },
            include: { owner: { select: { id: true, firstName: true, email: true } } }
        });
        if (!property) throw new NotFoundException('Property not found');

        // Log the impersonation action
        await this.prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'PROPERTY_IMPERSONATION',
                entity: 'Property',
                entityId: propertyId,
                newValue: { propertyName: property.name, ownerId: property.ownerId }
            }
        });

        // Return the owner context for the frontend to use
        return {
            propertyId: property.id,
            ownerId: property.ownerId,
            ownerName: property.owner?.firstName,
            propertyName: property.name
        };
    }

    async create(user: any, data: CreatePropertyDto) {
        const slug = await this.generateUniqueSlug(data.name);

        // Determine addedBy and commission logic
        const roles = user.roles || []; // Safety check
        const isMarketing = roles.includes('Marketing');
        const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (isAdmin) {
            throw new ForbiddenException('Admins must use the Property Request flow for vetting purposes.');
        }

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
        // 1. Check for duplicate PENDING requests for same property name
        const existingRequest = await this.prisma.propertyRequest.findFirst({
            where: {
                status: RequestStatus.PENDING,
                name: dto.propertyName,
            }
        });

        if (existingRequest) {
            throw new ConflictException('A pending registration request already exists for a property with this name. Please wait for admin approval.');
        }

        // 2. Check if a live property with the same name already exists
        const existingProperty = await this.prisma.property.findFirst({
            where: { name: dto.propertyName }
        });

        if (existingProperty) {
            throw new ConflictException('A property with this name already exists on the platform.');
        }

        // 3. Create or find the owner's User account immediately
        //    so they can log in and track their request status.
        const ownerRole = await this.prisma.role.findFirst({
            where: { name: 'PropertyOwner', propertyId: null }
        });
        if (!ownerRole) throw new NotFoundException('PropertyOwner role not found in system');

        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: dto.ownerEmail },
                    { phone: normalizePhone(dto.ownerPhone) }
                ]
            },
            include: { roles: { include: { role: true } } }
        });

        let owner: any = existingUser;
        let shouldUpdatePassword = false;

        if (existingUser) {
            // A user is "claimable" if they only have the 'Customer' role
            const isGuestOnly = existingUser.roles.every((ur: any) => ur.role.name === 'Customer');

            if (!existingUser.password) {
                // If user exists but has no password (OTP registered), we'll allow them to "claim" it if they only have Customer role
                shouldUpdatePassword = true;
            } else {
                const isPasswordValid = await bcrypt.compare(dto.ownerPassword, existingUser.password);
                if (!isPasswordValid && !isGuestOnly) {
                    throw new ConflictException('An account with this email or phone already exists. Please provide the correct password to link it.');
                }

                // If it was a guest-only account and password didn't match, we update to the new password provided
                if (isGuestOnly && !isPasswordValid) {
                    shouldUpdatePassword = true;
                }
            }
            // Ensure PropertyOwner role is assigned
            const hasRole = existingUser.roles.some((ur: any) => ur.role.name === 'PropertyOwner');
            const dataToUpdate: any = {};

            if (shouldUpdatePassword) {
                dataToUpdate.password = await bcrypt.hash(dto.ownerPassword, 10);
            }

            // Sync email and names from the new registration
            if (dto.ownerEmail && existingUser.email !== dto.ownerEmail) dataToUpdate.email = dto.ownerEmail;
            if (dto.ownerFirstName && existingUser.firstName !== dto.ownerFirstName) dataToUpdate.firstName = dto.ownerFirstName;
            if (dto.ownerLastName && existingUser.lastName !== dto.ownerLastName) dataToUpdate.lastName = dto.ownerLastName;

            if (!hasRole) {
                dataToUpdate.roles = {
                    create: { roleId: ownerRole.id }
                };
            }

            if (Object.keys(dataToUpdate).length > 0) {
                owner = await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: dataToUpdate
                });
            }
        } else {
            // Create new owner account with the password they chose
            const hashedPassword = await bcrypt.hash(dto.ownerPassword, 10);
            owner = await this.prisma.user.create({
                data: {
                    email: dto.ownerEmail,
                    phone: normalizePhone(dto.ownerPhone),
                    password: hashedPassword,
                    firstName: dto.ownerFirstName,
                    lastName: dto.ownerLastName,
                    isActive: true,
                    roles: { create: { roleId: ownerRole.id } }
                }
            });
        }

        // 4. Create Property Request linked to the owner
        const request = await this.prisma.propertyRequest.create({
            data: {
                name: dto.propertyName,
                location: `${dto.city}, ${dto.state}, ${dto.country}`,
                ownerEmail: dto.ownerEmail,
                ownerPhone: normalizePhone(dto.ownerPhone),
                status: RequestStatus.PENDING,
                requestedById: owner.id, // Linked to the real owner
                referredById: dto.referredById || null, // Capture referrer
                details: {
                    ...dto,
                    ownerPassword: undefined // Never store raw password
                }
            }
        });

        // Notify admins of new registration request
        await this.notificationsService.notifyPropertyRequest(request);

        return {
            id: request.id,
            status: request.status,
            ownerId: owner.id,
            message: 'Registration submitted! Your account is ready — you can log in now. Your property will be visible after admin approval.'
        };
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

    async findAllAdmin(user: any, query: any) {
        const { city, state, type, search, page = 1, limit = 10, status } = query;
        const skip = (page - 1) * limit;

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin') || roles.includes('Marketing');

        const where: Prisma.PropertyWhereInput = {
            // Default to APPROVED for "All Properties" separation, unless explicitly filtering
            status: status || PropertyStatus.APPROVED,

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
        const isMarketing = roles.includes('Marketing');
        const isPlatformAdmin = isAdmin || isMarketing;

        if (property.ownerId !== user.id && !isPlatformAdmin) {
            throw new ForbiddenException('You can only update your own properties');
        }

        // Prepare data for update, handling restricted fields
        const updateData: any = { ...data };

        // If not platform admin, prevent changing ownership/marketing/financial fields
        if (!isPlatformAdmin) {
            delete updateData.ownerId;
            delete updateData.addedById;
            delete updateData.marketingCommission;
            delete updateData.commissionStatus;
            delete updateData.isFeatured;
            delete updateData.platformCommission; // <--- Restrict this
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
    async updateStatus(id: string, user: any, status: PropertyStatus) {
        const property = await this.prisma.property.findUnique({ where: { id } });
        if (!property) throw new NotFoundException('Property not found');

        if (status === PropertyStatus.APPROVED) {
            // Maker-Checker: Approver cannot be the one who added/created the property
            // This applies if it was added by an Admin or Marketing staff.
            if (property.addedById === user.id) {
                throw new ForbiddenException(
                    'Maker-Checker Violation: You cannot approve a property that you added yourself. ' +
                    'Please request another Admin to verify.'
                );
            }
        }

        const updated = await this.prisma.property.update({
            where: { id },
            data: {
                status,
                isVerified: status === PropertyStatus.APPROVED ? true : undefined,
            },
        });

        // Notify owner of status update
        await this.notificationsService.notifyPropertyStatusUpdate(updated, status);

        return updated;
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
