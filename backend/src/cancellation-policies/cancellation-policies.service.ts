import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCancellationPolicyDto, UpdateCancellationPolicyDto } from './dto/cancellation-policy.dto';

@Injectable()
export class CancellationPoliciesService {
    constructor(private prisma: PrismaService) { }

    async create(dto: CreateCancellationPolicyDto, requestUser?: any) {
        // Verify the requesting user owns or staffs this property
        if (requestUser) {
            const property = await this.prisma.property.findUnique({
                where: { id: dto.propertyId },
                include: { staff: true },
            });
            if (!property) throw new NotFoundException('Property not found');
            const roles: string[] = requestUser.roles || [];
            const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
            const isOwner = property.ownerId === requestUser.id;
            const isStaff = property.staff.some((s) => s.userId === requestUser.id);
            if (!isAdmin && !isOwner && !isStaff) {
                throw new ForbiddenException('You do not have permission to manage policies for this property');
            }
        }

        // If this is set as default, unset other defaults for the property
        if (dto.isDefault) {
            await this.prisma.cancellationPolicy.updateMany({
                where: { propertyId: dto.propertyId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const policy = await this.prisma.cancellationPolicy.create({
            data: {
                name: dto.name,
                description: dto.description,
                propertyId: dto.propertyId,
                rules: dto.rules as any,
                isDefault: dto.isDefault ?? false,
            },
        });

        // If it's default, update the property record as well
        if (dto.isDefault) {
            await this.prisma.property.update({
                where: { id: dto.propertyId },
                data: { defaultCancellationPolicyId: policy.id },
            });
        }

        return policy;
    }

    async findAll(propertyId: string) {
        return this.prisma.cancellationPolicy.findMany({
            where: { propertyId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const policy = await this.prisma.cancellationPolicy.findUnique({
            where: { id },
            include: { property: true },
        });

        if (!policy) {
            throw new NotFoundException('Cancellation policy not found');
        }

        return policy;
    }

    async update(id: string, dto: UpdateCancellationPolicyDto, requestUser?: any) {
        const existing = await this.findOne(id);

        // Verify the requesting user owns or staffs this property
        if (requestUser) {
            const property = await this.prisma.property.findUnique({
                where: { id: existing.propertyId },
                include: { staff: true },
            });
            if (property) {
                const roles: string[] = requestUser.roles || [];
                const isAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
                const isOwner = property.ownerId === requestUser.id;
                const isStaff = property.staff.some((s) => s.userId === requestUser.id);
                if (!isAdmin && !isOwner && !isStaff) {
                    throw new ForbiddenException('You do not have permission to manage policies for this property');
                }
            }
        }

        if (dto.isDefault && !existing.isDefault) {
            await this.prisma.cancellationPolicy.updateMany({
                where: { propertyId: existing.propertyId, isDefault: true },
                data: { isDefault: false },
            });
        }

        const updated = await this.prisma.cancellationPolicy.update({
            where: { id },
            data: {
                ...dto,
                rules: dto.rules ? (dto.rules as any) : undefined,
            },
        });

        if (dto.isDefault) {
            await this.prisma.property.update({
                where: { id: existing.propertyId },
                data: { defaultCancellationPolicyId: updated.id },
            });
        }

        return updated;
    }

    async remove(id: string) {
        const policy = await this.findOne(id);

        // Cannot delete if it's the default
        if (policy.isDefault) {
            throw new BadRequestException('Cannot delete the default cancellation policy. Set another policy as default first.');
        }

        return this.prisma.cancellationPolicy.delete({
            where: { id },
        });
    }
}
