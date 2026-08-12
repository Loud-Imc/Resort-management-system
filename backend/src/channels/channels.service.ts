import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from '../bookings/availability.service';
import { PricingService } from '../bookings/pricing.service';
import { IChannelAdapter, InventoryUpdateDto, RateUpdateDto } from './interfaces/channel-adapter.interface';
import { ChannexAdapter } from './adapters/channex.adapter';
import { MockAdapter } from './adapters/mock.adapter';
import { format, addDays, differenceInDays } from 'date-fns';
import { DateUtils } from '../common/utils/date.utils';
import { CurrenciesService } from '../currencies/currencies.service';

@Injectable()
export class ChannelsService {
  private readonly logger = new Logger(ChannelsService.name);
  private adapters: Map<string, IChannelAdapter> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly availabilityService: AvailabilityService,
    private readonly pricingService: PricingService,
    private readonly channexAdapter: ChannexAdapter,
    private readonly mockAdapter: MockAdapter,
    private readonly currenciesService: CurrenciesService,
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
   * Returns the complete schema and catalog of global travel channels supported by the Channex 2-Way REST API Engine.
   * Provides exact required parameters for each OTA so frontend forms dynamically render exact inputs without hardcoding.
   */
  async getAvailableChannelsCatalog() {
    const userApiKey = process.env.CHANNEX_USER_API_KEY;
    const baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';

    if (!userApiKey) {
      this.logger.warn('[Channels] CHANNEX_USER_API_KEY is not defined in environment. Falling back to empty catalog.');
      return [];
    }

    try {
      const response = await fetch(`${baseUrl}/channels/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': userApiKey,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`[Channels] Failed to fetch channel list from Channex: ${response.status} ${errText}`);
        return [];
      }

      const resData = await response.json();
      const rawChannels = resData.data || [];

      return rawChannels.map((item: any) => {
        const codeKey = item.code.toLowerCase();

        // 1. Determine premium visual features based on channel code
        let category = 'Supported Channel';
        let color = 'from-muted/40 to-muted/20 border-border/50';

        if (['makemytrip', 'goibibo', 'easemytrip', 'yatra', 'cleartrip'].includes(codeKey)) {
          category = 'Regional Leader';
        } else if (['bookingcom', 'agoda', 'airbnb', 'expedia', 'tripcom'].includes(codeKey)) {
          category = 'Global Leader';
        } else if (['googlehotels', 'googlehotelari'].includes(codeKey)) {
          category = 'Metasearch & Direct';
        } else if (['vrbo'].includes(codeKey)) {
          category = 'Vacation Rentals';
        }

        const isMMT = codeKey === 'makemytrip' || (codeKey === 'goibibo' && item.title.toLowerCase().includes('make my trip'));

        if (isMMT) {
          color = 'from-blue-500/10 to-indigo-500/10 border-blue-500/30';
        } else if (codeKey === 'goibibo') {
          color = 'from-orange-500/10 to-amber-500/10 border-orange-500/30';
        } else if (codeKey === 'bookingcom') {
          color = 'from-sky-500/10 to-blue-500/10 border-sky-500/30';
        } else if (codeKey === 'agoda') {
          color = 'from-purple-500/10 to-pink-500/10 border-purple-500/30';
        } else if (codeKey === 'airbnb') {
          color = 'from-rose-500/10 to-red-500/10 border-rose-500/30';
        } else if (codeKey === 'expedia') {
          color = 'from-yellow-500/10 to-amber-500/10 border-yellow-500/30';
        } else if (codeKey === 'tripcom') {
          color = 'from-teal-500/10 to-cyan-500/10 border-teal-500/30';
        } else if (codeKey === 'easemytrip') {
          color = 'from-emerald-500/10 to-green-500/10 border-emerald-500/30';
        } else if (codeKey === 'googlehotelari' || codeKey === 'googlehotels') {
          color = 'from-green-500/10 to-emerald-500/10 border-green-500/30';
        } else if (codeKey === 'vrbo') {
          color = 'from-blue-600/10 to-indigo-600/10 border-blue-600/30';
        }

        // 2. Format connection settings fields dynamically
        const fields = Object.entries(item.params || {}).map(([key, fieldVal]: [string, any]) => {
          const isRequired = ['hotel_id', 'hotel_code', 'access_token', 'api_key', 'station_code', 'agent_id'].includes(key) || 
            fieldVal.rules?.some((r: any) => r.apply === 'required');

          return {
            key,
            label: fieldVal.title || key,
            type: fieldVal.type === 'select' ? 'select' : fieldVal.type === 'boolean' ? 'boolean' : fieldVal.type === 'password' ? 'password' : 'text',
            required: isRequired || false,
            placeholder: `Enter ${fieldVal.title || key}`,
            options: fieldVal.options || [],
            default: fieldVal.default,
            position: fieldVal.position || 0,
          };
        }).sort((a: any, b: any) => a.position - b.position);

        return {
          key: item.code,
          title: item.title,
          category,
          color,
          fields,
          payload: item.payload || null,
          mappingMode: item.mapping_mode || null,
        };
      });
    } catch (error: any) {
      this.logger.error(`[Channels] Error fetching channel list: ${error.message}`);
      return [];
    }
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

    // Backend validation: Verify Property Readiness Checklist is fully complete
    const hasCoordinates = !!property.latitude && !!property.longitude;
    const hasImages = !!property.coverImage && property.images && property.images.length > 0;
    const hasRoomTypes = property.roomTypes && property.roomTypes.length > 0;
    const hasRooms = property.roomTypes && property.roomTypes.some(rt => rt.rooms && rt.rooms.length > 0);
    const policiesCount = await this.prisma.cancellationPolicy.count({ where: { propertyId } });
    const hasPolicies = policiesCount > 0;

    const pending: string[] = [];
    if (!hasCoordinates) pending.push("Set Map Coordinates");
    if (!hasRoomTypes) pending.push("Create Room Types");
    if (!hasRooms) pending.push("Add Rooms");
    if (!hasImages) pending.push("Upload Property Images");
    if (!hasPolicies) pending.push("Set Cancellation Policies");

    if (pending.length > 0) {
      throw new BadRequestException(
        `SETUP_REQUIRED: Property profile is incomplete. Please resolve: ${pending.join(", ")}`
      );
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

  async connectOtaChannel(propertyId: string, otaKey: string, hotelId: string, settings: any) {
    // 1. Fetch main Channex mapping to get the externalPropertyId
    const mainMapping = await this.prisma.channelPropertyMapping.findFirst({
      where: { propertyId, channelName: 'CHANNEX' },
    });
    if (!mainMapping) {
      throw new BadRequestException('Please enable 2-Way Sync for this property first.');
    }

    const adapter = this.getAdapter('CHANNEX');
    if (!adapter.createChannel) {
      throw new BadRequestException('Adapter does not support programmatic channel connection.');
    }

    try {
      let externalChannelId: string;

      if (settings?.manualChannelId) {
        this.logger.log(`[Channels] Registering channel connection manually with provided Channel ID: ${settings.manualChannelId}`);
        externalChannelId = settings.manualChannelId;
      } else {
        // 2. Call Channex to register the channel connection
        externalChannelId = await adapter.createChannel(
          mainMapping.externalPropertyId,
          otaKey,
          `${otaKey.toUpperCase()} Channel - PMS`,
          settings,
        );
      }

      // 3. Save the connection mapping record under the OTA name
      return await this.prisma.channelPropertyMapping.upsert({
        where: {
          propertyId_channelName: { propertyId, channelName: otaKey.toUpperCase() },
        },
        update: {
          externalPropertyId: externalChannelId,
          apiKey: JSON.stringify(settings),
          isActive: true,
        },
        create: {
          propertyId,
          channelName: otaKey.toUpperCase(),
          externalPropertyId: externalChannelId,
          apiKey: JSON.stringify(settings),
          isActive: true,
        },
      });
    } catch (err: any) {
      throw new BadRequestException(err.message || 'Failed to connect OTA channel.');
    }
  }

  async disconnectOtaChannel(propertyId: string, otaKey: string) {
    const otaMapping = await this.prisma.channelPropertyMapping.findUnique({
      where: {
        propertyId_channelName: { propertyId, channelName: otaKey.toUpperCase() },
      },
    });

    if (!otaMapping || !otaMapping.isActive) {
      throw new NotFoundException(`No active connection found for channel ${otaKey}`);
    }

    const adapter = this.getAdapter('CHANNEX');
    if (adapter.deleteChannel) {
      await adapter.deleteChannel(otaMapping.externalPropertyId);
    }

    // Deactivate mapping record
    return this.prisma.channelPropertyMapping.update({
      where: { id: otaMapping.id },
      data: { isActive: false },
    });
  }

  async getIframeSessionUrl(propertyId: string) {
    const mapping = await this.prisma.channelPropertyMapping.findFirst({
      where: { propertyId, channelName: 'CHANNEX' },
    });
    if (!mapping) {
      throw new BadRequestException('Please enable 2-Way Sync for this property first.');
    }

    const adapter = this.getAdapter('CHANNEX');
    if (!adapter.getIframeSessionToken) {
      throw new BadRequestException('Iframe token generation not supported.');
    }

    const token = await adapter.getIframeSessionToken(mapping.externalPropertyId);
    const channexDomain = (process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1')
      .replace('/api/v1', '')
      .replace('/api/v2', '');
    const iframeUrl = `${channexDomain}/auth/exchange?oauth_session_key=${token}&app_mode=headless&redirect_to=/channels&property_id=${mapping.externalPropertyId}`;
    return { url: iframeUrl };
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

    const today = DateUtils.parseCalendarDate(new Date());

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
      const checkInStart = today;
      const checkOutEnd = addDays(today, daysToSync);
      const roomTypeIds = currentRoomMappings.map((rm) => rm.roomTypeId);

      // 1. Fetch total room counts in a single query
      const rooms = await this.prisma.room.findMany({
        where: {
          roomTypeId: { in: roomTypeIds },
          isEnabled: true,
          status: { in: ['AVAILABLE', 'OCCUPIED'] },
        },
        select: { roomTypeId: true },
      });
      const roomsMap = new Map<string, number>();
      for (const rtId of roomTypeIds) {
        roomsMap.set(rtId, rooms.filter((r) => r.roomTypeId === rtId).length);
      }

      // 2. Fetch all active bookings for the range in a single query
      const bookings = await this.prisma.booking.findMany({
        where: {
          roomTypeId: { in: roomTypeIds },
          status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED', 'PENDING_PAYMENT'] },
          checkOutDate: { gte: checkInStart },
          checkInDate: { lte: checkOutEnd },
        },
        select: { roomTypeId: true, checkInDate: true, checkOutDate: true },
      });

      // 3. Fetch active stop sell restrictions in a single query
      const stopSells = await this.prisma.stopSellRestriction.findMany({
        where: {
          propertyId,
          isActive: true,
          startDate: { lte: checkOutEnd },
          endDate: { gte: checkInStart },
        },
      });

      for (const roomMapping of currentRoomMappings) {
        const dailyRates = await this.pricingService.getPublishedDailyRates(
          roomMapping.roomTypeId,
          checkInStart,
          checkOutEnd
        );
        this.logger.debug(`[Channex Sync] Fetched ${dailyRates.length} daily rates for RoomType [${roomMapping.roomTypeId}]`);
        const ratesMap = new Map(dailyRates.map(r => [r.date, r.publishedPrice]));

        const totalRooms = roomsMap.get(roomMapping.roomTypeId) || 0;

        // Calculate daily inventory for each date in-memory
        for (let i = 0; i < daysToSync; i++) {
          const checkIn = addDays(today, i);
          const checkOut = addDays(checkIn, 1);
          const dateStr = format(checkIn, 'yyyy-MM-dd');

          // Check if stop sell is active for this roomType on this day
          const hasStopSell = stopSells.some(ss => {
            const ssStart = new Date(ss.startDate);
            ssStart.setHours(0, 0, 0, 0);
            const ssEnd = new Date(ss.endDate);
            ssEnd.setHours(23, 59, 59, 999);
            return (!ss.roomTypeId || ss.roomTypeId === roomMapping.roomTypeId) && checkIn <= ssEnd && checkOut >= ssStart;
          });

          // Count bookings overlapping with this date in-memory
          const bookedCount = bookings.filter(b => {
            if (b.roomTypeId !== roomMapping.roomTypeId) return false;
            const bStart = new Date(b.checkInDate);
            bStart.setHours(0, 0, 0, 0);
            const bEnd = new Date(b.checkOutDate);
            bEnd.setHours(0, 0, 0, 0);
            return checkIn < bEnd && checkOut > bStart;
          }).length;

          const availableRoomsCount = Math.max(0, totalRooms - bookedCount);

          inventoryUpdates.push({
            date: dateStr,
            roomTypeId: roomMapping.roomTypeId,
            externalRoomTypeId: roomMapping.externalRoomTypeId,
            availableRooms: hasStopSell ? 0 : availableRoomsCount,
          });

          // Push rate and stopSell restriction
          const dailyPrice = ratesMap.get(dateStr);
          rateUpdates.push({
            date: dateStr,
            roomTypeId: roomMapping.roomTypeId,
            externalRoomTypeId: roomMapping.externalRoomTypeId,
            externalRatePlanId: roomMapping.externalRatePlanId || undefined,
            price: dailyPrice,
            stopSell: hasStopSell,
          });
        }
      }

      // Push to adapter
      await adapter.pushInventory(mapping, inventoryUpdates);
      if (rateUpdates.length > 0) {
        this.logger.debug(`[Channex Sync] Pushing ${rateUpdates.length} rate updates to adapter`);
        await adapter.pushRates(mapping, rateUpdates);
      }
    }
  }

  async pushAvailabilityForDates(
    propertyId: string,
    roomTypeId: string,
    startDate: Date,
    endDate: Date,
    oldStartDate?: Date,
    oldEndDate?: Date,
    oldRoomTypeId?: string
  ): Promise<void> {
    const mappings = await this.prisma.channelPropertyMapping.findMany({
      where: { propertyId, isActive: true },
      include: {
        roomMappings: {
          include: { roomType: true },
        },
      },
    });

    if (mappings.length === 0) return;

    // Collect all dates to recalculate availability
    const datesToRecalculate = new Set<string>();
    const roomTypeIds = new Set<string>([roomTypeId]);
    if (oldRoomTypeId) roomTypeIds.add(oldRoomTypeId);

    // Helper to add interval dates
    const addIntervalDates = (start: Date, end: Date) => {
      const days = differenceInDays(end, start);
      for (let i = 0; i < days; i++) {
        const d = addDays(start, i);
        datesToRecalculate.add(format(d, 'yyyy-MM-dd'));
      }
    };

    addIntervalDates(startDate, endDate);
    if (oldStartDate && oldEndDate) {
      addIntervalDates(oldStartDate, oldEndDate);
    }

    // Load total room counts and active bookings for the range (using our optimized queries)
    const checkInStart = new Date(Math.min(
      startDate.getTime(),
      oldStartDate ? oldStartDate.getTime() : startDate.getTime()
    ));
    const checkOutEnd = new Date(Math.max(
      endDate.getTime(),
      oldEndDate ? oldEndDate.getTime() : endDate.getTime()
    ));

    const rooms = await this.prisma.room.findMany({
      where: {
        roomTypeId: { in: Array.from(roomTypeIds) },
        isEnabled: true,
        status: { in: ['AVAILABLE', 'OCCUPIED'] },
      },
      select: { roomTypeId: true },
    });
    const roomsMap = new Map<string, number>();
    for (const rtId of roomTypeIds) {
      roomsMap.set(rtId, rooms.filter((r) => r.roomTypeId === rtId).length);
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        roomTypeId: { in: Array.from(roomTypeIds) },
        status: { in: ['CONFIRMED', 'CHECKED_IN', 'RESERVED', 'PENDING_PAYMENT'] },
        checkOutDate: { gte: checkInStart },
        checkInDate: { lte: checkOutEnd },
      },
      select: { roomTypeId: true, checkInDate: true, checkOutDate: true },
    });

    const stopSells = await this.prisma.stopSellRestriction.findMany({
      where: {
        propertyId,
        isActive: true,
        startDate: { lte: checkOutEnd },
        endDate: { gte: checkInStart },
      },
    });

    for (const mapping of mappings) {
      const adapter = this.getAdapter(mapping.channelName);
      const inventoryUpdates: InventoryUpdateDto[] = [];

      for (const rtId of roomTypeIds) {
        const roomMapping = mapping.roomMappings.find(rm => rm.roomTypeId === rtId);
        if (!roomMapping) continue;

        const totalRooms = roomsMap.get(rtId) || 0;

        for (const dateStr of datesToRecalculate) {
          const checkIn = new Date(dateStr);
          checkIn.setHours(0, 0, 0, 0);
          const checkOut = addDays(checkIn, 1);

          const hasStopSell = stopSells.some(ss => {
            const ssStart = new Date(ss.startDate);
            ssStart.setHours(0, 0, 0, 0);
            const ssEnd = new Date(ss.endDate);
            ssEnd.setHours(23, 59, 59, 999);
            return (!ss.roomTypeId || ss.roomTypeId === rtId) && checkIn <= ssEnd && checkOut >= ssStart;
          });

          const bookedCount = bookings.filter(b => {
            if (b.roomTypeId !== rtId) return false;
            const bStart = new Date(b.checkInDate);
            bStart.setHours(0, 0, 0, 0);
            const bEnd = new Date(b.checkOutDate);
            bEnd.setHours(0, 0, 0, 0);
            return checkIn < bEnd && checkOut > bStart;
          }).length;

          const availableRoomsCount = Math.max(0, totalRooms - bookedCount);

          inventoryUpdates.push({
            date: dateStr,
            roomTypeId: rtId,
            externalRoomTypeId: roomMapping.externalRoomTypeId,
            availableRooms: hasStopSell ? 0 : availableRoomsCount,
          });
        }
      }

      if (inventoryUpdates.length > 0) {
        this.logger.log(`[Channex] Pushing delta inventory updates for ${inventoryUpdates.length} date items: ${JSON.stringify(inventoryUpdates)}`);
        await adapter.pushInventory(mapping, inventoryUpdates);
      }
    }
  }

  /**
   * Push batched delta updates (Single/Multi date rates, inventory, min stay, stop sell, restrictions) directly to Channex.
   * Required for Channex Certification Tests 2, 3, 4, 5, 6, 7, 8, 9, 10 without doing a full timer sync.
   */
  async pushDeltaAri(
    propertyId: string,
    inventoryUpdates: InventoryUpdateDto[] = [],
    rateUpdates: RateUpdateDto[] = [],
  ): Promise<boolean> {
    const mappings = await this.prisma.channelPropertyMapping.findMany({
      where: { propertyId, isActive: true },
      include: {
        roomMappings: { include: { roomType: true } },
      },
    });

    if (mappings.length === 0) {
      this.logger.debug(`No active channel mappings found for delta push on Property [${propertyId}]`);
      return false;
    }

    let success = true;
    for (const mapping of mappings) {
      const adapter = this.getAdapter(mapping.channelName);
      if (inventoryUpdates && inventoryUpdates.length > 0) {
        const invOk = await adapter.pushInventory(mapping, inventoryUpdates);
        if (!invOk) success = false;
      }
      if (rateUpdates && rateUpdates.length > 0) {
        // Enforce Pricing SSOT on Delta Updates
        const roomTypeGroups = new Map<string, RateUpdateDto[]>();
        for (const update of rateUpdates) {
          if (!roomTypeGroups.has(update.roomTypeId)) {
            roomTypeGroups.set(update.roomTypeId, []);
          }
          roomTypeGroups.get(update.roomTypeId)!.push(update);
        }

        for (const [roomTypeId, updates] of roomTypeGroups.entries()) {
          const dates = updates.map(u => new Date(u.date).getTime());
          const minDate = new Date(Math.min(...dates));
          const maxDate = new Date(Math.max(...dates));
          
          const dailyRates = await this.pricingService.getPublishedDailyRates(
            roomTypeId,
            minDate,
            addDays(maxDate, 1)
          );
          this.logger.debug(`[Channex Delta Sync] Fetched ${dailyRates.length} daily rates for RoomType [${roomTypeId}]`);
          const ratesMap = new Map(dailyRates.map(r => [r.date, r.publishedPrice]));

          for (const update of updates) {
            const price = ratesMap.get(update.date);
            if (price !== undefined) {
              update.price = price;
            }
          }
        }

        this.logger.debug(`[Channex Delta Sync] Pushing ${rateUpdates.length} rate updates to adapter`);
        const rateOk = await adapter.pushRates(mapping, rateUpdates);
        if (!rateOk) success = false;
      }
    }
    return success;
  }

  /**
   * Handle incoming reservation webhook from an OTA / Channel Manager (e.g. Channex)
   */
  async handleIncomingReservation(channelName: string, payload: any, headers?: Record<string, any>) {
    // Ignore non-booking webhook events (like ari_changes, channel_sync_error, new_message, etc.)
    const eventName = payload?.event || '';
    if (eventName && !eventName.startsWith('booking') && !eventName.startsWith('reservation')) {
      this.logger.log(`[Webhook] Ignoring non-booking event type: "${eventName}" for channel: ${channelName}`);
      return { success: true, action: 'IGNORED_NON_BOOKING_EVENT' };
    }

    // For Channex, we only process the core lightweight "booking" event.
    // Other events like "booking_new", "booking_modified", "booking_cancelled" are redundant feed notifications and can be safely ignored.
    if (channelName.toUpperCase() === 'CHANNEX' && eventName && eventName !== 'booking') {
      this.logger.log(`[Webhook] Ignoring redundant booking event type: "${eventName}" for channel: ${channelName}`);
      return { success: true, action: 'IGNORED_REDUNDANT_EVENT' };
    }

    // If this is a Channex lightweight booking event, fetch full details first from Channex API
    if (channelName.toUpperCase() === 'CHANNEX' && payload.event === 'booking') {
      const extPropId = payload.property_id || payload.payload?.property_id || '';
      const bookingId = payload.payload?.booking_id || '';
      const revisionId = payload.payload?.revision_id || '';
      
      // If there are no booking identifiers, ignore
      if (!bookingId && !revisionId) {
        this.logger.log(`[Webhook] Acknowledged and ignored old data-less booking event (no booking_id/revision_id).`);
        return { success: true, action: 'IGNORED_DATALESS_WEBHOOK' };
      }

      this.logger.log(`[Webhook] Fetching details for lightweight booking ${bookingId} (Revision: ${revisionId})...`);

      const mapping = await this.prisma.channelPropertyMapping.findFirst({
        where: {
          externalPropertyId: extPropId,
          channelName: 'CHANNEX',
        },
      });

      if (!mapping || !mapping.apiKey) {
        throw new NotFoundException(`No active Channex mapping or API key found for externalPropertyId: ${extPropId}`);
      }

      // Use booking_revisions endpoint if revisionId is present (required for Channex certification)
      const fetchUrl = revisionId 
        ? `${process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1'}/booking_revisions/${revisionId}`
        : `${process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1'}/bookings/${bookingId}`;

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': mapping.apiKey,
        },
      });

      console.log('channex response : ', response);

      if (response.status !== 200) {
        throw new Error(`Failed to fetch booking details from Channex: ${response.status} ${response.statusText}`);
      }

      const detailData = await response.json();
      const bookingData = detailData?.data;

      if (!bookingData) {
        throw new NotFoundException(`Booking data not found in Channex response for ID: ${bookingId}`);
      }

      // Map to the format the adapter expects
      payload = {
        id: bookingData.attributes?.booking_id || bookingId || bookingData.id,
        booking_revision_id: bookingData.id || revisionId,
        property_id: bookingData.relationships?.property?.data?.id || extPropId,
        status: bookingData.attributes.status,
        arrival_date: bookingData.attributes.arrival_date,
        departure_date: bookingData.attributes.departure_date,
        amount: bookingData.attributes.amount,
        currency: bookingData.attributes.currency,
        rooms: (bookingData.attributes.rooms || []).map((r: any) => ({
          id: r.id,
          room_type_id: r.room_type_id,
          rate_plan_id: r.rate_plan_id,
          checkin_date: r.checkin_date || bookingData.attributes.arrival_date,
          checkout_date: r.checkout_date || bookingData.attributes.departure_date,
          amount: r.amount || 0,
          occupancy: r.occupancy || { adults: 2, children: 0 }
        })),
        customer: bookingData.attributes.customer || {},
        channel_name: bookingData.attributes.channel_name || 'Booking.com',
        notes: bookingData.attributes.notes
      };
    }

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
          await this.pushAvailabilityForDates(
            existingBooking.propertyId,
            existingBooking.roomTypeId,
            existingBooking.checkInDate,
            existingBooking.checkOutDate
          );
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
          let newRoomTypeId = existingBooking.roomTypeId;
          if (res.externalRoomTypeId) {
            const roomMapRecord = await this.prisma.channelRoomTypeMapping.findFirst({
              where: {
                externalRoomTypeId: res.externalRoomTypeId,
                propertyMapping: { propertyId: existingBooking.propertyId }
              }
            });
            if (roomMapRecord) {
              newRoomTypeId = roomMapRecord.roomTypeId;
            }
          }
          await this.pushAvailabilityForDates(
            existingBooking.propertyId,
            newRoomTypeId,
            res.checkInDate,
            res.checkOutDate,
            existingBooking.checkInDate,
            existingBooking.checkOutDate,
            existingBooking.roomTypeId
          );
        }
      }

      // Acknowledge revision modification/cancellation back to Channex (required for certification)
      if (existingBooking.propertyId) {
        const mapping = await this.prisma.channelPropertyMapping.findFirst({
          where: { propertyId: existingBooking.propertyId, channelName: channelName.toUpperCase() },
        });
        if (mapping) {
          const ackId = res.externalRevisionId || res.externalBookingId;
          await adapter.acknowledgeReservation(mapping, ackId, existingBooking.bookingNumber);
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

    // Find or create OTA User/Guest account strictly by unique email to ensure correct guest profile mapping
    let user = await this.prisma.user.findUnique({
      where: {
        email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
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
        if (userErr?.code === 'P2002' && (userErr?.meta?.target?.includes('phone') || userErr?.message?.includes('phone'))) {
          // If phone is already taken, create the guest user profile anyway, but omit the conflicting phone number
          this.logger.warn(`Phone number ${res.guest.phone} is already linked to another guest. Creating new guest profile without the phone number.`);
          user = await this.prisma.user.create({
            data: {
              email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
              firstName: res.guest.firstName,
              lastName: res.guest.lastName,
            },
          });
        } else if (userErr?.code === 'P2002' || userErr?.message?.includes('Unique constraint')) {
          this.logger.warn(`User creation collision during OTA import, falling back to clean profile creation.`);
          user = await this.prisma.user.create({
            data: {
              email: res.guest.email || `guest.${res.externalBookingId}@ota.channel`,
              firstName: res.guest.firstName,
              lastName: res.guest.lastName,
            },
          });
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

    // Fetch property base currency
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { baseCurrency: true },
    });
    const propCurrency = property?.baseCurrency || 'INR';

    // Convert booking total amount to property base currency
    const convertedTotal = await this.currenciesService.convert(
      res.totalAmount,
      res.currency || 'INR',
      propCurrency,
    );

    // Reverse-calculate GST and Base Amount from the total guest price
    const gstCalculation = await this.pricingService.calculateReverseGST(
      convertedTotal,
      res.numberOfNights || 1,
      1
    );

    // Calculate commission amount if the source defines a commission percentage
    let commissionAmount = 0;
    if (bookingSource?.commission) {
      commissionAmount = (convertedTotal * Number(bookingSource.commission)) / 100;
    }

    // Calculate exchange rate from Property Base Currency to Booking Currency
    const exchangeRate = await this.currenciesService.convert(
      1.0,
      propCurrency,
      res.currency || 'INR',
    );

    // Generate internal booking number
    const bookingNumber = `CM-${channelName.slice(0, 3)}-${Date.now()}`;

    // Create the booking in atomic transaction with duplicate protection
    let newBooking;
    try {
      newBooking = await this.prisma.$transaction(async (tx) => {
        const b = await tx.booking.create({
          data: {
            bookingNumber,
            checkInDate: res.checkInDate,
            checkOutDate: res.checkOutDate,
            numberOfNights: res.numberOfNights,
            adultsCount: res.adultsCount,
            childrenCount: res.childrenCount,
            baseAmount: gstCalculation.baseAmount,
            taxAmount: gstCalculation.taxAmount,
            totalAmount: convertedTotal,
            paidAmount: convertedTotal,
            commissionAmount,
            exchangeRate,
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
    } catch (err: any) {
      if (err?.code === 'P2002' || err?.message?.includes('Unique constraint')) {
        this.logger.warn(`Duplicate booking insertion detected via unique constraint for externalBookingId ${res.externalBookingId}. Returning existing booking.`);
        const existing = await this.prisma.booking.findUnique({
          where: { externalBookingId: res.externalBookingId },
        });
        if (existing) {
          return { success: true, action: 'UPDATED', bookingNumber: existing.bookingNumber };
        }
      }
      throw err;
    }

    this.logger.log(`Created internal booking #${newBooking.bookingNumber} for physical room ${assignedRoom.roomNumber}`);

    // Acknowledge back to channel using revision ID if available (falls back to booking ID)
    const ackId = res.externalRevisionId || res.externalBookingId;
    await adapter.acknowledgeReservation(roomMapping.propertyMapping, ackId, newBooking.bookingNumber);

    // Push updated inventory outward to block all other OTAs instantly
    await this.pushAvailabilityForDates(
      propertyId,
      newBooking.roomTypeId,
      newBooking.checkInDate,
      newBooking.checkOutDate
    );

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

  async getActiveOtas(propertyId: string) {
    const mapping = await this.prisma.channelPropertyMapping.findFirst({
      where: { propertyId, isActive: true, channelName: 'CHANNEX' },
    });

    if (!mapping) {
      return [];
    }

    const userApiKey = process.env.CHANNEX_USER_API_KEY || 'u5wpOi89Mo9NPXiGg03sDppzK6cYX1oUu3jDPx8K8MT10PdikVNXrvcFy4mtAhqF';
    const baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';

    try {
      const response = await fetch(`${baseUrl}/channels?filter[property_id]=${mapping.externalPropertyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': userApiKey,
        },
      });

      if (!response.ok) {
        this.logger.error(`Failed to fetch connected channels from Channex: ${response.statusText}`);
        return [];
      }

      const resData = await response.json();
      if (!resData || !resData.data) {
        return [];
      }

      return resData.data.map((item: any) => ({
        id: item.id || item.attributes?.id,
        title: item.attributes?.title || 'Unknown Channel',
        channel: item.attributes?.channel || 'Unknown',
        isActive: item.attributes?.is_active ?? false,
        mappedRooms: item.attributes?.settings?.mappingSettings?.rooms || {},
      }));
    } catch (err: any) {
      this.logger.error(`Error in getActiveOtas: ${err.message}`);
      return [];
    }
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
        amount: 14500,
        currency: 'INR',
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

  async updatePropertyCurrency(propertyId: string, currency: string) {
    return this.prisma.property.update({
      where: { id: propertyId },
      data: { baseCurrency: currency.toUpperCase() },
    });
  }

  async createStopSell(propertyId: string, roomTypeId: string | null, startDate: string, endDate: string) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const restriction = await this.prisma.stopSellRestriction.create({
      data: {
        propertyId,
        roomTypeId: roomTypeId || null,
        startDate: start,
        endDate: end,
      },
    });

    // Immediate ARI push to pause sales on Channex
    await this.pushAriForProperty(propertyId, 60);

    return restriction;
  }

  async deleteStopSell(id: string) {
    const restriction = await this.prisma.stopSellRestriction.update({
      where: { id },
      data: { isActive: false },
    });

    // Immediate ARI push to resume sales on Channex
    await this.pushAriForProperty(restriction.propertyId, 60);

    return restriction;
  }

  async getStopSells(propertyId: string) {
    return this.prisma.stopSellRestriction.findMany({
      where: { propertyId, isActive: true },
      include: { roomType: true },
      orderBy: { startDate: 'asc' },
    });
  }
}
