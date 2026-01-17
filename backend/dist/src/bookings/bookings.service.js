"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const availability_service_1 = require("./availability.service");
const pricing_service_1 = require("./pricing.service");
const audit_service_1 = require("../audit/audit.service");
let BookingsService = class BookingsService {
    prisma;
    availabilityService;
    pricingService;
    auditService;
    constructor(prisma, availabilityService, pricingService, auditService) {
        this.prisma = prisma;
        this.availabilityService = availabilityService;
        this.pricingService = pricingService;
        this.auditService = auditService;
    }
    async create(createBookingDto, userId) {
        const { roomTypeId, checkInDate, checkOutDate, adultsCount, childrenCount, guests, specialRequests, couponCode, bookingSourceId, isManualBooking = false, overrideTotal, overrideReason, } = createBookingDto;
        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);
        let bookingUserId = userId;
        if (userId === 'GUEST_USER') {
            const email = createBookingDto.guestEmail;
            if (!email) {
                throw new common_1.BadRequestException('Guest email is required for public bookings');
            }
            let user = await this.prisma.user.findUnique({
                where: { email },
            });
            if (!user) {
                const password = Math.random().toString(36).slice(-8);
                const customerRole = await this.prisma.role.findFirst({ where: { name: 'Customer' } });
                const roleId = customerRole ? customerRole.id : undefined;
                user = await this.prisma.user.create({
                    data: {
                        email,
                        firstName: createBookingDto.guestName?.split(' ')[0] || 'Guest',
                        lastName: createBookingDto.guestName?.split(' ').slice(1).join(' ') || 'User',
                        phone: createBookingDto.guestPhone,
                        password: 'GUEST_PASSWORD_PLACEHOLDER',
                        roles: roleId ? {
                            create: {
                                role: { connect: { id: roleId } }
                            }
                        } : undefined
                    }
                });
            }
            bookingUserId = user.id;
        }
        const isAvailable = await this.availabilityService.checkAvailability(roomTypeId, checkIn, checkOut);
        if (!isAvailable) {
            throw new common_1.BadRequestException('No rooms available for the selected dates');
        }
        const pricing = await this.pricingService.calculatePrice(roomTypeId, checkIn, checkOut, adultsCount, childrenCount, couponCode);
        let finalTotal = pricing.totalAmount;
        let isPriceOverridden = false;
        if (isManualBooking && overrideTotal !== undefined) {
            if (!this.pricingService.validatePriceOverride(pricing.totalAmount, overrideTotal)) {
                throw new common_1.BadRequestException('Price override is too low');
            }
            finalTotal = overrideTotal;
            isPriceOverridden = true;
        }
        const availableRooms = await this.availabilityService.getAvailableRooms(roomTypeId, checkIn, checkOut);
        if (availableRooms.length === 0) {
            throw new common_1.BadRequestException('No rooms available');
        }
        const selectedRoom = availableRooms[0];
        const bookingNumber = await this.generateBookingNumber();
        let couponId;
        if (couponCode) {
            const coupon = await this.prisma.coupon.findUnique({
                where: { code: couponCode },
            });
            couponId = coupon?.id;
        }
        let commissionAmount = 0;
        let agentId = createBookingDto.agentId;
        if (bookingSourceId) {
            const source = await this.prisma.bookingSource.findUnique({
                where: { id: bookingSourceId }
            });
            if (source?.commission) {
                commissionAmount = (finalTotal * Number(source.commission)) / 100;
            }
        }
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
        if (couponId) {
            await this.prisma.coupon.update({
                where: { id: couponId },
                data: {
                    usedCount: { increment: 1 },
                },
            });
        }
        await this.auditService.createLog({
            action: 'CREATE',
            entity: 'Booking',
            entityId: booking.id,
            userId,
            newValue: booking,
            bookingId: booking.id,
        });
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
    async findAll(filters) {
        return this.prisma.booking.findMany({
            where: {
                status: filters?.status,
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
    async findOne(id) {
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
            throw new common_1.NotFoundException('Booking not found');
        }
        return booking;
    }
    async checkIn(id, userId) {
        const booking = await this.findOne(id);
        if (booking.status !== 'CONFIRMED') {
            throw new common_1.BadRequestException('Only confirmed bookings can be checked in');
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
    async checkOut(id, userId) {
        const booking = await this.findOne(id);
        if (booking.status !== 'CHECKED_IN') {
            throw new common_1.BadRequestException('Only checked-in bookings can be checked out');
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
    async cancel(id, userId, reason) {
        const booking = await this.findOne(id);
        if (!['PENDING_PAYMENT', 'CONFIRMED'].includes(booking.status)) {
            throw new common_1.BadRequestException('Only pending or confirmed bookings can be cancelled');
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
    async updateStatus(id, status, userId) {
        const booking = await this.findOne(id);
        const updated = await this.prisma.booking.update({
            where: { id },
            data: {
                status: status,
                confirmedAt: status === 'CONFIRMED' ? new Date() : booking.confirmedAt,
            },
        });
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
    async generateBookingNumber() {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
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
};
exports.BookingsService = BookingsService;
exports.BookingsService = BookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        availability_service_1.AvailabilityService,
        pricing_service_1.PricingService,
        audit_service_1.AuditService])
], BookingsService);
//# sourceMappingURL=bookings.service.js.map