import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, DollarSign, Calendar, FileText, Tag, Building2 } from 'lucide-react';
import { expensesService } from '../../services/expenses';
import type { Expense, ExpenseCategory } from '../../types/expense';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { format } from 'date-fns';

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
    const { user } = useAuth();
    const { properties, selectedProperty } = useProperty();

    const isAdmin = user?.roles?.some(r => r === 'SuperAdmin' || r === 'Admin');

    const { data: categories } = useQuery<ExpenseCategory[]>({
        queryKey: ['expenseCategories'],
        queryFn: expensesService.getCategories,
    });

    const {
        register,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<ExpenseFormData>({
        resolver: zodResolver(expenseSchema),
        defaultValues: {
            amount: expense?.amount || 0,
            description: expense?.description || '',
            categoryId: expense?.categoryId || '',
            date: expense?.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
            propertyId: expense?.propertyId || selectedProperty?.id || '',
        },
    });

    // Reset form when expense changes or modal opens
    if (isOpen && expense && expense.id !== watch('id' as any)) {
        // This is a bit hacky, but useForm reset is better called in useEffect
    }

    const mutation = useMutation({
        mutationFn: (data: ExpenseFormData) => {
            const payload = {
                ...data,
                propertyId: data.propertyId || undefined
            };
            if (expense?.id) {
                return expensesService.update(expense.id, payload);
            }
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">
                        {expense ? 'Edit Expense' : 'Add New Expense'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-muted-foreground" />
                    </button>
                </div>

                <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 space-y-5">
                    {/* Property Selection (Admins Only) */}
                    {isAdmin && (
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Allocation</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                </div>
                                <select
                                    {...register('propertyId')}
                                    className="block w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground font-bold focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none"
                                >
                                    <option value="">Platform (Route Guide Official)</option>
                                    {properties?.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Amount */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Amount (₹)</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <DollarSign className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                {...register('amount', { valueAsNumber: true })}
                                className="block w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground font-bold focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                                placeholder="0.00"
                            />
                        </div>
                        {errors.amount && <p className="text-xs font-bold text-rose-500 mt-1">{errors.amount.message}</p>}
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Category</label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Tag className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <select
                                {...register('categoryId')}
                                className="block w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground font-bold focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none appearance-none"
                            >
                                <option value="">Select Category</option>
                                {categories?.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                        </div>
                        {errors.categoryId && <p className="text-xs font-bold text-rose-500 mt-1">{errors.categoryId.message}</p>}
                    </div>

                    {/* Date */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Date</label>
                        <div
                            className="relative group cursor-pointer"
                            onClick={(e) => {
                                const input = e.currentTarget.querySelector('input');
                                if (input && 'showPicker' in input) {
                                    (input as any).showPicker();
                                }
                            }}
                        >
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                                <Calendar className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <input
                                type="date"
                                {...register('date')}
                                className="block w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground font-bold focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none [color-scheme:dark] cursor-pointer"
                            />
                        </div>
                        {errors.date && <p className="text-xs font-bold text-rose-500 mt-1">{errors.date.message}</p>}
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Description</label>
                        <div className="relative group">
                            <div className="absolute top-3 left-3 pointer-events-none">
                                <FileText className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            </div>
                            <textarea
                                {...register('description')}
                                rows={3}
                                className="block w-full pl-10 pr-4 py-3 bg-muted/50 border border-border rounded-xl text-foreground font-bold focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none resize-none"
                                placeholder="What was this expense for?"
                            />
                        </div>
                        {errors.description && <p className="text-xs font-bold text-rose-500 mt-1">{errors.description.message}</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-[2] px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            {expense ? 'Update Expense' : 'Save Expense'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
