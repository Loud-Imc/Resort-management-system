import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { AuditService } from '../audit/audit.service';

import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class ExpensesService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
        private pdfService: PdfService,
    ) { }

    /**
     * Create expense
     */
    async create(createExpenseDto: CreateExpenseDto, userId: string) {
        const { amount, description, categoryId, propertyId, date, receipts = [], isPaid, paymentMethod, bookingIds = [] } = createExpenseDto;

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
                isPaid,
                paymentMethod,
                bookings: bookingIds.length > 0 ? {
                    connect: bookingIds.map(id => ({ id }))
                } : undefined,
            },
            include: {
                category: true,
                bookings: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guests: true,
                    }
                }
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

    async createBulk(dtos: CreateExpenseDto[], userId: string) {
        // We use a transaction of sequential creates to handle relation connections
        const createdExpenses = await this.prisma.$transaction(
            dtos.map(dto => this.prisma.expense.create({
                data: {
                    amount: dto.amount,
                    description: dto.description,
                    categoryId: dto.categoryId,
                    propertyId: dto.propertyId,
                    date: dto.date ? new Date(dto.date) : new Date(),
                    receipts: dto.receipts || [],
                    isPaid: dto.isPaid ?? true,
                    paymentMethod: dto.paymentMethod,
                    bookings: (dto.bookingIds && dto.bookingIds.length > 0) ? {
                        connect: dto.bookingIds.map(id => ({ id }))
                    } : undefined,
                },
                include: {
                    category: true,
                    bookings: {
                        select: { id: true, bookingNumber: true, guests: true }
                    }
                },
            }))
        );

        await this.auditService.createLog({
            action: 'CREATE_BULK',
            entity: 'Expense',
            entityId: createdExpenses[0]?.id || 'bulk',
            userId,
            newValue: { count: createdExpenses.length },
        });

        return createdExpenses;
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
                bookings: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guests: true,
                    }
                }
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
                bookings: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guests: true,
                    }
                }
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
        const { reason, ...updateData } = updateExpenseDto;
        const expense = await this.findOne(id, user);

        // Verify category if changing
        if (updateData.categoryId) {
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: updateData.categoryId },
            });

            if (!category) {
                throw new NotFoundException('Expense category not found');
            }
        }

        // Record log to expenseHistory
        await (this.prisma as any).expenseHistory.create({
            data: {
                expenseId: id,
                action: 'UPDATE',
                amount: expense.amount,
                description: expense.description,
                categoryId: expense.categoryId,
                propertyId: expense.propertyId,
                reason: reason || 'Not specified',
                changedBy: `${user.firstName || ''} ${user.lastName || ''} (${user.email || ''})`.trim() || 'Unknown User',
            }
        });

        const updated = await this.prisma.expense.update({
            where: { id },
            data: {
                amount: updateData.amount,
                description: updateData.description,
                categoryId: updateData.categoryId,
                date: updateData.date ? new Date(updateData.date) : undefined,
                receipts: updateData.receipts,
                isPaid: updateData.isPaid,
                paymentMethod: updateData.paymentMethod,
                ...(updateData.bookingIds && {
                    bookings: {
                        set: updateData.bookingIds.map(id => ({ id }))
                    }
                })
            },
            include: {
                category: true,
                bookings: {
                    select: {
                        id: true,
                        bookingNumber: true,
                        guests: true,
                    }
                }
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
    async remove(id: string, user: any, reason?: string) {
        const expense = await this.findOne(id, user);

        // Record log to expenseHistory before deleting
        await (this.prisma as any).expenseHistory.create({
            data: {
                expenseId: id,
                action: 'DELETE',
                amount: expense.amount,
                description: expense.description,
                categoryId: expense.categoryId,
                propertyId: expense.propertyId,
                reason: reason || 'Not specified',
                changedBy: `${user.firstName || ''} ${user.lastName || ''} (${user.email || ''})`.trim() || 'Unknown User',
            }
        });

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
        const { name, propertyId } = createCategoryDto;

        // Check for duplicate name for this property (or system)
        const existing = await this.prisma.expenseCategory.findFirst({
            where: { name, propertyId: propertyId || null },
        });

        if (existing) {
            throw new ConflictException(`Category "${name}" already exists`);
        }

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

    async generatePdfReport(user: any, filters: any): Promise<Buffer> {
        // Fetch all matching expenses
        const expenses = await this.findAll(user, {
            ...filters,
            startDate: filters.startDate ? new Date(filters.startDate) : undefined,
            endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        });

        // Further filter them down by the exact same logic the frontend uses
        const filteredExpenses = expenses.filter(expense => {
            if (filters.search && !expense.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
            if (filters.category && expense.category?.name !== filters.category) return false;
            if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
            if (filters.isPaid === 'paid' && !expense.isPaid) return false;
            if (filters.isPaid === 'unpaid' && expense.isPaid) return false;
            if (filters.minAmount && Number(expense.amount) < Number(filters.minAmount)) return false;
            if (filters.maxAmount && Number(expense.amount) > Number(filters.maxAmount)) return false;
            return true;
        });

        return this.pdfService.generateExpensesReport(filteredExpenses, filters);
    }

    /**
     * Get all expense categories
     */
    async findAllCategories(propertyId?: string) {
        return this.prisma.expenseCategory.findMany({
            where: {
                OR: [
                    { propertyId: null },
                    { propertyId: propertyId || undefined }
                ]
            },
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

    /**
     * Get all alteration histories for a property
     */
    async findAllHistory(user: any, propertyId?: string) {
        const roles = user.roles || [];
        const isGlobalAdmin = roles.includes('SuperAdmin') || roles.includes('Admin');

        const propertyFilter: any = {};
        if (!isGlobalAdmin) {
            propertyFilter.OR = [
                { ownerId: user.id },
                { staff: { some: { userId: user.id } } }
            ];
        }

        if (!isGlobalAdmin && propertyId) {
            const allowedProperty = await this.prisma.property.findFirst({
                where: {
                    id: propertyId,
                    ...propertyFilter
                }
            });
            if (!allowedProperty) {
                throw new NotFoundException('Property not found or access denied');
            }
        }

        return (this.prisma as any).expenseHistory.findMany({
            where: {
                propertyId: propertyId || undefined,
            },
            orderBy: {
                changedAt: 'desc',
            },
        });
    }
}
