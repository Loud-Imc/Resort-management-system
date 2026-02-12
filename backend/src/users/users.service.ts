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

        const customerRole = await this.prisma.role.findUnique({
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
                    commissionPercentage: userData.commissionPercentage,
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
            return ['Manager', 'Staff'];
        }
        if (userRoles.includes('EventOrganizer')) {
            return ['VerificationStaff'];
        }
        if (userRoles.includes('Marketing')) {
            return ['PropertyOwner'];
        }
        return [];
    }

    async update(id: string, updateUserDto: UpdateUserDto) {
        const user = await this.prisma.user.findUnique({ where: { id } });
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { roleIds, password, ...userData } = updateUserDto;
        const updateData: any = { ...userData };

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

    async findAll(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (isGlobalAdmin) {
            return this.prisma.user.findMany({
                include: {
                    roles: {
                        include: {
                            role: true,
                        },
                    },
                },
            });
        }

        // For Property Owners or Managers, only show staff associated with their properties
        // OR users created by them
        return this.prisma.user.findMany({
            where: {
                OR: [
                    {
                        propertyStaff: {
                            some: {
                                property: {
                                    ownerId: user.id,
                                    ...(propertyId && { id: propertyId }),
                                }
                            }
                        }
                    },
                    { createdById: user.id }
                ]
            },
            include: {
                roles: {
                    include: {
                        role: true,
                    },
                },
            },
        });
    }

    async findOne(id: string) {
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
