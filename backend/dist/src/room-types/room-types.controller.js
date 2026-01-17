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
exports.RoomTypesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const room_types_service_1 = require("./room-types.service");
const create_room_type_dto_1 = require("./dto/create-room-type.dto");
const update_room_type_dto_1 = require("./dto/update-room-type.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let RoomTypesController = class RoomTypesController {
    roomTypesService;
    constructor(roomTypesService) {
        this.roomTypesService = roomTypesService;
    }
    create(createRoomTypeDto) {
        return this.roomTypesService.create(createRoomTypeDto);
    }
    findAll(publicOnly) {
        return this.roomTypesService.findAll(publicOnly === 'true');
    }
    findOne(id) {
        return this.roomTypesService.findOne(id);
    }
    update(id, updateRoomTypeDto) {
        return this.roomTypesService.update(id, updateRoomTypeDto);
    }
    remove(id) {
        return this.roomTypesService.remove(id);
    }
};
exports.RoomTypesController = RoomTypesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create room type' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_room_type_dto_1.CreateRoomTypeDto]),
    __metadata("design:returntype", void 0)
], RoomTypesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all room types' }),
    __param(0, (0, common_1.Query)('publicOnly')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomTypesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get room type by ID' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomTypesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update room type' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_room_type_dto_1.UpdateRoomTypeDto]),
    __metadata("design:returntype", void 0)
], RoomTypesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Delete room type' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomTypesController.prototype, "remove", null);
exports.RoomTypesController = RoomTypesController = __decorate([
    (0, swagger_1.ApiTags)('Room Types'),
    (0, common_1.Controller)('room-types'),
    __metadata("design:paramtypes", [room_types_service_1.RoomTypesService])
], RoomTypesController);
//# sourceMappingURL=room-types.controller.js.map