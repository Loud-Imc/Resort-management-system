import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { InvoiceNumberService } from './invoice-number.service';
import { AuditModule } from '../audit/audit.module';
import { ChannelPartnersModule } from '../channel-partners/channel-partners.module';
import { PaymentsModule } from '../payments/payments.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChannelsModule } from '../channels/channels.module';
import { ConnectivityModule } from '../connectivity/connectivity.module';

import { RatePlansService } from './services/rate-plans.service';
import { RatePlansController } from './rate-plans.controller';

@Module({
    imports: [
        AuditModule,
        ChannelPartnersModule,
        PaymentsModule,
        SystemSettingsModule,
        NotificationsModule,
        forwardRef(() => ChannelsModule),
        forwardRef(() => ConnectivityModule),
    ],
    controllers: [BookingsController, RatePlansController],
    providers: [BookingsService, AvailabilityService, PricingService, InvoiceNumberService, RatePlansService],
    exports: [BookingsService, AvailabilityService, PricingService, InvoiceNumberService, RatePlansService],
})
export class BookingsModule { }
