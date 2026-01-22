import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { ChannelPartnersService } from './channel-partners.service';
import { ApplyReferralCodeDto, UpdateCommissionRateDto } from './dto/channel-partner.dto';

@ApiTags('Channel Partners')
@Controller('channel-partners')
export class ChannelPartnersController {
    constructor(private readonly cpService: ChannelPartnersService) { }

    // ============================================
    // PUBLIC ENDPOINTS
    // ============================================

    @Get('validate/:code')
    @ApiOperation({ summary: 'Validate a referral code' })
    validateCode(@Param('code') code: string) {
        return this.cpService.findByReferralCode(code);
    }

    // ============================================
    // AUTHENTICATED ENDPOINTS
    // ============================================

    @Post('register')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Register as a Channel Partner' })
    register(@Request() req) {
        return this.cpService.register(req.user.id);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my CP profile' })
    getMyProfile(@Request() req) {
        return this.cpService.getMyProfile(req.user.id);
    }

    @Get('me/stats')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get my CP dashboard stats' })
    getStats(@Request() req) {
        return this.cpService.getStats(req.user.id);
    }

    // ============================================
    // ADMIN ENDPOINTS
    // ============================================

    @Get()
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'List all Channel Partners (Admin)' })
    findAll(@Query('page') page?: number, @Query('limit') limit?: number) {
        return this.cpService.findAll(page, limit);
    }

    @Put(':id/commission-rate')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update CP commission rate (Admin)' })
    updateCommissionRate(
        @Param('id') id: string,
        @Body() data: UpdateCommissionRateDto,
    ) {
        return this.cpService.updateCommissionRate(id, data.commissionRate);
    }

    @Put(':id/toggle-active')
    @UseGuards(AuthGuard('jwt'))
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Toggle CP active status (Admin)' })
    toggleActive(@Param('id') id: string, @Body('isActive') isActive: boolean) {
        return this.cpService.toggleActive(id, isActive);
    }
}
