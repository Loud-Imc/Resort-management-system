import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { ChannelPartnersModule } from '../channel-partners/channel-partners.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
    imports: [ConfigModule, ChannelPartnersModule, PrismaModule, MailModule, NotificationsModule, AuditModule, SystemSettingsModule, forwardRef(() => ChannelsModule)],
    controllers: [PaymentsController],
    providers: [PaymentsService],
    exports: [PaymentsService],
})
export class PaymentsModule { }
