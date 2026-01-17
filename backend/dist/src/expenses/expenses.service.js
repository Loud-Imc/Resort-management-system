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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let ExpensesService = class ExpensesService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async create(createExpenseDto, userId) {
        const { amount, description, categoryId, date, receipts = [] } = createExpenseDto;
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            throw new common_1.NotFoundException('Expense category not found');
        }
        const expense = await this.prisma.expense.create({
            data: {
                amount,
                description,
                categoryId,
                date: date ? new Date(date) : new Date(),
                receipts,
            },
            include: {
                category: true,
            },
        });
        await this.auditService.createLog({
            action: 'CREATE',
            entity: 'Expense',
            entityId: expense.id,
            userId,
            newValue: expense,
        });
        return expense;
    }
    async findAll(filters) {
        return this.prisma.expense.findMany({
            where: {
                categoryId: filters?.categoryId,
                date: {
                    gte: filters?.startDate,
                    lte: filters?.endDate,
                },
            },
            include: {
                category: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
    }
    async findOne(id) {
        const expense = await this.prisma.expense.findUnique({
            where: { id },
            include: {
                category: true,
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException('Expense not found');
        }
        return expense;
    }
    async update(id, updateExpenseDto, userId) {
        const expense = await this.findOne(id);
        if (updateExpenseDto.categoryId) {
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: updateExpenseDto.categoryId },
            });
            if (!category) {
                throw new common_1.NotFoundException('Expense category not found');
            }
        }
        const updated = await this.prisma.expense.update({
            where: { id },
            data: {
                amount: updateExpenseDto.amount,
                description: updateExpenseDto.description,
                categoryId: updateExpenseDto.categoryId,
                date: updateExpenseDto.date ? new Date(updateExpenseDto.date) : undefined,
                receipts: updateExpenseDto.receipts,
            },
            include: {
                category: true,
            },
        });
        await this.auditService.createLog({
            action: 'UPDATE',
            entity: 'Expense',
            entityId: id,
            userId,
            oldValue: expense,
            newValue: updated,
        });
        return updated;
    }
    async remove(id, userId) {
        const expense = await this.findOne(id);
        await this.prisma.expense.delete({
            where: { id },
        });
        await this.auditService.createLog({
            action: 'DELETE',
            entity: 'Expense',
            entityId: id,
            userId,
            oldValue: expense,
        });
        return { message: 'Expense deleted successfully' };
    }
    async getSummary(startDate, endDate) {
        const expenses = await this.prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            include: {
                category: true,
            },
        });
        const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const byCategory = expenses.reduce((acc, exp) => {
            const categoryName = exp.category.name;
            if (!acc[categoryName]) {
                acc[categoryName] = 0;
            }
            acc[categoryName] += Number(exp.amount);
            return acc;
        }, {});
        return {
            totalExpenses,
            expenseCount: expenses.length,
            byCategory,
            expenses,
        };
    }
    async createCategory(createCategoryDto, userId) {
        const category = await this.prisma.expenseCategory.create({
            data: createCategoryDto,
        });
        await this.auditService.createLog({
            action: 'CREATE',
            entity: 'ExpenseCategory',
            entityId: category.id,
            userId,
            newValue: category,
        });
        return category;
    }
    async findAllCategories() {
        return this.prisma.expenseCategory.findMany({
            include: {
                _count: {
                    select: { expenses: true },
                },
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
    async findOneCategory(id) {
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id },
            include: {
                expenses: {
                    orderBy: {
                        date: 'desc',
                    },
                    take: 10,
                },
            },
        });
        if (!category) {
            throw new common_1.NotFoundException('Expense category not found');
        }
        return category;
    }
    async removeCategory(id, userId) {
        const category = await this.findOneCategory(id);
        const expenseCount = await this.prisma.expense.count({
            where: { categoryId: id },
        });
        if (expenseCount > 0) {
            throw new common_1.NotFoundException(`Cannot delete category with ${expenseCount} expenses`);
        }
        await this.prisma.expenseCategory.delete({
            where: { id },
        });
        await this.auditService.createLog({
            action: 'DELETE',
            entity: 'ExpenseCategory',
            entityId: id,
            userId,
            oldValue: category,
        });
        return { message: 'Category deleted successfully' };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map