import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { RoomsService } from '../rooms/rooms.service';
import { AvailabilityService } from '../bookings/availability.service';
import { CreateRoomDto } from '../rooms/dto/room.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/rooms')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaRoomsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomsService: RoomsService,
    private readonly availabilityService: AvailabilityService,
  ) {}

  @Get()
  async getRooms(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) return [];

    return this.roomsService.findAll(req.user, { propertyId: property.id });
  }

  @Post()
  async createRoom(@Body() dto: CreateRoomDto, @Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const roomType = await this.prisma.roomType.findUnique({
      where: { id: dto.roomTypeId },
    });
    if (!roomType || roomType.propertyId !== property.id) {
      throw new ForbiddenException('Room type does not belong to your property');
    }

    return this.roomsService.create(dto, req.user.id);
  }

  @Delete(':id')
  async deleteRoom(@Param('id') id: string, @Request() req) {
    const room = await this.prisma.room.findUnique({
      where: { id },
      include: { roomType: true },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    if (room.roomType.propertyId !== room.propertyId) {
      // Just check ownerId
      const property = await this.prisma.property.findUnique({
        where: { id: room.propertyId },
      });
      if (!property || property.ownerId !== req.user.id) {
        throw new ForbiddenException('You do not own this property');
      }
    } else {
      const headerPropertyId = req.headers['x-property-id'] as string;
      const property = await this.prisma.property.findFirst({
        where: {
          ownerId: req.user.id,
          ...(headerPropertyId ? { id: headerPropertyId } : {}),
        },
      });
      if (!property || room.propertyId !== property.id) {
        throw new ForbiddenException('You do not own this property');
      }
    }

    return this.roomsService.remove(id, req.user);
  }

  @Get('calendar/availability')
  async getAvailability(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }

    const roomTypes = await this.prisma.roomType.findMany({
      where: {
        propertyId: property.id,
        ...(roomTypeId ? { id: roomTypeId } : {}),
      },
    });

    const response: any[] = [];

    for (const rt of roomTypes) {
      const dailyAvailability = await this.availabilityService.getCalendarAvailability(
        property.id,
        startDate,
        endDate,
        rt.id,
        false,
      );

      const dates = {};
      for (const [dateStr, data] of Object.entries(dailyAvailability)) {
        const available = (data as any).available;
        const total = (data as any).total;
        const booked = Math.max(0, total - available);

        dates[dateStr] = {
          available,
          total,
          booked,
        };
      }

      response.push({
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        dates,
      });
    }

    return response;
  }
}
