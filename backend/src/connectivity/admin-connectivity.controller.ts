import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { ConnectivitySandboxService } from './services/connectivity-sandbox.service';
import { ConnectivityCertificationService } from './services/connectivity-certification.service';
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
    private readonly sandboxService: ConnectivitySandboxService,
    private readonly certificationService: ConnectivityCertificationService,
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

  // ─── PHASE 7 SANDBOX MVP ADMIN APIs ───────────────────────────────────────

  @Post('sandbox/test-webhook')
  @ApiOperation({ summary: 'Staff Admin trigger for partner sandbox webhook signature & reachability testing' })
  async adminTestWebhook(@Body('partnerId') partnerId: string) {
    if (!partnerId) {
      throw new BadRequestException('partnerId is required for admin sandbox test webhook trigger.');
    }
    return this.sandboxService.triggerTestWebhook(partnerId, false);
  }

  @Post('sandbox/reset')
  @ApiOperation({ summary: 'Staff Admin trigger to reset mock sandbox data for a partner on TEST-PROP-001' })
  async adminResetData(@Body('partnerId') partnerId: string) {
    if (!partnerId) {
      throw new BadRequestException('partnerId is required for admin sandbox reset.');
    }
    return this.sandboxService.resetSandboxData(partnerId, false);
  }

  // ─── PHASE 8 PARTNER SELF-CERTIFICATION ADMIN APIs ────────────────────────

  @Patch('partners/:id/certification/override')
  @Roles('SuperAdmin')
  @ApiOperation({ summary: 'SuperAdmin manual override for partner certification status' })
  async overrideCertification(
    @Param('id') partnerId: string,
    @Body('status') status: 'PASSED' | 'FAILED',
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const userRole = req.user?.role || (req.user?.roles && req.user.roles[0]);
    if (userRole !== 'SuperAdmin' && (!req.user?.roles || !req.user.roles.includes('SuperAdmin'))) {
      throw new ForbiddenException('Only SuperAdmin users are authorized to override partner certification status.');
    }
    if (!status || !['PASSED', 'FAILED'].includes(status)) {
      throw new BadRequestException('Valid status (PASSED or FAILED) is required.');
    }
    return this.certificationService.overrideCertification(
      partnerId,
      status,
      reason,
      req.user?.id || 'admin',
    );
  }
}
