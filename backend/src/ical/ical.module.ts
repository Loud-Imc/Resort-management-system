import { Module } from '@nestjs/common';
import { IcalService } from './ical.service';
import { IcalController } from './ical.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  providers: [IcalService],
  controllers: [IcalController],
  exports: [IcalService],
})
export class IcalModule {}
