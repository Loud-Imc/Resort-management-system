import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    CheckCircle2, Download, ArrowRight, Calendar, User, 
    CreditCard, DoorClosed, Loader2, PlusCircle, ListFilter
} from 'lucide-react';
import { format } from 'date-fns';
import { bookingsService } from '../../services/bookings';
import toast from 'react-hot-toast';

interface BookingSuccessModalProps {
    isOpen: boolean;
    booking: any;
    onClose: () => void;
    onReset?: () => void;
    onCreateAnother?: () => void;
}

export const BookingSuccessModal: React.FC<BookingSuccessModalProps> = ({
    isOpen,
    booking,
    onClose,
    onReset,
    onCreateAnother,
}) => {
    const navigate = useNavigate();
    const [isDownloading, setIsDownloading] = useState(false);

    if (!isOpen || !booking) return null;

    const handleDownloadInvoice = async () => {
        setIsDownloading(true);
        try {
            await bookingsService.downloadInvoice(booking.id, booking.bookingNumber);
            toast.success('Invoice downloaded successfully');
        } catch (error) {
            console.error('Failed to download invoice:', error);
            toast.error('Could not download invoice. Please try from booking details.');
        } finally {
            setIsDownloading(false);
        }
    };

    const handleViewDetails = () => {
        onClose();
        navigate(`/bookings/${booking.id}`);
    };

    const handleGoToList = () => {
        onClose();
        navigate('/bookings');
    };

    const handleCreateAnother = () => {
        onClose();
        if (onCreateAnother) {
            onCreateAnother();
        } else if (onReset) {
            onReset();
        }
    };

    const bookingRooms = booking.bookingRooms || [];
    const nights = booking.numberOfNights || 1;

    // Extra charges calculation with defensive fallback
    const rawExtra = Number(booking.extraAdultAmount || 0) + Number(booking.extraChildAmount || 0);
    const roomsExtra = bookingRooms.reduce((sum: number, br: any) => {
        return sum + (Number(br.extraAdultChargePerNight || 0) + Number(br.extraChildChargePerNight || 0)) * nights;
    }, 0);
    const effectiveExtraCharges = rawExtra > 0 ? rawExtra : roomsExtra;

    const baseAmount = Number(booking.baseAmount || 0);
    const taxAmount = Number(booking.taxAmount || 0);
    const offerDiscount = Number(booking.offerDiscountAmount || 0);
    const couponDiscount = Number(booking.couponDiscountAmount || 0);
    const totalDiscount = Number(booking.discountAmount || 0) || (offerDiscount + couponDiscount);

    const isInclusive = booking.isGstInclusive ?? false;

    // If totalAmount was saved with a bug where extra charges were missed, recalculate effective total
    const computedTotal = isInclusive
        ? (baseAmount + taxAmount - totalDiscount)
        : (baseAmount + effectiveExtraCharges + taxAmount - totalDiscount);
    const rawTotalAmount = Number(booking.totalAmount || 0);
    const paidAmount = Number(booking.paidAmount || 0);
    const totalAmount = (rawTotalAmount < paidAmount && Math.abs(computedTotal - paidAmount) < 1)
        ? paidAmount
        : (rawTotalAmount > 0 ? rawTotalAmount : computedTotal);

    const balanceDue = Math.max(0, totalAmount - paidAmount);

    const checkInFormatted = booking.checkInDate 
        ? format(new Date(booking.checkInDate), 'dd MMM yyyy') 
        : 'N/A';
    const checkOutFormatted = booking.checkOutDate 
        ? format(new Date(booking.checkOutDate), 'dd MMM yyyy') 
        : 'N/A';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-lg rounded-3xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-transparent p-6 sm:p-7 border-b border-border flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-2xl border border-emerald-500/20 shrink-0">
                        <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                            Confirmed Reservation
                        </span>
                        <h2 className="text-xl font-black text-foreground">
                            Booking Created Successfully!
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Reservation #{booking.bookingNumber || booking.id} has been registered.
                        </p>
                    </div>
                </div>

                {/* Body Details */}
                <div className="p-6 sm:p-7 space-y-5">
                    {/* Stay & Guest Snapshot */}
                    <div className="grid grid-cols-2 gap-3 p-4 bg-muted/30 rounded-2xl border border-border/70 text-xs">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <User className="h-3 w-3" /> Guest
                            </span>
                            <p className="font-black text-foreground truncate">
                                {booking.guests?.[0]?.firstName 
                                    ? `${booking.guests[0].firstName} ${booking.guests[0].lastName || ''}`.trim()
                                    : (booking.user?.firstName ? `${booking.user.firstName} ${booking.user.lastName || ''}`.trim() : 'Guest')}
                            </p>
                            {booking.guests?.[0]?.phone && (
                                <p className="text-[11px] text-muted-foreground">{booking.guests[0].phone}</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> Dates
                            </span>
                            <p className="font-black text-foreground">
                                {checkInFormatted} → {checkOutFormatted}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {booking.numberOfNights || 1} Night{(booking.numberOfNights || 1) > 1 ? 's' : ''}
                            </p>
                        </div>

                        <div className="space-y-1 col-span-2 pt-2 border-t border-border/50">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <DoorClosed className="h-3 w-3" /> Assigned Rooms
                            </span>
                            <p className="font-bold text-foreground">
                                {booking.bookingRooms && booking.bookingRooms.length > 0 ? (
                                    booking.bookingRooms.map((br: any, i: number) => (
                                        <span key={i} className="inline-block mr-2 text-xs">
                                            Room #{br.room?.roomNumber || br.roomId || (i + 1)}
                                            {br.room?.roomType?.name ? ` (${br.room.roomType.name})` : ''}
                                            {i < booking.bookingRooms.length - 1 ? ',' : ''}
                                        </span>
                                    ))
                                ) : (
                                    <span>Room #{booking.room?.roomNumber || 'Auto-Assigned'}</span>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="p-4 bg-card rounded-2xl border border-border shadow-xs space-y-2">
                        {baseAmount > 0 && (effectiveExtraCharges > 0 || taxAmount > 0 || totalDiscount > 0) && (
                            <div className="space-y-1.5 pb-2 border-b border-border/50 text-xs">
                                <div className="flex justify-between items-center text-muted-foreground">
                                    <div className="flex flex-col">
                                        <span>Accommodation ({bookingRooms.length || 1} Rm × {nights} Nt):</span>
                                        {isInclusive && effectiveExtraCharges > 0 && (
                                            <span className="text-[10px] text-muted-foreground/80 font-normal">
                                                Includes ₹{effectiveExtraCharges.toLocaleString()} for extra guests
                                            </span>
                                        )}
                                    </div>
                                    <span className="font-semibold text-foreground">₹{baseAmount.toLocaleString()}</span>
                                </div>
                                {!isInclusive && effectiveExtraCharges > 0 && (
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Extra Guests Surcharge:</span>
                                        <span className="font-semibold text-foreground">+₹{effectiveExtraCharges.toLocaleString()}</span>
                                    </div>
                                )}
                                {taxAmount > 0 && (
                                    <div className="flex justify-between items-center text-muted-foreground">
                                        <span>Taxes & Fees:</span>
                                        <span className="font-semibold text-foreground">+₹{taxAmount.toLocaleString()}</span>
                                    </div>
                                )}
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                                        <span>Discounts:</span>
                                        <span className="font-semibold">-₹{totalDiscount.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-bold">Total Amount:</span>
                            <span className="font-black text-foreground text-sm">₹{totalAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-muted-foreground font-bold flex items-center gap-1">
                                <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
                                Paid Advance ({booking.paymentMethod || 'CASH'}):
                            </span>
                            <span className="font-black text-emerald-600 text-sm">₹{paidAmount.toLocaleString()}</span>
                        </div>
                        {balanceDue > 0 ? (
                            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/60">
                                <span className="text-amber-600 font-extrabold uppercase tracking-wider text-[11px]">
                                    Balance Due at Resort:
                                </span>
                                <span className="font-black text-amber-600 text-base">₹{balanceDue.toLocaleString()}</span>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center text-xs pt-1.5 border-t border-border/60">
                                <span className="text-emerald-600 font-extrabold uppercase tracking-wider text-[11px]">
                                    Payment Status:
                                </span>
                                <span className="font-black text-emerald-600">✓ Fully Paid</span>
                            </div>
                        )}
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <button
                            type="button"
                            onClick={handleDownloadInvoice}
                            disabled={isDownloading}
                            className="w-full h-12 bg-primary text-primary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Downloading...
                                </>
                            ) : (
                                <>
                                    <Download className="h-4 w-4" />
                                    Download Invoice
                                </>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleViewDetails}
                            className="w-full h-12 bg-secondary text-secondary-foreground font-black text-xs uppercase tracking-wider rounded-xl hover:bg-secondary/80 flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all"
                        >
                            <span>View Booking Details</span>
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Secondary Navigation Options */}
                    <div className="flex items-center justify-between pt-2 border-t border-border text-xs">
                        <button
                            type="button"
                            onClick={handleGoToList}
                            className="text-muted-foreground hover:text-foreground font-bold flex items-center gap-1.5 cursor-pointer py-1"
                        >
                            <ListFilter className="h-3.5 w-3.5" />
                            Bookings List
                        </button>

                        <button
                            type="button"
                            onClick={handleCreateAnother}
                            className="text-primary hover:underline font-black flex items-center gap-1.5 cursor-pointer py-1"
                        >
                            <PlusCircle className="h-3.5 w-3.5" />
                            Create Another Booking
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BookingSuccessModal;
