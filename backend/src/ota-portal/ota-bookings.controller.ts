import { Controller, Get, Post, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { BookingsService } from '../bookings/bookings.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/bookings')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaBookingsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bookingsService: BookingsService,
  ) {}

  @Get()
  async getBookings(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) return [];

    return this.prisma.booking.findMany({
      where: { 
        propertyId: property.id,
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ]
      },
      orderBy: { createdAt: 'desc' },
      include: {
        roomType: { select: { name: true } },
        guests: true,
      },
    });
  }

  @Get(':id')
  async getBooking(@Param('id') id: string, @Request() req) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        property: true,
        roomType: true,
        guests: true,
      },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isOreeduBooking = 
      !booking.channelName || 
      (booking.channelName.startsWith('Oreedu') || booking.channelName.startsWith('Oreedu')) || 
      booking.channelName.startsWith('Offline CP:');

    if (!booking.property || booking.property.ownerId !== req.user.id || !isOreeduBooking) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }

  @Post(':id/cancel')
  async cancelBooking(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req,
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const isOreeduBooking = 
      !booking.channelName || 
      (booking.channelName.startsWith('Oreedu') || booking.channelName.startsWith('Oreedu')) || 
      booking.channelName.startsWith('Offline CP:');

    if (!booking.property || booking.property.ownerId !== req.user.id || !isOreeduBooking) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return this.bookingsService.cancel(id, req.user, reason);
  }
}
