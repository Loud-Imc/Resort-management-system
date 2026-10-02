import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RatePlansService } from './services/rate-plans.service';
import {
  CreateRatePlanDto,
  UpdateRatePlanDto,
  BulkPricingRuleDto,
  CreateCalendarEventMarkerDto,
  ApplyRestrictionsDto,
  SetInventoryOverrideDto,
  SetMultiChannelInventoryOverrideDto,
  SetMultiChannelPriceOverrideDto,
  ApplyBulkInventoryOverrideDto,
  QueryRateRestrictionLogsDto,
} from './dto/rate-plan.dto';

@ApiTags('Rate Plans & Calendar Rules')
@Controller('rate-plans')
export class RatePlansController {
  constructor(private readonly ratePlansService: RatePlansService) {}

  @Get('matrix/:propertyId')
  @ApiOperation({ summary: 'Get unified property rate matrix, physical room inventory & restrictions' })
  async getPropertyRateMatrix(
    @Param('propertyId') propertyId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.ratePlansService.getPropertyRateMatrixData(propertyId, startDate, endDate);
  }

  @Get('room-type/:roomTypeId')
  @ApiOperation({ summary: 'Get all Rate Plans for a specific Room Type' })
  async getRatePlansForRoomType(@Param('roomTypeId') roomTypeId: string) {
    return this.ratePlansService.getRatePlansForRoomType(roomTypeId);
  }

  @Get('property/:propertyId')
  @ApiOperation({ summary: 'Get all Rate Plans for an entire Property' })
  async getRatePlansForProperty(@Param('propertyId') propertyId: string) {
    return this.ratePlansService.getRatePlansForProperty(propertyId);
  }

  @Get('logs/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get activity & rate restriction audit logs for property' })
  async getRateRestrictionLogs(
    @Param('propertyId') propertyId: string,
    @Query() query: QueryRateRestrictionLogsDto,
  ) {
    return this.ratePlansService.getRateRestrictionLogs(propertyId, query);
  }

  @Post('reset-defaults/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Consolidate and reset property rate plans to standard 4 tiers (EP, CP, MAP, AP)' })
  async resetPropertyRatePlans(@Param('propertyId') propertyId: string) {
    return this.ratePlansService.resetPropertyRatePlans(propertyId);
  }

  @Post('sync-property/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Recalculate and synchronize all room type meal plan prices for a property' })
  async syncPropertyRatePlans(@Param('propertyId') propertyId: string) {
    return this.ratePlansService.syncAllRatePlansForProperty(propertyId);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new Rate Plan (EP, CP, MAP, AP)' })
  async createRatePlan(@Body() dto: CreateRatePlanDto) {
    return this.ratePlansService.createRatePlan(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update an existing Rate Plan' })
  async updateRatePlan(@Param('id') id: string, @Body() dto: UpdateRatePlanDto, @Req() req?: any) {
    return this.ratePlansService.updateRatePlan(id, dto, req?.user);
  }

  @Put(':id/room-type-prices')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update Room Type Prices for a Rate Plan' })
  async updateRoomTypePrices(
    @Param('id') id: string,
    @Body() dto: { roomTypePrices: any[] },
  ) {
    return this.ratePlansService.updateRoomTypePrices(id, dto.roomTypePrices);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete (deactivate) a Rate Plan' })
  async deleteRatePlan(@Param('id') id: string) {
    return this.ratePlansService.deleteRatePlan(id);
  }

  @Post('bulk-rule')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Apply bulk pricing rule (Weekdays vs Weekends or Festival Overrides)' })
  async applyBulkPricingRule(@Body() dto: BulkPricingRuleDto, @Req() req?: any) {
    return this.ratePlansService.applyBulkPricingRule(dto, req?.user);
  }

  @Post('restrictions')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Apply restrictions (Min Stay, Max Stay, CTA, CTD, Stop Sell)' })
  async applyRestrictions(@Body() dto: ApplyRestrictionsDto, @Req() req?: any) {
    return this.ratePlansService.applyRestrictions(dto, req?.user);
  }

  @Get('restrictions/active/:propertyId')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Get active stay restriction rules for a property' })
  async getActiveRestrictions(
    @Param('propertyId') propertyId: string,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.ratePlansService.getActiveRestrictionRules(propertyId, roomTypeId);
  }

  @Post('restrictions/clear/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Clear an active restriction rule and sync removal across channels' })
  async clearRestrictionRule(
    @Param('id') id: string,
    @Req() req?: any,
  ) {
    return this.ratePlansService.clearRestrictionRule(id, req?.user);
  }

  @Post('inventory-override')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set manual physical room inventory quantity override' })
  async setInventoryOverride(@Body() dto: SetInventoryOverrideDto, @Req() req?: any) {
    return this.ratePlansService.setInventoryOverride(dto, req?.user);
  }

  @Post('multi-channel-inventory-override')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set channel-specific inventory allotments / allotment caps with Channex sync verification' })
  async setMultiChannelInventoryOverride(@Body() dto: SetMultiChannelInventoryOverrideDto, @Req() req?: any) {
    return this.ratePlansService.setMultiChannelInventoryOverride(dto, req?.user);
  }

  @Post('bulk-inventory-override')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Bulk apply channel inventory allotments across date ranges and days of week' })
  async applyBulkInventoryOverride(@Body() dto: ApplyBulkInventoryOverrideDto, @Req() req?: any) {
    return this.ratePlansService.applyBulkInventoryOverride(dto, req?.user);
  }

  @Post('multi-channel-price-override')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Set channel-specific daily tariffs with AC/Non-AC separation and Channex delta ARI push' })
  async setMultiChannelPriceOverride(@Body() dto: SetMultiChannelPriceOverrideDto, @Req() req?: any) {
    return this.ratePlansService.setMultiChannelPriceOverride(dto, req?.user);
  }

  @Get('events/:propertyId')
  @ApiOperation({ summary: 'Get calendar event markers and festival highlights' })
  async getCalendarEventMarkers(
    @Param('propertyId') propertyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ratePlansService.getCalendarEventMarkers(propertyId, startDate, endDate);
  }

  @Post('events')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a calendar event / festival marker' })
  async createCalendarEventMarker(@Body() dto: CreateCalendarEventMarkerDto) {
    return this.ratePlansService.createCalendarEventMarker(dto);
  }

  @Delete('events/:id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Delete a calendar event marker' })
  async deleteCalendarEventMarker(@Param('id') id: string) {
    return this.ratePlansService.deleteCalendarEventMarker(id);
  }
}

