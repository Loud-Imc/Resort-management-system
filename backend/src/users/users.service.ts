import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateUserWithRoleDto } from './dto/create-user-with-role.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(private prisma: PrismaService) { }

    async create(createUserDto: CreateUserDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        const customerRole = await this.prisma.role.findFirst({
            where: { name: 'Customer' },
        });

        const user = await this.prisma.user.create({
            data: {
                ...createUserDto,
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
            },
        });

        return user;
    }

    async createWithRoles(currentUser: any, createUserDto: CreateUserWithRoleDto) {
        const { roleIds, password, ...userData } = createUserDto;

        // Security: Validate role assignment
        const currentUserRoles = currentUser.roles || [];
        const isGlobalAdmin = currentUserRoles.includes('SuperAdmin') || currentUserRoles.includes('Admin');

        if (!isGlobalAdmin && roleIds && roleIds.length > 0) {
            const manageableRoleNames = this.getManageableRoles(currentUserRoles);

            const requestedRoles = await this.prisma.role.findMany({
                where: { id: { in: roleIds } }
            });
            const requestedRoleNames = requestedRoles.map(r => r.name);

            const isAuthorized = requestedRoleNames.every(name => manageableRoleNames.includes(name));
            if (!isAuthorized) {
                throw new ForbiddenException('You are not authorized to assign one or more of these roles');
            }
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        if (createUserDto.phone) {
            const existingPhone = await this.prisma.user.findUnique({
                where: { phone: createUserDto.phone },
            });
            if (existingPhone) {
                throw new ConflictException('Phone number already exists');
            }
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await this.prisma.user.create({
                data: {
                    ...userData,
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
        if (userData.phone && userData.phone !== user.phone) {
            const existingPhone = await this.prisma.user.findUnique({
                where: { phone: userData.phone },
            });
            if (existingPhone) {
                throw new ConflictException('Phone number already exists');
            }
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

    async findAll(user: any, params?: { propertyId?: string, isStaffOnly?: string }) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
        const isPropertyOwner = roles.includes('PropertyOwner');

        const where: any = {};

        if (params?.isStaffOnly === 'true') {
            // Filter users who have at least one role in PROPERTY category
            where.roles = {
                some: {
                    role: {
                        category: 'PROPERTY'
                    }
                }
            };

            // If it's a staff search, we relax the scope for Property Owners
            // to allow them to find users created by Admins or other Owners
            if (isPropertyOwner && !isGlobalAdmin) {
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
            },
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string) {
        return this.prisma.user.findUnique({
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
            },
        });
    }

    async findByPhone(phone: string) {
        return this.prisma.user.findUnique({
            where: { phone },
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
    }

    async createWithPhone(phone: string) {
        const customerRole = await this.prisma.role.findFirst({
            where: { name: 'Customer' },
        });

        // For phone-only registration, we generate a placeholder email
        // and a random password or just rely on OTP for future logins.
        const placeholderEmail = `user_${Date.now()}@placeholder.com`;
        const randomPassword = Math.random().toString(36).slice(-10);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        return this.prisma.user.create({
            data: {
                phone,
                email: placeholderEmail,
                password: hashedPassword,
                firstName: 'Phone',
                lastName: 'User',
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
}
