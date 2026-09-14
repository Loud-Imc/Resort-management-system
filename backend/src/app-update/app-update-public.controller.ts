import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppUpdateService } from './app-update.service';
import { UpdateConfigQueryDto } from './dto/update-config-query.dto';

@ApiTags('Mobile App Update')
@Controller()
export class AppUpdatePublicController {
  constructor(private readonly appUpdateService: AppUpdateService) {}

  @Get(['v1/app/update-config', 'app/update-config'])
  @ApiOperation({ summary: 'Get app update policy evaluation for mobile client' })
  @ApiResponse({ status: 200, description: 'Evaluated app update configuration' })
  async getUpdateConfig(@Query() query: UpdateConfigQueryDto) {
    return this.appUpdateService.getPublicConfig(query);
  }
}
