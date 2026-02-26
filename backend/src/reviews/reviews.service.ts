import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: {
        propertyId: string;
        roomTypeId?: string;
        rating: number;
        comment?: string;
    }) {
        const { propertyId, roomTypeId, rating, comment } = dto;

        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        // 1. Verify if user has stayed at this property
        const booking = await this.prisma.booking.findFirst({
            where: {
                userId,
                propertyId,
                ...(roomTypeId && { roomTypeId }),
                status: 'CHECKED_OUT'
            },
        });

        if (!booking) {
            throw new ForbiddenException('You can only review rooms/properties you have stayed at.');
        }

        // 2. Check if already reviewed (optional but recommended)
        const existing = await this.prisma.review.findFirst({
            where: {
                userId,
                propertyId,
                ...(roomTypeId && { roomTypeId })
            }
        });

        if (existing) {
            throw new BadRequestException('You have already reviewed this stay.');
        }

        return this.prisma.review.create({
            data: {
                userId,
                propertyId,
                roomTypeId,
                rating,
                comment,
            },
            include: {
                user: {
                    select: { firstName: true, lastName: true, avatar: true }
                }
            }
        });
    }

    async getForProperty(propertyId: string) {
        return this.prisma.review.findMany({
            where: { propertyId },
            include: {
                user: {
                    select: { firstName: true, lastName: true, avatar: true }
                },
                roomType: {
                    select: { name: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getForRoomType(roomTypeId: string) {
        return this.prisma.review.findMany({
            where: { roomTypeId },
            include: {
                user: {
                    select: { firstName: true, lastName: true, avatar: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
    }

    async getStats(propertyId: string) {
        const reviews = await this.prisma.review.findMany({
            where: { propertyId },
            select: { rating: true }
        });

        if (reviews.length === 0) return { average: 0, count: 0 };

        const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
        return {
            average: Number((sum / reviews.length).toFixed(1)),
            count: reviews.length
        };
    }
}
