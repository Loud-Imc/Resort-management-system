import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AppUpdateService } from './app-update.service';
import { AppUpdatePublicController } from './app-update-public.controller';
import { AppUpdateAdminController } from './app-update-admin.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AppUpdatePublicController, AppUpdateAdminController],
  providers: [AppUpdateService],
  exports: [AppUpdateService],
})
export class AppUpdateModule {}
