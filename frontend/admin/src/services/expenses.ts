import api from './api';
import type { Expense, ExpenseCategory, CreateExpenseDto, UpdateExpenseDto, ExpenseSummary } from '../types/expense';

export const expensesService = {
    getAll: async (filters?: { categoryId?: string; startDate?: string; endDate?: string; propertyId?: string }) => {
        const { data } = await api.get<Expense[]>('/expenses', {
            params: filters
        });
        return data;
    },

    getSummary: async (startDate: string, endDate: string, propertyId?: string) => {
        const { data } = await api.get<ExpenseSummary>('/expenses/summary', {
            params: { startDate, endDate, propertyId }
        });
        return data;
    },

    getById: async (id: string) => {
        const { data } = await api.get<Expense>(`/expenses/${id}`);
        return data;
    },

    create: async (dto: CreateExpenseDto) => {
        const { data } = await api.post<Expense>('/expenses', dto);
        return data;
    },

    update: async (id: string, dto: UpdateExpenseDto) => {
        const { data } = await api.patch<Expense>(`/expenses/${id}`, dto);
        return data;
    },

    delete: async (id: string) => {
        const { data } = await api.delete(`/expenses/${id}`);
        return data;
    },

    getCategories: async () => {
        const { data } = await api.get<ExpenseCategory[]>('/expenses/categories/all');
        return data;
    },
};
