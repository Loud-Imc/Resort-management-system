export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string;
    _count?: {
        expenses: number;
    };
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    category: ExpenseCategory;
    propertyId?: string;
    property?: {
        id: string;
        name: string;
    };
    receipts: string[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateExpenseDto {
    amount: number;
    description: string;
    categoryId: string;
    propertyId?: string;
    date?: string;
    receipts?: string[];
}

export interface UpdateExpenseDto extends Partial<CreateExpenseDto> { }

export interface ExpenseSummary {
    totalExpenses: number;
    expenseCount: number;
    byCategory: Record<string, number>;
    expenses: Expense[];
}
