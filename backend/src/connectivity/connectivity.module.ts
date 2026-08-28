import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { BookingsModule } from '../bookings/bookings.module';
import { RoomsModule } from '../rooms/rooms.module';

import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';
import { ConnectivityRatesService } from './services/connectivity-rates.service';
import { ConnectivityRestrictionsService } from './services/connectivity-restrictions.service';
import { ConnectivityReservationService } from './services/connectivity-reservation.service';
import { ConnectivityOutboxService } from './services/connectivity-outbox.service';
import { ConnectivityOutboxProcessorService } from './services/connectivity-outbox-processor.service';
import { ConnectivityOutboxSchedulerService } from './services/connectivity-outbox-scheduler.service';
import { ConnectivitySandboxService } from './services/connectivity-sandbox.service';
import { ConnectivityCertificationService } from './services/connectivity-certification.service';

import { PartnerApiKeyGuard } from './auth/partner-api-key.guard';
import { PartnerRateLimitGuard } from './auth/partner-rate-limit.guard';
import { DeveloperJwtGuard } from './auth/developer-jwt.guard';

import { AdminConnectivityController } from './admin-connectivity.controller';
import { ConnectivityController } from './connectivity.controller';
import { ConnectivityDeveloperController } from './connectivity-developer.controller';

@Module({
  imports: [
    PrismaModule,
    SystemSettingsModule,
    forwardRef(() => BookingsModule),
    forwardRef(() => RoomsModule),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'secret',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AdminConnectivityController,
    ConnectivityController,
    ConnectivityDeveloperController,
  ],
  providers: [
    ConnectivityPartnerService,
    ConnectivityConnectionService,
    ConnectivityMappingService,
    ConnectivitySettingsService,
    ConnectivityLogService,
    ConnectivityAvailabilityService,
    ConnectivityRatesService,
    ConnectivityRestrictionsService,
    ConnectivityReservationService,
    ConnectivityOutboxService,
    ConnectivityOutboxProcessorService,
    ConnectivityOutboxSchedulerService,
    ConnectivitySandboxService,
    ConnectivityCertificationService,
    PartnerApiKeyGuard,
    PartnerRateLimitGuard,
    DeveloperJwtGuard,
  ],
  exports: [
    ConnectivityPartnerService,
    ConnectivityConnectionService,
    ConnectivityMappingService,
    ConnectivitySettingsService,
    ConnectivityLogService,
    ConnectivityAvailabilityService,
    ConnectivityRatesService,
    ConnectivityRestrictionsService,
    ConnectivityReservationService,
    ConnectivityOutboxService,
    ConnectivityOutboxProcessorService,
    ConnectivityOutboxSchedulerService,
    ConnectivitySandboxService,
    ConnectivityCertificationService,
  ],
})
export class ConnectivityModule {}
