"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventBookingsController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const event_bookings_service_1 = require("./event-bookings.service");
const create_event_booking_dto_1 = require("./dto/create-event-booking.dto");
const permissions_guard_1 = require("../auth/guards/permissions.guard");
const permissions_decorator_1 = require("../auth/decorators/permissions.decorator");
let EventBookingsController = class EventBookingsController {
    eventBookingsService;
    constructor(eventBookingsService) {
        this.eventBookingsService = eventBookingsService;
    }
    create(createEventBookingDto, req) {
        return this.eventBookingsService.create(createEventBookingDto, req.user.id);
    }
    findAll(req) {
        return this.eventBookingsService.findAll(req.user.id);
    }
    findOne(id, req) {
        return this.eventBookingsService.findOne(id, req.user.id);
    }
    verify(ticketId, req) {
        return this.eventBookingsService.verifyTicket(ticketId, req.user.id);
    }
    findAllAdmin() {
        return this.eventBookingsService.findAllAdmin();
    }
};
exports.EventBookingsController = EventBookingsController;
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_event_booking_dto_1.CreateEventBookingDto, Object]),
    __metadata("design:returntype", void 0)
], EventBookingsController.prototype, "create", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('my/bookings'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], EventBookingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EventBookingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('events.verify'),
    (0, common_1.Patch)('verify/:ticketId'),
    __param(0, (0, common_1.Param)('ticketId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], EventBookingsController.prototype, "verify", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), permissions_guard_1.PermissionsGuard),
    (0, permissions_decorator_1.Permissions)('events.view_bookings'),
    (0, common_1.Get)('admin/all'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], EventBookingsController.prototype, "findAllAdmin", null);
exports.EventBookingsController = EventBookingsController = __decorate([
    (0, common_1.Controller)('event-bookings'),
    __metadata("design:paramtypes", [event_bookings_service_1.EventBookingsService])
], EventBookingsController);
//# sourceMappingURL=event-bookings.controller.js.map