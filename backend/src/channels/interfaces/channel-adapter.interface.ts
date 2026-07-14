import { ChannelPropertyMapping, ChannelRoomTypeMapping, Property, RoomType } from '@prisma/client';

export interface InventoryUpdateDto {
  date: string; // YYYY-MM-DD
  dateTo?: string; // Optional end date (YYYY-MM-DD) for multi-date / range batch updates
  roomTypeId: string;
  externalRoomTypeId: string;
  availableRooms: number;
}

export interface RateUpdateDto {
  date: string; // YYYY-MM-DD
  dateTo?: string; // Optional end date (YYYY-MM-DD) for multi-date / half-year updates
  roomTypeId: string;
  externalRoomTypeId: string;
  externalRatePlanId?: string;
  price?: number;
  minStayArrival?: number;
  minStayThrough?: number;
  maxStay?: number;
  stopSell?: boolean;
  closedToArrival?: boolean;
  closedToDeparture?: boolean;
}

export interface ChannelReservationGuestDto {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface NormalizedChannelReservationDto {
  externalBookingId: string;
  channelName: string;
  sourceName?: string;
  externalPropertyId: string;
  externalRoomTypeId: string;
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  adultsCount: number;
  childrenCount: number;
  totalAmount: number;
  currency?: string;
  guest: ChannelReservationGuestDto;
  specialRequests?: string;
  status: 'CONFIRMED' | 'CANCELLED' | 'MODIFIED';
}

export interface IChannelAdapter {
  readonly channelName: string;

  /**
   * Programmatically create a remote property inside the channel manager via API
   */
  createRemoteProperty?(
    property: Property,
  ): Promise<{ externalPropertyId: string }>;

  /**
   * Programmatically create a remote room type inside the channel manager via API
   */
  createRemoteRoomType?(
    externalPropertyId: string,
    roomType: RoomType,
  ): Promise<{ externalRoomTypeId: string; externalRatePlanId?: string }>;

  /**
   * Push inventory availability to the external channel API (e.g. Channex, STAAH)
   */
  pushInventory(
    propertyMapping: ChannelPropertyMapping & { roomMappings: ChannelRoomTypeMapping[] },
    updates: InventoryUpdateDto[],
  ): Promise<boolean>;

  /**
   * Push daily rates to the external channel API
   */
  pushRates(
    propertyMapping: ChannelPropertyMapping & { roomMappings: ChannelRoomTypeMapping[] },
    updates: RateUpdateDto[],
  ): Promise<boolean>;

  /**
   * Parse incoming webhook payload into our clean, standardized DTO
   */
  parseIncomingReservation(
    payload: any,
    headers?: Record<string, any>,
  ): Promise<NormalizedChannelReservationDto>;

  /**
   * Acknowledge/Confirm receipt of reservation back to the channel
   */
  acknowledgeReservation(
    propertyMapping: ChannelPropertyMapping,
    externalBookingId: string,
    internalBookingNumber: string,
  ): Promise<boolean>;

  /**
   * Programmatically register a webhook callback URL for this remote property
   */
  registerWebhook?(
    externalPropertyId: string,
    webhookUrl: string,
  ): Promise<boolean>;
}
