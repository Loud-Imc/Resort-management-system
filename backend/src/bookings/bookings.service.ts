import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { normalizePhone } from '../common/utils/phone';
import { AuditService } from '../audit/audit.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import { PaymentsService } from '../payments/payments.service';
import { differenceInDays, format, addDays, differenceInHours } from 'date-fns';
import { CreateBookingDto } from './dto/create-booking.dto';
import { TrackBookingDto } from './dto/track-booking.dto';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron } from '@nestjs/schedule';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class BookingsService {
    private readonly logger = new Logger(BookingsService.name);
    constructor(
        private prisma: PrismaService,
        private availabilityService: AvailabilityService,
        private pricingService: PricingService,
        private auditService: AuditService,
        private channelPartnersService: ChannelPartnersService,
        private paymentsService: PaymentsService,
        private notificationsService: NotificationsService,
        private systemSettings: SystemSettingsService,
    ) { }

    /**
     * Create a new booking (manual or online)
     */
    async create(createBookingDto: CreateBookingDto, user: any) {
        let {
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
            isManualBooking: isManualInput = false,
            overrideTotal,
            overrideReason,
            whatsappNumber,
            isGroupBooking: isGroupInput = false,
            groupSize,
            selectedRoomIds,
            generalCode,
            transactionDate,
            isHistoricalEntry,
        } = createBookingDto;

        let isManualBooking = isManualInput;
        let isGroupBooking = isGroupInput;
        const rawBookingSourceId_val = rawBookingSourceId;

        let isAuthorizedStaff = false;
        const userId = user?.id || 'GUEST_USER';

        if (user && user.id) {
            const roles = user.roles || [];
            if (roles.includes('SuperAdmin') || roles.includes('Admin')) {
                isAuthorizedStaff = true;
            } else {
                // Resolve the property to check if the user is owner or staff
                let propertyForAuth: { ownerId: string; staff: { userId: string }[] } | null = null;

                if (isGroupBooking && (createBookingDto as any).propertyId) {
                    // Group booking — look up property directly
                    propertyForAuth = await this.prisma.property.findUnique({
                        where: { id: (createBookingDto as any).propertyId },
                        select: { ownerId: true, staff: { select: { userId: true } } }
                    });
                } else if (roomTypeId) {
                    // Standard booking — look up property via room type
                    const roomType = await this.prisma.roomType.findUnique({
                        where: { id: roomTypeId },
                        select: { property: { select: { ownerId: true, staff: { select: { userId: true } } } } }
                    });
                    propertyForAuth = roomType?.property ?? null;
                }

                if (propertyForAuth) {
                    const isOwner = propertyForAuth.ownerId === user.id;
                    const isStaff = propertyForAuth.staff.some(s => s.userId === user.id);
                    if (isOwner || isStaff) {
                        isAuthorizedStaff = true;
                    }
                }
            }
        }

        const isCP = user?.roles?.includes('ChannelPartner');

        if (!isAuthorizedStaff) {
            isManualBooking = false;
            overrideTotal = undefined;
            overrideReason = undefined;
            // Allow ChannelPartners to use WALLET, but guests/other roles are forced to ONLINE
            if (createBookingDto.paymentMethod === 'WALLET' && !isCP) {
                createBookingDto.paymentMethod = 'ONLINE';
            }
        }

        const bookingSourceId = rawBookingSourceId || undefined;
        const agentId = createBookingDto.agentId || undefined;
        const paidAmountInput = createBookingDto.paidAmount;

        const checkIn = new Date(checkInDate);
        checkIn.setHours(0, 0, 0, 0);
        const checkOut = new Date(checkOutDate);
        checkOut.setHours(0, 0, 0, 0);

        // Handle Guest User Creation
        const lowercaseEmail = createBookingDto.guestEmail?.trim().toLowerCase() || null;
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

        // 2. Check availability (standard booking only — group bookings validate via allocateRoomsForGroup below)
        if (!isGroupBooking) {
            const isAvailable = await this.availabilityService.checkAvailability(roomTypeId!, checkIn, checkOut);
            if (!isAvailable) {
                throw new BadRequestException('No rooms available for the selected dates');
            }
        }

        if (isGroupBooking && groupSize) {
            const activePropertyId = (createBookingDto as any).propertyId;
            if (!activePropertyId) {
                throw new BadRequestException('Property ID is required for group bookings');
            }
            const property = await this.prisma.property.findUnique({
                where: { id: activePropertyId },
                select: { allowsGroupBooking: true }
            });

            if (!property?.allowsGroupBooking) {
                throw new BadRequestException('This property does not support group bookings');
            }
        }

        // 3. Calculate pricing (standard bookings only — group bookings price after room allocation)
        let pricing: any;
        // Determine room count for pricing
        const roomCount = (selectedRoomIds && selectedRoomIds.length > 0)
            ? selectedRoomIds.length
            : 1;

        if (!isGroupBooking) {
            pricing = await this.pricingService.calculatePrice(
                roomTypeId!,
                checkIn,
                checkOut,
                adultsCount,
                childrenCount,
                couponCode,
                referralCode,
                createBookingDto.currency || 'INR',
                isGroupBooking,
                groupSize,
                (selectedRoomIds?.length || 1),
                generalCode,
                overrideTotal,
                createBookingDto.isOverrideInclusive ?? true,
            );
        }

        let finalTotal = pricing?.totalAmount ?? 0;

        // 3.1 Handle Group Room Allocation across Multiple Rooms
        let allocatedRooms: any[] = [];
        if (isGroupBooking && groupSize) {
            let activePropertyId: string;

            // For group bookings: always prefer the explicit propertyId sent by the frontend.
            // Do NOT use roomTypeId here — it may be a stale standard room type not in the group pool.
            if ((createBookingDto as any).propertyId) {
                activePropertyId = (createBookingDto as any).propertyId;
            } else if (roomTypeId) {
                const baseRoomType = await this.prisma.roomType.findUnique({
                    where: { id: roomTypeId },
                    select: { propertyId: true }
                });
                if (!baseRoomType) throw new NotFoundException('Room type not found');
                activePropertyId = baseRoomType.propertyId;
            } else {
                throw new BadRequestException('Property ID is required for group booking');
            }

            allocatedRooms = await this.availabilityService.allocateRoomsForGroup(
                activePropertyId,
                checkIn,
                checkOut,
                groupSize
            );

            if (allocatedRooms.length === 0) {
                throw new BadRequestException(`Not enough capacity in the group pool for ${groupSize} guests.`);
            }

            // Use the first allocated room's type as the delegate room type for pricing
            roomTypeId = allocatedRooms[0].roomTypeId;
            pricing = await this.pricingService.calculatePrice(
                roomTypeId!,
                checkIn,
                checkOut,
                adultsCount,
                childrenCount,
                couponCode,
                referralCode,
                createBookingDto.currency || 'INR',
                isGroupBooking,
                groupSize,
                (selectedRoomIds?.length || allocatedRooms?.length || 1),
                generalCode,
                overrideTotal,
                createBookingDto.isOverrideInclusive ?? true,
            );
            finalTotal = pricing.totalAmount;
        }

        let isPriceOverridden = false;
        if (isManualBooking && overrideTotal !== undefined) {
            if (!this.pricingService.validatePriceOverride(pricing.totalAmount, overrideTotal)) {
                // Note: since pricing.totalAmount might already be the overridden one, 
                // this validation should ideally have used the original total, 
                // but let's assume it's safe enough or validation happens in PricingService
                // throw new BadRequestException('Price override is too low');
            }
            finalTotal = pricing.totalAmount;
            isPriceOverridden = true;
        }

        // 5. Get an available room
        let selectedRooms: any[] = [];
        if (isGroupBooking && allocatedRooms.length > 0) {
            selectedRooms = allocatedRooms;
        } else {
            if (selectedRoomIds && selectedRoomIds.length > 0) {
                // Fetch all specifically selected rooms
                selectedRooms = await this.prisma.room.findMany({
                    where: { id: { in: selectedRoomIds } },
                    include: { roomType: true },
                });

                if (selectedRooms.length !== selectedRoomIds.length) {
                    throw new BadRequestException('One or more selected rooms were not found');
                }

                if (selectedRooms.some(r => r.roomTypeId !== roomTypeId)) {
                    throw new BadRequestException('One or more selected rooms do not match the selected room type');
                }
            } else if (roomId) {
                const sr = await this.prisma.room.findUnique({
                    where: { id: roomId },
                    include: { roomType: true },
                });
                if (!sr || sr.roomTypeId !== roomTypeId) {
                    throw new BadRequestException('Selected room is not available for this room type');
                }
                selectedRooms = [sr];
            } else {
                // Auto-allocate
                const availableRooms = await this.availabilityService.getAvailableRooms(roomTypeId!, checkIn, checkOut);
                if (availableRooms.length === 0) throw new BadRequestException('No rooms available for these dates');
                selectedRooms = [availableRooms[0]];
            }
        }

        const selectedRoom = selectedRooms[0];
        const extraRoomIds = selectedRooms.slice(1).map(r => r.id);

        // 6. Resolve IDs and generation logic
        const bookingNumber = await this.generateBookingNumber();
        let couponId: string | undefined;
        if (couponCode || (generalCode && pricing.couponDiscountAmount > 0)) {
            const effectiveCoupon = couponCode || (generalCode as string).trim().toUpperCase();
            const coupon = await this.prisma.coupon.findUnique({ where: { code: effectiveCoupon } });
            couponId = coupon?.id;
            // Ensure couponCode is set for DB storage if it was resolved from generalCode
            if (!couponCode) couponCode = effectiveCoupon;
        }

        let channelPartnerId: string | undefined;
        let cpCommission = 0;
        if (referralCode || (generalCode && pricing.referralDiscountAmount > 0)) {
            const effectiveReferral = referralCode || (generalCode as string).trim().toUpperCase();
            const cp = await this.prisma.channelPartner.findFirst({
                where: { referralCode: effectiveReferral, status: 'APPROVED' as any },
            });

            if (cp) {
                channelPartnerId = cp.id;
                // Ensure referralCode is set for DB storage if it was resolved from generalCode
                if (!referralCode) referralCode = effectiveReferral;

                // Get propertyId to resolve priority
                const baseRoomType = await this.prisma.roomType.findUnique({
                    where: { id: roomTypeId as string },
                    select: { propertyId: true }
                });
                const propertyId = baseRoomType?.propertyId || (createBookingDto as any).propertyId;

                const { rate } = await this.channelPartnersService.getCommissionRate({
                    channelPartnerId: cp.id,
                    propertyId
                });

                const commissionableAmount = pricing.totalAmount - pricing.taxAmount;
                cpCommission = (commissionableAmount * rate) / 100;
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
            // 7.1 Resolve the booking user
            let finalBookingUserId = bookingUserId;
            const normalizedPhone = normalizePhone(createBookingDto.guestPhone) || null;

            // If it's a manual booking or a guest checkout, we MUST find or create the guest user
            if (isManualBooking || userId === 'GUEST_USER') {
                let guestUser = await tx.user.findFirst({
                    where: {
                        OR: [
                            ...(lowercaseEmail ? [{ email: lowercaseEmail }] : []),
                            ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
                        ],
                    },
                });

                if (!guestUser) {
                    console.log(`[BookingsService] [TX] Guest user not found for ${lowercaseEmail || normalizedPhone}. Creating...`);
                    const customerRole = await tx.role.findFirst({ where: { name: 'Customer' } });
                    const roleId = customerRole ? customerRole.id : undefined;

                    guestUser = await tx.user.create({
                        data: {
                            email: lowercaseEmail,
                            firstName: createBookingDto.guestName?.split(' ')[0] || 'Guest',
                            lastName: createBookingDto.guestName?.split(' ').slice(1).join(' ') || 'User',
                            phone: normalizedPhone,
                            whatsappNumber: createBookingDto.whatsappNumber,
                            password: await bcrypt.hash('GUEST_PASSWORD_PLACEHOLDER', 10),
                            createdById: userId !== 'GUEST_USER' ? userId : undefined,
                            roles: roleId ? {
                                create: {
                                    role: { connect: { id: roleId } }
                                }
                            } : undefined
                        } as any
                    });
                }
                finalBookingUserId = guestUser.id;
            } else {
                // For authenticated users booking for themselves (public logged-in), update their profile if data is missing
                const currentUser = await tx.user.findUnique({ where: { id: userId } });
                if (currentUser) {
                    const updateData: any = {};
                    if (!currentUser.firstName) updateData.firstName = createBookingDto.guestName?.split(' ')[0];
                    if (!currentUser.lastName) updateData.lastName = createBookingDto.guestName?.split(' ').slice(1).join(' ');
                    if (!currentUser.email && lowercaseEmail) updateData.email = lowercaseEmail;
                    if (!currentUser.whatsappNumber) updateData.whatsappNumber = createBookingDto.whatsappNumber;

                    if (Object.keys(updateData).length > 0) {
                        console.log(`[BookingsService] [TX] Updating profile for logged-in user ${userId}:`, updateData);
                        await tx.user.update({
                            where: { id: userId },
                            data: updateData
                        });
                    }
                }
            }

            // 7.2 Deduct from wallet if applicable
            let walletTxId: string | undefined;
            if (createBookingDto.paymentMethod === 'WALLET' && channelPartnerId) {
                const totalToCollect = finalTotal - cpCommission;
                walletTxId = await this.channelPartnersService.deductWalletBalance(
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
                // To prevent PostgreSQL deadlocks, we must sort the rooms by ID before locking
                // This ensures all concurrent transactions lock rooms in the exact same deterministic order
                const roomsToLock = [...allocatedRooms].sort((a, b) => a.id.localeCompare(b.id));

                // Lock ALL allocated rooms for group booking
                for (const room of roomsToLock) {
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
                // Lock the explicitly selected rooms (plural) for standard booking
                const roomsToLock = [...selectedRooms].sort((a, b) => a.id.localeCompare(b.id));
                for (const room of roomsToLock) {
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
            const effectiveCreatedAt = transactionDate ? new Date(transactionDate) : new Date();

            const newBooking = await tx.booking.create({
                data: {
                    createdAt: effectiveCreatedAt,
                    updatedAt: effectiveCreatedAt,
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
                    gstNumber: createBookingDto.gstNumber,
                    isManualBooking,
                    paymentOption: createBookingDto.paymentOption || 'FULL',
                    status: (isManualBooking || createBookingDto.paymentMethod === 'WALLET') ? 'CONFIRMED' : 'PENDING_PAYMENT',
                    roomId: selectedRoom.id,
                    roomTypeId: roomTypeId!,
                    propertyId: selectedRoom.propertyId,
                    userId: finalBookingUserId,
                    bookingSourceId,
                    agentId,
                    commissionAmount,
                    channelPartnerId,
                    cpCommission,
                    cpDiscount: pricing.referralDiscountAmount,
                    commissionableAmount: pricing.totalAmount - pricing.taxAmount,
                    couponId,
                    couponCode: couponId ? couponCode : null, // Store the code string
                    paidAmount: (isManualBooking || createBookingDto.paymentMethod === 'WALLET')
                        ? (paidAmountInput !== undefined ? Number(paidAmountInput) : (createBookingDto.paymentOption === 'PARTIAL' ? 0 : finalTotal))
                        : 0,
                    paymentStatus: (isManualBooking || createBookingDto.paymentMethod === 'WALLET')
                        ? ((paidAmountInput !== undefined ? Number(paidAmountInput) : (createBookingDto.paymentOption === 'PARTIAL' ? 0 : finalTotal)) >= finalTotal - 0.01 ? 'FULL' : (Number(paidAmountInput) > 0 ? 'PARTIAL' : 'UNPAID'))
                        : 'UNPAID',
                    confirmedAt: (isManualBooking || createBookingDto.paymentMethod === 'WALLET') ? effectiveCreatedAt : null,
                    paymentMethod: createBookingDto.paymentMethod as any,
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
                    property: {
                        include: {
                            owner: true
                        }
                    },
                    room: true,
                    roomType: {
                        include: {
                            cancellationPolicy: true,
                            property: true,
                        }
                    },
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

            // 7.4 Update coupon usage with row-level lock
            if (couponId) {
                // Lock row to prevent highly concurrent "last use" abuse
                await tx.$queryRaw`SELECT id FROM coupons WHERE id = ${couponId} FOR UPDATE`;
                const lockedCoupon = await tx.coupon.findUnique({ where: { id: couponId } });

                if (lockedCoupon && lockedCoupon.maxUses && lockedCoupon.usedCount >= lockedCoupon.maxUses) {
                    throw new BadRequestException('Coupon usage limit reached during checkout. Please remove the coupon to proceed.');
                }

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
                const finalPaidAmount = (isManualBooking || createBookingDto.paymentMethod === 'WALLET')
                    ? (paidAmountInput !== undefined ? Number(paidAmountInput) : (createBookingDto.paymentOption === 'PARTIAL' ? 0 : finalTotal))
                    : 0;

                // CP Rewards processing (MOVED TO CHECK-IN STAGE)
                if (channelPartnerId) {
                    const isWalletPayment = createBookingDto.paymentMethod === 'WALLET';
                    // NO AUTOMATIC COMMISSION CREATION HERE
                    // ONLY LINK WALLET TRANSACTION IF NEEDED

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
                        const paymentRecord = await tx.payment.create({
                            data: {
                                createdAt: effectiveCreatedAt,
                                updatedAt: effectiveCreatedAt,
                                amount: finalPaidAmount - cpCommission, // For wallet, we deduct CP commission at source
                                status: 'PAID',
                                paymentMethod: 'WALLET',
                                paymentDate: effectiveCreatedAt,
                                bookingId: newBooking.id,
                                currency: 'INR',
                            },
                        });

                        // Link CP Transaction to Payment ID for strict refund tracking
                        if (walletTxId) {
                            await tx.cPTransaction.update({
                                where: { id: walletTxId },
                                data: { referenceId: paymentRecord.id }
                            });
                        }

                        // Income record
                        await tx.income.create({
                            data: {
                                createdAt: effectiveCreatedAt,
                                updatedAt: effectiveCreatedAt,
                                date: effectiveCreatedAt,
                                amount: finalPaidAmount,
                                source: 'ONLINE_BOOKING',
                                description: `Booking ${bookingNumber} (Wallet Payment)`,
                                bookingId: newBooking.id,
                                propertyId: newBooking.propertyId,
                                paymentId: paymentRecord.id
                            },
                        });
                    }
                }

                // Handle manual payment (Cash, UPI, etc.)
                if (isManualBooking && finalPaidAmount > 0) {
                    const pMethod = createBookingDto.paymentMethod || 'CASH';
                    const commissionRate = Number((newBooking as any).roomType?.property?.platformCommission
                        ?? await this.systemSettings.getSetting('DEFAULT_PLATFORM_COMMISSION')
                        ?? 10);
                    const platformFee = (finalPaidAmount * commissionRate) / 100;
                    const netAmount = finalPaidAmount - platformFee;

                    const paymentRecord = await tx.payment.create({
                        data: {
                            createdAt: effectiveCreatedAt,
                            updatedAt: effectiveCreatedAt,
                            amount: finalPaidAmount,
                            status: 'PAID',
                            paymentMethod: pMethod as any,
                            paymentDate: effectiveCreatedAt,
                            bookingId: newBooking.id,
                            currency: 'INR',
                            platformFee: 0,
                            netAmount: finalPaidAmount,
                            commissionRate: 0,
                            payoutStatus: 'PAID',
                            notes: `At-creation manual payment: ${pMethod} (Zero Platform Fee)`
                        },
                    });

                    // Income record (linked to payment)
                    await tx.income.create({
                        data: {
                            createdAt: effectiveCreatedAt,
                            updatedAt: effectiveCreatedAt,
                            date: effectiveCreatedAt,
                            amount: finalPaidAmount,
                            source: 'ROOM_BOOKING',
                            description: `Manual booking payment for ${bookingNumber} (${pMethod})`,
                            bookingId: newBooking.id,
                            paymentId: paymentRecord.id,
                            propertyId: newBooking.propertyId,
                        },
                    });
                }
            }

            // 7.7 If Group Booking OR Multiple selected rooms, block extra rooms
            const roomsToBlock = isGroupBooking ? allocatedRooms.slice(1) : selectedRooms.slice(1);
            if (roomsToBlock.length > 0) {
                for (const room of roomsToBlock) {
                    await tx.roomBlock.create({
                        data: {
                            roomId: room.id,
                            startDate: checkIn,
                            endDate: checkOut,
                            reason: isGroupBooking ? `Group Booking ${bookingNumber}` : `Multi-Room Booking ${bookingNumber}`,
                            notes: `Automatically blocked for booking ${newBooking.id}`,
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
        hasSettlement?: boolean;
    }) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');
        const isCP = roles.includes('ChannelPartner');

        const where: any = {
            status: filters?.status as any,
            checkInDate: filters?.checkInDate ? { gte: filters.checkInDate } : undefined,
            checkOutDate: filters?.checkOutDate ? { lte: filters.checkOutDate } : undefined,
            roomTypeId: filters?.roomTypeId,
            propertyId: filters?.propertyId,
        };

        if (filters?.hasSettlement !== undefined) {
            if (filters.hasSettlement) {
                where.propertySettlement = { isNot: null };
            } else {
                where.propertySettlement = { is: null };
            }
        }

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
                property: true,
                roomBlocks: {
                    include: {
                        room: {
                            include: {
                                roomType: true
                            }
                        }
                    }
                },
                payments: { where: { status: 'PAID' } },
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

    async trackBooking(dto: TrackBookingDto) {
        const bookingNumber = dto.bookingNumber.trim().replace(/^#/, '');
        const input = dto.emailOrPhone.trim();
        const isEmail = input.includes('@');
        const normalizedEmail = input.toLowerCase();
        const normalizedPhoneInput = isEmail ? '' : normalizePhone(input);

        const booking = await this.prisma.booking.findFirst({
            where: { bookingNumber },
            include: {
                room: { include: { roomType: true } },
                roomType: { include: { cancellationPolicy: true } },
                guests: true,
                property: { include: { defaultCancellationPolicy: true } },
                user: {
                    select: {
                        id: true,
                        email: true,
                        phone: true,
                        firstName: true,
                        lastName: true,
                    },
                },
                payments: {
                    orderBy: { createdAt: 'desc' }
                }
            },
        });

        if (!booking) {
            throw new NotFoundException('Booking not found with this number');
        }

        // Security check: verify email or phone
        const matchesUserEmail = booking.user?.email?.toLowerCase() === normalizedEmail;
        const matchesUserPhone = !!(normalizedPhoneInput && booking.user?.phone === normalizedPhoneInput);
        const matchesGuestEmail = booking.guests.some(g => g.email?.toLowerCase() === normalizedEmail);
        const matchesGuestPhone = !!(normalizedPhoneInput && booking.guests.some(g => g.phone === normalizedPhoneInput));

        if (!matchesUserEmail && !matchesUserPhone && !matchesGuestEmail && !matchesGuestPhone) {
            throw new BadRequestException('Security verification failed. Please check the email or phone number associated with this booking.');
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
            const isChannelPartner = (booking as any).channelPartnerId ? (await this.prisma.channelPartner.findUnique({ where: { id: (booking as any).channelPartnerId } }))?.userId === user.id : false;

            isAuthorizedMember = !!(isOwner || isStaff || isChannelPartner);

            if (!isOwner && !isStaff && booking.userId !== user.id && !isChannelPartner) {
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

        // Logic Check: Guests must complete full payment before check-in
        const isPaidInFull = booking.paymentStatus === 'FULL' || Number(booking.paidAmount) >= Number(booking.totalAmount) - 0.01;
        if (!isPaidInFull) {
            throw new BadRequestException(`Cannot check in. Booking has a pending balance of ₹${(Number(booking.totalAmount) - Number(booking.paidAmount)).toLocaleString('en-IN')}. Please record full payment first.`);
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

        return await this.prisma.$transaction(async (tx) => {
            const updated = await tx.booking.update({
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
            await tx.room.update({
                where: { id: booking.roomId },
                data: { status: 'OCCUPIED' },
            });

            // Trigger referral commission (Single trigger stage)
            // Refined Rule: Must be BOTH CHECKED_IN and FULLY_PAID
            if (booking.channelPartnerId) {
                if (updated.paymentStatus === 'FULL') {
                    await this.channelPartnersService.processReferralCommission(
                        booking.id,
                        booking.channelPartnerId,
                        Number(booking.totalAmount),
                        tx,
                        'MANUAL_CHECKIN'
                    );
                } else {
                    this.logger.log(`[Commission][MANUAL_CHECKIN] Booking ${booking.bookingNumber} checked in but paymentStatus is ${updated.paymentStatus}. Payout will trigger upon full payment.`);
                }
            }

            await this.auditService.createLog({
                action: 'CHECK_IN',
                entity: 'Booking',
                entityId: id,
                userId: user.id,
                oldValue: { status: booking.status },
                newValue: { status: 'CHECK_IN' },
                bookingId: id,
            }, tx);

            // Notify guest of check-in
            await this.notificationsService.notifyCheckIn(updated);

            return updated;
        });
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

        const { updated, couponRestored } = await this.prisma.$transaction(async (tx) => {
            const up = await tx.booking.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                },
                include: {
                    room: true,
                    roomType: true,
                    guests: true,
                    coupon: true,
                },
            });

            // Restore coupon usage if applicable
            let restored = false;
            if (up.couponId) {
                await tx.coupon.update({
                    where: { id: up.couponId },
                    data: { usedCount: { decrement: 1 } }
                });
                restored = true;
            }

            // Release ALL room blocks for this booking (including group booking extra rooms)
            await tx.roomBlock.deleteMany({
                where: { bookingId: id },
            });

            await this.auditService.createLog({
                action: 'CANCEL',
                entity: 'Booking',
                entityId: id,
                userId: user.id,
                oldValue: { status: booking.status },
                newValue: { status: 'CANCELLED', reason, couponRestored: restored },
                bookingId: id,
            }, tx);

            return { updated: up, couponRestored: restored };
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
                        payment.id // Use Payment ID as referenceId (idempotency key)
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

                    await this.prisma.booking.update({
                        where: { id: booking.id },
                        data: {
                            paidAmount: { decrement: actualRefundAmount },
                            paymentStatus: refundPercentage === 100 ? 'UNPAID' : 'PARTIAL'
                        }
                    });
                } else if (payment.razorpayPaymentId) {
                    // Refund via Razorpay — call requestRefund (Maker-Checker enforced)
                    await this.paymentsService.requestRefund(user, payment.id, actualRefundAmount, reason || `Booking cancellation (${refundPercentage}% refund)`);
                } else {
                    // Manual payment (CASH, UPI, bank transfer) — record refund for accounting
                    await this.prisma.payment.update({
                        where: { id: payment.id },
                        data: {
                            status: refundPercentage === 100 ? 'REFUNDED' : 'PARTIALLY_REFUNDED',
                            refundAmount: actualRefundAmount,
                            refundDate: new Date(),
                            refundReason: reason || `Manual refund pending (${refundPercentage}% of ${payment.paymentMethod} payment)`
                        }
                    });

                    await this.prisma.booking.update({
                        where: { id: booking.id },
                        data: {
                            paidAmount: { decrement: actualRefundAmount },
                            paymentStatus: refundPercentage === 100 ? 'UNPAID' : 'PARTIAL'
                        }
                    });
                }
            } catch (refundError) {
                console.error(`[BookingsService] Failed to refund payment ${payment.id}:`, refundError);
            }
        }

        // Re-assert CANCELLED status after all refunds to prevent requestRefund from overwriting it
        await this.prisma.booking.update({
            where: { id },
            data: { status: 'CANCELLED' },
        });

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

        // Income record creation is now handled exclusively by PaymentsService (on successful transaction)
        // or through manual Income records, to avoid double-counting.

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

    /**
     * Cron job: Expire stale PENDING_PAYMENT bookings every 5 minutes.
     * Bookings older than 30 minutes in PENDING_PAYMENT status are cancelled
     * and their rooms are released.
     */
    @Cron('0 */5 * * * *')
    async expireStaleBookings() {
        const thirtyMinutesAgo = new Date();
        thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

        const staleBookings = await this.prisma.booking.findMany({
            where: {
                status: 'PENDING_PAYMENT',
                createdAt: { lt: thirtyMinutesAgo },
            },
            select: { id: true, bookingNumber: true, roomId: true, couponId: true },
        });

        if (staleBookings.length === 0) return;

        this.logger.log(`[ExpiryCron] Found ${staleBookings.length} stale PENDING_PAYMENT booking(s). Expiring...`);

        for (const booking of staleBookings) {
            try {
                await this.prisma.$transaction(async (tx) => {
                    // 1. Mark booking as EXPIRED
                    const updatedBooking = await tx.booking.update({
                        where: { id: booking.id },
                        data: {
                            status: 'CANCELLED',
                            cancelledAt: new Date(),
                        },
                    });

                    // 1.1 Restore coupon usage
                    if ((booking as any).couponId) {
                        await tx.coupon.update({
                            where: { id: (booking as any).couponId },
                            data: { usedCount: { decrement: 1 } }
                        });
                    }

                    // 2. Release ALL room blocks for this booking (including group extras)
                    await tx.roomBlock.deleteMany({
                        where: { bookingId: booking.id },
                    });

                    // 3. Mark any PENDING payment records as EXPIRED
                    await tx.payment.updateMany({
                        where: {
                            bookingId: booking.id,
                            status: 'PENDING',
                        },
                        data: { status: 'FAILED' },
                    });
                });

                this.logger.log(`[ExpiryCron] Expired booking ${booking.bookingNumber} (${booking.id})`);
            } catch (error) {
                this.logger.error(`[ExpiryCron] Failed to expire booking ${booking.bookingNumber}: ${error.message}`);
            }
        }
    }

    /**
     * Auto-finalization fallback for commissions.
     * Processes bookings that are CHECKED_IN and FULL but missed the initial trigger.
     */
    @Cron('0 */30 * * * *') // Every 30 minutes
    async finalizePendingCommissions() {
        this.logger.log('[Commission][Cron] Checking for finalized bookings pending commission...');

        const pendingBookings = await this.prisma.booking.findMany({
            where: {
                status: 'CHECKED_IN',
                paymentStatus: 'FULL',
                channelPartnerId: { not: null },
                cpTransactions: {
                    none: { type: 'COMMISSION' }
                }
            } as any,
            include: { channelPartner: true }
        });

        if (pendingBookings.length === 0) return;

        this.logger.log(`[Commission][Cron] Found ${pendingBookings.length} bookings to finalize.`);

        for (const booking of pendingBookings) {
            try {
                await this.channelPartnersService.processReferralCommission(
                    booking.id,
                    booking.channelPartnerId as string,
                    Number(booking.totalAmount),
                    undefined,
                    'AUTO_FINALIZATION'
                );
                this.logger.log(`[Commission][AUTO_FINALIZATION] Finalized commission for ${booking.bookingNumber}`);
            } catch (error) {
                this.logger.error(`[Commission][AUTO_FINALIZATION] Failed for ${booking.bookingNumber}: ${error.message}`);
            }
        }
    }
}
