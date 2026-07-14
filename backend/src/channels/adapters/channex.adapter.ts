import { Injectable, Logger } from '@nestjs/common';
import {
  IChannelAdapter,
  InventoryUpdateDto,
  RateUpdateDto,
  NormalizedChannelReservationDto,
} from '../interfaces/channel-adapter.interface';
import { ChannelPropertyMapping, ChannelRoomTypeMapping, Property, RoomType } from '@prisma/client';

@Injectable()
export class ChannexAdapter implements IChannelAdapter {
  readonly channelName = 'CHANNEX';
  private readonly logger = new Logger(ChannexAdapter.name);
  private readonly baseUrl = process.env.CHANNEX_BASE_URL || 'https://staging.channex.io/api/v1';

  private normalizeCountryCode(country?: string): string {
    if (!country) return 'IN';
    const c = country.trim();
    if (c.length === 2) return c.toUpperCase();
    const map: Record<string, string> = {
      'india': 'IN',
      'united states': 'US',
      'usa': 'US',
      'united kingdom': 'GB',
      'uk': 'GB',
      'australia': 'AU',
      'canada': 'CA',
      'united arab emirates': 'AE',
      'uae': 'AE',
      'singapore': 'SG',
      'malaysia': 'MY',
      'thailand': 'TH',
      'france': 'FR',
      'germany': 'DE',
      'italy': 'IT',
      'spain': 'ES',
      'indonesia': 'ID',
      'sri lanka': 'LK',
      'nepal': 'NP',
      'maldives': 'MV',
      'saudi arabia': 'SA',
      'qatar': 'QA',
      'oman': 'OM',
      'kuwait': 'KW',
      'bahrain': 'BH',
      'vietnam': 'VN',
      'philippines': 'PH',
      'japan': 'JP',
      'china': 'CN',
      'south korea': 'KR',
      'russia': 'RU',
      'brazil': 'BR',
      'mexico': 'MX',
      'south africa': 'ZA',
      'new zealand': 'NZ',
      'switzerland': 'CH',
      'netherlands': 'NL',
      'belgium': 'BE',
      'austria': 'AT',
      'greece': 'GR',
      'portugal': 'PT',
      'turkey': 'TR',
      'egypt': 'EG',
      'kenya': 'KE',
    };
    return map[c.toLowerCase()] || c.substring(0, 2).toUpperCase() || 'IN';
  }

  private normalizeCurrencyCode(currency?: string): string {
    if (!currency) return 'INR';
    const cur = currency.trim();
    if (cur.length === 3) return cur.toUpperCase();
    if (cur.toLowerCase().includes('rupee') || cur.toLowerCase() === 'inr') return 'INR';
    if (cur.toLowerCase().includes('dollar') || cur.toLowerCase() === 'usd') return 'USD';
    if (cur.toLowerCase().includes('euro') || cur.toLowerCase() === 'eur') return 'EUR';
    if (cur.toLowerCase().includes('pound') || cur.toLowerCase() === 'gbp') return 'GBP';
    return cur.substring(0, 3).toUpperCase() || 'INR';
  }

  async createRemoteProperty(property: Property): Promise<{ externalPropertyId: string }> {
    const userApiKey = process.env.CHANNEX_USER_API_KEY;
    if (!userApiKey) {
      throw new Error('CHANNEX_USER_API_KEY is missing in backend environment (.env). Cannot auto-create Channex property.');
    }

    const countryCode = this.normalizeCountryCode(property.country);
    const currencyCode = this.normalizeCurrencyCode(property.baseCurrency);

    const payload = {
      property: {
        title: property.name,
        currency: currencyCode,
        country: countryCode,
        timezone: 'Asia/Kolkata',
      },
    };

    this.logger.log(`[Channex] Auto-creating remote property for local PMS property: ${property.name} (${property.id}) [Country: ${countryCode}, Currency: ${currencyCode}]`);
    const response = await fetch(`${this.baseUrl}/properties`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`[Channex] Failed to create remote property: ${response.status} ${errText}`);
      throw new Error(`Channex Property Creation Failed: ${errText}`);
    }

