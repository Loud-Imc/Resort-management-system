import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PropertyStaffService {
    constructor(private prisma: PrismaService) { }

    async addStaff(propertyId: string, userId: string, role: string, requestUserId: string) {
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
                role
            },
            include: {
                user: {
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            }
        });
    }

    async removeStaff(propertyId: string, userId: string, requestUserId: string) {
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
                    select: { id: true, firstName: true, lastName: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }
}
