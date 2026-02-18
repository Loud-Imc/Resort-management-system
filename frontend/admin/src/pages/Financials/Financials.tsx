import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { reportsService } from '../../services/reports';
import { expensesService } from '../../services/expenses';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    Loader2,
    DollarSign,
    TrendingUp,
    TrendingDown,
    PieChart as PieChartIcon,
    Calendar,
    Plus,
    Tag,
    FileText,
    ChevronRight,
    Building2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import ExpenseModal from '../../components/Financials/ExpenseModal';
import type { Expense } from '../../types/expense';

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export default function Financials() {
    const { selectedProperty } = useProperty();
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

    const { data: report, isLoading, error } = useQuery<any>({
        queryKey: ['financialReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getFinancialReport(
            dateRange.startDate,
            dateRange.endDate,
            selectedProperty?.id
        ),
    });

    const { data: recentExpenses, isLoading: loadingExpenses } = useQuery<Expense[]>({
        queryKey: ['expenses', 'recent', selectedProperty?.id],
        queryFn: () => expensesService.getAll({
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            propertyId: selectedProperty?.id
        }),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 font-bold">
                Error loading financial report. Please try again.
            </div>
        );
    }

    const incomeData = report?.incomeBySource.map((item: any) => ({
        name: item.source.replace(/_/g, ' '),
        value: Number(item._sum.amount),
    })) || [];

    const expenseData = report?.expensesByCategory.map((item: any) => ({
        name: item.category.name,
        value: Number(item._sum.amount),
    })) || [];

    const handleEditExpense = (expense: Expense) => {
        setSelectedExpense(expense);
        setIsExpenseModalOpen(true);
    };

    const handleAddExpense = () => {
        setSelectedExpense(null);
        setIsExpenseModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Financial Reports</h1>
                    <p className="text-sm text-muted-foreground mt-1">Income, expenses, and profit analysis</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-card p-2 rounded-xl border border-border shadow-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div
                            className="flex items-center gap-2 cursor-pointer"
                            onClick={(e) => {
                                const input = e.currentTarget.querySelector('input');
                                if (input && 'showPicker' in input) {
                                    (input as any).showPicker();
                                }
                            }}
                        >
                            <input
                                type="date"
                                value={dateRange.startDate}
                                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                                className="text-sm border-none bg-transparent focus:ring-0 p-0 text-foreground font-bold [color-scheme:dark] cursor-pointer"
                            />
                            <span className="text-muted-foreground">to</span>
                            <div
                                className="flex items-center cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const input = e.currentTarget.querySelector('input');
                                    if (input && 'showPicker' in input) {
                                        (input as any).showPicker();
                                    }
                                }}
                            >
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                                    className="text-sm border-none bg-transparent focus:ring-0 p-0 text-foreground font-bold [color-scheme:dark] cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleAddExpense}
                        className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all border border-primary/10"
                    >
                        <Plus className="h-4 w-4" />
                        Add Expense
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
                                {report?.isGlobal ? 'Platform Gross Revenue' : 'Total Income'}
                            </p>
                            <p className="text-2xl font-black text-emerald-500 mt-2">
                                ₹{report?.summary.totalIncome.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-6 w-6 text-emerald-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
                                {report?.isGlobal ? 'Platform Overhead' : 'Total Expenses'}
                            </p>
                            <p className="text-2xl font-black text-rose-500 mt-2">
                                ₹{report?.summary.totalExpenses.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-rose-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <TrendingDown className="h-6 w-6 text-rose-500" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">
                                {report?.isGlobal ? 'Platform Net Profit' : 'Net Profit'}
                            </p>
                            <p className={`text-2xl font-black mt-2 ${report?.summary.netProfit >= 0 ? 'text-primary' : 'text-rose-500'}`}>
                                ₹{report?.summary.netProfit.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl group-hover:scale-110 transition-transform">
                            <DollarSign className="h-6 w-6 text-primary" />
                        </div>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Profit Margin</p>
                            <p className="text-2xl font-black text-foreground mt-2">
                                {typeof report?.summary.profitMargin === 'number' ? report.summary.profitMargin.toFixed(1) : '0'}%
                            </p>
                        </div>
                        <div className="p-3 bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform">
                            <PieChartIcon className="h-6 w-6 text-purple-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Breakdown */}
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6">Income by Source</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={incomeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {incomeData.map((_entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                    formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Amount']}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                    <h3 className="text-lg font-bold text-foreground mb-6">Expenses by Category</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={expenseData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                                <XAxis type="number" tickFormatter={(value: number) => `₹${value}`} stroke="hsl(var(--muted-foreground))" fontSize={12} fontWeight="bold" />
                                <YAxis dataKey="name" type="category" width={100} stroke="hsl(var(--muted-foreground))" fontSize={12} fontWeight="bold" />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                                    formatter={(value: any) => [`₹${Number(value || 0).toLocaleString()}`, 'Amount']}
                                />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Expenses List */}
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                    <h3 className="text-lg font-bold text-foreground">Recent Expenses</h3>
                    <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Showing expenses for selected dates</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Date</th>
                                {!report?.isGlobal && (
                                    <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Allocation</th>
                                )}
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Category</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Description</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Amount</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {loadingExpenses ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">
                                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                                        Loading expenses...
                                    </td>
                                </tr>
                            ) : recentExpenses?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground italic">
                                        No expenses found for this period
                                    </td>
                                </tr>
                            ) : (
                                recentExpenses?.map((expense) => (
                                    <tr
                                        key={expense.id}
                                        className="hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => handleEditExpense(expense)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                                <span className="text-sm font-bold text-foreground">
                                                    {format(new Date(expense.date), 'dd MMM, yyyy')}
                                                </span>
                                            </div>
                                        </td>
                                        {!report?.isGlobal && (
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    <span className="text-sm font-bold text-foreground">
                                                        {expense.property?.name || 'Platform (Official)'}
                                                    </span>
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="px-2 py-1 bg-primary/10 rounded-lg">
                                                    <Tag className="h-3 w-3 text-primary" />
                                                </div>
                                                <span className="text-sm font-bold text-foreground">{expense.category.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                                                <span className="text-sm text-muted-foreground line-clamp-1">{expense.description}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-rose-500">₹{expense.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <ExpenseModal
                isOpen={isExpenseModalOpen}
                onClose={() => setIsExpenseModalOpen(false)}
                expense={selectedExpense}
            />
        </div>
    );
}
