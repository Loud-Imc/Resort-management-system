import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MarketingService } from './marketing.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Marketing')
@Controller('marketing')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MarketingController {
    constructor(private readonly marketingService: MarketingService) { }

    @Get('stats')
    @Roles('Marketing', 'SuperAdmin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get marketing stats for current user' })
    getStats(@Request() req) {
        return this.marketingService.getStats(req.user.id);
    }

    @Get('properties')
    @Roles('Marketing', 'SuperAdmin')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get properties added by current user' })
    getMyProperties(@Request() req) {
        return this.marketingService.getMyProperties(req.user.id);
    }
}
