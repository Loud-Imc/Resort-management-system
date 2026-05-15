import { Module, Global } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { CheckInReminderService } from './check-in-reminder/check-in-reminder.service';

@Global()
@Module({
  imports: [PrismaModule, MailModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsGateway, CheckInReminderService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
