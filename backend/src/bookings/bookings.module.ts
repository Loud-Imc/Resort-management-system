import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { AuditModule } from '../audit/audit.module';
import { ChannelPartnersModule } from '../channel-partners/channel-partners.module';
import { PaymentsModule } from '../payments/payments.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChannelsModule } from '../channels/channels.module';

@Module({
    imports: [AuditModule, ChannelPartnersModule, PaymentsModule, SystemSettingsModule, NotificationsModule, forwardRef(() => ChannelsModule)],
    controllers: [BookingsController],
    providers: [BookingsService, AvailabilityService, PricingService],
    exports: [BookingsService, AvailabilityService, PricingService],
})
export class BookingsModule { }
