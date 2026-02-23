import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomTypesModule } from './room-types/room-types.module';
import { RoomsModule } from './rooms/rooms.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { IncomeModule } from './income/income.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { BookingSourcesModule } from './booking-sources/booking-sources.module';
import { AuditModule } from './audit/audit.module';
import { UploadsModule } from './uploads/uploads.module';
import { PropertiesModule } from './properties/properties.module';
import { ChannelPartnersModule } from './channel-partners/channel-partners.module';
import { MarketingModule } from './marketing/marketing.module';
import { EventsModule } from './events/events.module';
import { EventBookingsModule } from './event-bookings/event-bookings.module';
import { MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { DiscountsModule } from './discounts/discounts.module';
import { MailModule } from './mail/mail.module';
import { PropertyCategoriesModule } from './property-categories/property-categories.module';
import { CurrenciesModule } from './currencies/currencies.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    RoomTypesModule,
    RoomsModule,
    BookingsModule,
    PaymentsModule,
    IncomeModule,
    ExpensesModule,
    ReportsModule,
    BookingSourcesModule,
    AuditModule,
    UploadsModule,
    PropertiesModule,
    ChannelPartnersModule,
    MarketingModule,
    EventsModule,
    EventBookingsModule,
    DiscountsModule,
    MailModule,
    PropertyCategoriesModule,
    CurrenciesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LoggingMiddleware)
      .forRoutes('*');
  }
}
