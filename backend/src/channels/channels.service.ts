import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { IChannelAdapter, InventoryUpdateDto, RateUpdateDto } from './interfaces/channel-adapter.interface';
import { ChannexAdapter } from './adapters/channex.adapter';
import { MockAdapter } from './adapters/mock.adapter';
import { format, addDays } from 'date-fns';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);
  private adapters: Map<string, IChannelAdapter> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly channexAdapter: ChannexAdapter,
    private readonly mockAdapter: MockAdapter,
  ) {
    this.registerAdapter(this.channexAdapter);
    this.registerAdapter(this.mockAdapter);
  }

  private registerAdapter(adapter: IChannelAdapter) {
    this.adapters.set(adapter.channelName.toUpperCase(), adapter);
  }

  getAdapter(channelName: string): IChannelAdapter {
    const adapter = this.adapters.get(channelName.toUpperCase());
    if (!adapter) {
      throw new BadRequestException(`No channel adapter registered for '${channelName}'`);
    }
    return adapter;
  }

  /**
   * Programmatically enable Channel Sync for any property in the PMS without leaving the dashboard!
   * Automatically creates the property and room types in the remote Channel Manager API (Channex/STAAH) and stores the IDs.
   */
  async enableChannelSyncForProperty(propertyId: string, channelName = 'CHANNEX') {
    const adapter = this.getAdapter(channelName);

    // 1. Check if mapping already exists
    let existingMapping = await this.prisma.channelPropertyMapping.findUnique({
      where: {
        propertyId_channelName: { propertyId, channelName: channelName.toUpperCase() },
      },
      include: { roomMappings: true },
    });

    // 2. Fetch full property with room types
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: {
          include: { rooms: true },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found.`);
    }

    // 3. Create remote property if adapter supports it and we don't have an external ID yet
    let externalPropertyId = existingMapping?.externalPropertyId;
    if (!externalPropertyId) {
      if (!adapter.createRemoteProperty) {
        throw new BadRequestException(`Adapter '${channelName}' does not support automatic programmatic property creation.`);
      }
      this.logger.log(`Calling auto-create on adapter '${channelName}' for property '${property.name}'`);
      const remoteProp = await adapter.createRemoteProperty(property);
      externalPropertyId = remoteProp.externalPropertyId;
    }

    // 4. Save property mapping
    const propertyMapping = await this.prisma.channelPropertyMapping.upsert({
      where: {
        propertyId_channelName: { propertyId, channelName: channelName.toUpperCase() },
      },
      update: { externalPropertyId, isActive: true },
      create: {
        propertyId,
        channelName: channelName.toUpperCase(),
        externalPropertyId,
        apiKey: process.env.CHANNEX_USER_API_KEY,
        isActive: true,
      },
    });

    // 5. Create remote room types if adapter supports it
    if (adapter.createRemoteRoomType && property.roomTypes) {
      for (const roomType of property.roomTypes) {
        const existingRoomMap = await this.prisma.channelRoomTypeMapping.findUnique({
          where: {
            propertyMappingId_roomTypeId: { propertyMappingId: propertyMapping.id, roomTypeId: roomType.id },
          },
        });

        if (!existingRoomMap) {
          const remoteRoom = await adapter.createRemoteRoomType(externalPropertyId, roomType);
          await this.prisma.channelRoomTypeMapping.create({
            data: {
              propertyMappingId: propertyMapping.id,
              roomTypeId: roomType.id,
              externalRoomTypeId: remoteRoom.externalRoomTypeId,
              externalRatePlanId: remoteRoom.externalRatePlanId || null,
            },
          });
        }
      }
    }

    // 6. Automatically pre-seed primary OTA sources into BookingSources so they appear immediately right now upon enabling Channel Sync!
    const defaultOtaSources = [
      { name: 'MakeMyTrip', description: 'Automated 2-Way OTA Channel Sync via MakeMyTrip', commission: 18 },
      { name: 'Booking.com', description: 'Automated 2-Way OTA Channel Sync via Booking.com', commission: 15 },
      { name: 'Agoda', description: 'Automated 2-Way OTA Channel Sync via Agoda', commission: 18 },
      { name: 'Airbnb', description: 'Automated 2-Way OTA Channel Sync via Airbnb', commission: 15 },
    ];
    for (const ota of defaultOtaSources) {
      const existingOta = await this.prisma.bookingSource.findFirst({
        where: { name: { equals: ota.name, mode: 'insensitive' } },
      });
      if (!existingOta) {
        await this.prisma.bookingSource.create({
          data: { name: ota.name, description: ota.description, commission: ota.commission, isActive: true },
        });
      }
    }

    this.logger.log(`Successfully enabled 100% automated channel sync for Property [${property.name}]! Triggering initial ARI push...`);
    await this.pushAriForProperty(propertyId, 60);

    const webhookUrl = process.env.CHANNEX_WEBHOOK_URL?.trim() || (process.env.APP_PUBLIC_URL?.trim() ? `${process.env.APP_PUBLIC_URL.trim()}/api/channels/webhook/CHANNEX` : null);
    if (webhookUrl && adapter.registerWebhook && propertyMapping.externalPropertyId) {
      await adapter.registerWebhook(propertyMapping.externalPropertyId, webhookUrl);
    } else {
      this.logger.log(`[Webhook Setup] Note: CHANNEX_WEBHOOK_URL or APP_PUBLIC_URL is not set in .env. To receive live reservation webhooks locally on localhost, use ngrok and point your Channex Webhook to: https://YOUR_NGROK_DOMAIN/api/channels/webhook/CHANNEX`);
    }

    return this.getPropertyMappings(propertyId);
  }

  /**
   * Disable/Pause channel synchronization for a property
   */
  async disableChannelSyncForProperty(propertyId: string, channelName = 'CHANNEX') {
    const updated = await this.prisma.channelPropertyMapping.updateMany({
      where: { propertyId, channelName: channelName.toUpperCase() },
      data: { isActive: false },
    });
    this.logger.log(`Disabled channel sync (${channelName}) for property ${propertyId}`);
    return { success: true, count: updated.count };
  }

  /**
   * Calculate and push full Availability & Inventory for a property across all active mapped channels
   */
  async pushAriForProperty(propertyId: string, daysToSync = 60): Promise<void> {
    const mappings = await this.prisma.channelPropertyMapping.findMany({
      where: { propertyId, isActive: true },
      include: {
        roomMappings: {
          include: { roomType: true },
        },
      },
    });

    if (mappings.length === 0) {
      this.logger.debug(`No active channel mappings found for Property [${propertyId}]`);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const mapping of mappings) {
      const adapter = this.getAdapter(mapping.channelName);
      const inventoryUpdates: InventoryUpdateDto[] = [];
      const rateUpdates: RateUpdateDto[] = [];

      let currentRoomMappings = mapping.roomMappings;
      if (currentRoomMappings.length === 0 && adapter.createRemoteRoomType) {
        this.logger.log(`[Self-Healing] No room mappings found for property ${propertyId} on ${mapping.channelName}. Auto-creating missing remote room types...`);
        const fullProp = await this.prisma.property.findUnique({
          where: { id: propertyId },
          include: { roomTypes: { include: { rooms: true } } },
        });
        if (fullProp?.roomTypes) {
          for (const roomType of fullProp.roomTypes) {
            const existingRmMap = await this.prisma.channelRoomTypeMapping.findUnique({
              where: { propertyMappingId_roomTypeId: { propertyMappingId: mapping.id, roomTypeId: roomType.id } },
            });
            if (!existingRmMap) {
              const remoteRm = await adapter.createRemoteRoomType(mapping.externalPropertyId, roomType);
              await this.prisma.channelRoomTypeMapping.create({
                data: {
                  propertyMappingId: mapping.id,
                  roomTypeId: roomType.id,
                  externalRoomTypeId: remoteRm.externalRoomTypeId,
                  externalRatePlanId: remoteRm.externalRatePlanId || null,
                },
              });
            }
          }
        }
        currentRoomMappings = await this.prisma.channelRoomTypeMapping.findMany({
          where: { propertyMappingId: mapping.id },
          include: { roomType: true },
        });
      }

      for (const roomMapping of currentRoomMappings) {
        // Calculate daily inventory for each date
        for (let i = 0; i < daysToSync; i++) {
          const checkIn = addDays(today, i);
          const checkOut = addDays(checkIn, 1);
          const dateStr = format(checkIn, 'yyyy-MM-dd');

          // Count available physical rooms for this roomTypeId
          const availableRoomsList = await this.availabilityService.getAvailableRooms(
            roomMapping.roomTypeId,
            checkIn,
            checkOut,
          );

          inventoryUpdates.push({
            date: dateStr,
            roomTypeId: roomMapping.roomTypeId,
            externalRoomTypeId: roomMapping.externalRoomTypeId,
            availableRooms: availableRoomsList.length,
          });

          // Push rate if base price is available
          if (roomMapping.roomType?.basePrice) {
            rateUpdates.push({
              date: dateStr,
              roomTypeId: roomMapping.roomTypeId,
              externalRoomTypeId: roomMapping.externalRoomTypeId,
              externalRatePlanId: roomMapping.externalRatePlanId || undefined,
              price: Number(roomMapping.roomType.basePrice),
            });
          }
        }
      }

      // Push to adapter
      await adapter.pushInventory(mapping, inventoryUpdates);
      if (rateUpdates.length > 0) {
        await adapter.pushRates(mapping, rateUpdates);
      }
    }
  }

  /**
   * Handle incoming reservation webhook from an OTA / Channel Manager (e.g. Channex)
   */
  async handleIncomingReservation(channelName: string, payload: any, headers?: Record<string, any>) {
    const adapter = this.getAdapter(channelName);
    const res = await adapter.parseIncomingReservation(payload, headers);

    this.logger.log(`[Webhook] Received reservation ${res.externalBookingId} (${res.status}) from ${channelName}`);

    // Check if booking already exists
    const existingBooking = await this.prisma.booking.findUnique({
      where: { externalBookingId: res.externalBookingId },
      include: { room: true },
    });

    if (existingBooking) {
      if (res.status === 'CANCELLED' && existingBooking.status !== 'CANCELLED') {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        this.logger.log(`Cancelled existing external booking ${res.externalBookingId}`);
        // Push new available inventory outward across all channels
        if (existingBooking.propertyId) {
          await this.pushAriForProperty(existingBooking.propertyId, 60);
        }
      } else if (res.status === 'MODIFIED' || (res.checkInDate && res.checkOutDate && (res.checkInDate.getTime() !== existingBooking.checkInDate.getTime() || res.checkOutDate.getTime() !== existingBooking.checkOutDate.getTime() || res.totalAmount !== Number(existingBooking.totalAmount)))) {
        await this.prisma.booking.update({
          where: { id: existingBooking.id },
          data: {
            checkInDate: res.checkInDate,
            checkOutDate: res.checkOutDate,
            totalAmount: res.totalAmount,
            status: 'CONFIRMED',
          },
        });
        this.logger.log(`Revised existing external booking ${res.externalBookingId} with new stay dates/amounts`);
        if (existingBooking.propertyId) {
          await this.pushAriForProperty(existingBooking.propertyId, 60);
        }
      }
      return { success: true, action: 'UPDATED', bookingNumber: existingBooking.bookingNumber };
    }

    if (res.status === 'CANCELLED') {
      return { success: true, action: 'IGNORED_ALREADY_CANCELLED' };
    }

    // Find the internal room mapping
    const roomMapping = await this.prisma.channelRoomTypeMapping.findFirst({
      where: {
        externalRoomTypeId: res.externalRoomTypeId,
        propertyMapping: {
          externalPropertyId: res.externalPropertyId,
          channelName: channelName.toUpperCase(),
        },
      },
      include: {
        roomType: true,
        propertyMapping: true,
      },
    });

    if (!roomMapping) {
      throw new NotFoundException(
        `No internal RoomType mapped for Channel [${channelName}], externalPropertyId [${res.externalPropertyId}], externalRoomTypeId [${res.externalRoomTypeId}]`,
      );
    }

    const propertyId = roomMapping.propertyMapping.propertyId;
    const roomTypeId = roomMapping.roomTypeId;

    // Find an available physical Room inside this RoomType
    const availableRooms = await this.availabilityService.getAvailableRooms(
      roomTypeId,
      res.checkInDate,
      res.checkOutDate,
    );

    if (availableRooms.length === 0) {
      this.logger.warn(
        `[OVERBOOKING WARNING] External reservation ${res.externalBookingId} arrived for ${roomMapping.roomType.name}, but 0 physical rooms available!`,
      );
    }

    // Assign first available room or fallback to any room in that type to prevent losing record
    let assignedRoom = availableRooms[0];
    if (!assignedRoom) {
      assignedRoom = await this.prisma.room.findFirst({
        where: { roomTypeId, propertyId },
      });
    }

    if (!assignedRoom) {
      throw new BadRequestException(
        `SETUP_REQUIRED: No physical room units configured for Room Type "${roomMapping.roomType?.name || roomTypeId}". Please go to Rooms Management and create at least 1 physical room first.`,
      );
    }

    // Find or create OTA User/Guest account (check both email and phone to prevent unique constraint errors)
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: res.guest.email || `guest.${res.externalBookingId}@ota.channel` },
          ...(res.guest.phone ? [{ phone: res.guest.phone }] : []),
        ],
      },
    });

    if (!user) {
      try {
        user = await this.prisma.user.create({
          data: {
            email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
            firstName: res.guest.firstName,
            lastName: res.guest.lastName,
            phone: res.guest.phone || undefined,
          },
        });
      } catch (userErr: any) {
        if (userErr?.code === 'P2002' || userErr?.message?.includes('Unique constraint')) {
          this.logger.warn(`User creation collision during OTA import, linking to existing guest or fallback.`);
          if (res.guest.phone) {
            user = await this.prisma.user.findFirst({ where: { phone: res.guest.phone } });
          }
          if (!user) {
            user = await this.prisma.user.create({
              data: {
                email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
                firstName: res.guest.firstName,
                lastName: res.guest.lastName,
              },
            });
          }
        } else {
          throw userErr;
        }
      }
    }

    // Find matching exact OTA BookingSource (e.g. MakeMyTrip, Booking.com) or create it automatically
    const targetSourceName = res.sourceName || channelName;
    let bookingSource = await this.prisma.bookingSource.findFirst({
      where: { name: { equals: targetSourceName, mode: 'insensitive' } },
    });
    if (!bookingSource) {
      bookingSource = await this.prisma.bookingSource.create({
        data: { name: targetSourceName, description: `Automated OTA synchronization via ${targetSourceName}` },
      });
    }

    // Generate internal booking number
    const bookingNumber = `CM-${channelName.slice(0, 3)}-${Date.now()}`;

    // Create the booking in atomic transaction
    const newBooking = await this.prisma.$transaction(async (tx) => {
      const b = await tx.booking.create({
        data: {
          bookingNumber,
          checkInDate: res.checkInDate,
          checkOutDate: res.checkOutDate,
          numberOfNights: res.numberOfNights,
          adultsCount: res.adultsCount,
          childrenCount: res.childrenCount,
          baseAmount: res.totalAmount,
          totalAmount: res.totalAmount,
          status: 'CONFIRMED',
          specialRequests: res.specialRequests,
          roomId: assignedRoom.id,
          roomTypeId,
          userId: user!.id,
          bookingSourceId: bookingSource?.id,
          propertyId,
          externalBookingId: res.externalBookingId,
          channelName: channelName.toUpperCase(),
          confirmedAt: new Date(),
          bookingCurrency: res.currency || 'INR',
          paymentStatus: 'FULL',
          paymentOption: 'FULL',
        },
      });

      // Create BookingRoom link
      await tx.bookingRoom.create({
        data: {
          bookingId: b.id,
          roomId: assignedRoom.id,
        },
      });

      // Create BookingGuest entry
      await tx.bookingGuest.create({
        data: {
          bookingId: b.id,
          firstName: res.guest.firstName,
          lastName: res.guest.lastName || '',
          email: res.guest.email,
          phone: res.guest.phone,
        },
      });

      return b;
    });

    this.logger.log(`Created internal booking #${newBooking.bookingNumber} for physical room ${assignedRoom.roomNumber}`);

    // Acknowledge back to channel
    await adapter.acknowledgeReservation(roomMapping.propertyMapping, res.externalBookingId, newBooking.bookingNumber);

    // Push updated inventory outward to block all other OTAs instantly
    await this.pushAriForProperty(propertyId, 60);

    return { success: true, action: 'CREATED', bookingNumber: newBooking.bookingNumber };
  }

  /**
   * CRUD Mappings
   */
  async getPropertyMappings(propertyId: string) {
    return this.prisma.channelPropertyMapping.findMany({
      where: { propertyId },
      include: {
        roomMappings: {
          include: { roomType: true },
        },
      },
    });
  }

  async savePropertyMapping(propertyId: string, channelName: string, externalPropertyId: string, apiKey?: string) {
    return this.prisma.channelPropertyMapping.upsert({
      where: {
        propertyId_channelName: { propertyId, channelName: channelName.toUpperCase() },
      },
      update: { externalPropertyId, apiKey, isActive: true },
      create: { propertyId, channelName: channelName.toUpperCase(), externalPropertyId, apiKey, isActive: true },
    });
  }

  async saveRoomMapping(propertyMappingId: string, roomTypeId: string, externalRoomTypeId: string, externalRatePlanId?: string) {
    return this.prisma.channelRoomTypeMapping.upsert({
      where: {
        propertyMappingId_roomTypeId: { propertyMappingId, roomTypeId },
      },
      update: { externalRoomTypeId, externalRatePlanId },
      create: { propertyMappingId, roomTypeId, externalRoomTypeId, externalRatePlanId },
    });
  }

  /**
   * Simulate an incoming OTA reservation (e.g. MakeMyTrip, Booking.com) for staging & demo testing
   */
  async simulateIncomingOtaBooking(propertyId: string, otaName = 'MakeMyTrip') {
    const propertyMapping = await this.prisma.channelPropertyMapping.findFirst({
      where: { propertyId, isActive: true },
      include: { roomMappings: { include: { roomType: true } } },
    });

    if (!propertyMapping || !propertyMapping.roomMappings.length) {
      throw new BadRequestException(`Please enable 2-Way Channel Sync first so room types are mapped.`);
    }

    let roomMapping = propertyMapping.roomMappings[0];
    for (const rm of propertyMapping.roomMappings) {
      const count = await this.prisma.room.count({ where: { roomTypeId: rm.roomTypeId, propertyId } });
      if (count > 0) {
        roomMapping = rm;
        break;
      }
    }

    const roomCount = await this.prisma.room.count({ where: { roomTypeId: roomMapping.roomTypeId, propertyId } });
    if (roomCount === 0) {
      throw new BadRequestException(
        `SETUP_REQUIRED: No physical room units exist for Room Type "${roomMapping.roomType?.name || 'Assigned Room Type'}". Please go to your Rooms Management tab and create at least 1 physical room first.`
      );
    }

    const checkInDate = new Date();
    checkInDate.setDate(checkInDate.getDate() + 2);
    const checkOutDate = new Date();
    checkOutDate.setDate(checkOutDate.getDate() + 4);

    const simulatedBookingId = `${otaName.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const simulatedPayload = {
      event: 'booking_new',
      data: {
        id: simulatedBookingId,
        property_id: propertyMapping.externalPropertyId || 'SIMULATED_PROP',
        channel_name: otaName,
        status: 'new',
        rooms: [
          {
            room_type_id: roomMapping.externalRoomTypeId || 'SIMULATED_ROOM_TYPE',
            check_in: checkInDate.toISOString().split('T')[0],
            check_out: checkOutDate.toISOString().split('T')[0],
            amount: 14500,
          },
        ],
        customer: {
          firstName: `${otaName} Guest`,
          lastName: `(Simulated Reservation)`,
          email: `guest.${simulatedBookingId.toLowerCase()}@${otaName.toLowerCase().replace(/\./g, '')}.test`,
          phone: `+91 ${Math.floor(6000000000 + Math.random() * 3999999999)}`,
        },
      },
    };

    return this.handleIncomingReservation(propertyMapping.channelName || 'CHANNEX', simulatedPayload);
  }
}
