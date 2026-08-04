import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { reportsService } from '../../services/reports';
import { expensesService } from '../../services/expenses';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie,
    Cell, Tooltip, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    Loader2, TrendingUp, Users, Bed, Calendar, ArrowUpRight, HelpCircle, Info, Tag, DollarSign, Filter, Search
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import FinancialDetailsModal from '../../components/Reports/FinancialDetailsModal';
import AssetReport from '../../components/Reports/AssetReport';

const COLORS = ['#08474e', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
    const { selectedProperty } = useProperty();

    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [expenseDateRange, setExpenseDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [rangeType, setRangeType] = useState('month');

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsType, setDetailsType] = useState<'REVENUE' | 'BOOKINGS' | 'PLATFORM_FEES' | 'OCCUPANCY' | 'NET_EARNINGS' | 'GST' | null>(null);

    const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'GST' | 'ASSETS'>('PERFORMANCE');
    const [showSourceInfo, setShowSourceInfo] = useState(false);

    const [isFilterExpanded, setIsFilterExpanded] = useState(false);
    const [filters, setFilters] = useState({
        search: '',
        category: '',
        paymentMethod: '',
        isPaid: 'all',
        minAmount: '',
        maxAmount: ''
    });

    const { data: financialReport, isLoading: loadingFinancial } = useQuery({
        queryKey: ['financialReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getFinancialReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const { data: occupancyReport, isLoading: loadingOccupancy } = useQuery({
        queryKey: ['occupancyReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getOccupancyReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const { data: roomPerformance, isLoading: loadingRooms } = useQuery({
        queryKey: ['roomPerformance', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getRoomPerformanceReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const { data: gstReport, isLoading: loadingGst } = useQuery({
        queryKey: ['gstReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getGstReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
        enabled: !!selectedProperty?.id && activeTab === 'GST',
    });

    const { data: expenses, isLoading: loadingExpenses } = useQuery({
        queryKey: ['expensesReport', expenseDateRange, selectedProperty?.id],
        queryFn: () => expensesService.getAll({
            startDate: expenseDateRange.startDate,
            endDate: expenseDateRange.endDate,
            propertyId: selectedProperty?.id
        }),
        enabled: !!selectedProperty?.id,
    });

    const { data: expenseCategories } = useQuery({
        queryKey: ['expense-categories', selectedProperty?.id],
        queryFn: () => expensesService.getCategories(selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const uniqueCategories = expenseCategories?.map((c: any) => c.name) || [];
    const uniquePaymentMethods = Array.from(new Set(expenses?.map((e: any) => e.paymentMethod))).filter(Boolean) as string[];

    const handleRangeChange = (type: string) => {
        setRangeType(type);
        const now = new Date();
        if (type === 'week') {
            setDateRange({ startDate: format(startOfWeek(now), 'yyyy-MM-dd'), endDate: format(endOfWeek(now), 'yyyy-MM-dd') });
        } else if (type === 'month') {
            setDateRange({ startDate: format(startOfMonth(now), 'yyyy-MM-dd'), endDate: format(endOfMonth(now), 'yyyy-MM-dd') });
        } else if (type === 'last-month') {
            const lastMonth = subMonths(now, 1);
            setDateRange({ startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd') });
        }
    };

    const isLoading = loadingFinancial || loadingOccupancy || loadingRooms || loadingExpenses || (activeTab === 'GST' && loadingGst);



    const filteredExpenses = expenses?.filter((expense: any) => {
        if (filters.search && !expense.description?.toLowerCase().includes(filters.search.toLowerCase())) return false;
        if (filters.category && expense.category?.name !== filters.category) return false;
        if (filters.paymentMethod && expense.paymentMethod !== filters.paymentMethod) return false;
        if (filters.isPaid === 'paid' && !expense.isPaid) return false;
        if (filters.isPaid === 'unpaid' && expense.isPaid) return false;
        if (filters.minAmount && expense.amount < Number(filters.minAmount)) return false;
        if (filters.maxAmount && expense.amount > Number(filters.maxAmount)) return false;
        return true;
    });

    const filteredTotalExpenses = filteredExpenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;

    const totalExpenses = expenses?.reduce((sum: number, exp: any) => sum + Number(exp.amount), 0) || 0;

    const revenueBySource = financialReport?.incomeBySource?.map((item: any) => ({
        name: item.source.replace(/_/g, ' '),
        value: Number(item._sum.amount),
    })) || [];

    const occupancyData = occupancyReport?.dailyStats?.map((day: any) => ({
        date: format(new Date(day.date), 'MMM dd'),
        rate: day.occupancyRate,
        occupied: day.occupied,
    })) || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-200/50 dark:border-gray-700/50 backdrop-blur-sm">
                <div>
                    <div className="flex items-center gap-4 mb-1">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProperty?.name} Reports</h1>
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('PERFORMANCE')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'PERFORMANCE' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Performance
                            </button>
                            <button
                                onClick={() => setActiveTab('GST')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'GST' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                GST Compliance
                            </button>
                            <button
                                onClick={() => setActiveTab('ASSETS')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'ASSETS' ? 'bg-white dark:bg-gray-600 shadow-sm text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Assets
                            </button>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Detailed performance metrics for the selected period
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="flex gap-2 mr-4 pr-4 border-r border-gray-200 dark:border-gray-700">
                        {activeTab === 'PERFORMANCE' && (
                            <>
                                <button
                                    onClick={() => reportsService.exportExcel(dateRange.startDate, dateRange.endDate, selectedProperty?.id)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-sm"
                                >
                                    Excel
                                </button>
                                <button
                                    onClick={() => reportsService.exportPdf(dateRange.startDate, dateRange.endDate, selectedProperty?.id)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all shadow-sm"
                                >
                                    PDF
                                </button>
                            </>
                        )}
                        {activeTab === 'GST' && (
                            <button
                                onClick={() => reportsService.exportGstPdf(dateRange.startDate, dateRange.endDate, selectedProperty?.id)}
                                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm flex items-center gap-2"
                            >
                                Download GST PDF
                            </button>
                        )}
                    </div>
                    {['week', 'month', 'last-month'].map((t) => (
                        <button key={t} onClick={() => handleRangeChange(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${rangeType === t
                                ? 'bg-primary text-primary-foreground shadow-sm scale-105'
                                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'}`}>
                            {t.replace('-', ' ')}
                        </button>
                    ))}
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 px-3 rounded-xl">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <input type="date" className="bg-transparent border-none text-xs font-medium focus:ring-0 p-1 text-gray-900 dark:text-white" value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))} />
                        <span className="text-gray-400">-</span>
                        <input type="date" className="bg-transparent border-none text-xs font-medium focus:ring-0 p-1 text-gray-900 dark:text-white" value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))} />
                    </div>
                </div>
            </div>

            {/* Main KPI/Graphs/Tables Content Wrapper */}
            <div className={`space-y-8 transition-all duration-200 ${isLoading ? 'opacity-55 pointer-events-none select-none' : ''}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <KPICard title="Total Revenue" value={`₹${financialReport?.summary?.totalIncome?.toLocaleString() || '0'}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />} color="text-emerald-500"
                    onClick={() => { setDetailsType('REVENUE'); setDetailsModalOpen(true); }} isClickable
                    infoNote="Revenue is calculated based on the check-in month of the booking, not when the booking was made."
                />
                <KPICard title="Platform Fees" value={`₹${financialReport?.summary?.totalPlatformFees?.toLocaleString() || '0'}`}
                    icon={<Tag className="h-4 w-4 text-orange-500" />} color="text-orange-500" onClick={() => { setDetailsType('PLATFORM_FEES'); setDetailsModalOpen(true); }} isClickable />
                <KPICard title="Total Expenses" value={`₹${totalExpenses.toLocaleString() || '0'}`}
                    icon={<DollarSign className="h-4 w-4 text-red-500" />} color="text-red-500" onClick={() => { document.getElementById('expenses-section')?.scrollIntoView({ behavior: 'smooth' }); }} isClickable />
                <KPICard title="Avg. Occupancy" value={`${occupancyReport?.averageOccupancy || 0}%`}
                    icon={<Bed className="h-4 w-4 text-sky-500" />} color="text-sky-500" onClick={() => { setDetailsType('OCCUPANCY'); setDetailsModalOpen(true); }} isClickable />
                <KPICard title="Total Bookings" value={financialReport?.summary?.bookingsCount || 0}
                    icon={<Users className="h-4 w-4 text-primary" />} color="text-primary" onClick={() => { setDetailsType('BOOKINGS'); setDetailsModalOpen(true); }} isClickable />
                <KPICard title={activeTab === 'GST' ? "GST Collected" : "Net Earnings"}
                    value={`₹${(activeTab === 'GST' ? gstReport?.summary?.totalTax : financialReport?.summary?.netProfit)?.toLocaleString() || '0'}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-amber-500" />} color="text-amber-500" 
                    onClick={() => {
                        if (activeTab === 'GST') {
                            setDetailsType('GST');
                        } else {
                            setDetailsType('NET_EARNINGS');
                        }
                        setDetailsModalOpen(true);
                    }}
                    isClickable={true}
                />
            </div>

            {/* Conditional Views */}
            {activeTab === 'ASSETS' ? (
                <AssetReport />
            ) : activeTab === 'PERFORMANCE' ? (
                <>
                    {/* Charts Row 1 */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Occupancy Trends</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Daily room utilization percentage</p>
                                </div>
                                <div className="flex gap-2">
                                    {/* <button onClick={() => reportsService.exportExcel(dateRange.startDate, dateRange.endDate, selectedProperty?.id, 'occupancy')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors">Excel</button> */}
                                    <button onClick={() => reportsService.exportPdf(dateRange.startDate, dateRange.endDate, selectedProperty?.id, 'occupancy')} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">PDF</button>
                                </div>
                            </div>
                            <div className="h-80">
                                {occupancyData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={occupancyData}>
                                            <defs>
                                                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="hsl(186, 81%, 30%)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="hsl(186, 81%, 30%)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="rate" stroke="hsl(186, 81%, 30%)" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" name="Occupancy %" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-gray-400 italic text-center pt-20">No occupancy data for this period</p>}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booking Sources</h3>
                                    <div className="flex gap-2">
                                        {/* <button onClick={() => reportsService.exportExcel(dateRange.startDate, dateRange.endDate, selectedProperty?.id, 'sources')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors">Excel</button> */}
                                        <button onClick={() => reportsService.exportPdf(dateRange.startDate, dateRange.endDate, selectedProperty?.id, 'sources')} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">PDF</button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSourceInfo(!showSourceInfo)}
                                    className={`p-1.5 rounded-lg transition-all ${showSourceInfo ? 'bg-primary/10 text-primary dark:bg-primary/20' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title="How are these calculated?"
                                >
                                    <HelpCircle className="h-5 w-5" />
                                </button>
                            </div>

                            {showSourceInfo && (
                                <div className="mb-6 p-4 rounded-xl bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-3">
                                        <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[10px] font-bold text-primary dark:text-primary-foreground uppercase tracking-wider mb-1">Room Booking</p>
                                                <p className="text-[11px] text-primary/85 dark:text-primary-foreground/80 leading-relaxed">Direct/Manual bookings created via the property dashboard with payment settled at creation.</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-primary dark:text-primary-foreground uppercase tracking-wider mb-1">Online Booking</p>
                                                <p className="text-[11px] text-primary/85 dark:text-primary-foreground/80 leading-relaxed">Guest-led bookings from the public website via Razorpay or Channel Partner wallet settlements.</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-primary dark:text-primary-foreground uppercase tracking-wider mb-1">Manual Payment</p>
                                                <p className="text-[11px] text-primary/85 dark:text-primary-foreground/80 leading-relaxed">Subsequent balance payments recorded manually (e.g. Cash at check-in) or approved payment requests.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex-1 flex flex-col">
                                <div className="h-64 mb-4">
                                    {revenueBySource.length > 0 ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={revenueBySource} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {revenueBySource.map((_: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : <p className="text-gray-400 italic text-center pt-16">No source data</p>}
                                </div>
                                <div className="space-y-2 mt-auto">
                                    {revenueBySource.map((item: any, i: number) => (
                                        <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                                <span className="text-xs font-bold truncate max-w-[120px] text-gray-900 dark:text-white">{item.name}</span>
                                            </div>
                                            <span className="text-xs font-bold text-gray-900 dark:text-white">₹{item.value.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Row 2 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Room Performance</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Revenue generated per room type</p>
                                </div>
                            </div>
                            <div className="h-64">
                                {roomPerformance?.length ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={roomPerformance}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                            <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                                            <Tooltip />
                                            <Bar dataKey="revenue" fill="hsl(186, 81%, 30%)" radius={[4, 4, 0, 0]} name="Revenue" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : <p className="text-gray-400 italic text-center pt-16">No room data</p>}
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Performance Summary</h3>
                                <div className="flex gap-2">
                                    {/* <button onClick={() => reportsService.exportExcel(dateRange.startDate, dateRange.endDate, selectedProperty?.id, 'room-performance')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded transition-colors">Excel</button> */}
                                    <button onClick={() => reportsService.exportPdf(dateRange.startDate, dateRange.endDate, selectedProperty?.id, 'room-performance')} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">PDF ↓</button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 dark:bg-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">Unit Type</th>
                                            <th className="px-4 py-3">Bookings</th>
                                            <th className="px-4 py-3">Occ. %</th>
                                            <th className="px-4 py-3 rounded-r-lg text-right">Revenue</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {roomPerformance?.map((item: any) => (
                                            <tr key={item.roomTypeId} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                                <td className="px-4 py-4 font-bold text-sm text-gray-900 dark:text-white">{item.name}</td>
                                                <td className="px-4 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{item.bookingsCount}</td>
                                                <td className="px-4 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-600 min-w-[60px]">
                                                            <div className="h-full rounded-full bg-primary" style={{ width: `${item.occupancyRate}%` }} />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-900 dark:text-white">{item.occupancyRate}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-right font-bold text-sm text-gray-900 dark:text-white">₹{item.revenue.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                    {/* Expenses Table Row */}
                    <div id="expenses-section" className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col mt-6">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Expenses Breakdown</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">All registered expenses for the period</p>
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
                                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                                >
                                    <Filter className="h-4 w-4" /> Filters {Object.values(filters).some(v => v !== '' && v !== 'all') && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                                </button>
                                <button onClick={() => reportsService.exportExcel(expenseDateRange.startDate, expenseDateRange.endDate, selectedProperty?.id, 'expenses')} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">Export Excel</button>
                                <button onClick={() => reportsService.exportPdf(expenseDateRange.startDate, expenseDateRange.endDate, selectedProperty?.id, 'expenses')} className="text-xs font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors">Export PDF</button>
                            </div>
                        </div>

                        {isFilterExpanded && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
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
                            </div>
                        )}

                        <div className="flex-1 overflow-auto max-h-96">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 dark:bg-gray-700 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 rounded-l-lg">Date</th>
                                        <th className="px-4 py-3">Category</th>
                                        <th className="px-4 py-3">Description</th>
                                        <th className="px-4 py-3 rounded-r-lg text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {filteredExpenses?.length ? filteredExpenses.map((item: any) => (
                                        <tr key={item.id} className="group hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-4 py-4 font-medium text-sm text-gray-900 dark:text-white whitespace-nowrap">{format(new Date(item.date), 'MMM dd, yyyy')}</td>
                                            <td className="px-4 py-4 text-sm font-bold text-gray-700 dark:text-gray-300">{item.category?.name || 'Uncategorized'}</td>
                                            <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{item.description || '-'}</td>
                                            <td className="px-4 py-4 text-right font-bold text-sm text-red-600">₹{Number(item.amount).toLocaleString()}</td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-12 text-center text-gray-400 italic">No expenses recorded for this period matching the filters.</td>
                                        </tr>
                                    )}
                                </tbody>
                                {(filteredExpenses?.length ?? 0) > 0 && (
                                    <tfoot className="bg-gray-50 dark:bg-gray-700/50 sticky bottom-0 border-t border-gray-200 dark:border-gray-700">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 text-right font-bold text-sm text-gray-900 dark:text-white">Filtered Total Expenses:</td>
                                            <td className="px-4 py-4 text-right font-extrabold text-lg text-red-600">₹{filteredTotalExpenses.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/50 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">GST Compliance Tracking</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">Detailed breakdown of taxable volume and tax collected</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Taxable</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">₹{gstReport?.summary?.totalTaxable?.toLocaleString()}</p>
                            </div>
                            <div className="text-right border-l border-gray-200 dark:border-gray-700 pl-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Total Tax</p>
                                <p className="text-sm font-bold text-emerald-600">₹{gstReport?.summary?.totalTax?.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-100 dark:bg-gray-700/50 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">
                                <tr>
                                    <th className="px-6 py-4">Booking # / Date</th>
                                    <th className="px-6 py-4">Guest Details</th>
                                    <th className="px-6 py-4 text-right">Taxable Amount</th>
                                    <th className="px-6 py-4 text-right">GST Collected</th>
                                    <th className="px-6 py-4 text-right">Gross Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {gstReport?.details?.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-sm text-gray-900 dark:text-white">{item.bookingNumber}</p>
                                            <p className="text-xs text-gray-500">{format(new Date(item.date), 'MMM dd, yyyy')}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-sm text-gray-900 dark:text-white">{item.guestName}</p>
                                            <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">GSTIN: {item.gstNumber}</p>
                                        </td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-300">₹{item.taxableAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600">₹{item.taxAmount.toLocaleString()}</td>
                                        <td className="px-6 py-4 text-right text-sm font-extrabold text-gray-900 dark:text-white">₹{item.totalAmount.toLocaleString()}</td>
                                    </tr>
                                ))}
                                {!gstReport?.details?.length && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <p className="text-gray-400 italic">No tax records found for the selected period.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            </div>

            <FinancialDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                type={detailsType}
                dateRange={dateRange}
                propertyId={selectedProperty?.id}
                financialReport={financialReport}
                occupancyReport={occupancyReport}
                totalExpenses={totalExpenses}
                gstReport={gstReport}
            />
        </div>
    );
}

function KPICard({ title, value, icon, color, onClick, isClickable, infoNote }: any) {
    return (
        <div onClick={onClick} className={`bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all group overflow-hidden relative ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-primary/50 dark:hover:border-primary/50' : 'hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-1.5">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</h3>
                    {infoNote && (
                        <div title={infoNote} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help">
                            <Info className="h-3.5 w-3.5" />
                        </div>
                    )}
                </div>
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">{icon}</div>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {isClickable && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    );
}
