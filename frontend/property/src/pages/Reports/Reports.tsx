import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { reportsService } from '../../services/reports';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie,
    Cell, Tooltip, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
    Loader2, TrendingUp, Users, Bed, Calendar, ArrowUpRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
    const { selectedProperty } = useProperty();

    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [rangeType, setRangeType] = useState('month');

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

    const isLoading = loadingFinancial || loadingOccupancy || loadingRooms;

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
            <Loader2 className="animate-spin h-12 w-12 text-blue-600" />
            <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Generating your reports...</p>
        </div>
    );

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
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProperty?.name} Reports</h1>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Detailed performance metrics for the selected period
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['week', 'month', 'last-month'].map((t) => (
                        <button key={t} onClick={() => handleRangeChange(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${rangeType === t
                                ? 'bg-blue-600 text-white shadow-sm scale-105'
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

            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Revenue" value={`₹${financialReport?.totalRevenue?.toLocaleString() || '0'}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />} color="text-emerald-500" />
                <KPICard title="Avg. Occupancy" value={`${occupancyReport?.averageOccupancy || 0}%`}
                    icon={<Bed className="h-4 w-4 text-sky-500" />} color="text-sky-500" />
                <KPICard title="Total Bookings" value={financialReport?.bookingsCount || 0}
                    icon={<Users className="h-4 w-4 text-blue-600" />} color="text-blue-600" />
                <KPICard title="Net Earnings" value={`₹${financialReport?.netAmount?.toLocaleString() || '0'}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-amber-500" />} color="text-amber-500" />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Occupancy Trends</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Daily room utilization percentage</p>
                        </div>
                    </div>
                    <div className="h-80">
                        {occupancyData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={occupancyData}>
                                    <defs>
                                        <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" name="Occupancy %" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-20">No occupancy data for this period</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-8">Booking Sources</h3>
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
                    <div className="space-y-2">
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
                                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Revenue" />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : <p className="text-gray-400 italic text-center pt-16">No room data</p>}
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Performance Summary</h3>
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
                                                    <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.occupancyRate}%` }} />
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
        </div>
    );
}

function KPICard({ title, value, icon, color }: any) {
    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</h3>
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">{icon}</div>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
    );
}
