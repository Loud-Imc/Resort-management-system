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
    addDays,
    isAfter
} from 'date-fns';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Loader2, AlertCircle } from 'lucide-react';
import { bookingsService } from '../../services/bookings';
import { roomsService } from '../../services/rooms';
import type { Booking } from '../../types/booking';
import clsx from 'clsx';

interface RescheduleCalendarModalProps {
    booking: Booking;
    roomTypeId: string;
    roomTypeName: string;
    propertyId: string;
    roomTypes: any[] | undefined;
    onClose: () => void;
    onSelectDates: (checkIn: string, checkOut: string) => void;
}

export function RescheduleCalendarModal({
    booking,
    roomTypeId,
    roomTypeName,
    propertyId,
    roomTypes,
    onClose,
    onSelectDates
}: RescheduleCalendarModalProps) {
    const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
    const [tempCheckIn, setTempCheckIn] = useState<Date | null>(null);
    const [tempCheckOut, setTempCheckOut] = useState<Date | null>(null);

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);

    // Fetch bookings for the viewed month
    const { data: bookings = [], isLoading: isLoadingBookings } = useQuery<Booking[]>({
        queryKey: ['reschedule-calendar-bookings', propertyId, format(monthStart, 'yyyy-MM')],
        queryFn: () => bookingsService.getAll({
            propertyId,
            startDate: format(subMonths(monthStart, 1), 'yyyy-MM-dd'),
            endDate: format(addMonths(monthEnd, 1), 'yyyy-MM-dd')
        }),
        enabled: !!propertyId,
    });

    // Fetch all rooms to count total rooms of the selected type
    const { data: rooms = [], isLoading: isLoadingRooms } = useQuery<any[]>({
        queryKey: ['reschedule-calendar-rooms', propertyId],
        queryFn: () => roomsService.getAll({ propertyId }),
        enabled: !!propertyId,
    });

    // Get group pool room types
    const groupPoolRoomTypeIds = useMemo(() => {
        if (!booking.isGroupBooking) return [roomTypeId];
        return roomTypes?.filter((rt: any) => rt.isAvailableForGroupBooking || rt.isGroupPool).map((rt: any) => rt.id) || [];
    }, [booking.isGroupBooking, roomTypeId, roomTypes]);

    // Calculate total rooms of this type (or total pool rooms for group bookings)
    const totalRoomsOfType = useMemo(() => {
        return rooms.filter((r: any) => groupPoolRoomTypeIds.includes(r.roomTypeId)).length;
    }, [rooms, groupPoolRoomTypeIds]);

    // Generate calendar grid days
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    // Calculate daily occupancy specifically for the selected room type(s)
    const occupancyPerDay = useMemo(() => {
        const counts: Record<string, number> = {};

        bookings.forEach(b => {
            if (b.status === 'CANCELLED' || b.status === 'PENDING_PAYMENT') return;
            if (b.id === booking.id) return; // exclude current booking being rescheduled

            let curr = new Date(b.checkInDate);
            curr.setHours(0, 0, 0, 0);
            const end = new Date(b.checkOutDate);
            end.setHours(0, 0, 0, 0);

            while (curr < end) {
                const dateStr = format(curr, 'yyyy-MM-dd');
                
                // Count rooms of the selected type occupied by this booking
                let occupiedRoomsInThisBooking = 0;
                if (b.roomTypeId && groupPoolRoomTypeIds.includes(b.roomTypeId)) {
                    occupiedRoomsInThisBooking += 1;
                }
                if (b.roomBlocks) {
                    b.roomBlocks.forEach(block => {
                        const rTypeId = (block.room as any)?.roomTypeId || (block as any).roomTypeId;
                        if (rTypeId && groupPoolRoomTypeIds.includes(rTypeId)) {
                            occupiedRoomsInThisBooking += 1;
                        }
                    });
                }

                counts[dateStr] = (counts[dateStr] || 0) + occupiedRoomsInThisBooking;
                curr = addDays(curr, 1);
            }
        });

        return counts;
    }, [bookings, groupPoolRoomTypeIds, booking.id]);

    const handlePreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleDayClick = (day: Date) => {
        // Clear selection or start new check-in
        if (!tempCheckIn || (tempCheckIn && tempCheckOut)) {
            setTempCheckIn(day);
            setTempCheckOut(null);
        } else if (tempCheckIn && !tempCheckOut) {
            if (isSameDay(day, tempCheckIn)) {
                // Clicking same day resets it
                setTempCheckIn(null);
            } else if (isAfter(day, tempCheckIn)) {
                setTempCheckOut(day);
            } else {
                // Clicking earlier date resets check-in to this date
                setTempCheckIn(day);
            }
        }
    };

    const handleApply = () => {
        if (tempCheckIn && tempCheckOut) {
            onSelectDates(
                format(tempCheckIn, 'yyyy-MM-dd'),
                format(tempCheckOut, 'yyyy-MM-dd')
            );
        }
    };

    const isDateInRange = (day: Date) => {
        if (!tempCheckIn || !tempCheckOut) return false;
        return isAfter(day, tempCheckIn) && isAfter(tempCheckOut, day);
    };

    const isLoading = isLoadingBookings || isLoadingRooms;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-background/50 backdrop-blur-2xl">
            <div className="bg-card w-full max-w-4xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-border/60 overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="relative p-6 border-b border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-transparent flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg">
                                <CalendarIcon className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black tracking-tight text-foreground">
                                    {booking.isGroupBooking ? 'Group Availability Calendar' : 'Room Availability Calendar'}
                                </h2>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    {booking.isGroupBooking ? (
                                        <>Group Booking Pool (<span className="text-primary font-bold">{totalRoomsOfType}</span> total rooms in pool)</>
                                    ) : (
                                        <>Room Type: <span className="text-primary font-bold">{roomTypeName}</span> ({totalRoomsOfType} total rooms)</>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-xl transition-all"
                        >
                            <X className="h-6 w-6 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="p-6 flex flex-col md:flex-row gap-6">
                    {/* Left: Calendar View */}
                    <div className="flex-1 flex flex-col relative min-h-[420px]">
                        {/* Month Picker Header */}
                        <div className="flex items-center justify-between mb-4">
                            <button 
                                onClick={handlePreviousMonth}
                                className="p-2 hover:bg-muted rounded-xl text-foreground transition-colors"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <span className="text-base font-black uppercase tracking-wider text-foreground">
                                {format(currentMonth, 'MMMM yyyy')}
                            </span>
                            <button 
                                onClick={handleNextMonth}
                                className="p-2 hover:bg-muted rounded-xl text-foreground transition-colors"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Weekday Labels */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                                <div key={day} className="text-center text-[10px] font-black uppercase text-muted-foreground tracking-widest py-1">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 flex-1">
                            {calendarDays.map(day => {
                                const dateKey = format(day, 'yyyy-MM-dd');
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isTodayDate = isToday(day);
                                
                                const occupiedCount = occupancyPerDay[dateKey] || 0;
                                const availableCount = Math.max(0, totalRoomsOfType - occupiedCount);
                                const isFull = availableCount === 0 && totalRoomsOfType > 0;

                                const isSelectedCheckIn = tempCheckIn ? isSameDay(day, tempCheckIn) : false;
                                const isSelectedCheckOut = tempCheckOut ? isSameDay(day, tempCheckOut) : false;
                                const isInRange = isDateInRange(day);

                                let cellClass = "";
                                let textClass = "";
                                let badgeClass = "";

                                if (!isCurrentMonth) {
                                    cellClass = "opacity-35 hover:opacity-80";
                                    textClass = "text-muted-foreground";
                                    badgeClass = "text-muted-foreground/60";
                                } else if (isSelectedCheckIn || isSelectedCheckOut) {
                                    cellClass = "bg-primary text-primary-foreground border-primary scale-[0.98] shadow-md shadow-primary/20";
                                    textClass = "text-white font-bold";
                                    badgeClass = "text-white/80 font-bold";
                                } else if (isInRange) {
                                    cellClass = "bg-primary/15 border-primary/30 text-primary";
                                    textClass = "text-primary font-bold";
                                    badgeClass = "text-primary/80 font-bold";
                                } else if (isFull) {
                                    cellClass = "bg-red-500/5 dark:bg-red-950/20 border-red-500/20 hover:border-red-500/40";
                                    textClass = "text-red-700 dark:text-red-400";
                                    badgeClass = "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10";
                                } else {
                                    cellClass = "bg-muted/10 border-border/50 hover:bg-muted/40 hover:border-border";
                                    textClass = "text-foreground";
                                    badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
                                }

                                return (
                                    <button
                                        key={dateKey}
                                        onClick={() => handleDayClick(day)}
                                        className={clsx(
                                            "flex flex-col items-center justify-between p-2 rounded-xl transition-all border text-left min-h-[56px] relative select-none",
                                            cellClass,
                                            isTodayDate && !isSelectedCheckIn && !isSelectedCheckOut && "ring-2 ring-primary/40"
                                        )}
                                    >
                                        <span className={clsx("text-xs font-bold self-start pl-0.5", textClass)}>
                                            {format(day, 'd')}
                                        </span>
                                        
                                        {totalRoomsOfType > 0 ? (
                                            <span className={clsx("text-[9px] px-1.5 py-0.5 rounded-md self-center font-black tracking-tight", badgeClass)}>
                                                {isFull ? 'FULL' : `${availableCount}/${totalRoomsOfType}`}
                                            </span>
                                        ) : (
                                            <span className="text-[8px] text-muted-foreground self-center">No inventory</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Loading Indicator */}
                        {isLoading && (
                            <div className="absolute inset-0 bg-background/50 dark:bg-background/80 flex flex-col items-center justify-center backdrop-blur-[2px] rounded-2xl z-25">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                <span className="text-xs font-black uppercase text-muted-foreground tracking-widest mt-2">Updating availability...</span>
                            </div>
                        )}
                    </div>

                    {/* Right: Instructions & Selections */}
                    <div className="w-full md:w-80 bg-muted/20 border border-border/40 rounded-3xl p-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider pl-1">Selected Dates</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-background border border-border/40 rounded-2xl flex flex-col">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">New Check-In</span>
                                    <span className="text-base font-bold mt-1 text-foreground">
                                        {tempCheckIn ? format(tempCheckIn, 'MMM dd, yyyy (EEEE)') : 'Select check-in date'}
                                    </span>
                                </div>

                                <div className="p-4 bg-background border border-border/40 rounded-2xl flex flex-col">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">New Check-Out</span>
                                    <span className="text-base font-bold mt-1 text-foreground">
                                        {tempCheckOut ? format(tempCheckOut, 'MMM dd, yyyy (EEEE)') : 'Select check-out date'}
                                    </span>
                                </div>
                            </div>

                            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-4 flex gap-3">
                                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <div className="text-xs text-primary font-medium leading-relaxed">
                                    <p className="font-bold">How to select:</p>
                                    <ul className="list-disc pl-4 mt-1 space-y-1">
                                        <li>Click any date to set it as **Check-In**.</li>
                                        <li>Click a subsequent date to set it as **Check-Out**.</li>
                                        <li>The count `X/Y` represents **Available / Total** rooms.</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 mt-6">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-3 rounded-xl border border-border font-black text-xs uppercase tracking-widest hover:bg-muted transition-colors text-foreground"
                            >
                                Close Calendar
                            </button>
                            <button
                                type="button"
                                onClick={handleApply}
                                disabled={!tempCheckIn || !tempCheckOut}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-primary/20 active:scale-95"
                            >
                                Apply Dates
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
