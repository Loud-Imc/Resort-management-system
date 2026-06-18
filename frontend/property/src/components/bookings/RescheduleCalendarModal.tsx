import { useState } from 'react';
import { format } from 'date-fns';
import { X, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import type { Booking } from '../../types/booking';
import BookingAvailabilityCalendar from './BookingAvailabilityCalendar';

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
    onClose,
    onSelectDates
}: RescheduleCalendarModalProps) {
    const [tempCheckIn, setTempCheckIn] = useState<string | undefined>();
    const [tempCheckOut, setTempCheckOut] = useState<string | undefined>();

    const handleSelectDates = (checkIn: string, checkOut: string) => {
        setTempCheckIn(checkIn);
        setTempCheckOut(checkOut);
    };

    const handleApply = () => {
        if (tempCheckIn && tempCheckOut) {
            onSelectDates(tempCheckIn, tempCheckOut);
        }
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 bg-background/50 backdrop-blur-2xl">
            <div className="bg-card w-full max-w-6xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-border/60 overflow-hidden animate-in fade-in zoom-in duration-300">
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
                                        <>Group Booking Pool</>
                                    ) : (
                                        <>Room Type: <span className="text-primary font-bold">{roomTypeName}</span></>
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
                    {/* Left: Interactive Calendar */}
                    <div className="flex-1">
                        <BookingAvailabilityCalendar
                            propertyId={propertyId}
                            roomTypeId={roomTypeId}
                            isGroupBooking={!!booking.isGroupBooking}
                            excludeBookingId={booking.id}
                            selectedCheckIn={tempCheckIn}
                            selectedCheckOut={tempCheckOut}
                            onSelectDates={handleSelectDates}
                            className="border-none shadow-none"
                        />
                    </div>

                    {/* Right: Instructions & Selections */}
                    <div className="w-full md:w-80 bg-muted/20 border border-border/40 rounded-3xl p-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-wider pl-1">Selected Dates</h3>

                            <div className="space-y-4">
                                <div className="p-4 bg-background border border-border/40 rounded-2xl flex flex-col">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">New Check-In</span>
                                    <span className="text-base font-bold mt-1 text-foreground">
                                        {tempCheckIn ? format(new Date(tempCheckIn), 'MMM dd, yyyy (EEEE)') : 'Select check-in date'}
                                    </span>
                                </div>

                                <div className="p-4 bg-background border border-border/40 rounded-2xl flex flex-col">
                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">New Check-Out</span>
                                    <span className="text-base font-bold mt-1 text-foreground">
                                        {tempCheckOut ? format(new Date(tempCheckOut), 'MMM dd, yyyy (EEEE)') : 'Select check-out date'}
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
