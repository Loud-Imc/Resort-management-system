import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertyStaffService {
    constructor(private prisma: PrismaService) { }

    async addStaff(propertyId: string, userId: string, roleId: string, requestUserId: string) {
        // Only SuperAdmin or PropertyOwner can add staff
        const property = await this.prisma.property.findUnique({
            where: { id: propertyId }
        });

        if (!property) throw new NotFoundException('Property not found');

        const requestUser = await this.prisma.user.findUnique({
            where: { id: requestUserId },
            include: { roles: { include: { role: true } } }
        });

        if (!requestUser) throw new ForbiddenException('User session invalid');

        const isSuperAdmin = requestUser.roles.some(r => r.role.name === 'SuperAdmin' || r.role.name === 'Admin');
        if (!isSuperAdmin && property.ownerId !== requestUserId) {
            throw new ForbiddenException('Only property owners or admins can manage staff');
        }

        // Verify the role exists
        const role = await this.prisma.role.findUnique({
            where: { id: roleId }
        });
        if (!role) throw new NotFoundException('Role not found');

        // Check if user already exists as staff
        const existingStaff = await this.prisma.propertyStaff.findUnique({
            where: {
                propertyId_userId: { propertyId, userId }
            }
        });

        if (existingStaff) throw new ConflictException('User is already assigned as staff for this property');

        return this.prisma.propertyStaff.create({
            data: {
                propertyId,
                userId,
                roleId
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                role: true
            }
        });
    }

    async updateStaff(propertyId: string, userId: string, data: { roleId?: string; firstName?: string; lastName?: string; phone?: string; email?: string }, requestUserId: string) {
        const staff = await this.prisma.propertyStaff.findUnique({
            where: { propertyId_userId: { propertyId, userId } },
            include: { user: true }
        });

        if (!staff) throw new NotFoundException('Staff member not found');

        // Auth check (same as addStaff)
        const property = await this.prisma.property.findUnique({ where: { id: propertyId } });
        if (!property) throw new NotFoundException('Property not found');
        const requestUser = await this.prisma.user.findUnique({
            where: { id: requestUserId },
            include: { roles: { include: { role: true } } }
        });
        if (!requestUser) throw new ForbiddenException('User session invalid');

        const isSuperAdmin = requestUser.roles?.some(r => r.role.name === 'SuperAdmin' || r.role.name === 'Admin');
        if (!isSuperAdmin && property.ownerId !== requestUserId) {
            throw new ForbiddenException('Only property owners or admins can manage staff');
        }

        // Email uniqueness check
        if (data.email && data.email !== staff.user.email) {
            const existingUser = await this.prisma.user.findUnique({
                where: { email: data.email }
            });
            if (existingUser) throw new ConflictException('Email is already in use by another account');
        }

        return this.prisma.$transaction(async (tx) => {
            // 1. Update user details if provided
            if (data.firstName || data.lastName || data.phone !== undefined || data.email) {
                await tx.user.update({
                    where: { id: userId },
                    data: {
                        firstName: data.firstName,
                        lastName: data.lastName,
                        phone: data.phone,
                        email: data.email
                    }
                });
            }

            // 2. Handle role update if provided
            if (data.roleId && data.roleId !== staff.roleId) {
                const newRole = await this.prisma.role.findUnique({ where: { id: data.roleId } });
                if (!newRole) throw new NotFoundException('Role not found');

                await tx.propertyStaff.update({
                    where: { propertyId_userId: { propertyId, userId } },
                    data: { roleId: data.roleId }
                });
            }
            // Return updated staff record
            return tx.propertyStaff.findUnique({
                where: { propertyId_userId: { propertyId, userId } },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
                    role: true
                }
            });
        });
    }

    async removeStaff(propertyId: string, userId: string, requestUserId: string) {
        const staff = await this.prisma.propertyStaff.findUnique({
            where: { propertyId_userId: { propertyId, userId } }
        });

        if (!staff) throw new NotFoundException('Staff member not found');

        const property = await this.prisma.property.findUnique({
            where: { id: propertyId }
        });

        if (!property) throw new NotFoundException('Property not found');

        const requestUser = await this.prisma.user.findUnique({
            where: { id: requestUserId },
            include: { roles: { include: { role: true } } }
        });

        if (!requestUser) throw new ForbiddenException('User session invalid');

        const isSuperAdmin = requestUser.roles.some(r => r.role.name === 'SuperAdmin' || r.role.name === 'Admin');
        if (!isSuperAdmin && property.ownerId !== requestUserId) {
            throw new ForbiddenException('Only property owners or admins can manage staff');
        }

        return this.prisma.propertyStaff.delete({
            where: {
                propertyId_userId: { propertyId, userId }
            }
        });
    }

    async getPropertyStaff(propertyId: string) {
        return this.prisma.propertyStaff.findMany({
            where: { propertyId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true, phone: true }
                },
                role: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
