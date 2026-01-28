import { Injectable, NotFoundException, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventBookingDto } from './dto/create-event-booking.dto';

@Injectable()
export class EventBookingsService {
    constructor(private prisma: PrismaService) { }

    async create(createEventBookingDto: CreateEventBookingDto, userId: string) {
        const event = await this.prisma.event.findUnique({
            where: { id: createEventBookingDto.eventId },
        });

        if (!event) {
            throw new NotFoundException('Event not found');
        }

        if (!event.isActive || event.status !== 'APPROVED') {
            throw new BadRequestException('This event is not available for booking');
        }

        // Generate a unique ticket ID
        const ticketId = `BK-EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

        // For this phase, we auto-approve (simulating successful payment)
        // In reality, this would be PENDING until payment webhook verifies it
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

    async findAll(userId: string) {
        return this.prisma.eventBooking.findMany({
            where: { userId },
            include: { event: true },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string, userId: string) {
        const booking = await this.prisma.eventBooking.findUnique({
            where: { id },
            include: { event: true },
        });

        if (!booking) throw new NotFoundException('Booking not found');

        // Security check: Only the owner or an admin can view details
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: { roles: { include: { role: true } } },
        });

        const isSuperAdmin = user?.roles.some(r => r.role.name === 'SuperAdmin');
        if (booking.userId !== userId && !isSuperAdmin) {
            throw new ForbiddenException('You do not have permission to view this booking');
        }

        return booking;
    }

    async verifyTicket(ticketId: string, staffUserId: string) {
        // Staff/Admin permission check (simulated here, should be in controller)
        const booking = await this.prisma.eventBooking.findUnique({
            where: { ticketId },
            include: { event: true, user: true },
        });

        if (!booking) throw new NotFoundException('Invalid Ticket ID');
        if (booking.status !== 'PAID') throw new BadRequestException('Ticket has not been paid for');
        if (booking.checkedIn) throw new BadRequestException(`Ticket already used at ${booking.checkInTime}`);

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
}
