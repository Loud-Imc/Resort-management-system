import { Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { AdminSettingsController } from './admin-settings.controller';
import { PublicSettingsController } from './public-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [SystemSettingsService],
    controllers: [AdminSettingsController, PublicSettingsController],
    exports: [SystemSettingsService],
})
export class SystemSettingsModule { }
