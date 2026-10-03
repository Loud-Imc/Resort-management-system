import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import {
    Loader2,
    Calendar,
    AlertCircle,
    User,
    House,
    Users,
    ArrowLeft,
    ChevronRight,
    CheckCircle,
    X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { bookingsService } from '../../services/bookings';
import { roomTypesService } from '../../services/roomTypes';
import { ratePlansService, type RatePlan } from '../../services/ratePlans';
import { useProperty } from '../../context/PropertyContext';
import { RescheduleCalendarModal } from '../../components/bookings/RescheduleCalendarModal';
import AccommodationPackageCard from '../../components/bookings/AccommodationPackageCard';
import RoomAssignmentSection from '../../components/bookings/RoomAssignmentSection';
import CustomAccommodationModal from '../../components/bookings/CustomAccommodationModal';
import type { PriceCalculationResult } from '../../types/booking';

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

    const propertyId = booking?.propertyId || selectedProperty?.id || '';

    // ── Fetch room types ───────────────────────────────────────────────────────
    const { data: roomTypes } = useQuery<any[]>({
        queryKey: ['roomTypes', propertyId],
        queryFn: () => roomTypesService.getAll({ propertyId }),
        enabled: !!propertyId,
    });

    // ── Fetch rate plans for property ──────────────────────────────────────────
    const { data: propertyRatePlans } = useQuery<RatePlan[]>({
        queryKey: ['propertyRatePlans', propertyId],
        queryFn: () => ratePlansService.getRatePlansForProperty(propertyId),
        enabled: !!propertyId,
    });

    const activeMealPlans = useMemo(() => {
        const plans = (propertyRatePlans || []).filter(p => p.isActive);
        const meta: Record<string, { label: string; icon: string }> = {
            EP: { label: 'Room Only', icon: '☕' },
            CP: { label: 'Breakfast', icon: '🍳' },
            MAP: { label: 'Half Board', icon: '🍽️' },
            AP: { label: 'Full Board', icon: '👑' },
        };
        return plans.map(p => ({
            code: p.mealPlan as 'EP' | 'CP' | 'MAP' | 'AP',
            name: p.name || meta[p.mealPlan]?.label || p.mealPlan,
            label: meta[p.mealPlan]?.label || p.name || p.mealPlan,
            icon: meta[p.mealPlan]?.icon || '🍴',
            adultRate: Number(p.extraAdultPrice || 0),
            childRate: Number(p.extraChildPrice || 0),
            isPrimary: p.isPrimary,
            ratePlan: p,
        }));
    }, [propertyRatePlans]);

    // ── Local state ────────────────────────────────────────────────────────────
    const [newCheckInDate, setNewCheckInDate] = useState<string>('');
    const [newCheckOutDate, setNewCheckOutDate] = useState<string>('');
    const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);

    // Guest composition states (V2 Occupancy Parity)
    const [adultsCount, setAdultsCount] = useState<number | string>(1);
    const [childrenCount, setChildrenCount] = useState<number | string>(0);
    const [childAges, setChildAges] = useState<number[]>([]);
    const [infantsCount, setInfantsCount] = useState<number | string>(0);

    // Booker & Guest states
    const [isEditingGuestDetails, setIsEditingGuestDetails] = useState<boolean>(false);
    const [isGuestSameAsBooker, setIsGuestSameAsBooker] = useState<boolean>(true);
    const [bookerFirstName, setBookerFirstName] = useState<string>('');
    const [bookerLastName, setBookerLastName] = useState<string>('');
    const [bookerEmail, setBookerEmail] = useState<string>('');
    const [bookerPhone, setBookerPhone] = useState<string>('');
    const [bookerWhatsapp, setBookerWhatsapp] = useState<string>('');

    const [guestFirstName, setGuestFirstName] = useState<string>('');
    const [guestLastName, setGuestLastName] = useState<string>('');
    const [guestEmail, setGuestEmail] = useState<string>('');
    const [guestPhone, setGuestPhone] = useState<string>('');
    const [guestWhatsapp, setGuestWhatsapp] = useState<string>('');
    const [specialRequests, setSpecialRequests] = useState<string>('');

    // Accommodation Solutions & Rate Plans state
    const [accommodationSolutions, setAccommodationSolutions] = useState<any[] | null>(null);
    const [selectedSolution, setSelectedSolution] = useState<any | null>(null);
    const [solutionRoomAssignments, setSolutionRoomAssignments] = useState<Record<number, string>>({});
    const [roomAcSelections, setRoomAcSelections] = useState<Record<number, boolean>>({});
    const [selectedMealPlan, setSelectedMealPlan] = useState<'EP' | 'CP' | 'MAP' | 'AP'>('EP');
    const [isSearchingSolutions, setIsSearchingSolutions] = useState<boolean>(false);
    const [showFullSolutionsModal, setShowFullSolutionsModal] = useState<boolean>(false);
    const [showCustomSolutionModal, setShowCustomSolutionModal] = useState<boolean>(false);

    // Price calculation & override states
    const [newPricePreview, setNewPricePreview] = useState<PriceCalculationResult | null>(null);
    const [isCalculatingPreview, setIsCalculatingPreview] = useState<boolean>(false);
    const [useRescheduleOverride, setUseRescheduleOverride] = useState<boolean>(false);
    const [rescheduleOverrideTotal, setRescheduleOverrideTotal] = useState<string>('');
    const [rescheduleOverrideReason, setRescheduleOverrideReason] = useState<string>('');
    const [keepOriginalAmount, setKeepOriginalAmount] = useState<boolean>(false);

    const [hydratedBookingId, setHydratedBookingId] = useState<string | null>(null);
    const searchRequestId = useRef<number>(0);

    // ── Hydrate state from fetched booking ────────────────────────────────────
    useEffect(() => {
        if (!booking || hydratedBookingId === booking.id) return;

        if (['CHECKED_IN', 'CHECKED_OUT'].includes(booking.status)) {
            toast.error('Checked-in bookings cannot be rescheduled');
            navigate(`/bookings/${booking.id}`);
            return;
        }

        setHydratedBookingId(booking.id);

        setNewCheckInDate(format(new Date(booking.checkInDate), 'yyyy-MM-dd'));
        setNewCheckOutDate(format(new Date(booking.checkOutDate), 'yyyy-MM-dd'));
        setUseRescheduleOverride(booking.isPriceOverridden || false);
        setRescheduleOverrideTotal(booking.isPriceOverridden ? Number(booking.totalAmount).toString() : '');
        setRescheduleOverrideReason(booking.overrideReason || '');
        setSpecialRequests(booking.specialRequests || '');

        setAdultsCount(booking.adultsCount || 1);
        setChildrenCount(booking.childrenCount || 0);
        setChildAges(booking.childAges && booking.childAges.length > 0 ? booking.childAges : Array(booking.childrenCount || 0).fill(5));
        setInfantsCount((booking as any).infantsCount || 0);

        if (booking.mealPlan) {
            setSelectedMealPlan(booking.mealPlan as any);
        }

        setBookerFirstName(booking.user?.firstName || '');
        setBookerLastName(booking.user?.lastName || '');
        setBookerEmail(booking.user?.email || '');
        setBookerPhone(booking.user?.phone || '');
        setBookerWhatsapp(booking.whatsappNumber || booking.user?.whatsappNumber || '');

        const g0 = booking.guests?.[0];
        const u = booking.user;
        if (g0) {
            setGuestFirstName(g0.firstName || '');
            setGuestLastName(g0.lastName || '');
            setGuestEmail(g0.email || '');
            setGuestPhone(g0.phone || '');
            setGuestWhatsapp(g0.whatsappNumber || '');
        }

        if (g0 && u) {
            const differentFirstName = g0.firstName?.trim() !== u.firstName?.trim();
            const normalizePhone = (p?: string | null) => (p || '').replace(/\D/g, '').replace(/^0+/, '');
            const nGuest = normalizePhone(g0.phone);
            const nUser = normalizePhone(u.phone);
            const differentPhone = Boolean(g0.phone && u.phone && !(nGuest.endsWith(nUser) || nUser.endsWith(nGuest)));
            setIsGuestSameAsBooker(!differentFirstName && !differentPhone);
        } else {
            setIsGuestSameAsBooker(true);
        }
    }, [booking, hydratedBookingId, navigate]);

    // Keep checkOutDate = checkInDate + 1 when user modifies checkIn
    useEffect(() => {
        if (!booking || !newCheckInDate) return;
        const originalCheckIn = format(new Date(booking.checkInDate), 'yyyy-MM-dd');
        if (newCheckInDate === originalCheckIn) return;

        const checkIn = new Date(newCheckInDate);
        if (!isNaN(checkIn.getTime())) {
            const nextDay = addDays(checkIn, 1);
            setNewCheckOutDate(format(nextDay, 'yyyy-MM-dd'));
        }
    }, [newCheckInDate, booking]);

    // Sync guest same as booker
    useEffect(() => {
        if (isGuestSameAsBooker) {
            setGuestFirstName(bookerFirstName);
            setGuestLastName(bookerLastName);
            setGuestEmail(bookerEmail);
            setGuestPhone(bookerPhone);
            setGuestWhatsapp(bookerWhatsapp);
        }
    }, [isGuestSameAsBooker, bookerFirstName, bookerLastName, bookerEmail, bookerPhone, bookerWhatsapp]);

    // ── Search Accommodation Solutions (Solver Integration) ───────────────────
    useEffect(() => {
        if (!propertyId || !newCheckInDate || !newCheckOutDate) {
            setAccommodationSolutions(null);
            setSelectedSolution(null);
            return;
        }

        const checkIn = new Date(newCheckInDate);
        const checkOut = new Date(newCheckOutDate);
        if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime()) || checkOut <= checkIn) {
            setAccommodationSolutions(null);
            setSelectedSolution(null);
            return;
        }

        const currentSearch = ++searchRequestId.current;

        const timer = setTimeout(async () => {
            try {
                setIsSearchingSolutions(true);
                const parsedAdults = Math.max(1, Number(adultsCount) || 1);
                const parsedChildren = Math.max(0, Number(childrenCount) || 0);

                const searchRes = await bookingsService.searchRooms({
                    propertyId,
                    checkInDate: newCheckInDate,
                    checkOutDate: newCheckOutDate,
                    adults: parsedAdults,
                    children: parsedChildren,
                    childAges: childAges.length > 0 ? childAges : undefined,
                    infants: Number(infantsCount) > 0 ? Number(infantsCount) : undefined,
                    includeSoldOut: true,
                    isGroupBooking: booking?.isGroupBooking,
                    groupSize: booking?.isGroupBooking ? (parsedAdults + parsedChildren) : undefined,
                });

                if (currentSearch !== searchRequestId.current) return;

                if (searchRes.accommodationSolutions && searchRes.accommodationSolutions.length > 0) {
                    setAccommodationSolutions(searchRes.accommodationSolutions);
                    
                    // Maintain current selected solution if possible, else pick top recommended
                    setSelectedSolution((prev: any) => {
                        if (prev) {
                            const matching = searchRes.accommodationSolutions?.find((s: any) => s.id === prev.id);
                            if (matching) return matching;
                        }
                        return searchRes.accommodationSolutions![0];
                    });
                } else {
                    setAccommodationSolutions(null);
                    setSelectedSolution(null);
                }
            } catch (err: any) {
                console.error('[ReschedulePage] Failed to search accommodation solutions:', err);
                setAccommodationSolutions(null);
                setSelectedSolution(null);
            } finally {
                if (currentSearch === searchRequestId.current) {
                    setIsSearchingSolutions(false);
                }
            }
        }, 350);

        return () => clearTimeout(timer);
    }, [propertyId, newCheckInDate, newCheckOutDate, adultsCount, childrenCount, childAges, infantsCount, booking?.isGroupBooking]);

    // Pre-populate physical room assignments when solution is selected
    useEffect(() => {
        if (!selectedSolution || !booking) return;

        const allocatedRooms = selectedSolution.rooms || selectedSolution.allocatedRooms || [];
        const originalRooms = booking.bookingRooms || [];

        setSolutionRoomAssignments(prev => {
            const updated: Record<number, string> = { ...prev };
            allocatedRooms.forEach((ar: any, idx: number) => {
                // If room assignment not already selected, try to match original room of same roomTypeId
                if (!updated[idx]) {
                    const match = originalRooms.find((obr: any) => obr.room?.roomTypeId === ar.roomTypeId || obr.roomTypeId === ar.roomTypeId);
                    if (match && match.roomId) {
                        const backendAvailableRooms = ar.availableRooms || selectedSolution.availableRoomsByRoomType?.[ar.roomTypeId] || [];
                        const isStillAvail = backendAvailableRooms.length > 0
                            ? backendAvailableRooms.some((r: any) => r.id === match.roomId)
                            : true;
                        if (isStillAvail) {
                            updated[idx] = match.roomId;
                        }
                    }
                }
            });
            return updated;
        });
    }, [selectedSolution, booking]);

    // ── Build roomAllocations Payload ─────────────────────────────────────────
    const activePlanDetails = selectedSolution?.ratesByMealPlan?.[selectedMealPlan || 'EP'];
    const activeRatePlanId = activePlanDetails?.ratePlanId || selectedSolution?.ratePlanId || undefined;

    const allocatedRooms = selectedSolution?.rooms || selectedSolution?.allocatedRooms || [];

    const roomAllocationsPayload = useMemo(() => {
        if (!selectedSolution || allocatedRooms.length === 0) return undefined;

        return allocatedRooms.map((ar: any, idx: number) => {
            const assignedRoomId = solutionRoomAssignments[idx];
            const isAc = roomAcSelections[idx] !== undefined ? roomAcSelections[idx] : (ar.isAcSelected ?? (ar.acOption !== 'NON_AC_ONLY'));

            return {
                roomTypeId: ar.roomTypeId,
                roomId: assignedRoomId || undefined,
                adults: ar.adults,
                children: ar.children,
                childAges: ar.childAges || (ar.children > 0 ? childAges.slice(0, ar.children) : []),
                infants: ar.infants || 0,
                extraAdults: ar.extraAdults || 0,
                extraChildren: ar.extraChildren || 0,
                ratePlanId: ar.ratePlanId || activeRatePlanId,
                mealPlan: selectedMealPlan || 'EP',
                isAcSelected: isAc,
            };
        });
    }, [selectedSolution, allocatedRooms, solutionRoomAssignments, roomAcSelections, childAges, activeRatePlanId, selectedMealPlan]);

    // ── Price preview calculation ─────────────────────────────────────────────
    useEffect(() => {
        const parsedAdults = Math.max(1, Number(adultsCount) || 1);
        const parsedChildren = Math.max(0, Number(childrenCount) || 0);

        if (!booking || !newCheckInDate || !newCheckOutDate) {
            setNewPricePreview(null);
            return;
        }

        const fetchPreview = async () => {
            try {
                setIsCalculatingPreview(true);
                const roomCount = allocatedRooms.length > 0 ? allocatedRooms.length : (booking.bookingRooms?.length || 1);
                const preview = await bookingsService.calculatePrice({
                    roomTypeId: allocatedRooms[0]?.roomTypeId || booking.roomTypeId || undefined,
                    checkInDate: newCheckInDate,
                    checkOutDate: newCheckOutDate,
                    adultsCount: parsedAdults,
                    childrenCount: parsedChildren,
                    childAges: childAges.length > 0 ? childAges : undefined,
                    infantsCount: Number(infantsCount) > 0 ? Number(infantsCount) : undefined,
                    couponCode: booking.couponCode || undefined,
                    referralCode: booking.channelPartner?.referralCode || undefined,
                    currency: booking.bookingCurrency || 'INR',
                    isGroupBooking: booking.isGroupBooking,
                    groupSize: booking.isGroupBooking ? (parsedAdults + parsedChildren) : undefined,
                    roomCount,
                    ratePlanId: activeRatePlanId,
                    mealPlan: selectedMealPlan || 'EP',
                    isAcSelected: roomAllocationsPayload?.[0]?.isAcSelected ?? true,
                    roomAllocations: roomAllocationsPayload,
                    overrideTotal: useRescheduleOverride && rescheduleOverrideTotal ? Number(rescheduleOverrideTotal) : undefined,
                    isOverrideInclusive: true,
                });
                setNewPricePreview(preview);
            } catch (err) {
                console.error('[ReschedulePage] Failed to calculate price preview:', err);
                setNewPricePreview(null);
            } finally {
                setIsCalculatingPreview(false);
            }
        };

        const timer = setTimeout(fetchPreview, 350);
        return () => clearTimeout(timer);
    }, [
        booking,
        newCheckInDate,
        newCheckOutDate,
        adultsCount,
        childrenCount,
        childAges,
        infantsCount,
        activeRatePlanId,
        selectedMealPlan,
        roomAllocationsPayload,
        allocatedRooms,
        useRescheduleOverride,
        rescheduleOverrideTotal,
    ]);

    // ── Derived Financial Metrics ─────────────────────────────────────────────
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

    const paidAmount = Number(booking?.paidAmount || 0);
    const activeNewTotal = useRescheduleOverride && rescheduleOverrideTotal
        ? Number(rescheduleOverrideTotal)
        : (newPricePreview?.totalAmount ?? originalTotal);
    const newBalanceDue = activeNewTotal - paidAmount;
    const rateDiff = activeNewTotal - originalTotal;

    // ── Reschedule Mutation ───────────────────────────────────────────────────
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

        const finalGuestFirstName = isGuestSameAsBooker ? bookerFirstName : guestFirstName;
        const finalGuestLastName = isGuestSameAsBooker ? bookerLastName : guestLastName;
        const finalGuestEmail = isGuestSameAsBooker ? bookerEmail : guestEmail;
        const finalGuestPhone = isGuestSameAsBooker ? bookerPhone : guestPhone;
        const finalGuestWhatsapp = isGuestSameAsBooker ? bookerWhatsapp : guestWhatsapp;

        if (!bookerFirstName.trim()) { toast.error('Booker First Name is required.'); return; }
        if (!bookerPhone.trim()) { toast.error('Booker Phone Number is required.'); return; }
        if (!finalGuestFirstName.trim()) { toast.error('Guest First Name is required.'); return; }

        if (!booking.isGroupBooking && (!selectedSolution || allocatedRooms.length === 0)) {
            toast.error('Please select an accommodation solution to host your party.');
            return;
        }

        if (useRescheduleOverride && !rescheduleOverrideTotal) {
            toast.error('Please specify the override total price.');
            return;
        }

        const selectedRoomIds = Object.values(solutionRoomAssignments).filter(Boolean);

        rescheduleMutation.mutate({
            id: booking.id,
            data: {
                checkInDate: newCheckInDate,
                checkOutDate: newCheckOutDate,
                roomAllocations: roomAllocationsPayload,
                selectedRoomIds: selectedRoomIds.length > 0 ? selectedRoomIds : undefined,
                adultsCount: Number(adultsCount),
                childrenCount: Number(childrenCount),
                childAges: childAges.length > 0 ? childAges : undefined,
                infantsCount: Number(infantsCount) || undefined,
                extraAdultsCount: roomAllocationsPayload ? roomAllocationsPayload.reduce((sum: number, a: any) => sum + (a.extraAdults || 0), 0) : undefined,
                extraChildrenCount: roomAllocationsPayload ? roomAllocationsPayload.reduce((sum: number, a: any) => sum + (a.extraChildren || 0), 0) : undefined,
                ratePlanId: activeRatePlanId,
                mealPlan: selectedMealPlan || 'EP',
                isAcSelected: roomAllocationsPayload?.[0]?.isAcSelected ?? true,
                overrideTotal: useRescheduleOverride && rescheduleOverrideTotal ? Number(rescheduleOverrideTotal) : undefined,
                overrideReason: useRescheduleOverride ? (rescheduleOverrideReason || undefined) : undefined,
                isOverrideInclusive: true,
                roomTypeId: allocatedRooms[0]?.roomTypeId || booking.roomTypeId || undefined,
                guestName: `${bookerFirstName} ${bookerLastName || ''}`.trim(),
                guestEmail: bookerEmail || undefined,
                guestPhone: bookerPhone,
                whatsappNumber: bookerWhatsapp || undefined,
                specialRequests: specialRequests || undefined,
                guests: [
                    {
                        id: booking.guests?.[0]?.id,
                        firstName: finalGuestFirstName,
                        lastName: finalGuestLastName || '',
                        email: finalGuestEmail || undefined,
                        phone: finalGuestPhone || undefined,
                        whatsappNumber: finalGuestWhatsapp || undefined,
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
                <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Resolving stay details...</p>
            </div>
        );
    }

    if (isError || !booking) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm font-bold text-destructive">Booking not found or failed to load.</p>
                <button onClick={() => navigate('/bookings')} className="text-primary underline text-sm font-bold cursor-pointer">
                    Back to Bookings
                </button>
            </div>
        );
    }

    return (
        <>
            {/* Full Page Loader Overlay during submit */}
            {rescheduleMutation.isPending && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-widest">Processing Reschedule...</h2>
                    <p className="text-sm font-bold text-muted-foreground mt-2">Please wait, updating dates and room assignments.</p>
                </div>
            )}

            {/* Calendar Modal */}
            {showCalendarModal && (
                <RescheduleCalendarModal
                    booking={booking}
                    roomTypeId={allocatedRooms[0]?.roomTypeId || booking.roomTypeId || ''}
                    roomTypeName={allocatedRooms[0]?.roomTypeName || booking.roomType?.name || 'Selected Room Type'}
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

            {/* Full Accommodation Solutions Modal */}
            {showFullSolutionsModal && accommodationSolutions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-card w-full max-w-4xl max-h-[85vh] rounded-2xl border border-border shadow-2xl flex flex-col overflow-hidden">
                        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
                            <div>
                                <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Accommodation Solutions</span>
                                <h3 className="text-lg font-black text-foreground">
                                    All Accommodation Solutions ({accommodationSolutions.length} Available)
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowFullSolutionsModal(false)}
                                className="p-2 rounded-xl text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                            {accommodationSolutions.map((sol: any) => (
                                <AccommodationPackageCard
                                    key={sol.id}
                                    solution={sol}
                                    isSelected={selectedSolution?.id === sol.id}
                                    adultsCount={Number(adultsCount)}
                                    childrenCount={Number(childrenCount)}
                                    selectedMealPlan={selectedMealPlan}
                                    onMealPlanChange={(mp) => setSelectedMealPlan(mp as any)}
                                    roomAcSelections={roomAcSelections}
                                    onRoomAcToggle={(idx, isAc) => setRoomAcSelections(prev => ({ ...prev, [idx]: isAc }))}
                                    onSelect={(selected) => {
                                        setSelectedSolution(selected);
                                        setShowFullSolutionsModal(false);
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Accommodation Solver Modal */}
            <CustomAccommodationModal
                isOpen={showCustomSolutionModal}
                onClose={() => setShowCustomSolutionModal(false)}
                roomTypes={roomTypes || []}
                checkInDate={newCheckInDate}
                checkOutDate={newCheckOutDate}
                requiredAdults={Number(adultsCount) || 1}
                requiredChildren={Number(childrenCount) || 0}
                requiredInfants={Number(infantsCount) || 0}
                requiredChildAges={childAges}
                onApplyCustomSolution={(customSolution: any, customAssignments?: Record<number, string>) => {
                    setSelectedSolution(customSolution);
                    if (customAssignments) {
                        setSolutionRoomAssignments(customAssignments);
                    }
                    setShowCustomSolutionModal(false);
                    toast.success('Custom accommodation package configured!');
                }}
            />

            {/* ── Page Layout ── */}
            <div className="flex flex-col h-full min-h-screen bg-background">
                {/* Sticky Header */}
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border/50 px-4 sm:px-6 py-4 flex-shrink-0">
                    <div className="max-w-screen-2xl mx-auto flex items-center justify-between gap-4">
                        {/* Breadcrumbs */}
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 rounded-xl hover:bg-muted transition-all shrink-0 text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Go back"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-wider truncate">
                                <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => navigate('/bookings')}>
                                    Bookings
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                <span className="cursor-pointer hover:text-foreground transition-colors truncate max-w-[120px]" onClick={() => navigate(`/bookings/${booking.id}`)}>
                                    {booking.bookingNumber}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                                <span className="text-primary font-bold">Reschedule</span>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-3 shrink-0">
                            <button
                                onClick={() => navigate(-1)}
                                className="px-4 py-2 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors text-foreground cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={rescheduleMutation.isPending || !newCheckInDate || !newCheckOutDate}
                                className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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

                {/* Banner */}
                <div className="bg-gradient-to-br from-primary/8 via-transparent to-transparent border-b border-border/30 px-4 sm:px-6 py-6">
                    <div className="max-w-screen-2xl mx-auto flex items-center gap-5">
                        <div className="p-4 bg-primary text-primary-foreground rounded-2xl shadow-lg shadow-primary/20 rotate-3 shrink-0">
                            <Calendar className="h-7 w-7" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground">Reschedule Booking</h1>
                            <p className="text-sm text-muted-foreground font-medium mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>Booking: <span className="text-primary font-bold">{booking.bookingNumber}</span></span>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${
                                    booking.isGroupBooking ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
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
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 xl:gap-8">
                        {/* ── LEFT COLUMN (7 COLS) ── */}
                        <div className="lg:col-span-7 space-y-6">
                            {/* 1. 90-Day Policy Alert */}
                            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 flex gap-3">
                                <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                                <p className="text-sm text-primary font-medium leading-relaxed">
                                    Rescheduling is valid within 3 months (90 days) of the original check-in date:{' '}
                                    <span className="font-bold underline">{format(new Date(booking.checkInDate), 'MMM d, yyyy')}</span>.
                                </p>
                            </div>

                            {/* 2. Stay Dates & Guest Composition Card */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                        1. Stay Dates & Guest Composition
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setShowCalendarModal(true)}
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer"
                                    >
                                        <Calendar className="h-3.5 w-3.5" /> Calendar View
                                    </button>
                                </div>

                                {/* Check-In & Check-Out Pickers */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Check-In Date</label>
                                        <input
                                            type="text"
                                            value={newCheckInDate ? newCheckInDate.split('-').reverse().join('/') : ''}
                                            onClick={() => setShowCalendarModal(true)}
                                            readOnly
                                            placeholder="Select check-in"
                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-muted-foreground uppercase tracking-widest mb-1.5 pl-1">Check-Out Date</label>
                                        <input
                                            type="text"
                                            value={newCheckOutDate ? newCheckOutDate.split('-').reverse().join('/') : ''}
                                            onClick={() => setShowCalendarModal(true)}
                                            readOnly
                                            placeholder="Select check-out"
                                            className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Guest Composition (V2 Occupancy Parity) */}
                                <div className="space-y-4 pt-2 border-t border-border/40">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {/* Adults */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1">
                                                <Users className="h-3.5 w-3.5 text-primary" /> Adults (12+ yrs)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={adultsCount}
                                                onChange={(e) => setAdultsCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
                                        </div>

                                        {/* Children */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Children (3–12 yrs)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={childrenCount}
                                                onChange={(e) => {
                                                    const newCount = Math.max(0, parseInt(e.target.value, 10) || 0);
                                                    setChildrenCount(newCount);
                                                    setChildAges(prev => {
                                                        if (newCount > prev.length) {
                                                            return [...prev, ...Array(newCount - prev.length).fill(5)];
                                                        }
                                                        return prev.slice(0, newCount);
                                                    });
                                                }}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
                                        </div>

                                        {/* Infants */}
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                                                Infants (0–2 yrs)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={infantsCount}
                                                onChange={(e) => setInfantsCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                                                className="w-full border border-input bg-background text-foreground rounded-xl shadow-xs h-11 px-3 text-sm font-black focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                            />
                                            <p className="text-[10px] text-muted-foreground mt-1">Stays free</p>
                                        </div>
                                    </div>

                                    {/* Child Ages Selectors */}
                                    {Number(childrenCount) > 0 && (
                                        <div className="p-3.5 bg-muted/30 rounded-xl border border-border space-y-2">
                                            <label className="block text-[11px] font-black uppercase tracking-wider text-muted-foreground">
                                                Child Ages at Stay Date
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from({ length: Number(childrenCount) }).map((_, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 bg-card border border-border px-2.5 py-1.5 rounded-lg shadow-2xs">
                                                        <span className="text-[11px] font-bold text-muted-foreground">Child {idx + 1}:</span>
                                                        <select
                                                            value={childAges[idx] !== undefined ? childAges[idx] : 5}
                                                            onChange={(e) => {
                                                                const val = Number(e.target.value) || 5;
                                                                setChildAges(prev => {
                                                                    const updated = [...prev];
                                                                    updated[idx] = val;
                                                                    return updated;
                                                                });
                                                            }}
                                                            className="h-7 text-xs font-black border border-input bg-background rounded px-1.5 focus:ring-1 focus:ring-primary cursor-pointer outline-none"
                                                        >
                                                            {Array.from({ length: 10 }, (_, i) => i + 3).map(age => (
                                                                <option key={age} value={age}>{age} yrs</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Meal Plan Pill Selector */}
                                    {activeMealPlans.length > 0 && (
                                        <div className="space-y-2 pt-2 border-t border-border/40">
                                            <div className="flex items-center justify-between">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                    Meal Plan & Dining Plan
                                                </label>
                                                <span className="text-[10px] text-muted-foreground font-medium">Per-guest dining supplement</span>
                                            </div>
                                            <div className={clsx(
                                                "grid gap-2",
                                                activeMealPlans.length === 1 ? "grid-cols-1" :
                                                activeMealPlans.length === 2 ? "grid-cols-2" :
                                                activeMealPlans.length === 3 ? "grid-cols-3" : "grid-cols-2 sm:grid-cols-4"
                                            )}>
                                                {activeMealPlans.map(mp => {
                                                    const isSelected = selectedMealPlan === mp.code;
                                                    const adultRate = mp.adultRate;
                                                    const childRate = mp.childRate;
                                                    const subText = mp.code === 'EP'
                                                        ? 'Base room tariff'
                                                        : `+₹${adultRate.toLocaleString('en-IN')}/ad${childRate > 0 ? `, +₹${childRate.toLocaleString('en-IN')}/ch` : ''}`;

                                                    return (
                                                        <button
                                                            key={mp.code}
                                                            type="button"
                                                            onClick={() => setSelectedMealPlan(mp.code)}
                                                            className={clsx(
                                                                "p-2.5 rounded-xl border text-left transition-all cursor-pointer",
                                                                isSelected
                                                                    ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/30"
                                                                    : "bg-background border-border hover:border-primary/40 text-foreground"
                                                            )}
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-xs font-black">{mp.icon} {mp.code}</span>
                                                                {isSelected && <CheckCircle className="h-3.5 w-3.5 text-primary" />}
                                                            </div>
                                                            <div className="text-[11px] font-bold text-foreground mt-0.5">{mp.label}</div>
                                                            <div className="text-[10px] text-muted-foreground font-medium mt-0.5 leading-tight">{subText}</div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 3. Accommodation Solutions Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                            2. Accommodation Solutions
                                        </h3>
                                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                                            {isSearchingSolutions
                                                ? 'Searching optimal accommodation packages...'
                                                : accommodationSolutions && accommodationSolutions.length > 0
                                                    ? `Showing optimal packages for ${adultsCount} Adults${Number(childrenCount) > 0 ? `, ${childrenCount} Children` : ''}.`
                                                    : 'No valid solution packages found for these dates.'}
                                        </p>
                                    </div>
                                    {accommodationSolutions && accommodationSolutions.length > 2 && (
                                        <button
                                            type="button"
                                            onClick={() => setShowFullSolutionsModal(true)}
                                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            View All ({accommodationSolutions.length})
                                        </button>
                                    )}
                                </div>

                                {isSearchingSolutions ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3 bg-muted/20 rounded-2xl border border-border/50">
                                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Searching packages...</span>
                                    </div>
                                ) : accommodationSolutions && accommodationSolutions.length > 0 ? (
                                    <div className="space-y-3">
                                        {accommodationSolutions.slice(0, 3).map((sol: any) => (
                                            <AccommodationPackageCard
                                                key={sol.id}
                                                solution={sol}
                                                isSelected={selectedSolution?.id === sol.id}
                                                adultsCount={Number(adultsCount)}
                                                childrenCount={Number(childrenCount)}
                                                selectedMealPlan={selectedMealPlan}
                                                onMealPlanChange={(mp) => setSelectedMealPlan(mp as any)}
                                                roomAcSelections={roomAcSelections}
                                                onRoomAcToggle={(idx, isAc) => setRoomAcSelections(prev => ({ ...prev, [idx]: isAc }))}
                                                onSelect={(selected) => setSelectedSolution(selected)}
                                            />
                                        ))}

                                        {accommodationSolutions.length > 3 && (
                                            <button
                                                type="button"
                                                onClick={() => setShowFullSolutionsModal(true)}
                                                className="w-full py-2.5 bg-muted/40 hover:bg-muted/70 border border-border/60 text-primary font-bold text-xs rounded-xl transition-all cursor-pointer"
                                            >
                                                View All {accommodationSolutions.length} Available Solutions
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="p-8 border border-dashed border-destructive/30 bg-destructive/5 rounded-2xl text-center space-y-3">
                                        <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                                        <p className="text-sm font-bold text-destructive">
                                            No automated accommodation solutions match this party size on the selected dates.
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setShowCustomSolutionModal(true)}
                                            className="px-4 py-2 bg-primary text-primary-foreground font-bold text-xs rounded-xl hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
                                        >
                                            Configure Custom Room Solution
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* 4. Physical Room Assignment Section */}
                            {selectedSolution && (
                                <RoomAssignmentSection
                                    selectedSolution={selectedSolution}
                                    roomTypes={roomTypes}
                                    solutionRoomAssignments={solutionRoomAssignments}
                                    onAssignRoom={(idx, roomId) => {
                                        setSolutionRoomAssignments(prev => ({
                                            ...prev,
                                            [idx]: roomId,
                                        }));
                                    }}
                                />
                            )}

                            {/* 5. Booker & Guest Details Accordion */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                        4. Guest & Booker Information
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => setIsEditingGuestDetails(!isEditingGuestDetails)}
                                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                                    >
                                        {isEditingGuestDetails ? 'View Summary' : 'Edit Contacts'}
                                    </button>
                                </div>

                                {!isEditingGuestDetails ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/30 space-y-1 text-xs">
                                            <div className="flex items-center gap-1.5 font-black text-primary uppercase tracking-wider mb-1">
                                                <User className="h-4 w-4" /> Booker Contact
                                            </div>
                                            <p className="font-bold text-foreground text-sm">{bookerFirstName} {bookerLastName}</p>
                                            {bookerPhone && <p className="text-muted-foreground">Phone: {bookerPhone}</p>}
                                            {bookerEmail && <p className="text-muted-foreground">Email: {bookerEmail}</p>}
                                        </div>
                                        <div className="bg-muted/30 p-4 rounded-xl border border-border/30 space-y-1 text-xs">
                                            <div className="flex items-center gap-1.5 font-black text-primary uppercase tracking-wider mb-1">
                                                <House className="h-4 w-4" /> Primary Guest
                                            </div>
                                            <p className="font-bold text-foreground text-sm">
                                                {isGuestSameAsBooker ? `${bookerFirstName} ${bookerLastName} (Same as booker)` : `${guestFirstName} ${guestLastName}`}
                                            </p>
                                            {guestPhone && <p className="text-muted-foreground">Phone: {guestPhone}</p>}
                                            {specialRequests && (
                                                <p className="text-muted-foreground italic truncate">Note: {specialRequests}</p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Booker First Name *</label>
                                                <input
                                                    type="text"
                                                    value={bookerFirstName}
                                                    onChange={(e) => setBookerFirstName(e.target.value)}
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Booker Last Name</label>
                                                <input
                                                    type="text"
                                                    value={bookerLastName}
                                                    onChange={(e) => setBookerLastName(e.target.value)}
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Booker Phone *</label>
                                                <input
                                                    type="text"
                                                    value={bookerPhone}
                                                    onChange={(e) => setBookerPhone(e.target.value)}
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Booker Email</label>
                                                <input
                                                    type="email"
                                                    value={bookerEmail}
                                                    onChange={(e) => setBookerEmail(e.target.value)}
                                                    className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                                />
                                            </div>
                                        </div>

                                        <label className="flex items-center gap-2 cursor-pointer select-none py-1">
                                            <input
                                                type="checkbox"
                                                checked={isGuestSameAsBooker}
                                                onChange={(e) => setIsGuestSameAsBooker(e.target.checked)}
                                                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                            />
                                            <span className="text-xs font-bold text-foreground">Primary guest is the same person as booker</span>
                                        </label>

                                        {!isGuestSameAsBooker && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-muted/20 border border-border/40 rounded-xl">
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Guest First Name *</label>
                                                    <input
                                                        type="text"
                                                        value={guestFirstName}
                                                        onChange={(e) => setGuestFirstName(e.target.value)}
                                                        className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Guest Phone</label>
                                                    <input
                                                        type="text"
                                                        value={guestPhone}
                                                        onChange={(e) => setGuestPhone(e.target.value)}
                                                        className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Special Requests / Notes</label>
                                            <textarea
                                                value={specialRequests}
                                                onChange={(e) => setSpecialRequests(e.target.value)}
                                                rows={2}
                                                placeholder="Enter any guest notes or requests..."
                                                className="w-full border border-border/50 bg-background text-foreground rounded-xl px-3 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-primary"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ── RIGHT COLUMN (5 COLS: FINANCIALS & ACTIONS) ── */}
                        <div className="lg:col-span-5 space-y-6">
                            {/* Pricing Comparison Card */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-5 shadow-sm">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">
                                    Financial Reconciliation
                                </h3>

                                {isCalculatingPreview ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-3 bg-muted/20 rounded-2xl">
                                        <Loader2 className="h-7 w-7 animate-spin text-primary" />
                                        <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Recalculating rates...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Primary Metrics */}
                                        <div className="grid grid-cols-3 gap-3">
                                            <div className="bg-muted/40 p-3 rounded-xl border border-border/30 space-y-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Original Total</span>
                                                <span className="font-black text-base text-foreground">₹{originalTotal.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="bg-muted/40 p-3 rounded-xl border border-border/30 space-y-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Amount Paid</span>
                                                <span className="font-black text-base text-emerald-600 dark:text-emerald-400">₹{paidAmount.toLocaleString('en-IN')}</span>
                                            </div>
                                            <div className="bg-muted/40 p-3 rounded-xl border border-border/30 space-y-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">New Total</span>
                                                <span className="font-black text-base text-foreground">₹{activeNewTotal.toLocaleString('en-IN')}</span>
                                            </div>
                                        </div>

                                        {/* Rate Diff & Balance Due */}
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-muted/40 p-3 rounded-xl border border-border/30 space-y-1">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Rate Adjustment</span>
                                                <span className={`font-black text-base ${rateDiff > 0 ? 'text-orange-600 dark:text-orange-400' : rateDiff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {rateDiff > 0 ? `+₹${rateDiff.toLocaleString('en-IN')} (Due)` : rateDiff < 0 ? `-₹${Math.abs(rateDiff).toLocaleString('en-IN')} (Credit)` : 'No Change'}
                                                </span>
                                            </div>
                                            <div className="bg-primary/5 p-3 rounded-xl border border-primary/20 space-y-1">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Revised Balance</span>
                                                <span className={`font-black text-base ${newBalanceDue > 0 ? 'text-orange-600 dark:text-orange-400' : newBalanceDue < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                                                    {newBalanceDue > 0 ? `₹${newBalanceDue.toLocaleString('en-IN')} Due` : newBalanceDue < 0 ? `-₹${Math.abs(newBalanceDue).toLocaleString('en-IN')} Credit` : '₹0 (Fully Paid)'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Selected Solution Summary Line */}
                                        {selectedSolution && (
                                            <div className="p-3 bg-muted/20 border border-border/40 rounded-xl space-y-1 text-xs">
                                                <div className="flex items-center justify-between font-bold text-foreground">
                                                    <span>Selected Package:</span>
                                                    <span className="text-primary truncate max-w-[180px]">{selectedSolution.solutionName || `${allocatedRooms.length}-Room Package`}</span>
                                                </div>
                                                <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                                                    <span>Meal Plan:</span>
                                                    <span>{selectedMealPlan} ({activeMealPlans.find(p => p.code === selectedMealPlan)?.label || 'Room Only'})</span>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            {/* Price Override Card */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 space-y-4 shadow-sm">
                                <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Pricing Adjustments</h3>

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
                                            <span className="text-[10px] text-emerald-600/80 font-medium">Prevent rate reduction and retain the original total price.</span>
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
                                        <div>
                                            <span className="text-xs font-black text-foreground uppercase tracking-wide block">Manual Price Override</span>
                                            <span className="text-[10px] text-muted-foreground font-medium">Manually set a fixed total amount for this reschedule.</span>
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
                                                placeholder="Enter custom total"
                                                className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-bold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 pl-1">Override Reason</label>
                                            <input
                                                type="text"
                                                value={rescheduleOverrideReason}
                                                onChange={(e) => setRescheduleOverrideReason(e.target.value)}
                                                placeholder="Reason for price override..."
                                                className="w-full border border-border/50 bg-background text-foreground rounded-xl px-4 py-2.5 font-semibold focus:outline-none focus:ring-2 focus:ring-primary outline-none"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Submit Button */}
                            <div className="bg-card border border-border/60 rounded-2xl p-5 shadow-sm space-y-3">
                                <button
                                    onClick={handleSubmit}
                                    disabled={rescheduleMutation.isPending || !newCheckInDate || !newCheckOutDate || (!booking.isGroupBooking && !selectedSolution)}
                                    className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {rescheduleMutation.isPending ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Saving Changes...</>
                                    ) : (
                                        <><Calendar className="h-4 w-4" /> Confirm Reschedule</>
                                    )}
                                </button>
                                <p className="text-center text-[10px] text-muted-foreground font-medium">
                                    Rescheduling updates stay dates, room allocations, meal plan rates, and audit logs.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
