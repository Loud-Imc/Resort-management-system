import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

        const user = await this.prisma.user.create({
            data: createUserDto,
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

    async createWithRoles(createUserDto: CreateUserWithRoleDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        try {
            const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
            const { roleIds, ...userData } = createUserDto;

            // Prisma transaction not strictly needed if valid, but good for integrity
            // Simple create is fine
            const user = await this.prisma.user.create({
                data: {
                    ...userData,
                    password: hashedPassword,
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

            const { password, ...result } = user;
            return result;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
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

    async findAll() {
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
