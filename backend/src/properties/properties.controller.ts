import {
    Controller,
    Get,
    Post,
    Put,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PropertiesService } from './properties.service';
import { CreatePropertyDto, UpdatePropertyDto, PropertyQueryDto } from './dto/property.dto';
import { RegisterPropertyDto } from './dto/register-property.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PropertyStatus, RequestStatus } from '@prisma/client';

@ApiTags('Properties')
@Controller('properties')
export class PropertiesController {
    constructor(private readonly propertiesService: PropertiesService) { }

    // ============================================
    // VETTING & OVERSIGHT (ONBOARDING REQUESTS)
    // ============================================

    @Post('requests')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.CREATE) // Marketing can create requests
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a property onboarding request (Maker)' })
    createRequest(@Request() req, @Body() dto: any) {
        return this.propertiesService.createRequest(req.user, dto);
    }

    @Get('requests')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all property onboarding requests' })
    findAllRequests(@Query('status') status?: RequestStatus) {
        return this.propertiesService.findAllRequests(status);
    }

    @Patch('requests/:id/approve')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.APPROVE) // Only admins can approve
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve property onboarding request (Checker)' })
    approveRequest(@Request() req, @Param('id') id: string) {
        return this.propertiesService.approveRequest(req.user, id);
    }

    @Patch('requests/:id/reject')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.APPROVE) // Only admins can reject
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Reject property onboarding request (Checker)' })
    rejectRequest(
        @Request() req,
        @Param('id') id: string,
        @Body('reason') reason: string
    ) {
        return this.propertiesService.rejectRequest(req.user, id, reason);
    }

    @Get('requests/my')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current user\'s property requests' })
    findMyRequests(@Request() req) {
        return this.propertiesService.findMyRequests(req.user.id);
    }

    @Patch('requests/:id/my')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update your pending property request' })
    updateMyRequest(@Request() req, @Param('id') id: string, @Body() payload: any) {
        return this.propertiesService.updateRequest(req.user.id, id, payload);
    }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    @Post('public-register')
    @ApiOperation({ summary: 'Public registration for Property Owners' })
    publicRegister(@Body() dto: RegisterPropertyDto) {
        return this.propertiesService.publicRegister(dto);
    }

    @Post('public/send-commission-otp')
    @ApiOperation({ summary: 'Send OTP for Commission Verification (Public)' })
    sendCommissionOtp(@Body('phone') phone: string, @Body('commission') commission: number) {
        return this.propertiesService.sendCommissionOtp(phone, commission);
    }

    @Post('public/verify-commission-otp')
    @ApiOperation({ summary: 'Verify OTP for Commission (Public)' })
    verifyCommissionOtp(@Body('phone') phone: string, @Body('code') code: string) {
        return this.propertiesService.verifyCommissionOtp(phone, code);
    }

    @Get()
    @ApiOperation({ summary: 'List all properties (public)' })
    findAll(@Query() query: PropertyQueryDto) {
        return this.propertiesService.findAll(query);
    }

    @Get('autocomplete')
    @ApiOperation({ summary: 'Google Places autocomplete proxy (public)' })
    autocomplete(@Query('input') input: string) {
        return this.propertiesService.getPlaceAutocomplete(input || '');
    }

    @Get('nearby')
    @ApiOperation({ summary: 'Find nearby properties by lat/lng (public)' })
    findNearby(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
    ) {
        return this.propertiesService.findNearby(
            parseFloat(lat),
            parseFloat(lng),
            radius ? parseFloat(radius) : 100,
        );
    }

    @Get(':slug')
    @ApiOperation({ summary: 'Get property by slug (public)' })
    findBySlug(@Param('slug') slug: string) {
        return this.propertiesService.findBySlug(slug);
    }

    // ============================================
    // AUTHENTICATED ENDPOINTS
    // ============================================

    @Post()
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.CREATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new property' })
    create(@Request() req, @Body() data: CreatePropertyDto) {
        return this.propertiesService.create(req.user, data);
    }

    @Get('my/properties')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get properties owned by current user' })
    findOwned(@Request() req) {
        return this.propertiesService.findByOwner(req.user.id);
    }

    @Get('id/:id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get property by ID (owner, staff, or admin only)' })
    findById(@Param('id') id: string, @Request() req) {
        return this.propertiesService.findById(id, req.user);
    }

    @Put(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a property' })
    update(
        @Param('id') id: string,
        @Request() req,
        @Body() data: UpdatePropertyDto,
    ) {
        return this.propertiesService.update(id, req.user, data);
    }

    @Delete(':id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.DELETE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a property' })
    delete(@Param('id') id: string, @Request() req) {
        return this.propertiesService.delete(id, req.user.id);
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    @Get('admin/all')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all properties including inactive (Admin)' })
    findAllAdmin(@Request() req, @Query() query: PropertyQueryDto) {
        return this.propertiesService.findAllAdmin(req.user, query);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.APPROVE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Approve/Reject/Update property status (Maker-Checker enforced)' })
    updateStatus(
        @Param('id') id: string,
        @Request() req,
        @Body('status') status: PropertyStatus,
    ) {
        return this.propertiesService.updateStatus(id, req.user, status);
    }

    @Put(':id/toggle-active')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.PROPERTIES.UPDATE)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Toggle property active status (Admin)' })
    toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.propertiesService.toggleActive(id, isActive);
    }

    // ============================================
    // INTELLIGENCE (IMPERSONATION)
    // ============================================

    @Post(':id/impersonate')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.ADMIN.IMPERSONATE_PROPERTY)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Enter property dashboard (Super Admin Impersonation)' })
    impersonate(@Param('id') id: string, @Request() req) {
        // Implementation logic: Log the action and return property-scoped context
        return this.propertiesService.impersonate(req.user, id);
    }
}

