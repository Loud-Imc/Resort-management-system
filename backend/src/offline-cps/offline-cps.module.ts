import { Module } from '@nestjs/common';
import { OfflineCpsService } from './offline-cps.service';
import { OfflineCpsController } from './offline-cps.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [OfflineCpsController],
    providers: [OfflineCpsService],
    exports: [OfflineCpsService],
})
export class OfflineCpsModule {}
