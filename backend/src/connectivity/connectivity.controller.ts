import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { PartnerApiKeyGuard } from './auth/partner-api-key.guard';
import { PartnerRateLimitGuard } from './auth/partner-rate-limit.guard';
import { CurrentPartner } from './auth/partner-request.decorator';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';
import { ConnectivityRatesService } from './services/connectivity-rates.service';
import { ConnectivityRestrictionsService } from './services/connectivity-restrictions.service';
import { ConnectivityReservationService } from './services/connectivity-reservation.service';
import { CreateConnectionDto } from './dto/create-connection.dto';
import { CreateRoomMappingDto } from './dto/create-room-mapping.dto';
import { QueryAvailabilityDto } from './dto/query-availability.dto';
import { QueryContentDto } from './dto/query-content.dto';
import { QueryRatesDto } from './dto/query-rates.dto';
import { QueryRestrictionsDto } from './dto/query-restrictions.dto';
import { UpdateRestrictionsDto } from './dto/update-restrictions.dto';
import { UpdateRatesDto } from './dto/update-rates.dto';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { CreateConnectivityReservationDto } from './dto/create-connectivity-reservation.dto';
import { UpdateConnectivityReservationDto } from './dto/update-connectivity-reservation.dto';
import { CancelConnectivityReservationDto } from './dto/cancel-connectivity-reservation.dto';

@ApiTags('OTA Connectivity Platform v1')
@ApiSecurity('x-api-key')
@UseGuards(PartnerApiKeyGuard, PartnerRateLimitGuard)
@Controller('connectivity/v1')
export class ConnectivityController {
  constructor(
    private readonly connectionService: ConnectivityConnectionService,
    private readonly mappingService: ConnectivityMappingService,
    private readonly settingsService: ConnectivitySettingsService,
    private readonly availabilityService: ConnectivityAvailabilityService,
    private readonly ratesService: ConnectivityRatesService,
    private readonly restrictionsService: ConnectivityRestrictionsService,
    private readonly reservationService: ConnectivityReservationService,
  ) {}

