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
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
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
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
        categoryId: string;
        receipts: string[];
    })[]>;
    findOne(id: string): Promise<{
        category: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
        amount: import("@prisma/client/runtime/library").Decimal;
        date: Date;
        categoryId: string;
        receipts: string[];
    }>;
    update(id: string, updateExpenseDto: UpdateExpenseDto, userId: string): Promise<{
        category: {
            id: string;
            name: string;
            description: string | null;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        description: string;
        createdAt: Date;
        updatedAt: Date;
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
                name: string;
                description: string | null;
                createdAt: Date;
                updatedAt: Date;
            };
        } & {
            id: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            categoryId: string;
            receipts: string[];
        })[];
    }>;
    createCategory(createCategoryDto: CreateExpenseCategoryDto, userId: string): Promise<{
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAllCategories(): Promise<({
        _count: {
            expenses: number;
        };
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    })[]>;
    findOneCategory(id: string): Promise<{
        expenses: {
            id: string;
            description: string;
            createdAt: Date;
            updatedAt: Date;
            amount: import("@prisma/client/runtime/library").Decimal;
            date: Date;
            categoryId: string;
            receipts: string[];
        }[];
    } & {
        id: string;
        name: string;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    removeCategory(id: string, userId: string): Promise<{
        message: string;
    }>;
}
