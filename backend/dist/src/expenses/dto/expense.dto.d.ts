export declare class CreateExpenseDto {
    amount: number;
    description: string;
    categoryId: string;
    date?: string;
    receipts?: string[];
}
export declare class UpdateExpenseDto {
    amount?: number;
    description?: string;
    categoryId?: string;
    date?: string;
    receipts?: string[];
}
export declare class CreateExpenseCategoryDto {
    name: string;
    description?: string;
}
