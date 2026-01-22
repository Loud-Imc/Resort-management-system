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
exports.CPPayoutRequestDto = exports.UpdateCommissionRateDto = exports.ApplyReferralCodeDto = exports.RegisterAsChannelPartnerDto = void 0;
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class RegisterAsChannelPartnerDto {
}
exports.RegisterAsChannelPartnerDto = RegisterAsChannelPartnerDto;
class ApplyReferralCodeDto {
    referralCode;
}
exports.ApplyReferralCodeDto = ApplyReferralCodeDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'CP-A1B2C3' }),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], ApplyReferralCodeDto.prototype, "referralCode", void 0);
class UpdateCommissionRateDto {
    commissionRate;
}
exports.UpdateCommissionRateDto = UpdateCommissionRateDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 5.0 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], UpdateCommissionRateDto.prototype, "commissionRate", void 0);
class CPPayoutRequestDto {
    amount;
    notes;
}
exports.CPPayoutRequestDto = CPPayoutRequestDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 500.00 }),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], CPPayoutRequestDto.prototype, "amount", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Bank transfer to SBI account' }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], CPPayoutRequestDto.prototype, "notes", void 0);
//# sourceMappingURL=channel-partner.dto.js.map