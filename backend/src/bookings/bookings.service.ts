import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { AuditService } from '../audit/audit.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import { PaymentsService } from '../payments/payments.service';
import { differenceInDays, format, addDays, differenceInHours } from 'date-fns';
import { CreateBookingDto } from './dto/create-booking.dto';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BookingsService {
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
        private pricingService: PricingService,
        private auditService: AuditService,
        private channelPartnersService: ChannelPartnersService,
        private paymentsService: PaymentsService,
        private notificationsService: NotificationsService,
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
            isGroupBooking = false,
            groupSize,
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
        // (Initial guest check moved inside transaction for atomicity, but we define variables here)

        // 1. Check for existing PENDING_PAYMENT from the SAME USER for this roomType
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
            await this.prisma.booking.delete({ where: { id: existingPending.id } });
            console.log(`[BookingsService] Self-block deleted successfully.`);
        }

        // 2. Check availability
        const isAvailable = await this.availabilityService.checkAvailability(roomTypeId, checkIn, checkOut);
        if (!isAvailable) {
            throw new BadRequestException('No rooms available for the selected dates');
        }

        // 2.1 Validate Group Capacity (Property Level)
        if (isGroupBooking && groupSize) {
            const roomType = await this.prisma.roomType.findUnique({
                where: { id: roomTypeId },
                select: { property: { select: { allowsGroupBooking: true, maxGroupCapacity: true } } }
            });

            if (!roomType?.property.allowsGroupBooking) {
                throw new BadRequestException('This property does not support group bookings');
            }

            if (roomType.property.maxGroupCapacity && groupSize > roomType.property.maxGroupCapacity) {
                throw new BadRequestException(`Group size exceeds property's maximum capacity of ${roomType.property.maxGroupCapacity}`);
            }
        }

        // 3. Calculate pricing
        const pricing = await this.pricingService.calculatePrice(
            roomTypeId,
            checkIn,
            checkOut,
            adultsCount,
            childrenCount,
            couponCode,
            referralCode,
            createBookingDto.currency || 'INR',
            isGroupBooking,
            groupSize,
        );

        // 3.1 Handle Group Room Allocation across Multiple Rooms
        let allocatedRooms: any[] = [];
        if (isGroupBooking && groupSize) {
            const baseRoomType = await this.prisma.roomType.findUnique({
                where: { id: roomTypeId },
                select: { propertyId: true }
            });

            if (!baseRoomType) throw new NotFoundException('Room type not found');

            // Find all RoomTypes in the Group Pool for this property
            const groupPoolTypes = await this.prisma.roomType.findMany({
                where: {
                    propertyId: baseRoomType.propertyId,
                    isAvailableForGroupBooking: true,
                }
            });

            // Find all available rooms across these types
            let allAvailableRooms: any[] = [];
            for (const type of groupPoolTypes) {
                const availableForType = await this.availabilityService.getAvailableRooms(type.id, checkIn, checkOut);
                allAvailableRooms.push(...availableForType.map(r => ({
                    ...r,
                    capacity: (type as any).groupMaxOccupancy || (type.maxAdults + (type.maxChildren || 0))
                })));
            }

            // Sort by capacity descending to fill larger rooms first
            allAvailableRooms.sort((a, b) => b.capacity - a.capacity);

            let remainingHeadcount = groupSize;
            for (const room of allAvailableRooms) {
                if (remainingHeadcount <= 0) break;
                allocatedRooms.push(room);
                remainingHeadcount -= room.capacity;
            }

            if (remainingHeadcount > 0) {
                throw new BadRequestException(`Not enough capacity in the group pool for ${groupSize} guests. Only ${groupSize - remainingHeadcount} spots available.`);
            }
        }

        // 4. Handle price override
        let finalTotal = pricing.totalAmount;
        let isPriceOverridden = false;
        if (isManualBooking && overrideTotal !== undefined) {
            if (!this.pricingService.validatePriceOverride(pricing.totalAmount, overrideTotal)) {
                throw new BadRequestException('Price override is too low');
            }
            finalTotal = overrideTotal;
            isPriceOverridden = true;
            pricing.convertedTotal = finalTotal * pricing.exchangeRate;

            // Recalculate GST components in reverse
            const reversePricing = await this.pricingService.calculateReverseGST(
                finalTotal,
                pricing.numberOfNights,
                pricing.roomCount || 1
            );

            // Update pricing object so final DB record is mathematically consistent
            pricing.taxAmount = reversePricing.taxAmount;
            pricing.baseAmount = reversePricing.baseAmount;

            // Zero out extras since baseAmount now encapsulates the entire pre-tax value
            pricing.extraAdultAmount = 0;
            pricing.extraChildAmount = 0;
            pricing.offerDiscountAmount = 0;
            pricing.couponDiscountAmount = 0;
            pricing.referralDiscountAmount = 0;
        }

        // 5. Get an available room
        let selectedRoom: any;
        if (isGroupBooking && allocatedRooms.length > 0) {
            selectedRoom = allocatedRooms[0];
        } else {
            const availableRooms = await this.availabilityService.getAvailableRooms(roomTypeId, checkIn, checkOut);
            if (roomId) {
                selectedRoom = availableRooms.find(r => r.id === roomId);
                if (!selectedRoom) throw new BadRequestException('Selected room is not available');
            } else {
                if (availableRooms.length === 0) throw new BadRequestException('No rooms available');
                selectedRoom = availableRooms[0];
            }
        }

        // 6. Resolve IDs and generation logic
        const bookingNumber = await this.generateBookingNumber();
        let couponId: string | undefined;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
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
                let rate = Number(cp.commissionRate);
                if (!cp.isRateOverridden) {
                    const level = await this.prisma.partnerLevel.findFirst({
                        where: { minPoints: { lte: cp.totalPoints } },
                        orderBy: { minPoints: 'desc' },
                    });
                    if (level) rate = Number(level.commissionRate);
                }
                cpCommission = (finalTotal * rate) / 100;
            } else {
                throw new BadRequestException('Invalid referral code');
            }
        }

        let commissionAmount = 0;
        if (bookingSourceId) {
            const source = await this.prisma.bookingSource.findUnique({ where: { id: bookingSourceId } });
            if (source?.commission) {
                commissionAmount = (finalTotal * Number(source.commission)) / 100;
            }
        }

        // 7. Create booking & related entities in a transaction
        const booking = await this.prisma.$transaction(async (tx) => {
            // 7.1 For guest users, the user creation must be inside the transaction
            let finalBookingUserId = bookingUserId;
            if (userId === 'GUEST_USER') {
                let user = await tx.user.findUnique({
                    where: { email: lowercaseEmail },
                });

                if (!user) {
                    console.log(`[BookingsService] [TX] Guest user not found for ${lowercaseEmail}. Creating...`);
                    const customerRole = await tx.role.findFirst({ where: { name: 'Customer' } });
                    const roleId = customerRole ? customerRole.id : undefined;

                    user = await tx.user.create({
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
                finalBookingUserId = user.id;
            }

            // 7.2 Deduct from wallet if applicable
            if (createBookingDto.paymentMethod === 'WALLET' && channelPartnerId) {
                const totalToCollect = finalTotal - cpCommission;
                await this.channelPartnersService.deductWalletBalance(
                    channelPartnerId,
                    totalToCollect,
                    `Inline booking ${bookingNumber}`,
                    undefined,
                    tx
                );
            }

            // 7.2.1 Row-level lock + availability re-check to prevent double booking
            // Lock the room row(s) so no other transaction can read/write until we commit
            if (isGroupBooking && allocatedRooms.length > 0) {
                // Lock ALL allocated rooms for group booking
                for (const room of allocatedRooms) {
                    await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${room.id} FOR UPDATE`;
                    const isStillAvailable = await this.availabilityService.isRoomAvailable(
                        room.id, checkIn, checkOut, tx
                    );
                    if (!isStillAvailable) {
                        throw new BadRequestException(
                            `Room ${room.roomNumber || room.id} is no longer available. Please try again.`
                        );
                    }
                }
            } else {
                // Lock the single selected room for standard booking
                await tx.$queryRaw`SELECT id FROM rooms WHERE id = ${selectedRoom.id} FOR UPDATE`;
                const isStillAvailable = await this.availabilityService.isRoomAvailable(
                    selectedRoom.id, checkIn, checkOut, tx
                );
                if (!isStillAvailable) {
                    throw new BadRequestException(
                        'This room was just booked by another user. Please try again.'
                    );
                }
            }

            // 7.2.2 Mathematical Validation of Pricing Object
            const computedTotal = (
                pricing.baseAmount +
                pricing.extraAdultAmount +
                pricing.extraChildAmount +
                pricing.taxAmount -
                pricing.offerDiscountAmount -
                pricing.couponDiscountAmount -
                pricing.referralDiscountAmount
            );

            // Allow up to ±0.50 in rounding differences
            if (Math.abs(computedTotal - finalTotal) > 0.50) {
                console.error(`[BookingsService] Pricing discrepancy detected. Expected: ${finalTotal}, Computed: ${computedTotal}. Pricing Object:`, pricing);
                throw new BadRequestException('Booking calculation failed internal consistency check. Please try again or contact support.');
            }

            // 7.3 Create the booking
            const newBooking = await tx.booking.create({
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
                    userId: finalBookingUserId,
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
                        create: (isGroupBooking && guests.length === 0) ? [] : guests.map(g => ({
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
                    isGroupBooking,
                    groupSize,
                },
                include: {
                    room: true,
                    roomType: { include: { cancellationPolicy: true } },
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

            // 7.4 Update coupon usage
            if (couponId) {
                await tx.coupon.update({
                    where: { id: couponId },
                    data: { usedCount: { increment: 1 } },
                });
            }

            // 7.5 Create audit log
            await this.auditService.createLog({
                action: 'CREATE',
                entity: 'Booking',
                entityId: newBooking.id,
                userId: userId === 'GUEST_USER' ? finalBookingUserId : userId,
                newValue: newBooking,
                bookingId: newBooking.id,
            }, tx);

            // 7.6 Finalize details (Income, Payments, CP Rewards)
            if (isManualBooking || createBookingDto.paymentMethod === 'WALLET') {
                // CP Rewards processing
                if (channelPartnerId) {
                    const isWalletPayment = createBookingDto.paymentMethod === 'WALLET';
                    await this.channelPartnersService.processReferralCommission(
                        newBooking.id,
                        channelPartnerId,
                        finalTotal,
                        !isWalletPayment,
                        tx
                    );

                    if (isWalletPayment) {
                        // Link Wallet Transaction
                        await tx.cPTransaction.updateMany({
                            where: {
                                channelPartnerId,
                                type: 'WALLET_PAYMENT' as any,
                                description: `Inline booking ${bookingNumber}`,
                                bookingId: null
                            },
                            data: { bookingId: newBooking.id }
                        });

                        // Create payment record
                        await tx.payment.create({
                            data: {
                                amount: finalTotal - cpCommission,
                                status: 'PAID',
                                paymentMethod: 'WALLET',
                                paymentDate: new Date(),
                                bookingId: newBooking.id,
                                currency: 'INR',
                            },
                        });
                    }
                }

                // Income record
                await tx.income.create({
                    data: {
                        amount: finalTotal,
                        source: createBookingDto.paymentMethod === 'WALLET' ? 'ONLINE_BOOKING' : 'ROOM_BOOKING',
                        description: `Booking ${bookingNumber}${createBookingDto.paymentMethod === 'WALLET' ? ' (Wallet Payment)' : ''}`,
                        bookingId: newBooking.id,
                        propertyId: newBooking.propertyId,
                    },
                });
            }

            // 7.7 If Group Booking, block extra rooms
            if (isGroupBooking && allocatedRooms.length > 1) {
                const extraRooms = allocatedRooms.slice(1);
                for (const room of extraRooms) {
                    await tx.roomBlock.create({
                        data: {
                            roomId: room.id,
                            startDate: checkIn,
                            endDate: checkOut,
                            reason: `Group Booking ${bookingNumber}`,
                            notes: `Automatically blocked for group booking ${newBooking.id}`,
                            createdById: finalBookingUserId,
                            bookingId: newBooking.id,
                        }
                    });
                }
            }

            return newBooking;
        });

        // 8. Broadcast notifications (Outside transaction)
        if (['CONFIRMED', 'RESERVED'].includes(booking.status)) {
            await this.notificationsService.broadcastNewBooking(booking);
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
        const isCP = roles.includes('ChannelPartner');

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
        } else {
            // For all other users (Owners, Staff, Partners, Customers),
            // ensure they see their OWN personal bookings PLUS anything they are authorized for.
            const visibilityOR: any[] = [
                { userId: user.id } // Always see personal bookings
            ];

            // Add Property Owners/Staff visibility
            visibilityOR.push({
                property: {
                    OR: [
                        { ownerId: user.id },
                        { staff: { some: { userId: user.id } } }
                    ]
                }
            });

            // Add Channel Partner visibility
            if (isCP) {
                visibilityOR.push({
                    channelPartner: { userId: user.id }
                });
            }

            where.OR = visibilityOR;

            // Apply property filter on top if provided
            if (filters?.propertyId) {
                where.propertyId = filters.propertyId;
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
                roomType: { include: { cancellationPolicy: true } },
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

    async findMyBookings(userId: string) {
        return this.prisma.booking.findMany({
            where: { userId },
            include: {
                room: {
                    include: {
                        roomType: true
                    }
                },
                roomType: { include: { cancellationPolicy: true } },
                guests: true,
                property: true
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }

    /**
     * Find one booking by ID (Public - No Auth required)
     * Relies on UUID non-guessability for security
     */
    async findOnePublic(id: string) {
        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                room: true,
                roomType: { include: { cancellationPolicy: true } },
                guests: true,
                property: { include: { defaultCancellationPolicy: true } },
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
     * Find one booking by ID
     */
    async findOne(id: string, user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const booking = await this.prisma.booking.findUnique({
            where: { id },
            include: {
                room: true,
                roomType: { include: { cancellationPolicy: true } },
                guests: true,
                property: { include: { defaultCancellationPolicy: true } },
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
        let isAuthorizedMember = false;
        if (!isGlobalAdmin) {
            const isOwner = booking.property?.ownerId === user.id;
            const isStaff = await this.prisma.propertyStaff.findUnique({
                where: { propertyId_userId: { propertyId: booking.propertyId || '', userId: user.id } }
            });
            isAuthorizedMember = !!(isOwner || isStaff);

            if (!isOwner && !isStaff && booking.userId !== user.id) {
                throw new NotFoundException('Booking not found');
            }
        } else {
            isAuthorizedMember = true;
        }

        // Mark as seen if authorized member is viewing
        if (isAuthorizedMember && booking.isSeenByProperty === false) {
            await this.prisma.booking.update({
                where: { id },
                data: { isSeenByProperty: true }
            });
        }

        return booking;
    }

    async getUnseenCount(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const where: any = {
            isSeenByProperty: false,
            status: { not: 'PENDING_PAYMENT' as any } // Only count confirmed/meaningful bookings
        };

        if (isGlobalAdmin) {
            if (propertyId) {
                where.propertyId = propertyId;
            }
        } else {
            // Limited to properties the user owns or works at
            where.property = {
                OR: [
                    { ownerId: user.id },
                    { staff: { some: { userId: user.id } } }
                ]
            };
            if (propertyId) {
                where.propertyId = propertyId;
            }
        }

        return this.prisma.booking.count({ where });
    }

    /**
     * Check-in a booking
     */
    async checkIn(id: string, user: any, dto?: any) {
        const booking = await this.findOne(id, user);

        if (!['CONFIRMED', 'RESERVED'].includes(booking.status)) {
            throw new BadRequestException('Only confirmed or reserved bookings can be checked in');
        }

        // 1. Update guest details if provided
        if (dto?.guests && dto.guests.length > 0) {
            for (const guestUpdate of dto.guests) {
                await this.prisma.bookingGuest.update({
                    where: { id: guestUpdate.id },
                    data: {
                        idType: guestUpdate.idType,
                        idNumber: guestUpdate.idNumber,
                        idImage: guestUpdate.idImage,
                    },
                });
            }

            // Sync to User profile (Primary Guest/Account Holder)
            const primaryGuest = dto.guests[0];
            if (primaryGuest?.idType || primaryGuest?.idNumber || primaryGuest?.idImage) {
                await this.prisma.user.update({
                    where: { id: booking.userId },
                    data: {
                        ...(primaryGuest.idType && { idType: primaryGuest.idType }),
                        ...(primaryGuest.idNumber && { idNumber: primaryGuest.idNumber }),
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
                property: true,
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

        // Notify guest of check-in
        await this.notificationsService.notifyCheckIn(updated);

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

        // Notify guest of check-out
        await this.notificationsService.notifyCheckOut(updated);

        return updated;
    }

    /**
     * Cancel a booking
     */
    async cancel(id: string, user: any, reason?: string) {
        const booking = await this.findOne(id, user);

        if (!['PENDING_PAYMENT', 'CONFIRMED', 'RESERVED'].includes(booking.status)) {
            throw new BadRequestException('Only pending, confirmed, or reserved bookings can be cancelled');
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

        // Notify guest of cancellation
        await this.notificationsService.notifyCancellation(updated);

        // Revert Channel Partner Commission
        await this.channelPartnersService.revertReferralCommission(id);

        // Process Refunds
        const payments = await this.prisma.payment.findMany({
            where: { bookingId: id, status: 'PAID' }
        });

        // Resolve Cancellation Policy and Refund Percentage
        const anyBooking = booking as any;
        const applicablePolicy = anyBooking.roomType?.cancellationPolicy || anyBooking.property?.defaultCancellationPolicy;

        let refundPercentage = 100;

        if (applicablePolicy) {
            const checkInDate = new Date(booking.checkInDate);
            const now = new Date();
            const hoursUntilCheckIn = Math.max(0, differenceInHours(checkInDate, now));

            const rules = (applicablePolicy.rules as any[]) || [];
            // Sort rules by hoursBeforeCheckIn descending (e.g. 48, 24, 0)
            const sortedRules = [...rules].sort((a, b) => b.hoursBeforeCheckIn - a.hoursBeforeCheckIn);

            for (const rule of sortedRules) {
                if (hoursUntilCheckIn >= rule.hoursBeforeCheckIn) {
                    refundPercentage = rule.refundPercentage;
                    break;
                }
            }
        }

        for (const payment of payments) {
            try {
                const actualRefundAmount = Number(payment.amount) * (refundPercentage / 100);

                if (actualRefundAmount <= 0) {
                    // No refund granted based on policy
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            refundReason: `No refund per policy (${refundPercentage}%). ${reason || ''}`,
                            refundDate: new Date(),
                            refundAmount: 0
                        }
                    });
                    continue;
                }

                if (payment.paymentMethod === 'WALLET') {
                    // Refund to CP Wallet
                    await this.channelPartnersService.refundWalletPayment(
                        booking.agentId || (booking as any).channelPartnerId!,
                        actualRefundAmount,
                        `Refund (${refundPercentage}%) for cancelled booking ${booking.bookingNumber}`,
                        booking.id
                    );

                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: refundPercentage === 100 ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                            refundAmount: actualRefundAmount,
                            refundDate: new Date(),
                            refundReason: reason || `Booking cancellation (${refundPercentage}% refund)`
                        }
                    });

                    // Update Booking's financial totals
                    await this.prisma.booking.update({
                        where: { id: booking.id },
                        data: {
                            paidAmount: { decrement: actualRefundAmount },
                            paymentStatus: refundPercentage === 100 ? 'UNPAID' : 'PARTIAL'
                        }
                    });
                } else if (payment.razorpayPaymentId) {
                    // Refund via Razorpay
                    await this.paymentsService.processRefund(payment.id, actualRefundAmount, reason || `Booking cancellation (${refundPercentage}% refund)`);
                }
            } catch (refundError) {
                console.error(`[BookingsService] Failed to refund payment ${payment.id}:`, refundError);
            }
        }

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
    async cancelPayment(id: string, reason: string = 'Payment dismissed by user') {
        const booking = await this.prisma.booking.findUnique({ where: { id } });
        if (!booking) throw new NotFoundException('Booking not found');

        if (booking.status !== 'PENDING_PAYMENT') {
            throw new BadRequestException('Can only cancel payment for pending bookings');
        }

        const statusLabel = reason.toLowerCase().includes('fail') ? 'PAYMENT_FAILED' : 'PAYMENT_CANCELLED';

        return this.prisma.booking.update({
            where: { id },
            data: {
                status: statusLabel as any,
                cancelledAt: new Date(),
            },
        });
    }

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
        const entropy = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `BK-${year}${month}${day}-${sequence}-${entropy}`;
    }
}
