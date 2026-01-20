import { useQuery } from '@tanstack/react-query';
import { reportsService, DashboardStats } from '../services/reports';
import { roomsService } from '../services/rooms';
import { Loader2, DollarSign, Users, BedDouble, Plus, Info, LayoutGrid, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DashboardHome() {
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
        queryKey: ['dashboardStats'],
        queryFn: reportsService.getDashboardStats,
    });

    const { data: rooms, isLoading: roomsLoading } = useQuery({
        queryKey: ['rooms'],
        queryFn: () => roomsService.getAll(),
    });

    if (statsLoading || roomsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (statsError) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                Error loading dashboard statistics. Please try again.
            </div>
        );
    }

    const statCards = [
        {
            label: 'Today Revenue',
            value: `₹${stats?.revenue?.toLocaleString() ?? '0'}`,
            icon: DollarSign,
            color: 'text-green-600',
            bg: 'bg-green-100',
        },
        {
            label: 'Available Rooms',
            value: stats?.roomStatusSummary?.AVAILABLE ?? 0,
            icon: LayoutGrid,
            color: 'text-emerald-600',
            bg: 'bg-emerald-100',
            subtext: 'Ready for check-in'
        },
        {
            label: 'Reserved Rooms',
            value: stats?.roomStatusSummary?.RESERVED ?? 0,
            icon: Clock,
            color: 'text-amber-600',
            bg: 'bg-amber-100',
            subtext: 'Check-in expected'
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

    const getStatusColor = (status: string, isReserved: boolean = false) => {
        if (isReserved && status === 'AVAILABLE') {
            return 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100';
        }
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100';
            case 'OCCUPIED': return 'bg-blue-50 border-blue-200 text-blue-700';
            case 'MAINTENANCE': return 'bg-red-50 border-red-200 text-red-700';
            case 'BLOCKED': return 'bg-gray-100 border-gray-300 text-gray-700';
            default: return 'bg-gray-50 border-gray-200 text-gray-700';
        }
    };

    return (
        <div className="space-y-8">
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                        })}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate('/bookings/create')}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus size={18} />
                        New Walk-in Booking
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {statCards.map((stat, index) => (
                    <div
                        key={index}
                        className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between transition-all hover:shadow-md"
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

            {/* Live Room Status Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Live Room Status</h2>
                        <p className="text-sm text-gray-500">Real-time room occupancy and maintenance status</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-emerald-500"></span> Available</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-amber-500"></span> Reserved</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Occupied</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-red-500"></span> Maintenance</div>
                        <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-gray-400"></span> Blocked</div>
                    </div>
                </div>
                <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                        {rooms?.map((room: any) => {
                            const isReserved = room.status === 'AVAILABLE' && room.bookings && room.bookings.length > 0;
                            return (
                                <div
                                    key={room.id}
                                    onClick={() => {
                                        if (isReserved) {
                                            navigate(`/bookings/${room.bookings[0].id}`);
                                        } else if (room.status === 'AVAILABLE') {
                                            navigate(`/bookings/create?roomId=${room.id}&roomTypeId=${room.roomTypeId}`);
                                        } else {
                                            navigate(`/rooms/${room.id}`);
                                        }
                                    }}
                                    className={`
                                        cursor-pointer p-4 rounded-lg border-2 transition-all 
                                        flex flex-col items-center justify-center gap-1 relative group
                                        ${getStatusColor(room.status, !!isReserved)}
                                    `}
                                >
                                    <span className="text-lg font-bold">#{room.roomNumber}</span>
                                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-80">
                                        {room.roomType?.name}
                                    </span>

                                    {room.status === 'AVAILABLE' && !isReserved && (
                                        <div className="absolute inset-0 bg-emerald-600 text-white rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all pointer-events-none">
                                            <Plus size={20} />
                                        </div>
                                    )}

                                    {isReserved && (
                                        <div className="absolute inset-0 bg-amber-600 text-white rounded-md opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all pointer-events-none">
                                            <Info size={20} />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-500">
                    <Info size={14} />
                    <span>Click on an <strong>Available</strong> room to start a new walk-in booking for that unit.</span>
                </div>
            </div>

            {/* Room Summary by Category */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-gray-900 font-bold mb-4">Manual Booking Tip</h3>
                    <div className="space-y-3 text-sm text-gray-600">
                        <p>1. Check the <strong>Live Room Status</strong> grid above.</p>
                        <p>2. Identify green colored rooms (Available).</p>
                        <p>3. Hover over the room and click the <strong>+</strong> icon to instantly start the registration process.</p>
                        <p>4. The system will pre-fill the room details to speed up the checkout.</p>
                    </div>
                </div>
                <div className="bg-primary-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-2">Need Help?</h3>
                        <p className="text-primary-100 text-sm mb-4">If you are facing issues with room status sync, try refreshing the dashboard stats.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-white text-primary-900 px-4 py-2 rounded-lg text-sm font-bold hover:bg-primary-50 transition-colors"
                        >
                            Refresh Live Data
                        </button>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-primary-800 rounded-full opacity-50 blur-2xl"></div>
                </div>
            </div>
        </div>
    );
}
