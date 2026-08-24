import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRoomMappingDto } from '../dto/create-room-mapping.dto';

@Injectable()
export class ConnectivityMappingService {
  private readonly logger = new Logger(ConnectivityMappingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateRoomMapping(partnerId: string, propertyId: string, dto: CreateRoomMappingDto) {
    // 1. Find active connection for this partner & property
    const connection = await this.prisma.connectivityPartnerConnection.findUnique({
      where: {
        partnerId_propertyId: { partnerId, propertyId },
      },
    });

    if (!connection) {
      throw new NotFoundException(`No active property connection found for partner ${partnerId} and property ${propertyId}`);
    }

    // 2. Validate roomTypeId belongs to this property
    const roomType = await this.prisma.roomType.findFirst({
      where: { id: dto.roomTypeId, propertyId },
    });

    if (!roomType) {
      throw new BadRequestException(`RoomType ${dto.roomTypeId} does not exist on Property ${propertyId}`);
    }

    // 3. Upsert RoomType mapping
    const mapping = await this.prisma.connectivityRoomTypeMapping.upsert({
      where: {
        connectionId_roomTypeId: {
          connectionId: connection.id,
          roomTypeId: dto.roomTypeId,
        },
      },
      update: {
        externalRoomTypeId: dto.externalRoomTypeId,
        externalRatePlanId: dto.externalRatePlanId || null,
      },
      create: {
        connectionId: connection.id,
        roomTypeId: dto.roomTypeId,
        externalRoomTypeId: dto.externalRoomTypeId,
        externalRatePlanId: dto.externalRatePlanId || null,
      },
      include: {
        roomType: {
          select: { id: true, name: true, basePrice: true },
        },
      },
    });

    this.logger.log(`Mapped RoomType [${roomType.name}] ➔ External RoomType ID [${dto.externalRoomTypeId}] for Connection [${connection.id}]`);
    return mapping;
  }

  async getRoomMappingsForConnection(partnerId: string, propertyId: string) {
    const connection = await this.prisma.connectivityPartnerConnection.findUnique({
      where: {
        partnerId_propertyId: { partnerId, propertyId },
      },
      include: {
        roomMappings: {
          include: {
            roomType: {
              select: { id: true, name: true, basePrice: true, maxAdults: true, maxChildren: true },
            },
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException(`No active property connection found for partner ${partnerId} and property ${propertyId}`);
    }

    return connection.roomMappings;
  }

  async deleteRoomMapping(partnerId: string, propertyId: string, roomTypeId: string) {
    const connection = await this.prisma.connectivityPartnerConnection.findUnique({
      where: { partnerId_propertyId: { partnerId, propertyId } },
    });

    if (!connection) {
      throw new NotFoundException(`No active connection found`);
    }

    const mapping = await this.prisma.connectivityRoomTypeMapping.findUnique({
      where: {
        connectionId_roomTypeId: { connectionId: connection.id, roomTypeId },
      },
    });

    if (!mapping) {
      throw new NotFoundException(`No mapping found for RoomType ${roomTypeId}`);
    }

    return this.prisma.connectivityRoomTypeMapping.delete({
      where: { id: mapping.id },
    });
  }
}
