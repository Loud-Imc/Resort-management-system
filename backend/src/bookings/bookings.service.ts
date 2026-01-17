import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { AuditService } from '../audit/audit.service';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class BookingsService {
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
        private pricingService: PricingService,
        private auditService: AuditService,
    ) { }

    /**
     * Create a new booking (manual or online)
     */
    async create(createBookingDto: CreateBookingDto, userId: string) {
        const {
            roomTypeId,
            checkInDate,
            checkOutDate,
            adultsCount,
            childrenCount,
            guests,
            specialRequests,
            couponCode,
            bookingSourceId,
            isManualBooking = false,
            overrideTotal,
            overrideReason,
        } = createBookingDto;

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        // Handle Guest User Creation
        let bookingUserId = userId;
        if (userId === 'GUEST_USER') {
            const email = createBookingDto.guestEmail;
            if (!email) {
                throw new BadRequestException('Guest email is required for public bookings');
            }

            // Check if user exists
            let user = await this.prisma.user.findUnique({
                where: { email },
            });

            if (!user) {
                // Create new guest user
                const password = Math.random().toString(36).slice(-8); // Random password
                // NOTE: You might need to adjust this depending on how you handle Roles. 
                // If you use a Role relation, you need to find the Role ID first.
                // For safety, let's assume a default role or handle it.
                // Better: Use upsert if possible, or just create.

                // Fetch 'Customer' role (common for guests)
                const customerRole = await this.prisma.role.findFirst({ where: { name: 'Customer' } });
                const roleId = customerRole ? customerRole.id : undefined;

                user = await this.prisma.user.create({
                    data: {
                        email,
                        firstName: createBookingDto.guestName?.split(' ')[0] || 'Guest',
                        lastName: createBookingDto.guestName?.split(' ').slice(1).join(' ') || 'User',
                        phone: createBookingDto.guestPhone,
                        password: 'GUEST_PASSWORD_PLACEHOLDER', // In a real app, use a random hash or handle passless
                        roles: roleId ? {
                            create: {
                                role: { connect: { id: roleId } }
                            }
                        } : undefined
                    } as any
                });
            }
            bookingUserId = user.id;
        }

        // 1. Check availability
        const isAvailable = await this.availabilityService.checkAvailability(
            roomTypeId,
            checkIn,
            checkOut,
        );

        if (!isAvailable) {
            throw new BadRequestException('No rooms available for the selected dates');
        }

        // 2. Calculate pricing
        const pricing = await this.pricingService.calculatePrice(
            roomTypeId,
            checkIn,
            checkOut,
            adultsCount,
            childrenCount,
            couponCode,
        );

        // 3. Handle price override for manual bookings
        let finalTotal = pricing.totalAmount;
        let isPriceOverridden = false;

        if (isManualBooking && overrideTotal !== undefined) {
            if (!this.pricingService.validatePriceOverride(pricing.totalAmount, overrideTotal)) {
                throw new BadRequestException('Price override is too low');
            }
            finalTotal = overrideTotal;
            isPriceOverridden = true;
        }

        // 4. Get an available room
        const availableRooms = await this.availabilityService.getAvailableRooms(
            roomTypeId,
            checkIn,
            checkOut,
        );

        if (availableRooms.length === 0) {
            throw new BadRequestException('No rooms available');
        }

        const selectedRoom = availableRooms[0];

        // 5. Generate booking number
        const bookingNumber = await this.generateBookingNumber();

        // 6. Get coupon if provided
        let couponId: string | undefined;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findUnique({
                where: { code: couponCode },
            });
            couponId = coupon?.id;
        }

        // 6.5 Calculate Commission
        let commissionAmount = 0;
        let agentId = createBookingDto.agentId;

        // If booking source is provided, check for default commission
        if (bookingSourceId) {
            const source = await this.prisma.bookingSource.findUnique({
                where: { id: bookingSourceId }
            });
            // Explicitly cast to unknown then to number to handle Decimal type mismatch safely, or just use Number()
            if (source?.commission) {
                commissionAmount = (finalTotal * Number(source.commission)) / 100;
            }
        }

        // If agent is involved, they might override or take precedence (future logic)
        // For now, if source commission exists, use it.

        // 7. Create booking
        const booking = await this.prisma.booking.create({
            data: {
                bookingNumber,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                numberOfNights: pricing.numberOfNights,
                adultsCount,
                childrenCount,
                baseAmount: pricing.baseAmount,
                extraAdultAmount: pricing.extraAdultAmount,
                extraChildAmount: pricing.extraChildAmount,
                taxAmount: pricing.taxAmount,
                discountAmount: pricing.discountAmount,
                totalAmount: finalTotal,
                isPriceOverridden,
                overrideReason,
                specialRequests,
                isManualBooking,
                status: isManualBooking ? 'CONFIRMED' : 'PENDING_PAYMENT',
                roomId: selectedRoom.id,
                roomTypeId,
                userId: bookingUserId,
                bookingSourceId,
                agentId,
                commissionAmount,
                couponId,
                confirmedAt: isManualBooking ? new Date() : null,
                guests: {
                    create: guests,
                },
            },
            include: {
                room: true,
                roomType: true,
                guests: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });

        // 8. Update coupon usage if applicable
        if (couponId) {
            await this.prisma.coupon.update({
                where: { id: couponId },
                data: {
                    usedCount: { increment: 1 },
                },
            });
        }

        // 9. Create audit log
        await this.auditService.createLog({
            action: 'CREATE',
            entity: 'Booking',
            entityId: booking.id,
            userId,
            newValue: booking,
            bookingId: booking.id,
        });

        // 10. Create income record for confirmed bookings
        if (isManualBooking) {
            await this.prisma.income.create({
                data: {
                    amount: finalTotal,
                    source: 'ROOM_BOOKING',
                    description: `Booking ${bookingNumber}`,
                    bookingId: booking.id,
                },
            });
        }

        return booking;
    }

    /**
     * Find all bookings with filters
     */
    async findAll(filters?: {
        status?: string;
        checkInDate?: Date;
        checkOutDate?: Date;
        roomTypeId?: string;
    }) {
        return this.prisma.booking.findMany({
            where: {
                status: filters?.status as any,
                checkInDate: filters?.checkInDate ? { gte: filters.checkInDate } : undefined,
                checkOutDate: filters?.checkOutDate ? { lte: filters.checkOutDate } : undefined,
                roomTypeId: filters?.roomTypeId,
            },
            include: {
                room: true,
                roomType: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                bookingSource: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Find one booking by ID
     */
    async findOne(id: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                room: true,
                roomType: true,
                guests: true,
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                bookingSource: true,
                payments: true,
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        return booking;
    }

    /**
     * Check-in a booking
     */
    async checkIn(id: string, userId: string) {
        const booking = await this.findOne(id);

        if (booking.status !== 'CONFIRMED') {
            throw new BadRequestException('Only confirmed bookings can be checked in');
        }

        const updated = await this.prisma.booking.update({
            where: { id },
            data: {
                status: 'CHECKED_IN',
                checkedInAt: new Date(),
            },
            include: {
                room: true,
                roomType: true,
                guests: true,
            },
        });

        // Update room status
        await this.prisma.room.update({
            where: { id: booking.roomId },
            data: { status: 'OCCUPIED' },
        });

        await this.auditService.createLog({
            action: 'CHECK_IN',
            entity: 'Booking',
            entityId: id,
            userId,
            oldValue: { status: booking.status },
            newValue: { status: 'CHECKED_IN' },
            bookingId: id,
        });

        return updated;
    }

    /**
     * Check-out a booking
     */
    async checkOut(id: string, userId: string) {
        const booking = await this.findOne(id);

        if (booking.status !== 'CHECKED_IN') {
            throw new BadRequestException('Only checked-in bookings can be checked out');
        }

        const updated = await this.prisma.booking.update({
            where: { id },
            data: {
                status: 'CHECKED_OUT',
                checkedOutAt: new Date(),
            },
            include: {
                room: true,
                roomType: true,
                guests: true,
            },
        });

        // Update room status
        await this.prisma.room.update({
            where: { id: booking.roomId },
            data: { status: 'AVAILABLE' },
        });

        await this.auditService.createLog({
            action: 'CHECK_OUT',
            entity: 'Booking',
            entityId: id,
            userId,
            oldValue: { status: booking.status },
            newValue: { status: 'CHECKED_OUT' },
            bookingId: id,
        });

        return updated;
    }

    /**
     * Cancel a booking
     */
    async cancel(id: string, userId: string, reason?: string) {
        const booking = await this.findOne(id);

        if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
            throw new BadRequestException('Only pending or confirmed bookings can be cancelled');
        }

        const updated = await this.prisma.booking.update({
            where: { id },
            data: {
                status: 'CANCELLED',
                cancelledAt: new Date(),
            },
            include: {
                room: true,
                roomType: true,
                guests: true,
            },
        });

        await this.auditService.createLog({
            action: 'CANCEL',
            entity: 'Booking',
            entityId: id,
            userId,
            oldValue: { status: booking.status },
            newValue: { status: 'CANCELLED', reason },
            bookingId: id,
        });

        return updated;
    }

    /**
     * Update booking status (for payment confirmation)
     */
    async updateStatus(id: string, status: string, userId: string) {
        const booking = await this.findOne(id);

        const updated = await this.prisma.booking.update({
            where: { id },
            data: {
                status: status as any,
                confirmedAt: status === 'CONFIRMED' ? new Date() : booking.confirmedAt,
            },
        });

        // Create income record when booking is confirmed
        if (status === 'CONFIRMED' && booking.status !== 'CONFIRMED') {
            await this.prisma.income.create({
                data: {
                    amount: booking.totalAmount,
                    source: booking.isManualBooking ? 'ROOM_BOOKING' : 'ONLINE_BOOKING',
                    description: `Booking ${booking.bookingNumber}`,
                    bookingId: booking.id,
                },
            });
        }

        await this.auditService.createLog({
            action: 'STATUS_CHANGE',
            entity: 'Booking',
            entityId: id,
            userId,
            oldValue: { status: booking.status },
            newValue: { status },
            bookingId: id,
        });

        return updated;
    }

    /**
     * Get today's check-ins
     */
    async getTodayCheckIns() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.prisma.booking.findMany({
            where: {
                checkInDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: 'CONFIRMED',
            },
            include: {
                room: true,
                roomType: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * Get today's check-outs
     */
    async getTodayCheckOuts() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.prisma.booking.findMany({
            where: {
                checkOutDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: 'CHECKED_IN',
            },
            include: {
                room: true,
                roomType: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        phone: true,
                    },
                },
            },
        });
    }

    /**
     * Generate unique booking number
     */
    private async generateBookingNumber(): Promise<string> {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        // Count bookings today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const count = await this.prisma.booking.count({
            where: {
                createdAt: {
                    gte: today,
                    lt: tomorrow,
                },
            },
        });

        const sequence = String(count + 1).padStart(4, '0');
        return `BK-${year}${month}${day}-${sequence}`;
    }
}
