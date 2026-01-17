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
exports.BookingsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const bookings_service_1 = require("./bookings.service");
const availability_service_1 = require("./availability.service");
const pricing_service_1 = require("./pricing.service");
const check_availability_dto_1 = require("./dto/check-availability.dto");
const calculate_price_dto_1 = require("./dto/calculate-price.dto");
const create_booking_dto_1 = require("./dto/create-booking.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
const search_rooms_dto_1 = require("./dto/search-rooms.dto");
let BookingsController = class BookingsController {
    bookingsService;
    availabilityService;
    pricingService;
    constructor(bookingsService, availabilityService, pricingService) {
        this.bookingsService = bookingsService;
        this.availabilityService = availabilityService;
        this.pricingService = pricingService;
    }
    async checkAvailability(dto) {
        const isAvailable = await this.availabilityService.checkAvailability(dto.roomTypeId, new Date(dto.checkInDate), new Date(dto.checkOutDate));
        const availableCount = await this.availabilityService.getAvailableRoomCount(dto.roomTypeId, new Date(dto.checkInDate), new Date(dto.checkOutDate));
        return {
            available: isAvailable,
            availableRooms: availableCount,
        };
    }
    async searchRooms(dto) {
        const results = await this.availabilityService.searchAvailableRoomTypes(new Date(dto.checkInDate), new Date(dto.checkOutDate), dto.adults, dto.children || 0);
        return {
            availableRoomTypes: results
        };
    }
    async calculatePrice(dto) {
        return this.pricingService.calculatePrice(dto.roomTypeId, new Date(dto.checkInDate), new Date(dto.checkOutDate), dto.adultsCount, dto.childrenCount, dto.couponCode);
    }
    async createPublic(createBookingDto) {
        return this.bookingsService.create(createBookingDto, 'GUEST_USER');
    }
    create(createBookingDto, req) {
        return this.bookingsService.create(createBookingDto, req.user.id);
    }
    findAll(status, roomTypeId) {
        return this.bookingsService.findAll({
            status,
            roomTypeId,
        });
    }
    getTodayCheckIns() {
        return this.bookingsService.getTodayCheckIns();
    }
    getTodayCheckOuts() {
        return this.bookingsService.getTodayCheckOuts();
    }
    findOne(id) {
        return this.bookingsService.findOne(id);
    }
    checkIn(id, req) {
        return this.bookingsService.checkIn(id, req.user.id);
    }
    checkOut(id, req) {
        return this.bookingsService.checkOut(id, req.user.id);
    }
    cancel(id, req, reason) {
        return this.bookingsService.cancel(id, req.user.id, reason);
    }
    updateStatus(id, status, req) {
        return this.bookingsService.updateStatus(id, status, req.user.id);
    }
};
exports.BookingsController = BookingsController;
__decorate([
    (0, common_1.Post)('check-availability'),
    (0, swagger_1.ApiOperation)({ summary: 'Check room availability (Public)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [check_availability_dto_1.CheckAvailabilityDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "checkAvailability", null);
__decorate([
    (0, common_1.Post)('search'),
    (0, swagger_1.ApiOperation)({ summary: 'Search available room types (Public)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [search_rooms_dto_1.SearchRoomsDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "searchRooms", null);
__decorate([
    (0, common_1.Post)('calculate-price'),
    (0, swagger_1.ApiOperation)({ summary: 'Calculate booking price (Public)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [calculate_price_dto_1.CalculatePriceDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "calculatePrice", null);
__decorate([
    (0, common_1.Post)('public'),
    (0, swagger_1.ApiOperation)({ summary: 'Create public booking (No Auth)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_dto_1.CreateBookingDto]),
    __metadata("design:returntype", Promise)
], BookingsController.prototype, "createPublic", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create booking' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_booking_dto_1.CreateBookingDto, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all bookings with filters (Staff only)' }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'roomTypeId', required: false }),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('roomTypeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('today/check-ins'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get today's check-ins" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getTodayCheckIns", null);
__decorate([
    (0, common_1.Get)('today/check-outs'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: "Get today's check-outs" }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "getTodayCheckOuts", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get booking by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(':id/check-in'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check-in booking (Staff only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "checkIn", null);
__decorate([
    (0, common_1.Post)(':id/check-out'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check-out booking (Staff only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "checkOut", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel booking' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __param(2, (0, common_1.Body)('reason')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "cancel", null);
__decorate([
    (0, common_1.Patch)(':id/status'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update booking status (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], BookingsController.prototype, "updateStatus", null);
exports.BookingsController = BookingsController = __decorate([
    (0, swagger_1.ApiTags)('Bookings'),
    (0, common_1.Controller)('bookings'),
    __metadata("design:paramtypes", [bookings_service_1.BookingsService,
        availability_service_1.AvailabilityService,
        pricing_service_1.PricingService])
], BookingsController);
//# sourceMappingURL=bookings.controller.js.map