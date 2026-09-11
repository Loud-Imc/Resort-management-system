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
  address?: string;
  city?: string;
  postalCode?: string;
  country?: string;
  language?: string;
}

export interface NormalizedChannelReservationRoomDto {
  externalRoomTypeId: string;
  externalRatePlanId?: string;
  amount?: number;
  occupancy?: {
    adults?: number;
    children?: number;
    infants?: number;
  };
  mealPlan?: string;
  smokingPreference?: string;
  bedPreference?: string;
  notes?: string;
}

export interface NormalizedChannelReservationDto {
  externalBookingId: string;
  externalRevisionId?: string;
  channelName: string;
  sourceName?: string;
  externalPropertyId: string;
  externalRoomTypeId: string;
  rooms?: NormalizedChannelReservationRoomDto[];
  checkInDate: Date;
  checkOutDate: Date;
  numberOfNights: number;
  adultsCount: number;
  childrenCount: number;
  infantsCount?: number;
  totalAmount: number;
  currency?: string;
  commissionAmount?: number;
  paymentType?: 'HOTEL_COLLECT' | 'CHANNEL_COLLECT';
  guarantee?: string;
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
    roomType: RoomType & { rooms?: any[]; property?: Partial<Property> },
  ): Promise<{ externalRoomTypeId: string; externalRatePlanId?: string }>;

  /**
   * Programmatically update an existing remote room type inside the channel manager via API
   */
  updateRemoteRoomType?(
    externalRoomTypeId: string,
    roomType: RoomType & { property?: Partial<Property> },
  ): Promise<boolean>;

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

  createChannel?(
    externalPropertyId: string,
    otaId: string,
    title: string,
    settings?: any,
  ): Promise<string>;

  deleteChannel?(
    externalChannelId: string,
  ): Promise<boolean>;

  getIframeSessionToken?(
    externalPropertyId: string,
  ): Promise<string>;
}
