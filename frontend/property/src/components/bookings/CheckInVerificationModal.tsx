import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../../services/bookings';
import { paymentsService } from '../../services/payments';
import { uploadService } from '../../services/uploads';
import type { Booking } from '../../types/booking';
import { format, differenceInCalendarDays } from 'date-fns';
import toast from 'react-hot-toast';
import {
    ShieldCheck,
    Wallet,
    X,
    Calendar,
    Banknote,
    User as UserIcon,
    AlertCircle,
    CheckCircle2,
    Eye,
    Trash2,
    Loader2,
    Upload,
    ArrowRight
} from 'lucide-react';

export const ID_VALIDATION_PATTERNS: Record<string, { pattern: RegExp; message: string; sample: string }> = {
    AADHAR: { pattern: /^\d{12}$/, message: 'Aadhar must be exactly 12 digits', sample: 'e.g. 1234 5678 9012' },
    PASSPORT: { pattern: /^[A-Z][0-9]{7}$/, message: '1 Letter + 7 Digits (e.g. A1234567)', sample: 'e.g. A1234567' },
    VOTER_ID: { pattern: /^[A-Z]{3}[0-9]{7}$/, message: '3 Letters + 7 Digits', sample: 'e.g. ABC1234567' },
    DRIVING_LICENSE: { pattern: /^[A-Z]{2}[0-9]{13}$/, message: '2 Letters + 13 Digits', sample: 'e.g. MH1220100012345' },
    PAN: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Invalid PAN format', sample: 'e.g. ABCDE1234F' },
};

export interface CheckInVerificationModalProps {
    booking: Booking | null;
    onClose: () => void;
    onSuccess?: () => void;
}

