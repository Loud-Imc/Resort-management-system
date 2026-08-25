import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { UpdateGlobalCapabilitiesDto } from './dto/update-global-capabilities.dto';
import { ConnectivityPartnerStatus } from '@prisma/client';

@ApiTags('Admin Connectivity Platform')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SuperAdmin', 'Admin')
@Controller('admin/connectivity')
export class AdminConnectivityController {
  constructor(
    private readonly partnerService: ConnectivityPartnerService,
    private readonly settingsService: ConnectivitySettingsService,
    private readonly logService: ConnectivityLogService,
    private readonly outboxProcessorService: ConnectivityOutboxProcessorService,
  ) {}

  @Post('partners')
  @ApiOperation({ summary: 'Create a new B2B Connectivity Partner and issue initial API key' })
  async createPartner(@Body() dto: CreatePartnerDto) {
    return this.partnerService.createPartner(dto);
  }

  @Get('partners')
  @ApiOperation({ summary: 'List all registered Connectivity Partners' })
  async getAllPartners() {
    return this.partnerService.getAllPartners();
  }

  @Get('partners/:id')
  @ApiOperation({ summary: 'Get details and active connections for a Connectivity Partner' })
  async getPartnerById(@Param('id') id: string) {
    return this.partnerService.getPartnerById(id);
  }

  @Patch('partners/:id/status')
  @ApiOperation({ summary: 'Suspend, activate, or deactivate a Connectivity Partner' })
  async updatePartnerStatus(
    @Param('id') id: string,
    @Body('status') status: ConnectivityPartnerStatus,
  ) {
    return this.partnerService.updatePartnerStatus(id, status);
  }

  @Post('partners/:id/credentials')
  @ApiOperation({ summary: 'Issue a new API key / credential for a partner (Rotation / Environment key)' })
  async createCredential(
    @Param('id') partnerId: string,
    @Body() dto: CreateCredentialDto,
  ) {
    return this.partnerService.createCredential(partnerId, dto);
  }

  @Patch('partners/:id/credentials/:credentialId/revoke')
  @ApiOperation({ summary: 'Revoke a specific API key credential for a partner' })
  async revokeCredential(
    @Param('id') partnerId: string,
    @Param('credentialId') credentialId: string,
  ) {
    return this.partnerService.revokeCredential(partnerId, credentialId);
  }

  @Get('settings')
  @ApiOperation({ summary: 'Get central global connectivity capability switches' })
  async getGlobalSettings() {
    return this.settingsService.getGlobalCapabilities();
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update central global connectivity capability switches' })
  async updateGlobalSettings(@Body() dto: UpdateGlobalCapabilitiesDto) {
    return this.settingsService.updateGlobalCapabilities(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Query partner diagnostic audit logs' })
  async getDiagnosticLogs(
    @Query('partnerId') partnerId?: string,
    @Query('connectionId') connectionId?: string,
    @Query('limit') limit?: number,
  ) {
    return this.logService.getLogs(partnerId, connectionId, limit ? Number(limit) : 50);
  }

  @Post('outbox/:id/replay')
  @ApiOperation({ summary: 'Replay a dead-lettered outbox event (FAILED_DEAD_LETTER)' })
  async replayDeadLetterEvent(@Param('id') eventId: string) {
    return this.outboxProcessorService.replayDeadLetterEvent(eventId);
  }
}
