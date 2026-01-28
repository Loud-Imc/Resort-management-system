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
exports.EventBookingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let EventBookingsService = class EventBookingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(createEventBookingDto, userId) {
        const event = await this.prisma.event.findUnique({
            where: { id: createEventBookingDto.eventId },
        });
        if (!event) {
            throw new common_1.NotFoundException('Event not found');
        }
        if (!event.isActive || event.status !== 'APPROVED') {
            throw new common_1.BadRequestException('This event is not available for booking');
        }
        const ticketId = `BK-EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;
        const booking = await this.prisma.eventBooking.create({
            data: {
                eventId: event.id,
                userId: userId,
                ticketId: ticketId,
                amountPaid: event.price && !isNaN(parseFloat(event.price)) ? parseFloat(event.price) : 0,
                status: 'PENDING',
                guestName: createEventBookingDto.guestName,
                guestEmail: createEventBookingDto.guestEmail,
                guestPhone: createEventBookingDto.guestPhone,
            },
            include: {
                event: true,
            }
        });
        return booking;
    }
    async findAll(userId) {
        return this.prisma.eventBooking.findMany({
            where: { userId },
            include: { event: true },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, userId) {
        const booking = await this.prisma.eventBooking.findUnique({
            where: { id },
            include: { event: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Booking not found');
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });
        const isSuperAdmin = user?.roles.some(r => r.role.name === 'SuperAdmin');
        if (booking.userId !== userId && !isSuperAdmin) {
            throw new common_1.ForbiddenException('You do not have permission to view this booking');
        }
        return booking;
    }
    async verifyTicket(ticketId, staffUserId) {
        const booking = await this.prisma.eventBooking.findUnique({
            where: { ticketId },
            include: { event: true, user: true },
        });
        if (!booking)
            throw new common_1.NotFoundException('Invalid Ticket ID');
        if (booking.status !== 'PAID')
            throw new common_1.BadRequestException('Ticket has not been paid for');
        if (booking.checkedIn)
            throw new common_1.BadRequestException(`Ticket already used at ${booking.checkInTime}`);
        return this.prisma.eventBooking.update({
            where: { ticketId },
            data: {
                checkedIn: true,
                checkInTime: new Date(),
            }
        });
    }
    async findAllAdmin() {
        return this.prisma.eventBooking.findMany({
            include: {
                event: true,
                user: { select: { firstName: true, lastName: true, email: true } }
            },
            orderBy: { createdAt: 'desc' },
        });
    }
};
exports.EventBookingsService = EventBookingsService;
exports.EventBookingsService = EventBookingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], EventBookingsService);
//# sourceMappingURL=event-bookings.service.js.map