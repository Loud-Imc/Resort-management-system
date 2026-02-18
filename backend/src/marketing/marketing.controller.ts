import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MarketingService } from './marketing.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../auth/constants/permissions.constant';
import { CreatePartnerLevelDto, UpdatePartnerLevelDto, CreateRewardDto, UpdateRewardDto } from './dto/marketing-items.dto';

@ApiTags('Marketing')
@Controller('marketing')
export class MarketingController {
    constructor(private readonly marketingService: MarketingService) { }

    @Get('stats')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get marketing stats for current user' })
    getStats(@Request() req) {
        return this.marketingService.getStats(req.user.id);
    }

    @Get('properties')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get properties added by current user' })
    getMyProperties(@Request() req) {
        return this.marketingService.getMyProperties(req.user.id);
    }

    // ============================================
    // PARTNER LEVELS
    // ============================================

    @Get('levels')
    @ApiOperation({ summary: 'List all partner levels' })
    findAllLevels() {
        return this.marketingService.findAllLevels();
    }

    @Post('levels')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a partner level (Admin)' })
    createLevel(@Body() dto: CreatePartnerLevelDto) {
        return this.marketingService.createLevel(dto);
    }

    @Put('levels/:id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a partner level (Admin)' })
    updateLevel(@Param('id') id: string, @Body() dto: UpdatePartnerLevelDto) {
        return this.marketingService.updateLevel(id, dto);
    }

    @Delete('levels/:id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a partner level (Admin)' })
    deleteLevel(@Param('id') id: string) {
        return this.marketingService.deleteLevel(id);
    }

    // ============================================
    // REWARDS
    // ============================================

    @Get('rewards')
    @ApiOperation({ summary: 'List all active rewards' })
    findAllActiveRewards() {
        return this.marketingService.findAllRewards(true);
    }

    @Post('rewards')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a reward (Admin)' })
    createReward(@Body() dto: CreateRewardDto) {
        return this.marketingService.createReward(dto);
    }

    @Put('rewards/:id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a reward (Admin)' })
    updateReward(@Param('id') id: string, @Body() dto: UpdateRewardDto) {
        return this.marketingService.updateReward(id, dto);
    }

    @Delete('rewards/:id')
    @UseGuards(AuthGuard('jwt'), PermissionsGuard)
    @Permissions(PERMISSIONS.MARKETING.READ)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a reward (Admin)' })
    deleteReward(@Param('id') id: string) {
        return this.marketingService.deleteReward(id);
    }
}

