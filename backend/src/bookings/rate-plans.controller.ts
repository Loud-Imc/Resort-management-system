import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RatePlansService } from './services/rate-plans.service';
import { CreateRatePlanDto, UpdateRatePlanDto, BulkPricingRuleDto, CreateCalendarEventMarkerDto } from './dto/rate-plan.dto';

@ApiTags('Rate Plans & Calendar Rules')
@Controller('rate-plans')
export class RatePlansController {
  constructor(private readonly ratePlansService: RatePlansService) {}

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

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Create a new Rate Plan (EP, CP, MAP, AP)' })
  async createRatePlan(@Body() dto: CreateRatePlanDto) {
    return this.ratePlansService.createRatePlan(dto);
  }

  @Put(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiOperation({ summary: 'Update an existing Rate Plan' })
  async updateRatePlan(@Param('id') id: string, @Body() dto: UpdateRatePlanDto) {
    return this.ratePlansService.updateRatePlan(id, dto);
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
  async applyBulkPricingRule(@Body() dto: BulkPricingRuleDto) {
    return this.ratePlansService.applyBulkPricingRule(dto);
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
