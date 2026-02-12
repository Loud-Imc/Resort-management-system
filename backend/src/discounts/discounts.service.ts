import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, CreateOfferDto, UpdateOfferDto } from './dto/discounts.dto';

@Injectable()
export class DiscountsService {
    constructor(private prisma: PrismaService) { }

    // ============================================
    // COUPON MANAGEMENT (Admin Only)
    // ============================================

    async createCoupon(data: CreateCouponDto) {
        return this.prisma.coupon.create({
            data: {
                ...data,
                validFrom: new Date(data.validFrom),
                validUntil: new Date(data.validUntil),
            }
        });
    }

    async findAllCoupons() {
        return this.prisma.coupon.findMany({
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOneCoupon(id: string) {
        const coupon = await this.prisma.coupon.findUnique({ where: { id } });
        if (!coupon) throw new NotFoundException('Coupon not found');
        return coupon;
    }

    async updateCoupon(id: string, data: UpdateCouponDto) {
        await this.findOneCoupon(id);
        return this.prisma.coupon.update({
            where: { id },
            data: {
                ...data,
                validFrom: data.validFrom ? new Date(data.validFrom) : undefined,
                validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
            }
        });
    }

    async removeCoupon(id: string) {
        await this.findOneCoupon(id);
        return this.prisma.coupon.delete({ where: { id } });
    }

    // ============================================
    // OFFER MANAGEMENT (Owner/Admin)
    // ============================================

    async createOffer(user: any, data: CreateOfferDto) {
        // Verify room type exists and user has access
        const roomType = await this.prisma.roomType.findUnique({
            where: { id: data.roomTypeId },
            include: { property: true }
        });

        if (!roomType) throw new NotFoundException('Room type not found');

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (!isGlobalAdmin && roomType.property.ownerId !== user.id) {
            throw new ForbiddenException('You do not have permission to add offers to this room type');
        }

        return this.prisma.offer.create({
            data: {
                ...data,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
            }
        });
    }

    async findAllOffers(user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (isGlobalAdmin) {
            return this.prisma.offer.findMany({
                include: { roomType: { include: { property: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        return this.prisma.offer.findMany({
            where: {
                roomType: { property: { ownerId: user.id } }
            },
            include: { roomType: { include: { property: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOneOffer(id: string, user: any) {
        const offer = await this.prisma.offer.findUnique({
            where: { id },
            include: { roomType: { include: { property: true } } }
        });

        if (!offer) throw new NotFoundException('Offer not found');

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (!isGlobalAdmin && offer.roomType.property.ownerId !== user.id) {
            throw new ForbiddenException('Access denied');
        }

        return offer;
    }

    async updateOffer(id: string, user: any, data: UpdateOfferDto) {
        await this.findOneOffer(id, user);
        return this.prisma.offer.update({
            where: { id },
            data: {
                ...data,
                startDate: data.startDate ? new Date(data.startDate) : undefined,
                endDate: data.endDate ? new Date(data.endDate) : undefined,
            }
        });
    }

    async removeOffer(id: string, user: any) {
        await this.findOneOffer(id, user);
        return this.prisma.offer.delete({ where: { id } });
    }
}