export const CheckInVerificationModal: React.FC<CheckInVerificationModalProps> = ({
    booking,
    onClose,
    onSuccess
}) => {
    const queryClient = useQueryClient();

    const [verificationData, setVerificationData] = useState<any[]>([]);
    const [idErrors, setIdErrors] = useState<Record<string, string>>({});
    const [idTypeWarnings, setIdTypeWarnings] = useState<Record<string, { idNumber?: boolean; proof?: boolean }>>({});
    const [uploadingGuestId, setUploadingGuestId] = useState<string | null>(null);
    const [useCustomCheckIn, setUseCustomCheckIn] = useState<boolean>(false);
    const [customCheckInAt, setCustomCheckInAt] = useState<string>('');

    // Payment recording state inside modal
    const [isRecordingPayment, setIsRecordingPayment] = useState<boolean>(false);
    const [paymentAmount, setPaymentAmount] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'OTHER'>('CASH');
    const [paymentNotes, setPaymentNotes] = useState<string>('');

    useEffect(() => {
        if (booking) {
            setVerificationData((booking.guests || []).map((g: any) => ({
                id: g.id,
                idType: g.idType || '',
                idNumber: g.idNumber || '',
                idImage: g.idImage || '',
                idImageBack: g.idImageBack || ''
            })));
            setIdErrors({});
            setIdTypeWarnings({});
            setUseCustomCheckIn(false);
            setCustomCheckInAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
            setIsRecordingPayment(false);
            setPaymentAmount('');
            setPaymentNotes('');
        }
    }, [booking]);

    const checkInMutation = useMutation({
        mutationFn: (data: { id: string; data: any }) => bookingsService.checkIn(data),
        onSuccess: () => {
            toast.success('Guest checked in successfully');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['booking', booking?.id] });
            onSuccess?.();
            onClose();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to check-in');
        }
    });

    const recordPaymentMutation = useMutation({
        mutationFn: (data: { bookingId: string; amount: number; method: 'CASH' | 'UPI' | 'CARD' | 'OTHER'; notes?: string }) =>
            paymentsService.recordManual(data),
        onSuccess: () => {
            toast.success('Payment recorded successfully');
            setIsRecordingPayment(false);
            setPaymentAmount('');
            setPaymentNotes('');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['booking', booking?.id] });
            onSuccess?.();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to record payment');
        }
    });

    if (!booking) return null;

    const handleIdChange = (idx: number, field: string, value: string) => {
        const newData = [...verificationData];
        newData[idx][field] = value;
        setVerificationData(newData);

        if (field === 'idType' && value) {
            setIdTypeWarnings(prev => ({
                ...prev,
                [idx]: { idNumber: false, proof: false }
            }));
        }

        if (field === 'idNumber') {
            const guestType = newData[idx].idType;
            if (guestType && ID_VALIDATION_PATTERNS[guestType]) {
                const rule = ID_VALIDATION_PATTERNS[guestType];
                if (!rule.pattern.test(value)) {
                    setIdErrors(prev => ({ ...prev, [`${idx}-idNumber`]: rule.message }));
                } else {
                    setIdErrors(prev => {
                        const copy = { ...prev };
                        delete copy[`${idx}-idNumber`];
                        return copy;
                    });
                }
            } else {
                setIdErrors(prev => {
                    const copy = { ...prev };
                    delete copy[`${idx}-idNumber`];
                    return copy;
                });
            }
        }
    };

    const handleUploadImage = async (idx: number, file: File, isBack = false) => {
        const guest = verificationData[idx];
        const uploadId = `${isBack ? 'back' : 'front'}-${guest.id}`;
        setUploadingGuestId(uploadId);

        try {
            const res = await uploadService.upload(file);
            const newData = [...verificationData];
            if (isBack) {
                newData[idx].idImageBack = res.url;
            } else {
                newData[idx].idImage = res.url;
            }
            setVerificationData(newData);
            toast.success(`ID ${isBack ? 'back' : 'front'} uploaded successfully`);
        } catch (error) {
            toast.error('Upload failed');
        } finally {
            setUploadingGuestId(null);
        }
    };

    const unpaidBalance = Number(booking.totalAmount || 0) - Number(booking.paidAmount || 0);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (Object.keys(idErrors).length > 0) {
            toast.error('Please fix validation errors');
            return;
        }

        if (unpaidBalance > 0) {
            toast.error(`Please record remaining payment of ₹${unpaidBalance.toLocaleString()} first`);
            return;
        }

        // ID Verification Check
        const incompleteGuests = verificationData.filter(g => !g.idType || !g.idNumber || !g.idImage);
        if (incompleteGuests.length > 0) {
            toast.error('Please complete ID details for all guests');
            return;
        }

        checkInMutation.mutate({
            id: booking.id,
            data: {
                guests: verificationData,
                ...(useCustomCheckIn && customCheckInAt ? { checkedInAt: new Date(customCheckInAt).toISOString() } : {})
            }
        });
    };

    return (
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
                                <div className="flex items-center gap-2 mt-1">
                                    <p className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                                        Booking: <span className="text-primary font-bold">{booking.bookingNumber}</span>
                                        <span className="w-1 h-1 rounded-full bg-border" />
                                    </p>
                                    {booking.paymentOption === 'PAY_AT_PROPERTY' && (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500 text-white text-[10px] font-black uppercase rounded-md animate-pulse">
                                            <Wallet className="h-3 w-3" />
                                            Pay At Property
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-3 hover:bg-muted rounded-2xl transition-all hover:rotate-90 duration-300 cursor-pointer"
                        >
                            <X className="h-6 w-6 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="p-8 max-h-[70vh] overflow-y-auto space-y-8">
                        {/* Premium Financial Summary */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-3xl bg-muted/30 border border-border/30 space-y-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stay Info</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-4">
                                        {(() => {
                                            const hasBookingRooms = booking.bookingRooms && booking.bookingRooms.length > 0;
                                            if (!hasBookingRooms) {
                                                console.error(`[BOOKING_ROOMS_ERROR] Booking ${booking.id} has no bookingRooms assigned! Fallback to primary room.`);
                                                return (
                                                    <div>
                                                        <div className="text-lg font-black text-primary">Unit {booking.room?.roomNumber}</div>
                                                        <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{booking.room?.roomType?.name}</div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div className="space-y-3">
                                                    {booking.bookingRooms?.map((br: any, idx: number) => (
                                                        <div key={idx} className={idx > 0 ? "pt-3 border-t border-border/30" : ""}>
                                                            <div className="text-lg font-black text-primary">Unit {br.room?.roomNumber}</div>
                                                            <div className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{br.room?.roomType?.name}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-bold">{booking.checkInDate ? format(new Date(booking.checkInDate), 'MMM d') : ''} - {booking.checkOutDate ? format(new Date(booking.checkOutDate), 'MMM d') : ''}</div>
                                        <div className="text-[10px] text-muted-foreground">{booking ? Math.max(1, differenceInCalendarDays(new Date(booking.checkOutDate), new Date(booking.checkInDate))) : 0} Nights</div>
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
                                        <div className="text-2xl font-black text-amber-600">₹{unpaidBalance.toLocaleString()}</div>
                                    </div>
                                    <div className="text-right text-xs">
                                        <div className="text-muted-foreground">Total: ₹{Number(booking.totalAmount || 0).toLocaleString()}</div>
                                        <div className="text-emerald-600 font-bold">Paid: ₹{Number(booking.paidAmount || 0).toLocaleString()}</div>
                                        {booking.bookingCurrency && booking.bookingCurrency !== 'INR' && (
                                            <div className="text-primary/70 text-[9px] mt-1 italic">
                                                Booking: {booking.bookingCurrency} {Number(booking.amountInBookingCurrency).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Manual Payment Entry */}
                        {unpaidBalance > 0 && (
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
                                                setPaymentAmount(unpaidBalance.toString());
                                            }}
                                            className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline cursor-pointer"
                                        >
                                            Add Payment Record
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => setIsRecordingPayment(false)}
                                            className="text-[10px] font-black text-destructive uppercase tracking-widest hover:underline cursor-pointer"
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
                                                        bookingId: booking.id,
                                                        amount: Number(paymentAmount),
                                                        method: paymentMethod,
                                                        notes: paymentNotes
                                                    });
                                                }}
                                                className="w-full py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-amber-600/20 hover:bg-amber-700 transition-all disabled:opacity-50 cursor-pointer"
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

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <UserIcon className="h-4 w-4" /> Guest Documents
                                </h3>
                                <span className="px-3 py-1 bg-muted rounded-full text-[10px] font-bold text-muted-foreground">
                                    {booking.guests?.length || 0} Guests
                                </span>
                            </div>

                            {verificationData.map((guest: any, idx: number) => (
                                <div key={guest.id || idx} className="group p-6 rounded-[2rem] border border-border/50 bg-gradient-to-b from-card to-muted/10 space-y-6 hover:border-primary/30 transition-all duration-300">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-xl">
                                                {guest.id === verificationData[0]?.id ? 'P' : idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-foreground">
                                                    {booking.guests?.[idx]?.firstName} {booking.guests?.[idx]?.lastName}
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-tight">
                                                    <span>{booking.guests?.[idx]?.phone || 'No Phone'}</span>
                                                    <span className="w-1 h-1 rounded-full bg-border" />
                                                    <span>{guest.id === verificationData[0]?.id ? 'Primary Guest' : 'Additional Guest'}</span>
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
                                                        disabled={!guest.idType}
                                                        value={guest.idNumber}
                                                        onChange={(e) => handleIdChange(idx, 'idNumber', e.target.value)}
                                                        placeholder={guest.idType ? "Enter document number" : "Select ID Type first"}
                                                        className={`w-full bg-background border rounded-2xl px-4 py-3 text-sm font-bold tracking-wider focus:ring-4 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${idErrors[`${idx}-idNumber`]
                                                            ? 'border-destructive ring-destructive/10'
                                                            : 'border-border/50 focus:ring-primary/10 focus:border-primary'
                                                            }`}
                                                    />
                                                    {!guest.idType && (
                                                        <div
                                                            className="absolute inset-0 cursor-not-allowed z-10"
                                                            onClick={() => {
                                                                setIdTypeWarnings(prev => ({
                                                                    ...prev,
                                                                    [idx]: { ...(prev[idx] || {}), idNumber: true }
                                                                }));
                                                            }}
                                                        />
                                                    )}
                                                    {idErrors[`${idx}-idNumber`] ? (
                                                        <AlertCircle className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive z-0" />
                                                    ) : guest.idNumber && (
                                                        <CheckCircle2 className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-500 z-0" />
                                                    )}
                                                </div>
                                                {idErrors[`${idx}-idNumber`] ? (
                                                    <p className="text-[10px] text-destructive font-bold pl-1 mt-1">{idErrors[`${idx}-idNumber`]}</p>
                                                ) : idTypeWarnings[idx]?.idNumber && !guest.idType ? (
                                                    <p className="text-[10px] text-amber-500 font-bold pl-1 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                                        <AlertCircle className="h-3.5 w-3.5 inline text-amber-500" /> Please select the ID type first
                                                    </p>
                                                ) : guest.idType && ID_VALIDATION_PATTERNS[guest.idType] && !idErrors[`${idx}-idNumber`] && (
                                                    <p className="text-[10px] text-muted-foreground font-medium pl-1 mt-1 opacity-70">
                                                        {ID_VALIDATION_PATTERNS[guest.idType].sample}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1 block text-center md:text-left">Identity Proof (Front & Optional Back)</label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {/* Front Side */}
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider pl-1">Front Side</span>
                                                    {guest.idImage ? (
                                                        <div className="relative group rounded-[1.5rem] overflow-hidden border border-border/50 aspect-video bg-muted/30 shadow-sm hover:shadow-xl hover:border-primary transition-all duration-300">
                                                            <img
                                                                src={guest.idImage}
                                                                alt="Front Side"
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
                                                        <label
                                                            onClick={(e) => {
                                                                if (!guest.idType) {
                                                                    e.preventDefault();
                                                                    setIdTypeWarnings(prev => ({
                                                                        ...prev,
                                                                        [idx]: { ...(prev[idx] || {}), proof: true }
                                                                    }));
                                                                }
                                                            }}
                                                            className={`relative h-[106px] flex flex-col items-center justify-center border-2 border-dashed border-primary/20 bg-primary/5 rounded-[1.5rem] transition-all group overflow-hidden ${!guest.idType ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/10 hover:border-primary/40'}`}
                                                        >
                                                            {uploadingGuestId === `front-${guest.id}` ? (
                                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <div className="p-2.5 bg-primary/10 rounded-2xl mb-1 group-hover:scale-110 transition-transform">
                                                                        <Upload className="h-4.5 w-4.5 text-primary" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Upload Front</span>
                                                                    <input
                                                                        type="file"
                                                                        disabled={!guest.idType}
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleUploadImage(idx, file, false);
                                                                        }}
                                                                    />
                                                                </>
                                                            )}
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Back Side */}
                                                <div className="space-y-1">
                                                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider pl-1">Back Side (Optional)</span>
                                                    {guest.idImageBack ? (
                                                        <div className="relative group rounded-[1.5rem] overflow-hidden border border-border/50 aspect-video bg-muted/30 shadow-sm hover:shadow-xl hover:border-primary transition-all duration-300">
                                                            <img
                                                                src={guest.idImageBack}
                                                                alt="Back Side"
                                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            />
                                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px] gap-3">
                                                                <a
                                                                    href={guest.idImageBack}
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
                                                                        newData[idx].idImageBack = '';
                                                                        setVerificationData(newData);
                                                                    }}
                                                                    className="p-3 bg-destructive/20 hover:bg-destructive/40 rounded-2xl text-white transition-all transform hover:-translate-y-1"
                                                                >
                                                                    <Trash2 className="h-5 w-5" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <label
                                                            onClick={(e) => {
                                                                if (!guest.idType) {
                                                                    e.preventDefault();
                                                                    setIdTypeWarnings(prev => ({
                                                                        ...prev,
                                                                        [idx]: { ...(prev[idx] || {}), proof: true }
                                                                    }));
                                                                }
                                                            }}
                                                            className={`relative h-[106px] flex flex-col items-center justify-center border-2 border-dashed border-primary/20 bg-primary/5 rounded-[1.5rem] transition-all group overflow-hidden ${!guest.idType ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-primary/10 hover:border-primary/40'}`}
                                                        >
                                                            {uploadingGuestId === `back-${guest.id}` ? (
                                                                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <div className="p-2.5 bg-primary/10 rounded-2xl mb-1 group-hover:scale-110 transition-transform">
                                                                        <Upload className="h-4.5 w-4.5 text-primary" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">Upload Back</span>
                                                                    <input
                                                                        type="file"
                                                                        disabled={!guest.idType}
                                                                        className="hidden"
                                                                        accept="image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) handleUploadImage(idx, file, true);
                                                                        }}
                                                                    />
                                                                </>
                                                            )}
                                                        </label>
                                                    )}
                                                </div>
                                            </div>
                                            {idTypeWarnings[idx]?.proof && !guest.idType && (
                                                <p className="text-[10px] text-amber-500 font-bold pl-1 mt-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                                    <AlertCircle className="h-3.5 w-3.5 inline text-amber-500" /> Please select the ID type first
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                                {/* Custom Check-In Time Override */}
                                <div className="p-6 rounded-[2rem] border border-border/50 bg-muted/20 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={useCustomCheckIn}
                                            onChange={(e) => setUseCustomCheckIn(e.target.checked)}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                        />
                                        <span className="text-xs font-black text-foreground uppercase tracking-wider">
                                            Custom Check-In Time (Staff Override)
                                        </span>
                                    </label>

                                    {useCustomCheckIn && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                                Actual Check-In Date & Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={customCheckInAt}
                                                onChange={(e) => setCustomCheckInAt(e.target.value)}
                                                className="w-full bg-background border border-border/50 rounded-xl px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-foreground"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-8 border-t border-border/50 bg-muted/10 flex gap-4">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-8 py-4 bg-background border border-border/50 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-muted transition-all active:scale-95 cursor-pointer"
                                >
                                    Later
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkInMutation.isPending || uploadingGuestId !== null}
                                    className={`flex-1 px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-[0.98] flex items-center justify-center gap-3 group shadow-lg ${((Number(booking.totalAmount || 0) - Number(booking.paidAmount || 0) > 0) || verificationData.some(g => !g.idType || !g.idNumber || !g.idImage))
                                        ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-70'
                                        : 'bg-primary text-primary-foreground hover:shadow-[0_20px_40px_-12px_rgba(var(--primary),0.3)] shadow-primary/20 cursor-pointer'
                                        }`}
                                >
                                    {checkInMutation.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <>
                                            {Number(booking.totalAmount || 0) - Number(booking.paidAmount || 0) > 0
                                                ? 'Payment Required'
                                                : verificationData.some(g => !g.idType || !g.idNumber || !g.idImage)
                                                    ? 'ID Verification Required'
                                                    : 'Complete Check-In Process'
                                            }
                                            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            );
        };
