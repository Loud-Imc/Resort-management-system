import { Controller, Get, Put, Body, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AppUpdateService } from './app-update.service';
import { UpdatePolicyAdminDto } from './dto/update-policy-admin.dto';

@ApiTags('Admin Mobile App Update')
@ApiBearerAuth()
@Controller('v1/admin/app-update')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SuperAdmin', 'Admin')
export class AppUpdateAdminController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Get()
  @ApiOperation({ summary: 'Get all mobile app update policies (Android & iOS)' })
  @ApiResponse({ status: 200, description: 'List of platform update policies' })
  async getPolicies() {
    return this.appUpdateService.getAdminPolicies();
  }

  @Put(':platform')
  @ApiOperation({ summary: 'Update mobile app update policy for a platform' })
  @ApiResponse({ status: 200, description: 'Updated policy' })
  async updatePolicy(
    @Param('platform') platform: string,
    @Body() dto: UpdatePolicyAdminDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || req.user?.userId;
    return this.appUpdateService.updateAdminPolicy(platform, dto, userId);
  }
}
