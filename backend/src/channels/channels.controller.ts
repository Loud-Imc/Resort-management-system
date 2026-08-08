import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Headers,
  HttpCode,
  HttpStatus,
  Query,
  Delete,
} from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Get('catalog')
  async getChannexCatalog() {
    return this.channelsService.getAvailableChannelsCatalog();
  }

  @Get('mappings/:propertyId')
  async getMappings(@Param('propertyId') propertyId: string) {
    return this.channelsService.getPropertyMappings(propertyId);
  }

  @Get('active-otas/:propertyId')
  async getActiveOtas(@Param('propertyId') propertyId: string) {
    return this.channelsService.getActiveOtas(propertyId);
  }

  @Post('mappings/property')
  async savePropertyMapping(
    @Body() body: { propertyId: string; channelName: string; externalPropertyId: string; apiKey?: string },
  ) {
    return this.channelsService.savePropertyMapping(
      body.propertyId,
      body.channelName,
      body.externalPropertyId,
      body.apiKey,
    );
  }

  @Post('mappings/room')
  async saveRoomMapping(
    @Body() body: { propertyMappingId: string; roomTypeId: string; externalRoomTypeId: string; externalRatePlanId?: string },
  ) {
    return this.channelsService.saveRoomMapping(
      body.propertyMappingId,
      body.roomTypeId,
      body.externalRoomTypeId,
      body.externalRatePlanId,
    );
  }

  @Post('enable/:propertyId')
  async enableChannelSync(
    @Param('propertyId') propertyId: string,
    @Query('channelName') channelName = 'CHANNEX',
  ) {
    return this.channelsService.enableChannelSyncForProperty(propertyId, channelName);
  }

  @Post('disable/:propertyId')
  async disableChannelSync(
    @Param('propertyId') propertyId: string,
    @Query('channelName') channelName = 'CHANNEX',
  ) {
    return this.channelsService.disableChannelSyncForProperty(propertyId, channelName);
  }

  @Post('push/:propertyId')
  @HttpCode(HttpStatus.OK)
  async pushAri(@Param('propertyId') propertyId: string, @Query('days') days?: number) {
    await this.channelsService.pushAriForProperty(propertyId, days ? Number(days) : 60);
    return { success: true, message: `Successfully triggered ARI sync for property ${propertyId}` };
  }

  @Post('push-delta/:propertyId')
  @HttpCode(HttpStatus.OK)
  async pushDeltaAri(
    @Param('propertyId') propertyId: string,
    @Body() body: { inventoryUpdates?: any[]; rateUpdates?: any[] },
  ) {
    const success = await this.channelsService.pushDeltaAri(propertyId, body?.inventoryUpdates || [], body?.rateUpdates || []);
    return { success, message: `Successfully triggered delta ARI push for property ${propertyId}` };
  }

  @Post('simulate-booking/:propertyId')
  @HttpCode(HttpStatus.OK)
  async simulateBooking(
    @Param('propertyId') propertyId: string,
    @Query('otaName') otaName = 'MakeMyTrip',
  ) {
    return this.channelsService.simulateIncomingOtaBooking(propertyId, otaName);
  }

  @Post('webhook/:channelName')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Param('channelName') channelName: string,
    @Body() payload: any,
    @Headers() headers: Record<string, any>,
  ) {
    const isAri = payload?.event === 'ari';
    if (isAri) {
      console.log(`webhook payload: [ARI Event ignored - items count: ${payload.payload?.length || 0}]`);
    } else {
      console.log("webhook payload : ", payload);
    }
    return this.channelsService.handleIncomingReservation(channelName, payload, headers);
  }

  @Post('connect-ota')
  async connectOtaChannel(
    @Body() body: { propertyId: string; otaKey: string; hotelId: string; settings: any },
  ) {
    return this.channelsService.connectOtaChannel(
      body.propertyId,
      body.otaKey,
      body.hotelId,
      body.settings,
    );
  }

  @Post('disconnect-ota')
  async disconnectOtaChannel(
    @Body() body: { propertyId: string; otaKey: string },
  ) {
    return this.channelsService.disconnectOtaChannel(body.propertyId, body.otaKey);
  }

  @Get('iframe-url/:propertyId')
  async getIframeUrl(@Param('propertyId') propertyId: string) {
    return this.channelsService.getIframeSessionUrl(propertyId);
  }

  @Post('update-currency/:propertyId')
  async updatePropertyCurrency(
    @Param('propertyId') propertyId: string,
    @Body() body: { currency: string },
  ) {
    return this.channelsService.updatePropertyCurrency(propertyId, body.currency);
  }

  @Get('stop-sells/:propertyId')
  async getStopSells(@Param('propertyId') propertyId: string) {
    return this.channelsService.getStopSells(propertyId);
  }

  @Post('stop-sell')
  async createStopSell(
    @Body() body: { propertyId: string; roomTypeId: string | null; startDate: string; endDate: string },
  ) {
    return this.channelsService.createStopSell(
      body.propertyId,
      body.roomTypeId,
      body.startDate,
      body.endDate,
    );
  }

  @Delete('stop-sell/:id')
  async deleteStopSell(@Param('id') id: string) {
    return this.channelsService.deleteStopSell(id);
  }
}
