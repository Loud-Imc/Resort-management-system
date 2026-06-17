import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { X, Loader2, IndianRupee, Calendar, FileText, Tag, Plus, Search, Trash2 } from 'lucide-react';
import { expensesService } from '../../services/expenses';
import type { Expense, ExpenseCategory } from '../../types/expense';
import { useProperty } from '../../context/PropertyContext';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';
import { bookingsService } from '../../services/bookings';

const singleExpenseSchema = z.object({
    id: z.string().optional(),
    amount: z.coerce.number().min(0.01, 'Amount > 0'),
    description: z.string().min(3, 'Description >= 3 chars'),
    categoryId: z.string().min(1, 'Category required'),
    date: z.string().min(1, 'Date required'),
    propertyId: z.string().optional(),
    isPaid: z.boolean().optional(),
    paymentMethod: z.string().optional(),
    bookingIds: z.array(z.string()).optional(),
});

const expensesSchema = z.object({
    expenses: z.array(singleExpenseSchema).min(1, 'At least one expense is required'),
});

type ExpensesFormData = z.infer<typeof expensesSchema>;

interface ExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    expense?: Expense | null;
}

// Sub-component for individual expense rows
function ExpenseRow({ index, register, errors, watch, setValue, categories, bookingsData, remove, isEdit }: any) {
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const { selectedProperty } = useProperty();
    const queryClient = useQueryClient();

    const [bookingSearch, setBookingSearch] = useState('');
    const [isBookingDropdownOpen, setIsBookingDropdownOpen] = useState(false);
    const bookingSearchRef = useRef<HTMLDivElement>(null);
    const [localSelectedBookings, setLocalSelectedBookings] = useState<{id: string, bookingNumber: string, guestName: string}[]>([]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (bookingSearchRef.current && !bookingSearchRef.current.contains(event.target as Node)) {
                setIsBookingDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Sync selected bookings with form state
    useEffect(() => {
        setValue(`expenses.${index}.bookingIds`, localSelectedBookings.map(b => b.id));
    }, [localSelectedBookings, index, setValue]);

    // Initialize localSelectedBookings from existing form values if present
    useEffect(() => {
        const existingIds = watch(`expenses.${index}.bookingIds`) || [];
        if (existingIds.length > 0 && localSelectedBookings.length === 0 && bookingsData) {
            const initialBookings = existingIds.map((id: string) => {
                const b = bookingsData.find((booking: any) => booking.id === id);
                if (b) {
                    return {
                        id: b.id,
                        bookingNumber: b.bookingNumber,
                        guestName: b.guests?.[0] ? `${b.guests[0].firstName} ${b.guests[0].lastName}`.trim() : 'Guest'
                    };
                }
                return null;
            }).filter(Boolean);
            setLocalSelectedBookings(initialBookings);
        }
    }, [bookingsData]);


    const createCategoryMutation = async () => {
        if (!newCategoryName.trim()) return;
        try {
            setIsCreatingCategory(true);
            const category = await expensesService.createCategory({
                name: newCategoryName,
                propertyId: selectedProperty?.id
            });
            await queryClient.invalidateQueries({ queryKey: ['expenseCategories'] });
            setValue(`expenses.${index}.categoryId`, category.id);
            setIsAddingCategory(false);
            setNewCategoryName('');
            toast.success('Category created successfully');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create category');
        } finally {
            setIsCreatingCategory(false);
        }
    };

    return (
        <div className="relative p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-5">
            {!isEdit && (
                <button type="button" onClick={() => remove(index)} className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors">
                    <Trash2 className="h-4 w-4" />
                </button>
            )}
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs px-2 py-1 rounded-md">
                    Expense #{index + 1}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Amount */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Amount (₹)</label>
                    <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input type="number" step="0.01" {...register(`expenses.${index}.amount`)} placeholder="0.00"
                            className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    </div>
                    {errors?.expenses?.[index]?.amount && <p className="text-xs text-red-500">{errors.expenses[index].amount.message}</p>}
                </div>

                {/* Date */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input type="date" {...register(`expenses.${index}.date`)}
                            className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    </div>
                    {errors?.expenses?.[index]?.date && <p className="text-xs text-red-500">{errors.expenses[index].date.message}</p>}
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
                                    placeholder="New category"
                                    className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                                <button type="button" onClick={createCategoryMutation} disabled={isCreatingCategory}
                                    className="px-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold disabled:opacity-50">
                                    {isCreatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                                </button>
                            </div>
                        ) : (
                            <select {...register(`expenses.${index}.categoryId`)}
                                className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none">
                                <option value="">Select Category</option>
                                {categories?.map((cat: any) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                            </select>
                        )}
                    </div>
                    {errors?.expenses?.[index]?.categoryId && !isAddingCategory && <p className="text-xs text-red-500">{errors.expenses[index].categoryId.message}</p>}
                </div>

                {/* Status & Payment Method */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                        <select {...register(`expenses.${index}.isPaid`, { setValueAs: (v: any) => String(v) === 'true' })}
                            className="block w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none">
                            <option value="true">Paid</option>
                            <option value="false">Not Paid</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Method</label>
                        <select {...register(`expenses.${index}.paymentMethod`)}
                            className="block w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none">
                            <option value="">Select</option>
                            <option value="UPI">UPI</option>
                            <option value="CASH">CASH</option>
                            <option value="BANK_TRANSFER">Bank Transfer</option>
                            <option value="CREDIT_CARD">Credit Card</option>
                            <option value="DEBIT_CARD">Debit Card</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <div className="relative">
                    <FileText className="absolute top-3 left-3 h-5 w-5 text-gray-400" />
                    <textarea {...register(`expenses.${index}.description`)} rows={2} placeholder="What was this expense for?"
                        className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" />
                </div>
                {errors?.expenses?.[index]?.description && <p className="text-xs text-red-500">{errors.expenses[index].description.message}</p>}
            </div>

            {/* Linked Bookings */}
            <div className="space-y-2" ref={bookingSearchRef}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Linked Bookings (Optional)</label>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" value={bookingSearch} onChange={(e) => {
                        setBookingSearch(e.target.value);
                        setIsBookingDropdownOpen(true);
                    }}
                        onFocus={() => setIsBookingDropdownOpen(true)}
                        placeholder="Search by booking number or guest name"
                        className="block w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" />
                    
                    {isBookingDropdownOpen && bookingSearch.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                            {(bookingsData || []).filter((b: any) => 
                                b.bookingNumber.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                                b.guests?.[0]?.firstName?.toLowerCase().includes(bookingSearch.toLowerCase()) ||
                                b.guests?.[0]?.lastName?.toLowerCase().includes(bookingSearch.toLowerCase())
                            ).slice(0, 10).map((b: any) => {
                                const guestName = b.guests?.[0] ? `${b.guests[0].firstName} ${b.guests[0].lastName}`.trim() : 'Guest';
                                const isSelected = localSelectedBookings.some(sb => sb.id === b.id);
                                return (
                                    <button key={b.id} type="button" 
                                        onClick={() => {
                                            if (!isSelected) {
                                                setLocalSelectedBookings([...localSelectedBookings, { id: b.id, bookingNumber: b.bookingNumber, guestName }]);
                                            }
                                            setBookingSearch('');
                                            setIsBookingDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${isSelected ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-700' : ''}`}
                                    >
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">{b.bookingNumber}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{guestName}</div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                {localSelectedBookings.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {localSelectedBookings.map(b => (
                            <div key={b.id} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium border border-blue-100 dark:border-blue-800/50">
                                <span>{b.bookingNumber}</span>
                                <button type="button" onClick={() => setLocalSelectedBookings(localSelectedBookings.filter(sb => sb.id !== b.id))} className="hover:text-blue-900 dark:hover:text-blue-100 p-0.5 rounded-md transition-colors">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function ExpenseModal({ isOpen, onClose, expense }: ExpenseModalProps) {
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    const { data: categories } = useQuery<ExpenseCategory[]>({
        queryKey: ['expenseCategories', selectedProperty?.id],
        queryFn: () => expensesService.getCategories(selectedProperty?.id),
    });

    const { data: bookingsData } = useQuery({
        queryKey: ['bookings', selectedProperty?.id],
        queryFn: () => bookingsService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const {
        register, handleSubmit, reset, control, watch, setValue,
        formState: { errors },
    } = useForm<ExpensesFormData>({
        resolver: zodResolver(expensesSchema) as any,
        defaultValues: { expenses: [] }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'expenses' });

    // Reset form when expense changes or modal opens
    useEffect(() => {
        if (isOpen) {
            if (expense) {
                reset({
                    expenses: [{
                        id: expense.id,
                        amount: expense.amount as any,
                        description: expense.description,
                        categoryId: expense.categoryId,
                        date: expense.date ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
                        propertyId: expense.propertyId || selectedProperty?.id || '',
                        isPaid: expense.isPaid ?? true,
                        paymentMethod: expense.paymentMethod || '',
                        bookingIds: expense.bookings?.map(b => b.id) || [],
                    }]
                });
            } else {
                reset({
                    expenses: [{
                        amount: '' as any,
                        description: '',
                        categoryId: '',
                        date: format(new Date(), 'yyyy-MM-dd'),
                        propertyId: selectedProperty?.id || '',
                        isPaid: true,
                        paymentMethod: '',
                        bookingIds: [],
                    }]
                });
            }
        }
    }, [expense, isOpen, reset, selectedProperty?.id]);

    const mutation = useMutation({
        mutationFn: async (data: ExpensesFormData) => {
            if (expense && data.expenses.length === 1) {
                const payload = { ...data.expenses[0], propertyId: data.expenses[0].propertyId || selectedProperty?.id };
                return expensesService.update(expense.id, payload);
            } else {
                // Create multiple
                const promises = data.expenses.map(exp => {
                    const payload = { ...exp, propertyId: exp.propertyId || selectedProperty?.id };
                    return expensesService.create(payload);
                });
                return Promise.all(promises);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
            queryClient.invalidateQueries({ queryKey: ['financialReport'] });
            toast.success(expense ? 'Expense updated successfully' : 'Expenses added successfully');
            reset();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Something went wrong');
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl my-auto rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {expense ? 'Edit Expense' : 'Add Expenses'}
                        </h2>
                        {!expense && <p className="text-sm text-gray-500 mt-1">Add one or more expenses at once</p>}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <form id="expenses-form" onSubmit={handleSubmit((data) => mutation.mutate(data as unknown as ExpensesFormData))} className="space-y-6">
                        {fields.map((field, index) => (
                            <ExpenseRow
                                key={field.id}
                                index={index}
                                register={register}
                                errors={errors}
                                watch={watch}
                                setValue={setValue}
                                categories={categories}
                                bookingsData={bookingsData}
                                remove={remove}
                                isEdit={!!expense}
                            />
                        ))}

                        {!expense && (
                            <button
                                type="button"
                                onClick={() => append({
                                    amount: '' as any,
                                    description: '',
                                    categoryId: '',
                                    date: format(new Date(), 'yyyy-MM-dd'),
                                    propertyId: selectedProperty?.id || '',
                                    isPaid: true,
                                    paymentMethod: '',
                                    bookingIds: [],
                                })}
                                className="w-full py-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl text-gray-500 dark:text-gray-400 font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="h-5 w-5" />
                                Add Another Expense Line
                            </button>
                        )}
                    </form>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-gray-50 dark:bg-gray-800 rounded-b-3xl flex justify-end gap-3">
                    <button type="button" onClick={onClose}
                        className="px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-xl transition-all shadow-sm">
                        Cancel
                    </button>
                    <button type="submit" form="expenses-form" disabled={mutation.isPending}
                        className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2">
                        {mutation.isPending && <Loader2 className="h-5 w-5 animate-spin" />}
                        {expense ? 'Update Expense' : `Save ${fields.length} Expense${fields.length > 1 ? 's' : ''}`}
                    </button>
                </div>
            </div>
        </div>
    );
}
