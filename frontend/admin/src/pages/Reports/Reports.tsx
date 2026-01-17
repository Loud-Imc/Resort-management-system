import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '../../services/bookings';
import { bookingSourcesService } from '../../services/bookingSources';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, Calendar } from 'lucide-react';


export default function Reports() {
    const [dateRange, setDateRange] = useState('month'); // 'month', 'week', 'year'

    // Mock data fetching or real implementation
    // Ideally, we'd have a specific reports endpoint. For now, we might calculate from bookings if dataset is small,
    // but better to have backend aggregation.
    // Let's assume we fetch all bookings for now or just mock the aggregation as the backend endpoint might not exist yet.

    // fetching booking sources to map IDs to Names if needed
    const { data: sources } = useQuery({
        queryKey: ['bookingSources'],
        queryFn: bookingSourcesService.getAll,
    });

    const { data: bookings, isLoading } = useQuery({
        queryKey: ['bookings', 'all'], // Fetch all for reporting (not ideal for prod, but okay for MVP)
        queryFn: () => bookingsService.getAll(),
    });

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary-600" /></div>;

    // Calculate details
    const totalRevenue = bookings?.reduce((acc, b) => acc + (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT' ? Number(b.totalAmount) : 0), 0) || 0;
    const totalBookings = bookings?.filter(b => b.status !== 'CANCELLED').length || 0;

    // Revenue by Source Calculation
    const revenueBySource = sources?.map(source => {
        const sourceBookings = bookings?.filter(b => b.bookingSourceId === source.id && b.status !== 'CANCELLED') || [];
        const revenue = sourceBookings.reduce((acc, b) => acc + Number(b.totalAmount), 0);
        return {
            name: source.name,
            value: revenue
        };
    }).filter(d => d.value > 0) || [];

    // Add Direct Bookings (no source or manual)
    const directRevenue = bookings?.filter(b => !b.bookingSourceId && b.status !== 'CANCELLED')
        .reduce((acc, b) => acc + Number(b.totalAmount), 0) || 0;

    if (directRevenue > 0) {
        revenueBySource.push({ name: 'Direct/Manual', value: directRevenue });
    }

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 font-serif">Reports & Analytics</h1>
                <div className="flex gap-2">
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="border-gray-300 rounded-md shadow-sm text-sm"
                    >
                        <option value="week">This Week</option>
                        <option value="month">This Month</option>
                        <option value="year">This Year</option>
                    </select>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Total Revenue</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${totalRevenue.toFixed(2)}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Total Bookings</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalBookings}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-500 text-sm font-medium">Avg. Booking Value</h3>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                        ${totalBookings > 0 ? (totalRevenue / totalBookings).toFixed(2) : '0.00'}
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue by Source Pie Chart */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-semibold mb-6">Revenue by Source</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={revenueBySource}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent }: any) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {revenueBySource.map((_, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number | undefined) => [`$${Number(value || 0).toFixed(2)}`, 'Revenue']} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Placeholder for Occupancy or other metrics */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-400">
                        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>More analytics coming soon...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
