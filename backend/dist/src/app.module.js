"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const serve_static_1 = require("@nestjs/serve-static");
const path_1 = require("path");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const room_types_module_1 = require("./room-types/room-types.module");
const rooms_module_1 = require("./rooms/rooms.module");
const bookings_module_1 = require("./bookings/bookings.module");
const payments_module_1 = require("./payments/payments.module");
const income_module_1 = require("./income/income.module");
const expenses_module_1 = require("./expenses/expenses.module");
const reports_module_1 = require("./reports/reports.module");
const roles_module_1 = require("./roles/roles.module");
const booking_sources_module_1 = require("./booking-sources/booking-sources.module");
const audit_module_1 = require("./audit/audit.module");
const uploads_module_1 = require("./uploads/uploads.module");
const properties_module_1 = require("./properties/properties.module");
const channel_partners_module_1 = require("./channel-partners/channel-partners.module");
const marketing_module_1 = require("./marketing/marketing.module");
const events_module_1 = require("./events/events.module");
const event_bookings_module_1 = require("./event-bookings/event-bookings.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(process.cwd(), 'uploads'),
                serveRoot: '/uploads',
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            roles_module_1.RolesModule,
            room_types_module_1.RoomTypesModule,
            rooms_module_1.RoomsModule,
            bookings_module_1.BookingsModule,
            payments_module_1.PaymentsModule,
            income_module_1.IncomeModule,
            expenses_module_1.ExpensesModule,
            reports_module_1.ReportsModule,
            booking_sources_module_1.BookingSourcesModule,
            audit_module_1.AuditModule,
            uploads_module_1.UploadsModule,
            properties_module_1.PropertiesModule,
            channel_partners_module_1.ChannelPartnersModule,
            marketing_module_1.MarketingModule,
            events_module_1.EventsModule,
            event_bookings_module_1.EventBookingsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map