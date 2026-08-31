import { Controller, Get, Post, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/dashboard')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async getDashboard(@Request() req) {
    const userId = req.user.id;

    const headerPropertyId = req.headers['x-property-id'] as string;
    // 1. Resolve property owned by user
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: userId,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
      include: {
        roomTypes: {
          include: { rooms: true },
        },
        cancellationPolicies: true,
      },
    });

    if (!property) {
      return {
        hasProperty: false,
        setupStatus: {
          hasCoordinates: false,
          hasRoomTypes: false,
          hasRooms: false,
          hasImages: false,
          hasPolicies: false,
          percent: 0,
        },
        stats: {
          totalBookings: 0,
          activeOccupancy: 0,
          totalRevenue: 0,
        },
        recentBookings: [],
        isPmsActive: false,
      };
    }

    // 2. Compute Readiness Checklist
    const hasCoordinates = !!property.latitude && !!property.longitude;
    const hasRoomTypes = property.roomTypes.length > 0;
    const hasRooms = property.roomTypes.some(rt => rt.rooms.length > 0);
    const hasImages = !!property.coverImage && property.images && property.images.length > 0;
    const hasPolicies = property.cancellationPolicies.length > 0;

    const checklistPoints = [hasCoordinates, hasRoomTypes, hasRooms, hasImages, hasPolicies];
    const completedCount = checklistPoints.filter(Boolean).length;
    const percent = Math.round((completedCount / checklistPoints.length) * 100);

    // 3. Retrieve OTA Stats
    const totalBookings = await this.prisma.booking.count({
      where: { 
        propertyId: property.id,
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ]
      },
    });

    const activeStays = await this.prisma.booking.count({
      where: {
        propertyId: property.id,
        status: { in: ['CHECKED_IN', 'RESERVED'] },
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ]
      },
    });

    const revenueAggregation = await this.prisma.booking.aggregate({
      where: {
        propertyId: property.id,
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] },
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ]
      },
      _sum: {
        totalAmount: true,
      },
    });
    const totalRevenue = revenueAggregation._sum.totalAmount ? Number(revenueAggregation._sum.totalAmount) : 0;

    // 4. Recent bookings list
    const recentBookings = await this.prisma.booking.findMany({
      where: { 
        propertyId: property.id,
        OR: [
          { channelName: { in: ['Oreedu', 'Oreedu', 'Oreedu PMS', 'Oreedu PMS'] } },
          { channelName: { startsWith: 'Offline CP:' } },
          { channelName: null }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        roomType: { select: { name: true } },
        guests: { take: 1 },
      },
    });

    return {
      hasProperty: true,
      propertyId: property.id,
      propertyName: property.name,
      propertySlug: property.slug,
      isPmsActive: property.isPmsActive,
      setupStatus: {
        hasCoordinates,
        hasRoomTypes,
        hasRooms,
        hasImages,
        hasPolicies,
        percent,
      },
      stats: {
        totalBookings,
        activeOccupancy: activeStays,
        totalRevenue,
      },
      recentBookings,
    };
  }

  @Post('activate-pms')
  async activatePms(@Request() req) {
    const userId = req.user.id;
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: userId,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });

    if (!property) {
      throw new NotFoundException('No property found to activate PMS for.');
    }

    const updated = await this.prisma.property.update({
      where: { id: property.id },
      data: { isPmsActive: true },
    });

    return {
      success: true,
      isPmsActive: updated.isPmsActive,
      message: 'Oreedu PMS activated successfully!',
    };
  }
}
