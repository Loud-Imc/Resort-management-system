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
exports.ExpensesController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
const expenses_service_1 = require("./expenses.service");
const expense_dto_1 = require("./dto/expense.dto");
const roles_guard_1 = require("../auth/guards/roles.guard");
const roles_decorator_1 = require("../auth/decorators/roles.decorator");
let ExpensesController = class ExpensesController {
    expensesService;
    constructor(expensesService) {
        this.expensesService = expensesService;
    }
    create(createExpenseDto, req) {
        return this.expensesService.create(createExpenseDto, req.user.id);
    }
    findAll(categoryId, startDate, endDate) {
        return this.expensesService.findAll({
            categoryId,
            startDate: startDate ? new Date(startDate) : undefined,
            endDate: endDate ? new Date(endDate) : undefined,
        });
    }
    getSummary(startDate, endDate) {
        return this.expensesService.getSummary(new Date(startDate), new Date(endDate));
    }
    findOne(id) {
        return this.expensesService.findOne(id);
    }
    update(id, updateExpenseDto, req) {
        return this.expensesService.update(id, updateExpenseDto, req.user.id);
    }
    remove(id, req) {
        return this.expensesService.remove(id, req.user.id);
    }
    createCategory(createCategoryDto, req) {
        return this.expensesService.createCategory(createCategoryDto, req.user.id);
    }
    findAllCategories() {
        return this.expensesService.findAllCategories();
    }
    findOneCategory(id) {
        return this.expensesService.findOneCategory(id);
    }
    removeCategory(id, req) {
        return this.expensesService.removeCategory(id, req.user.id);
    }
};
exports.ExpensesController = ExpensesController;
__decorate([
    (0, common_1.Post)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Create expense (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [expense_dto_1.CreateExpenseDto, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all expenses with filters (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'categoryId', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: false }),
    __param(0, (0, common_1.Query)('categoryId')),
    __param(1, (0, common_1.Query)('startDate')),
    __param(2, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('summary'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Get expense summary (Admin only)' }),
    (0, swagger_1.ApiQuery)({ name: 'startDate', required: true }),
    (0, swagger_1.ApiQuery)({ name: 'endDate', required: true }),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "getSummary", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get expense by ID (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Update expense (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, expense_dto_1.UpdateExpenseDto, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete expense (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('categories'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Create expense category (Admin only)' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [expense_dto_1.CreateExpenseCategoryDto, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "createCategory", null);
__decorate([
    (0, common_1.Get)('categories/all'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all expense categories (Admin only)' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findAllCategories", null);
__decorate([
    (0, common_1.Get)('categories/:id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin', 'Manager'),
    (0, swagger_1.ApiOperation)({ summary: 'Get expense category by ID (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "findOneCategory", null);
__decorate([
    (0, common_1.Delete)('categories/:id'),
    (0, roles_decorator_1.Roles)('SuperAdmin', 'Admin'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete expense category (Admin only)' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ExpensesController.prototype, "removeCategory", null);
exports.ExpensesController = ExpensesController = __decorate([
    (0, swagger_1.ApiTags)('Expenses'),
    (0, common_1.Controller)('expenses'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt'), roles_guard_1.RolesGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [expenses_service_1.ExpensesService])
], ExpensesController);
//# sourceMappingURL=expenses.controller.js.map