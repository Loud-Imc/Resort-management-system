import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePartnerLevelDto, UpdatePartnerLevelDto, CreateRewardDto, UpdateRewardDto } from './dto/marketing-items.dto';

@Injectable()
export class MarketingService {
    constructor(private prisma: PrismaService) { }

    async getStats(userId: string) {
        // Find properties added by user or requested/referred by user
        const addedProperties = await this.prisma.property.findMany({
            where: {
                OR: [
                    { addedById: userId },
                    { propertyRequest: { requestedById: userId } },
                    { propertyRequest: { referredById: userId } }
                ]
            },
            select: { id: true }
        });

        const totalProperties = addedProperties.length;

        // Find bookings associated with this marketing staff
        const bookings = await this.prisma.booking.findMany({
            where: { marketingStaffId: userId },
            select: { marketingCommission: true, marketingPayoutStatus: true }
        });

        const totalEarnings = bookings
            .filter(b => b.marketingPayoutStatus === 'PAID')
            .reduce((sum, b) => sum + Number(b.marketingCommission || 0), 0);

        const pendingEarnings = bookings
            .filter(b => b.marketingPayoutStatus === 'PENDING')
            .reduce((sum, b) => sum + Number(b.marketingCommission || 0), 0);

        return {
            totalProperties,
            totalEarnings,
            pendingEarnings,
        };
    }

    async getMyProperties(userId: string) {
        const properties = await this.prisma.property.findMany({
            where: {
                OR: [
                    { addedById: userId },
                    { propertyRequest: { requestedById: userId } },
                    { propertyRequest: { referredById: userId } }
                ]
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                state: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                images: true,
                bookings: {
                    where: { marketingStaffId: userId },
                    select: {
                        marketingCommission: true,
                        marketingPayoutStatus: true
                    }
                }
            }
        });

        return properties.map(p => {
            const bookings = p.bookings || [];
            const earnedCommission = bookings.reduce((sum, b) => sum + Number(b.marketingCommission || 0), 0);
            
            const pendingCount = bookings.filter(b => b.marketingPayoutStatus === 'PENDING').length;
            const commissionStatus = pendingCount > 0 ? 'PENDING' : (bookings.length > 0 ? 'PAID' : 'NONE');

            const { bookings: _, ...rest } = p;
            return {
                ...rest,
                marketingCommission: earnedCommission,
                commissionStatus
            };
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

