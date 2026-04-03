import { Controller, Get } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Public Settings')
@Controller('system-settings/public')
export class PublicSettingsController {
    constructor(private systemSettingsService: SystemSettingsService) { }

    @Get()
    @ApiOperation({ summary: 'Get public system settings' })
    async getPublic() {
        const platformCommission = await this.systemSettingsService.getSetting('DEFAULT_PLATFORM_COMMISSION');

        return {
            DEFAULT_PLATFORM_COMMISSION: platformCommission ?? 10.0,
        };
    }
}
