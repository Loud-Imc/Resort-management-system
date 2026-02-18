import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ExpensesService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * Create expense
     */
    async create(createExpenseDto: CreateExpenseDto, userId: string) {
        const { amount, description, categoryId, propertyId, date, receipts = [] } = createExpenseDto;

        // Verify category exists
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id: categoryId },
        });

        if (!category) {
            throw new NotFoundException('Expense category not found');
        }

        const expense = await this.prisma.expense.create({
            data: {
                amount,
                description,
                categoryId,
                propertyId,
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

    /**
     * Get all expenses with filters
     */
    async findAll(user: any, filters?: {
        categoryId?: string;
        startDate?: Date;
        endDate?: Date;
        propertyId?: string;
    }) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (isGlobalAdmin) {
            // Global view: Only show platform expenses (where propertyId is null)
            // Unless a specific property filter is intended (matching controller logic)
            propertyFilter.propertyId = null;
        } else {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        return this.prisma.expense.findMany({
            where: {
                categoryId: filters?.categoryId,
                date: {
                    gte: filters?.startDate,
                    lte: filters?.endDate,
                },
                propertyId: isGlobalAdmin
                    ? (filters?.propertyId || null)
                    : (!isGlobalAdmin && filters?.propertyId ? filters.propertyId : (propertyFilter.propertyId || undefined)),
                property: !isGlobalAdmin ? propertyFilter : undefined,
            },
            include: {
                category: true,
                property: true,
            },
            orderBy: {
                date: 'desc',
            },
        });
    }

    /**
     * Get expense by ID
     */
    async findOne(id: string, user: any) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const expense = await this.prisma.expense.findUnique({
            where: { id },
            include: {
                category: true,
                property: true,
            },
        });

        if (!expense) {
            throw new NotFoundException('Expense not found');
        }

        // Check ownership/staff access
        if (!isGlobalAdmin) {
            const isOwner = expense.property?.ownerId === user.id;
            const isStaff = await this.prisma.propertyStaff.findUnique({
                where: { propertyId_userId: { propertyId: expense.propertyId || '', userId: user.id } }
            });

            if (!isOwner && !isStaff) {
                throw new NotFoundException('Expense not found');
            }
        }

        return expense;
    }

    /**
     * Update expense
     */
    async update(id: string, updateExpenseDto: UpdateExpenseDto, user: any) {
        const expense = await this.findOne(id, user);

        // Verify category if changing
        if (updateExpenseDto.categoryId) {
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: updateExpenseDto.categoryId },
            });

            if (!category) {
                throw new NotFoundException('Expense category not found');
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
            userId: user.id,
            oldValue: expense,
            newValue: updated,
        });

        return updated;
    }

    /**
     * Delete expense
     */
    async remove(id: string, user: any) {
        const expense = await this.findOne(id, user);

        await this.prisma.expense.delete({
            where: { id },
        });

        await this.auditService.createLog({
            action: 'DELETE',
            entity: 'Expense',
            entityId: id,
            userId: user.id,
            oldValue: expense,
        });

        return { message: 'Expense deleted successfully' };
    }

    /**
     * Get expense summary
     */
    async getSummary(user: any, startDate: Date, endDate: Date, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        const expenses = await this.prisma.expense.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
                propertyId: isGlobalAdmin
                    ? (propertyId || null)
                    : (propertyId || undefined),
                property: !isGlobalAdmin ? propertyFilter : undefined,
            },
            include: {
                category: true,
                property: true,
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
        }, {} as Record<string, number>);

        return {
            totalExpenses,
            expenseCount: expenses.length,
            byCategory,
            expenses,
        };
    }

    // ===== Expense Categories =====

    /**
     * Create expense category
     */
    async createCategory(createCategoryDto: CreateExpenseCategoryDto, userId: string) {
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

    /**
     * Get all expense categories
     */
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

    /**
     * Get category by ID
     */
    async findOneCategory(id: string) {
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
            throw new NotFoundException('Expense category not found');
        }

        return category;
    }

    /**
     * Delete expense category
     */
    async removeCategory(id: string, userId: string) {
        const category = await this.findOneCategory(id);

        // Check if category has expenses
        const expenseCount = await this.prisma.expense.count({
            where: { categoryId: id },
        });

        if (expenseCount > 0) {
            throw new NotFoundException(
                `Cannot delete category with ${expenseCount} expenses`,
            );
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
}
