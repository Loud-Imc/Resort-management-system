import { Module } from '@nestjs/common';
import { IcalService } from './ical.service';
import { IcalController } from './ical.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsModule } from 'src/bookings/bookings.module';

@Module({
  imports: [PrismaModule, BookingsModule],
  providers: [IcalService],
  controllers: [IcalController],
  exports: [IcalService],
})
export class IcalModule { }
