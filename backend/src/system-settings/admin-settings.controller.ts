import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SystemSettingsService } from './system-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';

@Controller('system-settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('SuperAdmin', 'Admin')
export class AdminSettingsController {
    constructor(private systemSettingsService: SystemSettingsService) {}

    @Get()
    async getAll() {
        return this.systemSettingsService.getAllSettings();
    }

    @Patch()
    async update(@Body() dto: UpdateSettingDto) {
        return this.systemSettingsService.updateSetting(dto.key, dto.value, dto.description);
    }
}
