import { Module } from '@nestjs/common';
import { EventBookingsService } from './event-bookings.service';
import { EventBookingsController } from './event-bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [EventBookingsController],
    providers: [EventBookingsService],
    exports: [EventBookingsService],
})
export class EventBookingsModule { }
