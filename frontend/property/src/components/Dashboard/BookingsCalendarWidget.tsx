import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
    format, 
    startOfMonth, 
    endOfMonth, 
    eachDayOfInterval, 
    startOfWeek, 
    endOfWeek,
    isSameMonth, 
    addMonths, 
    subMonths,
    isToday,
    isSameDay,
    addDays
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, CheckCircle2 } from 'lucide-react';
import { bookingsService } from '../../services/bookings';
import { useProperty } from '../../context/PropertyContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { Booking } from '../../types/booking';

interface BookingsCalendarWidgetProps {
    totalRooms?: number;
    onDateSelect?: (date: Date) => void;
    selectedDate?: Date;
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
}

export default function BookingsCalendarWidget({ 
    totalRooms = 0, 
    onDateSelect, 
    selectedDate,
    currentMonth,
    onMonthChange
}: BookingsCalendarWidgetProps) {
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState<'occupancy' | 'bookings'>('occupancy');

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);

    // Fetch bookings for the current month view (including trailing/leading days if needed, but start/end month is usually enough)
    const { data: bookings = [], isLoading } = useQuery<Booking[]>({
        queryKey: ['dashboard-calendar-bookings', selectedProperty?.id, format(monthStart, 'yyyy-MM')],
        queryFn: () => bookingsService.getAll({
            propertyId: selectedProperty?.id,
            startDate: format(subMonths(monthStart, 1), 'yyyy-MM-dd'), // fetch a wider range to cover long stays
            endDate: format(addMonths(monthEnd, 1), 'yyyy-MM-dd')
        }),
        enabled: !!selectedProperty?.id,
    });

    // Generate calendar grid
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Aggregate data per day
    const { bookingsPerDay, occupancyPerDay } = useMemo(() => {
        const bookingsCounts: Record<string, number> = {};
        const occupancyCounts: Record<string, number> = {};

        bookings.forEach(b => {
            if (b.status === 'CANCELLED' || b.status === 'PENDING_PAYMENT') return;
            
            // 1. Check-ins (Bookings Tab)
            const checkInStr = format(new Date(b.checkInDate), 'yyyy-MM-dd');
            bookingsCounts[checkInStr] = (bookingsCounts[checkInStr] || 0) + 1;

            // 2. Occupancy (Occupancy Tab) - covers [checkIn, checkOut)
            let curr = new Date(b.checkInDate);
            curr.setHours(0, 0, 0, 0);
            const end = new Date(b.checkOutDate);
            end.setHours(0, 0, 0, 0);

            // Compute unique room count for this booking (including blocks)
            const roomsCount = new Set([b.roomId, ...(b.roomBlocks?.map(rb => rb.roomId) || [])]).size;

            while (curr < end) {
                const dateStr = format(curr, 'yyyy-MM-dd');
                occupancyCounts[dateStr] = (occupancyCounts[dateStr] || 0) + roomsCount; 
                curr = addDays(curr, 1);
            }
        });
        
        return { bookingsPerDay: bookingsCounts, occupancyPerDay: occupancyCounts };
    }, [bookings]);

    const handlePreviousMonth = () => onMonthChange(subMonths(currentMonth, 1));
    const handleNextMonth = () => onMonthChange(addMonths(currentMonth, 1));

    const handleDayClick = (day: Date) => {
        if (activeTab === 'occupancy') {
            onDateSelect?.(day);
        } else {
            const dateStr = format(day, 'yyyy-MM-dd');
            navigate(`/bookings?startDate=${dateStr}&endDate=${dateStr}`);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
            {/* Header Area */}
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <CalendarIcon className="h-5 w-5 text-blue-600" />
                        Calendar
                    </h2>
                    
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handlePreviousMonth}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                        <span className="text-sm font-bold w-32 text-center text-gray-900 dark:text-white">
                            {format(currentMonth, 'MMMM yyyy')}
                        </span>
                        <button 
                            onClick={handleNextMonth}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-gray-100 dark:bg-gray-900/50 rounded-xl">
                    <button
                        onClick={() => setActiveTab('occupancy')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'occupancy' 
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <Users className="h-4 w-4" />
                        Occupancy
                    </button>
                    <button
                        onClick={() => setActiveTab('bookings')}
                        className={clsx(
                            "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all",
                            activeTab === 'bookings' 
                                ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm" 
                                : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        )}
                    >
                        <CheckCircle2 className="h-4 w-4" />
                        Bookings
                    </button>
                </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="text-center text-xs font-bold text-gray-400 dark:text-gray-500 py-2">
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1 flex-1">
                {calendarDays.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);
                    const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;

                    // Content based on tab
                    const bookingsCount = bookingsPerDay[dateKey] || 0;
                    const occupiedRooms = occupancyPerDay[dateKey] || 0;
                    const hasData = activeTab === 'bookings' ? bookingsCount > 0 : occupiedRooms > 0;
                    const isFullyBooked = activeTab === 'occupancy' && occupiedRooms >= totalRooms && totalRooms > 0;

                    // Dynamic styling classes for cell and text
                    let cellBgClass = "";
                    let dateNumClass = "";

                    if (!isCurrentMonth) {
                        cellBgClass = "bg-transparent border-transparent opacity-40 hover:opacity-100";
                        dateNumClass = "text-gray-400 dark:text-gray-500";
                    } else if (isSelected) {
                        cellBgClass = "bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-sm ring-1 ring-blue-500";
                        dateNumClass = "text-blue-700 dark:text-blue-400";
                    } else if (hasData) {
                        if (isFullyBooked) {
                            cellBgClass = "bg-emerald-600 border-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:border-emerald-700 dark:hover:bg-emerald-600 shadow-sm text-white";
                            dateNumClass = "text-white";
                        } else {
                            cellBgClass = "bg-emerald-100 border-emerald-200 hover:bg-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-900/50 shadow-sm text-emerald-900 dark:text-emerald-300";
                            dateNumClass = "text-emerald-900 dark:text-emerald-200";
                        }
                    } else {
                        // Empty/no data state for current month
                        cellBgClass = "bg-gray-50/50 dark:bg-gray-800/50 border-transparent hover:border-gray-200 dark:hover:border-gray-700";
                        dateNumClass = "text-gray-900 dark:text-white";
                    }

                    return (
                        <button
                            key={dateKey}
                            onClick={() => handleDayClick(day)}
                            className={clsx(
                                "flex flex-col items-center justify-center p-2 rounded-xl transition-all border",
                                cellBgClass,
                                {
                                    // Today highlighting (applied on top as ring)
                                    "ring-2 ring-blue-500/30": isTodayDate && !isSelected,
                                    "font-bold": isTodayDate,
                                }
                            )}
                        >
                            <span className={clsx("text-sm mb-1", dateNumClass)}>
                                {format(day, 'd')}
                            </span>
                            
                            {/* Data Badge */}
                            <div className="h-6 w-full flex items-center justify-center">
                                {activeTab === 'bookings' ? (
                                    bookingsCount > 0 ? (
                                        <span className={clsx(
                                            "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] max-w-full truncate text-center shadow-sm",
                                            isFullyBooked
                                                ? "bg-white text-emerald-700"
                                                : bookingsCount > 3
                                                    ? "bg-emerald-700 text-white dark:bg-emerald-600 dark:text-white"
                                                    : bookingsCount > 1
                                                        ? "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                                        : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200/20"
                                        )}>
                                            {bookingsCount}
                                        </span>
                                    ) : (
                                        <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700"></span>
                                    )
                                ) : (
                                    /* Occupancy display */
                                    <div className={clsx(
                                        "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md w-full max-w-full truncate text-center shadow-sm whitespace-nowrap",
                                        occupiedRooms > 0
                                            ? isFullyBooked
                                                ? "bg-white text-emerald-700 dark:bg-gray-100 dark:text-emerald-800"
                                                : "bg-emerald-200 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200"
                                            : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                                    )}>
                                        {occupiedRooms}/{totalRooms}
                                    </div>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center backdrop-blur-[2px] z-10">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}
            
            <div className="mt-4 text-[10px] text-gray-400 text-center italic">
                {activeTab === 'occupancy' 
                    ? "Shows daily occupancy. Click a date to view detailed room status."
                    : "Shows the number of check-ins scheduled. Click a date to view bookings."}
            </div>
        </div>
    );
}
