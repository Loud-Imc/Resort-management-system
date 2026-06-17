import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useProperty } from '../context/PropertyContext';
import { reportsService, type DashboardStats } from '../services/reports';
import { Loader2, IndianRupee, Users, BedDouble, Plus, Clock, Calendar, TrendingUp, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Room } from '../types/room';
import clsx from 'clsx';
import GuestDetailsModal from '../components/Rooms/GuestDetailsModal';
import FinancialDetailsModal from '../components/Reports/FinancialDetailsModal';
import { format } from 'date-fns';

import { useNavigation } from '../hooks/useNavigation';
import PropertyReadiness from '../components/PropertyReadiness';
import BookingsCalendarWidget from '../components/Dashboard/BookingsCalendarWidget';
import HistoricalGuestDetailsModal from '../components/Rooms/HistoricalGuestDetailsModal';
import { startOfMonth, endOfMonth, subMonths, addMonths, addDays } from 'date-fns';
import { bookingsService } from '../services/bookings';
import type { Booking } from '../types/booking';
export default function DashboardHome() {
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();
    const { navItems, hasPermission } = useNavigation();

    // Redirect to first available tab if no dashboard permission
    useEffect(() => {
        if (!hasPermission('reports.viewDashboard')) {
            const firstAllowed = navItems.find(item => item.path !== '/');
            if (firstAllowed) {
                navigate(firstAllowed.path, { replace: true });
            }
        }
    }, [hasPermission, navItems, navigate]);

    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    
    // New Historical Modal state
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
    const [historicalRoomNumber, setHistoricalRoomNumber] = useState('');

    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [detailsType, setDetailsType] = useState<'REVENUE' | 'BOOKINGS' | null>(null);

    const [calendarMonth, setCalendarMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(monthStart);

    // Fetch bookings to share with Calendar and calculate daily room status
    const { data: monthBookings = [] } = useQuery<Booking[]>({
        queryKey: ['dashboard-calendar-bookings', selectedProperty?.id, format(monthStart, 'yyyy-MM')],
        queryFn: () => bookingsService.getDashboardCalendar({
            propertyId: selectedProperty?.id,
            startDate: format(subMonths(monthStart, 1), 'yyyy-MM-dd'),
            endDate: format(addMonths(monthEnd, 1), 'yyyy-MM-dd')
        }),
        enabled: !!selectedProperty?.id,
    });

    const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
        queryKey: ['dashboard-stats', selectedProperty?.id],
        queryFn: () => reportsService.getDashboardStats(selectedProperty?.id),
        enabled: !!selectedProperty?.id && hasPermission('reports.viewDashboard'),
    });

    const roomsList = stats?.roomsList || [];

    // Compute displayRooms based on selectedDate
    const displayRooms = useMemo(() => {
        const targetDate = selectedDate || new Date();
        const target = new Date(targetDate);
        target.setHours(0, 0, 0, 0);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPastTarget = target.getTime() < today.getTime();

        return roomsList.map(room => {
            const roomBookings = monthBookings.filter((b: any) => {
                if (b.status === 'CANCELLED' || b.status === 'PENDING_PAYMENT') return false;
                return b.bookingRooms?.some((br: any) => br.roomId === room.id);
            });

            // Find booking covering the night of targetDate
            let activeBookingForTonight = roomBookings.find((b: any) => {
                const checkIn = new Date(b.checkInDate); checkIn.setHours(0,0,0,0);
                const checkOut = new Date(b.checkOutDate); checkOut.setHours(0,0,0,0);
                return target >= checkIn && target < checkOut;
            });

            // Find booking checking out on targetDate
            let checkoutBookingToday = roomBookings.find((b: any) => {
                const checkOut = new Date(b.checkOutDate); checkOut.setHours(0,0,0,0);
                return target.getTime() === checkOut.getTime();
            });

            // Do not show 'OUT TODAY' logic for past dates
            if (isPastTarget) {
                checkoutBookingToday = undefined;
            }

            let status = room.status as string; // e.g. MAINTENANCE
            let _activeBooking = null;
            let _checkoutBooking = null;
            let _guestName = '';

            if (activeBookingForTonight) {
                _activeBooking = activeBookingForTonight;
                _guestName = activeBookingForTonight.guests?.[0]?.firstName 
                    ? `${activeBookingForTonight.guests[0].firstName} ${activeBookingForTonight.guests[0].lastName || ''}`.trim()
                    : 'Guest';
                
                if (['CHECKED_IN', 'CHECKED_OUT'].includes(activeBookingForTonight.status)) {
                    status = 'OCCUPIED';
                } else {
                    status = 'RESERVED';
                }
                
                // Keep reference to checkout booking if exists, for UI badge
                if (checkoutBookingToday) {
                    _checkoutBooking = checkoutBookingToday;
                }
            } else if (checkoutBookingToday) {
                _checkoutBooking = checkoutBookingToday;
                _guestName = checkoutBookingToday.guests?.[0]?.firstName 
                    ? `${checkoutBookingToday.guests[0].firstName} ${checkoutBookingToday.guests[0].lastName || ''}`.trim()
                    : 'Guest';
                status = 'OUT_TODAY';
            } else {
                status = (room.status === 'MAINTENANCE' || room.status === 'BLOCKED') ? room.status : 'AVAILABLE';
            }

            return {
                ...room,
                status,
                _activeBooking,
                _checkoutBooking,
                _guestName
            } as Room & { _activeBooking?: Booking, _checkoutBooking?: Booking, _guestName?: string };
        });
    }, [roomsList, monthBookings, selectedDate]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'AVAILABLE': return 'bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700';
            case 'OUT_TODAY': return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-300 dark:border-orange-700';
            case 'OCCUPIED': return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
            case 'RESERVED': return 'bg-indigo-100 text-indigo-700 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-700';
            case 'MAINTENANCE': return 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700';
            case 'CLEANING': return 'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-700';
            case 'BLOCKED': return 'bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700';
            default: return 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600';
        }
    };

    const handleRoomClick = (room: Room & { _activeBooking?: Booking | null, _checkoutBooking?: Booking | null }) => {
        if (room.status === 'AVAILABLE') {
            handleBookClick(room);
        } else if (room._activeBooking) {
            setSelectedBooking(room._activeBooking);
            setHistoricalRoomNumber(room.roomNumber);
            setIsHistoricalModalOpen(true);
        } else if (room.status === 'OUT_TODAY' && room._checkoutBooking) {
            // Main card click on OUT TODAY opens the guest who is leaving
            setSelectedBooking(room._checkoutBooking);
            setHistoricalRoomNumber(room.roomNumber);
            setIsHistoricalModalOpen(true);
        } else if (room.status === 'OCCUPIED' || room.status === 'RESERVED') {
            setSelectedRoomId(room.id);
            setIsGuestModalOpen(true);
        }
    };

    const handleBookClick = (room: Room) => {
        const targetDate = selectedDate || new Date();
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        navigate('/bookings/create', { 
            state: { 
                roomId: room.id,
                roomTypeId: room.roomTypeId,
                roomNumber: room.roomNumber,
                startDate: dateStr,
                endDate: format(addDays(targetDate, 1), 'yyyy-MM-dd')
            } 
        });
    };

    const statusSummary = useMemo(() => ({
        AVAILABLE: displayRooms.filter(r => r.status === 'AVAILABLE').length,
        OUT_TODAY: displayRooms.filter(r => r.status === 'OUT_TODAY').length,
        RESERVED: displayRooms.filter(r => r.status === 'RESERVED').length,
        OCCUPIED: displayRooms.filter(r => r.status === 'OCCUPIED').length,
        MAINTENANCE: displayRooms.filter(r => r.status === 'MAINTENANCE').length,
        BLOCKED: displayRooms.filter(r => r.status === 'BLOCKED').length,
    }), [displayRooms]);

    if (statsLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

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
            <PropertyReadiness />

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
                <div
                    onClick={() => { setDetailsType('BOOKINGS'); setDetailsModalOpen(true); }}
                    className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                            <Calendar className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today's Bookings</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats?.bookingsCreated || 0}</p>
                        </div>
                    </div>
                </div>

                <div
                    onClick={() => { setDetailsType('REVENUE'); setDetailsModalOpen(true); }}
                    className="cursor-pointer bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 hover:shadow-lg hover:border-emerald-300 dark:hover:border-emerald-700 hover:-translate-y-1 transition-all group relative overflow-hidden"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/30 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                            <IndianRupee className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Today's Revenue</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                ₹{(stats?.revenue || 0).toLocaleString()}
                            </p>
                            {Number(stats?.todayFees) > 0 && (
                                <p className="text-[10px] text-orange-600 dark:text-orange-400 font-medium mt-0.5">
                                    Incl. ₹{stats?.todayFees} platform fee
                                </p>
                            )}
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
                        { label: 'Out Today', count: statusSummary.OUT_TODAY, color: 'bg-orange-500' },
                        // { label: 'Confirmed', count: statusSummary.CONFIRMED, color: 'bg-fuchsia-500' },
                        { label: 'Reserved', count: statusSummary.RESERVED, color: 'bg-indigo-500' },
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

            {/* Split Grid for Room Status and Calendar */}
            <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    {/* Room Status Grid */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 h-full">
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <BedDouble className="h-5 w-5 text-blue-600" />
                                    {selectedDate ? `Room Status for ${format(selectedDate, 'MMM d, yyyy')}` : 'Room Status'}
                                </h2>
                                {selectedProperty && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                                        <Clock className="h-3.5 w-3.5" />
                                        <span>Check-in: <strong>{selectedProperty.defaultCheckInTime || '14:00'}</strong></span>
                                        <span className="text-gray-300 dark:text-gray-600">|</span>
                                        <span>Check-out: <strong>{selectedProperty.defaultCheckOutTime || '11:00'}</strong></span>
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-4">
                                {selectedDate && (
                                    <button
                                        onClick={() => setSelectedDate(null)}
                                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                                    >
                                        Reset to Today
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate('/rooms')}
                                    className="text-sm text-blue-600 hover:underline font-medium flex items-center gap-1"
                                >
                                    All Rooms <ArrowRight className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {displayRooms.length === 0 ? (
                            <div className="text-center py-12">
                                <BedDouble className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                                <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No rooms found.</p>
                                <button onClick={() => navigate('/rooms/create')}
                                    className="mt-3 text-sm text-blue-600 hover:underline font-medium">
                                    + Add your first room
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                                {displayRooms.map((room) => (
                                    <button
                                        key={room.id}
                                        onClick={() => handleRoomClick(room as Room & { _activeBooking?: Booking | null, _checkoutBooking?: Booking | null })}
                                        title={
                                            (room as any)._checkoutBooking && room.status !== 'OUT_TODAY'
                                                ? "This room has a check out today, but also has a booking today"
                                                : room.status === 'AVAILABLE' 
                                                    ? `Book Room ${room.roomNumber}` 
                                                    : `${room.roomNumber} — ${room.status}`
                                        }
                                        className={clsx(
                                            `p-3 rounded-2xl border text-center font-medium transition-all flex flex-col justify-center items-center h-full min-h-[6.5rem] relative overflow-hidden group`,
                                            getStatusColor(room.status as string),
                                            (room.status === 'AVAILABLE' || room.status === 'OUT_TODAY' || room.status === 'OCCUPIED' || room.status === 'RESERVED') && 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
                                            (room.status !== 'AVAILABLE' && room.status !== 'OUT_TODAY' && room.status !== 'OCCUPIED' && room.status !== 'RESERVED') && 'cursor-default'
                                        )}
                                    >
                                        {/* Status edge badge: If there's a checkout today but the room is already booked for tonight */}
                                        {(room as any)._checkoutBooking && room.status !== 'OUT_TODAY' && (
                                            <span className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-bl-lg shadow-sm z-10" title="This room has a check out today, but also has a booking today">
                                                OUT TODAY
                                            </span>
                                        )}

                                        <div className="font-bold text-lg">{room.roomNumber}</div>
                                        <div className="mt-1 capitalize text-xs truncate w-full px-1 flex flex-col items-center leading-tight">
                                            <span>{(room as any)._guestName || room.status?.toLowerCase().replace('_', ' ')}</span>
                                        </div>

                                        {room.status === 'OUT_TODAY' && (
                                            <div 
                                                className="absolute bottom-0 left-0 w-full bg-blue-500/10 text-blue-700 dark:text-blue-300 dark:bg-blue-500/20 text-[10px] font-bold py-2 border-t border-blue-200 dark:border-blue-800 hover:bg-blue-600 hover:text-white dark:hover:bg-blue-600 transition-all cursor-pointer z-20 flex items-center justify-center gap-1 backdrop-blur-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBookClick(room as Room);
                                                }}
                                            >
                                                <Plus className="w-3 h-3" /> BOOK
                                            </div>
                                        )}
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
                </div>
                <div className="lg:col-span-1">
                    <BookingsCalendarWidget 
                        totalRooms={roomsList.length}
                        selectedDate={selectedDate || undefined}
                        onDateSelect={setSelectedDate}
                        currentMonth={calendarMonth}
                        onMonthChange={setCalendarMonth}
                    />
                </div>
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

            {/* Guest Details Modal */}
            <GuestDetailsModal
                roomId={selectedRoomId || ''}
                isOpen={isGuestModalOpen}
                onClose={() => setIsGuestModalOpen(false)}
            />

            <HistoricalGuestDetailsModal
                booking={selectedBooking}
                roomNumber={historicalRoomNumber}
                isOpen={isHistoricalModalOpen}
                onClose={() => setIsHistoricalModalOpen(false)}
            />

            <FinancialDetailsModal
                isOpen={detailsModalOpen}
                onClose={() => setDetailsModalOpen(false)}
                type={detailsType}
                dateRange={{
                    startDate: format(new Date(), 'yyyy-MM-dd'),
                    endDate: format(new Date(), 'yyyy-MM-dd')
                }}
                propertyId={selectedProperty?.id}
            />
        </div>
    );
}
