import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookingsModule } from '../bookings/bookings.module';
import { RoomTypesModule } from '../room-types/room-types.module';
import { RoomsModule } from '../rooms/rooms.module';
import { DiscountsModule } from '../discounts/discounts.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { PropertiesModule } from '../properties/properties.module';
import { CancellationPoliciesModule } from '../cancellation-policies/cancellation-policies.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

import { OtaDashboardController } from './ota-dashboard.controller';
import { OtaBookingsController } from './ota-bookings.controller';
import { OtaGuestsController } from './ota-guests.controller';
import { OtaRoomTypesController } from './ota-room-types.controller';
import { OtaRoomsController } from './ota-rooms.controller';
import { OtaOffersController } from './ota-offers.controller';
import { OtaPromotionsController } from './ota-promotions.controller';
import { OtaPropertiesController } from './ota-properties.controller';

@Module({
  imports: [
    PrismaModule,
    BookingsModule,
    RoomTypesModule,
    RoomsModule,
    DiscountsModule,
    PromotionsModule,
    PropertiesModule,
    CancellationPoliciesModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [
    OtaDashboardController,
    OtaBookingsController,
    OtaGuestsController,
    OtaRoomTypesController,
    OtaRoomsController,
    OtaOffersController,
    OtaPromotionsController,
    OtaPropertiesController,
  ],
})
export class OtaPortalModule {}
