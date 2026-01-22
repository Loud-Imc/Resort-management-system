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
exports.ChannelPartnersController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const channel_partners_service_1 = require("./channel-partners.service");
const channel_partner_dto_1 = require("./dto/channel-partner.dto");
let ChannelPartnersController = class ChannelPartnersController {
    cpService;
    constructor(cpService) {
        this.cpService = cpService;
    }
    validateCode(code) {
        return this.cpService.findByReferralCode(code);
    }
    register(req) {
        return this.cpService.register(req.user.id);
    }
    getMyProfile(req) {
        return this.cpService.getMyProfile(req.user.id);
    }
    getStats(req) {
        return this.cpService.getStats(req.user.id);
    }
    findAll(page, limit) {
        return this.cpService.findAll(page, limit);
    }
    updateCommissionRate(id, data) {
        return this.cpService.updateCommissionRate(id, data.commissionRate);
    }
    toggleActive(id, isActive) {
        return this.cpService.toggleActive(id, isActive);
    }
};
exports.ChannelPartnersController = ChannelPartnersController;
__decorate([
    (0, common_1.Get)('validate/:code'),
    (0, swagger_1.ApiOperation)({ summary: 'Validate a referral code' }),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "validateCode", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Register as a Channel Partner' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "register", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my CP profile' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "getMyProfile", null);
__decorate([
    (0, common_1.Get)('me/stats'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get my CP dashboard stats' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'List all Channel Partners (Admin)' }),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Put)(':id/commission-rate'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Update CP commission rate (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, channel_partner_dto_1.UpdateCommissionRateDto]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "updateCommissionRate", null);
__decorate([
    (0, common_1.Put)(':id/toggle-active'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Toggle CP active status (Admin)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('isActive')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Boolean]),
    __metadata("design:returntype", void 0)
], ChannelPartnersController.prototype, "toggleActive", null);
exports.ChannelPartnersController = ChannelPartnersController = __decorate([
    (0, swagger_1.ApiTags)('Channel Partners'),
    (0, common_1.Controller)('channel-partners'),
    __metadata("design:paramtypes", [channel_partners_service_1.ChannelPartnersService])
], ChannelPartnersController);
//# sourceMappingURL=channel-partners.controller.js.map