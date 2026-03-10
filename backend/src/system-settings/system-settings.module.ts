import { Module } from '@nestjs/common';
import { SystemSettingsService } from './system-settings.service';
import { AdminSettingsController } from './admin-settings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    providers: [SystemSettingsService],
    controllers: [AdminSettingsController],
    exports: [SystemSettingsService],
})
export class SystemSettingsModule {}
