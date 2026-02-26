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
    ArrowUpRight
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <KPICard
                    title="Total Revenue"
                    value={`₹${(financialReport?.summary?.totalIncome || 0).toLocaleString()}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-emerald-500" />}
                    trend="+12.5% vs last period"
                    color="text-emerald-500"
                />
                <KPICard
                    title="Avg. Occupancy"
                    value={`${occupancyReport?.averageOccupancy || 0}%`}
                    icon={<Bed className="h-4 w-4 text-sky-500" />}
                    trend="Stable performance"
                    color="text-sky-500"
                />
                <KPICard
                    title="Total Bookings"
                    value={financialReport?.summary?.bookingsCount || 0}
                    icon={<Users className="h-4 w-4 text-primary" />}
                    trend="From 4 booking sources"
                    color="text-primary"
                />
                <KPICard
                    title="Platform Net"
                    value={`₹${(financialReport?.summary?.netProfit || 0).toLocaleString()}`}
                    icon={<ArrowUpRight className="h-4 w-4 text-amber-500" />}
                    trend="After operational costs"
                    color="text-amber-500"
                />
            </div>

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

function KPICard({ title, value, icon, trend, color }: any) {
    return (
        <div className="bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{title}</h3>
                <div className={`p-2 rounded-xl bg-muted/50 group-hover:bg-primary/10 transition-colors`}>
                    {icon}
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <p className={`text-2xl font-black ${color}`}>{value}</p>
            </div>
            <p className="text-[10px] font-bold text-muted-foreground flex items-center gap-1 mt-2">
                {trend}
            </p>
            <div className="absolute -bottom-2 -right-2 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                {icon}
            </div>
        </div>
    );
}
