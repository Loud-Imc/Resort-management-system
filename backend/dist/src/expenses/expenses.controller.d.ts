import { ExpensesService } from './expenses.service';
import { CreateExpenseDto, UpdateExpenseDto, CreateExpenseCategoryDto } from './dto/expense.dto';
export declare class ExpensesController {
    private readonly expensesService;
    constructor(expensesService: ExpensesService);
    create(createExpenseDto: CreateExpenseDto, req: any): Promise<{
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
    findAll(categoryId?: string, startDate?: string, endDate?: string): Promise<({
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
    getSummary(startDate: string, endDate: string): Promise<{
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
    update(id: string, updateExpenseDto: UpdateExpenseDto, req: any): Promise<{
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
    remove(id: string, req: any): Promise<{
        message: string;
    }>;
    createCategory(createCategoryDto: CreateExpenseCategoryDto, req: any): Promise<{
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
    removeCategory(id: string, req: any): Promise<{
        message: string;
    }>;
}
