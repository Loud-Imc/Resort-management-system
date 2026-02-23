import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { AuditService } from '../audit/audit.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import { differenceInDays, format, addDays } from 'date-fns';
import { CreateBookingDto } from './dto/create-booking.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BookingsService {
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
        private pricingService: PricingService,
        private auditService: AuditService,
        private channelPartnersService: ChannelPartnersService,
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
            roomId,
            specialRequests,
            couponCode,
            referralCode,
            bookingSourceId: rawBookingSourceId,
            isManualBooking = false,
            overrideTotal,
            overrideReason,
            whatsappNumber,
        } = createBookingDto;

        const bookingSourceId = rawBookingSourceId || undefined;
        const agentId = createBookingDto.agentId || undefined;

        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        // Handle Guest User Creation
        const lowercaseEmail = createBookingDto.guestEmail?.toLowerCase();
        console.log(`[BookingsService] INCOMING: userId = ${userId}, guestEmail = ${lowercaseEmail}`);
        let bookingUserId = userId;
        if (userId === 'GUEST_USER') {
            if (!lowercaseEmail) {
                throw new BadRequestException('Guest email is required for public bookings');
            }

            // Check if user exists
            let user = await this.prisma.user.findUnique({
                where: { email: lowercaseEmail },
            });

            if (!user) {
                console.log(`[BookingsService] Guest user not found for ${lowercaseEmail}. Creating...`);
                // Create new guest user
                const customerRole = await this.prisma.role.findFirst({ where: { name: 'Customer' } });
                const roleId = customerRole ? customerRole.id : undefined;

                user = await this.prisma.user.create({
                    data: {
                        email: lowercaseEmail,
                        firstName: createBookingDto.guestName?.split(' ')[0] || 'Guest',
                        lastName: createBookingDto.guestName?.split(' ').slice(1).join(' ') || 'User',
                        phone: createBookingDto.guestPhone,
                        whatsappNumber: createBookingDto.whatsappNumber,
                        password: await bcrypt.hash('GUEST_PASSWORD_PLACEHOLDER', 10),
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

        console.log(`[BookingsService] DERIVED bookingUserId = ${bookingUserId}`);

        // 1. Check for existing PENDING_PAYMENT from the SAME USER for this roomType
        // This prevents "Self-Blocking" on retries.
        // We match by EMAIL in the relation for maximum reliability.
        console.log(`[BookingsService] Checking for self-block: email = ${lowercaseEmail}, roomTypeId = ${roomTypeId}`);
        const existingPending = await this.prisma.booking.findFirst({
            where: {
                status: 'PENDING_PAYMENT',
                roomTypeId,
                user: { email: lowercaseEmail },
                createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) } // Within last 30 mins
            }
        });

        if (existingPending) {
            console.log(`[BookingsService] SELF-BLOCK DETECTED: ${existingPending.bookingNumber} (${existingPending.id}). Deleting...`);
            // Delete the stale pending booking to free up the room for this retry
            await this.prisma.booking.delete({ where: { id: existingPending.id } });
            console.log(`[BookingsService] Self-block deleted successfully.`);
        } else {
            console.log(`[BookingsService] No self-block found.`);
        }

        // 2. Check availability
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
            referralCode,
            createBookingDto.currency || 'INR',
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
            // Update converted total based on override
            pricing.convertedTotal = finalTotal * pricing.exchangeRate;
        }

        // 4. Get an available room
        let selectedRoom: any;

        if (roomId) {
            // Verify the specific room is available
            const availableRooms = await this.availabilityService.getAvailableRooms(
                roomTypeId,
                checkIn,
                checkOut,
            );
            selectedRoom = availableRooms.find(r => r.id === roomId);

            if (!selectedRoom) {
                throw new BadRequestException('Selected room is not available for these dates');
            }
        } else {
            const availableRooms = await this.availabilityService.getAvailableRooms(
                roomTypeId,
                checkIn,
                checkOut,
            );

            if (availableRooms.length === 0) {
                throw new BadRequestException('No rooms available');
            }
            selectedRoom = availableRooms[0];
        }

        // 5. Generate booking number
        const bookingNumber = await this.generateBookingNumber();

        // 6. Resolve Coupon & referralCode
        let couponId: string | undefined;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findUnique({
                where: { code: couponCode },
            });
            couponId = coupon?.id;
        }

        let channelPartnerId: string | undefined;
        let cpCommission = 0;

        if (referralCode) {
            const cp = await this.prisma.channelPartner.findFirst({
                where: { referralCode, status: 'APPROVED' as any },
            });

            if (cp) {
                channelPartnerId = cp.id;
                // Calculate Commission
                let rate = Number(cp.commissionRate);

                // If not overridden, check level-based rate
                if (!cp.isRateOverridden) {
                    const level = await this.prisma.partnerLevel.findFirst({
                        where: { minPoints: { lte: cp.totalPoints } },
                        orderBy: { minPoints: 'desc' },
                    });
                    if (level) {
                        rate = Number(level.commissionRate);
                    }
                }
                cpCommission = (finalTotal * rate) / 100;
            } else {
                throw new BadRequestException('Invalid or inactive referral code');
            }
        }

        // 6.2 Handle Wallet Payment (Inline Booking)
        if (createBookingDto.paymentMethod === 'WALLET') {
            if (!channelPartnerId) {
                throw new BadRequestException('Wallet payment requires a valid channel partner referral code');
            }

            // For wallet bookings, the amount to deduct is (FinalTotal - Commission)
            // But wait, the pricing.totalAmount already has the CP discount (5%) applied if referralCode was present.
            const totalToCollect = finalTotal - cpCommission;

            // Deduct from wallet
            await this.channelPartnersService.deductWalletBalance(
                channelPartnerId,
                totalToCollect,
                `Inline booking ${bookingNumber}`,
                undefined // Reference will be updated after booking creation
            );
        }

        // 6.5 Calculate Booking Source Commission
        let commissionAmount = 0;
        if (bookingSourceId) {
            const source = await this.prisma.bookingSource.findUnique({
                where: { id: bookingSourceId }
            });
            if (source?.commission) {
                commissionAmount = (finalTotal * Number(source.commission)) / 100;
            }
        }

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
                offerDiscountAmount: pricing.offerDiscountAmount,
                couponDiscountAmount: pricing.couponDiscountAmount,
                totalAmount: finalTotal,
                bookingCurrency: pricing.targetCurrency as any,
                amountInBookingCurrency: pricing.convertedTotal as any,
                exchangeRate: pricing.exchangeRate as any,
                isPriceOverridden,
                overrideReason,
                specialRequests,
                whatsappNumber,
                isManualBooking,
                paymentOption: createBookingDto.paymentOption || 'FULL',
                status: (isManualBooking || createBookingDto.paymentMethod === 'WALLET') ? 'CONFIRMED' : 'PENDING_PAYMENT',
                roomId: selectedRoom.id,
                roomTypeId,
                propertyId: selectedRoom.propertyId,
                userId: bookingUserId,
                bookingSourceId,
                agentId,
                commissionAmount,
                channelPartnerId,
                cpCommission,
                cpDiscount: pricing.referralDiscountAmount,
                couponId,
                paidAmount: (isManualBooking || createBookingDto.paymentMethod === 'WALLET') ? finalTotal : 0,
                paymentStatus: (isManualBooking || createBookingDto.paymentMethod === 'WALLET') ? 'FULL' : 'UNPAID',
                confirmedAt: (isManualBooking || createBookingDto.paymentMethod === 'WALLET') ? new Date() : null,
                guests: {
                    create: guests.map(g => ({
                        firstName: g.firstName,
                        lastName: g.lastName,
                        email: g.email,
                        phone: g.phone,
                        whatsappNumber: g.whatsappNumber,
                        age: g.age,
                        idType: g.idType,
                        idNumber: g.idNumber,
                        idImage: g.idImage,
                    })),
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
            userId: userId === 'GUEST_USER' ? bookingUserId : userId,
            newValue: booking,
            bookingId: booking.id,
        });

        // 10. Process Channel Partner Reward
        if (channelPartnerId) {
            const isWalletPayment = createBookingDto.paymentMethod === 'WALLET';
            if (isManualBooking || isWalletPayment) {
                await this.channelPartnersService.processReferralCommission(
                    booking.id,
                    channelPartnerId,
                    finalTotal,
                    !isWalletPayment // isPending = false for wallet payments (immediately finalized)
                );
            }
        }

        // 10.5 Link Wallet Transaction if applicable
        if (createBookingDto.paymentMethod === 'WALLET' && channelPartnerId) {
            await this.prisma.cPTransaction.updateMany({
                where: {
                    channelPartnerId,
                    type: 'WALLET_PAYMENT' as any,
                    description: `Inline booking ${bookingNumber}`,
                    bookingId: null
                },
                data: {
                    bookingId: booking.id
                }
            });
        }
        // 11. Create income record for confirmed bookings
        if (isManualBooking || createBookingDto.paymentMethod === 'WALLET') {
            await this.prisma.income.create({
                data: {
                    amount: finalTotal,
                    source: createBookingDto.paymentMethod === 'WALLET' ? 'ONLINE_BOOKING' : 'ROOM_BOOKING',
                    description: `Booking ${bookingNumber}${createBookingDto.paymentMethod === 'WALLET' ? ' (Wallet Payment)' : ''}`,
                    bookingId: booking.id,
                    propertyId: booking.propertyId,
                },
            });

            // If wallet payment, also create a payment record
            if (createBookingDto.paymentMethod === 'WALLET') {
                await this.prisma.payment.create({
                    data: {
                        amount: finalTotal - cpCommission,
                        status: 'PAID',
                        paymentMethod: 'WALLET',
                        paymentDate: new Date(),
                        bookingId: booking.id,
                        currency: 'INR',
                    },
                });

                // Finalize CP commission immediately for wallet bookings
                await this.channelPartnersService.processReferralCommission(
                    booking.id,
                    channelPartnerId!,
                    finalTotal,
                    false, // isPending = false
                );
            }
        }

        return booking;
    }

    /**
     * Find all bookings with filters
     */
    async findAll(user: any, filters?: {
        status?: string;
        checkInDate?: Date;
        checkOutDate?: Date;
        roomTypeId?: string;
        propertyId?: string;
    }) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
        const isCustomer = roles.includes('Customer');

        const where: any = {
            status: filters?.status as any,
            checkInDate: filters?.checkInDate ? { gte: filters.checkInDate } : undefined,
            checkOutDate: filters?.checkOutDate ? { lte: filters.checkOutDate } : undefined,
            roomTypeId: filters?.roomTypeId,
        };

        if (isGlobalAdmin) {
            // Global admins can see everything or filter by a specific property if provided
            if (filters?.propertyId) {
                where.propertyId = filters.propertyId;
            }
        } else if (isCustomer) {
            // Customers only see their own bookings
            where.userId = user.id;
        } else {
            // Property owners and staff
            if (filters?.propertyId) {
                // If filtering by property, ensure the user has access to it
                where.AND = [
                    { propertyId: filters.propertyId },
                    {
                        property: {
                            OR: [
                                { ownerId: user.id },
                                { staff: { some: { userId: user.id } } }
                            ]
                        }
                    }
                ];
            } else {
                // Otherwise, show bookings for all their associated properties
                where.property = {
                    OR: [
                        { ownerId: user.id },
                        { staff: { some: { userId: user.id } } }
                    ]
                };
            }
        }

        return this.prisma.booking.findMany({
            where,
            include: {
                room: {
                    include: {
                        roomType: true
                    }
                },
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
                guests: true,
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Find one booking by ID
     */
    async findOne(id: string, user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                room: true,
                roomType: true,
                guests: true,
                property: true,
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

        // Check ownership/staff access
        if (!isGlobalAdmin) {
            const isOwner = booking.property?.ownerId === user.id;
            const isStaff = await this.prisma.propertyStaff.findUnique({
                where: { propertyId_userId: { propertyId: booking.propertyId || '', userId: user.id } }
            });

            if (!isOwner && !isStaff && booking.userId !== user.id) {
                throw new NotFoundException('Booking not found');
            }
        }

        return booking;
    }

    /**
     * Check-in a booking
     */
    async checkIn(id: string, user: any, dto?: any) {
        const booking = await this.findOne(id, user);

        if (booking.status !== 'CONFIRMED') {
            throw new BadRequestException('Only confirmed bookings can be checked in');
        }

        // 1. Update guest details if provided
        if (dto?.guests && dto.guests.length > 0) {
            for (const guestUpdate of dto.guests) {
                await this.prisma.bookingGuest.update({
                    where: { id: guestUpdate.id },
                    data: {
                        idType: guestUpdate.idType,
                        idNumber: guestUpdate.idNumber,
                    },
                });
            }

            // Sync to User profile (Primary Guest/Account Holder)
            const primaryGuest = dto.guests[0];
            if (primaryGuest?.idType && primaryGuest?.idNumber) {
                await this.prisma.user.update({
                    where: { id: booking.userId },
                    data: {
                        idType: primaryGuest.idType,
                        idNumber: primaryGuest.idNumber,
                    },
                });
            }
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
            userId: user.id,
            oldValue: { status: booking.status },
            newValue: { status: 'CHECK_IN' },
            bookingId: id,
        });

        // Finalize Channel Partner Commission
        await this.channelPartnersService.finalizeReferralCommission(id);

        return updated;
    }

    /**
     * Check-out a booking
     */
    async checkOut(id: string, user: any) {
        const booking = await this.findOne(id, user);

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
            userId: user.id,
            oldValue: { status: booking.status },
            newValue: { status: 'CHECK_OUT' },
            bookingId: id,
        });

        return updated;
    }

    /**
     * Cancel a booking
     */
    async cancel(id: string, user: any, reason?: string) {
        const booking = await this.findOne(id, user);

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
            userId: user.id,
            oldValue: { status: booking.status },
            newValue: { status: 'CANCELLED', reason },
            bookingId: id,
        });

        // Revert Channel Partner Commission
        await this.channelPartnersService.revertReferralCommission(id);

        return updated;
    }

    /**
     * Update booking status (for payment confirmation)
     */
    async updateStatus(id: string, status: string, user: any) {
        const booking = await this.findOne(id, user);

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
                    propertyId: booking.propertyId,
                },
            });
        }

        await this.auditService.createLog({
            action: 'STATUS_CHANGE',
            entity: 'Booking',
            entityId: id,
            userId: user.id,
            oldValue: { status: booking.status },
            newValue: { status },
            bookingId: id,
        });

        return updated;
    }

    /**
     * Get today's check-ins
     */
    async getTodayCheckIns(user: any) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        return this.prisma.booking.findMany({
            where: {
                checkInDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: 'CONFIRMED',
                property: propertyFilter,
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
    async getTodayCheckOuts(user: any) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        return this.prisma.booking.findMany({
            where: {
                checkOutDate: {
                    gte: today,
                    lt: tomorrow,
                },
                status: 'CHECKED_IN',
                property: propertyFilter,
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
