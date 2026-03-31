import { Module } from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { FinancialsController } from './financials.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';

import { SystemSettingsModule } from '../system-settings/system-settings.module';

@Module({
    imports: [PrismaModule, NotificationsModule, AuditModule, ConfigModule, SystemSettingsModule],
    controllers: [FinancialsController],
    providers: [FinancialsService],
    exports: [FinancialsService],
})
export class FinancialsModule { }
