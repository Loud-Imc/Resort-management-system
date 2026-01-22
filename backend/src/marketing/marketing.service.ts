import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}
