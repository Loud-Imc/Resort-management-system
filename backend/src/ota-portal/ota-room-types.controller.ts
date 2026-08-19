import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../prisma/prisma.service';
import { RoomTypesService } from '../room-types/room-types.service';
import { CreateRoomTypeDto } from '../room-types/dto/create-room-type.dto';
import { UpdateRoomTypeDto } from '../room-types/dto/update-room-type.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@Controller('ota-portal/room-types')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class OtaRoomTypesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roomTypesService: RoomTypesService,
  ) {}

  @Get()
  async getRoomTypes(@Request() req) {
    const headerPropertyId = req.headers['x-property-id'] as string;
    const property = await this.prisma.property.findFirst({
      where: {
        ownerId: req.user.id,
        ...(headerPropertyId ? { id: headerPropertyId } : {}),
      },
    });
    if (!property) return [];

    return this.roomTypesService.findAll(false, property.id);
  }

  @Post()
  async createRoomType(@Body() dto: CreateRoomTypeDto, @Request() req) {
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

    // Force propertyId to be the owner's property
    dto.propertyId = property.id;
    return this.roomTypesService.create(dto, req.user);
  }

  @Put(':id')
  async updateRoomType(
    @Param('id') id: string,
    @Body() dto: UpdateRoomTypeDto,
    @Request() req,
  ) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    if (roomType.property.ownerId !== req.user.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return this.roomTypesService.update(id, dto, req.user);
  }

  @Delete(':id')
  async deleteRoomType(@Param('id') id: string, @Request() req) {
    const roomType = await this.prisma.roomType.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!roomType) {
      throw new NotFoundException('Room type not found');
    }

    if (roomType.property.ownerId !== req.user.id) {
      throw new ForbiddenException('You do not own this property');
    }

    return this.roomTypesService.remove(id, req.user);
  }
}
