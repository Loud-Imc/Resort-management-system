export interface ExpenseCategory {
    id: string;
    name: string;
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    category: ExpenseCategory;
    propertyId?: string;
    property?: { id: string; name: string };
    isPaid?: boolean;
    paymentMethod?: string;
    createdAt: string;
    updatedAt: string;
}
