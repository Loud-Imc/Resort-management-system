import { Module } from '@nestjs/common';
import { FinancialsService } from './financials.service';
import { FinancialsController } from './financials.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ConfigModule } from '@nestjs/config';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [PrismaModule, NotificationsModule, AuditModule, ConfigModule],
    controllers: [FinancialsController],
    providers: [FinancialsService],
    exports: [FinancialsService],
})
export class FinancialsModule { }
