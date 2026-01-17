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
exports.BookingSourcesController = void 0;
const common_1 = require("@nestjs/common");
const booking_sources_service_1 = require("./booking-sources.service");
const create_booking_source_dto_1 = require("./dto/create-booking-source.dto");
const update_booking_source_dto_1 = require("./dto/update-booking-source.dto");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let BookingSourcesController = class BookingSourcesController {
    bookingSourcesService;
    constructor(bookingSourcesService) {
        this.bookingSourcesService = bookingSourcesService;
    }
    create(createDto) {
        return this.bookingSourcesService.create(createDto);
    }
    findAll() {
        return this.bookingSourcesService.findAll();
    }
    findOne(id) {
        return this.bookingSourcesService.findOne(id);
    }
    update(id, updateDto) {
        return this.bookingSourcesService.update(id, updateDto);
    }
    remove(id) {
        return this.bookingSourcesService.remove(id);
    }
};
exports.BookingSourcesController = BookingSourcesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a booking source' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_source_dto_1.CreateBookingSourceDto]),
    __metadata("design:returntype", void 0)
], BookingSourcesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all booking sources' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BookingSourcesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a booking source by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingSourcesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a booking source' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_booking_source_dto_1.UpdateBookingSourceDto]),
    __metadata("design:returntype", void 0)
], BookingSourcesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a booking source' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingSourcesController.prototype, "remove", null);
exports.BookingSourcesController = BookingSourcesController = __decorate([
    (0, swagger_1.ApiTags)('Booking Sources'),
    (0, common_1.Controller)('booking-sources'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [booking_sources_service_1.BookingSourcesService])
], BookingSourcesController);
//# sourceMappingURL=booking-sources.controller.js.map