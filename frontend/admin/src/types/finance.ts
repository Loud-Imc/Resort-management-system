export const IncomeSources = {
    ROOM_BOOKING: 'Room Booking',
    EXTRA_GUEST_CHARGES: 'Extra Guest Charges',
    ONLINE_BOOKING: 'Online Booking',
    OTHER: 'Other',
} as const;

export type IncomeSources = typeof IncomeSources[keyof typeof IncomeSources];

export interface IncomeSource {
    value: string;
    label: string;
}

export interface ExpenseCategory {
    id: string;
    name: string;
    description?: string;
}

export interface Income {
    id: string;
    amount: number;
    source: IncomeSources;
    description?: string;
    date: string;
    bookingId?: string;
}

export interface Expense {
    id: string;
    amount: number;
    description: string;
    date: string;
    categoryId: string;
    category: ExpenseCategory;
    receipts: string[];
}

export interface FinancialReport {
    period: {
        start: string;
        end: string;
    };
    summary: {
        totalIncome: number;
        totalExpenses: number;
        netProfit: number;
        profitMargin: number;
    };
    incomeBySource: {
        source: string;
        _sum: {
            amount: number;
        };
    }[];
    expensesByCategory: {
        category: {
            name: string;
        };
        _sum: {
            amount: number;
        };
    }[];
}
