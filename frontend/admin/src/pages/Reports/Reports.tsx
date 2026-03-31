import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { reportsService } from '../../services/reports';
import {
    AreaChart, Area,
    BarChart, Bar,
    PieChart, Pie,
    Cell, Tooltip,
    ResponsiveContainer,
    XAxis, YAxis,
    CartesianGrid
} from 'recharts';
import {
    Loader2,
    TrendingUp,
    Users,
    Bed,
    Building2,
    Calendar,
    ArrowUpRight,
    X,
    ExternalLink,
    PieChart as PieChartIcon,
    BarChart3,
    CreditCard
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfWeek, endOfWeek } from 'date-fns';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Reports() {
    const { user } = useAuth();
    const { selectedProperty } = useProperty();
    const isGlobalAdmin = user?.roles?.some(r => ['SuperAdmin', 'Admin'].includes(r));

    const [dateRange, setDateRange] = useState({
        startDate: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    });

    const [rangeType, setRangeType] = useState('month'); // 'week', 'month', 'custom'
    const [activeDrillDown, setActiveDrillDown] = useState<string | null>(null);

    // Fetch Financial Summary
    const { data: financialReport, isLoading: loadingFinancial } = useQuery({
        queryKey: ['financialReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getFinancialReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
    });

    // Fetch Occupancy Report
    const { data: occupancyReport, isLoading: loadingOccupancy } = useQuery({
        queryKey: ['occupancyReport', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getOccupancyReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
    });

    // Fetch Room Performance
    const { data: roomPerformance, isLoading: loadingRooms } = useQuery({
        queryKey: ['roomPerformance', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getRoomPerformanceReport(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
    });

    // Fetch Partner Performance (Super Admin Only)
    const { data: partnerReport } = useQuery({
        queryKey: ['partnerReport', dateRange],
        queryFn: () => reportsService.getPartnerReport(dateRange.startDate, dateRange.endDate),
        enabled: isGlobalAdmin && !selectedProperty, // Show global partner report if no property selected
    });

    // Fetch Abandoned Bookings
    const { data: abandonedBookings } = useQuery({
        queryKey: ['abandonedBookings', dateRange, selectedProperty?.id],
        queryFn: () => reportsService.getAbandonedBookings(dateRange.startDate, dateRange.endDate, selectedProperty?.id),
    });

    const handleRangeChange = (type: string) => {
        setRangeType(type);
        const now = new Date();
        if (type === 'week') {
            setDateRange({
                startDate: format(startOfWeek(now), 'yyyy-MM-dd'),
                endDate: format(endOfWeek(now), 'yyyy-MM-dd'),
            });
        } else if (type === 'month') {
            setDateRange({
                startDate: format(startOfMonth(now), 'yyyy-MM-dd'),
                endDate: format(endOfMonth(now), 'yyyy-MM-dd'),
            });
        } else if (type === 'last-month') {
            const lastMonth = subMonths(now, 1);
            setDateRange({
                startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'),
                endDate: format(endOfMonth(lastMonth), 'yyyy-MM-dd'),
            });
        }
    };

    const isLoading = loadingFinancial || loadingOccupancy || loadingRooms;

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
            <Loader2 className="animate-spin h-12 w-12 text-primary" />
            <p className="text-muted-foreground font-medium animate-pulse">Generating your reports...</p>
        </div>
    );

    const revenueBySource = financialReport?.incomeBySource.map((item: any) => ({
        name: item.source.replace(/_/g, ' '),
        value: Number(item._sum.amount),
    })) || [];

    const occupancyData = occupancyReport?.dailyStats.map((day: any) => ({
        date: format(new Date(day.date), 'MMM dd'),
        rate: day.occupancyRate,
        occupied: day.occupied,
    })) || [];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/50 p-6 rounded-2xl border border-border/50 backdrop-blur-sm">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h1 className="text-2xl font-black text-foreground">
                            {selectedProperty ? `${selectedProperty.name} Reports` : 'Global Network Analytics'}
                        </h1>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">
                        {isGlobalAdmin && !selectedProperty
                            ? 'Analyzing performance across all 12 properties'
                            : 'Detailed performance metrics for the selected period'}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="flex gap-2 mr-4 pr-4 border-r border-border">
                        <button
                            onClick={() => reportsService.exportExcel(dateRange.startDate, dateRange.endDate, selectedProperty?.id)}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-emerald-600 text-white hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                        >
                            Excel
                        </button>
                        <button
                            onClick={() => reportsService.exportPdf(dateRange.startDate, dateRange.endDate, selectedProperty?.id)}
                            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg shadow-red-600/20"
                        >
                            PDF
                        </button>
                    </div>
                    {['week', 'month', 'last-month'].map((t) => (
                        <button
                            key={t}
                            onClick={() => handleRangeChange(t)}
                            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${rangeType === t
                                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-105'
                                : 'bg-card text-muted-foreground hover:bg-muted border border-border'
                                }`}
                        >
                            {t.replace('-', ' ')}
                        </button>
                    ))}
                    <div className="flex items-center gap-2 bg-card border border-border px-3 rounded-xl">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <input
                            type="date"
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 p-1"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                        />
                        <span className="text-muted-foreground">-</span>
                        <input
                            type="date"
                            className="bg-transparent border-none text-xs font-bold focus:ring-0 p-1"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                        />
                    </div>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <KPICard
                    title="Total Revenue"
                    value={`₹${(financialReport?.summary?.totalIncome || 0).toLocaleString()}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                    trend={financialReport?.summary?.growth?.revenue}
                    color="text-emerald-500"
                    onClick={() => setActiveDrillDown('REVENUE')}
                />
                <KPICard
                    title="Avg. Occupancy"
                    value={`${occupancyReport?.averageOccupancy || 0}%`}
                    icon={<Bed className="h-4 w-4 text-sky-500" />}
                    trend={null}
                    color="text-sky-500"
                    onClick={() => setActiveDrillDown('OCCUPANCY')}
                />
                <KPICard
                    title="Total Bookings"
                    value={financialReport?.summary?.bookingsCount || 0}
                    icon={<Users className="h-4 w-4 text-primary" />}
                    trend={financialReport?.summary?.growth?.bookings}
                    color="text-primary"
                    onClick={() => setActiveDrillDown('BOOKINGS')}
                />
                <KPICard
                    title="Platform Profit"
                    value={`₹${((isGlobalAdmin && !selectedProperty ? financialReport?.platformSummary?.netPlatformProfit : financialReport?.summary?.netProfit) || 0).toLocaleString()}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-amber-500" />}
                    trend={financialReport?.summary?.growth?.profit}
                    color="text-amber-500"
                    onClick={() => setActiveDrillDown('PLATFORM')}
                />
            </div>

            {/* Drill Down Modal */}
            {activeDrillDown && (
                <DrillDownModal
                    type={activeDrillDown}
                    data={{
                        financial: financialReport,
                        occupancy: occupancyReport,
                        roomPerf: roomPerformance,
                        partnerReport: partnerReport
                    }}
                    onClose={() => setActiveDrillDown(null)}
                />
            )}

            {/* Charts Row 1: Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-lg font-bold">Occupancy Trends</h3>
                            <p className="text-xs text-muted-foreground font-medium">Daily room utilization percentage</p>
                        </div>
                    </div>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={occupancyData}>
                                <defs>
                                    <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                                    cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
                                />
                                <Area type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={3} fillOpacity={1} fill="url(#colorRate)" name="Occupancy %" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <h3 className="text-lg font-bold mb-8">Booking Sources</h3>
                    <div className="h-64 mb-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueBySource}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {revenueBySource.map((_: any, index: number) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                        {revenueBySource.map((item: any, i: number) => (
                            <div key={item.name} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                                    <span className="text-xs font-bold truncate max-w-[120px]">{item.name}</span>
                                </div>
                                <span className="text-xs font-black">₹{item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Charts Row 2: Room Performance & Data Table */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-lg font-bold">Room Performance</h3>
                            <p className="text-xs text-muted-foreground font-medium">Revenue generated per building/category</p>
                        </div>
                    </div>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={roomPerformance}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v / 1000}k`} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '12px', border: '1px solid hsl(var(--border))' }}
                                />
                                <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Revenue" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="bg-card p-6 rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold">Performance Summary</h3>
                        <button className="text-primary text-xs font-black uppercase tracking-wider flex items-center gap-1">
                            Export PDF <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 rounded-l-lg">Unit Type</th>
                                    <th className="px-4 py-3">Bookings</th>
                                    <th className="px-4 py-3">Occ. %</th>
                                    <th className="px-4 py-3 rounded-r-lg text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {roomPerformance?.map((item: any) => (
                                    <tr key={item.roomTypeId} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-4 font-bold text-sm">{item.name}</td>
                                        <td className="px-4 py-4 text-sm font-medium">{item.bookingsCount}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 rounded-full bg-muted min-w-[60px]">
                                                    <div className="h-full rounded-full bg-primary" style={{ width: `${item.occupancyRate}%` }} />
                                                </div>
                                                <span className="text-xs font-black">{item.occupancyRate}%</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right font-black text-sm">₹{item.revenue.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Platform Partner Insights (Super Admin Only) */}
            {isGlobalAdmin && !selectedProperty && partnerReport && (
                <div className="bg-card p-6 rounded-2xl border-2 border-primary/20 shadow-xl shadow-primary/5">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-2 rounded-lg bg-primary/10">
                            <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black italic uppercase">Partner Network ROI</h3>
                            <p className="text-xs text-muted-foreground font-medium">Revenue flowing through channel partners</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {partnerReport.map((p: any) => (
                            <div key={p.id} className="p-4 rounded-xl border border-border bg-gradient-to-br from-card to-muted/30 flex justify-between items-center group hover:scale-[1.02] transition-all cursor-default">
                                <div>
                                    <h4 className="font-black text-sm uppercase tracking-tight truncate max-w-[150px]">{p.businessName}</h4>
                                    <p className="text-[10px] text-muted-foreground font-medium">{p.totalBookings} Completed Bookings</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-black text-primary">₹{p.totalCommission.toLocaleString()}</p>
                                    <p className="text-[10px] text-muted-foreground font-black uppercase tracking-tighter">Comm. Earned</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Platform Net Breakdown (Super Admin Only) */}
            {isGlobalAdmin && !selectedProperty && financialReport?.platformSummary && (
                <PlatformSummaryCard summary={financialReport.platformSummary} />
            )}

            {/* Abandoned Bookings Section (Pending Payment) */}
            <div className="bg-card p-6 rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-lg font-bold">Abandoned Bookings</h3>
                        <p className="text-xs text-muted-foreground font-medium">Sessions that reached payment but were not completed (Pending Payment)</p>
                    </div>
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left">
                        <thead className="bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground sticky top-0">
                            <tr>
                                <th className="px-4 py-3 rounded-l-lg">Guest</th>
                                <th className="px-4 py-3">Property / Unit</th>
                                <th className="px-4 py-3">Dates</th>
                                <th className="px-4 py-3">Amount</th>
                                <th className="px-4 py-3 rounded-r-lg">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {abandonedBookings?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground font-medium italic">No abandoned bookings found for this period.</td>
                                </tr>
                            ) : (
                                abandonedBookings?.map((item: any) => (
                                    <tr key={item.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-4">
                                            <div className="font-bold text-sm">{item.guestName}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium">{item.guestEmail}</div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="text-sm font-medium">{item.propertyName}</div>
                                            <div className="text-[10px] text-muted-foreground">{item.roomType}</div>
                                        </td>
                                        <td className="px-4 py-4 text-xs font-medium">
                                            {format(new Date(item.checkIn), 'MMM dd')} - {format(new Date(item.checkOut), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-4 py-4 font-black text-sm">₹{item.amount.toLocaleString()}</td>
                                        <td className="px-4 py-4 text-xs text-muted-foreground font-medium">
                                            {format(new Date(item.createdAt), 'MMM dd, HH:mm')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function PlatformSummaryCard({ summary }: { summary: any }) {
    return (
        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm overflow-hidden relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">Platform Profit Analysis</h3>
                    <p className="text-sm text-muted-foreground font-medium">Detailed breakdown of gross revenue vs operational costs</p>
                </div>
                <div className="bg-primary/10 px-4 py-2 rounded-xl">
                    <span className="text-primary font-black">Net Profit: ₹{summary.netPlatformProfit.toLocaleString()}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Gross Booking Fees</p>
                    <p className="text-lg font-black text-foreground">₹{summary.grossPlatformFees.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">CP Registration Fees</p>
                    <p className="text-lg font-black text-emerald-500">₹{(summary.cpRegistrationFees || 0).toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">CP Commissions (Paid)</p>
                    <p className="text-lg font-black text-rose-500">-₹{summary.totalCPCommission.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/30 border border-border">
                    <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Est. Gateway & Ops</p>
                    <p className="text-lg font-black text-rose-500">-₹{(summary.estimatedGatewayFees + summary.operationalCost).toLocaleString()}</p>
                </div>
            </div>
        </div>
    );
}

function KPICard({ title, value, icon, trend, color, description, onClick }: any) {
    const isPositive = trend > 0;
    const isNegative = trend < 0;

    return (
        <button
            onClick={onClick}
            className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:shadow-md hover:border-primary/50 transition-all group overflow-hidden relative flex flex-col justify-between text-left w-full"
        >
            <div>
                <div className="flex justify-between items-start mb-3">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
                    <div className={`p-2 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors`}>
                        {icon}
                    </div>
                </div>
                <div className="flex items-baseline gap-2">
                    <p className={`text-xl font-black ${color}`}>{value}</p>
                </div>
                {description && <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{description}</p>}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
                {trend !== null && trend !== undefined ? (
                    <div className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${isPositive ? 'bg-emerald-500/10 text-emerald-600' :
                        isNegative ? 'bg-rose-500/10 text-rose-600' :
                            'bg-muted text-muted-foreground'
                        }`}>
                        {isPositive ? '↑' : isNegative ? '↓' : '•'} {Math.abs(trend)}%
                    </div>
                ) : (
                    <span className="text-[10px] font-bold text-muted-foreground opacity-50 italic">Snapshot</span>
                )}
                <span className="text-[8px] font-black text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter flex items-center gap-1">
                    Details <ExternalLink className="h-2 w-2" />
                </span>
            </div>

            <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                {icon}
            </div>
        </button>
    );
}

function DrillDownModal({ type, data, onClose }: { type: string, data: any, onClose: () => void }) {
    const { financial, occupancy, roomPerf, partnerReport } = data;

    const renderContent = () => {
        switch (type) {
            case 'REVENUE':
                const sources = financial?.incomeBySource || [];
                const totalFromSources = sources.reduce((sum: number, s: any) => sum + Number(s._sum.amount), 0);

                return (
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-emerald-500/10">
                                <PieChartIcon className="h-4 w-4 text-emerald-600" />
                            </div>
                            <h4 className="text-sm font-black uppercase tracking-tight">Income Breakdown</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Income Sources</h4>
                                <div className="space-y-3">
                                    {sources.map((item: any) => (
                                        <div key={item.source} className="flex justify-between items-center">
                                            <span className="text-sm font-bold truncate max-w-[150px] capitalize">{item.source.replace(/_/g, ' ')}</span>
                                            <span className="text-sm font-black text-emerald-600">₹{Number(item._sum.amount).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="pt-2 border-t border-border flex justify-between items-center">
                                        <span className="text-xs font-black text-muted-foreground uppercase">Period Gross</span>
                                        <span className="text-sm font-black text-foreground">₹{totalFromSources.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-muted/30 p-4 rounded-xl border border-border">
                                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Property Breakdown</h4>
                                <div className="space-y-3 max-h-[150px] overflow-auto pr-2">
                                    {roomPerf?.reduce((acc: any[], curr: any) => {
                                        const existing = acc.find(a => a.property === curr.propertyName);
                                        if (existing) existing.revenue += curr.revenue;
                                        else acc.push({ property: curr.propertyName, revenue: curr.revenue });
                                        return acc;
                                    }, []).map((p: any) => (
                                        <div key={p.property} className="flex justify-between items-center">
                                            <span className="text-sm font-bold truncate max-w-[120px]">{p.property}</span>
                                            <span className="text-sm font-black">₹{p.revenue.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                            <p className="text-xs text-emerald-700 font-medium">Total Gross Revenue includes all confirmed bookings, event incomes, and ancillary services recorded in the selected period.</p>
                        </div>
                    </div>
                );
            case 'BOOKINGS':
                return (
                    <div className="space-y-6">
                        <div className="space-y-6">
                            <div className="bg-primary/5 p-6 rounded-[2rem] border border-primary/10 flex justify-between items-center bg-gradient-to-br from-primary/10 to-transparent">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-primary tracking-widest mb-1">Total Bookings Created</h4>
                                    <div className="text-4xl font-black text-primary leading-none">{financial?.summary?.bookingsCount || 0}</div>
                                </div>
                                <div className="text-right opacity-60">
                                    <div className="text-[10px] font-black uppercase tracking-tighter italic border-b border-primary/20 pb-1 mb-1">Total Network Volume</div>
                                    <div className="text-[9px] font-medium leading-tight max-w-[150px]">Includes all confirmed and pending bookings across all platforms.</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest">Public Website</span>
                                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                    </div>
                                    <div className="text-2xl font-black text-emerald-900">{financial?.summary?.bookingsBySource?.online || 0}</div>
                                    <p className="text-[9px] text-emerald-600/70 italic mt-1">* Direct guest bookings</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase text-orange-600 tracking-widest">CP Network</span>
                                    </div>
                                    <div className="text-2xl font-black text-orange-900">{financial?.summary?.bookingsBySource?.partner || 0}</div>
                                    <p className="text-[9px] text-orange-600/70 italic mt-1">* Affiliate-driven bookings</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Property Dashboard</span>
                                    </div>
                                    <div className="text-2xl font-black text-blue-900">{financial?.summary?.bookingsBySource?.property || 0}</div>
                                    <p className="text-[9px] text-blue-600/70 italic mt-1">* In-house/Manual entries</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-amber-500/10">
                                        <CreditCard className="h-4 w-4 text-amber-600" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-amber-900">Partial Payment Bookings</span>
                                        <p className="text-[9px] text-amber-600/70">Bookings with balance amount pending</p>
                                    </div>
                                </div>
                                <div className="text-2xl font-black text-amber-900">{financial?.summary?.bookingsBySource?.partial || 0}</div>
                            </div>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Partner Performance</h4>
                            <div className="space-y-2 max-h-[200px] overflow-auto">
                                {partnerReport?.map((p: any) => (
                                    <div key={p.id} className="flex justify-between p-2 rounded-lg bg-muted/30">
                                        <span className="text-xs font-bold">{p.partnerName || 'Unnamed Partner'}</span>
                                        <span className="text-xs font-black">{p.totalBookings || 0} Bookings</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            case 'OCCUPANCY':
                return (
                    <div className="space-y-6">
                        <div className="bg-muted/30 p-4 rounded-xl border border-border">
                            <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground mb-4">Property-wise Occupancy</h4>
                            <div className="space-y-4 max-h-[300px] overflow-auto pr-2">
                                {roomPerf?.reduce((acc: any[], curr: any) => {
                                    const existing = acc.find(a => a.property === curr.propertyName);
                                    if (existing) {
                                        existing.totalRows++;
                                        existing.totalOcc += curr.occupancyRate;
                                    } else acc.push({ property: curr.propertyName, totalOcc: curr.occupancyRate, totalRows: 1 });
                                    return acc;
                                }, []).map((p: any) => {
                                    const avgOccValue = p.totalOcc / p.totalRows;
                                    const displayOcc = avgOccValue < 1 && avgOccValue > 0 ? avgOccValue.toFixed(1) : Math.round(avgOccValue);
                                    return (
                                        <div key={p.property} className="space-y-1.5">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span>{p.property}</span>
                                                <span>{displayOcc}%</span>
                                            </div>
                                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                <div className="h-full bg-sky-500" style={{ width: `${avgOccValue}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 'ADR':
                return (
                    <div className="space-y-6">
                        <div className="bg-indigo-500/5 p-6 rounded-2xl border border-indigo-500/20 text-center">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-2">Average Daily Rate (Calculation)</h4>
                            <p className="text-3xl font-black text-indigo-700">₹{Math.round(financial?.summary?.adr || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-4 font-medium italic">Total Room Revenue ÷ Number of Rooms Occupied</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                <h5 className="text-[10px] font-black uppercase mb-3">Gross Revenue</h5>
                                <p className="text-lg font-black text-foreground">₹{Number(financial?.summary?.totalIncome || 0).toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-muted/30 rounded-xl border border-border">
                                <h5 className="text-[10px] font-black uppercase mb-3">Occupied Nights</h5>
                                <p className="text-lg font-black text-foreground">
                                    {financial?.summary?.adr > 0 ? Math.round(financial?.summary?.totalIncome / financial?.summary?.adr) : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                );
            case 'REVPAR':
                return (
                    <div className="space-y-6">
                        <div className="bg-purple-500/5 p-6 rounded-2xl border border-purple-500/20 text-center">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-600 mb-2">Revenue Per Available Room</h4>
                            <p className="text-3xl font-black text-purple-700">₹{Math.round(financial?.summary?.revPar || 0).toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-4 font-medium italic">Occupancy Percentage × Average Daily Rate (ADR)</p>
                        </div>
                        <div className="bg-card border border-border rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-muted-foreground">Occupancy Rate</span>
                                <span className="text-sm font-black">{occupancy?.averageOccupancy || 0}%</span>
                            </div>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-muted-foreground">Average Daily Rate</span>
                                <span className="text-sm font-black">₹{Math.round(financial?.summary?.adr || 0).toLocaleString()}</span>
                            </div>
                            <div className="pt-4 border-t border-dashed border-border flex items-center justify-between">
                                <span className="font-black text-purple-600">Calculated RevPAR</span>
                                <span className="font-black text-purple-600 italic">= ₹{Math.round(financial?.summary?.revPar).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                );
            case 'PLATFORM':
                const ps = financial?.platformSummary;
                if (!ps) return <div className="p-12 text-center text-muted-foreground italic">Platform summary only available in Global context.</div>;
                return (
                    <div className="space-y-6">
                        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-200/50">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h4 className="text-[10px] font-black uppercase text-amber-600 tracking-widest mb-1">Net Platform Profit</h4>
                                    <div className="text-4xl font-black text-amber-900 leading-none">₹{ps.netPlatformProfit.toLocaleString()}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-bold text-amber-600 bg-amber-100/50 px-3 py-1.5 rounded-md inline-block mb-1">
                                        FORMULA: (A + B) - (C + D + E)
                                    </div>
                                    <div className="text-xs text-amber-800/60 font-medium max-w-[250px] leading-tight">
                                        Net earnings after subtracting all commissions, gateway fees, and operational costs.
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-amber-200/30 pt-4">
                                <div className="space-y-2">
                                    <h5 className="text-xs font-black uppercase text-emerald-600 opacity-60 px-1">A. Platform Fees (Bookings)</h5>
                                    <div className="p-3 rounded-lg bg-emerald-50 text-xl font-black text-emerald-900">₹{ps.grossPlatformFees.toLocaleString()}</div>
                                    <p className="text-[10px] text-emerald-600/70 px-1 italic">* Cut taken from every property booking</p>
                                </div>
                                <div className="space-y-2 text-right">
                                    <h5 className="text-xs font-black uppercase text-emerald-600 opacity-60 px-1">B. CP Registration Fees</h5>
                                    <div className="p-3 rounded-lg bg-emerald-50 text-xl font-black text-emerald-900">₹{ps.cpRegistrationFees.toLocaleString()}</div>
                                    <p className="text-[10px] text-emerald-600/70 px-1 italic">* Paid by partners to join platform</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-xs font-black uppercase text-muted-foreground tracking-widest mb-2 px-1">C, D, E. Deductions & Costs</div>
                            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10 flex justify-between items-center">
                                <span className="text-sm font-bold text-rose-700">C. Partner Commissions Paid</span>
                                <span className="text-base font-black text-rose-700">- ₹{ps.totalCPCommission.toLocaleString()}</span>
                            </div>
                            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10 flex justify-between items-center">
                                <span className="text-sm font-bold text-rose-700">D. Est. Payment Gateway Fees (2.5%)</span>
                                <span className="text-base font-black text-rose-700">- ₹{ps.estimatedGatewayFees.toLocaleString()}</span>
                            </div>
                            <div className="p-4 rounded-lg bg-rose-500/5 border border-rose-500/10 flex justify-between items-center">
                                <span className="text-sm font-bold text-rose-700">E. Platform Operational Costs</span>
                                <span className="text-base font-black text-rose-700">- ₹{ps.operationalCost.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* New Detailed Table Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6 pt-6 border-t border-border">
                            <div className="space-y-4">
                                <h5 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                    <Users className="h-4 w-4" /> CP Registrations ({ps.cpRegistrationDetails?.length || 0})
                                </h5>
                                <div className="max-h-[400px] overflow-auto border border-border rounded-2xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                                            <tr>
                                                <th className="p-4 font-black uppercase tracking-tighter text-xs">Partner</th>
                                                <th className="p-4 font-black uppercase tracking-tighter text-xs text-right">Fee</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {ps.cpRegistrationDetails?.map((reg: any, i: number) => (
                                                <tr key={i} className="hover:bg-muted/30">
                                                    <td className="p-4 font-bold truncate max-w-[200px]">{reg.partnerName}</td>
                                                    <td className="p-4 text-right font-black text-base">₹{reg.amount.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {(!ps.cpRegistrationDetails || ps.cpRegistrationDetails.length === 0) && (
                                                <tr><td colSpan={2} className="p-8 text-center italic text-muted-foreground">No registrations in this period</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <h5 className="text-xs font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                                    <Building2 className="h-4 w-4" /> Platform Fees by Property
                                </h5>
                                <div className="max-h-[400px] overflow-auto border border-border rounded-2xl">
                                    <table className="w-full text-left text-sm">
                                        <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm">
                                            <tr>
                                                <th className="p-4 font-black uppercase tracking-tighter text-xs">Property</th>
                                                <th className="p-4 font-black uppercase tracking-tighter text-xs text-right">Contributed</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {ps.platformFeeBreakdown?.map((item: any, i: number) => (
                                                <tr key={i} className="hover:bg-muted/30">
                                                    <td className="p-4 font-bold">
                                                        <div className="truncate max-w-[200px]">{item.organizationName}</div>
                                                        <div className="text-xs text-muted-foreground opacity-60 italic">{item.count} bookings</div>
                                                    </td>
                                                    <td className="p-4 text-right font-black text-base">₹{item.fee.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {(!ps.platformFeeBreakdown || ps.platformFeeBreakdown.length === 0) && (
                                                <tr><td colSpan={2} className="p-8 text-center italic text-muted-foreground">No fees generated in this period</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-card w-full max-w-[95vw] h-[90vh] rounded-[2.5rem] border border-border shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-border flex justify-between items-center bg-muted/30">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-primary/10">
                            <BarChart3 className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight italic">
                                {type.replace('_', ' ')} <span className="text-primary NOT italic">Analytics</span>
                            </h2>
                            <p className="text-xs text-muted-foreground font-black uppercase tracking-widest">In-depth performance audit & transparency</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-muted rounded-2xl transition-colors group bg-background border border-border shadow-sm"
                    >
                        <X className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-10 custom-scrollbar">
                    {renderContent()}
                </div>

                <div className="p-8 border-t border-border bg-muted/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-foreground text-background font-black rounded-xl hover:opacity-90 transition-opacity uppercase text-xs tracking-widest"
                    >
                        Close Analysis
                    </button>
                </div>
            </div>
        </div>
    );
}
