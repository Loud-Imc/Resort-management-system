import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, DollarSign, Calendar, FileText, Tag } from 'lucide-react';
import { expensesService } from '../../services/expenses';
import type { Expense, ExpenseCategory } from '../../types/expense';
import { useProperty } from '../../context/PropertyContext';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';

const expenseSchema = z.object({
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    description: z.string().min(3, 'Description must be at least 3 characters'),
    categoryId: z.string().min(1, 'Category is required'),
    date: z.string().min(1, 'Date is required'),
    propertyId: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense?: Expense | null;
}

export default function ExpenseModal({ isOpen, onClose, expense }: ExpenseModalProps) {
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    const { data: categories, refetch: refetchCategories } = useQuery<ExpenseCategory[]>({
        queryKey: ['expenseCategories', selectedProperty?.id],
        queryFn: () => expensesService.getCategories(selectedProperty?.id),
    });

    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);

    const {
        register, handleSubmit, reset,
        formState: { errors },
    } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
    });

    // Reset form when expense changes or modal opens
    useEffect(() => {
        if (isOpen) {
            reset({
                amount: expense?.amount || 0,
                description: expense?.description || '',
                categoryId: expense?.categoryId || '',
                date: expense?.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                propertyId: expense?.propertyId || selectedProperty?.id || '',
            });
        }
    }, [expense, isOpen, reset, selectedProperty?.id]);

    const mutation = useMutation({
        mutationFn: (data: ExpenseFormData) => {
            const payload = { ...data, propertyId: data.propertyId || selectedProperty?.id };
            if (expense?.id) return expensesService.update(expense.id, payload);
            return expensesService.create(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['financialReport'] });
            toast.success(expense ? 'Expense updated successfully' : 'Expense added successfully');
            reset();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Something went wrong');
        },
    });

    const createCategoryMutation = async () => {
        if (!newCategoryName.trim()) return;
        try {
            setIsCreatingCategory(true);
            const category = await expensesService.createCategory({
                name: newCategoryName,
                propertyId: selectedProperty?.id
            });
            await refetchCategories();
            // @ts-ignore
            reset({ ...expense, categoryId: category.id, propertyId: selectedProperty?.id });
            setIsAddingCategory(false);
            setNewCategoryName('');
            toast.success('Category created successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create category');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {expense ? 'Edit Expense' : 'Add New Expense'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 space-y-5">
                    <input type="hidden" {...register('propertyId')} />

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
                        <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="number" step="0.01" {...register('amount', { valueAsNumber: true })} placeholder="0.00"
                                className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                        </div>
                        {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                            <button type="button" onClick={() => setIsAddingCategory(!isAddingCategory)}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                                {isAddingCategory ? 'Select existing' : <><Plus className="h-3 w-3" /> Add new</>}
                            </button>
                        </div>
                        <div className="relative">
                            <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            {isAddingCategory ? (
                                <div className="flex gap-2">
                                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                                        placeholder="New category name"
                                        className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                                    <button type="button" onClick={createCategoryMutation} disabled={isCreatingCategory}
                                        className="px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50">
                                        {isCreatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                    </button>
                                </div>
                            ) : (
                                <select {...register('categoryId')}
                                    className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none">
                                    <option value="">Select Category</option>
                                    {categories?.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                                </select>
                            )}
                        </div>
                        {errors.categoryId && !isAddingCategory && <p className="text-xs text-red-500">{errors.categoryId.message}</p>}
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input type="date" {...register('date')}
                                className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                        </div>
                        {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                        <div className="relative">
                            <FileText className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                            <textarea {...register('description')} rows={3} placeholder="What was this expense for?"
                                className="block w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                        </div>
                        {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-xl transition-all">
                            Cancel
                        </button>
                        <button type="submit" disabled={mutation.isPending}
                            className="flex-[2] px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {expense ? 'Update Expense' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
