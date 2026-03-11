import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReviewsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(userId: string, dto: {
        propertyId: string;
        bookingId: string;
        roomTypeId?: string;
        rating: number;
        comment?: string;
        images?: string[];
    }) {
        const { propertyId, bookingId, roomTypeId, rating, comment, images } = dto;

        if (rating < 1 || rating > 5) {
            throw new BadRequestException('Rating must be between 1 and 5');
        }

        // 1. Verify if user has stayed at this property with this booking
        const booking = await this.prisma.booking.findFirst({
            where: {
                id: bookingId,
                userId,
                propertyId,
                status: 'CHECKED_OUT'
            },
        });

        if (!booking) {
            throw new ForbiddenException('You can only review stays you have completed (checked-out).');
        }

        // 2. Check if already reviewed
        const existing = await this.prisma.review.findUnique({
            where: { bookingId }
        });

        if (existing) {
            throw new BadRequestException('You have already reviewed this stay.');
        }

        return this.prisma.$transaction(async (tx) => {
            // Create the review
            const review = await tx.review.create({
                data: {
                    userId,
                    propertyId,
                    bookingId,
                    roomTypeId,
                    rating,
                    comment,
                    images: images || [],
                },
                include: {
                    user: {
                        select: { firstName: true, lastName: true, avatar: true }
                    }
                }
            });

            // Recalculate property statistics
            const stats = await tx.review.aggregate({
                where: { propertyId },
                _avg: { rating: true },
                _count: { rating: true }
            });

            // Update the Property model
            await tx.property.update({
                where: { id: propertyId },
                data: {
                    rating: stats._avg.rating || 0,
                    reviewCount: stats._count.rating || 0
                }
            });

            return review;
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
