import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithRoleDto } from './dto/create-user-with-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { normalizePhone } from '../common/utils/phone';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto & { roleIds?: string[] }) {
        const { roleIds, ...userData } = createUserDto;
        const existingUser = await this.prisma.user.findUnique({
            where: { email: userData.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const customerRole = await this.prisma.role.findFirst({
            where: { name: 'Customer' },
        });

        const user = await this.prisma.user.create({
            data: {
                ...userData,
                phone: userData.phone ? normalizePhone(userData.phone) : undefined,
                roles: {
                    create: roleIds && roleIds.length > 0
                        ? roleIds.map(roleId => ({ role: { connect: { id: roleId } } }))
                        : (customerRole ? [{ role: { connect: { id: customerRole.id } } }] : [])
                },
            },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        return user;
    }

    async createWithRoles(currentUser: any, createUserDto: CreateUserWithRoleDto) {
        const { roleIds, password, ...userData } = createUserDto;

        // Security: Validate role assignment
        const currentUserRoles = currentUser.roles || [];
        const isSuperAdmin = currentUserRoles.includes('SuperAdmin');
        const isGlobalAdmin = isSuperAdmin || currentUserRoles.includes('Admin');

        if (roleIds && roleIds.length > 0) {
            const requestedRoles = await this.prisma.role.findMany({
                where: { id: { in: roleIds } }
            });
            const requestedRoleNames = requestedRoles.map(r => r.name);

            // 1. Only SuperAdmin can assign SuperAdmin role
            if (requestedRoleNames.includes('SuperAdmin') && !isSuperAdmin) {
                throw new ForbiddenException('Only SuperAdmins can assign the SuperAdmin role');
            }

            // 2. Authorization check for non-global admins
            if (!isGlobalAdmin) {
                const isAuthorized = this.isAuthorizedToAssignRoles(currentUser, requestedRoles);
                if (!isAuthorized) {
                    throw new ForbiddenException('You are not authorized to assign one or more of these roles');
                }
            }
        }

        const normalizedPhone = createUserDto.phone ? normalizePhone(createUserDto.phone) : undefined;
        const existingUser = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { email: createUserDto.email },
                    ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
                ]
            },
            include: { roles: true }
        });

        if (existingUser) {
            // If user exists, we only need to add missing roles
            const currentRoleIds = existingUser.roles.map(r => r.roleId);
            const rolesToAdd = roleIds?.filter(rid => !currentRoleIds.includes(rid)) || [];

            if (rolesToAdd.length === 0) {
                const { password: _, ...result } = existingUser as any;
                return result;
            }

            return this.prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    roles: {
                        create: rolesToAdd.map(roleId => ({
                            role: { connect: { id: roleId } }
                        }))
                    }
                },
                include: { roles: { include: { role: true } } }
            });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await this.prisma.user.create({
                data: {
                    ...userData,
                    phone: normalizedPhone,
                    password: hashedPassword,
                    createdById: currentUser.id,
                    roles: roleIds && roleIds.length > 0 ? {
                        create: roleIds.map(roleId => ({
                            role: { connect: { id: roleId } }
                        }))
                    } : undefined,
                },
                include: {
                    roles: {
                        include: { role: true }
                    }
                }
            });

            const { password: _, ...result } = user;
            return result;
        } catch (error) {
            console.error('Error creating user:', error);
            if (error instanceof ConflictException || error instanceof ForbiddenException) throw error;
            throw error;
        }
    }

    private isAuthorizedToAssignRoles(currentUser: any, requestedRoles: any[]): boolean {
        const currentUserRoles = currentUser.roles || [];

        // Property Owner logic
        if (currentUserRoles.includes('PropertyOwner')) {
            const ownedPropertyIds = (currentUser.ownedProperties || []).map((p: any) => p.id);
            const staffPropertyIds = (currentUser.propertyStaff || []).map((s: any) => s.propertyId);
            const allManagedPropertyIds = [...new Set([...ownedPropertyIds, ...staffPropertyIds])];

            return requestedRoles.every(role => {
                // Allow assigning standard property/event roles (templates)
                if (role.isSystem && (role.category === 'PROPERTY' || role.category === 'EVENT')) {
                    // But block assigning high-level system roles
                    if (['SuperAdmin', 'Admin', 'PropertyOwner', 'Marketing', 'ChannelPartner'].includes(role.name)) {
                        return false;
                    }
                    return true;
                }
                // Allow assigning roles specific to their property
                if (role.propertyId && allManagedPropertyIds.includes(role.propertyId)) {
                    return true;
                }
                return false;
            });
        }

        // Fallback to legacy hardcoded names for other roles (EventOrganizer, Marketing)
        const manageableRoleNames = this.getManageableRoles(currentUserRoles);
        const requestedRoleNames = requestedRoles.map(r => r.name);
        return requestedRoleNames.every(name => manageableRoleNames.includes(name));
    }

    private getManageableRoles(userRoles: string[]): string[] {
        if (userRoles.includes('PropertyOwner')) {
            return ['Manager', 'Staff', 'Receptionist', 'Housekeeping', 'Kitchen', 'Security', 'Other'];
        }
        if (userRoles.includes('EventOrganizer')) {
            return ['VerificationStaff'];
        }
        if (userRoles.includes('Marketing')) {
            return ['PropertyOwner'];
        }
        return [];
    }

    private async checkGuestAccessScope(targetUserId: string, requestUser: any): Promise<boolean> {
        if (!requestUser) return false;

        // 1. User accessing their own profile
        if (targetUserId === requestUser.id) return true;

        // 2. Global Admins
        const roles = requestUser.roles || [];
        if (roles.includes('SuperAdmin') || roles.includes('Admin')) return true;

        // 3. Check if target user has bookings at a property where the request user is staff/owner
        const hasAccess = await this.prisma.booking.findFirst({
            where: {
                userId: targetUserId,
                property: {
                    OR: [
                        { ownerId: requestUser.id },
                        { staff: { some: { userId: requestUser.id } } }
                    ]
                }
            }
        });

        return !!hasAccess;
    }

    async update(id: string, updateUserDto: UpdateUserDto, requestUser?: any) {
        if (requestUser) {
            const hasAccess = await this.checkGuestAccessScope(id, requestUser);
            if (!hasAccess) {
                throw new ForbiddenException('You do not have permission to update this user profile');
            }
        }
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { roleIds, password, ...userData } = updateUserDto;

        // Security: Validate role assignment
        if (roleIds && roleIds.length > 0 && requestUser) {
            const currentUserRoles = requestUser.roles || [];
            const isSuperAdmin = currentUserRoles.includes('SuperAdmin');
            const isGlobalAdmin = isSuperAdmin || currentUserRoles.includes('Admin');

            // 1. Block self-promotion (Restricted users cannot change their own roles)
            if (id === requestUser.id && !isSuperAdmin) {
                throw new ForbiddenException('You cannot change your own roles. Please contact another Admin.');
            }

            const requestedRoles = await this.prisma.role.findMany({
                where: { id: { in: roleIds } }
            });
            const requestedRoleNames = requestedRoles.map(r => r.name);

            // 2. Only SuperAdmin can assign SuperAdmin role
            if (requestedRoleNames.includes('SuperAdmin') && !isSuperAdmin) {
                throw new ForbiddenException('Only SuperAdmins can assign the SuperAdmin role');
            }

            // 3. Authorization check for non-global admins
            if (!isGlobalAdmin) {
                const isAuthorized = this.isAuthorizedToAssignRoles(requestUser, requestedRoles);
                if (!isAuthorized) {
                    throw new ForbiddenException('You are not authorized to assign one or more of these roles');
                }
            }
        }

        const updateData: any = { ...userData };

        // Check if email is being changed and if it already exists
        if (userData.email && userData.email !== user.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: userData.email },
            });
            if (existingEmail) {
                throw new ConflictException('Email already exists');
            }
        }

        // Check if phone is being changed and if it already exists
        if (userData.phone) {
            const normalizedPhone = normalizePhone(userData.phone);
            if (normalizedPhone !== user.phone) {
                const existingPhone = await this.prisma.user.findUnique({
                    where: { phone: normalizedPhone },
                });
                if (existingPhone) {
                    throw new ConflictException('Phone number already exists');
                }
            }
            updateData.phone = normalizedPhone;
        }

        if (password) {
            updateData.password = await bcrypt.hash(password, 10);
        }

        return this.prisma.user.update({
            where: { id },
            data: {
                ...updateData,
                roles: roleIds ? {
                    deleteMany: {},
                    create: roleIds.map(roleId => ({
                        role: { connect: { id: roleId } }
                    }))
                } : undefined
            },
            include: {
                roles: {
                    include: { role: true }
                }
            }
        });
    }

    async findAll(user: any, params?: { propertyId?: string, isStaffOnly?: string, search?: string }) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
        const isPropertyOwner = roles.includes('PropertyOwner');

        const where: any = {};

        if (params?.search) {
            where.OR = [
                { email: { contains: params.search, mode: 'insensitive' } },
                { firstName: { contains: params.search, mode: 'insensitive' } },
                { lastName: { contains: params.search, mode: 'insensitive' } },
                { phone: { contains: params.search, mode: 'insensitive' } },
            ];
        }

        if (params?.isStaffOnly === 'true') {
            // For onboarding staff, we want to find users who are NOT yet admins
            // (or maybe any user depending on business rules).
            // Let's exclude users with SuperAdmin/Admin roles to prevent accidental onboarding of global admins
            where.roles = {
                none: {
                    role: {
                        name: { in: ['SuperAdmin', 'Admin'] }
                    }
                }
            };

            // If it's a staff search, we relax the scope to allow finding users
            // but we MUST isolate it to the current owner's properties to prevent seeing users from other orgs.
            if (isPropertyOwner || roles.includes('Manager')) {
                const ownedPropertyIds = (user.ownedProperties || []).map((p: any) => p.id);
                // Also get IDs from properties where user is staff
                const staffPropertyIds = (user.propertyStaff || []).map((s: any) => s.propertyId);
                const allManagedPropertyIds = [...new Set([...ownedPropertyIds, ...staffPropertyIds])];

                // Add restriction: Only users who are ALREADY staff or owner of my properties
                // OR users who I created myself.
                where.OR = [
                    ...(where.OR || []),
                    {
                        propertyStaff: {
                            some: {
                                propertyId: { in: allManagedPropertyIds }
                            }
                        }
                    },
                    { createdById: user.id }
                ];

                return this.prisma.user.findMany({
                    where,
                    include: {
                        roles: {
                            include: {
                                role: true,
                            },
                        },
                    },
                });
            }
        }

        if (isGlobalAdmin) {
            let adminWhere: any = { ...where };

            if (params?.propertyId) {
                adminWhere.OR = [
                    {
                        propertyStaff: {
                            some: { propertyId: params.propertyId }
                        }
                    },
                    {
                        bookings: {
                            some: { propertyId: params.propertyId }
                        }
                    }
                ];
            }

            return this.prisma.user.findMany({
                where: adminWhere,
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });
        }

        // For Property Owners or Managers
        where.OR = [
            {
                propertyStaff: {
                    some: {
                        property: {
                            OR: [
                                { ownerId: user.id },
                                { staff: { some: { userId: user.id } } }
                            ],
                            ...(params?.propertyId && { id: params.propertyId }),
                        }
                    }
                }
            },
            {
                bookings: {
                    some: {
                        property: {
                            OR: [
                                { ownerId: user.id },
                                { staff: { some: { userId: user.id } } }
                            ],
                            ...(params?.propertyId && { id: params.propertyId }),
                        }
                    }
                }
            },
            { createdById: user.id }
        ];

        return this.prisma.user.findMany({
            where,
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
    }

    async findOne(id: string, requestUser?: any) {
        if (requestUser) {
            const hasAccess = await this.checkGuestAccessScope(id, requestUser);
            if (!hasAccess) {
                throw new ForbiddenException('You do not have permission to view this user profile');
            }
        }
        const user = await this.prisma.user.findUnique({
            where: { id },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
                bookings: {
                    include: {
                        roomType: true,
                    },
                    orderBy: {
                        createdAt: 'desc',
                    }
                },
                ownedProperties: true,
                propertyStaff: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    /**
     * Optimized lookup for JWT Strategy to avoid heavy relationship loading
     */
    async findByIdForAuth(id: string) {
        return this.prisma.user.findUnique({
            where: { id },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
                ownedProperties: { select: { id: true } },
                propertyStaff: { select: { propertyId: true } },
            },
        });
    }

    async findByEmail(email: string) {
        console.log(`[UsersService] Searching for user by email: ${email}`);
        const user = await this.prisma.user.findUnique({
            where: { email },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
                propertyStaff: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        console.log(`[UsersService] findByEmail result for ${email}: ${user ? 'FOUND' : 'NOT FOUND'}`);
        return user;
    }

    async findByPhone(phone: string) {
        console.log(`[UsersService] Searching for user by phone: ${phone}`);
        const normalizedPhone = normalizePhone(phone);
        const user = await this.prisma.user.findFirst({
            where: { phone: normalizedPhone },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
                propertyStaff: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        console.log(`[UsersService] findByPhone result for ${phone}: ${user ? 'FOUND' : 'NOT FOUND'}`);
        return user;
    }

    async createWithPhone(phone: string) {
        const customerRole = await this.prisma.role.findFirst({
            where: { name: 'Customer' },
        });

        const normalizedPhone = normalizePhone(phone);

        // For phone-only registration, we keep names and email as null
        // until they are provided during the first booking or profile update.
        return this.prisma.user.create({
            data: {
                phone: normalizedPhone,
                email: null,
                password: null,
                firstName: null,
                lastName: null,
                roles: customerRole ? {
                    create: {
                        role: { connect: { id: customerRole.id } }
                    }
                } : undefined,
            },
            include: {
                roles: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
                propertyStaff: {
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    include: {
                                        permission: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
    }

    async assignRole(userId: string, roleId: string) {
        return this.prisma.userRole.create({
            data: {
                userId,
                roleId,
            },
        });
    }

    async removeRole(userId: string, roleId: string) {
        return this.prisma.userRole.delete({
            where: {
                userId_roleId: {
                    userId,
                    roleId,
                },
            },
        });
    }

    async checkUserRelations(userId: string) {
        const [
            ownedProperties,
            bookings,
            agentBookings,
            propertyStaff,
            eventBookings,
            createdEvents,
            channelPartner,
            propertyRequests,
            manualPayments,
            adjustments,
            refunds,
            reviews
        ] = await Promise.all([
            this.prisma.property.count({ where: { ownerId: userId } }),
            this.prisma.booking.count({ where: { userId: userId } }),
            this.prisma.booking.count({ where: { agentId: userId } }),
            this.prisma.propertyStaff.count({ where: { userId: userId } }),
            this.prisma.eventBooking.count({ where: { userId: userId } }),
            this.prisma.event.count({ where: { createdById: userId } }),
            this.prisma.channelPartner.count({ where: { userId: userId } }),
            this.prisma.propertyRequest.count({ where: { requestedById: userId } }),
            this.prisma.manualPaymentRequest.count({ where: { requestedById: userId } }),
            this.prisma.financialAdjustmentRequest.count({ where: { requestedById: userId } }),
            this.prisma.refundRequest.count({ where: { requestedById: userId } }),
            this.prisma.review.count({ where: { userId: userId } }),
        ]);

        const dependencies: string[] = [];
        if (ownedProperties > 0) dependencies.push(`${ownedProperties} owned properties`);
        if (bookings > 0) dependencies.push(`${bookings} bookings`);
        if (agentBookings > 0) dependencies.push(`${agentBookings} agent bookings`);
        if (propertyStaff > 0) dependencies.push(`${propertyStaff} staff assignments`);
        if (eventBookings > 0) dependencies.push(`${eventBookings} event bookings`);
        if (createdEvents > 0) dependencies.push(`${createdEvents} created events`);
        if (channelPartner > 0) dependencies.push(`channel partner profile`);
        if (propertyRequests > 0) dependencies.push(`${propertyRequests} property requests`);
        if (manualPayments > 0) dependencies.push(`${manualPayments} manual payment requests`);
        if (adjustments > 0) dependencies.push(`${adjustments} financial adjustments`);
        if (refunds > 0) dependencies.push(`${refunds} refund requests`);
        if (reviews > 0) dependencies.push(`${reviews} reviews`);

        return dependencies;
    }

    async deleteUserAccount(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                roles: {
                    include: {
                        role: true
                    }
                }
            }
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Check for dependencies
        const dependencies = await this.checkUserRelations(userId);
        if (dependencies.length > 0) {
            throw new BadRequestException(
                `Cannot delete user account. The following related records must be removed first: ${dependencies.join(', ')}.`
            );
        }

        // Perform hard delete if no dependencies
        return this.prisma.$transaction(async (tx) => {
            // Remove roles (not part of the dependency check as they are internal)
            await tx.userRole.deleteMany({
                where: { userId }
            });

            // Delete notifications
            await tx.notification.deleteMany({
                where: { userId }
            });

            // Delete audit logs
            await tx.auditLog.deleteMany({
                where: { userId }
            });

            // Finally, delete the user
            return tx.user.delete({
                where: { id: userId }
            });
        });
    }
}
