import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MarketingService } from './marketing.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';

@ApiTags('Marketing')
@Controller('marketing')
@UseGuards(AuthGuard('jwt'), PermissionsGuard)
export class MarketingController {
    constructor(private readonly marketingService: MarketingService) { }

    @Get('stats')
    @Permissions(PERMISSIONS.MARKETING.READ) // Using READ as a general view permission for now
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get marketing stats for current user' })
    getStats(@Request() req) {
        return this.marketingService.getStats(req.user.id);
    }

    @Get('properties')
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get properties added by current user' })
    getMyProperties(@Request() req) {
        return this.marketingService.getMyProperties(req.user.id);
    }
}
