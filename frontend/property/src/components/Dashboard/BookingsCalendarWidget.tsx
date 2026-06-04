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
    isToday
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { bookingsService } from '../../services/bookings';
import { useProperty } from '../../context/PropertyContext';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { Booking } from '../../types/booking';

export default function BookingsCalendarWidget() {
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);

    // Fetch bookings for the current month view
    const { data: bookings = [], isLoading } = useQuery<Booking[]>({
        queryKey: ['dashboard-calendar-bookings', selectedProperty?.id, format(monthStart, 'yyyy-MM')],
        queryFn: () => bookingsService.getAll({
            propertyId: selectedProperty?.id,
            startDate: format(monthStart, 'yyyy-MM-dd'),
            endDate: format(monthEnd, 'yyyy-MM-dd')
        }),
        enabled: !!selectedProperty?.id,
    });

    // Generate calendar grid (including leading/trailing days of adjacent months to fill out weeks)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Aggregate booking check-ins per day
    const bookingsPerDay = useMemo(() => {
        const counts: Record<string, number> = {};
        bookings.forEach(b => {
            if (b.status === 'CANCELLED' || b.status === 'PENDING_PAYMENT') return;
            const checkInStr = format(new Date(b.checkInDate), 'yyyy-MM-dd');
            counts[checkInStr] = (counts[checkInStr] || 0) + 1;
        });
        return counts;
    }, [bookings]);

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleDayClick = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // Navigate to the bookings list and filter by this start date
        navigate(`/bookings?startDate=${dateStr}&endDate=${dateStr}`);
    };

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-blue-600" />
                    Booking
                </h2>
                
                <div className="flex items-center gap-4">
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
                    const count = bookingsPerDay[dateKey] || 0;
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isTodayDate = isToday(day);

                    return (
                        <button
                            key={dateKey}
                            onClick={() => handleDayClick(day)}
                            className={clsx(
                                "flex flex-col items-center justify-center p-2 rounded-xl transition-all border border-transparent",
                                {
                                    // Current month styling
                                    "bg-gray-50/50 dark:bg-gray-800/50 hover:border-gray-200 dark:hover:border-gray-600": isCurrentMonth,
                                    // Adjacent month styling
                                    "opacity-40 hover:opacity-100": !isCurrentMonth,
                                    // Today styling highlight
                                    "ring-2 ring-blue-500/50 font-bold": isTodayDate,
                                }
                            )}
                        >
                            <span className={clsx(
                                "text-sm mb-1",
                                isCurrentMonth ? "text-gray-900 dark:text-white" : "text-gray-400",
                                isTodayDate && "text-blue-600 dark:text-blue-400"
                            )}>
                                {format(day, 'd')}
                            </span>
                            
                            {/* Booking Badge */}
                            <div className="h-6 w-full flex items-center justify-center">
                                {count > 0 ? (
                                    <span className={clsx(
                                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-sm",
                                        count > 3 ? "bg-blue-600 text-white" : 
                                        count > 1 ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : 
                                        "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                                    )}>
                                        {count}
                                    </span>
                                ) : (
                                    <span className="w-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700"></span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>
            
            {/* Loading Overlay */}
            {isLoading && (
                <div className="absolute inset-0 bg-white/50 dark:bg-gray-900/50 flex items-center justify-center backdrop-blur-[1px] rounded-2xl">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            )}
            
            <div className="mt-4 text-[10px] text-gray-400 text-center italic">
                Shows the number of check-ins scheduled per day. Click a day to view bookings.
            </div>
        </div>
    );
}