    const data = await response.json();
    const externalPropertyId = String(data?.data?.id || data?.id);
    this.logger.log(`[Channex] Successfully auto-created remote property ID: ${externalPropertyId}`);
    return { externalPropertyId };
  }

  async createRemoteRoomType(externalPropertyId: string, roomType: RoomType & { rooms?: any[] }): Promise<{ externalRoomTypeId: string; externalRatePlanId?: string }> {
    const userApiKey = process.env.CHANNEX_USER_API_KEY;
    if (!userApiKey) {
      throw new Error('CHANNEX_USER_API_KEY is missing in .env');
    }

    const payload = {
      room_type: {
        property_id: externalPropertyId,
        title: roomType.name,
        count_of_rooms: Math.max(1, roomType.rooms?.length || 5),
        occ_adults: Math.max(1, roomType.maxAdults || 2),
        occ_children: Math.max(0, roomType.maxChildren || 2),
        occ_infants: Math.max(0, roomType.freeChildrenCount || 0),
        default_occupancy: Math.max(1, roomType.maxAdults || 2),
      },
    };

    this.logger.log(`[Channex] Auto-creating remote room type '${roomType.name}' under Channex Property ID ${externalPropertyId} [occ_infants: ${payload.room_type.occ_infants}]`);
    const response = await fetch(`${this.baseUrl}/room_types`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user-api-key': userApiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      this.logger.error(`[Channex] Failed to create room type: ${response.status} ${errText}`);
      throw new Error(`Channex RoomType Creation Failed: ${errText}`);
    }

    const data = await response.json();
    const externalRoomTypeId = String(data?.data?.id || data?.id);
    this.logger.log(`[Channex] Successfully auto-created remote room type ID: ${externalRoomTypeId}`);

    // Also auto-create a default Rate Plan for this room type
    let externalRatePlanId: string | undefined = undefined;
    try {
      const ratePlanPayload = {
        rate_plan: {
          title: `${roomType.name} Standard Rate`,
          property_id: externalPropertyId,
          room_type_id: externalRoomTypeId,
          currency: 'INR',
          options: [
            {
              occupancy: Math.max(1, roomType.maxAdults || 2),
              is_primary: true,
              rate: Number(roomType.basePrice || 2500),
            }
          ]
        },
      };
      const rpRes = await fetch(`${this.baseUrl}/rate_plans`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': userApiKey,
        },
        body: JSON.stringify(ratePlanPayload),
      });
      if (rpRes.ok) {
        const rpData = await rpRes.json();
        externalRatePlanId = String(rpData?.data?.id || rpData?.id);
        this.logger.log(`[Channex] Successfully auto-created default rate plan ID: ${externalRatePlanId}`);
      } else {
        const rpErrText = await rpRes.text();
        this.logger.warn(`[Channex] Could not auto-create rate plan: ${rpRes.status} ${rpErrText}`);
      }
    } catch (e: any) {
      this.logger.warn(`[Channex] Rate plan creation skipped or failed: ${e.message}`);
    }

    return { externalRoomTypeId, externalRatePlanId };
  }

  /**
   * Helper with retry and exponential backoff for Channex rate limits (20 ARI/minute) & 429/5xx responses
   */
  private async fetchWithRetry(url: string, options: any, maxRetries = 3): Promise<Response> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const response = await fetch(url, options);
      if (response.status === 429 || response.status >= 500) {
        if (attempt === maxRetries) return response;
        const retryAfterHeader = response.headers.get('retry-after');
        const delayMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : Math.pow(2, attempt) * 1000;
        this.logger.warn(`[Channex Rate Limit/Error] HTTP ${response.status} from ${url}. Retrying attempt ${attempt + 1}/${maxRetries} after ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      return response;
    }
    throw new Error(`Max retries exceeded for ${url}`);
  }

  async pushInventory(
    propertyMapping: ChannelPropertyMapping & { roomMappings: ChannelRoomTypeMapping[] },
    updates: InventoryUpdateDto[],
  ): Promise<boolean> {
    if (!updates || updates.length === 0) return true;
    if (!propertyMapping.apiKey) {
      this.logger.warn(`No Channex API key set for property mapping ID ${propertyMapping.id}`);
      return false;
    }

    const availabilityPayload = {
      values: updates.map((u) => ({
        property_id: propertyMapping.externalPropertyId,
        room_type_id: u.externalRoomTypeId,
        date_from: u.date,
        date_to: u.dateTo || u.date,
        availability: Math.max(0, u.availableRooms),
      })),
    };

    try {
      this.logger.log(`[Channex] Pushing inventory for property ${propertyMapping.externalPropertyId}: ${updates.length} batched items`);
      const response = await this.fetchWithRetry(`${this.baseUrl}/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': propertyMapping.apiKey,
        },
        body: JSON.stringify(availabilityPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`[Channex] Failed to push inventory: ${response.status} ${errText}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`[Channex] Network error pushing inventory: ${error.message}`);
      return false;
    }
  }

  async pushRates(
    propertyMapping: ChannelPropertyMapping & { roomMappings: ChannelRoomTypeMapping[] },
    updates: RateUpdateDto[],
  ): Promise<boolean> {
    if (!updates || updates.length === 0) return true;
    if (!propertyMapping.apiKey) return false;

    const restrictionsPayload = {
      values: updates.map((u) => {
        const item: any = {
          property_id: propertyMapping.externalPropertyId,
          room_type_id: u.externalRoomTypeId,
          date_from: u.date,
          date_to: u.dateTo || u.date,
        };
        if (u.externalRatePlanId) item.rate_plan_id = u.externalRatePlanId;
        if (u.price !== undefined && u.price !== null) item.rate = Math.round(Number(u.price) * 100);
        if (u.minStayArrival !== undefined && u.minStayArrival !== null) item.min_stay_arrival = Number(u.minStayArrival);
        if (u.minStayThrough !== undefined && u.minStayThrough !== null) item.min_stay_through = Number(u.minStayThrough);
        if (u.maxStay !== undefined && u.maxStay !== null) item.max_stay = Number(u.maxStay);
        if (u.stopSell !== undefined && u.stopSell !== null) item.stop_sell = Boolean(u.stopSell);
        if (u.closedToArrival !== undefined && u.closedToArrival !== null) item.closed_to_arrival = Boolean(u.closedToArrival);
        if (u.closedToDeparture !== undefined && u.closedToDeparture !== null) item.closed_to_departure = Boolean(u.closedToDeparture);
        return item;
      }),
    };

    try {
      this.logger.log(`[Channex] Pushing rates/restrictions for property ${propertyMapping.externalPropertyId}: ${updates.length} batched items`);
      const response = await this.fetchWithRetry(`${this.baseUrl}/restrictions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': propertyMapping.apiKey,
        },
        body: JSON.stringify(restrictionsPayload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.error(`[Channex] Failed to push restrictions: ${response.status} ${errText}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`[Channex] Network error pushing restrictions: ${error.message}`);
      return false;
    }
  }

  async parseIncomingReservation(
    payload: any,
    headers?: Record<string, any>,
  ): Promise<NormalizedChannelReservationDto> {
    // Channex webhook payload structure: { event: "booking", data: { ... } }
    const booking = payload?.data || payload;
    const rooms = booking?.rooms || [];
    const firstRoom = rooms[0] || {};
    const customer = booking?.customer || {};

    // Map status from Channex status (new, modified, cancelled)
    let status: 'CONFIRMED' | 'CANCELLED' | 'MODIFIED' = 'CONFIRMED';
    if (booking?.status === 'cancelled' || payload?.event === 'booking_cancelled') {
      status = 'CANCELLED';
    } else if (booking?.status === 'modified' || payload?.event === 'booking_modified') {
      status = 'MODIFIED';
    }

    const checkInDate = firstRoom.checkin_date || booking.arrival_date || new Date().toISOString().split('T')[0];
    const checkOutDate = firstRoom.checkout_date || booking.departure_date || new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const numberOfNights = Math.max(1, Math.round((new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / 86400000));

    return {
      externalBookingId: String(booking.id || payload.id || `ch-${Date.now()}`),
      channelName: 'CHANNEX',
      sourceName: String(booking?.channel_name || booking?.source || booking?.ota_name || booking?.channel?.title || booking?.channel?.name || 'Channex OTA').trim(),
      externalPropertyId: String(booking.property_id || payload.property_id || ''),
      externalRoomTypeId: String(firstRoom.room_type_id || firstRoom.id || ''),
      checkInDate: new Date(checkInDate),
      checkOutDate: new Date(checkOutDate),
      numberOfNights,
      adultsCount: Number(firstRoom.occupancy?.adults || booking.adults || 2),
      childrenCount: Number(firstRoom.occupancy?.children || booking.children || 0),
      totalAmount: Number(booking.total_amount || booking.amount || 0),
      currency: booking.currency || 'INR',
      guest: {
        firstName: customer.name || 'OTA Guest',
        lastName: customer.surname || 'Guest',
        email: customer.mail || customer.email,
        phone: customer.phone,
      },
      specialRequests: booking?.notes || booking?.special_requests,
      status,
    };
  }

  async acknowledgeReservation(
    propertyMapping: ChannelPropertyMapping,
    externalBookingId: string,
    internalBookingNumber: string,
  ): Promise<boolean> {
    if (!propertyMapping.apiKey) return false;

    try {
      this.logger.log(`[Channex] Acknowledging booking revision ${externalBookingId} -> internal #${internalBookingNumber}`);
      // Channex certification requires acknowledging via /booking_revisions/:id/ack for revisions or /bookings/:id/ack for base bookings
      let endpoint = `${this.baseUrl}/booking_revisions/${externalBookingId}/ack`;
      let response = await this.fetchWithRetry(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': propertyMapping.apiKey,
        },
        body: JSON.stringify({ reference_id: internalBookingNumber }),
      });

      if (response.status === 404) {
        endpoint = `${this.baseUrl}/bookings/${externalBookingId}/ack`;
        response = await this.fetchWithRetry(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'user-api-key': propertyMapping.apiKey,
          },
          body: JSON.stringify({ reference_id: internalBookingNumber }),
        });
      }

      if (!response.ok) {
        this.logger.warn(`[Channex] Failed ack for ${externalBookingId} via ${endpoint}: ${response.status}`);
        return false;
      }

      return true;
    } catch (error: any) {
      this.logger.error(`[Channex] Network error acknowledging reservation: ${error.message}`);
      return false;
    }
  }

  async registerWebhook(externalPropertyId: string, webhookUrl: string): Promise<boolean> {
    const userApiKey = process.env.CHANNEX_USER_API_KEY;
    if (!userApiKey || !webhookUrl) return false;

    try {
      this.logger.log(`[Channex] Auto-registering webhook URL ${webhookUrl} for remote property ${externalPropertyId}`);
      const payload = {
        webhook: {
          property_id: externalPropertyId,
          callback_url: webhookUrl,
          event_mask: '*',
          is_active: true,
        },
      };

      const response = await fetch(`${this.baseUrl}/webhooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'user-api-key': userApiKey,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errText = await response.text();
        this.logger.warn(`[Channex] Could not auto-register webhook: ${response.status} ${errText}`);
        return false;
      }

      this.logger.log(`[Channex] Successfully auto-registered webhook for property ${externalPropertyId}!`);
      return true;
    } catch (error: any) {
      this.logger.warn(`[Channex] Network error registering webhook: ${error.message}`);
      return false;
    }
  }
}
