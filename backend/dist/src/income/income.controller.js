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
exports.IncomeController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const income_service_1 = require("./income.service");
const income_dto_1 = require("./dto/income.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let IncomeController = class IncomeController {
    incomeService;
    constructor(incomeService) {
        this.incomeService = incomeService;
    }
    create(createIncomeDto, req) {
        return this.incomeService.create(createIncomeDto, req.user.id);
    }
    findAll(source, startDate, endDate, bookingId) {
        return this.incomeService.findAll({
            source,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
            bookingId,
        });
    }
    getSummary(startDate, endDate) {
        return this.incomeService.getSummary(new Date(startDate), new Date(endDate));
    }
    findOne(id) {
        return this.incomeService.findOne(id);
    }
    update(id, updateIncomeDto, req) {
        return this.incomeService.update(id, updateIncomeDto, req.user.id);
    }
    remove(id, req) {
        return this.incomeService.remove(id, req.user.id);
    }
};
exports.IncomeController = IncomeController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create income record (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [income_dto_1.CreateIncomeDto, Object]),
    __metadata("design:returntype", void 0)
], IncomeController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all income records with filters (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'source', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'bookingId', required: false }),
    __param(0, (0, common_1.Query)('source')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __param(3, (0, common_1.Query)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], IncomeController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get income summary (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: true }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], IncomeController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get income record by ID (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], IncomeController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update income record (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, income_dto_1.UpdateIncomeDto, Object]),
    __metadata("design:returntype", void 0)
], IncomeController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete income record (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], IncomeController.prototype, "remove", null);
exports.IncomeController = IncomeController = __decorate([
    (0, swagger_1.ApiTags)('Income'),
    (0, common_1.Controller)('income'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [income_service_1.IncomeService])
], IncomeController);
//# sourceMappingURL=income.controller.js.map