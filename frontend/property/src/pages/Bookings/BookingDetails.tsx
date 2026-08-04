import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { bookingsService } from '../../services/bookings';
import type { Booking } from '../../types/booking';
import {
    ChevronLeft,
    Calendar,
    User,
    MapPin,
    ShieldCheck,
    CreditCard,
    ArrowRight,
    Loader2,
    Download,
    Mail,
    Phone,
    Clock,
    House,
    X,
    Receipt,
    Pencil,
    Briefcase,
    AlertCircle
} from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { CheckInVerificationModal } from '../../components/bookings/CheckInVerificationModal';

const BookingDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [isDownloading, setIsDownloading] = useState(false);

    const { data: booking, isLoading, error } = useQuery({
        queryKey: ['booking', id],
        queryFn: () => bookingsService.getById(id!),
        enabled: !!id,
    }) as { data: Booking | undefined, isLoading: boolean, error: any };

    const [isTransactionsOpen, setIsTransactionsOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Check-In & Warning Modal States
    const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);
    const [warningModal, setWarningModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'BLOCK' | 'WARNING';
        onConfirm: () => void;
        confirmText: string;
        onCancel: () => void;
        cancelText: string;
    } | null>(null);

    const checkOutMutation = useMutation({
        mutationFn: (bookingId: string) => bookingsService.checkOut({ id: bookingId, data: {} }),
        onSuccess: () => {
            toast.success('Guest checked out successfully');
            queryClient.invalidateQueries({ queryKey: ['booking', id] });
        },
        onError: () => toast.error('Failed to check-out'),
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="p-8 text-center bg-card rounded-3xl border border-border mt-8">
                <h3 className="text-xl font-black text-foreground mb-4">Booking Not Found</h3>
                <p className="text-muted-foreground mb-8">The booking you are looking for might have been removed or doesn't exist.</p>
                <button
                    onClick={() => navigate('/bookings')}
                    className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl font-black uppercase tracking-widest text-sm"
                >
                    Back to Bookings
                </button>
            </div>
        );
    }

    const property = (booking as any).property || booking.bookingRooms?.[0]?.room?.roomType?.property;
    const balanceDue = Number(booking.totalAmount) - Number(booking.paidAmount);
    const displayNights = Math.max(1, differenceInCalendarDays(new Date(booking.checkOutDate), new Date(booking.checkInDate)));



    const handleDownloadBackendPDF = async () => {
        try {
            setIsDownloading(true);
            const response = await api.get(`/bookings/invoice/${booking.id}/PARTNER`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const fileName = balanceDue > 0
                ? `Invoice_Performa_${booking.bookingNumber}.pdf`
                : `Invoice_${booking.bookingNumber}.pdf`;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Invoice downloaded from server');
        } catch (error) {
            console.error('Failed to download backend PDF', error);
            toast.error('Failed to generate PDF from server');
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <button
                        onClick={() => {
                            if (window.history.length > 1) {
                                navigate(-1);
                            } else {
                                navigate('/bookings');
                            }
                        }}
                        className="group flex items-center gap-2 text-sm text-muted-foreground hover:text-primary font-bold transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Back to Bookings
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-primary/10 text-primary rounded-3xl shadow-sm rotate-3">
                            <ShieldCheck className="h-8 w-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                                Booking #{booking.bookingNumber}
                                <span className={`text-[10px] px-3 py-1 rounded-full border ${booking.status === 'CONFIRMED' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                    booking.status === 'PENDING_PAYMENT' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                        'bg-muted text-muted-foreground border-border'
                                    } uppercase tracking-widest`}>
                                    {booking.status.replace('_', ' ')}
                                </span>
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 mt-1">
                                <p className="text-muted-foreground font-medium flex items-center gap-2">
                                    <Clock className="h-3.5 w-3.5" />
                                    Created on {format(new Date(booking.createdAt), 'PPP')} at {format(new Date(booking.createdAt), 'p')}
                                </p>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-full text-[11px] font-black uppercase tracking-wider">
                                    <Briefcase className="h-3.5 w-3.5" />
                                    Source: {booking.channelName || (booking as any).bookingSource?.name || 'RouteGuide PMS'}
                                </span>
                                {booking.createdBy && (
                                    <p className="text-primary font-bold text-[11px] flex items-center gap-2 uppercase tracking-wider">
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                        Created By: {booking.createdBy}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDownloadBackendPDF}
                        disabled={isDownloading}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:shadow-xl hover:shadow-primary/20 px-6 py-3 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        Download Invoice
                    </button>
                    {['CONFIRMED', 'RESERVED'].includes(booking.status) && (
                        <button
                            onClick={() => setCheckInBooking(booking)}
                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-xl hover:shadow-emerald-500/20 px-6 py-3 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest cursor-pointer"
                        >
                            <ShieldCheck className="h-4 w-4" />
                            Check In
                        </button>
                    )}
                    {booking.status === 'CHECKED_IN' && (
                        <button
                            onClick={() => {
                                if (window.confirm("Are you sure you want to check-out this guest?")) {
                                    checkOutMutation.mutate(booking.id);
                                }
                            }}
                            disabled={checkOutMutation.isPending}
                            className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white hover:shadow-xl hover:shadow-red-500/20 px-6 py-3 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest disabled:opacity-50"
                        >
                            {checkOutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                            Check Out
                        </button>
                    )}
                    {['CONFIRMED', 'RESERVED', 'NO_SHOW'].includes(booking.status) && (
                        <button
                            onClick={() => navigate(`/bookings/${booking.id}/reschedule`)}
                            className="inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white hover:shadow-xl hover:shadow-amber-500/20 px-6 py-3 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            <Calendar className="h-4 w-4" />
                            Update Booking
                        </button>
                    )}
                    {(booking as any).auditLogs && (booking as any).auditLogs.length > 0 && (
                        <button
                            onClick={() => setIsHistoryModalOpen(true)}
                            className="inline-flex items-center gap-2 border border-amber-600/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 hover:shadow-xl hover:shadow-amber-500/5 px-6 py-3 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            <Clock className="h-4 w-4" />
                            Reschedule History
                        </button>
                    )}
                    {booking.isManualBooking && booking.status !== 'CHECKED_IN' && booking.status !== 'CHECKED_OUT' && (
                        <button
                            onClick={() => navigate(`/bookings/${booking.id}/edit`)}
                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white hover:shadow-xl hover:shadow-indigo-500/20 px-6 py-3 rounded-2xl transition-all active:scale-95 text-xs font-black uppercase tracking-widest"
                        >
                            <Pencil className="h-4 w-4" />
                            Edit Booking
                        </button>
                    )}
                    {/* Additional actions if needed */}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Stay Info Card */}
                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity">
                            <Clock className="h-32 w-32 -rotate-12" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                            <div className="space-y-2">
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center gap-1.5 px-3 py-1 bg-muted/30 rounded-full w-fit">
                                    <Calendar className="h-3 w-3" /> Check In
                                </span>
                                <div className="pl-1">
                                    <p className="text-2xl font-black text-foreground">{format(new Date(booking.checkInDate), 'dd MMM')}</p>
                                    <p className="text-sm font-bold text-muted-foreground">{format(new Date(booking.checkInDate), 'yyyy')}</p>
                                    <p className="text-[11px] font-medium text-primary mt-1">
                                        {(booking as any).checkedInAt
                                            ? `Actual: ${format(new Date((booking as any).checkedInAt), 'MMM d, hh:mm a')}`
                                            : `Standard: ${format(new Date(`2000-01-01T${property?.defaultCheckInTime || '14:00'}:00`), 'hh:mm a')}`}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center justify-center py-4">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="px-4 py-1.5 bg-muted rounded-2xl text-[10px] font-black uppercase tracking-widest border border-border">
                                        {displayNights} Night(s)
                                    </div>
                                    <div className="w-16 h-[2px] bg-border relative">
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 text-right md:text-left">
                                <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest flex items-center md:justify-start justify-end gap-1.5 px-3 py-1 bg-muted/30 rounded-full w-fit ml-auto md:ml-0">
                                    <Calendar className="h-3 w-3" /> Check Out
                                </span>
                                <div className="pr-1">
                                    <p className="text-2xl font-black text-foreground">{format(new Date(booking.checkOutDate), 'dd MMM')}</p>
                                    <p className="text-sm font-bold text-muted-foreground">{format(new Date(booking.checkOutDate), 'yyyy')}</p>
                                    <p className="text-[11px] font-medium text-amber-600 mt-1">
                                        {(booking as any).checkedOutAt
                                            ? `Actual: ${format(new Date((booking as any).checkedOutAt), 'MMM d, hh:mm a')}`
                                            : `Standard: ${format(new Date(`2000-01-01T${property?.defaultCheckOutTime || '11:00'}:00`), 'hh:mm a')}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guests List */}
                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-3">
                                <User className="h-4 w-4 text-primary" />
                                Registered Guests ({booking.adultsCount} Adult{booking.adultsCount > 1 ? 's' : ''}, {booking.childrenCount} Child{booking.childrenCount !== 1 ? 'ren' : ''})
                            </h3>
                            {((booking as any).extraAdultsCount > 0 || (booking as any).extraChildrenCount > 0) && (
                                <span className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">
                                    +{(booking as any).extraAdultsCount || 0} Extra Adult(s), +{(booking as any).extraChildrenCount || 0} Extra Child(ren)
                                </span>
                            )}
                        </div>
                        <div className="space-y-4">
                            {/* Primary Booker */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-primary/5 rounded-3xl border border-primary/20">
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest">Primary Booker</span>
                                    <p className="text-sm font-black text-foreground">{booking.user?.firstName} {booking.user?.lastName}</p>
                                </div>
                                <div className="space-y-1 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-[11px] font-bold text-muted-foreground break-all">{booking.user?.email || 'N/A'}</p>
                                </div>
                                <div className="space-y-1 flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <p className="text-[11px] font-bold text-muted-foreground">{booking.user?.phone || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Other Registered Guests */}
                            {booking.guests?.filter((guest: any) => {
                                const samePhone = guest.phone && guest.phone === booking.user?.phone;
                                const sameName = guest.firstName === booking.user?.firstName && guest.lastName === booking.user?.lastName;
                                return !(samePhone || sameName);
                            }).map((guest: any, idx: number) => (
                                <div key={guest.id} className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-muted/20 rounded-3xl border border-border/50">
                                    <div className="space-y-1">
                                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Guest {idx + 1}</span>
                                        <p className="text-sm font-black text-foreground">{guest.firstName} {guest.lastName}</p>
                                    </div>
                                    <div className="space-y-1 flex items-center gap-2">
                                        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                        <p className="text-[11px] font-bold text-muted-foreground">{guest.idType || 'ID'}: {guest.idNumber || 'Not verified'}</p>
                                    </div>
                                    <div className="space-y-1 flex items-center gap-2">
                                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                        <p className="text-[11px] font-bold text-muted-foreground">{guest.phone || 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Special Requests Card */}
                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-3">
                            <Mail className="h-4 w-4 text-primary" />
                            Special Requests / Notes
                        </h3>
                        <div className="p-5 bg-muted/20 border border-border/30 rounded-3xl">
                            {booking.specialRequests ? (
                                <p className="text-xs font-semibold text-foreground leading-relaxed whitespace-pre-line italic">
                                    "{booking.specialRequests}"
                                </p>
                            ) : (
                                <p className="text-xs font-semibold text-muted-foreground italic leading-relaxed">
                                    No special requests or notes added. Click "Update Booking" to add notes.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Accommodation Card */}
                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-sm">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-8 flex items-center gap-3">
                            <House className="h-4 w-4 text-primary" />
                            Accommodation Breakdown
                        </h3>
                        <div className="space-y-6">
                            {/* Primary Room */}
                            {booking.bookingRooms && booking.bookingRooms.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 bg-muted/20 rounded-3xl border border-border/50">
                                    <div className="flex items-start gap-6">
                                        <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden flex-shrink-0">
                                            {booking.bookingRooms[0].room?.roomType?.images?.[0] ? (
                                                <img src={booking.bookingRooms[0].room.roomType.images[0]} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><House className="h-6 w-6 text-muted-foreground" /></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{booking.bookingRooms[0].room?.roomType?.name}</p>
                                            <p className="text-lg font-black text-foreground">Room Unit {booking.bookingRooms[0].room?.roomNumber}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Primary Accommodation</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 md:justify-end">
                                        <span className="text-[10px] px-3 py-1 bg-white rounded-full font-bold text-muted-foreground border border-border shadow-sm">{booking.adultsCount} Adults</span>
                                        <span className="text-[10px] px-3 py-1 bg-white rounded-full font-bold text-muted-foreground border border-border shadow-sm">{booking.childrenCount} Children</span>
                                    </div>
                                </div>
                            ) : null}

                            {/* Linked Rooms (Blocks) */}
                            {booking.bookingRooms?.slice(1).map((block: any) => (
                                <div key={block.roomId} className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center p-6 bg-muted/20 rounded-3xl border border-border/50">
                                    <div className="flex items-start gap-6">
                                        <div className="h-16 w-16 rounded-2xl bg-muted overflow-hidden flex-shrink-0">
                                            {block.room?.roomType?.images?.[0] ? (
                                                <img src={block.room.roomType.images[0]} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center"><House className="h-6 w-6 text-muted-foreground" /></div>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">{block.room?.roomType?.name}</p>
                                            <p className="text-lg font-black text-foreground">Room Unit {block.room?.roomNumber}</p>
                                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-tighter">Additional Room</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2 md:justify-end">
                                        <span className="text-[10px] px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full font-bold uppercase tracking-widest border border-emerald-100 italic">Blocked for Group</span>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 mt-4 border-t border-border/30">
                                <div className="flex items-center gap-3 px-4">
                                    <MapPin className="h-4 w-4 text-primary" />
                                    <div>
                                        <p className="text-xs font-bold text-foreground">{property?.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-medium">
                                            {property?.address}, {property?.city}, {property?.state}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Payment Summary */}
                <div className="space-y-8">
                    <div className="bg-card border border-border/50 rounded-[2.5rem] p-8 shadow-lg shadow-primary/5 sticky top-8">
                        <h3 className="text-sm font-black text-foreground uppercase tracking-widest mb-8">Payment Summary</h3>
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground font-bold">Base Rate</span>
                                    <span className="font-black text-foreground">₹{Number(booking.baseAmount).toLocaleString()}</span>
                                </div>
                                {Number(booking.offerDiscountAmount) > 0 && (
                                    <div className="flex justify-between text-sm items-center text-emerald-600 dark:text-emerald-400">
                                        <span className="font-bold">Offer Discount</span>
                                        <span className="font-black">-₹{Number(booking.offerDiscountAmount).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground font-bold">Extra Charges</span>
                                    <span className="font-black text-foreground">₹{(Number(booking.extraAdultAmount || 0) + Number(booking.extraChildAmount || 0)).toLocaleString()}</span>
                                </div>
                                {Number(booking.couponDiscountAmount) > 0 && (
                                    <div className="flex justify-between text-sm items-center text-emerald-600 dark:text-emerald-400">
                                        <span className="font-bold">Coupon Discount</span>
                                        <span className="font-black">-₹{Number(booking.couponDiscountAmount).toLocaleString()}</span>
                                    </div>
                                )}
                                {Number(booking.discountAmount) > 0 && Number(booking.offerDiscountAmount || 0) === 0 && Number(booking.couponDiscountAmount || 0) === 0 && (
                                    <div className="flex justify-between text-sm items-center text-emerald-600 dark:text-emerald-400">
                                        <span className="font-bold">Special Discount</span>
                                        <span className="font-black">-₹{Number(booking.discountAmount).toLocaleString()}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-muted-foreground font-bold">Taxes & Fees</span>
                                    <span className="font-black text-foreground">₹{Number(booking.taxAmount).toLocaleString()}</span>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border/50 space-y-6">
                                <div className="bg-muted/30 p-6 rounded-3xl border border-border">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Amount</span>
                                        <span className="text-2xl font-black text-foreground">₹{Number(booking.totalAmount).toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Paid Amount</span>
                                        <span className="text-[9px] text-emerald-500 font-bold uppercase">{booking.paymentMethod || 'ONLINE'}</span>
                                    </div>
                                    <span className="text-xl font-black text-emerald-600">₹{Number(booking.paidAmount).toLocaleString()}</span>
                                </div>

                                {balanceDue > 0 && (
                                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Balance Due</span>
                                            <span className="text-[9px] text-amber-500 font-bold uppercase italic">At Resort</span>
                                        </div>
                                        <span className="text-xl font-black text-amber-600">₹{balanceDue.toLocaleString()}</span>
                                    </div>
                                )}

                                {((booking as any).offlineCp || Number((booking as any).offlineCpCommission) > 0) && (
                                    <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-3xl border border-purple-200 dark:border-purple-800/40 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1.5">
                                                <Briefcase className="h-3.5 w-3.5" /> Offline Agent Payout
                                            </span>
                                            <span className="text-lg font-black text-purple-700 dark:text-purple-300">
                                                ₹{Number((booking as any).offlineCpCommission || 0).toLocaleString()}
                                            </span>
                                        </div>
                                        {(booking as any).offlineCp && (
                                            <div className="pt-2 border-t border-purple-200/60 dark:border-purple-800/30 text-xs">
                                                <p className="font-bold text-foreground font-sans">{(booking as any).offlineCp.name}</p>
                                                {(booking as any).offlineCp.phone && (
                                                    <p className="text-[11px] text-muted-foreground">Phone: {(booking as any).offlineCp.phone}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Payment History Link button */}
                            <div className="pt-4 overflow-hidden rounded-2xl">
                                <div
                                    onClick={() => setIsTransactionsOpen(true)}
                                    className="bg-primary/5 p-4 flex items-center justify-between group cursor-pointer hover:bg-primary/10 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-xl shadow-sm">
                                            <CreditCard className="h-4 w-4 text-primary" />
                                        </div>
                                        <span className="text-[10px] font-black text-primary uppercase tracking-widest">View Transactions</span>
                                    </div>
                                    <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions Modal */}
            {isTransactionsOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-2xl rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-primary/10 text-primary rounded-2xl">
                                    <Receipt className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Transaction History</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Payments for Booking #{booking.bookingNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTransactionsOpen(false)}
                                className="p-2 hover:bg-muted rounded-xl transition-colors"
                            >
                                <X className="h-6 w-6 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                            {!booking.payments || booking.payments.length === 0 ? (
                                <div className="text-center py-12">
                                    <CreditCard className="h-12 w-12 text-muted/30 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-bold">No transactions found for this booking.</p>
                                </div>
                            ) : (
                                booking.payments.map((payment: any, idx: number) => (
                                    <div key={payment.id} className="p-6 bg-muted/20 rounded-3xl border border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center font-black text-xs">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-foreground">₹{Number(payment.amount).toLocaleString()}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-tighter ${payment.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' :
                                                        payment.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600' :
                                                            'bg-red-500/10 text-red-600'
                                                        }`}>
                                                        {payment.status}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-bold italic">{payment.paymentMethod || 'Razorpay'}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date & Time</p>
                                            <p className="text-xs font-bold text-foreground">
                                                {payment.paymentDate ? format(new Date(payment.paymentDate), 'PPp') : format(new Date(payment.createdAt), 'PPp')}
                                            </p>
                                        </div>
                                    </div>
                                )
                                )
                            )}
                        </div>
                        <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                            <button
                                onClick={() => setIsTransactionsOpen(false)}
                                className="px-8 py-3 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-lg transition-all active:scale-95"
                            >
                                Close Window
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reschedule History Modal */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-4xl rounded-[2.5rem] border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-border flex items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-2xl">
                                    <Clock className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Reschedule History</h2>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Stay modification history for Booking #{booking.bookingNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="p-2 hover:bg-muted rounded-xl transition-colors"
                            >
                                <X className="h-6 w-6 text-muted-foreground" />
                            </button>
                        </div>
                        <div className="p-8 max-h-[60vh] overflow-y-auto space-y-6">
                            {!(booking as any).auditLogs || (booking as any).auditLogs.length === 0 ? (
                                <div className="text-center py-12">
                                    <Clock className="h-12 w-12 text-muted/30 mx-auto mb-4" />
                                    <p className="text-muted-foreground font-bold">No reschedule history found.</p>
                                </div>
                            ) : (
                                <div className="space-y-8 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border/60">
                                    {(booking as any).auditLogs.map((log: any, idx: number) => {
                                        const oldValue = log.oldValue || {};
                                        const newValue = log.newValue || {};
                                        const staffName = log.user ? `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim() : 'System';

                                        return (
                                            <div key={log.id} className="relative pl-8 animate-in fade-in duration-300">
                                                {/* Timeline node */}
                                                <div className="absolute left-0 top-1.5 -translate-x-[7px] w-4.5 h-4.5 rounded-full bg-amber-500 border-4 border-card shadow-sm" />
                                                
                                                <div className="space-y-4">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                        <h4 className="text-xs font-black text-foreground uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-xl w-fit">
                                                            Reschedule Event #{(booking as any).auditLogs.length - idx}
                                                        </h4>
                                                        <span className="text-[10px] text-muted-foreground font-bold flex items-center gap-1.5">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            {format(new Date(log.createdAt), 'PPp')} • By {staffName}
                                                        </span>
                                                    </div>

                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {/* Stay Dates */}
                                                        {(oldValue.checkInDate || oldValue.checkOutDate) && (
                                                            <div className="p-5 bg-muted/20 border border-border/50 rounded-3xl space-y-2">
                                                                <div className="text-[10px] font-black text-primary uppercase tracking-widest">Stay Dates</div>
                                                                <div className="text-xs font-bold text-muted-foreground flex items-center gap-3 flex-wrap">
                                                                    <span className="line-through opacity-70">
                                                                        {oldValue.checkInDate ? format(new Date(oldValue.checkInDate), 'dd MMM yyyy') : 'N/A'} – {oldValue.checkOutDate ? format(new Date(oldValue.checkOutDate), 'dd MMM yyyy') : 'N/A'}
                                                                    </span>
                                                                    <ArrowRight className="h-3.5 w-3.5 text-foreground shrink-0" />
                                                                    <span className="text-foreground bg-primary/10 text-primary px-2.5 py-0.5 rounded-lg">
                                                                        {newValue.checkInDate ? format(new Date(newValue.checkInDate), 'dd MMM yyyy') : 'N/A'} – {newValue.checkOutDate ? format(new Date(newValue.checkOutDate), 'dd MMM yyyy') : 'N/A'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Total Amount */}
                                                        {oldValue.totalAmount !== undefined && (
                                                            <div className="p-5 bg-muted/20 border border-border/50 rounded-3xl space-y-2">
                                                                <div className="text-[10px] font-black text-primary uppercase tracking-widest">Total Price</div>
                                                                <div className="text-xs font-bold text-muted-foreground flex items-center gap-3">
                                                                    <span className="line-through opacity-70">₹{Number(oldValue.totalAmount).toLocaleString()}</span>
                                                                    <ArrowRight className="h-3.5 w-3.5 text-foreground" />
                                                                    <span className="text-foreground font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-lg">
                                                                        ₹{Number(newValue.totalAmount).toLocaleString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Booker details */}
                                                        {oldValue.bookerName && (oldValue.bookerName !== newValue.bookerName || oldValue.bookerPhone !== newValue.bookerPhone || oldValue.bookerEmail !== newValue.bookerEmail || oldValue.bookerWhatsapp !== newValue.bookerWhatsapp) && (
                                                            <div className="p-5 bg-muted/20 border border-border/50 rounded-3xl space-y-3 col-span-1 md:col-span-2">
                                                                <div className="text-[10px] font-black text-primary uppercase tracking-widest">Booker / Contact Details Changes</div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                                    <div className="p-4 bg-background border border-border/30 rounded-2xl text-muted-foreground space-y-1">
                                                                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Previous State</p>
                                                                        <p className="font-bold text-foreground">{oldValue.bookerName || 'N/A'}</p>
                                                                        {oldValue.bookerPhone && <p>Phone: {oldValue.bookerPhone}</p>}
                                                                        {oldValue.bookerEmail && <p>Email: {oldValue.bookerEmail}</p>}
                                                                        {oldValue.bookerWhatsapp && <p>WhatsApp: {oldValue.bookerWhatsapp}</p>}
                                                                    </div>
                                                                    <div className="p-4 bg-background border border-border/30 rounded-2xl text-foreground space-y-1">
                                                                        <p className="text-[9px] font-black uppercase tracking-wider text-primary">New State</p>
                                                                        <p className="font-black text-foreground">{newValue.bookerName || 'N/A'}</p>
                                                                        {newValue.bookerPhone && <p>Phone: {newValue.bookerPhone}</p>}
                                                                        {newValue.bookerEmail && <p>Email: {newValue.bookerEmail}</p>}
                                                                        {newValue.bookerWhatsapp && <p>WhatsApp: {newValue.whatsappNumber || newValue.bookerWhatsapp || 'N/A'}</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Guest details */}
                                                        {oldValue.guestName && (oldValue.guestName !== newValue.guestName || oldValue.guestPhone !== newValue.guestPhone || oldValue.guestEmail !== newValue.guestEmail || oldValue.guestWhatsapp !== newValue.guestWhatsapp) && (
                                                            <div className="p-5 bg-muted/20 border border-border/50 rounded-3xl space-y-3 col-span-1 md:col-span-2">
                                                                <div className="text-[10px] font-black text-primary uppercase tracking-widest">Primary Guest Details Changes</div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                                    <div className="p-4 bg-background border border-border/30 rounded-2xl text-muted-foreground space-y-1">
                                                                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Previous State</p>
                                                                        <p className="font-bold text-foreground">{oldValue.guestName || 'N/A'}</p>
                                                                        {oldValue.guestPhone && <p>Phone: {oldValue.guestPhone}</p>}
                                                                        {oldValue.guestEmail && <p>Email: {oldValue.guestEmail}</p>}
                                                                        {oldValue.guestWhatsapp && <p>WhatsApp: {oldValue.guestWhatsapp}</p>}
                                                                    </div>
                                                                    <div className="p-4 bg-background border border-border/30 rounded-2xl text-foreground space-y-1">
                                                                        <p className="text-[9px] font-black uppercase tracking-wider text-primary">New State</p>
                                                                        <p className="font-black text-foreground">{newValue.guestName || 'N/A'}</p>
                                                                        {newValue.guestPhone && <p>Phone: {newValue.guestPhone}</p>}
                                                                        {newValue.guestEmail && <p>Email: {newValue.guestEmail}</p>}
                                                                        {newValue.guestWhatsapp && <p>WhatsApp: {newValue.guestWhatsapp || 'N/A'}</p>}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Special Requests Changes */}
                                                        {oldValue.specialRequests !== newValue.specialRequests && (
                                                            <div className="p-5 bg-muted/20 border border-border/50 rounded-3xl space-y-3 col-span-1 md:col-span-2">
                                                                <div className="text-[10px] font-black text-primary uppercase tracking-widest">Special Requests / Notes Changes</div>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                                                    <div className="p-4 bg-background border border-border/30 rounded-2xl text-muted-foreground space-y-1">
                                                                        <p className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">Previous Notes</p>
                                                                        <p className="italic">"{oldValue.specialRequests || 'No notes'}"</p>
                                                                    </div>
                                                                    <div className="p-4 bg-background border border-border/30 rounded-2xl text-foreground space-y-1">
                                                                        <p className="text-[9px] font-black uppercase tracking-wider text-primary">New State Notes</p>
                                                                        <p className="italic font-bold text-foreground">"{newValue.specialRequests || 'No notes'}"</p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-muted/30 border-t border-border flex justify-end">
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="px-8 py-3 bg-foreground text-background rounded-2xl font-black uppercase tracking-widest text-[10px] hover:shadow-lg transition-all active:scale-95"
                            >
                                Close History
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warning / Validation Modal */}
            {warningModal && warningModal.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl border border-border/50 text-center space-y-6 animate-in zoom-in-95 duration-200">
                        <div className={`mx-auto w-16 h-16 rounded-3xl flex items-center justify-center ${warningModal.type === 'BLOCK' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                            <AlertCircle className="h-8 w-8" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-foreground tracking-tight">{warningModal.title}</h3>
                            <p className="text-sm text-muted-foreground font-medium leading-relaxed">{warningModal.message}</p>
                        </div>
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={warningModal.onCancel}
                                className="flex-1 py-3.5 px-4 bg-muted hover:bg-muted/80 text-muted-foreground rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                            >
                                {warningModal.cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={warningModal.onConfirm}
                                className={`flex-1 py-3.5 px-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all text-white shadow-lg ${warningModal.type === 'BLOCK' ? 'bg-primary hover:bg-primary/90' : 'bg-amber-500 hover:bg-amber-600'}`}
                            >
                                {warningModal.confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Check-In Verification Modal */}
            {checkInBooking && (
                <CheckInVerificationModal
                    booking={checkInBooking}
                    onClose={() => setCheckInBooking(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['booking', id] });
                    }}
                />
            )}

        </div>
    );
};

export default BookingDetails;
