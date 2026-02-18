import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { reportsService } from '../../services/reports';
import { expensesService } from '../../services/expenses';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    Loader2, DollarSign, TrendingUp, TrendingDown,
    PieChart as PieChartIcon, Calendar, Plus, Tag, FileText, ChevronRight
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';
import ExpenseModal from '../../components/Financials/ExpenseModal';
import type { Expense } from '../../types/expense';

const COLORS = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export default function Financials() {
    const { selectedProperty } = useProperty();
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

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

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
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
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all">
                        <Plus className="h-4 w-4" /> Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard title="Total Income" value={`₹${report?.summary?.totalIncome?.toLocaleString() || '0'}`} icon={<TrendingUp className="h-6 w-6 text-emerald-500" />} color="emerald" />
                <SummaryCard title="Total Expenses" value={`₹${report?.summary?.totalExpenses?.toLocaleString() || '0'}`} icon={<TrendingDown className="h-6 w-6 text-rose-500" />} color="rose" />
                <SummaryCard title="Net Profit" value={`₹${report?.summary?.netProfit?.toLocaleString() || '0'}`} icon={<DollarSign className="h-6 w-6 text-blue-500" />} color="blue" isNegative={report?.summary?.netProfit < 0} />
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
                                    <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-20">No expense data for this period</p>}
                    </div>
                </div>
            </div>

            {/* Recent Expenses Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Expenses</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Showing expenses for selected dates</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-700/50">
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Date</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Category</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Description</th>
                                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 text-right">Amount</th>
                                <th className="px-6 py-4"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {loadingExpenses ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400"><Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />Loading...</td></tr>
                            ) : !recentExpenses?.length ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 italic">No expenses found</td></tr>
                            ) : (
                                recentExpenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                                        onClick={() => { setSelectedExpense(expense); setIsExpenseModalOpen(true); }}>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-gray-400" /><span className="text-sm font-medium text-gray-900 dark:text-white">{format(new Date(expense.date), 'dd MMM, yyyy')}</span></div></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg"><Tag className="h-3 w-3 text-blue-600" /></div><span className="text-sm font-medium text-gray-900 dark:text-white">{expense.category.name}</span></div></td>
                                        <td className="px-6 py-4"><div className="flex items-center gap-2"><FileText className="h-4 w-4 text-gray-400 shrink-0" /><span className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">{expense.description}</span></div></td>
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
                    <p className={`text-2xl font-bold mt-2 ${isNegative ? 'text-rose-500' : `text-${color}-500`}`}>{value}</p>
                </div>
                <div className={`p-3 bg-${color}-50 dark:bg-${color}-900/20 rounded-xl group-hover:scale-110 transition-transform`}>{icon}</div>
            </div>
        </div>
    );
}
