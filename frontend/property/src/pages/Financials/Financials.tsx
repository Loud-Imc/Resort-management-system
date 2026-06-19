import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { reportsService } from '../../services/reports';
import { expensesService } from '../../services/expenses';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    Loader2, IndianRupee, TrendingUp, TrendingDown,
    PieChart as PieChartIcon, Calendar, Plus, Tag, FileText, ChevronRight, Search, Filter
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import ExpenseModal from '../../components/Financials/ExpenseModal';
import type { Expense } from '../../types/expense';

const COLORS = ['#08474e', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export default function Financials() {
    const { selectedProperty } = useProperty();
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        date: '',
        paymentMethod: '',
        isPaid: 'all',
        minAmount: '',
        maxAmount: ''
    });

    useEffect(() => {
        if (searchParams.get('action') === 'add-expense') {
            setIsExpenseModalOpen(true);
            // Remove the query param to prevent re-opening on refresh
            searchParams.delete('action');
            setSearchParams(searchParams, { replace: true });
        }
    }, [searchParams, setSearchParams]);

    const { data: report, isLoading } = useQuery<any>({
        queryKey: ['financialReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getFinancialReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const { data: recentExpenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
        queryKey: ['expenses', 'recent', selectedProperty?.id, dateRange],
        queryFn: () => expensesService.getAll({
            startDate: dateRange.startDate, endDate: dateRange.endDate,
            propertyId: selectedProperty?.id,
        }),
        enabled: !!selectedProperty?.id,
    });

    const uniqueCategories = Array.from(new Set(recentExpenses?.map(e => e.category?.name))).filter(Boolean) as string[];
    const uniquePaymentMethods = Array.from(new Set(recentExpenses?.map(e => e.paymentMethod))).filter(Boolean) as string[];

    const filteredExpenses = recentExpenses?.filter(expense => {
        if (filters.search && !expense.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.category && expense.category?.name !== filters.category) return false;
        if (filters.date && format(new Date(expense.date), 'yyyy-MM-dd') !== filters.date) return false;
        if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
        if (filters.isPaid === 'paid' && !expense.isPaid) return false;
        if (filters.isPaid === 'unpaid' && expense.isPaid) return false;
        if (filters.minAmount && expense.amount < Number(filters.minAmount)) return false;
        if (filters.maxAmount && expense.amount > Number(filters.maxAmount)) return false;
        return true;
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    );

    const incomeData = report?.incomeBySource?.map((item: any) => ({
        name: item.source.replace(/_/g, ' '),
        value: Number(item._sum.amount),
    })) || [];

    const expenseData = report?.expensesByCategory?.map((item: any) => ({
        name: item.category.name,
        value: Number(item._sum.amount),
    })) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Income, expenses, and profit analysis</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-2 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input type="date" value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                            className="text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-900 dark:text-white font-medium" />
                        <span className="text-gray-400">to</span>
                        <input type="date" value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                            className="text-sm border-none bg-transparent focus:ring-0 p-0 text-gray-900 dark:text-white font-medium" />
                    </div>
                    <button onClick={() => { setSelectedExpense(null); setIsExpenseModalOpen(true); }}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all">
                        <Plus className="h-4 w-4" /> Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <SummaryCard title="Total Income" value={`₹${report?.summary?.totalIncome?.toLocaleString() || '0'}`} icon={<TrendingUp className="h-6 w-6 text-emerald-500" />} color="emerald" />
                <SummaryCard title="Total Expenses" value={`₹${report?.summary?.totalExpenses?.toLocaleString() || '0'}`} icon={<TrendingDown className="h-6 w-6 text-rose-500" />} color="rose" />
                <SummaryCard title="Platform Fees" value={`₹${report?.summary?.totalPlatformFees?.toLocaleString() || '0'}`} icon={<Tag className="h-6 w-6 text-orange-500" />} color="orange" />
                <SummaryCard title="Net Profit" value={`₹${report?.summary?.netProfit?.toLocaleString() || '0'}`} icon={<IndianRupee className="h-6 w-6 text-primary" />} color="primary" isNegative={report?.summary?.netProfit < 0} />
                <SummaryCard title="Profit Margin" value={`${typeof report?.summary?.profitMargin === 'number' ? report.summary.profitMargin.toFixed(1) : '0'}%`} icon={<PieChartIcon className="h-6 w-6 text-purple-500" />} color="purple" />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Income by Source</h3>
                    <div className="h-80">
                        {incomeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={incomeData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value"
                                        label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}>
                                        {incomeData.map((_: any, index: number) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Amount']} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-20">No income data for this period</p>}
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Expenses by Category</h3>
                    <div className="h-80">
                        {expenseData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={expenseData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" tickFormatter={(value: number) => `₹${value}`} fontSize={12} />
                                    <YAxis dataKey="name" type="category" width={100} fontSize={12} />
                                    <Tooltip formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Amount']} />
                                    <Bar dataKey="value" fill="#08474e" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-20">No expense data for this period</p>}
                    </div>
                </div>
            </div>

            {/* Recent Expenses Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Expenses</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Showing expenses for selected dates</p>
                        </div>
                        <button 
                            onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                        >
                            <Filter className="h-4 w-4" /> Filters {Object.values(filters).some(v => v !== '' && v !== 'all') && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                        </button>
                    </div>

                    {isFilterExpanded && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            {/* Search */}
                            <div className="col-span-full sm:col-span-2 lg:col-span-2">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Search Description</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={filters.search}
                                        onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                                        placeholder="Search..."
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                                    />
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Category</label>
                                <select 
                                    value={filters.category}
                                    onChange={e => setFilters(prev => ({ ...prev, category: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">All Categories</option>
                                    {uniqueCategories.map((c: string) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {/* Date */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Exact Date</label>
                                <input 
                                    type="date"
                                    value={filters.date}
                                    onChange={e => setFilters(prev => ({ ...prev, date: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>

                            {/* Payment Method */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Payment Method</label>
                                <select 
                                    value={filters.paymentMethod}
                                    onChange={e => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="">All Methods</option>
                                    {uniquePaymentMethods.map((m: string) => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>

                            {/* Status */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Payment Status</label>
                                <select 
                                    value={filters.isPaid}
                                    onChange={e => setFilters(prev => ({ ...prev, isPaid: e.target.value }))}
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                >
                                    <option value="all">All Statuses</option>
                                    <option value="paid">Paid</option>
                                    <option value="unpaid">Unpaid</option>
                                </select>
                            </div>

                            {/* Min Amount */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Min Amount</label>
                                <input 
                                    type="number"
                                    value={filters.minAmount}
                                    onChange={e => setFilters(prev => ({ ...prev, minAmount: e.target.value }))}
                                    placeholder="Min ₹"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>

                            {/* Max Amount */}
                            <div>
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">Max Amount</label>
                                <input 
                                    type="number"
                                    value={filters.maxAmount}
                                    onChange={e => setFilters(prev => ({ ...prev, maxAmount: e.target.value }))}
                                    placeholder="Max ₹"
                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            
                            {/* Clear Filters */}
                            <div className="col-span-full flex justify-end">
                                <button 
                                    onClick={() => setFilters({ search: '', category: '', date: '', paymentMethod: '', isPaid: 'all', minAmount: '', maxAmount: '' })}
                                    className="text-sm text-rose-500 hover:text-rose-600 font-medium"
                                >
                                    Clear All Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Bookings</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Payment</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Amount</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loadingExpenses ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                            ) : !filteredExpenses?.length ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">No expenses found matching filters</td></tr>
                            ) : (
                                filteredExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedExpense(expense); setIsExpenseModalOpen(true); }}>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(expense.date), 'dd MMM, yyyy')}</span></div></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="px-2 py-1 bg-primary/10 dark:bg-primary/20 rounded-lg"><Tag className="h-3 w-3 text-primary" /></div><span className="text-sm font-medium text-gray-900 dark:text-white">{expense.category.name}</span></div></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400 shrink-0" /><span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{expense.description}</span></div></td>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            {expense.bookings && expense.bookings.length > 0 ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {expense.bookings.map(b => (
                                                        <button
                                                            key={b.id}
                                                            onClick={() => navigate(`/bookings/${b.id}`)}
                                                            className="inline-flex items-center px-2 py-0.5 bg-primary/10 hover:bg-primary/20 text-primary dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary-foreground rounded text-xs font-medium border border-primary/20 dark:border-primary-800/50 transition-colors"
                                                        >
                                                            {b.bookingNumber}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {expense.isPaid ? (
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 w-fit">Paid</span>
                                                ) : (
                                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 w-fit">Unpaid</span>
                                                )}
                                                {expense.paymentMethod && (
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">{expense.paymentMethod.replace(/_/g, ' ').toLowerCase()}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right"><span className="text-sm font-bold text-rose-500">₹{expense.amount.toLocaleString()}</span></td>
                                        <td className="px-6 py-4 text-right"><ChevronRight className="h-4 w-4 text-gray-400 ml-auto" /></td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} expense={selectedExpense} />
        </div>
    );
}

function SummaryCard({ title, value, icon, color, isNegative }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 group hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{title}</p>
                    <p className={`text-2xl font-bold mt-2 ${isNegative ? 'text-rose-500' : (color === 'primary' ? 'text-primary' : `text-${color}-500`)}`}>{value}</p>
                </div>
                <div className={`p-3 ${color === 'primary' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : `bg-${color}-50 dark:bg-${color}-900/20`} rounded-xl group-hover:scale-110 transition-transform`}>{icon}</div>
            </div>
        </div>
    );
}
