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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockRoomDto = exports.UpdateRoomDto = exports.CreateRoomDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateRoomDto {
    roomNumber;
    floor;
    roomTypeId;
    notes;
    isEnabled;
}
exports.CreateRoomDto = CreateRoomDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '101' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "roomNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1 }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    __metadata("design:type", Number)
], CreateRoomDto.prototype, "floor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'room-type-uuid' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "roomTypeId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Corner room with city view', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], CreateRoomDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, required: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], CreateRoomDto.prototype, "isEnabled", void 0);
class UpdateRoomDto {
    roomNumber;
    floor;
    status;
    notes;
    isEnabled;
    roomTypeId;
}
exports.UpdateRoomDto = UpdateRoomDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '101A', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRoomDto.prototype, "roomNumber", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 1, required: false }),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_transformer_1.Type)(() => Number),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Number)
], UpdateRoomDto.prototype, "floor", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AVAILABLE', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRoomDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Renovated', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRoomDto.prototype, "notes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: true, required: false }),
    (0, class_validator_1.IsBoolean)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Boolean)
], UpdateRoomDto.prototype, "isEnabled", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'room-type-uuid', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateRoomDto.prototype, "roomTypeId", void 0);
class BlockRoomDto {
    startDate;
    endDate;
    reason;
    notes;
}
exports.BlockRoomDto = BlockRoomDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-02-01' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BlockRoomDto.prototype, "startDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-02-05' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BlockRoomDto.prototype, "endDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Maintenance' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], BlockRoomDto.prototype, "reason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'AC repair scheduled', required: false }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], BlockRoomDto.prototype, "notes", void 0);
//# sourceMappingURL=room.dto.js.map