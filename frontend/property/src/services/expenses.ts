import api from './api';
import type { Expense, ExpenseCategory } from '../types/expense';

export const expensesService = {
    getAll: async (filters?: { categoryId?: string; startDate?: string; endDate?: string; propertyId?: string }): Promise<Expense[]> => {
        const { data } = await api.get<Expense[]>('/expenses', { params: filters });
        return data;
    },
    getById: async (id: string): Promise<Expense> => {
        const { data } = await api.get<Expense>(`/expenses/${id}`);
        return data;
    },
    create: async (dto: any): Promise<Expense> => {
        const { data } = await api.post<Expense>('/expenses', dto);
        return data;
    },
    update: async (id: string, dto: any): Promise<Expense> => {
        const { data } = await api.patch<Expense>(`/expenses/${id}`, dto);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/expenses/${id}`);
        return data;
    },
    getCategories: async (): Promise<ExpenseCategory[]> => {
        const { data } = await api.get<ExpenseCategory[]>('/expenses/categories/all');
        return data;
    },
};
