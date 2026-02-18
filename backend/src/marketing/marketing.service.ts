import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerLevelDto, UpdatePartnerLevelDto, CreateRewardDto, UpdateRewardDto } from './dto/marketing-items.dto';

@Injectable()
export class MarketingService {
    constructor(private prisma: PrismaService) { }

    async getStats(userId: string) {
        // Aggregate stats for properties added by this user
        const addedProperties = await this.prisma.property.findMany({
            where: { addedById: userId },
            select: {
                id: true,
                marketingCommission: true,
                commissionStatus: true,
            },
        });

        const totalProperties = addedProperties.length;
        const totalEarnings = addedProperties
            .filter(p => p.commissionStatus === 'PAID')
            .reduce((sum, p) => sum + Number(p.marketingCommission), 0);

        const pendingEarnings = addedProperties
            .filter(p => p.commissionStatus === 'PENDING')
            .reduce((sum, p) => sum + Number(p.marketingCommission), 0);

        return {
            totalProperties,
            totalEarnings,
            pendingEarnings,
        };
    }

    async getMyProperties(userId: string) {
        return this.prisma.property.findMany({
            where: { addedById: userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                state: true,
                isActive: true,
                isVerified: true,
                marketingCommission: true,
                commissionStatus: true,
                createdAt: true,
                images: true
            }
        });
    }

    // ============================================
    // PARTNER LEVELS CRUD
    // ============================================

    async findAllLevels() {
        return this.prisma.partnerLevel.findMany({
            orderBy: { minPoints: 'asc' },
        });
    }

    async createLevel(dto: CreatePartnerLevelDto) {
        return this.prisma.partnerLevel.create({
            data: dto,
        });
    }

    async updateLevel(id: string, dto: UpdatePartnerLevelDto) {
        return this.prisma.partnerLevel.update({
            where: { id },
            data: dto,
        });
    }

    async deleteLevel(id: string) {
        return this.prisma.partnerLevel.delete({
            where: { id },
        });
    }

    // ============================================
    // REWARDS CRUD
    // ============================================

    async findAllRewards(onlyActive = false) {
        return this.prisma.reward.findMany({
            where: onlyActive ? { isActive: true } : {},
            orderBy: { pointCost: 'asc' },
        });
    }

    async createReward(dto: CreateRewardDto) {
        return this.prisma.reward.create({
            data: dto,
        });
    }

    async updateReward(id: string, dto: UpdateRewardDto) {
        return this.prisma.reward.update({
            where: { id },
            data: dto,
        });
    }

    async deleteReward(id: string) {
        return this.prisma.reward.delete({
            where: { id },
        });
    }
}

