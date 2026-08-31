import { Controller, Get, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/guests')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaGuestsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getGuests(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) return [];

    // Find all bookings with nested guests info for this property
    const bookings = await this.prisma.booking.findMany({
      where: { 
        propertyId: property.id,
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ]
      },
      include: {
        guests: { take: 1 },
      },
    });

    const guestMap = new Map<string, any>();

    bookings.forEach((booking) => {
      const primaryGuest = booking.guests[0];
      const name = primaryGuest ? `${primaryGuest.firstName} ${primaryGuest.lastName || ''}`.trim() : 'Guest';
      const email = primaryGuest?.email || '';
      const phone = primaryGuest?.phone || '';
      
      const key = booking.userId || email || phone;
      if (!key) return;

      if (!guestMap.has(key)) {
        guestMap.set(key, {
          userId: booking.userId,
          name,
          email,
          phone,
          bookingsCount: 0,
          lastBookingDate: booking.createdAt,
        });
      }

      const guest = guestMap.get(key);
      guest.bookingsCount += 1;
      if (new Date(booking.createdAt) > new Date(guest.lastBookingDate)) {
        guest.lastBookingDate = booking.createdAt;
      }
    });

    return Array.from(guestMap.values());
  }

  @Get(':key')
  async getGuestDetails(@Param('key') key: string, @Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) throw new NotFoundException('Property not found');

    // Fetch guest details and their booking history at this property
    const bookings = await this.prisma.booking.findMany({
      where: {
        propertyId: property.id,
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ],
        AND: [
          {
            OR: [
              { userId: key },
              {
                guests: {
                  some: {
                    OR: [
                      { email: key },
                      { phone: key }
                    ]
                  }
                }
              }
            ]
          }
        ]
      },
      include: {
        roomType: { select: { name: true } },
        guests: { take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (bookings.length === 0) {
      throw new NotFoundException('Guest not found for this property');
    }

    const firstBooking = bookings[0];
    const primaryGuest = firstBooking.guests[0];
    const name = primaryGuest ? `${primaryGuest.firstName} ${primaryGuest.lastName || ''}`.trim() : 'Guest';
    const email = primaryGuest?.email || '';
    const phone = primaryGuest?.phone || '';

    return {
      name,
      email,
      phone,
      history: bookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        checkInDate: b.checkInDate,
        checkOutDate: b.checkOutDate,
        status: b.status,
        totalAmount: b.totalAmount,
        roomType: b.roomType?.name || 'Standard Room',
      })),
    };
  }
}
