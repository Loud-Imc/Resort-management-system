import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../services/reports';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import {
    Loader2,
    DollarSign,
    TrendingUp,
    TrendingDown,
    PieChart as PieChartIcon,
    Calendar
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

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6'];

export default function Financials() {
    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });

    const { data: report, isLoading, error } = useQuery({
        queryKey: ['financialReport', dateRange],
        queryFn: () => reportsService.getFinancialReport(dateRange.startDate, dateRange.endDate),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
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

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Financial Reports</h1>
                    <p className="text-sm text-gray-500 mt-1">Income, expenses, and profit analysis</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-gray-200">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        className="text-sm border-none focus:ring-0 p-0 text-gray-700"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        className="text-sm border-none focus:ring-0 p-0 text-gray-700"
                    />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Income</p>
                            <p className="text-2xl font-bold text-green-600 mt-2">
                                ${report?.summary.totalIncome.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-600 mt-2">
                                ${report?.summary.totalExpenses.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-red-100 rounded-lg">
                            <TrendingDown className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Net Profit</p>
                            <p className={`text-2xl font-bold mt-2 ${report?.summary.netProfit >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                                ${report?.summary.netProfit.toLocaleString()}
                            </p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-lg">
                            <DollarSign className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500 font-medium">Profit Margin</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">
                                {typeof report?.summary.profitMargin === 'number' ? report.summary.profitMargin.toFixed(1) : '0'}%
                            </p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-lg">
                            <PieChartIcon className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Charts using Recharts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Income by Source</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={incomeData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: { name: string; percent?: number }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {incomeData.map((_entry: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Expenses Breakdown */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-6">Expenses by Category</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={expenseData}
                                layout="vertical"
                                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tickFormatter={(value: number) => `$${value}`} />
                                <YAxis dataKey="name" type="category" width={100} />
                                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Amount']} />
                                <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
}
