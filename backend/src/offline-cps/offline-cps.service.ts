import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfflineCpDto } from './dto/create-offline-cp.dto';
import { UpdateOfflineCpDto } from './dto/update-offline-cp.dto';

@Injectable()
export class OfflineCpsService {
    constructor(private prisma: PrismaService) {}

    async findAllForProperty(propertyId: string) {
        return this.prisma.offlineCP.findMany({
            where: { propertyId, isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { bookings: true },
                },
            },
        });
    }

    async findOne(id: string) {
        const cp = await this.prisma.offlineCP.findUnique({
            where: { id },
            include: {
                bookings: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        totalAmount: true,
                        offlineCpCommission: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!cp) throw new NotFoundException('Offline Channel Partner not found');
        return cp;
    }

    async create(dto: CreateOfflineCpDto) {
        const existing = await this.prisma.offlineCP.findUnique({
            where: {
                propertyId_name: {
                    propertyId: dto.propertyId,
                    name: dto.name.trim(),
                },
            },
        });

        if (existing) {
            if (!existing.isActive) {
                return this.prisma.offlineCP.update({
                    where: { id: existing.id },
                    data: { ...dto, name: dto.name.trim(), isActive: true },
                });
            }
            return existing;
        }

        return this.prisma.offlineCP.create({
            data: {
                ...dto,
                name: dto.name.trim(),
            },
        });
    }

    async update(id: string, dto: UpdateOfflineCpDto) {
        await this.findOne(id);
        return this.prisma.offlineCP.update({
            where: { id },
            data: {
                ...dto,
                name: dto.name ? dto.name.trim() : undefined,
            },
        });
    }

    async remove(id: string) {
        await this.findOne(id);
        return this.prisma.offlineCP.update({
            where: { id },
            data: { isActive: false },
        });
    }
}
