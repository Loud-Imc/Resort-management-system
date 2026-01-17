import { Module } from '@nestjs/common';
import { BookingSourcesService } from './booking-sources.service';
import { BookingSourcesController } from './booking-sources.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [BookingSourcesController],
    providers: [BookingSourcesService],
    exports: [BookingSourcesService], // Export if needed by other modules
})
export class BookingSourcesModule { }
