import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { reportsService } from '../../services/reports';
import { expensesService } from '../../services/expenses';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    Loader2, IndianRupee, TrendingUp, TrendingDown, Info,
    PieChart as PieChartIcon, Calendar, Plus, Tag, FileText, ChevronRight, Search, Filter, Download, History, Trash2, Edit2, Wallet
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import ExpenseModal from '../../components/Financials/ExpenseModal';
import FinancialDetailsModal from '../../components/Reports/FinancialDetailsModal';
import type { Expense } from '../../types/expense';

const COLORS = ['#08474e', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export default function Financials() {
    const { selectedProperty } = useProperty();
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [expenseDateRange, setExpenseDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [detailsType, setDetailsType] = useState<'REVENUE' | 'BOOKINGS' | 'PLATFORM_FEES' | 'OCCUPANCY' | 'NET_EARNINGS' | null>(null);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
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
        queryKey: ['expenses', 'recent', selectedProperty?.id, expenseDateRange],
        queryFn: () => expensesService.getAll({
            startDate: expenseDateRange.startDate, endDate: expenseDateRange.endDate,
            propertyId: selectedProperty?.id,
        }),
        enabled: !!selectedProperty?.id,
    });

    const { data: expenseCategories } = useQuery({
        queryKey: ['expense-categories', selectedProperty?.id],
        queryFn: () => expensesService.getCategories(selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const uniqueCategories = expenseCategories?.map((c: any) => c.name) || [];
    const uniquePaymentMethods = Array.from(new Set(recentExpenses?.map(e => e.paymentMethod))).filter(Boolean) as string[];

    const { data: alterationLogs, isLoading: loadingLogs } = useQuery({
        queryKey: ['expenseAlterationLogs', selectedProperty?.id],
        queryFn: () => expensesService.getAlterationLogs(selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const handleDownloadReport = async () => {
        try {
            const blob = await expensesService.downloadReport({
                startDate: expenseDateRange.startDate,
                endDate: expenseDateRange.endDate,
                propertyId: selectedProperty?.id,
                ...filters
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Expenses_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download report:', error);
        }
    };

    const filteredExpenses = recentExpenses?.filter(expense => {
        if (filters.search && !expense.description.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.category && expense.category?.name !== filters.category) return false;
        if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
        if (filters.isPaid === 'paid' && !expense.isPaid) return false;
        if (filters.isPaid === 'unpaid' && expense.isPaid) return false;
        if (filters.minAmount && expense.amount < Number(filters.minAmount)) return false;
        if (filters.maxAmount && expense.amount > Number(filters.maxAmount)) return false;
        return true;
    });



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
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Financial Reports</h1>
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    </div>
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

            {/* Summary Cards & Main Content Wrapper */}
            <div className={`space-y-6 transition-all duration-200 ${isLoading ? 'opacity-55 pointer-events-none select-none' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <SummaryCard title="Total Income" value={`₹${report?.summary?.totalIncome?.toLocaleString() || '0'}`} icon={<TrendingUp className="h-6 w-6 text-emerald-500" />} color="emerald" infoNote="Revenue is calculated based on the check-in month of the booking, not when the booking was made." onClick={() => { setDetailsType('REVENUE'); setIsDetailsModalOpen(true); }} isClickable />
                <SummaryCard title="Cash Inflow" value={`₹${report?.summary?.totalCashInflow?.toLocaleString() || '0'}`} icon={<Wallet className="h-6 w-6 text-indigo-500" />} color="indigo" infoNote="Cash Inflow represents all actual cash/bank receipts received during the period (payment date basis), regardless of check-in date." onClick={() => { document.getElementById('reconciliation-section')?.scrollIntoView({ behavior: 'smooth' }); }} isClickable />
                <SummaryCard title="Total Expenses" value={`₹${report?.summary?.totalExpenses?.toLocaleString() || '0'}`} icon={<TrendingDown className="h-6 w-6 text-rose-500" />} color="rose" onClick={() => { document.getElementById('expenses-section')?.scrollIntoView({ behavior: 'smooth' }); }} isClickable />
                <SummaryCard title="Platform Fees" value={`₹${report?.summary?.totalPlatformFees?.toLocaleString() || '0'}`} icon={<Tag className="h-6 w-6 text-orange-500" />} color="orange" onClick={() => { setDetailsType('PLATFORM_FEES'); setIsDetailsModalOpen(true); }} isClickable />
                <SummaryCard title="Net Profit" value={`₹${report?.summary?.netProfit?.toLocaleString() || '0'}`} icon={<IndianRupee className="h-6 w-6 text-primary" />} color="primary" isNegative={report?.summary?.netProfit < 0} onClick={() => { setDetailsType('NET_EARNINGS'); setIsDetailsModalOpen(true); }} isClickable />
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

            {/* Cash Flow Reconciliation Section */}
            <div id="reconciliation-section" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left card: Explanation and Accrual vs Cash Summary */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
                                <Wallet className="h-5 w-5 text-indigo-500" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cash vs Accrual</h3>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            Your property earns revenue when guests check in (<strong>Earned Revenue</strong>), but actual cash deposits in your bank or drawer occur when payments are received (<strong>Cash Inflow</strong>).
                        </p>
                        <div className="space-y-3 mt-4">
                            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Earned Revenue (Check-ins)</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">₹{report?.summary?.totalIncome?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="flex justify-between items-center p-3 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-xl">
                                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Cash Inflow (Payments)</span>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">₹{report?.summary?.totalCashInflow?.toLocaleString() || '0'}</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                        Use the Cash Inflow details on the right to reconcile your daily bank deposits, UPI logs, and physical cash counts.
                    </div>
                </div>

                {/* Right card: Method-wise Cash Inflow Breakdown */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Cash Receipts by Payment Method</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Progress bars list */}
                        <div className="space-y-4">
                            {['UPI', 'CASH', 'BANK_TRANSFER', 'CREDIT_CARD', 'DEBIT_CARD'].map(method => {
                                const amount = Number(report?.summary?.cashInflowByMethod?.[method] || 0);
                                const total = Number(report?.summary?.totalCashInflow || 1); // avoid division by zero
                                const percentage = Math.round((amount / total) * 100);
                                
                                return (
                                    <div key={method} className="space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{method.replace(/_/g, ' ').toLowerCase()}</span>
                                            <span className="font-bold text-gray-900 dark:text-white">₹{amount.toLocaleString()} ({percentage}%)</span>
                                        </div>
                                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className={`h-full rounded-full ${
                                                    method === 'UPI' ? 'bg-indigo-500' :
                                                    method === 'CASH' ? 'bg-emerald-500' :
                                                    method === 'BANK_TRANSFER' ? 'bg-amber-500' : 'bg-primary'
                                                }`} 
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* Summary visual helper */}
                        <div className="bg-gray-50 dark:bg-gray-700/20 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/50 flex flex-col justify-between">
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">Reconciliation Summary</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Total Digital Inflow (UPI, Transfer, Cards)</span>
                                        <span className="font-semibold text-gray-950 dark:text-white">
                                            ₹{((Number(report?.summary?.totalCashInflow || 0)) - (Number(report?.summary?.cashInflowByMethod?.['CASH'] || 0))).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Total Handheld Till Inflow (Cash)</span>
                                        <span className="font-semibold text-gray-950 dark:text-white">
                                            ₹{(Number(report?.summary?.cashInflowByMethod?.['CASH'] || 0)).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 flex items-start gap-2">
                                <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                <span>Note: Manual revenue bookings entered directly in the system without channel tracking are automatically categorized under "Cash".</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Expenses Table */}
            <div id="expenses-section" className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Expenses</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manage and track your property expenses</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded-lg border border-gray-200 dark:border-gray-600">
                                <Calendar className="h-3.5 w-3.5 text-gray-400 ml-1" />
                                <input type="date" value={expenseDateRange.startDate}
                                    onChange={(e) => setExpenseDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                    className="text-xs border-none bg-transparent focus:ring-0 p-0 text-gray-700 dark:text-gray-200 font-medium w-[105px]" />
                                <span className="text-gray-400 text-xs">to</span>
                                <input type="date" value={expenseDateRange.endDate}
                                    onChange={(e) => setExpenseDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="text-xs border-none bg-transparent focus:ring-0 p-0 text-gray-700 dark:text-gray-200 font-medium w-[105px]" />
                            </div>
                            <button 
                                onClick={() => setIsFilterExpanded(!isFilterExpanded)}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                                <Filter className="h-4 w-4" /> Filters {Object.values(filters).some(v => v !== '' && v !== 'all') && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                            </button>
                            <button 
                                onClick={handleDownloadReport}
                                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                            >
                                <Download className="h-4 w-4" /> Export
                            </button>
                        </div>
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
                                    onClick={() => setFilters({ search: '', category: '', paymentMethod: '', isPaid: 'all', minAmount: '', maxAmount: '' })}
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

            {isExpenseModalOpen && (
                <ExpenseModal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)} expense={selectedExpense} />
            )}

            {/* Alteration Logs */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                            <History className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Expense Alteration Logs</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Audit trail of all expense edits and deletions</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date & Time</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Action</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Amount</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Reason</th>
                                <th className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Changed By</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {loadingLogs ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                            ) : !alterationLogs?.length ? (
                                <tr><td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-400 dark:text-gray-500 italic">No alterations recorded yet</td></tr>
                            ) : (
                                alterationLogs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                            {format(new Date(log.changedAt), 'dd MMM yyyy, hh:mm a')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                                log.action === 'DELETE'
                                                    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                            }`}>
                                                {log.action === 'DELETE' ? <Trash2 className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-[200px] truncate">{log.description}</td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900 dark:text-white text-right">₹{Number(log.amount).toLocaleString()}</td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-[250px]">
                                            <span className="line-clamp-2">{log.reason}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{log.changedBy || '—'}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
            <FinancialDetailsModal 
                isOpen={isDetailsModalOpen} 
                onClose={() => setIsDetailsModalOpen(false)} 
                type={detailsType} 
                dateRange={dateRange} 
                propertyId={selectedProperty?.id} 
                financialReport={report} 
                totalExpenses={report?.summary?.totalExpenses} 
            />
        </div>
    );
}

function SummaryCard({ title, value, icon, color, isNegative, infoNote, onClick, isClickable }: any) {
    return (
        <div onClick={onClick} className={`bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 group transition-all relative overflow-hidden ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/50' : 'hover:shadow-md'}`}>
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-1.5">
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{title}</p>
                        {infoNote && (
                            <div title={infoNote} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                                <Info className="h-4 w-4" />
                            </div>
                        )}
                    </div>
                    <p className={`text-2xl font-bold mt-2 ${isNegative ? 'text-rose-500' : (color === 'primary' ? 'text-primary' : `text-${color}-500`)}`}>{value}</p>
                </div>
                <div className={`p-3 ${color === 'primary' ? 'bg-primary/10 dark:bg-primary/20 text-primary' : `bg-${color}-50 dark:bg-${color}-900/20`} rounded-xl group-hover:scale-110 transition-transform`}>{icon}</div>
            </div>
        </div>
    );
}
