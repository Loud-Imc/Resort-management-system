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
exports.RoomsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const rooms_service_1 = require("./rooms.service");
const room_dto_1 = require("./dto/room.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let RoomsController = class RoomsController {
    roomsService;
    constructor(roomsService) {
        this.roomsService = roomsService;
    }
    create(createRoomDto, req) {
        return this.roomsService.create(createRoomDto, req.user.id);
    }
    bulkCreate(roomTypeId, startNumber, count, floor, req) {
        return this.roomsService.bulkCreate(roomTypeId, startNumber, count, floor, req.user.id);
    }
    findAll(roomTypeId, floor, status, isEnabled) {
        return this.roomsService.findAll({
            roomTypeId,
            floor: floor ? parseInt(floor) : undefined,
            status,
            isEnabled: isEnabled ? isEnabled === 'true' : undefined,
        });
    }
    findOne(id) {
        return this.roomsService.findOne(id);
    }
    update(id, updateRoomDto, req) {
        return this.roomsService.update(id, updateRoomDto, req.user.id);
    }
    remove(id, req) {
        return this.roomsService.remove(id, req.user.id);
    }
    blockRoom(id, blockRoomDto, req) {
        return this.roomsService.blockRoom(id, blockRoomDto, req.user.id);
    }
    getRoomBlocks(id) {
        return this.roomsService.getRoomBlocks(id);
    }
    removeBlock(blockId, req) {
        return this.roomsService.removeBlock(blockId, req.user.id);
    }
};
exports.RoomsController = RoomsController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new room (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [room_dto_1.CreateRoomDto, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk create rooms (Admin only)' }),
    __param(0, (0, common_1.Body)('roomTypeId')),
    __param(1, (0, common_1.Body)('startNumber')),
    __param(2, (0, common_1.Body)('count')),
    __param(3, (0, common_1.Body)('floor')),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Number, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "bulkCreate", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all rooms with filters (Staff only)' }),
    (0, swagger_1.ApiQuery)({ name: 'roomTypeId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'floor', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'status', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'isEnabled', required: false, type: Boolean }),
    __param(0, (0, common_1.Query)('roomTypeId')),
    __param(1, (0, common_1.Query)('floor')),
    __param(2, (0, common_1.Query)('status')),
    __param(3, (0, common_1.Query)('isEnabled')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get room by ID (Staff only)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update room (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, room_dto_1.UpdateRoomDto, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete room (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(':id/block'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Block room for maintenance/owner use (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, room_dto_1.BlockRoomDto, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "blockRoom", null);
__decorate([
    (0, common_1.Get)(':id/blocks'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager', 'Staff'),
    (0, swagger_1.ApiOperation)({ summary: 'Get room blocks (Staff only)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "getRoomBlocks", null);
__decorate([
    (0, common_1.Delete)('blocks/:blockId'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Remove room block (Admin only)' }),
    __param(0, (0, common_1.Param)('blockId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], RoomsController.prototype, "removeBlock", null);
exports.RoomsController = RoomsController = __decorate([
    (0, swagger_1.ApiTags)('Rooms'),
    (0, common_1.Controller)('rooms'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService])
], RoomsController);
//# sourceMappingURL=rooms.controller.js.map