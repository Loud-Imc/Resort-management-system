import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth, addMonths, subMonths, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isAfter, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import clsx from 'clsx';
import { bookingsService } from '../../services/bookings';

interface BookingAvailabilityCalendarProps {
    propertyId: string;
    roomTypeId?: string;
    isGroupBooking: boolean;
    selectedCheckIn?: string;
    selectedCheckOut?: string;
    onSelectDates: (checkIn: string, checkOut: string) => void;
    excludeBookingId?: string;
    monthsToShow?: 1 | 2;
    className?: string;
    allowPastDates?: boolean;
    showAvailabilityCount?: boolean;
}

export default function BookingAvailabilityCalendar({
    propertyId,
    roomTypeId,
    isGroupBooking,
    selectedCheckIn,
    selectedCheckOut,
    onSelectDates,
    excludeBookingId,
    monthsToShow = 2,
    className,
    allowPastDates = false,
    showAvailabilityCount = true,
}: BookingAvailabilityCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [tempCheckIn, setTempCheckIn] = useState<Date | null>(selectedCheckIn ? new Date(selectedCheckIn) : null);
    const [tempCheckOut, setTempCheckOut] = useState<Date | null>(selectedCheckOut ? new Date(selectedCheckOut) : null);

    // Sync external props with internal state when they change
    React.useEffect(() => {
        if (selectedCheckIn) setTempCheckIn(new Date(selectedCheckIn));
        if (selectedCheckOut) setTempCheckOut(new Date(selectedCheckOut));
    }, [selectedCheckIn, selectedCheckOut]);

    const month1Start = startOfMonth(currentMonth);
    const month1End = endOfMonth(month1Start);
    const nextMonth = addMonths(currentMonth, 1);
    const month2Start = startOfMonth(nextMonth);
    const month2End = endOfMonth(month2Start);

    // Fetch availability whenever propertyId is available and count display is enabled
    const shouldFetch = !!propertyId && showAvailabilityCount;

    // Fetch day-by-day availability from the backend
    const { data: calendarData = {}, isLoading: isLoadingCalendar } = useQuery<Record<string, { available: number, total: number, isFull: boolean }>>({
        queryKey: ['availability-calendar', propertyId, format(month1Start, 'yyyy-MM'), roomTypeId, isGroupBooking, excludeBookingId],
        queryFn: () => bookingsService.getCalendarAvailability({
            propertyId,
            startDate: format(subMonths(month1Start, 1), 'yyyy-MM-dd'),
            endDate: format(addMonths(monthsToShow === 2 ? month2End : month1End, 1), 'yyyy-MM-dd'),
            roomTypeId: isGroupBooking ? undefined : roomTypeId,
            isGroupBooking,
            excludeBookingId
        }),
        enabled: shouldFetch,
    });

    // Derive totalRooms from the first calendar day, if available
    const totalRoomsOfType = useMemo(() => {
        const firstKey = Object.keys(calendarData)[0];
        return firstKey ? calendarData[firstKey].total : 0;
    }, [calendarData]);

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleDayClick = (day: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (!allowPastDates && day < today) return; // prevent selecting previous dates unless explicitly allowed

        let newCheckIn = tempCheckIn;
        let newCheckOut = tempCheckOut;

        // Clear selection or start new check-in
        if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
            newCheckIn = day;
            newCheckOut = null;
        } else if (tempCheckIn && !tempCheckOut) {
            if (isSameDay(day, tempCheckIn)) {
                // Clicking same day resets it
                newCheckIn = null;
            } else if (isAfter(day, tempCheckIn)) {
                newCheckOut = day;
            } else {
                // Clicking earlier date resets check-in to this date
                newCheckIn = day;
            }
        }

        setTempCheckIn(newCheckIn);
        setTempCheckOut(newCheckOut);

        if (newCheckIn && newCheckOut) {
            onSelectDates(format(newCheckIn, 'yyyy-MM-dd'), format(newCheckOut, 'yyyy-MM-dd'));
        }
    };

    const isDateInRange = (day: Date) => {
        if (!tempCheckIn || !tempCheckOut) return false;
        return isAfter(day, tempCheckIn) && isAfter(tempCheckOut, day);
    };

    const renderDayCell = (day: Date, monthBasis: Date) => {
        const dateKey = format(day, 'yyyy-MM-dd');
        const isCurrentMonth = isSameMonth(day, monthBasis);
        const isTodayDate = isToday(day);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const isPast = !allowPastDates && day < today;
        
        const dayData = calendarData[dateKey];
        const availableCount = dayData ? dayData.available : 0;
        const isFull = dayData ? dayData.isFull : false;

        const checkInKey = tempCheckIn ? format(tempCheckIn, 'yyyy-MM-dd') : null;
        const isCheckInFull = checkInKey && calendarData[checkInKey] ? calendarData[checkInKey].isFull : false;

        const isSelectedCheckIn = tempCheckIn ? isSameDay(day, tempCheckIn) : false;
        const isSelectedCheckOut = tempCheckOut ? isSameDay(day, tempCheckOut) : false;
        const isInRange = isDateInRange(day);

        let cellClass = "";
        let textClass = "";
        let badgeClass = "";

        if (isPast) {
            cellClass = "opacity-20 cursor-not-allowed pointer-events-none bg-muted/10 border-border/30 text-muted-foreground";
            textClass = "text-muted-foreground";
            badgeClass = "text-muted-foreground/40";
        } else if (!isCurrentMonth) {
            cellClass = "opacity-35 hover:opacity-80 text-muted-foreground";
            textClass = "text-muted-foreground";
            badgeClass = "text-muted-foreground/60";
        } else if (isSelectedCheckIn || isSelectedCheckOut) {
            if (showAvailabilityCount && (isFull || isCheckInFull)) {
                cellClass = "bg-red-500/15 dark:bg-red-950/40 border-2 border-red-500 ring-2 ring-red-500/30 scale-[0.98] shadow-md shadow-red-500/20";
                textClass = "text-red-600 dark:text-red-400 font-black";
                badgeClass = "bg-red-500 text-white font-black";
            } else {
                cellClass = "bg-primary text-primary-foreground border-primary scale-[0.98] shadow-md shadow-primary/20";
                textClass = "text-white font-black";
                badgeClass = "bg-white/20 text-white font-bold";
            }
        } else if (isInRange) {
            if (showAvailabilityCount && (isCheckInFull || isFull)) {
                cellClass = "bg-red-500/10 dark:bg-red-950/30 border-2 border-red-500/70 text-red-600 dark:text-red-400";
                textClass = "text-red-600 dark:text-red-400 font-black";
                badgeClass = "bg-red-500/20 text-red-600 dark:text-red-400 font-black border border-red-500/40";
            } else {
                cellClass = "bg-primary/15 border-primary/30 text-primary";
                textClass = "text-primary font-bold";
                badgeClass = "text-primary/80 font-bold";
            }
        } else if (showAvailabilityCount && isFull) {
            cellClass = "bg-red-500/5 dark:bg-red-950/20 border-red-500/20 hover:border-red-500/40";
            textClass = "text-red-700 dark:text-red-400";
            badgeClass = "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10";
        } else {
            cellClass = "bg-muted/10 border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary";
            textClass = "text-foreground";
            badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
        }

        return (
            <button
                key={dateKey}
                onClick={() => handleDayClick(day)}
                type="button"
                className={clsx(
                    "rounded-xl transition-all border text-center select-none cursor-pointer",
                    showAvailabilityCount 
                        ? "flex flex-col items-center justify-between p-1 sm:p-2 min-h-[48px] sm:min-h-[56px]" 
                        : "flex items-center justify-center h-10 sm:h-11 w-full text-sm font-bold",
                    cellClass,
                    isTodayDate && !isSelectedCheckIn && !isSelectedCheckOut && "ring-2 ring-primary/40"
                )}
            >
                <span className={clsx(
                    showAvailabilityCount ? "text-[10px] sm:text-xs font-bold self-start pl-0.5" : "text-xs sm:text-sm font-bold",
                    textClass
                )}>
                    {format(day, 'd')}
                </span>
                
                {showAvailabilityCount && shouldFetch ? (
                    totalRoomsOfType > 0 ? (
                        <span className={clsx("text-[8px] sm:text-[9px] px-1 sm:px-1.5 py-0.5 rounded-md self-center font-black tracking-tight", badgeClass)}>
                            {isFull ? 'FULL' : `${availableCount}/${totalRoomsOfType}`}
                        </span>
                    ) : (
                        <span className="text-[8px] text-muted-foreground self-center">No inv.</span>
                    )
                ) : null}
            </button>
        );
    };

    const renderMonth = (monthStart: Date, monthEnd: Date) => {
        const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="flex-1 w-full min-w-0">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-foreground capitalize pl-2 flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                        {format(monthStart, 'MMMM yyyy')}
                    </h3>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map(day => (
                        <div key={day} className="text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest py-1">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {calendarDays.map(day => renderDayCell(day, monthStart))}
                </div>
            </div>
        );
    };

    return (
        <div className={clsx("relative w-full rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm", className)}>

            {isLoadingCalendar && shouldFetch && (
                <div className="absolute top-4 right-4 flex items-center gap-2 text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full z-10">
                    <Loader2 className="h-3 w-3 animate-spin" /> Fetching...
                </div>
            )}

            {/* Navigation buttons */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 z-0">
                <button 
                    onClick={handlePreviousMonth} 
                    type="button"
                    className="p-1.5 sm:p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20 text-muted-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <button 
                    onClick={handleNextMonth} 
                    type="button"
                    className="p-1.5 sm:p-2 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all border border-transparent hover:border-primary/20 text-muted-foreground"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            <div className={clsx("flex gap-6 sm:gap-8", monthsToShow === 2 ? "flex-col lg:flex-row" : "flex-col")}>
                {renderMonth(month1Start, month1End)}
                {monthsToShow === 2 && (
                    <>
                        <div className="hidden lg:block w-px bg-border/50 self-stretch"></div>
                        <div className="block lg:hidden h-px bg-border/50 w-full"></div>
                        {renderMonth(month2Start, month2End)}
                    </>
                )}
            </div>

            <div className="mt-5 sm:mt-6 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-4 text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                <div className="flex items-center gap-4">
                    {showAvailabilityCount ? (
                        <>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"></div> Available</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary border border-primary/50"></div> Selected</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/40"></div> Full</div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary border border-primary/50"></div> Selected Dates</div>
                            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary/20 border border-primary/30"></div> In-Stay Range</div>
                        </>
                    )}
                </div>
                {tempCheckIn && tempCheckOut && (
                    <div className="text-primary font-black text-xs">
                        {format(tempCheckIn, 'MMM d, yyyy')} — {format(tempCheckOut, 'MMM d, yyyy')}
                    </div>
                )}
            </div>
        </div>
    );
}
