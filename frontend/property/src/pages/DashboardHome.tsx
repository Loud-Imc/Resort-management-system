import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../context/PropertyContext';
import { reportsService, type DashboardStats } from '../services/reports';
import { roomsService } from '../services/rooms';
import { Loader2, DollarSign, Users, BedDouble, Plus, Clock, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '../types/room';
import clsx from 'clsx';

export default function DashboardHome() {
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();

    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats', selectedProperty?.id],
        queryFn: () => reportsService.getDashboardStats(selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const { data: rooms } = useQuery<Room[]>({
        queryKey: ['rooms-status', selectedProperty?.id],
        queryFn: () => roomsService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const roomsList = rooms || [];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700';
            case 'OCCUPIED': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
            case 'MAINTENANCE': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
            case 'CLEANING': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
            case 'BLOCKED': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
            case 'RESERVED': return 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700';
            default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
        }
    };

    const handleRoomClick = (room: Room) => {
        if (room.status === 'AVAILABLE') {
            navigate('/bookings/create', { state: { roomId: room.id, roomNumber: room.roomNumber } });
        }
    };

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    // Room status summary from API (or compute from rooms list)
    const statusSummary = stats?.roomStatusSummary || {
        AVAILABLE: roomsList.filter(r => r.status === 'AVAILABLE').length,
        RESERVED: roomsList.filter(r => r.status === 'RESERVED').length,
        OCCUPIED: roomsList.filter(r => r.status === 'OCCUPIED').length,
        MAINTENANCE: roomsList.filter(r => r.status === 'MAINTENANCE').length,
        BLOCKED: roomsList.filter(r => r.status === 'BLOCKED').length,
    };

    if (selectedProperty && selectedProperty.status !== 'APPROVED') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="bg-white dark:bg-gray-800 p-12 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 max-w-xl w-full">
                    <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <Clock className="h-10 w-10 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
                        {selectedProperty.status === 'PENDING' ? 'Registration Pending' : 'Property Inactive'}
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-lg leading-relaxed mb-8">
                        {selectedProperty.status === 'PENDING'
                            ? "Your property registration is currently under review by our admin team. You'll be able to manage your rooms and bookings once it's approved."
                            : "This property is currently inactive. Please contact the administrator to re-enable it."}
                    </p>
                    <div className="inline-flex items-center gap-3 px-6 py-3 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl border border-amber-200 dark:border-amber-800 font-bold">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        Status: {selectedProperty.status}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedProperty?.name || 'Dashboard'}
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Welcome back! Here's today's overview.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/bookings/create')}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Walk-in Booking
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today's Bookings</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.bookingsCreated || 0}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today's Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{(stats?.revenue || 0).toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Occupancy</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.occupancy?.percentage || 0}%</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                            <Users className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Check-Ins / Outs</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {stats?.checkIns || 0} <span className="text-sm text-gray-400 font-normal">/ {stats?.checkOuts || 0}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Room Status Overview — Quick Bar */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div className="flex flex-wrap items-center gap-4 text-sm">
                    {[
                        { label: 'Available', count: statusSummary.AVAILABLE, color: 'bg-emerald-500' },
                        { label: 'Reserved', count: statusSummary.RESERVED || 0, color: 'bg-indigo-500' },
                        { label: 'Occupied', count: statusSummary.OCCUPIED, color: 'bg-blue-500' },
                        { label: 'Maintenance', count: statusSummary.MAINTENANCE, color: 'bg-amber-500' },
                        { label: 'Blocked', count: statusSummary.BLOCKED, color: 'bg-red-500' },
                    ].map(s => (
                        <div key={s.label} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${s.color}`} />
                            <span className="text-gray-600 dark:text-gray-300">{s.label}:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{s.count}</span>
                        </div>
                    ))}
                    <div className="ml-auto text-gray-500 dark:text-gray-400 font-medium">
                        Total: <span className="text-gray-900 dark:text-white font-bold">{stats?.occupancy?.total || roomsList.length}</span>
                    </div>
                </div>
            </div>

            {/* Room Status Grid */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <BedDouble className="h-5 w-5 text-blue-600" />
                        Room Status
                    </h2>
                    <button
                        onClick={() => navigate('/rooms')}
                        className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
                    >
                        All Rooms <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                </div>

                {roomsList.length === 0 ? (
                    <div className="text-center py-12">
                        <BedDouble className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No rooms found.</p>
                        <button onClick={() => navigate('/rooms/create')}
                            className="mt-3 text-sm text-blue-600 hover:underline font-medium">
                            + Add your first room
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
                        {roomsList.map((room: Room) => (
                            <button
                                key={room.id}
                                onClick={() => handleRoomClick(room)}
                                title={room.status === 'AVAILABLE' ? `Book Room ${room.roomNumber}` : `${room.roomNumber} — ${room.status}`}
                                className={clsx(
                                    `p-3 rounded-xl border text-center text-xs font-medium transition-all`,
                                    getStatusColor(room.status),
                                    room.status === 'AVAILABLE' && 'cursor-pointer hover:shadow-md hover:scale-105',
                                    room.status !== 'AVAILABLE' && 'cursor-default'
                                )}
                            >
                                <div className="font-bold text-sm">{room.roomNumber}</div>
                                <div className="mt-0.5 capitalize text-[10px]">{room.status?.toLowerCase()}</div>
                            </button>
                        ))}
                    </div>
                )}
                {roomsList.some(r => r.status === 'AVAILABLE') && (
                    <p className="mt-3 text-xs text-gray-400 dark:text-gray-500 italic">
                        💡 Click an available room to create a walk-in booking
                    </p>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'New Booking', icon: Plus, path: '/bookings/create', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                    { label: 'View Bookings', icon: Calendar, path: '/bookings', color: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                    { label: 'Manage Rooms', icon: BedDouble, path: '/rooms', color: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                    { label: 'My Property', icon: TrendingUp, path: '/my-property', color: 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700' },
                ].map((action) => (
                    <button
                        key={action.label}
                        onClick={() => navigate(action.path)}
                        className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all ${action.color}`}
                    >
                        <action.icon className="h-4 w-4" />
                        {action.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
