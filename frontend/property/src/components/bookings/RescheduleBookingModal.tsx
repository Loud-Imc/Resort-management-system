import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Calendar, X, AlertCircle, User, House, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsService } from '../../services/bookings';
import type { Booking } from '../../types/booking';
import { RescheduleCalendarModal } from './RescheduleCalendarModal';


interface RescheduleBookingModalProps {
    booking: Booking;
    onClose: () => void;
    onSuccess: () => void;
    roomTypes: any[] | undefined;
    propertyId: string;
}

export function RescheduleBookingModal({
    booking,
    onClose,
    onSuccess,
    roomTypes,
    propertyId,
}: RescheduleBookingModalProps) {
    const queryClient = useQueryClient();

    const [newCheckInDate, setNewCheckInDate] = useState<string>(() => format(new Date(booking.checkInDate), 'yyyy-MM-dd'));
    const [newCheckOutDate, setNewCheckOutDate] = useState<string>(() => format(new Date(booking.checkOutDate), 'yyyy-MM-dd'));
    const [newPricePreview, setNewPricePreview] = useState<any>(null);
    const [isCalculatingPreview, setIsCalculatingPreview] = useState<boolean>(false);
    
    const [useRescheduleOverride, setUseRescheduleOverride] = useState<boolean>(booking.isPriceOverridden || false);
    const [rescheduleOverrideTotal, setRescheduleOverrideTotal] = useState<string>(booking.isPriceOverridden ? Number(booking.totalAmount).toString() : '');
    const [rescheduleOverrideReason, setRescheduleOverrideReason] = useState<string>(booking.overrideReason || '');
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>(() => [booking.roomId, ...(booking.roomBlocks?.map(rb => rb.roomId) || [])]);
    const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
    const [rescheduleRoomTypeId, setRescheduleRoomTypeId] = useState<string>(booking.roomTypeId);

    const [keepOriginalAmount, setKeepOriginalAmount] = useState<boolean>(false);
    const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
    const [isEditingGuestDetails, setIsEditingGuestDetails] = useState<boolean>(false);

    // Booker (Primary Contact) states
    const [bookerFirstName, setBookerFirstName] = useState<string>(() => booking.user?.firstName || '');
    const [bookerLastName, setBookerLastName] = useState<string>(() => booking.user?.lastName || '');
    const [bookerEmail, setBookerEmail] = useState<string>(() => booking.user?.email || '');
    const [bookerPhone, setBookerPhone] = useState<string>(() => booking.user?.phone || '');
    const [bookerWhatsapp, setBookerWhatsapp] = useState<string>(() => booking.whatsappNumber || booking.user?.whatsappNumber || '');

    // Guest details states
    const [guestFirstName, setGuestFirstName] = useState<string>(() => booking.guests?.[0]?.firstName || '');
    const [guestLastName, setGuestLastName] = useState<string>(() => booking.guests?.[0]?.lastName || '');
    const [guestEmail, setGuestEmail] = useState<string>(() => booking.guests?.[0]?.email || '');
    const [guestPhone, setGuestPhone] = useState<string>(() => booking.guests?.[0]?.phone || '');
    const [guestWhatsapp, setGuestWhatsapp] = useState<string>(() => booking.guests?.[0]?.whatsappNumber || '');

    // Capacity states
    const [adultsCount, setAdultsCount] = useState<number>(() => booking.adultsCount || 1);
    const [childrenCount, setChildrenCount] = useState<number>(() => booking.childrenCount || 0);

    const [isGuestSameAsBooker, setIsGuestSameAsBooker] = useState<boolean>(() => {
        if (!booking.guests || booking.guests.length === 0) return true;
        const g0 = booking.guests[0];
        const u = booking.user;
        if (!u) return false;
        return g0.firstName === u.firstName && g0.phone === u.phone;
    });

    useEffect(() => {
        if (isGuestSameAsBooker) {
            setGuestFirstName(bookerFirstName);
            setGuestLastName(bookerLastName);
            setGuestEmail(bookerEmail);
            setGuestPhone(bookerPhone);
            setGuestWhatsapp(bookerWhatsapp);
        }
    }, [isGuestSameAsBooker, bookerFirstName, bookerLastName, bookerEmail, bookerPhone, bookerWhatsapp]);

    const originalTotal = Number(booking.totalAmount);
    const calculatedNewTotal = newPricePreview?.totalAmount ?? originalTotal;
    const calculatedRateDiff = calculatedNewTotal - originalTotal;
    const showKeepOriginalOption = calculatedRateDiff < 0;

    useEffect(() => {
        if (!showKeepOriginalOption && keepOriginalAmount) {
            setKeepOriginalAmount(false);
            setUseRescheduleOverride(false);
            setRescheduleOverrideTotal('');
            setRescheduleOverrideReason('');
        }
    }, [showKeepOriginalOption, keepOriginalAmount]);

    useEffect(() => {
        if (!newCheckInDate || !newCheckOutDate || !rescheduleRoomTypeId) {
            setNewPricePreview(null);
            return;
        }

        const fetchPreview = async () => {
            try {
                setIsCalculatingPreview(true);
                const roomCount = 1 + (booking.roomBlocks?.length || 0);
                const preview = await bookingsService.calculatePrice({
                    roomTypeId: rescheduleRoomTypeId,
                    checkInDate: newCheckInDate,
                    checkOutDate: newCheckOutDate,
                    adultsCount: adultsCount,
                    childrenCount: childrenCount,
                    couponCode: booking.couponCode || undefined,
                    referralCode: booking.channelPartner?.referralCode || undefined,
                    currency: booking.bookingCurrency || 'INR',
                    isGroupBooking: booking.isGroupBooking,
                    groupSize: booking.isGroupBooking ? (adultsCount + childrenCount) : undefined,
                    roomCount: roomCount,
                    overrideTotal: useRescheduleOverride && rescheduleOverrideTotal ? Number(rescheduleOverrideTotal) : undefined,
                });
                setNewPricePreview(preview);
            } catch (err) {
                console.error('Failed to calculate price preview', err);
                setNewPricePreview(null);
            } finally {
                setIsCalculatingPreview(false);
            }
        };

        const timer = setTimeout(fetchPreview, 400);
        return () => clearTimeout(timer);
    }, [booking, newCheckInDate, newCheckOutDate, useRescheduleOverride, rescheduleOverrideTotal, rescheduleRoomTypeId, adultsCount, childrenCount]);

    useEffect(() => {
        if (!newCheckInDate || !newCheckOutDate || !rescheduleRoomTypeId) {
            setAvailableRooms([]);
            return;
        }

        const fetchAvailableRooms = async () => {
            try {
                setIsLoadingRooms(true);
                const checkRes = await bookingsService.checkAvailability({
                    roomTypeId: rescheduleRoomTypeId,
                    checkInDate: newCheckInDate,
                    checkOutDate: newCheckOutDate,
                    propertyId: propertyId,
                    isGroupBooking: booking.isGroupBooking,
                    groupSize: booking.isGroupBooking ? (adultsCount + childrenCount) : undefined,
                    isAdmin: true,
                    excludeBookingId: booking.id,
                });
                setAvailableRooms(checkRes.roomList || []);
            } catch (err) {
                console.error('Failed to fetch available rooms', err);
                setAvailableRooms([]);
            } finally {
                setIsLoadingRooms(false);
            }
        };

        const timer = setTimeout(fetchAvailableRooms, 500);
        return () => clearTimeout(timer);
    }, [booking, newCheckInDate, newCheckOutDate, propertyId, rescheduleRoomTypeId, adultsCount, childrenCount]);

    useEffect(() => {
        if (availableRooms.length > 0) {
            const roomCount = 1 + (booking.roomBlocks?.length || 0);
            const allSelectedValid = selectedRoomIds.every(id => availableRooms.some(r => r.id === id));
            if (!allSelectedValid || selectedRoomIds.length !== roomCount) {
                const autoSelect = availableRooms.slice(0, roomCount).map(r => r.id);
                setSelectedRoomIds(autoSelect);
            }
        }
    }, [availableRooms, booking]);

    const toggleRoomSelection = (roomId: string) => {
        const roomCount = 1 + (booking.roomBlocks?.length || 0);
        setSelectedRoomIds(prev => {
            if (prev.includes(roomId)) {
                return prev.filter(id => id !== roomId);
            } else {
                if (prev.length >= roomCount) {
                    if (roomCount === 1) {
                        return [roomId];
                    }
                    return [...prev.slice(1), roomId];
                }
                return [...prev, roomId];
            }
        });
    };

    const rescheduleMutation = useMutation({
        mutationFn: bookingsService.reschedule,
        onSuccess: () => {
            toast.success('Booking rescheduled successfully');
            onSuccess();
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to reschedule booking');
        },
    });

    const handleRescheduleSubmit = () => {
        if (!newCheckInDate || !newCheckOutDate) return;

        const originalCheckIn = new Date(booking.checkInDate);
        originalCheckIn.setHours(0, 0, 0, 0);
        const newCheckIn = new Date(newCheckInDate);
        newCheckIn.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil(Math.abs(newCheckIn.getTime() - originalCheckIn.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 90) {
            toast.error('Rescheduling is only allowed within 3 months (90 days) of the original check-in date.');
            return;
        }

        if (!bookerFirstName.trim()) {
            toast.error('Booker First Name is required.');
            return;
        }
        if (!bookerPhone.trim()) {
            toast.error('Booker Phone Number is required.');
            return;
        }
        if (!guestFirstName.trim()) {
            toast.error('Guest First Name is required.');
            return;
        }

        const roomCount = 1 + (booking.roomBlocks?.length || 0);
        if (selectedRoomIds.length !== roomCount) {
            toast.error(`Please select exactly ${roomCount} room(s). Currently selected: ${selectedRoomIds.length}`);
            return;
        }

        if (useRescheduleOverride) {
            if (!rescheduleOverrideTotal) {
                toast.error('Please specify the override total price.');
                return;
            }
            if (!rescheduleOverrideReason.trim()) {
                toast.error('Please specify the reason for the price override.');
                return;
            }
        }

        rescheduleMutation.mutate({
            id: booking.id,
            data: {
                checkInDate: newCheckInDate,
                checkOutDate: newCheckOutDate,
                selectedRoomIds: selectedRoomIds,
                overrideTotal: useRescheduleOverride && rescheduleOverrideTotal ? Number(rescheduleOverrideTotal) : undefined,
                overrideReason: useRescheduleOverride ? rescheduleOverrideReason : undefined,
                roomTypeId: rescheduleRoomTypeId,
                adultsCount: Number(adultsCount),
                childrenCount: Number(childrenCount),
                guestName: `${bookerFirstName} ${bookerLastName}`.trim(),
                guestEmail: bookerEmail || undefined,
                guestPhone: bookerPhone,
                whatsappNumber: bookerWhatsapp || undefined,
                guests: [
                    {
                        id: booking.guests?.[0]?.id,
                        firstName: guestFirstName,
                        lastName: guestLastName,
                        email: guestEmail || undefined,
                        phone: guestPhone || undefined,
                        whatsappNumber: guestWhatsapp || undefined,
                    }
                ]
            }
        });
    };

    return (
        <div className="fixed inset-0 z-[60] flex h-screen w-screen bg-background/40 backdrop-blur-xl overflow-hidden">
            <div className="bg-card w-full h-full flex flex-col overflow-hidden animate-in fade-in duration-300">
                {/* Header */}
                <div className="relative p-6 border-b border-border/50 bg-gradient-to-br from-primary/10 via-transparent to-transparent flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg rotate-3">
                                <Calendar className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black tracking-tight text-foreground">Reschedule Booking</h2>
                                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                                    Booking: <span className="text-primary font-bold">{booking.bookingNumber}</span>
                                    {booking.channelPartner && (
                                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                            Channel Partner: {booking.channelPartner.name}
                                        </span>
                                    )}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 hover:bg-muted rounded-xl transition-all"
                        >
                            <X className="h-6 w-6 text-muted-foreground" />
                        </button>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-border/50 overflow-hidden min-h-0">
                    {/* Left Side: Dates, Guests & Room Selection */}
                    <div className="p-6 overflow-y-auto h-full space-y-6">
                        {/* 1. Guest & Room Details of the Booking */}
                        <div className="bg-muted/40 border border-border/60 rounded-2xl p-5 space-y-4 shadow-inner">
                            <div className="flex items-center justify-between pl-1">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">
                                    Reschedule Booking Details
                                </h3>
                                <button
                                    type="button"
                                    onClick={() => setIsEditingGuestDetails(!isEditingGuestDetails)}
                                    className="px-3 py-1 bg-primary/10 hover:bg-primary/20 text-primary hover:text-primary rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    {isEditingGuestDetails ? 'View Stay Details' : 'Edit Guest Details'}
                                </button>
                            </div>

                            {!isEditingGuestDetails ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                    {/* Guest Details Subcard */}
                                    <div className="bg-background/60 p-4 rounded-xl border border-border/30 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                                            <User className="h-4 w-4" />
                                            <span>Guest & Booker Information</span>
                                        </div>
                                        <div className="space-y-1 pl-6">
                                            <p className="text-sm font-bold text-foreground">
                                                {bookerFirstName} {bookerLastName}
                                            </p>
                                            {bookerPhone && (
                                                <p className="text-xs text-muted-foreground">
                                                    Phone: {bookerPhone}
                                                </p>
                                            )}
                                            {bookerEmail && (
                                                <p className="text-xs text-muted-foreground">
                                                    Email: {bookerEmail}
                                                </p>
                                            )}
                                            {bookerWhatsapp && (
                                                <p className="text-xs text-muted-foreground">
                                                    WhatsApp: {bookerWhatsapp}
                                                </p>
                                            )}
                                            {!isGuestSameAsBooker && (
                                                <div className="pt-2 mt-2 border-t border-border/30 space-y-1">
                                                    <p className="text-[10px] font-black text-primary uppercase tracking-wider">Primary Guest</p>
                                                    <p className="text-xs font-bold text-foreground">{guestFirstName} {guestLastName}</p>
                                                    {guestPhone && <p className="text-[10px] text-muted-foreground">Phone: {guestPhone}</p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Room Details Subcard */}
                                    <div className="bg-background/60 p-4 rounded-xl border border-border/30 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                                            <House className="h-4 w-4" />
                                            <span>Room & Stay Info</span>
                                        </div>
                                        <div className="space-y-1 pl-6 text-xs text-muted-foreground">
                                            <p className="font-bold text-foreground">
                                                {roomTypes?.find(rt => rt.id === rescheduleRoomTypeId)?.name || 'Selected Room Type'}
                                            </p>
                                            <p>
                                                Unit: <span className="font-semibold text-foreground text-xs">
                                                    {selectedRoomIds.length > 0 && availableRooms.length > 0
                                                        ? availableRooms.filter(r => selectedRoomIds.includes(r.id)).map(r => r.roomNumber).join(', ')
                                                        : (booking.room?.roomNumber || 'Unassigned')}
                                                </span>
                                            </p>
                                            <p>
                                                Stay: <span className="font-semibold text-foreground text-xs">
                                                    {newCheckInDate && newCheckOutDate
                                                        ? `${format(new Date(newCheckInDate), 'MMM d')} - ${format(new Date(newCheckOutDate), 'MMM d, yyyy')}`
                                                        : 'N/A'}
                                                </span>
                                            </p>
                                            <p>
                                                Guests: <span className="font-semibold text-foreground text-xs">{adultsCount} Adults, {childrenCount} Children</span>
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-6 animate-in fade-in duration-200">
                                    {/* Booker Details Form */}
                                    <div className="bg-background/60 border border-border/30 rounded-xl p-4 space-y-4">
                                        <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                            <User className="h-3.5 w-3.5" /> Booker / Primary Contact Details
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">First Name *</label>
                                                <input
                                                    type="text"
                                                    value={bookerFirstName}
                                                    onChange={(e) => setBookerFirstName(e.target.value)}
                                                    placeholder="First Name"
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={bookerLastName}
                                                    onChange={(e) => setBookerLastName(e.target.value)}
                                                    placeholder="Last Name"
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={bookerEmail}
                                                    onChange={(e) => setBookerEmail(e.target.value)}
                                                    placeholder="Email Address"
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">Phone Number *</label>
                                                <input
                                                    type="text"
                                                    value={bookerPhone}
                                                    onChange={(e) => setBookerPhone(e.target.value)}
                                                    placeholder="Phone Number"
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">WhatsApp Number</label>
                                                <input
                                                    type="text"
                                                    value={bookerWhatsapp}
                                                    onChange={(e) => setBookerWhatsapp(e.target.value)}
                                                    placeholder="WhatsApp Number"
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Guest Details Form */}
                                    <div className="bg-background/60 border border-border/30 rounded-xl p-4 space-y-4">
                                        <div className="flex items-center justify-between pl-1">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5" /> Guest Details (Guest 1)
                                            </h4>
                                            <label className="flex items-center gap-2 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={isGuestSameAsBooker}
                                                    onChange={(e) => setIsGuestSameAsBooker(e.target.checked)}
                                                    className="rounded border-border/50 text-primary focus:ring-primary/20 w-4 h-4 cursor-pointer"
                                                />
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
                                                    Same as Booker
                                                </span>
                                            </label>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">First Name *</label>
                                                <input
                                                    type="text"
                                                    value={guestFirstName}
                                                    onChange={(e) => setGuestFirstName(e.target.value)}
                                                    disabled={isGuestSameAsBooker}
                                                    placeholder="First Name"
                                                    className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${
                                                        isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">Last Name</label>
                                                <input
                                                    type="text"
                                                    value={guestLastName}
                                                    onChange={(e) => setGuestLastName(e.target.value)}
                                                    disabled={isGuestSameAsBooker}
                                                    placeholder="Last Name"
                                                    className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${
                                                        isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">Email</label>
                                                <input
                                                    type="email"
                                                    value={guestEmail}
                                                    onChange={(e) => setGuestEmail(e.target.value)}
                                                    disabled={isGuestSameAsBooker}
                                                    placeholder="Email Address"
                                                    className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${
                                                        isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''
                                                    }`}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">Phone Number</label>
                                                <input
                                                    type="text"
                                                    value={guestPhone}
                                                    onChange={(e) => setGuestPhone(e.target.value)}
                                                    disabled={isGuestSameAsBooker}
                                                    placeholder="Phone Number"
                                                    className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${
                                                        isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''
                                                    }`}
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">WhatsApp Number</label>
                                                <input
                                                    type="text"
                                                    value={guestWhatsapp}
                                                    onChange={(e) => setGuestWhatsapp(e.target.value)}
                                                    disabled={isGuestSameAsBooker}
                                                    placeholder="WhatsApp Number"
                                                    className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${
                                                        isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 3. 90 Days Limit Alert Banner */}
                        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-4">
                            <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-sm text-primary font-medium leading-relaxed">
                                Rescheduling must be scheduled within 3 months (90 days) from the original check-in date: <span className="font-bold underline">{format(new Date(booking.checkInDate), 'MMM d, yyyy')}</span>.
                            </p>
                        </div>

                        {/* 4. Room & Stay Details Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Room Type</label>
                                <select
                                    value={rescheduleRoomTypeId}
                                    onChange={(e) => setRescheduleRoomTypeId(e.target.value)}
                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                >
                                    {roomTypes?.map((rt) => (
                                        <option key={rt.id} value={rt.id}>
                                            {rt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">New Check-In Date</label>
                                <input
                                    type="date"
                                    value={newCheckInDate}
                                    onChange={(e) => setNewCheckInDate(e.target.value)}
                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">New Check-Out Date</label>
                                <input
                                    type="date"
                                    value={newCheckOutDate}
                                    onChange={(e) => setNewCheckOutDate(e.target.value)}
                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>

                        {/* 5. Stay Capacity Rows */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Adults (13+)</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={adultsCount}
                                    onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Children (6-12)</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={childrenCount}
                                    onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 text-base font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                        </div>

                        {/* 6. Check Availability Calendar Button */}
                        <div className="flex justify-start pt-1 pl-1">
                            <button
                                type="button"
                                onClick={() => setShowCalendarModal(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/45 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer"
                            >
                                <Calendar className="h-4 w-4" />
                                Check Room Availability Calendar
                            </button>
                        </div>

                        {/* 7. Room Selection Grid */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest pl-1">
                                    Select Room(s)
                                </label>
                                <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">
                                    Select {1 + (booking.roomBlocks?.length || 0)} Unit(s)
                                </span>
                            </div>

                            {isLoadingRooms ? (
                                <div className="flex flex-col items-center justify-center py-16 gap-4 bg-muted/20 border border-border/30 rounded-2xl">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Checking room availability...</p>
                                </div>
                            ) : availableRooms.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                    {availableRooms.map((room) => {
                                        const isSelected = selectedRoomIds.includes(room.id);
                                        return (
                                            <button
                                                key={room.id}
                                                type="button"
                                                onClick={() => toggleRoomSelection(room.id)}
                                                className={`flex flex-col items-center justify-center p-4 rounded-xl border text-center transition-all ${
                                                    isSelected
                                                        ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-95'
                                                        : 'bg-muted/30 text-foreground border-border/50 hover:bg-muted/50'
                                                }`}
                                            >
                                                <span className="text-base font-bold">Unit {room.roomNumber}</span>
                                                <span className={`text-[10px] uppercase font-black tracking-widest mt-0.5 ${isSelected ? 'text-primary-foreground/85' : 'text-muted-foreground'}`}>
                                                    Available
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-8 border border-dashed border-destructive/30 bg-destructive/5 rounded-2xl text-center">
                                    <p className="text-sm font-bold text-destructive">No rooms available for the selected dates.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Side: Price Comparison, Overrides, Actions */}
                    <div className="p-6 overflow-y-auto h-full flex flex-col justify-between space-y-6">
                        <div className="space-y-6">
                            {/* Price Comparison Preview */}
                            {isCalculatingPreview ? (
                                <div className="flex flex-col justify-center items-center py-12 gap-3 bg-muted/20 border border-border/30 rounded-2xl">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Recalculating rates for new dates...</span>
                                </div>
                            ) : (
                                (() => {
                                    const isDatesInvalid = !newCheckInDate || !newCheckOutDate || (new Date(newCheckInDate) >= new Date(newCheckOutDate));
                                    if (isDatesInvalid) {
                                        return (
                                            <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 text-sm text-destructive font-bold text-center">
                                                Please select valid check-in and check-out dates.
                                            </div>
                                        );
                                    }

                                    const paidAmount = Number(booking.paidAmount || 0);
                                    const activeNewTotal = useRescheduleOverride && rescheduleOverrideTotal 
                                        ? Number(rescheduleOverrideTotal) 
                                        : (newPricePreview?.totalAmount ?? Number(booking.totalAmount));
                                    const newBalanceDue = activeNewTotal - paidAmount;
                                    const originalTotal = Number(booking.totalAmount);
                                    const rateDiff = activeNewTotal - originalTotal;

                                    return (
                                        <div className="bg-muted/30 border border-border/50 rounded-2xl p-5 space-y-4">
                                            <div className="flex items-center justify-between pl-1">
                                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Pricing Comparison</h3>
                                                {booking.status === 'NO_SHOW' && (
                                                     <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-rose-500/10 text-rose-600 dark:text-rose-400 uppercase tracking-wider">
                                                        Original No-Show
                                                     </span>
                                                )}
                                            </div>
                                            
                                            {/* Top Row: Totals Metrics Dashboard */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                                <div className="bg-background/50 p-3 rounded-xl border border-border/20 flex flex-col justify-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Original Total</span>
                                                    <span className="font-black text-foreground text-lg mt-0.5">₹{originalTotal.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="bg-background/50 p-3 rounded-xl border border-border/20 flex flex-col justify-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Amount Paid</span>
                                                    <span className="font-black text-emerald-600 dark:text-emerald-400 text-lg mt-0.5">₹{paidAmount.toLocaleString('en-IN')}</span>
                                                </div>
                                                <div className="bg-background/50 p-3 rounded-xl border border-border/20 flex flex-col justify-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Total Price</span>
                                                    <span className="font-black text-foreground text-lg mt-0.5">₹{activeNewTotal.toLocaleString('en-IN')}</span>
                                                </div>
                                            </div>

                                            {/* Bottom Row: Adjustments and Balance Metrics Dashboard */}
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                                <div className="bg-background/50 p-3 rounded-xl border border-border/20 flex flex-col justify-center">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Rate Adjustment</span>
                                                    <span className="mt-0.5">
                                                        {rateDiff > 0 ? (
                                                            <span className="text-base font-black text-orange-600 dark:text-orange-400">
                                                                + ₹{rateDiff.toLocaleString('en-IN')} (Due)
                                                            </span>
                                                        ) : rateDiff < 0 ? (
                                                            <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                                                                - ₹{Math.abs(rateDiff).toLocaleString('en-IN')} (Credit)
                                                            </span>
                                                        ) : (
                                                            <span className="text-base font-black text-muted-foreground">
                                                                No Change
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 flex flex-col justify-center">
                                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">New Remaining Balance</span>
                                                    <span className="mt-0.5">
                                                        {newBalanceDue > 0 ? (
                                                            <span className="text-lg font-black text-orange-600 dark:text-orange-400">
                                                                ₹{newBalanceDue.toLocaleString('en-IN')} (Due)
                                                            </span>
                                                        ) : newBalanceDue < 0 ? (
                                                            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                                                - ₹{Math.abs(newBalanceDue).toLocaleString('en-IN')} (Credit)
                                                            </span>
                                                        ) : (
                                                            <span className="text-lg font-black text-muted-foreground">
                                                                ₹0 (Fully Paid)
                                                            </span>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()
                            )}
                        </div>

                        {/* Price Override Section */}
                        <div className="p-5 rounded-2xl border border-border/50 bg-muted/20 space-y-3">
                            {showKeepOriginalOption && (
                                <label className="flex items-center gap-3 cursor-pointer select-none p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                                    <input
                                        type="checkbox"
                                        checked={keepOriginalAmount}
                                        onChange={(e) => {
                                            const checked = e.target.checked;
                                            setKeepOriginalAmount(checked);
                                            if (checked) {
                                                setUseRescheduleOverride(true);
                                                setRescheduleOverrideTotal(originalTotal.toString());
                                                setRescheduleOverrideReason("Retained original stay price on reschedule");
                                            } else {
                                                setUseRescheduleOverride(false);
                                                setRescheduleOverrideTotal('');
                                                setRescheduleOverrideReason('');
                                            }
                                        }}
                                        className="h-5 w-5 rounded border-emerald-500/30 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                                            Keep Original Booking Amount (₹{originalTotal.toLocaleString('en-IN')})
                                        </span>
                                        <span className="text-[10px] text-emerald-600/80 font-medium">
                                            Prevent price reduction and retain the original stay price.
                                        </span>
                                    </div>
                                </label>
                            )}

                            {!keepOriginalAmount && (
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={useRescheduleOverride}
                                        onChange={(e) => setUseRescheduleOverride(e.target.checked)}
                                        className="h-5 w-5 rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer"
                                    />
                                    <span className="text-sm font-black text-foreground uppercase tracking-wider">
                                        Override Rescheduled Price
                                    </span>
                                </label>
                            )}

                            {useRescheduleOverride && !keepOriginalAmount && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div>
                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1 block mb-1.5">
                                            Overridden Total Amount (₹)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 4500"
                                            value={rescheduleOverrideTotal}
                                            onChange={(e) => setRescheduleOverrideTotal(e.target.value)}
                                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-base font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-1 block mb-1.5">
                                            Reason for Override
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Customer relationship discount"
                                            value={rescheduleOverrideReason}
                                            onChange={(e) => setRescheduleOverrideReason(e.target.value)}
                                            className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-base font-bold focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 pt-4 border-t border-border/50">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-6 py-3.5 rounded-xl border border-border/50 font-black text-sm uppercase tracking-widest hover:bg-muted transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRescheduleSubmit}
                                disabled={rescheduleMutation.isPending || !newCheckInDate || !newCheckOutDate}
                                className="flex-1 bg-primary text-primary-foreground px-6 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {rescheduleMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
                                Confirm Reschedule
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showCalendarModal && (
                <RescheduleCalendarModal
                    booking={booking}
                    roomTypeId={rescheduleRoomTypeId}
                    roomTypeName={roomTypes?.find(rt => rt.id === rescheduleRoomTypeId)?.name || 'Selected Room Type'}
                    propertyId={propertyId}
                    onClose={() => setShowCalendarModal(false)}
                    onSelectDates={(checkIn, checkOut) => {
                        setNewCheckInDate(checkIn);
                        setNewCheckOutDate(checkOut);
                        setShowCalendarModal(false);
                    }}
                />
            )}
        </div>
    );
}
