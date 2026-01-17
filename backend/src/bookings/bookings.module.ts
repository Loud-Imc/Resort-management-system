import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { AuditModule } from '../audit/audit.module';

@Module({
    imports: [AuditModule],
    controllers: [BookingsController],
    providers: [BookingsService, AvailabilityService, PricingService],
    exports: [BookingsService],
})
export class BookingsModule { }
