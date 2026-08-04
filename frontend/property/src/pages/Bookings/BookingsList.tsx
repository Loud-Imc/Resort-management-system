import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { bookingsService } from '../../services/bookings';
import api from '../../services/api';
import { BookingStatus } from '../../types/booking';
import type { Booking } from '../../types/booking';
import { format, differenceInCalendarDays } from 'date-fns';
import {
    Loader2,
    Search,
    LogOut,
    XCircle,
    MoreVertical,
    Calendar,
    ShieldCheck,
    X,
    Eye,
    AlertCircle,
    Trash2,
    Pencil
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { uploadService } from '../../services/uploads';
import { paymentsService } from '../../services/payments';
import { Download, Wallet } from 'lucide-react';
import { CheckInVerificationModal } from '../../components/bookings/CheckInVerificationModal';

const ID_VALIDATION_PATTERNS: Record<string, { pattern: RegExp; message: string; sample: string }> = {
    AADHAR: { pattern: /^\d{12}$/, message: 'Aadhar must be exactly 12 digits', sample: 'e.g. 1234 5678 9012' },
    PASSPORT: { pattern: /^[A-Z][0-9]{7}$/, message: '1 Letter + 7 Digits (e.g. A1234567)', sample: 'e.g. A1234567' },
    VOTER_ID: { pattern: /^[A-Z]{3}[0-9]{7}$/, message: '3 Letters + 7 Digits', sample: 'e.g. ABC1234567' },
    DRIVING_LICENSE: { pattern: /^[A-Z]{2}[0-9]{13}$/, message: '2 Letters + 13 Digits', sample: 'e.g. MH1220100012345' },
    PAN: { pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, message: 'Invalid PAN format', sample: 'e.g. ABCDE1234F' },
};

export default function BookingsList() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
    const [searchTerm, setSearchTerm] = useState<string>(searchParams.get('search') || '');
    const { selectedProperty } = useProperty();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);

    const [showCheckOutModal, setShowCheckOutModal] = useState<boolean>(false);
    const [checkOutBooking, setCheckOutBooking] = useState<Booking | null>(null);
    const [useCustomCheckOut, setUseCustomCheckOut] = useState<boolean>(false);
    const [customCheckOutAt, setCustomCheckOutAt] = useState<string>('');

    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadBooking, setDownloadBooking] = useState<Booking | null>(null);
    const [activeMenu, setActiveMenu] = useState<string | null>(null);

    // Deletion Modal State
    const [deletingBooking, setDeletingBooking] = useState<Booking | null>(null);
    const [dependencies, setDependencies] = useState<any>(null);

    const [isLoadingDeps, setIsLoadingDeps] = useState(false);

    // Warning Modal State
    const [warningModal, setWarningModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'BLOCK' | 'WARNING';
        onConfirm?: () => void;
        onCancel: () => void;
        confirmText?: string;
        cancelText?: string;
    } | null>(null);

    const [startDate, setStartDate] = useState<string>(searchParams.get('startDate') || '');
    const [endDate, setEndDate] = useState<string>(searchParams.get('endDate') || '');

    // Sync state with URL params on changes
    useEffect(() => {
        const queryStart = searchParams.get('startDate');
        const queryEnd = searchParams.get('endDate');
        const queryStatus = searchParams.get('status');
        const querySearch = searchParams.get('search');
        if (queryStart !== null && queryStart !== startDate) setStartDate(queryStart);
        if (queryEnd !== null && queryEnd !== endDate) setEndDate(queryEnd);
        if (queryStatus !== null && queryStatus !== statusFilter) setStatusFilter(queryStatus);
        if (querySearch !== null && querySearch !== searchTerm) setSearchTerm(querySearch);
    }, [searchParams]);

    // Sync statusFilter changes to URL search parameters
    useEffect(() => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            if (statusFilter) {
                next.set('status', statusFilter);
            } else {
                next.delete('status');
            }
            return next;
        });
    }, [statusFilter, setSearchParams]);

    // Debounce syncing searchTerm changes to URL search parameters (300ms)
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchParams(prev => {
                const next = new URLSearchParams(prev);
                if (searchTerm) {
                    next.set('search', searchTerm);
                } else {
                    next.delete('search');
                }
                return next;
            });
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm, setSearchParams]);

    const handleRowClick = (e: React.MouseEvent, bookingId: string) => {
        if ((e.target as HTMLElement).closest('button, a, select, input, [role="button"]')) {
            return;
        }
        navigate(`/bookings/${bookingId}`);
    };

    // Rescheduling — navigate to dedicated page
    const handleOpenReschedule = (booking: Booking) => {
        navigate(`/bookings/${booking.id}/reschedule`);
    };

    const handleOpenCheckIn = (booking: Booking) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkInDate = new Date(booking.checkInDate);
        checkInDate.setHours(0, 0, 0, 0);

        const openCheckInModal = () => {
            setCheckInBooking(booking);
        };

        if (checkInDate.getTime() > today.getTime()) {
            setWarningModal({
                isOpen: true,
                title: "Invalid Check-In Date",
                message: "You have to reschedule the booking to today to do a check-in today.",
                type: 'BLOCK',
                onConfirm: () => {
                    setWarningModal(null);
                    handleOpenReschedule(booking);
                },
                confirmText: "Reschedule Now",
                onCancel: () => setWarningModal(null),
                cancelText: "Cancel"
            });
            return;
        }

        if (checkInDate.getTime() < today.getTime()) {
            setWarningModal({
                isOpen: true,
                title: "Late Check-In Warning",
                message: "The scheduled check-in date is in the past. Are you sure you want to proceed with checking in now?",
                type: 'WARNING',
                onConfirm: () => {
                    setWarningModal(null);
                    openCheckInModal();
                },
                confirmText: "Proceed Anyway",
                onCancel: () => setWarningModal(null),
                cancelText: "Cancel"
            });
            return;
        }

        openCheckInModal();
    };

    const handleOpenCheckOut = (booking: Booking) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkOutDate = new Date(booking.checkOutDate);
        checkOutDate.setHours(0, 0, 0, 0);

        const openCheckOutModal = () => {
            setCheckOutBooking(booking);
            setShowCheckOutModal(true);
            setUseCustomCheckOut(false);
            setCustomCheckOutAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
        };

        if (checkOutDate.getTime() !== today.getTime()) {
            setWarningModal({
                isOpen: true,
                title: "Unexpected Check-Out Date",
                message: `The scheduled check-out date is not today (${format(checkOutDate, 'MMM d, yyyy')}). Are you sure you want to proceed with checking out now?`,
                type: 'WARNING',
                onConfirm: () => {
                    setWarningModal(null);
                    openCheckOutModal();
                },
                confirmText: "Proceed Anyway",
                onCancel: () => setWarningModal(null),
                cancelText: "Cancel"
            });
            return;
        }

        openCheckOutModal();
    };

    const { data: bookings, isLoading, error } = useQuery<Booking[]>({
        queryKey: ['bookings', statusFilter, selectedProperty?.id, startDate, endDate],
        queryFn: async () => {
            const data = await bookingsService.getAll({
                status: statusFilter || undefined,
                propertyId: selectedProperty?.id,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
            });
            if (!statusFilter) {
                return data.filter(b => b.status !== BookingStatus.PENDING_PAYMENT);
            }
            return data;
        },
        enabled: !!selectedProperty?.id,
    });


    const filteredBookings = (bookings || []).filter(booking => {
        if (!searchTerm) return true;
        const searchStr = searchTerm.toLowerCase();
        const guestName = (booking.isManualBooking && booking.guests?.[0]
            ? `${booking.guests[0].firstName} ${booking.guests[0].lastName}`
            : `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`).toLowerCase();
        const bookingNumber = booking.bookingNumber.toLowerCase();
        const email = (booking.isManualBooking && booking.guests?.[0]
            ? (booking.guests[0].email || '')
            : (booking.user?.email || '')).toLowerCase();
        // Gather all possible phone numbers related to this booking
        const allPhones = [
            booking.user?.phone,
            booking.whatsappNumber,
            ...(booking.guests || []).map(g => g.phone),
            ...(booking.guests || []).map(g => g.whatsappNumber)
        ].filter(Boolean).map(p => String(p).toLowerCase());

        const cleanSearch = searchStr.replace(/\D/g, '');
        const hasPhoneMatch = allPhones.some(p => p.includes(searchStr)) || 
            (cleanSearch !== '' && allPhones.some(p => p.replace(/\D/g, '').includes(cleanSearch)));

        return guestName.includes(searchStr) ||
            bookingNumber.includes(searchStr) ||
            email.includes(searchStr) ||
            hasPhoneMatch;
    }).sort((a, b) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dateA = new Date(a.checkInDate);
        dateA.setHours(0, 0, 0, 0);
        
        const dateB = new Date(b.checkInDate);
        dateB.setHours(0, 0, 0, 0);
        
        const isPastA = dateA.getTime() < today.getTime();
        const isPastB = dateB.getTime() < today.getTime();

        // If one is past and the other is not, the upcoming/today comes first
        if (isPastA && !isPastB) return 1;
        if (!isPastA && isPastB) return -1;

        // If both are upcoming/today, sort ascending (today, tomorrow, next week...)
        if (!isPastA && !isPastB) {
            return dateA.getTime() - dateB.getTime();
        }

        // If both are past, sort descending (yesterday, last week...)
        return dateB.getTime() - dateA.getTime();
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



    const handleOpenDelete = async (booking: Booking) => {
        setDeletingBooking(booking);
        setIsLoadingDeps(true);
        try {
            const deps = await bookingsService.getDeleteDependencies(booking.id);
            setDependencies(deps);
        } catch (error) {
            toast.error('Failed to fetch dependencies');
        } finally {
            setIsLoadingDeps(false);
        }
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => bookingsService.delete(id),
        onSuccess: () => {
            toast.success('Booking deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete booking');
        },
    });

    const handleDownloadBackendPDF = async (booking: Booking) => {
        try {
            setDownloadBooking(booking);
            setIsDownloading(true);
            const response = await api.get(`/bookings/invoice/${booking.id}/PARTNER`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            const balanceDue = (booking.totalAmount || 0) - (booking.paidAmount || 0);
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
            setDownloadBooking(null);
        }
    };




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

                <div className="bg-card rounded-lg shadow-sm border border-border">
                    {/* Status Tabs */}
                    <div className="flex border-b border-border overflow-x-auto bg-muted/5 scrollbar-none rounded-t-lg">
                        {[
                            { label: 'All Bookings', value: '', dotColor: 'bg-primary' },
                            { label: 'Reserved', value: 'RESERVED', dotColor: 'bg-orange-500' },
                            { label: 'Confirmed', value: 'CONFIRMED', dotColor: 'bg-emerald-500' },
                            { label: 'Checked In', value: 'CHECKED_IN', dotColor: 'bg-blue-500' },
                            { label: 'Checked Out', value: 'CHECKED_OUT', dotColor: 'bg-neutral-400 dark:bg-neutral-600' },
                            { label: 'Cancelled', value: 'CANCELLED', dotColor: 'bg-red-500' },
                            { label: 'No Show', value: 'NO_SHOW', dotColor: 'bg-rose-500' }
                        ].map((tab) => {
                            const isActive = statusFilter === tab.value;
                            return (
                                <button
                                    key={tab.value}
                                    onClick={() => setStatusFilter(tab.value)}
                                    className={`px-5 py-3.5 text-xs md:text-sm font-bold border-b-2 transition-all duration-200 whitespace-nowrap flex items-center gap-2 ${
                                        isActive
                                            ? 'border-primary text-primary font-black bg-primary/5'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
                                    }`}
                                >
                                    <span className={`w-2 h-2 rounded-full ${tab.dotColor}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Filters */}
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by name, ID or phone..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">From:</span>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="border border-border bg-background text-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider whitespace-nowrap">To:</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="border border-border bg-background text-foreground rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                />
                            </div>
                            {(startDate !== '' || endDate !== '' || statusFilter !== '' || searchTerm !== '' || searchParams.has('startDate') || searchParams.has('endDate') || searchParams.has('status') || searchParams.has('search')) && (
                                <button
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                        setStatusFilter('');
                                        setSearchTerm('');
                                        setSearchParams(new URLSearchParams());
                                    }}
                                    className="text-xs font-bold text-primary hover:text-primary/80 transition-colors uppercase tracking-widest whitespace-nowrap"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto w-full">
                        <table className="min-w-full divide-y divide-border table-auto">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking Info</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Guest</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Phone</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Room</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Dates</th>
                                    <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment</th>
                                    <th className="px-4 lg:px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 lg:px-6 py-12 text-center">
                                            <div className="flex flex-col items-center justify-center space-y-3 py-8">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-sm font-semibold text-muted-foreground">Loading bookings...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filteredBookings.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-4 lg:px-6 py-12 text-center text-muted-foreground font-medium">
                                            No bookings found matching your criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredBookings.map((booking: Booking, index: number) => (
                                    <tr key={booking.id} onClick={(e) => handleRowClick(e, booking.id)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary">{booking.bookingNumber}</div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {booking.isManualBooking ? 'Manual' : 'Online'}
                                            </div>
                                            {booking.channelPartner && (
                                                <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                                    CP: {booking.channelPartner.accountHolderName}
                                                </div>
                                            )}
                                            {/* Status badge */}
                                            <div className="mt-1.5">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                                                    booking.status === 'CONFIRMED'    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                                                    booking.status === 'RESERVED'     ? 'bg-orange-500/10 text-orange-600 border-orange-500/20' :
                                                    booking.status === 'CHECKED_IN'   ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                                    booking.status === 'CHECKED_OUT'  ? 'bg-neutral-500/10 text-neutral-500 border-neutral-500/20' :
                                                    booking.status === 'CANCELLED'    ? 'bg-red-500/10 text-red-600 border-red-500/20' :
                                                    booking.status === 'NO_SHOW'      ? 'bg-rose-500/10 text-rose-600 border-rose-500/20' :
                                                    'bg-muted text-muted-foreground border-border'
                                                }`}>
                                                    {booking.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                            {/* Rescheduled badge */}
                                            {(booking.rescheduleCount ?? 0) > 0 && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 uppercase tracking-wider">
                                                        🔄 Rescheduled ×{booking.rescheduleCount}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Historical badge */}
                                            {booking.isHistoricalEntry && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-gray-500/10 text-gray-600 dark:text-gray-400 border border-gray-500/20 uppercase tracking-wider">
                                                        🕰️ Historical
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">
                                                {booking.isManualBooking && booking.guests?.[0]
                                                    ? `${booking.guests[0].firstName} ${booking.guests[0].lastName}`
                                                    : `${booking.user.firstName} ${booking.user.lastName}`}
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                {booking.isManualBooking && booking.guests?.[0]
                                                    ? (booking.guests[0].email || 'No Email')
                                                    : booking.user.email}
                                            </div>
                                            {booking.isGroupBooking && (
                                                <div className="mt-1">
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary uppercase">
                                                        Group of {booking.groupSize}
                                                    </span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">
                                                {booking.isManualBooking && booking.guests?.[0]
                                                    ? booking.guests[0].phone
                                                    : booking.user.phone || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-2">
                                                {booking.bookingRooms && booking.bookingRooms.length > 0 ? (
                                                    booking.bookingRooms.map((br: any, idx: number) => (
                                                        <div key={idx} className={idx > 0 ? "pt-1.5 border-t border-border/50" : ""}>
                                                            <div className="text-sm font-bold text-foreground">Unit {br.room?.roomNumber}</div>
                                                            <div className="text-[10px] text-muted-foreground uppercase font-medium">{br.room?.roomType?.name}</div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-sm text-muted-foreground italic">No rooms assigned</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">
                                                {format(new Date(booking.checkInDate), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {Math.max(1, differenceInCalendarDays(new Date(booking.checkOutDate), new Date(booking.checkInDate)))} nights
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                                            <div className="space-y-1.5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    <span className={`px-2.5 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-full border ${booking.paymentStatus === 'FULL'
                                                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                                                        : booking.paymentStatus === 'PARTIAL'
                                                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                                            : 'bg-red-500/10 text-red-600 border-red-500/20'
                                                        }`}>
                                                        {booking.paymentStatus}
                                                    </span>
                                                    {booking.paymentOption === 'PAY_AT_PROPERTY' && (
                                                        <span className="px-2.5 py-0.5 inline-flex items-center gap-1 text-[9px] font-black rounded-full bg-cyan-500 text-white shadow-sm shadow-cyan-500/20 border border-white/20 uppercase tracking-tighter">
                                                            <Wallet className="h-2.5 w-2.5" />
                                                            Pay At Property
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground font-bold tracking-tight">
                                                    <div>
                                                        <span className={booking.paymentStatus === 'PARTIAL' ? 'text-emerald-600' : ''}>
                                                            ₹{Number(booking.paidAmount).toLocaleString()}
                                                        </span> / ₹{Number(booking.totalAmount).toLocaleString()}
                                                    </div>
                                                    {booking.bookingCurrency && booking.bookingCurrency !== 'INR' && (
                                                        <div className="text-[9px] text-primary/70">
                                                            ({booking.bookingCurrency} {Number(booking.amountInBookingCurrency).toLocaleString()})
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.RESERVED || booking.status === BookingStatus.NO_SHOW) && (
                                                    <button
                                                        onClick={() => handleOpenCheckIn(booking)}
                                                        className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-sm hover:shadow-emerald-500/20 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <ShieldCheck className="h-3.5 w-3.5" />
                                                        <span>Check In</span>
                                                    </button>
                                                )}

                                                {booking.status === BookingStatus.CHECKED_IN && (
                                                    <button
                                                        onClick={() => handleOpenCheckOut(booking)}
                                                        className="inline-flex items-center gap-1.5 bg-blue-500/10 text-blue-600 hover:bg-blue-500 hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-sm hover:shadow-blue-500/20 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <LogOut className="h-3.5 w-3.5" />
                                                        <span>Check Out</span>
                                                    </button>
                                                )}

                                                {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING_PAYMENT) && (
                                                    <button
                                                        onClick={() => {
                                                            if (confirm('Cancel this booking?')) cancelMutation.mutate(booking.id);
                                                        }}
                                                        className="inline-flex items-center gap-1.5 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-xl transition-all shadow-sm hover:shadow-red-500/20 active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        <span>Cancel</span>
                                                    </button>
                                                )}

                                                <div className="relative" style={{ zIndex: activeMenu === booking.id ? 50 : 0 }}>
                                                    <button
                                                        onClick={() => setActiveMenu(activeMenu === booking.id ? null : booking.id)}
                                                        className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all active:scale-90"
                                                    >
                                                        <MoreVertical className="h-4 w-4" />
                                                    </button>
                                                    {activeMenu === booking.id && (
                                                        <>
                                                            <div
                                                                className="fixed inset-0 z-10"
                                                                onClick={() => setActiveMenu(null)}
                                                            ></div>
                                                            <div className={`absolute right-0 w-48 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in transition-all duration-200 ${filteredBookings.length > 3 && index >= filteredBookings.length - 2 ? 'bottom-full mb-2 slide-in-from-bottom-2' : 'top-full mt-2 slide-in-from-top-2'}`}>
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveMenu(null);
                                                                        handleDownloadBackendPDF(booking);
                                                                    }}
                                                                    disabled={isDownloading}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors disabled:opacity-50"
                                                                >
                                                                    {isDownloading && downloadBooking?.id === booking.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <Download className="h-4 w-4" />
                                                                    )}
                                                                    Download Invoice
                                                                </button>
                                                                <Link
                                                                    to={`/bookings/${booking.id}`}
                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                    View Details
                                                                </Link>
                                                                {(booking.status === BookingStatus.NO_SHOW || booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.RESERVED) && (
                                                                    <button
                                                                        onClick={() => {
                                                                            setActiveMenu(null);
                                                                            handleOpenReschedule(booking);
                                                                        }}
                                                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                                    >
                                                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                                                        Update Booking
                                                                    </button>
                                                                )}
                                                                {booking.isManualBooking && booking.status !== BookingStatus.CHECKED_IN && booking.status !== BookingStatus.CHECKED_OUT && (
                                                                    <>
                                                                        <Link
                                                                            to={`/bookings/${booking.id}/edit`}
                                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                                                                        >
                                                                            <Pencil className="h-4 w-4" />
                                                                            Edit Booking
                                                                        </Link>
                                                                        <button
                                                                            onClick={() => {
                                                                                setActiveMenu(null);
                                                                                handleOpenDelete(booking);
                                                                            }}
                                                                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                                                                        >
                                                                            <Trash2 className="h-4 w-4" />
                                                                            Delete Booking
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>

                {/* Check-In Verification Modal */}
                <CheckInVerificationModal
                    booking={checkInBooking}
                    onClose={() => setCheckInBooking(null)}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['bookings'] });
                    }}
                />

                {/* Delete Booking Safety Modal */}
                {deletingBooking && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/40 backdrop-blur-xl">
                        <div className="bg-card w-full max-w-lg rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-border/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="relative p-6 border-b border-border/50 bg-gradient-to-br from-destructive/10 via-transparent to-transparent">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-destructive text-destructive-foreground rounded-2xl shadow-lg rotate-3">
                                            <Trash2 className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black tracking-tight text-foreground">Delete Booking</h2>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                Booking: <span className="text-destructive font-bold">{deletingBooking.bookingNumber}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setDeletingBooking(null);
                                            setDependencies(null);
                                        }}
                                        className="p-2 hover:bg-muted rounded-xl transition-all"
                                    >
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {isLoadingDeps ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-sm font-medium text-muted-foreground">Analyzing related data...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 flex gap-3">
                                            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                                            <p className="text-sm text-destructive font-medium leading-relaxed">
                                                Warning: This action is permanent. All associated records listed below will be deleted to maintain database integrity.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Associated Records to be Removed:</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {[
                                                    { label: 'Guests', count: dependencies?.guests },
                                                    { label: 'Payments', count: dependencies?.payments },
                                                    { label: 'Incomes', count: dependencies?.income },
                                                    { label: 'Settlements', count: dependencies?.settlements },
                                                    { label: 'CP Transactions', count: dependencies?.cpTransactions },
                                                    { label: 'Payment Requests', count: dependencies?.manualPaymentRequests },
                                                    { label: 'Reviews', count: dependencies?.reviews },
                                                    { label: 'Room Blocks', count: dependencies?.roomBlocks },
                                                ].map((item, idx) => (
                                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border/30">
                                                        <span className="text-xs font-bold text-foreground">{item.label}</span>
                                                        <span className={`text-xs font-black ${item.count > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                            {item.count || 0}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setDeletingBooking(null);
                                                    setDependencies(null);
                                                }}
                                                className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors"
                                            >
                                                Keep Booking
                                            </button>
                                            <button
                                                onClick={() => {
                                                    deleteMutation.mutate(deletingBooking.id, {
                                                        onSuccess: () => {
                                                            setDeletingBooking(null);
                                                            setDependencies(null);
                                                        }
                                                    });
                                                }}
                                                disabled={deleteMutation.isPending}
                                                className="flex-1 bg-destructive text-destructive-foreground px-4 py-2.5 rounded-xl font-bold text-sm hover:hover:bg-destructive/90 transition-all shadow-lg shadow-destructive/20 active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                Confirm Deletion
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Custom Check-Out Modal */}
                {showCheckOutModal && checkOutBooking && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-background/40 backdrop-blur-xl">
                        <div className="bg-card w-full max-w-lg rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.2)] border border-border/50 overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className="relative p-6 border-b border-border/50 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg rotate-3">
                                            <LogOut className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black tracking-tight text-foreground">Confirm Check-Out</h2>
                                            <p className="text-xs text-muted-foreground font-medium">
                                                Booking: <span className="text-blue-500 font-bold">{checkOutBooking.bookingNumber}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowCheckOutModal(false);
                                            setCheckOutBooking(null);
                                        }}
                                        className="p-2 hover:bg-muted rounded-xl transition-all"
                                    >
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                <div className="space-y-4">
                                    <p className="text-sm font-medium text-muted-foreground leading-relaxed">
                                        Are you sure you want to check-out the guest <span className="text-foreground font-bold">{checkOutBooking.isManualBooking && checkOutBooking.guests?.[0] ? `${checkOutBooking.guests[0].firstName} ${checkOutBooking.guests[0].lastName}` : `${checkOutBooking.user?.firstName || ''} ${checkOutBooking.user?.lastName || ''}`}</span>?
                                    </p>
                                    
                                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-4 space-y-2">
                                        <div className="flex justify-between text-xs">
                                            <span className="font-bold text-muted-foreground">Unit:</span>
                                            <span className="font-black text-foreground">{checkOutBooking.room?.roomNumber} ({checkOutBooking.room?.roomType?.name})</span>
                                        </div>
                                        {checkOutBooking.roomBlocks && checkOutBooking.roomBlocks.length > 0 && checkOutBooking.roomBlocks.map((block, idx) => (
                                            <div key={idx} className="flex justify-between text-xs">
                                                <span className="font-bold text-muted-foreground">Unit {idx + 2}:</span>
                                                <span className="font-black text-foreground">{block.room.roomNumber} ({block.room.roomType.name})</span>
                                            </div>
                                        ))}
                                        <div className="flex justify-between text-xs pt-2 border-t border-border/30">
                                            <span className="font-bold text-muted-foreground">Stay:</span>
                                            <span className="font-black text-foreground">{format(new Date(checkOutBooking.checkInDate), 'MMM d')} - {format(new Date(checkOutBooking.checkOutDate), 'MMM d')}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Check-Out Time Override */}
                                <div className="p-5 rounded-3xl border border-border bg-muted/20 space-y-4">
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={useCustomCheckOut}
                                            onChange={(e) => setUseCustomCheckOut(e.target.checked)}
                                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20 cursor-pointer"
                                        />
                                        <span className="text-xs font-black text-foreground uppercase tracking-wider">
                                            Custom Check-Out Time (Staff Override)
                                        </span>
                                    </label>

                                    {useCustomCheckOut && (
                                        <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
                                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pl-1">
                                                Actual Check-Out Date & Time
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={customCheckOutAt}
                                                onChange={(e) => setCustomCheckOutAt(e.target.value)}
                                                className="w-full bg-background border border-border/50 rounded-xl px-4 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-foreground"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => {
                                            setShowCheckOutModal(false);
                                            setCheckOutBooking(null);
                                        }}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors text-foreground"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            checkOutMutation.mutate({
                                                id: checkOutBooking.id,
                                                data: useCustomCheckOut && customCheckOutAt ? { checkedOutAt: new Date(customCheckOutAt).toISOString() } : undefined
                                            }, {
                                                onSuccess: () => {
                                                    setShowCheckOutModal(false);
                                                    setCheckOutBooking(null);
                                                }
                                            });
                                        }}
                                        disabled={checkOutMutation.isPending}
                                        className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {checkOutMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                        Confirm Check-Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Warning Modal */}
            {warningModal?.isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6">
                            <div className="flex items-center gap-4 mb-4">
                                <div className={`p-3 rounded-full ${warningModal.type === 'BLOCK' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                                    <AlertCircle className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-foreground">{warningModal.title}</h3>
                                </div>
                            </div>
                            <p className="text-muted-foreground text-sm pl-[3.25rem]">
                                {warningModal.message}
                            </p>
                        </div>
                        <div className="bg-muted/50 p-4 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={warningModal.onCancel}
                                className="px-4 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                            >
                                {warningModal.cancelText}
                            </button>
                            {warningModal.type === 'BLOCK' ? (
                                <button
                                    onClick={warningModal.onConfirm}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg transition-colors"
                                >
                                    {warningModal.confirmText}
                                </button>
                            ) : (
                                <button
                                    onClick={warningModal.onConfirm}
                                    className="px-4 py-2 text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 rounded-lg transition-colors"
                                >
                                    {warningModal.confirmText}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
