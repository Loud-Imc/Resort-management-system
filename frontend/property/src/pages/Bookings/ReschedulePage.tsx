import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
    Loader2,
    Calendar,
    AlertCircle,
    User,
    House,
    Users,
    ArrowLeft,
    ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { bookingsService } from '../../services/bookings';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import { RescheduleCalendarModal } from '../../components/bookings/RescheduleCalendarModal';

export default function ReschedulePage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    // ── Fetch booking ──────────────────────────────────────────────────────────
    const { data: booking, isLoading: isLoadingBooking, isError } = useQuery({
        queryKey: ['booking', id],
        queryFn: () => bookingsService.getById(id!),
        enabled: !!id,
    });

    // ── Fetch room types ───────────────────────────────────────────────────────
    const { data: roomTypes } = useQuery<any[]>({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const propertyId = selectedProperty?.id || '';

    // ── Local state (matches RescheduleBookingModal) ───────────────────────────
    const [newCheckInDate, setNewCheckInDate] = useState<string>('');
    const [newCheckOutDate, setNewCheckOutDate] = useState<string>('');
    const [newPricePreview, setNewPricePreview] = useState<any>(null);
    const [isCalculatingPreview, setIsCalculatingPreview] = useState<boolean>(false);

    const [useRescheduleOverride, setUseRescheduleOverride] = useState<boolean>(false);
    const [rescheduleOverrideTotal, setRescheduleOverrideTotal] = useState<string>('');
    const [rescheduleOverrideReason, setRescheduleOverrideReason] = useState<string>('');
    const [availableRooms, setAvailableRooms] = useState<any[]>([]);
    const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
    const [isLoadingRooms, setIsLoadingRooms] = useState<boolean>(false);
    const [groupUnavailableReason, setGroupUnavailableReason] = useState<string | null>(null);
    const [rescheduleRoomTypeId, setRescheduleRoomTypeId] = useState<string>('');

    const [keepOriginalAmount, setKeepOriginalAmount] = useState<boolean>(false);
    const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
    const [isEditingGuestDetails, setIsEditingGuestDetails] = useState<boolean>(false);

    // Booker states
    const [bookerFirstName, setBookerFirstName] = useState<string>('');
    const [bookerLastName, setBookerLastName] = useState<string>('');
    const [bookerEmail, setBookerEmail] = useState<string>('');
    const [bookerPhone, setBookerPhone] = useState<string>('');
    const [bookerWhatsapp, setBookerWhatsapp] = useState<string>('');

    // Guest states
    const [guestFirstName, setGuestFirstName] = useState<string>('');
    const [guestLastName, setGuestLastName] = useState<string>('');
    const [guestEmail, setGuestEmail] = useState<string>('');
    const [guestPhone, setGuestPhone] = useState<string>('');
    const [guestWhatsapp, setGuestWhatsapp] = useState<string>('');

    const [adultsCount, setAdultsCount] = useState<number>(1);
    const [childrenCount, setChildrenCount] = useState<number>(0);
    const [isGuestSameAsBooker, setIsGuestSameAsBooker] = useState<boolean>(true);

    const selectedRoomType = useMemo(() => {
        return roomTypes?.find(rt => rt.id === rescheduleRoomTypeId);
    }, [roomTypes, rescheduleRoomTypeId]);

    const requiredRooms = useMemo(() => {
        if (booking?.isGroupBooking) return 1;
        if (!selectedRoomType) return 1;
        const maxAdults = selectedRoomType.maxAdults || 2;
        const maxChildren = selectedRoomType.maxChildren || 2;
        const parsedAdults = Number(adultsCount) || 1;
        const parsedChildren = Number(childrenCount) || 0;

        const maxAdultsPerRoom = maxAdults + 1;
        const maxChildrenPerRoom = maxChildren > 0 ? (maxChildren + 1) : 1;

        const roomsByAdults = Math.ceil(parsedAdults / maxAdultsPerRoom);
        const roomsByChildren = Math.ceil(parsedChildren / maxChildrenPerRoom);

        return Math.max(roomsByAdults, roomsByChildren, 1);
    }, [booking, selectedRoomType, adultsCount, childrenCount]);

    // ── Total capacity of all rooms in the available pool (for group bookings) ─
    const totalPoolCapacity = useMemo(() => {
        return availableRooms.reduce((sum, r) => sum + (Number(r.capacity) || 0), 0);
    }, [availableRooms]);

    const isGroupCapacityExceeded = useMemo(() => {
        if (!booking?.isGroupBooking) return false;
        if (availableRooms.length === 0) return false;
        const guestCount = (Number(adultsCount) || 0) + (Number(childrenCount) || 0);
        return totalPoolCapacity > 0 && guestCount > totalPoolCapacity;
    }, [booking, availableRooms, adultsCount, childrenCount, totalPoolCapacity]);

    // ── Hydrate state from fetched booking ────────────────────────────────────
    useEffect(() => {
        if (!booking) return;
        setNewCheckInDate(format(new Date(booking.checkInDate), 'yyyy-MM-dd'));
        setNewCheckOutDate(format(new Date(booking.checkOutDate), 'yyyy-MM-dd'));
        setUseRescheduleOverride(booking.isPriceOverridden || false);
        setRescheduleOverrideTotal(booking.isPriceOverridden ? Number(booking.totalAmount).toString() : '');
        setRescheduleOverrideReason(booking.overrideReason || '');
        setSelectedRoomIds(booking.bookingRooms?.map((br: any) => br.roomId) || []);
        setRescheduleRoomTypeId(booking.roomTypeId || '');
        setBookerFirstName(booking.user?.firstName || '');
        setBookerLastName(booking.user?.lastName || '');
        setBookerEmail(booking.user?.email || '');
        setBookerPhone(booking.user?.phone || '');
        setBookerWhatsapp(booking.whatsappNumber || booking.user?.whatsappNumber || '');
        setGuestFirstName(booking.guests?.[0]?.firstName || '');
        setGuestLastName(booking.guests?.[0]?.lastName || '');
        setGuestEmail(booking.guests?.[0]?.email || '');
        setGuestPhone(booking.guests?.[0]?.phone || '');
        setGuestWhatsapp(booking.guests?.[0]?.whatsappNumber || '');
        setAdultsCount(booking.adultsCount || 1);
        setChildrenCount(booking.childrenCount || 0);

        const g0 = booking.guests?.[0];
        const u = booking.user;
        if (g0 && u) {
            // Only treat as "different people" when:
            //   - first names are clearly different, OR
            //   - both have non-empty phones that don't match
            // If guest phone is empty (created with "Add booker as primary guest"), default to same-as-booker.
            const differentFirstName = g0.firstName?.trim() !== u.firstName?.trim();
            const bothHavePhone = !!(g0.phone && u.phone);
            const differentPhone = bothHavePhone && g0.phone !== u.phone;
            setIsGuestSameAsBooker(!differentFirstName && !differentPhone);
        } else {
            // No guest record at all → booker is the guest
            setIsGuestSameAsBooker(true);
        }
    }, [booking]);

    // ── Default room type when roomTypes load ─────────────────────────────────
    useEffect(() => {
        if (!rescheduleRoomTypeId && roomTypes && roomTypes.length > 0) {
            const defaultType =
                roomTypes.find((rt) => rt.isAvailableForGroupBooking || rt.isGroupPool)?.id ||
                roomTypes[0]?.id;
            if (defaultType) setRescheduleRoomTypeId(defaultType);
        }
    }, [roomTypes, rescheduleRoomTypeId]);

    // ── Sync guest same as booker ─────────────────────────────────────────────
    useEffect(() => {
        if (isGuestSameAsBooker) {
            setGuestFirstName(bookerFirstName);
            setGuestLastName(bookerLastName);
            setGuestEmail(bookerEmail);
            setGuestPhone(bookerPhone);
            setGuestWhatsapp(bookerWhatsapp);
        }
    }, [isGuestSameAsBooker, bookerFirstName, bookerLastName, bookerEmail, bookerPhone, bookerWhatsapp]);

    // ── Derived values ────────────────────────────────────────────────────────
    const originalTotal = Number(booking?.totalAmount || 0);
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

    // ── Price preview ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!booking || !newCheckInDate || !newCheckOutDate || (!booking.isGroupBooking && !rescheduleRoomTypeId)) {
            setNewPricePreview(null);
            return;
        }

        const fetchPreview = async () => {
            try {
                setIsCalculatingPreview(true);
                const roomCount = booking.bookingRooms?.length || 1;
                const preview = await bookingsService.calculatePrice({
                    roomTypeId: rescheduleRoomTypeId,
                    checkInDate: newCheckInDate,
                    checkOutDate: newCheckOutDate,
                    adultsCount,
                    childrenCount,
                    couponCode: booking.couponCode || undefined,
                    referralCode: booking.channelPartner?.referralCode || undefined,
                    currency: booking.bookingCurrency || 'INR',
                    isGroupBooking: booking.isGroupBooking,
                    groupSize: booking.isGroupBooking ? adultsCount + childrenCount : undefined,
                    roomCount,
                    overrideTotal:
                        useRescheduleOverride && rescheduleOverrideTotal
                            ? Number(rescheduleOverrideTotal)
                            : undefined,
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

    // ── Available rooms ───────────────────────────────────────────────────────
    useEffect(() => {
        if (!booking || !newCheckInDate || !newCheckOutDate || (!booking.isGroupBooking && !rescheduleRoomTypeId)) {
            setAvailableRooms([]);
            return;
        }

        const fetchAvailableRooms = async () => {
            try {
                setIsLoadingRooms(true);
                setGroupUnavailableReason(null);
                const checkRes = await bookingsService.checkAvailability({
                    roomTypeId: booking.isGroupBooking ? undefined : rescheduleRoomTypeId,
                    checkInDate: newCheckInDate,
                    checkOutDate: newCheckOutDate,
                    propertyId,
                    isGroupBooking: booking.isGroupBooking,
                    groupSize: booking.isGroupBooking ? adultsCount + childrenCount : undefined,
                    isAdmin: true,
                    excludeBookingId: booking.id,
                });
                setAvailableRooms(checkRes.roomList || []);
                if (booking.isGroupBooking && !checkRes.available && checkRes.groupUnavailableReason) {
                    setGroupUnavailableReason(checkRes.groupUnavailableReason);
                }
            } catch (err: any) {
                setAvailableRooms([]);
                const msg = err.response?.data?.message || 'Failed to check availability';
                toast.error(msg);
            } finally {
                setIsLoadingRooms(false);
            }
        };

        const timer = setTimeout(fetchAvailableRooms, 500);
        return () => clearTimeout(timer);
    }, [booking, newCheckInDate, newCheckOutDate, propertyId, rescheduleRoomTypeId, adultsCount, childrenCount]);

    // ── Helpers to resolve selected rooms ─────────────────────────────────────
    const getRoomNumber = (roomId: string) => {
        const roomInAvailable = availableRooms.find(r => r.id === roomId);
        if (roomInAvailable) return roomInAvailable.roomNumber;

        if (booking?.bookingRooms) {
            const br = booking.bookingRooms.find((br: any) => br.roomId === roomId);
            if (br?.room) return br.room.roomNumber;
        }

        return null;
    };

    const displayRooms = useMemo(() => {
        const list = [...availableRooms];
        if (!booking) return list;
        
        booking.bookingRooms?.forEach((br: any) => {
            if (selectedRoomIds.includes(br.roomId) && !list.some(r => r.id === br.roomId)) {
                list.push({
                    id: br.roomId,
                    name: `Unit ${br.room?.roomNumber}`,
                    roomNumber: br.room?.roomNumber,
                    roomType: br.room?.roomType?.name || 'Standard',
                    capacity: br.room?.roomType
                        ? (br.room.roomType.groupMaxOccupancy || (br.room.roomType.maxAdults + (br.room.roomType.maxChildren || 0)))
                        : 2,
                });
            }
        });

        return list;
    }, [availableRooms, selectedRoomIds, booking]);
    const selectedRoomTypesString = useMemo(() => {
        if (!booking) return 'No Room Type';
        
        const roomsToUse = selectedRoomIds.length > 0 
            ? displayRooms.filter(r => selectedRoomIds.includes(r.id))
            : (booking.bookingRooms || []);

        const types = roomsToUse.map((r: any) => {
            if (r.roomType) return r.roomType;
            if (r.room?.roomType?.name) return r.room.roomType.name;
            return null;
        }).filter(Boolean);

        const uniqueTypes = Array.from(new Set(types));
        if (uniqueTypes.length === 0) return 'No Room Type';
        return uniqueTypes.join(', ');
    }, [displayRooms, selectedRoomIds, booking]);

    // ── Auto-select rooms when list loads ─────────────────────────────────────
    useEffect(() => {
        if (!booking || availableRooms.length === 0) return;
        
        // If dates are unchanged from the original booking, keep the original rooms selected
        const originalRoomIds = booking.bookingRooms?.map((br: any) => br.roomId) || [];
        const originalCheckIn = format(new Date(booking.checkInDate), 'yyyy-MM-dd');
        const originalCheckOut = format(new Date(booking.checkOutDate), 'yyyy-MM-dd');
        const isSameDates = newCheckInDate === originalCheckIn && newCheckOutDate === originalCheckOut;

        // Filter current selection to only keep rooms that are still available OR are original rooms on same dates
        const validSelectedRoomIds = selectedRoomIds.filter(id =>
            availableRooms.some(r => r.id === id) || (isSameDates && originalRoomIds.includes(id))
        );

        if (booking.isGroupBooking) {
            // For group bookings, make sure we select defaultCount rooms if possible
            const defaultCount = booking.bookingRooms?.length || 1;
            if (validSelectedRoomIds.length < defaultCount) {
                const additionalNeeded = defaultCount - validSelectedRoomIds.length;
                const unselectedAvailable = availableRooms
                    .filter(r => !validSelectedRoomIds.includes(r.id))
                    .map(r => r.id);
                setSelectedRoomIds([
                    ...validSelectedRoomIds,
                    ...unselectedAvailable.slice(0, additionalNeeded)
                ]);
            } else {
                setSelectedRoomIds(validSelectedRoomIds);
            }
        } else {
            // For standard bookings, make sure we select up to requiredRooms
            if (validSelectedRoomIds.length < requiredRooms) {
                const additionalNeeded = requiredRooms - validSelectedRoomIds.length;
                const unselectedAvailable = availableRooms
                    .filter(r => !validSelectedRoomIds.includes(r.id))
                    .map(r => r.id);
                setSelectedRoomIds([
                    ...validSelectedRoomIds,
                    ...unselectedAvailable.slice(0, additionalNeeded)
                ]);
            } else {
                setSelectedRoomIds(validSelectedRoomIds);
            }
        }
    }, [availableRooms, booking, requiredRooms, newCheckInDate, newCheckOutDate]);

    const toggleRoomSelection = (roomId: string) => {
        setSelectedRoomIds((prev) => {
            if (prev.includes(roomId)) {
                return prev.filter((id) => id !== roomId);
            }
            return [...prev, roomId];
        });
    };

    // ── Mutation ──────────────────────────────────────────────────────────────
    const rescheduleMutation = useMutation({
        mutationFn: bookingsService.reschedule,
        onSuccess: () => {
            toast.success('Booking rescheduled successfully');
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            queryClient.invalidateQueries({ queryKey: ['booking', id] });
            navigate(`/bookings/${id}`);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to reschedule booking');
        },
    });

    const handleSubmit = () => {
        if (!booking || !newCheckInDate || !newCheckOutDate) return;

        const originalCheckIn = new Date(booking.checkInDate);
        originalCheckIn.setHours(0, 0, 0, 0);
        const newCheckIn = new Date(newCheckInDate);
        newCheckIn.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil(Math.abs(newCheckIn.getTime() - originalCheckIn.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 90) {
            toast.error('Rescheduling is only allowed within 3 months (90 days) of the original check-in date.');
            return;
        }
        if (!bookerFirstName.trim()) { toast.error('Booker First Name is required.'); return; }
        if (!bookerPhone.trim()) { toast.error('Booker Phone Number is required.'); return; }
        if (!guestFirstName.trim()) { toast.error('Guest First Name is required.'); return; }

        if (!booking.isGroupBooking && selectedRoomIds.length < requiredRooms) {
            toast.error(`Please select at least ${requiredRooms} room(s) to accommodate all guests.`);
            return;
        }
        if (selectedRoomIds.length === 0) {
            toast.error('Please select at least one room.');
            return;
        }
        if (useRescheduleOverride) {
            if (!rescheduleOverrideTotal) { toast.error('Please specify the override total price.'); return; }
        }

        rescheduleMutation.mutate({
            id: booking.id,
            data: {
                checkInDate: newCheckInDate,
                checkOutDate: newCheckOutDate,
                selectedRoomIds,
                overrideTotal: useRescheduleOverride && rescheduleOverrideTotal ? Number(rescheduleOverrideTotal) : undefined,
                overrideReason: useRescheduleOverride ? (rescheduleOverrideReason || undefined) : undefined,
                roomTypeId: booking.isGroupBooking ? undefined : rescheduleRoomTypeId,
                adultsCount: Number(adultsCount),
                childrenCount: Number(childrenCount),
                guestName: `${bookerFirstName} ${bookerLastName || ''}`.trim(),
                guestEmail: bookerEmail || undefined,
                guestPhone: bookerPhone,
                whatsappNumber: bookerWhatsapp || undefined,
                guests: [
                    {
                        id: booking.guests?.[0]?.id,
                        firstName: guestFirstName,
                        lastName: guestLastName || '',
                        email: guestEmail || undefined,
                        phone: guestPhone || undefined,
                        whatsappNumber: guestWhatsapp || undefined,
                    },
                ],
            },
        });
    };

    // ── Loading / Error states ────────────────────────────────────────────────
    if (isLoadingBooking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading booking...</p>
            </div>
        );
    }

    if (isError || !booking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm font-bold text-destructive">Booking not found or failed to load.</p>
                <button onClick={() => navigate('/bookings')} className="text-primary underline text-sm font-bold">
                    Back to Bookings
                </button>
            </div>
        );
    }

    // ── Price helper ──────────────────────────────────────────────────────────
    const paidAmount = Number(booking.paidAmount || 0);
    const activeNewTotal =
        useRescheduleOverride && rescheduleOverrideTotal
            ? Number(rescheduleOverrideTotal)
            : (newPricePreview?.totalAmount ?? originalTotal);
    const newBalanceDue = activeNewTotal - paidAmount;
    const rateDiff = activeNewTotal - originalTotal;

    return (
        <>
            {/* Full Page Loader Overlay */}
            {rescheduleMutation.isPending && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-widest">Processing Reschedule...</h2>
                    <p className="text-sm font-bold text-muted-foreground mt-2">Please wait, do not close or refresh this page.</p>
                </div>
            )}
            
            {/* ── Calendar Modal ── */}
            {showCalendarModal && (
                <RescheduleCalendarModal
                    booking={booking}
                    roomTypeId={rescheduleRoomTypeId}
                    roomTypeName={roomTypes?.find((rt) => rt.id === rescheduleRoomTypeId)?.name || 'Selected Room Type'}
                    propertyId={propertyId}
                    roomTypes={roomTypes}
                    onClose={() => setShowCalendarModal(false)}
                    onSelectDates={(checkIn, checkOut) => {
                        setNewCheckInDate(checkIn);
                        setNewCheckOutDate(checkOut);
                        setShowCalendarModal(false);
                    }}
                />
            )}

            {/* ── Page ── */}
            <div className="flex flex-col h-full min-h-screen bg-background">
                {/* Header */}
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 sm:px-6 py-4 flex-shrink-0">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
                        {/* Left: breadcrumb + title */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-xl hover:bg-muted transition-all shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-wider truncate">
                                <span
                                    className="cursor-pointer hover:text-foreground transition-colors"
                                    onClick={() => navigate('/bookings')}
                                >
                                    Bookings
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                <span
                                    className="cursor-pointer hover:text-foreground transition-colors truncate max-w-[120px]"
                                    onClick={() => navigate(`/bookings/${booking.id}`)}
                                >
                                    {booking.bookingNumber}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-primary">Reschedule</span>
                            </div>
                        </div>

                        {/* Right: action buttons */}
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-4 py-2 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors text-foreground"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={rescheduleMutation.isPending || !newCheckInDate || !newCheckOutDate}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {rescheduleMutation.isPending ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><Calendar className="h-4 w-4" /> Confirm Reschedule</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Page heading */}
                <div className="bg-gradient-to-br from-primary/8 via-transparent to-transparent border-b border-border/30 px-4 sm:px-6 py-6">
                    <div className="max-w-screen-2xl mx-auto flex items-center gap-5">
                        <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 rotate-3 shrink-0">
                            <Calendar className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground">Reschedule Booking</h1>
                            <p className="text-sm text-muted-foreground font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Booking: <span className="text-primary font-bold">{booking.bookingNumber}</span></span>
                                {/* Booking type badge */}
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                                    booking.isGroupBooking
                                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                        : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                                }`}>
                                    {booking.isGroupBooking ? '🏨 Group Booking' : '🛏 Standard Booking'}
                                </span>
                                {booking.channelPartner && (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                                        Channel Partner: {booking.channelPartner.accountHolderName}
                                    </span>
                                )}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8">
                        {/* ── LEFT COLUMN ── */}
                        <div className="space-y-6">
                            {/* 1. Guest & Room Details Card */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                        Booking Details
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingGuestDetails(!isEditingGuestDetails)}
                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-black uppercase tracking-wider transition-all"
                                    >
                                        {isEditingGuestDetails ? 'View Stay Details' : 'Edit Guest Details'}
                                    </button>
                                </div>

                                {!isEditingGuestDetails ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-200">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/30 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                                                <User className="h-4 w-4" />
                                                <span>Guest & Booker Info</span>
                                            </div>
                                            <div className="space-y-1 pl-6">
                                                <p className="text-sm font-bold text-foreground">{bookerFirstName} {bookerLastName}</p>
                                                {bookerPhone && <p className="text-xs text-muted-foreground">Phone: {bookerPhone}</p>}
                                                {bookerEmail && <p className="text-xs text-muted-foreground">Email: {bookerEmail}</p>}
                                                {bookerWhatsapp && <p className="text-xs text-muted-foreground">WhatsApp: {bookerWhatsapp}</p>}
                                                {!isGuestSameAsBooker && (
                                                    <div className="pt-2 mt-2 border-t border-border/30 space-y-1">
                                                        <p className="text-[10px] font-black text-primary uppercase tracking-wider">Primary Guest</p>
                                                        <p className="text-xs font-bold text-foreground">{guestFirstName} {guestLastName}</p>
                                                        {guestPhone && <p className="text-[10px] text-muted-foreground">Phone: {guestPhone}</p>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/30 space-y-2">
                                            <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-wider">
                                                <House className="h-4 w-4" />
                                                <span>Room & Stay Info</span>
                                            </div>
                                            <div className="space-y-1 pl-6 text-xs text-muted-foreground">
                                                <p className="font-bold text-foreground">
                                                    {selectedRoomTypesString}
                                                </p>
                                                <p>
                                                    Unit:{' '}
                                                    <span className="font-semibold text-foreground">
                                                        {selectedRoomIds.length > 0
                                                            ? selectedRoomIds.map(id => getRoomNumber(id)).filter(Boolean).join(', ')
                                                            : (booking.bookingRooms?.map((br: any) => br.room?.roomNumber).filter(Boolean).join(', ') || 'Unassigned')}
                                                    </span>
                                                </p>
                                                <p>
                                                    Stay:{' '}
                                                    <span className="font-semibold text-foreground">
                                                        {newCheckInDate && newCheckOutDate
                                                            ? `${format(new Date(newCheckInDate), 'MMM d')} – ${format(new Date(newCheckOutDate), 'MMM d, yyyy')}`
                                                            : 'N/A'}
                                                    </span>
                                                </p>
                                                <p>
                                                    Guests:{' '}
                                                    <span className="font-semibold text-foreground">{adultsCount} Adults, {childrenCount} Children</span>
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-5 animate-in fade-in duration-200">
                                        {/* Booker Form */}
                                        <div className="bg-muted/20 border border-border/30 rounded-xl p-4 space-y-4">
                                            <h4 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
                                                <User className="h-3.5 w-3.5" /> Booker / Primary Contact
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { label: 'First Name *', value: bookerFirstName, set: setBookerFirstName, type: 'text' },
                                                    { label: 'Last Name', value: bookerLastName, set: setBookerLastName, type: 'text' },
                                                    { label: 'Email', value: bookerEmail, set: setBookerEmail, type: 'email' },
                                                    { label: 'Phone *', value: bookerPhone, set: setBookerPhone, type: 'text' },
                                                ].map((f) => (
                                                    <div key={f.label}>
                                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">{f.label}</label>
                                                        <input
                                                            type={f.type}
                                                            value={f.value}
                                                            onChange={(e) => f.set(e.target.value)}
                                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                                        />
                                                    </div>
                                                ))}
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">WhatsApp</label>
                                                    <input type="text" value={bookerWhatsapp} onChange={(e) => setBookerWhatsapp(e.target.value)} className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Guest Form */}
                                        <div className="bg-muted/20 border border-border/30 rounded-xl p-4 space-y-4">
                                            <div className="flex items-center justify-between">
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
                                                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Same as Booker</span>
                                                </label>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {[
                                                    { label: 'First Name *', value: guestFirstName, set: setGuestFirstName, type: 'text' },
                                                    { label: 'Last Name', value: guestLastName, set: setGuestLastName, type: 'text' },
                                                    { label: 'Email', value: guestEmail, set: setGuestEmail, type: 'email' },
                                                    { label: 'Phone', value: guestPhone, set: setGuestPhone, type: 'text' },
                                                ].map((f) => (
                                                    <div key={f.label}>
                                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">{f.label}</label>
                                                        <input
                                                            type={f.type}
                                                            value={f.value}
                                                            onChange={(e) => f.set(e.target.value)}
                                                            disabled={isGuestSameAsBooker}
                                                            className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}
                                                        />
                                                    </div>
                                                ))}
                                                <div className="sm:col-span-2">
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 pl-1">WhatsApp</label>
                                                    <input
                                                        type="text"
                                                        value={guestWhatsapp}
                                                        onChange={(e) => setGuestWhatsapp(e.target.value)}
                                                        disabled={isGuestSameAsBooker}
                                                        className={`w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none ${isGuestSameAsBooker ? 'opacity-60 cursor-not-allowed bg-muted/50' : ''}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 2. 90-day alert */}
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
                                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-sm text-primary font-medium leading-relaxed">
                                    Rescheduling must be within 3 months (90 days) of the original check-in:{' '}
                                    <span className="font-bold underline">{format(new Date(booking.checkInDate), 'MMM d, yyyy')}</span>.
                                </p>
                            </div>

                            {/* 3. Room Type + Dates */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5 shadow-sm">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">New Stay Dates</h3>
                                <div className={booking.isGroupBooking ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'grid grid-cols-1 sm:grid-cols-3 gap-4'}>
                                    {!booking.isGroupBooking && (
                                        <div>
                                            <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Room Type</label>
                                            <select
                                                value={rescheduleRoomTypeId}
                                                onChange={(e) => setRescheduleRoomTypeId(e.target.value)}
                                                className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                            >
                                                {roomTypes?.map((rt) => (
                                                    <option key={rt.id} value={rt.id}>{rt.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Check-In</label>
                                        <input
                                            type="text"
                                            value={newCheckInDate ? newCheckInDate.split('-').reverse().join('/') : ''}
                                            onClick={() => setShowCalendarModal(true)}
                                            readOnly
                                            placeholder="Select date"
                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Check-Out</label>
                                        <input
                                            type="text"
                                            value={newCheckOutDate ? newCheckOutDate.split('-').reverse().join('/') : ''}
                                            onClick={() => setShowCalendarModal(true)}
                                            readOnly
                                            placeholder="Select date"
                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Capacity */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Adults (13+)</label>
                                        <input
                                            type="number" min="1" value={adultsCount}
                                            onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Children (6–12)</label>
                                        <input
                                            type="number" min="0" value={childrenCount}
                                            onChange={(e) => setChildrenCount(Math.max(0, parseInt(e.target.value) || 0))}
                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Calendar button */}
                                <button
                                    type="button"
                                    onClick={() => setShowCalendarModal(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2 border-2 border-primary/20 text-primary hover:bg-primary/5 hover:border-primary/40 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    <Calendar className="h-4 w-4" />
                                    Check Room Availability Calendar
                                </button>
                            </div>

                            {/* 4. Room Selection */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Select Room(s)</h3>
                                    <span className="text-xs font-black text-muted-foreground uppercase tracking-wide">
                                        {booking.isGroupBooking 
                                            ? `Select Unit(s) (Selected: ${selectedRoomIds.length})` 
                                            : `Select at least ${requiredRooms} Unit(s) (Selected: ${selectedRoomIds.length})`}
                                    </span>
                                </div>

                                {!booking.isGroupBooking && selectedRoomIds.length < requiredRooms && (
                                    <div className="flex gap-3 bg-red-500/5 dark:bg-red-950/20 border border-red-500/25 dark:border-red-950/40 rounded-2xl p-4">
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                        <div className="text-xs text-red-700 dark:text-red-400 font-semibold leading-relaxed">
                                            Guest count ({adultsCount} Adults, {childrenCount} Children) requires at least <strong>{requiredRooms} rooms</strong>. You have selected only <strong>{selectedRoomIds.length} rooms</strong>.
                                        </div>
                                    </div>
                                )}

                                {booking.isGroupBooking && isGroupCapacityExceeded && !isLoadingRooms && (
                                    <div className="flex gap-3 bg-red-500/5 dark:bg-red-950/20 border border-red-500/25 dark:border-red-950/40 rounded-2xl p-4">
                                        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                        <div className="text-xs text-red-700 dark:text-red-400 font-semibold leading-relaxed">
                                            <strong>Guest count exceeds total room capacity.</strong>{' '}
                                            {adultsCount + childrenCount} guests ({adultsCount} Adults{childrenCount > 0 ? `, ${childrenCount} Children` : ''}) exceeds the combined capacity of all {availableRooms.length} rooms in the group pool (<strong>{totalPoolCapacity} guests max</strong>). Please reduce the guest count.
                                        </div>
                                    </div>
                                )}

                                {isLoadingRooms ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4 bg-muted/20 rounded-2xl">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Checking availability...</p>
                                    </div>
                                ) : displayRooms.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {displayRooms.map((room) => {
                                            const isSelected = selectedRoomIds.includes(room.id);
                                            return (
                                                <button
                                                    key={room.id}
                                                    type="button"
                                                    onClick={() => toggleRoomSelection(room.id)}
                                                    className={`relative overflow-hidden p-3 rounded-xl border text-left transition-all ${
                                                        isSelected
                                                            ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20 scale-95'
                                                            : 'bg-muted/30 text-foreground border-border/50 hover:bg-muted/60'
                                                    }`}
                                                >
                                                    <span className={`text-xs font-black uppercase tracking-tight block mb-1 ${isSelected ? 'text-primary-foreground/90' : 'text-primary'}`}>
                                                        {room.roomNumber || room.name}
                                                    </span>
                                                    <span className={`text-[10px] font-bold ${isSelected ? 'text-primary-foreground/80' : 'text-foreground/80'}`}>
                                                        Cap: {room.capacity || 'N/A'}
                                                    </span>
                                                    <span className={`text-[8px] mt-0.5 block truncate ${isSelected ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                                                        {room.roomType || 'Standard'}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="p-8 border border-dashed border-destructive/30 bg-destructive/5 rounded-2xl text-center space-y-2">
                                        <p className="text-sm font-bold text-destructive">
                                            {booking.isGroupBooking && groupUnavailableReason === 'CAPACITY_EXCEEDED'
                                                ? 'Guest count exceeds total room capacity'
                                                : booking.isGroupBooking && groupUnavailableReason === 'NO_POOL_CONFIGURED'
                                                ? 'No group pool configured for this property'
                                                : 'No rooms available for the selected dates.'}
                                        </p>
                                        {booking.isGroupBooking && groupUnavailableReason === 'CAPACITY_EXCEEDED' && (
                                            <p className="text-xs text-destructive/80 font-medium">
                                                The total of {adultsCount + childrenCount} guests ({adultsCount} Adults{childrenCount > 0 ? `, ${childrenCount} Children` : ''}) exceeds the maximum capacity of all available rooms in the group pool. Please reduce the guest count.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN ── */}
                        <div className="space-y-6">
                            {/* Price Comparison */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5 shadow-sm">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Pricing Comparison</h3>

                                {isCalculatingPreview ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3 bg-muted/20 rounded-2xl">
                                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Recalculating rates...</span>
                                    </div>
                                ) : !newCheckInDate || !newCheckOutDate || new Date(newCheckInDate) >= new Date(newCheckOutDate) ? (
                                    <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-4 text-sm text-destructive font-bold text-center">
                                        Please select valid check-in and check-out dates.
                                    </div>
                                ) : (
                                    <>
                                        {/* Metrics */}
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { label: 'Original Total', value: `₹${originalTotal.toLocaleString('en-IN')}`, color: 'text-foreground' },
                                                { label: 'Amount Paid', value: `₹${paidAmount.toLocaleString('en-IN')}`, color: 'text-emerald-600 dark:text-emerald-400' },
                                                { label: 'New Total', value: `₹${activeNewTotal.toLocaleString('en-IN')}`, color: 'text-foreground' },
                                            ].map((m) => (
                                                <div key={m.label} className="bg-muted/40 p-3 rounded-xl border border-border/30 space-y-1">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">{m.label}</span>
                                                    <span className={`font-black text-base ${m.color}`}>{m.value}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-muted/40 p-3 rounded-xl border border-border/30 space-y-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Rate Adjustment</span>
                                                <span className={`font-black text-base ${rateDiff > 0 ? 'text-orange-600 dark:text-orange-400' : rateDiff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {rateDiff > 0 ? `+₹${rateDiff.toLocaleString('en-IN')} (Due)` : rateDiff < 0 ? `-₹${Math.abs(rateDiff).toLocaleString('en-IN')} (Credit)` : 'No Change'}
                                                </span>
                                            </div>
                                            <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 space-y-1">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest block">New Balance</span>
                                                <span className={`font-black text-base ${newBalanceDue > 0 ? 'text-orange-600 dark:text-orange-400' : newBalanceDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {newBalanceDue > 0 ? `₹${newBalanceDue.toLocaleString('en-IN')} Due` : newBalanceDue < 0 ? `-₹${Math.abs(newBalanceDue).toLocaleString('en-IN')} Credit` : '₹0 (Fully Paid)'}
                                                </span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Price Override */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Price Override</h3>

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
                                                    setRescheduleOverrideReason('Retained original stay price on reschedule');
                                                } else {
                                                    setUseRescheduleOverride(false);
                                                    setRescheduleOverrideTotal('');
                                                    setRescheduleOverrideReason('');
                                                }
                                            }}
                                            className="h-5 w-5 rounded border-emerald-500/30 text-emerald-600 focus:ring-emerald-500/20 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wide block">
                                                Keep Original Amount (₹{originalTotal.toLocaleString('en-IN')})
                                            </span>
                                            <span className="text-[10px] text-emerald-600/80 font-medium">Prevent price reduction and retain the original stay price.</span>
                                        </div>
                                    </label>
                                )}

                                {!keepOriginalAmount && (
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={useRescheduleOverride}
                                            onChange={(e) => setUseRescheduleOverride(e.target.checked)}
                                            disabled={booking.isPriceOverridden}
                                            className="h-5 w-5 rounded border-border/50 text-primary focus:ring-primary/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                        />
                                        <div>
                                            <span className="text-xs font-black text-foreground uppercase tracking-wide block">Override Total Price</span>
                                            <span className="text-[10px] text-muted-foreground font-medium">Manually set a custom total amount for this reschedule.</span>
                                        </div>
                                    </label>
                                )}

                                {useRescheduleOverride && !keepOriginalAmount && (
                                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">Override Total (₹)</label>
                                            <input
                                                type="number"
                                                value={rescheduleOverrideTotal}
                                                onChange={(e) => setRescheduleOverrideTotal(e.target.value)}
                                                placeholder="Enter total amount"
                                                className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">Override Reason</label>
                                            <input
                                                type="text"
                                                value={rescheduleOverrideReason}
                                                onChange={(e) => setRescheduleOverrideReason(e.target.value)}
                                                placeholder="Reason for price override"
                                                className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit CTA (visible on desktop bottom of right col) */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm">
                                <button
                                    onClick={handleSubmit}
                                    disabled={rescheduleMutation.isPending || !newCheckInDate || !newCheckOutDate}
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {rescheduleMutation.isPending ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...</>
                                    ) : (
                                        <><Calendar className="h-4 w-4" /> Confirm Reschedule</>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-muted-foreground font-medium mt-3">
                                    This will update the booking dates and pricing accordingly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
