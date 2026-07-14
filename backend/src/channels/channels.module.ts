import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsModule } from '../bookings/bookings.module';
import { ChannelsController } from './channels.controller';
import { ChannelsService } from './channels.service';
import { ChannexAdapter } from './adapters/channex.adapter';
import { MockAdapter } from './adapters/mock.adapter';

@Module({
  imports: [PrismaModule, forwardRef(() => BookingsModule)],
  controllers: [ChannelsController],
  providers: [ChannelsService, ChannexAdapter, MockAdapter],
  exports: [ChannelsService],
})
export class ChannelsModule {}
