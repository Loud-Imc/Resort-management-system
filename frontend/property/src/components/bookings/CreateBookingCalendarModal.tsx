import { useState, useEffect } from 'react';
import { format, differenceInCalendarDays } from 'date-fns';
import { X, Calendar as CalendarIcon, AlertCircle, Moon, CheckCircle2 } from 'lucide-react';
import BookingAvailabilityCalendar from './BookingAvailabilityCalendar';

interface CreateBookingCalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    roomTypeId?: string;
    roomTypeName?: string;
    isGroupBooking: boolean;
    initialCheckIn?: string;
    initialCheckOut?: string;
    allowPastDates?: boolean;
    onApplyDates: (checkIn: string, checkOut: string) => void;
}

export default function CreateBookingCalendarModal({
    isOpen,
    onClose,
    propertyId,
    roomTypeId,
    // roomTypeName,
    isGroupBooking,
    initialCheckIn,
    initialCheckOut,
    allowPastDates = false,
    onApplyDates
}: CreateBookingCalendarModalProps) {
    const [tempCheckIn, setTempCheckIn] = useState<string | undefined>(initialCheckIn);
    const [tempCheckOut, setTempCheckOut] = useState<string | undefined>(initialCheckOut);

    useEffect(() => {
        if (isOpen) {
            setTempCheckIn(initialCheckIn);
            setTempCheckOut(initialCheckOut);
        }
    }, [isOpen, initialCheckIn, initialCheckOut]);

    if (!isOpen) return null;

    const handleSelectDates = (checkIn: string, checkOut: string) => {
        setTempCheckIn(checkIn);
        setTempCheckOut(checkOut);
    };

    const handleApply = () => {
        if (tempCheckIn && tempCheckOut) {
            onApplyDates(tempCheckIn, tempCheckOut);
            onClose();
        }
    };

    const nightsCount = tempCheckIn && tempCheckOut
        ? Math.max(1, differenceInCalendarDays(new Date(tempCheckOut), new Date(tempCheckIn)))
        : 0;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 bg-background/60 backdrop-blur-xl animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-5xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-border/80 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="relative p-5 sm:p-6 border-b border-border/60 bg-gradient-to-br from-primary/10 via-transparent to-transparent flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-md">
                                <CalendarIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg sm:text-xl font-black tracking-tight text-foreground">
                                    Select Stay Dates
                                </h2>
                                <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                    Click your check-in and check-out dates to set the stay duration
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 hover:bg-muted rounded-xl transition-all text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Main Body */}
                <div className="p-4 sm:p-6 flex flex-col lg:flex-row gap-6 overflow-y-auto flex-1">
                    {/* Left: Interactive Calendar */}
                    <div className="flex-1 min-w-0">
                        <BookingAvailabilityCalendar
                            propertyId={propertyId}
                            roomTypeId={roomTypeId}
                            isGroupBooking={isGroupBooking}
                            selectedCheckIn={tempCheckIn}
                            selectedCheckOut={tempCheckOut}
                            onSelectDates={handleSelectDates}
                            allowPastDates={allowPastDates}
                            showAvailabilityCount={false}
                            className="border-none shadow-none"
                        />
                    </div>

                    {/* Right: Instructions & Summary */}
                    <div className="w-full lg:w-80 bg-muted/20 border border-border/60 rounded-2xl p-5 flex flex-col justify-between shrink-0 space-y-4">
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Selected Range
                            </h3>

                            <div className="space-y-3">
                                {/* Check-In Card */}
                                <div className="p-3.5 bg-background border border-border rounded-xl">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                        Check-In Date
                                    </span>
                                    <p className="text-sm font-black text-foreground mt-0.5">
                                        {tempCheckIn ? format(new Date(tempCheckIn), 'EEE, MMM dd, yyyy') : 'Click date to select'}
                                    </p>
                                </div>

                                {/* Check-Out Card */}
                                <div className="p-3.5 bg-background border border-border rounded-xl">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                        Check-Out Date
                                    </span>
                                    <p className="text-sm font-black text-foreground mt-0.5">
                                        {tempCheckOut ? format(new Date(tempCheckOut), 'EEE, MMM dd, yyyy') : 'Click date to select'}
                                    </p>
                                </div>

                                {/* Duration Badge */}
                                {nightsCount > 0 && (
                                    <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                                        <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                                            <Moon className="h-4 w-4" /> Total Duration
                                        </span>
                                        <span className="text-xs font-black text-primary uppercase">
                                            {nightsCount} {nightsCount === 1 ? 'Night' : 'Nights'}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Help Guide */}
                            <div className="p-3.5 bg-background/80 border border-border rounded-xl text-xs space-y-1.5 text-muted-foreground">
                                <p className="font-bold text-foreground flex items-center gap-1">
                                    <AlertCircle className="h-3.5 w-3.5 text-primary" /> Easy 2-Click Selection:
                                </p>
                                <ol className="list-decimal pl-4 space-y-1 text-[11px]">
                                    <li>Click your desired <strong>Check-In</strong> date.</li>
                                    <li>Click your desired <strong>Check-Out</strong> date.</li>
                                    <li>Click <strong>Apply Dates</strong> to confirm.</li>
                                </ol>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={handleApply}
                                disabled={!tempCheckIn || !tempCheckOut}
                                className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <CheckCircle2 className="h-4 w-4" /> Apply Dates
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full py-2.5 rounded-xl border border-border font-bold text-xs uppercase tracking-wider hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