  @Get('ping')
  @ApiOperation({ summary: 'Verify Partner API key authentication and connection status' })
  async ping(@CurrentPartner() partner: any) {
    return {
      status: 'OK',
      partnerId: partner.id,
      partnerName: partner.name,
      partnerCode: partner.code,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Query global platform connectivity capability switches' })
  async getCapabilities() {
    return this.settingsService.getGlobalCapabilities();
  }

  @Post('connections')
  @ApiOperation({ summary: 'Connect a RouteGuide property using externalPropertyId' })
  async createConnection(
    @CurrentPartner() partner: any,
    @Body() dto: CreateConnectionDto,
  ) {
    return this.connectionService.createConnection(partner.id, dto);
  }

  @Get('connections')
  @ApiOperation({ summary: 'List all active property connections for authenticated partner' })
  async getConnections(@CurrentPartner() partner: any) {
    return this.connectionService.getConnectionsForPartner(partner.id);
  }

  @Get('connections/:propertyId')
  @ApiOperation({ summary: 'Get details of a specific property connection' })
  async getConnection(
    @CurrentPartner() partner: any,
    @Param('propertyId') propertyId: string,
  ) {
    return this.connectionService.getConnectionForPartnerAndProperty(partner.id, propertyId);
  }

  @Post('connections/:propertyId/mappings/room-types')
  @ApiOperation({ summary: 'Register or update RoomType mapping for a connected property' })
  async createRoomMapping(
    @CurrentPartner() partner: any,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateRoomMappingDto,
  ) {
    return this.mappingService.createOrUpdateRoomMapping(partner.id, propertyId, dto);
  }

  @Get('connections/:propertyId/mappings/room-types')
  @ApiOperation({ summary: 'Get all RoomType mappings for a connected property' })
  async getRoomMappings(
    @CurrentPartner() partner: any,
    @Param('propertyId') propertyId: string,
  ) {
    return this.mappingService.getRoomMappingsForConnection(partner.id, propertyId);
  }

  // ─── PHASE 2A READ APIs ───────────────────────────────────────────────────

  @Get('content')
  @ApiOperation({ summary: 'Query sanitized property listing content, RoomTypes, policies, and amenities' })
  async getContent(
    @CurrentPartner() partner: any,
    @Query() dto: QueryContentDto,
  ) {
    return this.connectionService.getContentForPartner(partner.id, dto);
  }

  @Get('availability')
  @ApiOperation({ summary: 'Query RoomType-level sellable availability' })
  async getAvailability(
    @CurrentPartner() partner: any,
    @Query() dto: QueryAvailabilityDto,
  ) {
    return this.availabilityService.getAvailability(partner.id, dto);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Query published rates for mapped RoomTypes' })
  async getRates(
    @CurrentPartner() partner: any,
    @Query() dto: QueryRatesDto,
  ) {
    return this.ratesService.getRates(partner.id, dto);
  }

  @Get('restrictions')
  @ApiOperation({ summary: 'Query active restrictions for mapped RoomTypes' })
  async getRestrictions(
    @CurrentPartner() partner: any,
    @Query() dto: QueryRestrictionsDto,
  ) {
    return this.restrictionsService.getRestrictions(partner.id, dto);
  }

  // ─── PHASE 2B RESTRICTIONS WRITE API ──────────────────────────────────────

  @Put('restrictions')
  @ApiOperation({ summary: 'Create or update date-range restriction rules (Min Stay, Max Stay, CTA, CTD)' })
  async updateRestrictions(
    @CurrentPartner() partner: any,
    @Body() dto: UpdateRestrictionsDto,
  ) {
    return this.restrictionsService.updateRestrictions(partner.id, dto);
  }

  // ─── PHASE 2C-1 EXTERNAL RATE UPDATES WRITE API ───────────────────────────

  @Put('rates')
  @ApiOperation({ summary: 'Create or update date-range rate rules from external PMS/Channel Manager' })
  async updateRates(
    @CurrentPartner() partner: any,
    @Body() dto: UpdateRatesDto,
  ) {
    return this.ratesService.updateRates(partner, dto);
  }

  // ─── PHASE 2C-2 EXTERNAL AVAILABILITY UPDATES WRITE API ───────────────────

  @Put('availability')
  @ApiOperation({ summary: 'Create or update date-range external availability allocation caps' })
  async updateAvailability(
    @CurrentPartner() partner: any,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.availabilityService.updateAvailability(partner, dto);
  }

  // ─── PHASE 3 RESERVATION CONNECTIVITY & INGESTION APIs ────────────────────

  @Post('reservations')
  @ApiOperation({ summary: 'Ingest external PMS / Channel Manager reservation' })
  async createReservation(
    @CurrentPartner() partner: any,
    @Body() dto: CreateConnectivityReservationDto,
  ) {
    return this.reservationService.createReservation(partner, dto);
  }

  @Get('reservations/:id')
  @ApiOperation({ summary: 'Retrieve external reservation details' })
  async getReservation(
    @CurrentPartner() partner: any,
    @Param('id') reservationId: string,
  ) {
    return this.reservationService.getReservation(partner, reservationId);
  }

  // ─── PHASE 4 RESERVATION LIFECYCLE (MODIFICATION & CANCELLATION) APIs ──────

  @Put('reservations/:id')
  @ApiOperation({ summary: 'Modify an existing external reservation' })
  async updateReservation(
    @CurrentPartner() partner: any,
    @Param('id') reservationId: string,
    @Body() dto: UpdateConnectivityReservationDto,
  ) {
    return this.reservationService.updateReservation(partner, reservationId, dto);
  }

  @Post('reservations/:id/cancel')
  @ApiOperation({ summary: 'Cancel an existing external reservation' })
  async cancelReservation(
    @CurrentPartner() partner: any,
    @Param('id') reservationId: string,
    @Body() dto: CancelConnectivityReservationDto,
  ) {
    return this.reservationService.cancelReservation(partner, reservationId, dto);
  }
}
