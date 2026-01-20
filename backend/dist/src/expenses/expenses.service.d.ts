import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
import { AuditService } from '../audit/audit.service';
export declare class ExpensesService {
    private prisma;
    private auditService;
    constructor(prisma: PrismaService, auditService: AuditService);
    create(createExpenseDto: CreateExpenseDto, userId: string): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
        categoryId: string;
        receipts: string[];
    }>;
    findAll(filters?: {
        categoryId?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<({
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
        categoryId: string;
        receipts: string[];
    })[]>;
    findOne(id: string): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
        categoryId: string;
        receipts: string[];
    }>;
    update(id: string, updateExpenseDto: UpdateExpenseDto, userId: string): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            updatedAt: Date;
            description: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
        categoryId: string;
        receipts: string[];
    }>;
    remove(id: string, userId: string): Promise<{
        message: string;
    }>;
    getSummary(startDate: Date, endDate: Date): Promise<{
        totalExpenses: number;
        expenseCount: number;
        byCategory: Record<string, number>;
        expenses: ({
            category: {
                id: string;
                createdAt: Date;
                name: string;
                updatedAt: Date;
                description: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            categoryId: string;
            receipts: string[];
        })[];
    }>;
    createCategory(createCategoryDto: CreateExpenseCategoryDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
    }>;
    findAllCategories(): Promise<({
        _count: {
            expenses: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
    })[]>;
    findOneCategory(id: string): Promise<{
        expenses: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            categoryId: string;
            receipts: string[];
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        updatedAt: Date;
        description: string | null;
    }>;
    removeCategory(id: string, userId: string): Promise<{
        message: string;
    }>;
}
