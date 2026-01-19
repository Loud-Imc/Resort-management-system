import { useQuery } from '@tanstack/react-query';
import { reportsService, DashboardStats } from '../services/reports';
import { Loader2, DollarSign, Users, CalendarCheck, BedDouble } from 'lucide-react';

export default function DashboardHome() {
    const { data: stats, isLoading, error } = useQuery<DashboardStats>({
        queryKey: ['dashboardStats'],
        queryFn: reportsService.getDashboardStats,
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
                Error loading dashboard statistics. Please try again.
            </div>
        );
    }

    const statCards = [
        {
            label: 'Total Revenue',
            value: `$${stats?.revenue?.toLocaleString() ?? '0'}`,
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-100',
        },
        {
            label: 'Bookings Created',
            value: stats?.bookingsCreated ?? 0,
            icon: CalendarCheck,
            color: 'text-blue-600',
            bg: 'bg-blue-100',
        },
        {
            label: "Today's Check-ins",
            value: stats?.checkIns ?? 0,
            icon: Users,
            color: 'text-purple-600',
            bg: 'bg-purple-100',
        },
        {
            label: 'Occupancy Rate',
            value: `${stats?.occupancy?.percentage ?? 0}%`,
            icon: BedDouble,
            color: 'text-orange-600',
            bg: 'bg-orange-100',
            subtext: `${stats?.occupancy?.occupied ?? 0} / ${stats?.occupancy?.total ?? 0} rooms`,
        },
    ];

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                <p className="text-sm text-gray-500">
                    {new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                    })}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex items-start justify-between"
                    >
                        <div>
                            <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
                            {stat.subtext && (
                                <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>
                            )}
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg}`}>
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
