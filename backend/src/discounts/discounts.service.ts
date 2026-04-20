import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCouponDto, UpdateCouponDto, CreateOfferDto, UpdateOfferDto } from './dto/discounts.dto';

@Injectable()
export class DiscountsService {
    constructor(private prisma: PrismaService) { }

    // ============================================
    // COUPON MANAGEMENT (Admin Only)
    // ============================================

    async createCoupon(user: any, data: CreateCouponDto) {
        return this.prisma.coupon.create({
            data: {
                ...data,
                validFrom: new Date(data.validFrom),
                validUntil: new Date(data.validUntil),
                createdById: user.id,
                isApproved: false,
                isActive: false, // Default to inactive until approved
            }
        });
    }

    async approveCoupon(id: string, user: any) {
        const coupon = await this.findOneCoupon(id);

        // Maker-Checker Violation check
        if (coupon.createdById === user.id) {
            throw new ForbiddenException(
                'Maker-Checker Violation: You cannot approve a coupon that you created yourself. ' +
                'Please request another Admin to approve.'
            );
        }

        return this.prisma.coupon.update({
            where: { id },
            data: {
                isApproved: true,
                approvedById: user.id,
                isActive: true, // Auto-activate upon approval
            }
        });
    }

    async findAllCoupons() {
        return this.prisma.coupon.findMany({
            include: {
                createdBy: { select: { id: true, firstName: true, email: true } },
                approvedBy: { select: { id: true, firstName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOneCoupon(id: string) {
        const coupon = await this.prisma.coupon.findUnique({
            where: { id },
            include: {
                createdBy: { select: { id: true, firstName: true, email: true } },
                approvedBy: { select: { id: true, firstName: true, email: true } },
            }
        });
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
        const { roomTypeIds, ...offerData } = data;

        // Verify room types exist and user has access
        const roomTypes = await this.prisma.roomType.findMany({
            where: { id: { in: roomTypeIds } },
            include: { property: true }
        });

        if (roomTypes.length !== roomTypeIds.length) {
            throw new NotFoundException('Some room types were not found');
        }

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        // Check if user has access to ALL selected room types
        if (!isGlobalAdmin) {
            const unauthorized = roomTypes.find(rt => rt.property.ownerId !== user.id);
            if (unauthorized) {
                throw new ForbiddenException('You do not have permission to add offers to some of the selected room types');
            }
        }

        return this.prisma.offer.create({
            data: {
                ...offerData,
                startDate: new Date(offerData.startDate),
                endDate: new Date(offerData.endDate),
                roomTypes: {
                    connect: roomTypeIds.map(id => ({ id }))
                }
            }
        });
    }

    async findAllOffers(user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (isGlobalAdmin) {
            return this.prisma.offer.findMany({
                include: { roomTypes: { include: { property: true } } },
                orderBy: { createdAt: 'desc' }
            });
        }

        return this.prisma.offer.findMany({
            where: {
                roomTypes: { some: { property: { ownerId: user.id } } }
            },
            include: { roomTypes: { include: { property: true } } },
            orderBy: { createdAt: 'desc' }
        });
    }

    async findOneOffer(id: string, user: any) {
        const offer = await this.prisma.offer.findUnique({
            where: { id },
            include: { roomTypes: { include: { property: true } } }
        });

        if (!offer) throw new NotFoundException('Offer not found');

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        if (!isGlobalAdmin) {
            const isOwner = offer.roomTypes.some(rt => rt.property.ownerId === user.id);
            if (!isOwner) {
                throw new ForbiddenException('Access denied');
            }
        }

        return offer;
    }

    async updateOffer(id: string, user: any, data: UpdateOfferDto) {
        const { roomTypeIds, ...offerData } = data;
        await this.findOneOffer(id, user);

        return this.prisma.offer.update({
            where: { id },
            data: {
                ...offerData,
                startDate: offerData.startDate ? new Date(offerData.startDate) : undefined,
                endDate: offerData.endDate ? new Date(offerData.endDate) : undefined,
                roomTypes: roomTypeIds ? {
                    set: roomTypeIds.map(id => ({ id }))
                } : undefined
            }
        });
    }

    async removeOffer(id: string, user: any) {
        await this.findOneOffer(id, user);
        return this.prisma.offer.delete({ where: { id } });
    }
}
