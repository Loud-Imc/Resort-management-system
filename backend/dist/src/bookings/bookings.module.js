"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BookingsModule = void 0;
const common_1 = require("@nestjs/common");
const bookings_service_1 = require("./bookings.service");
const bookings_controller_1 = require("./bookings.controller");
const availability_service_1 = require("./availability.service");
const pricing_service_1 = require("./pricing.service");
const audit_module_1 = require("../audit/audit.module");
let BookingsModule = class BookingsModule {
};
exports.BookingsModule = BookingsModule;
exports.BookingsModule = BookingsModule = __decorate([
    (0, common_1.Module)({
        imports: [audit_module_1.AuditModule],
        controllers: [bookings_controller_1.BookingsController],
        providers: [bookings_service_1.BookingsService, availability_service_1.AvailabilityService, pricing_service_1.PricingService],
        exports: [bookings_service_1.BookingsService],
    })
], BookingsModule);
//# sourceMappingURL=bookings.module.js.map