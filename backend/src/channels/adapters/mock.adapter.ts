import { Injectable, Logger } from '@nestjs/common';
import {
  IChannelAdapter,
  InventoryUpdateDto,
  RateUpdateDto,
  NormalizedChannelReservationDto,
} from '../interfaces/channel-adapter.interface';
import { ChannelPropertyMapping, ChannelRoomTypeMapping } from '@prisma/client';

@Injectable()
export class MockAdapter implements IChannelAdapter {
  readonly channelName = 'MOCK';
  private readonly logger = new Logger(MockAdapter.name);

  async pushInventory(
    propertyMapping: ChannelPropertyMapping & { roomMappings: ChannelRoomTypeMapping[] },
    updates: InventoryUpdateDto[],
  ): Promise<boolean> {
    this.logger.log(`[MockAdapter] Pushing ${updates.length} inventory updates for Property [${propertyMapping.externalPropertyId}]:`);
    updates.forEach((u) => {
      this.logger.debug(`  -> Date: ${u.date} | ExternalRoomType: ${u.externalRoomTypeId} | Available: ${u.availableRooms}`);
    });
    return true;
  }

  async pushRates(
    propertyMapping: ChannelPropertyMapping & { roomMappings: ChannelRoomTypeMapping[] },
    updates: RateUpdateDto[],
  ): Promise<boolean> {
    this.logger.log(`[MockAdapter] Pushing ${updates.length} rate updates for Property [${propertyMapping.externalPropertyId}]:`);
    updates.forEach((u) => {
      this.logger.debug(`  -> Date: ${u.date} | ExternalRoomType: ${u.externalRoomTypeId} | Price: ${u.price}`);
    });
    return true;
  }

  async parseIncomingReservation(
    payload: any,
    headers?: Record<string, any>,
  ): Promise<NormalizedChannelReservationDto> {
    this.logger.log(`[MockAdapter] Parsing mock reservation webhook...`);
    
    return {
      externalBookingId: String(payload.externalBookingId || `mock-${Date.now()}`),
      channelName: 'MOCK',
      externalPropertyId: String(payload.externalPropertyId || 'mock-prop-1'),
      externalRoomTypeId: String(payload.externalRoomTypeId || 'mock-room-1'),
      checkInDate: new Date(payload.checkInDate || Date.now() + 86400000),
      checkOutDate: new Date(payload.checkOutDate || Date.now() + 86400000 * 3),
      numberOfNights: Number(payload.numberOfNights || 2),
      adultsCount: Number(payload.adultsCount || 2),
      childrenCount: Number(payload.childrenCount || 0),
      totalAmount: Number(payload.totalAmount || 8000),
      currency: payload.currency || 'INR',
      guest: {
        firstName: payload.guest?.firstName || 'John',
        lastName: payload.guest?.lastName || 'Doe (Mock OTA)',
        email: payload.guest?.email || 'mock.guest@ota.test',
        phone: payload.guest?.phone || '+919876543210',
      },
      specialRequests: payload.specialRequests || 'Late check-in requested via Mock OTA',
      status: payload.status || 'CONFIRMED',
    };
  }

  async acknowledgeReservation(
    propertyMapping: ChannelPropertyMapping,
    externalBookingId: string,
    internalBookingNumber: string,
  ): Promise<boolean> {
    this.logger.log(`[MockAdapter] Acknowledged ${externalBookingId} with internal booking #${internalBookingNumber}`);
    return true;
  }
}
