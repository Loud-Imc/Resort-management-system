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
    Loader2, TrendingUp, Users, Bed, Calendar, ArrowUpRight, HelpCircle, Info
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import FinancialDetailsModal from '../../components/Reports/FinancialDetailsModal';

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
    const { selectedProperty } = useProperty();

    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });
    const [rangeType, setRangeType] = useState('month');

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsType, setDetailsType] = useState<'REVENUE' | 'BOOKINGS' | null>(null);

    const [activeTab, setActiveTab] = useState<'PERFORMANCE' | 'GST'>('PERFORMANCE');
    const [showSourceInfo, setShowSourceInfo] = useState(false);

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

    const isLoading = loadingFinancial || loadingOccupancy || loadingRooms || (activeTab === 'GST' && loadingGst);

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
                    <div className="flex items-center gap-4 mb-1">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedProperty?.name} Reports</h1>
                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                            <button
                                onClick={() => setActiveTab('PERFORMANCE')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'PERFORMANCE' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Performance
                            </button>
                            <button
                                onClick={() => setActiveTab('GST')}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeTab === 'GST' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                GST Compliance
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard title="Total Revenue" value={`₹${financialReport?.summary?.totalIncome?.toLocaleString() || '0'}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />} color="text-emerald-500" onClick={() => { setDetailsType('REVENUE'); setDetailsModalOpen(true); }} isClickable />
                <KPICard title="Avg. Occupancy" value={`${occupancyReport?.averageOccupancy || 0}%`}
                    icon={<Bed className="h-4 w-4 text-sky-500" />} color="text-sky-500" />
                <KPICard title="Total Bookings" value={financialReport?.summary?.bookingsCount || 0}
                    icon={<Users className="h-4 w-4 text-blue-600" />} color="text-blue-600" onClick={() => { setDetailsType('BOOKINGS'); setDetailsModalOpen(true); }} isClickable />
                <KPICard title={activeTab === 'GST' ? "GST Collected" : "Net Earnings"}
                    value={`₹${(activeTab === 'GST' ? gstReport?.summary?.totalTax : financialReport?.summary?.netProfit)?.toLocaleString() || '0'}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-amber-500" />} color="text-amber-500" />
            </div>

            {/* Conditional Views */}
            {activeTab === 'PERFORMANCE' ? (
                <>
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

                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Booking Sources</h3>
                                <button
                                    onClick={() => setShowSourceInfo(!showSourceInfo)}
                                    className={`p-1.5 rounded-lg transition-all ${showSourceInfo ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                    title="How are these calculated?"
                                >
                                    <HelpCircle className="h-5 w-5" />
                                </button>
                            </div>

                            {showSourceInfo && (
                                <div className="mb-6 p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="flex gap-3">
                                        <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Room Booking</p>
                                                <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 leading-relaxed">Direct/Manual bookings created via the property dashboard with payment settled at creation.</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Online Booking</p>
                                                <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 leading-relaxed">Guest-led bookings from the public website via Razorpay or Channel Partner wallet settlements.</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider mb-1">Manual Payment</p>
                                                <p className="text-[11px] text-blue-700/80 dark:text-blue-400/80 leading-relaxed">Subsequent balance payments recorded manually (e.g. Cash at check-in) or approved payment requests.</p>
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
                                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">GSTIN: {item.gstNumber}</p>
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

            <FinancialDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                type={detailsType}
                dateRange={dateRange}
                propertyId={selectedProperty?.id}
            />
        </div>
    );
}

function KPICard({ title, value, icon, color, onClick, isClickable }: any) {
    return (
        <div onClick={onClick} className={`bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm transition-all group overflow-hidden relative ${isClickable ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700' : 'hover:shadow-md'}`}>
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400">{title}</h3>
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">{icon}</div>
            </div>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            {isClickable && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            )}
        </div>
    );
}
