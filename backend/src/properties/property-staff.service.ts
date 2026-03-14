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

        // Execute in transaction for consistency
        return this.prisma.$transaction(async (tx) => {
            // Assign role to user if not already assigned
            await tx.userRole.upsert({
                where: { userId_roleId: { userId, roleId } },
                create: { userId, roleId },
                update: {}
            });

            return tx.propertyStaff.create({
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
        });
    }

    async updateStaff(propertyId: string, userId: string, roleId: string, requestUserId: string) {
        const staff = await this.prisma.propertyStaff.findUnique({
            where: { propertyId_userId: { propertyId, userId } }
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

        const newRole = await this.prisma.role.findUnique({ where: { id: roleId } });
        if (!newRole) throw new NotFoundException('Role not found');

        return this.prisma.$transaction(async (tx) => {
            // Remove old role from UserRoles
            if ((staff as any).roleId) {
                await tx.userRole.delete({
                    where: { userId_roleId: { userId, roleId: (staff as any).roleId } }
                }).catch(() => null); // Ignore if already missing
            }      // Assign new role
            await tx.userRole.upsert({
                where: { userId_roleId: { userId, roleId } },
                create: { userId, roleId },
                update: {}
            });

            // Update PropertyStaff record
            return tx.propertyStaff.update({
                where: { propertyId_userId: { propertyId, userId } },
                data: { roleId },
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
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

        return this.prisma.$transaction(async (tx) => {
            // Remove the role assignment from UserRoles as well
            await tx.userRole.delete({
                where: { userId_roleId: { userId, roleId: staff.roleId } }
            }).catch(() => null);

            return tx.propertyStaff.delete({
                where: {
                    propertyId_userId: { propertyId, userId }
                }
            });
        });
    }

    async getPropertyStaff(propertyId: string) {
        return this.prisma.propertyStaff.findMany({
            where: { propertyId },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                },
                role: true
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
