import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { bookingsService } from '../../services/bookings';
import { BookingStatus } from '../../types/booking';
import type { Booking } from '../../types/booking';
import { format } from 'date-fns';
import {
    Loader2,
    Search,
    Filter,
    LogOut,
    XCircle,
    MoreVertical,
    Calendar,
    ShieldCheck,
    X,
    User as UserIcon,
    ArrowRight,
    Eye,
    // Image as ImageIcon,
    Upload,
    CheckCircle2,
    AlertCircle,
    Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { uploadService } from '../../services/uploads';
import { paymentsService } from '../../services/payments';
import { Banknote } from 'lucide-react';

const ID_VALIDATION_PATTERNS: Record<string, { pattern: RegExp; message: string }> = {
    AADHAR: { pattern: /^\d{12}$/, message: 'Aadhar must be exactly 12 digits' },
    PASSPORT: { pattern: /^[A-Z][0-9]{7}$/, message: 'Invalid Passport format' },
    VOTER_ID: { pattern: /^[A-Z]{3}[0-9]{7}$/, message: 'Invalid Voter ID format' },
};

export default function BookingsList() {
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { selectedProperty } = useProperty();
    const queryClient = useQueryClient();
    const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);
    const [idErrors, setIdErrors] = useState<Record<string, string>>({});
    const [uploadingGuestId, setUploadingGuestId] = useState<string | null>(null);
    const [verificationData, setVerificationData] = useState<any[]>([]);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'OTHER'>('CASH');
    const [isRecordingPayment, setIsRecordingPayment] = useState(false);
    const [paymentNotes, setPaymentNotes] = useState('');

    const handleOpenCheckIn = (booking: Booking) => {
        setCheckInBooking(booking);
        setVerificationData(booking.guests.map((g: any) => ({
            id: g.id,
            idType: g.idType || '',
            idNumber: g.idNumber || '',
            idImage: g.idImage || ''
        })));
        setIdErrors({});
    };

    const handleIdChange = (idx: number, field: string, value: string) => {
        const newData = [...verificationData];
        newData[idx][field] = value;
        setVerificationData(newData);

        // Validation
        if (field === 'idNumber' || field === 'idType') {
            const guest = newData[idx];
            const patternObj = ID_VALIDATION_PATTERNS[guest.idType];
            if (patternObj && guest.idNumber && !patternObj.pattern.test(guest.idNumber.replace(/\s/g, ''))) {
                setIdErrors((prev: any) => ({ ...prev, [`${idx}-idNumber`]: patternObj.message }));
            } else {
                setIdErrors((prev: any) => {
                    const next = { ...prev };
                    delete next[`${idx}-idNumber`];
                    return next;
                });
            }
        }
    };

    const handleUploadImage = async (idx: number, file: File) => {
        const guestId = verificationData[idx].id;
        try {
            setUploadingGuestId(guestId);
            const res = await uploadService.upload(file);
            const newData = [...verificationData];
            newData[idx].idImage = res.url;
            setVerificationData(newData);
            toast.success('ID uploaded successfully');
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploadingGuestId(null);
        }
    };

    const { data: bookings, isLoading, error } = useQuery<Booking[]>({
        queryKey: ['bookings', statusFilter, selectedProperty?.id],
        queryFn: () => bookingsService.getAll({
            status: statusFilter || undefined,
            propertyId: selectedProperty?.id
        }),
        enabled: !!selectedProperty?.id,
    });

    const checkInMutation = useMutation({
        mutationFn: bookingsService.checkIn,
        onSuccess: () => {
            toast.success('Guest checked in successfully');
            setCheckInBooking(null);
            setPaymentAmount('');
            setPaymentNotes('');
            setIsRecordingPayment(false);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to check-in');
        },
    });

    const recordPaymentMutation = useMutation({
        mutationFn: paymentsService.recordManual,
        onSuccess: () => {
            toast.success('Payment recorded successfully');
            setPaymentAmount('');
            setPaymentNotes('');
            setIsRecordingPayment(false);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to record payment');
        },
    });

    const checkOutMutation = useMutation({
        mutationFn: bookingsService.checkOut,
        onSuccess: () => {
            toast.success('Guest checked out successfully');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: () => toast.error('Failed to check-out'),
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => bookingsService.cancel(id),
        onSuccess: () => {
            toast.success('Booking cancelled');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: () => toast.error('Failed to cancel booking'),
    });

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.CONFIRMED:
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            case BookingStatus.CHECKED_IN:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            case BookingStatus.CHECKED_OUT:
                return 'bg-muted text-muted-foreground';
            case BookingStatus.PENDING_PAYMENT:
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
            case BookingStatus.CANCELLED:
                return 'bg-destructive/10 text-destructive';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                Error loading bookings. Please try again.
            </div>
        );
    }

    return (
        <>
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage reservations and guests</p>
                    </div>
                    <Link
                        to="/bookings/create"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        New Booking
                    </Link>
                </div>

                <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by guest name or booking ID..."
                                className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                                <option value="">All Statuses</option>
                                <option value="CONFIRMED">Confirmed</option>
                                <option value="CHECKED_IN">Checked In</option>
                                <option value="CHECKED_OUT">Checked Out</option>
                                <option value="PENDING_PAYMENT">Pending Payment</option>
                                <option value="CANCELLED">Cancelled</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking Info</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Room</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dates</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {bookings?.map((booking: Booking) => (
                                    <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary">{booking.bookingNumber}</div>
                                            <div className="text-xs text-muted-foreground">
                                                {booking.isManualBooking ? 'Manual' : 'Online'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">
                                                {booking.user.firstName} {booking.user.lastName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{booking.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">Unit {booking.room.roomNumber}</div>
                                            <div className="text-xs text-muted-foreground">{booking.room.roomType?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">
                                                {format(new Date(booking.checkInDate), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {booking.numberOfNights} nights
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1.5">
                                                <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-full border ${booking.paymentStatus === 'FULL'
                                                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                    : booking.paymentStatus === 'PARTIAL'
                                                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                                                    }`}>
                                                    {booking.paymentStatus}
                                                </span>
                                                <div className="text-[10px] text-muted-foreground font-bold tracking-tight">
                                                    <div>₹{Number(booking.paidAmount).toLocaleString()} / ₹{Number(booking.totalAmount).toLocaleString()}</div>
                                                    {booking.bookingCurrency && booking.bookingCurrency !== 'INR' && (
                                                        <div className="text-[9px] text-primary/70">
                                                            ({booking.bookingCurrency} {Number(booking.amountInBookingCurrency).toLocaleString()})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2.5 inline-flex text-[11px] leading-5 font-bold rounded-full border ${getStatusColor(
                                                    booking.status
                                                )}`}
                                            >
                                                {booking.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-3">
                                                {booking.status === BookingStatus.CONFIRMED && (
                                                    <button
                                                        onClick={() => handleOpenCheckIn(booking)}
                                                        className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white p-2.5 rounded-2xl transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-90"
                                                        title="Verify & Check In"
                                                    >
                                                        <ShieldCheck className="h-5 w-5" />
                                                    </button>
                                                )}

                                                {booking.status === BookingStatus.CHECKED_IN && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Check-out this guest?')) checkOutMutation.mutate(booking.id);
                                                        }}
                                                        className="text-gray-600 hover:text-gray-900"
                                                        title="Check Out"
                                                    >
                                                        <LogOut className="h-4 w-4" />
                                                    </button>
                                                )}

                                                {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING_PAYMENT) && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Cancel this booking?')) cancelMutation.mutate(booking.id);
                                                        }}
                                                        className="text-destructive hover:text-destructive/80"
                                                        title="Cancel"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                )}

                                                <button className="text-muted-foreground hover:text-foreground">
                                                    <MoreVertical className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {bookings?.length === 0 && (
                        <div className="p-8 text-center text-muted-foreground font-medium">
                            No bookings found matching your criteria.
                        </div>
                    )}
                </div>
            </div>

            {/* Check-In Verification Modal */}
            {checkInBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/40 backdrop-blur-xl">
                    <div className="bg-card w-full max-w-2xl rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-border/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                        <div className="relative p-8 border-b border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-transparent">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-primary text-primary-foreground rounded-2xl shadow-lg rotate-3">
                                        <ShieldCheck className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black tracking-tight text-foreground">Verification Center</h2>
                                        <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                            Booking: <span className="text-primary font-bold">{checkInBooking.bookingNumber}</span>
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            Required for security compliance
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setCheckInBooking(null)}
                                    className="p-3 hover:bg-muted rounded-2xl transition-all hover:rotate-90 duration-300"
                                >
                                    <X className="h-6 w-6 text-muted-foreground" />
                                </button>
                            </div>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (Object.keys(idErrors).length > 0) {
                                toast.error('Please fix validation errors');
                                return;
                            }
                            checkInMutation.mutate({
                                id: checkInBooking.id,
                                data: { guests: verificationData }
                            });
                        }}>
                            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                                {/* Premium Financial Summary */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-5 rounded-3xl bg-muted/30 border border-border/30 space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stay Info</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="text-lg font-bold">Unit {checkInBooking.room.roomNumber}</div>
                                                <div className="text-xs text-muted-foreground">{checkInBooking.room.roomType.name}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold">{format(new Date(checkInBooking.checkInDate), 'MMM d')} - {format(new Date(checkInBooking.checkOutDate), 'MMM d')}</div>
                                                <div className="text-[10px] text-muted-foreground">{checkInBooking.numberOfNights} Nights</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 rounded-3xl bg-primary/5 border border-primary/10 space-y-3">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ShieldCheck className="h-4 w-4 text-primary/60" />
                                            <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Financials</span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <div className="text-[10px] text-muted-foreground font-bold">UNPAID BALANCE</div>
                                                <div className="text-2xl font-black text-amber-600">₹{(Number(checkInBooking.totalAmount) - Number(checkInBooking.paidAmount)).toLocaleString()}</div>
                                            </div>
                                            <div className="text-right text-xs">
                                                <div className="text-muted-foreground">Total: ₹{Number(checkInBooking.totalAmount).toLocaleString()}</div>
                                                <div className="text-emerald-600 font-bold">Paid: ₹{Number(checkInBooking.paidAmount).toLocaleString()}</div>
                                                {checkInBooking.bookingCurrency && checkInBooking.bookingCurrency !== 'INR' && (
                                                    <div className="text-primary/70 text-[9px] mt-1 italic">
                                                        Booking: {checkInBooking.bookingCurrency} {Number(checkInBooking.amountInBookingCurrency).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Manual Payment Entry */}
                                {Number(checkInBooking.totalAmount) - Number(checkInBooking.paidAmount) > 0 && (
                                    <div className="p-6 rounded-[2rem] border-2 border-amber-500/20 bg-amber-500/5 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Banknote className="h-5 w-5 text-amber-600" />
                                                <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">Record Payment</h3>
                                            </div>
                                            {!isRecordingPayment ? (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setIsRecordingPayment(true);
                                                        setPaymentAmount((Number(checkInBooking.totalAmount) - Number(checkInBooking.paidAmount)).toString());
                                                    }}
                                                    className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline"
                                                >
                                                    Add Payment Record
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsRecordingPayment(false)}
                                                    className="text-[10px] font-black text-destructive uppercase tracking-widest hover:underline"
                                                >
                                                    Cancel
                                                </button>
                                            )}
                                        </div>

                                        {isRecordingPayment && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        value={paymentAmount}
                                                        onChange={(e) => setPaymentAmount(e.target.value)}
                                                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">Method</label>
                                                    <select
                                                        value={paymentMethod}
                                                        onChange={(e) => setPaymentMethod(e.target.value as any)}
                                                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
                                                    >
                                                        <option value="CASH">Cash</option>
                                                        <option value="UPI">UPI / QR</option>
                                                        <option value="CARD">Card</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-end">
                                                    <button
                                                        type="button"
                                                        disabled={recordPaymentMutation.isPending || !paymentAmount}
                                                        onClick={() => {
                                                            recordPaymentMutation.mutate({
                                                                bookingId: checkInBooking.id,
                                                                amount: Number(paymentAmount),
                                                                method: paymentMethod,
                                                                notes: paymentNotes
                                                            });
                                                        }}
                                                        className="w-full py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all disabled:opacity-50"
                                                    >
                                                        {recordPaymentMutation.isPending ? 'Processing...' : 'Save Payment'}
                                                    </button>
                                                </div>
                                                <div className="md:col-span-3 space-y-1.5">
                                                    <input
                                                        type="text"
                                                        value={paymentNotes}
                                                        onChange={(e) => setPaymentNotes(e.target.value)}
                                                        placeholder="Optional notes (e.g., Transaction ID, reference...)"
                                                        className="w-full bg-background border border-border/50 rounded-xl px-4 py-2 text-xs focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                drum

                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                            <UserIcon className="h-4 w-4" /> Guest Documents
                                        </h3>
                                        <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground">
                                            {checkInBooking.guests.length} Guests
                                        </span>
                                    </div>

                                    {verificationData.map((guest: any, idx: number) => (
                                        <div key={guest.id} className="group p-6 rounded-[2rem] border border-border/50 bg-gradient-to-b from-card to-muted/10 space-y-6 hover:border-primary/30 transition-all duration-300">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                                        {guest.id === verificationData[0].id ? 'P' : idx + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-lg text-foreground">
                                                            {checkInBooking.guests[idx].firstName} {checkInBooking.guests[idx].lastName}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                            <span>{checkInBooking.guests[idx].phone || 'No Phone'}</span>
                                                            <span className="w-1 h-1 rounded-full bg-border" />
                                                            <span>{guest.id === verificationData[0].id ? 'Primary Guest' : 'Additional Guest'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">ID Type</label>
                                                        <select
                                                            value={guest.idType}
                                                            onChange={(e) => handleIdChange(idx, 'idType', e.target.value)}
                                                            className="w-full bg-background border border-border/50 rounded-2xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all appearance-none cursor-pointer"
                                                        >
                                                            <option value="">Select ID Type</option>
                                                            <option value="AADHAR">Aadhar Card</option>
                                                            <option value="PASSPORT">Passport</option>
                                                            <option value="VOTER_ID">Voter ID</option>
                                                            <option value="DRIVING_LICENSE">Driving License</option>
                                                            <option value="OTHER">Other Identification</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">ID Number</label>
                                                        <div className="relative">
                                                            <input
                                                                type="text"
                                                                value={guest.idNumber}
                                                                onChange={(e) => handleIdChange(idx, 'idNumber', e.target.value)}
                                                                placeholder="Enter document number"
                                                                className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm font-bold tracking-wider focus:ring-4 outline-none transition-all ${idErrors[`${idx}-idNumber`]
                                                                    ? 'border-destructive ring-destructive/10'
                                                                    : 'border-border/50 focus:ring-primary/10 focus:border-primary'
                                                                    }`}
                                                            />
                                                            {idErrors[`${idx}-idNumber`] ? (
                                                                <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
                                                            ) : guest.idNumber && (
                                                                <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500" />
                                                            )}
                                                        </div>
                                                        {idErrors[`${idx}-idNumber`] && (
                                                            <p className="text-[10px] text-destructive font-bold pl-1 mt-1">{idErrors[`${idx}-idNumber`]}</p>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1 block text-center md:text-left">Identity Proof</label>
                                                    {guest.idImage ? (
                                                        <div className="relative group rounded-[1.5rem] overflow-hidden border border-border/50 aspect-video bg-muted/30 shadow-sm hover:shadow-xl hover:border-primary transition-all duration-300">
                                                            <img
                                                                src={guest.idImage}
                                                                alt="Identity Proof"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px] gap-3">
                                                                <a
                                                                    href={guest.idImage}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all transform hover:-translate-y-1"
                                                                >
                                                                    <Eye className="h-5 w-5" />
                                                                </a>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newData = [...verificationData];
                                                                        newData[idx].idImage = '';
                                                                        setVerificationData(newData);
                                                                    }}
                                                                    className="p-3 bg-destructive/20 hover:bg-destructive/40 rounded-2xl text-white transition-all transform hover:-translate-y-1"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <label className="relative h-[106px] flex flex-col items-center justify-center border-2 border-dashed border-primary/20 bg-primary/5 rounded-[1.5rem] cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-all group overflow-hidden">
                                                            {uploadingGuestId === guest.id ? (
                                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <div className="p-3 bg-primary/10 rounded-2xl mb-2 group-hover:scale-110 transition-transform">
                                                                        <Upload className="h-5 w-5 text-primary" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Upload ID Document</span>
                                                                    <input
                                                                        type="file"
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleUploadImage(idx, file);
                                                                        }}
                                                                    />
                                                                </>
                                                            )}
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-8 border-t border-border/50 bg-muted/10 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setCheckInBooking(null)}
                                    className="px-8 py-4 bg-background border border-border/50 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-muted transition-all active:scale-95"
                                >
                                    Later
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkInMutation.isPending || uploadingGuestId !== null}
                                    className="flex-1 px-8 py-4 bg-primary text-primary-foreground rounded-2xl font-black text-sm uppercase tracking-widest hover:shadow-[0_20px_40px_-12px_rgba(var(--primary),0.3)] shadow-lg shadow-primary/20 disabled:opacity-50 transition-all active:scale-[0.98] flex items-center justify-center gap-3 group"
                                >
                                    {checkInMutation.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            Complete Check-In Process
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
