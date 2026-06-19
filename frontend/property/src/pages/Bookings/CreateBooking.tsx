import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { bookingsService } from '../../services/bookings';
import { roomTypesService } from '../../services/roomTypes';
import { bookingSourcesService } from '../../services/bookingSources';
import { uploadService } from '../../services/uploads';
import { Loader2, Calendar, Users, CheckCircle, AlertCircle, ArrowLeft, Briefcase, Camera, ShieldCheck, X } from 'lucide-react';
import clsx from 'clsx';
import SearchableSelect from '../../components/SearchableSelect';
import BookingAvailabilityCalendar from '../../components/bookings/BookingAvailabilityCalendar';
import type { PriceCalculationResult, CreateBookingDto } from '../../types/booking';
import type { RoomType } from '../../types/room';
import { useProperty } from '../../context/PropertyContext';

const bookingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    roomTypeId: z.string().optional(),
    adultsCount: z.number().min(1, 'At least 1 adult is required'),
    childrenCount: z.number().min(0),
    appliedCode: z.string().optional(),
    bookingSourceId: z.string().optional(),
    roomId: z.string().optional(),
    selectedRoomIds: z.array(z.string()).optional(),
    isManualBooking: z.boolean().optional(),
    isGroupBooking: z.boolean().optional(),
    groupSize: z.number().optional(),
    overrideTotal: z.number().optional(),
    isOverrideInclusive: z.boolean().optional(),
    overrideReason: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'UPI', 'CARD', 'ONLINE', 'WALLET']),
    paymentOption: z.enum(['FULL', 'PARTIAL']),
    paidAmount: z.number().optional(),
    isHistoricalEntry: z.boolean().optional(),
    transactionDate: z.string().optional(),
    guestFirstName: z.string().min(1, 'First name is required'),
    guestLastName: z.string().optional(),
    guestEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    guestPhone: z.string().min(1, 'Primary phone number is required'),
    whatsappNumber: z.string().optional(),
    isBookerAlsoGuest: z.boolean().optional(),
    gstNumber: z.string().optional(),
    specialRequests: z.string().optional(),
    guests: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().optional(),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        phone: z.string().optional(),
        whatsappNumber: z.string().optional(),
        age: z.number().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
        idImage: z.string().optional(),
        idImageBack: z.string().optional(),
    })).min(1, 'At least 1 guest is required'),
}).refine(data => {
    if (!data.isGroupBooking && !data.roomTypeId) return false;
    return true;
}, {
    message: "Room type is required for standard bookings",
    path: ["roomTypeId"]
}).refine(data => {
    if (data.isHistoricalEntry && !data.transactionDate) return false;
    return true;
}, {
    message: "Transaction date is required for historical entries",
    path: ["transactionDate"]
}).refine(data => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(data.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    if (checkIn < today && !data.isHistoricalEntry) return false;
    return true;
}, {
    message: "Backdate this booking (Historical Entry) must be enabled for past dates",
    path: ["isHistoricalEntry"]
}).refine(data => {
    if (data.isHistoricalEntry) {
        return data.guests.every(g => g.idType && g.idNumber);
    }
    return true;
}, {
    message: "Guest ID Type and Number are mandatory for ALL guests in historical entries. Please check all guest records.",
    path: ["guests"]
}).refine(data => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkIn = new Date(data.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    if (checkIn < today && !data.isHistoricalEntry) return false;
    return true;
}, {
    message: "Backdate this booking (Historical Entry) must be enabled for past dates",
    path: ["isHistoricalEntry"]
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function CreateBooking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const state = location.state as { roomId?: string, roomTypeId?: string, startDate?: string, endDate?: string } | null;

    const { selectedProperty } = useProperty();
    const [availability, setAvailability] = useState<{ available: boolean; availableRooms: number; roomList?: any[]; allocationPreview?: any[]; groupUnavailableReason?: string } | null>(null);
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [originalPriceDetails, setOriginalPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);
    const [showInsufficientModal, setShowInsufficientModal] = useState(false);
    const [showMobileCalendar, setShowMobileCalendar] = useState(false);

    const preSelectedRoomId = state?.roomId || searchParams.get('roomId');
    const preSelectedRoomTypeId = state?.roomTypeId || searchParams.get('roomTypeId');
    const preSelectedStartDate = state?.startDate;
    const preSelectedEndDate = state?.endDate;

    const {
        register, control, handleSubmit, watch,
        formState: { errors }, getValues, setValue,
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            propertyId: selectedProperty?.id || '',
            checkInDate: preSelectedStartDate || format(new Date(), 'yyyy-MM-dd'),
            checkOutDate: preSelectedEndDate || format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            adultsCount: 1, childrenCount: 0,
            roomTypeId: preSelectedRoomTypeId || '',
            roomId: preSelectedRoomId || undefined,
            selectedRoomIds: preSelectedRoomId ? [preSelectedRoomId] : [],
            isManualBooking: true,
            isGroupBooking: false,
            groupSize: undefined,
            overrideTotal: undefined,
            isOverrideInclusive: true,
            overrideReason: '',
            paymentMethod: 'CASH',
            paymentOption: 'FULL',
            paidAmount: undefined,
            appliedCode: '',
            isHistoricalEntry: false,
            transactionDate: format(new Date(), 'yyyy-MM-dd'),
            guestFirstName: '',
            guestLastName: '',
            guestEmail: '',
            guestPhone: '',
            whatsappNumber: '',
            isBookerAlsoGuest: true,
            guests: [{ firstName: '', lastName: '', idImage: '', idImageBack: '' }],
        },
    });

    // Auto-set property and detect historical entries
    useEffect(() => {
        if (selectedProperty?.id) setValue('propertyId', selectedProperty.id);
    }, [selectedProperty, setValue]);

    const watchedCheckInDate = watch('checkInDate');
    const watchedIsHistorical = watch('isHistoricalEntry');

    useEffect(() => {
        if (!watchedCheckInDate) return;

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const checkIn = new Date(watchedCheckInDate);
        checkIn.setHours(0, 0, 0, 0);

        if (checkIn < today) {
            if (!watchedIsHistorical) {
                setValue('isHistoricalEntry', true);
                setValue('transactionDate', watchedCheckInDate);
                toast('Backdated stay detected. Enabling Historical Entry mode.', {
                    icon: '⏳',
                    duration: 4000
                });
            }
        }
    }, [watchedCheckInDate, setValue]);

    const isBookerAlsoGuest = watch('isBookerAlsoGuest');
    const guestFirstName = watch('guestFirstName');
    const guestLastName = watch('guestLastName');
    const guestEmail = watch('guestEmail');
    const guestPhone = watch('guestPhone');
    const whatsappNumber = watch('whatsappNumber');

    useEffect(() => {
        if (isBookerAlsoGuest) {
            setValue('guests.0.firstName', guestFirstName || '');
            setValue('guests.0.lastName', guestLastName || '');
            setValue('guests.0.email', guestEmail || '');
            setValue('guests.0.phone', guestPhone || '');
            setValue('guests.0.whatsappNumber', whatsappNumber || '');
        }
    }, [isBookerAlsoGuest, guestFirstName, guestLastName, guestEmail, guestPhone, whatsappNumber, setValue]);

    const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const selectedRoomTypeId = watch('roomTypeId');
    const selectedRoomType = useMemo(() => {
        return roomTypes?.find(rt => rt.id === selectedRoomTypeId);
    }, [roomTypes, selectedRoomTypeId]);

    const requiredRooms = useMemo(() => {
        if (!selectedRoomType) return 1;
        const maxAdults = selectedRoomType.maxAdults || 2;
        const maxChildren = selectedRoomType.maxChildren || 2;
        const adultsCount = Number(watch('adultsCount')) || 1;
        const childrenCount = Number(watch('childrenCount')) || 0;

        const maxAdultsPerRoom = maxAdults + 1;
        const maxChildrenPerRoom = maxChildren > 0 ? (maxChildren + 1) : 1;

        const roomsByAdults = Math.ceil(adultsCount / maxAdultsPerRoom);
        const roomsByChildren = Math.ceil(childrenCount / maxChildrenPerRoom);

        return Math.max(roomsByAdults, roomsByChildren, 1);
    }, [selectedRoomType, watch('adultsCount'), watch('childrenCount')]);

    const { data: bookingSources } = useQuery<any[]>({
        queryKey: ['bookingSources'],
        queryFn: () => bookingSourcesService.getAll(),
    });

    useEffect(() => {
        if (preSelectedRoomId && preSelectedRoomTypeId) handleCheckAvailability();
    }, [preSelectedRoomId, preSelectedRoomTypeId]);

    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

    const [idUploading, setIdUploading] = useState<Record<string, boolean>>({});

    const handleGuestFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>, isBack = false) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const uploadKey = isBack ? `back-${index}` : `front-${index}`;
        setIdUploading(prev => ({ ...prev, [uploadKey]: true }));
        try {
            const data = await uploadService.upload(file);
            setValue(`guests.${index}.${isBack ? 'idImageBack' : 'idImage'}`, data.url);
            toast.success(`Guest ${index + 1} ID ${isBack ? 'Back' : 'Front'} uploaded`);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error(`Failed to upload ID ${isBack ? 'Back' : 'Front'} for Guest ${index + 1}`);
        } finally {
            setIdUploading(prev => ({ ...prev, [uploadKey]: false }));
        }
    };

    const isGroupMode = !!watch('isGroupBooking');

    const handleCheckAvailability = async () => {
        const values = getValues();
        const isGroup = values.isGroupBooking;

        // --- Validation ---
        const errors: string[] = [];
        if (!values.checkInDate) errors.push('Check-in date is required');
        if (!values.checkOutDate) errors.push('Check-out date is required');
        if (values.checkInDate && values.checkOutDate) {
            const checkIn = new Date(values.checkInDate);
            const checkOut = new Date(values.checkOutDate);
            if (checkOut <= checkIn) errors.push('Check-out date must be after check-in date');
        }
        if (!isGroup && !values.roomTypeId) errors.push('Please select a room type');
        if (isGroup && (!values.groupSize || Number(values.groupSize) < 2)) errors.push('Group size must be at least 2 guests');
        if (!values.adultsCount || Number(values.adultsCount) < 1) errors.push('At least 1 adult is required');

        if (errors.length > 0) {
            toast.error(
                <div>
                    <p className="font-bold mb-1">Please fix the following to check availability:</p>
                    <ul className="list-disc pl-4 text-xs space-y-0.5 font-semibold">
                        {errors.map((e, i) => <li key={i}>{e}</li>)}
                    </ul>
                </div>,
                { duration: 5000 }
            );
            return;
        }

        setCheckingAvailability(true);
        setAvailability(null);
        setPriceDetails(null);
        setOriginalPriceDetails(null);
        try {
            const avail = await bookingsService.checkAvailability({
                roomTypeId: values.roomTypeId || undefined,
                checkInDate: values.checkInDate,
                checkOutDate: values.checkOutDate,
                isGroupBooking: isGroup,
                groupSize: isGroup ? Number(values.groupSize) : undefined,
                propertyId: values.propertyId,
                isAdmin: true,
            });
            setAvailability(avail);

            if (avail.available) {
                let currentValues = getValues();

                // For group bookings, auto-populate suggested rooms if none selected yet
                if (isGroup && avail.allocationPreview && (!currentValues.selectedRoomIds || currentValues.selectedRoomIds.length === 0)) {
                    const suggestedIds = avail.allocationPreview.map((r: any) => r.id);
                    setValue('selectedRoomIds', suggestedIds);
                    currentValues = getValues();
                }

                // For standard bookings, filter out any selected rooms that are no longer available, and auto-select up to requiredRooms
                if (!isGroup) {
                    const validSelectedRoomIds = (currentValues.selectedRoomIds || []).filter(id =>
                        avail.roomList?.some((r: any) => r.id === id)
                    );

                    if (validSelectedRoomIds.length < requiredRooms && avail.roomList && avail.roomList.length > 0) {
                        const additionalNeeded = requiredRooms - validSelectedRoomIds.length;
                        const unselectedAvailableRooms = avail.roomList
                            .filter((r: any) => !validSelectedRoomIds.includes(r.id))
                            .map((r: any) => r.id);

                        let autoSelected: string[] = [];
                        // Prioritize pre-selected roomId if it is in available list and not yet selected
                        if (validSelectedRoomIds.length === 0 && currentValues.roomId && avail.roomList.some((r: any) => r.id === currentValues.roomId)) {
                            autoSelected.push(currentValues.roomId);
                        }

                        const remainingPool = unselectedAvailableRooms.filter(id => !autoSelected.includes(id));
                        const newSelection = [
                            ...validSelectedRoomIds,
                            ...autoSelected,
                            ...remainingPool.slice(0, additionalNeeded - autoSelected.length)
                        ];
                        setValue('selectedRoomIds', newSelection);
                    } else {
                        setValue('selectedRoomIds', validSelectedRoomIds);
                    }
                    currentValues = getValues();
                }

                // If check availability returns less rooms than required, show the modal warning
                if (!isGroup) {
                    const selectedCount = (currentValues.selectedRoomIds || []).length;
                    if (selectedCount < requiredRooms) {
                        setShowInsufficientModal(true);
                    }
                }

                const roomCount = (currentValues.selectedRoomIds && currentValues.selectedRoomIds.length > 0)
                    ? currentValues.selectedRoomIds.length
                    : (isGroup ? (avail.allocationPreview?.length || 1) : requiredRooms);

                const priceParams = {
                    roomTypeId: isGroup ? (avail.allocationPreview?.[0]?.roomTypeId || currentValues.roomTypeId) : currentValues.roomTypeId,
                    checkInDate: currentValues.checkInDate,
                    checkOutDate: currentValues.checkOutDate,
                    adultsCount: Number(currentValues.adultsCount),
                    childrenCount: Number(currentValues.childrenCount),
                    isGroupBooking: isGroup,
                    groupSize: isGroup ? Number(currentValues.groupSize) : undefined,
                    roomCount,
                    generalCode: currentValues.appliedCode,
                };

                // Always calculate the ORIGINAL price (without override) for the top breakdown
                const originalPrice = await (bookingsService as any).calculatePrice(priceParams);
                setOriginalPriceDetails(originalPrice);

                // If override is set, also calculate override price separately
                if (currentValues.overrideTotal) {
                    const overridePrice = await (bookingsService as any).calculatePrice({
                        ...priceParams,
                        overrideTotal: Number(currentValues.overrideTotal),
                        isOverrideInclusive: currentValues.isOverrideInclusive,
                    });
                    setPriceDetails(overridePrice);
                } else {
                    setPriceDetails(originalPrice);
                }
            }
        } catch (error: any) {
            console.error('Error checking availability:', error);
            const message = error.response?.data?.message || 'Failed to check availability';
            toast.error(message);
        } finally {
            setCheckingAvailability(false);
        }
    };

    const createBookingMutation = useMutation({
        mutationFn: bookingsService.create,
        onSuccess: () => {
            toast.success('Booking created successfully');
            navigate('/bookings');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create booking');
        },
    });

    const onSubmit = (data: BookingFormData) => {
        if (!availability?.available) { toast.error('Please check availability first'); return; }

        if (!data.isGroupBooking) {
            const selectedCount = (data.selectedRoomIds || []).length;
            if (selectedCount < requiredRooms) {
                setShowInsufficientModal(true);
                return;
            }
        }

        // Remove propertyId (unless needed for group allocation) and other non-DTO fields
        const { propertyId, paymentOption, appliedCode, guestFirstName, guestLastName, guestEmail, guestPhone, isBookerAlsoGuest, ...rest } = data;

        const sanitizedData = {
            ...rest,
            guestName: `${guestFirstName} ${guestLastName || ''}`.trim(),
            guestEmail: guestEmail || undefined,
            guestPhone: guestPhone,
            transactionDate: data.isHistoricalEntry ? data.transactionDate : undefined,
            generalCode: appliedCode || undefined,
            roomTypeId: data.isGroupBooking ? undefined : rest.roomTypeId,  // clear stale roomTypeId for group bookings
            propertyId: data.isGroupBooking ? propertyId : undefined,
            bookingSourceId: data.bookingSourceId || undefined,
            roomId: data.selectedRoomIds && data.selectedRoomIds.length > 0 ? data.selectedRoomIds[0] : (data.roomId || undefined),
            selectedRoomIds: data.selectedRoomIds || undefined,
            overrideTotal: data.overrideTotal ? Number(data.overrideTotal) : undefined,
            isOverrideInclusive: data.isOverrideInclusive,
            paymentMethod: data.isManualBooking ? data.paymentMethod : 'ONLINE',
            paidAmount: data.isHistoricalEntry
                ? (data.overrideTotal || priceDetails?.totalAmount)
                : (data.isManualBooking
                    ? (paymentOption === 'FULL'
                        ? (data.overrideTotal || priceDetails?.totalAmount)
                        : (data.paidAmount || 0))
                    : undefined),
            paymentOption: data.isHistoricalEntry ? 'FULL' : paymentOption,
        };
        createBookingMutation.mutate(sanitizedData as CreateBookingDto);
    };

    if (loadingRoomTypes) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-[1400px] mx-auto pb-16 px-4 xl:px-8">
            {/* Full Page Loader Overlay */}
            {createBookingMutation.isPending && (
                <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <h2 className="text-xl font-black text-foreground uppercase tracking-widest">Creating Booking...</h2>
                    <p className="text-sm font-bold text-muted-foreground mt-2">Please wait, do not close or refresh this page.</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={() => navigate('/bookings')} 
                        className="p-2.5 hover:bg-muted rounded-full border border-border shadow-sm transition-all hover:scale-105 active:scale-95 bg-card"
                    >
                        <ArrowLeft className="h-5 w-5 text-muted-foreground" />
                    </button>
                    <div>
                        <span className="text-[10px] font-black text-primary uppercase tracking-widest block">Resort Operations</span>
                        <h1 className="text-3xl font-black text-foreground tracking-tight mt-0.5">Create New Booking</h1>
                    </div>
                </div>
                {/* Visual badge/status */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] font-black uppercase tracking-wider text-primary w-fit">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Frontdesk Console
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
                <div className="xl:col-span-5 space-y-6">
                    <form onSubmit={handleSubmit(onSubmit, (errs) => {
                        console.log('Form Errors:', errs);
                        const fieldNames = Object.keys(errs).map(key => {
                            if (key === 'guests') return 'Guest Details (ID mandatory for historical stays)';
                            if (key === 'isHistoricalEntry') return 'Backdate Checkbox';
                            return key.replace(/([A-Z])/g, ' $1').toLowerCase();
                        });

                        toast.error(
                            <div>
                                <p className="font-bold mb-1 underline">Please fix the following:</p>
                                <ul className="list-disc pl-4 text-xs font-semibold">
                                    {fieldNames.map((name, i) => <li key={i} className="capitalize">{name}</li>)}
                                </ul>
                            </div>,
                            { duration: 6000 }
                        );
                    })} className="space-y-6">

                        {/* ── Mobile Price Summary Bar (hidden on lg+) ── */}
                        {priceDetails && (
                            <div className="lg:hidden sticky top-[70px] z-10 -mx-4 px-4 py-3 bg-card/95 backdrop-blur-md border-b border-border shadow-md">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground shrink-0">Price</span>
                                        {watch('overrideTotal') && (
                                            <span className="text-[9px] font-black uppercase text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded-full shrink-0">Override</span>
                                        )}
                                        <div className="flex items-center gap-2 min-w-0 truncate">
                                            {watch('overrideTotal') && originalPriceDetails && (
                                                <span className="text-xs text-muted-foreground line-through font-semibold shrink-0">₹{originalPriceDetails.totalAmount.toFixed(0)}</span>
                                            )}
                                            <span className={`font-extrabold text-xl tracking-tight shrink-0 ${watch('overrideTotal') ? 'text-amber-600 dark:text-amber-400' : 'text-primary'}`}>
                                                ₹{watch('overrideTotal')
                                                    ? (watch('isOverrideInclusive') ? watch('overrideTotal')! : watch('overrideTotal')! * (1 + priceDetails.taxRate / 100)).toFixed(2)
                                                    : priceDetails.totalAmount.toFixed(2)
                                                }
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-semibold shrink-0">
                                        <span>{priceDetails.numberOfNights}N</span>
                                        <span className="h-3 w-px bg-border"></span>
                                        <span>GST {priceDetails.taxRate}%</span>
                                        {watch('overrideTotal') && (
                                            <>
                                                <span className="h-3 w-px bg-border"></span>
                                                <span className="text-muted-foreground">Base: ₹{(originalPriceDetails || priceDetails).totalAmount.toFixed(0)}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Booking Details */}
                        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
                                <h2 className="text-lg font-bold flex items-center gap-2 text-foreground">
                                    <Calendar className="h-5 w-5 text-primary" /> Booking Details
                                </h2>

                                <div className="flex bg-muted p-1 rounded-xl w-fit border border-border shadow-inner">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('isGroupBooking', false);
                                        }}
                                        className={clsx(
                                            'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300',
                                            !isGroupMode
                                                ? 'bg-card text-primary shadow-md ring-1 ring-black/5'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        Standard Booking
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setValue('isGroupBooking', true);
                                            setValue('groupSize', getValues('adultsCount') + getValues('childrenCount'));
                                        }}
                                        className={clsx(
                                            'px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300',
                                            isGroupMode
                                                ? 'bg-card text-primary shadow-md ring-1 ring-black/5'
                                                : 'text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        Group Booking
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {!isGroupMode && (
                                    <div className="md:col-span-2">
                                        <SearchableSelect
                                            label="Room Type"
                                            options={roomTypes?.map((type) => ({
                                                id: type.id,
                                                label: `${type.name} - ₹${type.basePrice}/night`,
                                                subLabel: `${type.rooms?.length || type._count?.rooms || 0} Total Rooms | ${type.maxAdults} Adult, ${type.maxChildren} Child`
                                            })) || []}
                                            value={watch('roomTypeId') || ''}
                                            onChange={(val: string) => {
                                                setValue('roomTypeId', val);
                                                setValue('roomId', '');
                                                setValue('selectedRoomIds', []);
                                                setAvailability(null);
                                            }}
                                            required
                                        />
                                        {errors.roomTypeId && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.roomTypeId.message}</p>}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-primary" /> Check-in Date
                                    </label>
                                    <div 
                                        onClick={() => {
                                            if (window.innerWidth < 1280) setShowMobileCalendar(true);
                                        }}
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary hover:border-primary/50 transition-all flex items-center justify-between xl:hidden"
                                    >
                                        <span>{watch('checkInDate') ? format(new Date(watch('checkInDate')), 'yyyy-MM-dd') : 'Select Date'}</span>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input 
                                        type="date" 
                                        {...register('checkInDate')} 
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all hidden xl:block" 
                                    />
                                    {errors.checkInDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkInDate.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-primary" /> Check-out Date
                                    </label>
                                    <div 
                                        onClick={() => {
                                            if (window.innerWidth < 1280) setShowMobileCalendar(true);
                                        }}
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary hover:border-primary/50 transition-all flex items-center justify-between xl:hidden"
                                    >
                                        <span>{watch('checkOutDate') ? format(new Date(watch('checkOutDate')), 'yyyy-MM-dd') : 'Select Date'}</span>
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <input 
                                        type="date" 
                                        {...register('checkOutDate')} 
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold cursor-pointer focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all hidden xl:block" 
                                    />
                                    {errors.checkOutDate && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.checkOutDate.message}</p>}
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Guests & Capacity</label>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Adults (13+)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    {...register('adultsCount', {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            if (isGroupMode) setValue('groupSize', (parseInt(e.target.value) || 1) + watch('childrenCount'));
                                                        }
                                                    })}
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">Children (6-12)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    {...register('childrenCount', {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            if (isGroupMode) setValue('groupSize', watch('adultsCount') + (parseInt(e.target.value) || 0));
                                                        }
                                                    })}
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-extrabold text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                            </div>
                                        </div>
                                        {isGroupMode && (
                                            <div className="flex items-center justify-between py-2.5 px-4 bg-primary/5 rounded-xl border border-primary/20 animate-in fade-in zoom-in-95">
                                                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Group Stay Package Active</span>
                                                <span className="text-[10px] font-bold text-muted-foreground">Total: {watch('adultsCount') + watch('childrenCount')} Members</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">GST Number (Optional)</label>
                                        <input
                                            type="text"
                                            {...register('gstNumber')}
                                            placeholder="Enter GSTIN"
                                            className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-bold uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all placeholder:text-muted-foreground"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Promo or Referral Code</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                {...register('appliedCode')}
                                                placeholder="GUEST10 or CP..."
                                                className="flex-1 min-w-0 border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 font-bold text-sm uppercase focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all placeholder:text-muted-foreground"
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCheckAvailability}
                                                className="shrink-0 whitespace-nowrap px-5 py-2.5 bg-muted text-foreground hover:bg-muted/80 rounded-xl text-xs font-bold transition-all border border-border shadow-sm active:scale-95"
                                            >
                                                Apply
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Special Requests / Notes (Optional)</label>
                                    <textarea
                                        {...register('specialRequests')}
                                        rows={3}
                                        placeholder="Any special instructions or preferences?"
                                        className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm p-4 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all placeholder:text-muted-foreground"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <hr className="my-4 border-border" />
                                    <button 
                                        type="button" 
                                        onClick={handleCheckAvailability} 
                                        disabled={checkingAvailability}
                                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 px-6 py-3.5 rounded-xl text-base font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 disabled:transform-none"
                                    >
                                        {checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : <Calendar className="h-5 w-5" />}
                                        {checkingAvailability ? 'Verifying Availability...' : 'Check Room Availability'}
                                    </button>

                                    {availability && (
                                        <div className="space-y-4 mt-6">
                                            <div className={clsx(
                                                'p-4 rounded-xl border flex items-start gap-3.5 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300',
                                                availability.available 
                                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-150 dark:border-emerald-900/30 text-emerald-800 dark:text-emerald-400'
                                                    : 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-150 dark:border-rose-900/30 text-rose-800 dark:text-rose-400'
                                            )}>
                                                {availability.available 
                                                    ? <CheckCircle className="h-5 w-5 mt-0.5 text-emerald-500 shrink-0" /> 
                                                    : <AlertCircle className="h-5 w-5 mt-0.5 text-rose-500 shrink-0" />
                                                }
                                                <div className="flex-1">
                                                    <p className="font-extrabold text-sm uppercase tracking-wider leading-none">
                                                        {availability.available ? 'Rooms Available' : 'No Rooms Available'}
                                                    </p>
                                                    <p className="text-xs mt-1.5 text-gray-500 dark:text-gray-400 font-medium">
                                                        {availability.available
                                                            ? isGroupMode
                                                                ? `Aggregate capacity verified for ${watch('groupSize')} guests.`
                                                                : `${availability.availableRooms} rooms left for these dates.`
                                                            : isGroupMode && availability.groupUnavailableReason === 'NO_POOL_CONFIGURED'
                                                                ? 'No room types are added to the group booking pool. Go to Room Types → Edit a room type and enable "Enable Group Bookings" with a Max Group Occupancy.'
                                                                : isGroupMode && availability.groupUnavailableReason === 'CAPACITY_EXCEEDED'
                                                                    ? `The group pool capacity is not enough for ${watch('groupSize')} guests. Reduce group size or increase Max Group Occupancy on room types.`
                                                                    : 'Please choose different dates, room type or reduce group size.'}
                                                    </p>
                                                </div>
                                            </div>

                                            {availability.available && availability.roomList && availability.roomList.length > 0 && (
                                                <div className="p-5 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-950/10 dark:to-indigo-950/10 border border-blue-150 dark:border-blue-900/30 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-3 mt-6">
                                                    <div className="flex items-center justify-between mb-4">
                                                        <div>
                                                            <h3 className="text-xs font-black uppercase text-blue-800 dark:text-blue-300 tracking-wider flex items-center gap-2">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse"></div>
                                                                {isGroupMode ? 'Room Inventory Selection' : 'Select Available Rooms'}
                                                            </h3>
                                                            <p className="text-[10px] text-blue-500/80 mt-1 font-medium italic">
                                                                {isGroupMode
                                                                    ? `Total capacity must meet ${watch('groupSize')} guests.`
                                                                    : 'Standard multi-room booking mode active.'}
                                                            </p>
                                                        </div>
                                                        {(watch('selectedRoomIds') || []).length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => { setValue('selectedRoomIds', []); handleCheckAvailability(); }}
                                                                className="text-[10px] font-black uppercase text-red-500 hover:text-red-600 flex items-center gap-1 hover:bg-red-50 dark:hover:bg-red-950/30 px-2.5 py-1 rounded-md transition-colors"
                                                            >
                                                                Clear Selection
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                        {availability.roomList.map((room) => {
                                                            const isSelected = (watch('selectedRoomIds') || []).includes(room.id);
                                                            return (
                                                                <button
                                                                    key={room.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const current = watch('selectedRoomIds') || [];
                                                                        const next = current.includes(room.id)
                                                                            ? current.filter(id => id !== room.id)
                                                                            : [...current, room.id];
                                                                        setValue('selectedRoomIds', next);
                                                                        if (availability.available) handleCheckAvailability();
                                                                    }}
                                                                    className={clsx(
                                                                        "relative overflow-hidden group p-4 rounded-xl border-2 transition-all duration-300 text-left",
                                                                        isSelected
                                                                            ? "bg-blue-600 border-blue-600 text-white shadow-md hover:bg-blue-700"
                                                                            : "bg-white dark:bg-gray-950 border-gray-150 dark:border-gray-800 hover:border-blue-400/50 dark:hover:border-blue-700/50 text-gray-700 dark:text-gray-300"
                                                                    )}
                                                                >
                                                                    <div className="flex flex-col relative z-10">
                                                                        <div className="flex justify-between items-center mb-1">
                                                                            <span className={clsx("text-sm font-black uppercase tracking-tight", isSelected ? "text-blue-100" : "text-gray-950 dark:text-white")}>
                                                                                {room.roomNumber || room.name}
                                                                            </span>
                                                                            <span className={clsx(
                                                                                "text-[9px] font-bold px-1.5 py-0.5 rounded-md",
                                                                                isSelected ? "bg-white/20 text-white" : "bg-gray-150 dark:bg-gray-850 text-gray-600 dark:text-gray-400"
                                                                            )}>
                                                                                Cap: {room.capacity || 'N/A'}
                                                                            </span>
                                                                        </div>
                                                                        <span className={clsx("text-[9px] truncate font-semibold mt-1", isSelected ? "text-blue-200" : "text-gray-400 dark:text-gray-500")}>
                                                                            {room.roomType}
                                                                        </span>
                                                                    </div>
                                                                    {isSelected && (
                                                                        <div className="absolute top-1.5 right-1.5">
                                                                            <div className="bg-white/20 p-0.5 rounded-full">
                                                                                <CheckCircle className="h-3 w-3 text-white" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>

                                                    {isGroupMode && (
                                                        <div className="mt-5 p-4 bg-white dark:bg-gray-950 rounded-xl border border-blue-100 dark:border-blue-900/30 shadow-inner">
                                                            <div className="flex justify-between items-end mb-2">
                                                                <div>
                                                                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider block mb-1">Selected Inventory Power</span>
                                                                    <span className={clsx("text-sm font-black flex items-center gap-1.5",
                                                                        (availability.roomList.filter(r => (watch('selectedRoomIds') || []).includes(r.id)).reduce((sum, r) => sum + (r.capacity || 0), 0)) >= (watch('groupSize') || 0)
                                                                            ? "text-emerald-600 dark:text-emerald-400"
                                                                            : "text-amber-500 dark:text-amber-400")}>
                                                                        {availability.roomList.filter(r => (watch('selectedRoomIds') || []).includes(r.id)).reduce((sum, r) => sum + (r.capacity || 0), 0)} / {watch('groupSize')} GUESTS
                                                                        {(availability.roomList.filter(r => (watch('selectedRoomIds') || []).includes(r.id)).reduce((sum, r) => sum + (r.capacity || 0), 0)) >= (watch('groupSize') || 0) && (
                                                                            <CheckCircle className="h-4 w-4" />
                                                                        )}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                    {(watch('selectedRoomIds') || []).length} Rooms Active
                                                                </span>
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-150 dark:bg-gray-800 rounded-full overflow-hidden">
                                                                <div
                                                                    className={clsx("h-full transition-all duration-700 ease-out rounded-full",
                                                                        (availability.roomList.filter(r => (watch('selectedRoomIds') || []).includes(r.id)).reduce((sum, r) => sum + (r.capacity || 0), 0)) >= (watch('groupSize') || 0)
                                                                            ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                                            : "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]")}
                                                                    style={{ width: `${Math.min(100, (availability.roomList.filter(r => (watch('selectedRoomIds') || []).includes(r.id)).reduce((sum, r) => sum + (r.capacity || 0), 0)) / (watch('groupSize') || 1) * 100)}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {!isGroupMode && (watch('selectedRoomIds') || []).length < requiredRooms && (
                                                        <div className="mt-4 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/50 rounded-xl flex items-start gap-3 text-amber-700 dark:text-amber-400 animate-in fade-in slide-in-from-top-2">
                                                            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                                                            <div>
                                                                <p className="font-extrabold text-sm uppercase tracking-wider">Rooms Needed</p>
                                                                <p className="text-xs mt-1 text-gray-500 dark:text-gray-400 font-medium">
                                                                    Guest count ({watch('adultsCount')} Adults, {watch('childrenCount')} Children) requires at least <strong>{requiredRooms} rooms</strong>. You have selected only <strong>{(watch('selectedRoomIds') || []).length} rooms</strong>.
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isGroupMode && availability.available && availability.allocationPreview && (watch('selectedRoomIds') || []).length === 0 && (
                                                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200/50 dark:border-blue-800/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                    <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-3 tracking-wider flex items-center gap-1.5">
                                                        <CheckCircle className="h-3.5 w-3.5 text-blue-500" /> Suggested Allocation Preview
                                                    </h4>
                                                    <div className="space-y-2">
                                                        {availability.allocationPreview.map((room, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm py-2 border-b border-blue-100/50 dark:border-blue-800/30 last:border-0">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-gray-900 dark:text-white">Room {room.name}</span>
                                                                    <span className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold">{room.roomType}</span>
                                                                </div>
                                                                <span className="text-[10px] font-bold bg-blue-100/70 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Cap: {room.capacity}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-2 flex justify-between items-center border-t border-blue-100/50 dark:border-blue-800/30">
                                                            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Total Capacity</span>
                                                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                                                                {availability.allocationPreview.reduce((sum, r) => sum + r.capacity, 0)} Guests
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>


                        {/* Source */}
                        <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300">
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground pb-3 border-b border-border">
                                <Briefcase className="h-5 w-5 text-primary" /> Booking Source
                            </h2>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Source</label>
                                <select 
                                    {...register('bookingSourceId')} 
                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all cursor-pointer"
                                >
                                    <option value="">Direct / None</option>
                                    {bookingSources?.map((source) => (
                                        <option key={source.id} value={source.id}>{source.name} {source.commission && `(${source.commission}% Commission)`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Guest Details */}
                        {
                            availability?.available && (
                                <>
                                    {/* Primary Contact Information */}
                                    <div className="bg-card p-6 sm:p-8 rounded-2xl shadow-sm border border-border hover:shadow-md transition-all duration-300">
                                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-foreground pb-3 border-b border-border">
                                            <Users className="h-5 w-5 text-primary" /> Primary Contact Information
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">First Name</label>
                                                <input
                                                    type="text"
                                                    {...register('guestFirstName')}
                                                    placeholder="Enter first name"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestFirstName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestFirstName.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Last Name (Optional)</label>
                                                <input
                                                    type="text"
                                                    {...register('guestLastName')}
                                                    placeholder="Enter last name (Optional)"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestLastName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestLastName.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email (Optional)</label>
                                                <input
                                                    type="email"
                                                    {...register('guestEmail')}
                                                    placeholder="Enter email address"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestEmail && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestEmail.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Primary Phone Number</label>
                                                <input
                                                    type="text"
                                                    {...register('guestPhone')}
                                                    placeholder="Enter primary contact number"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.guestPhone && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guestPhone.message}</p>}
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Primary WhatsApp Number (Optional)</label>
                                                <input
                                                    type="text"
                                                    {...register('whatsappNumber')}
                                                    placeholder="Enter WhatsApp number"
                                                    className="w-full border border-input bg-background text-foreground rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-primary/50 transition-all"
                                                />
                                                {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.whatsappNumber.message}</p>}
                                            </div>
                                            <div className="md:col-span-2 flex items-center mt-3">
                                                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        {...register('isBookerAlsoGuest')}
                                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/40 w-4 h-4 cursor-pointer"
                                                    />
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 hover:text-gray-900 transition-colors">
                                                        Add Booker as the Primary Guest (Guest 1)
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-150 dark:border-gray-700/50 hover:shadow-md transition-all duration-300">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                                                <Users className="h-5 w-5 text-blue-500" /> Guest Details
                                            </h2>
                                            <button 
                                                type="button" 
                                                onClick={() => append({ firstName: '', lastName: '' })} 
                                                className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg transition-all flex items-center gap-1 active:scale-95"
                                            >
                                                + Add Guest
                                            </button>
                                        </div>
                                        {errors.guests?.message && (
                                            <div className="mb-4 p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-150 dark:border-red-900/30 rounded-xl animate-in fade-in slide-in-from-top-2">
                                                <p className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-500" /> {errors.guests.message}
                                                </p>
                                            </div>
                                        )}
                                        <div className="space-y-5">
                                            {fields.map((field, index) => (
                                                <div key={field.id} className="p-5 bg-gray-50/50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-850/50 relative group/guest">
                                                    {fields.length > 1 && (
                                                        <button 
                                                            type="button" 
                                                            onClick={() => remove(index)} 
                                                            className="absolute top-3 right-3 text-xs font-bold text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-950/50 px-2 py-1 rounded-md transition-all active:scale-95"
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                    <div className="flex justify-between items-center mb-3">
                                                         <h3 className="text-xs font-extrabold text-gray-400 dark:text-gray-505 uppercase tracking-wider">
                                                             Guest {index + 1} {index === 0 && '(Primary)'}
                                                         </h3>
                                                         {index === 0 && isBookerAlsoGuest && (
                                                             <span className="text-[9px] bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                                                 Synced with Booker
                                                             </span>
                                                         )}
                                                     </div>

                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                         <div>
                                                             <input
                                                                 {...register(`guests.${index}.firstName`)}
                                                                 placeholder="First Name"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm px-4 py-2.5 font-semibold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                                                     index === 0 && isBookerAlsoGuest && "bg-gray-100/80 dark:bg-gray-800/80 cursor-not-allowed text-gray-500 dark:text-gray-450 border-gray-200/50 dark:border-gray-700/50"
                                                                 )}
                                                             />
                                                             {errors.guests?.[index]?.firstName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guests[index]?.firstName?.message}</p>}
                                                         </div>
                                                         <div>
                                                             <input
                                                                 {...register(`guests.${index}.lastName`)}
                                                                 placeholder="Last Name (Optional)"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm px-4 py-2.5 font-semibold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                                                     index === 0 && isBookerAlsoGuest && "bg-gray-100/80 dark:bg-gray-800/80 cursor-not-allowed text-gray-500 dark:text-gray-450 border-gray-200/50 dark:border-gray-700/50"
                                                                 )}
                                                             />
                                                             {errors.guests?.[index]?.lastName && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.guests[index]?.lastName?.message}</p>}
                                                         </div>
                                                         <input
                                                             {...register(`guests.${index}.email`)}
                                                             type="email"
                                                             placeholder="Email (Optional)"
                                                             readOnly={index === 0 && isBookerAlsoGuest}
                                                             className={clsx(
                                                                 "w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm px-4 py-2.5 font-semibold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                                                 index === 0 && isBookerAlsoGuest && "bg-gray-100/80 dark:bg-gray-800/80 cursor-not-allowed text-gray-500 dark:text-gray-450 border-gray-200/50 dark:border-gray-700/50"
                                                             )}
                                                         />
                                                         <div className="grid grid-cols-2 gap-2.5">
                                                             <input
                                                                 {...register(`guests.${index}.phone`)}
                                                                 placeholder="Phone (Optional)"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm px-4 py-2.5 font-semibold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                                                     index === 0 && isBookerAlsoGuest && "bg-gray-100/80 dark:bg-gray-800/80 cursor-not-allowed text-gray-500 dark:text-gray-450 border-gray-200/50 dark:border-gray-700/50"
                                                                 )}
                                                             />
                                                             <input
                                                                 {...register(`guests.${index}.whatsappNumber`)}
                                                                 placeholder="WhatsApp (Optional)"
                                                                 readOnly={index === 0 && isBookerAlsoGuest}
                                                                 className={clsx(
                                                                     "w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm px-4 py-2.5 font-semibold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500",
                                                                     index === 0 && isBookerAlsoGuest && "bg-gray-100/80 dark:bg-gray-800/80 cursor-not-allowed text-gray-500 dark:text-gray-450 border-gray-200/50 dark:border-gray-700/50"
                                                                 )}
                                                             />
                                                         </div>
                                                         <div className="relative">
                                                             <select 
                                                                 {...register(`guests.${index}.idType`)} 
                                                                 className={clsx(
                                                                     "w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm h-11 px-4 font-semibold transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer", 
                                                                     errors.guests?.[index]?.idType && "border-red-500 ring-1 ring-red-500"
                                                                 )}
                                                             >
                                                                 <option value="">-- ID Type (Optional) --</option>
                                                                 <option value="AADHAR">Aadhar Card</option>
                                                                 <option value="PASSPORT">Passport</option>
                                                                 <option value="VOTER_ID">Voter ID</option>
                                                                 <option value="DRIVING_LICENSE">Driving License</option>
                                                                 <option value="OTHER">Other</option>
                                                             </select>
                                                             {errors.guests?.[index]?.idType && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.guests[index].idType?.message}</p>}
                                                         </div>

                                                         {watch(`guests.${index}.idType`) && (
                                                             <div className="md:col-span-2 space-y-4 animate-in fade-in slide-in-from-top-3 duration-300">
                                                                 <div>
                                                                     <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-550 mb-1.5">ID Number</label>
                                                                     <input
                                                                         {...register(`guests.${index}.idNumber`)}
                                                                         placeholder="Enter ID number"
                                                                         className={clsx("w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm text-sm px-4 py-2.5 font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500", errors.guests?.[index]?.idNumber && "border-red-500 ring-1 ring-red-500")}
                                                                     />
                                                                     {errors.guests?.[index]?.idNumber && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.guests[index].idNumber?.message}</p>}
                                                                 </div>

                                                                 <div>
                                                                      <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-555 mb-2">Upload Guest ID Photo (Front & Optional Back)</label>
                                                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-950 p-4 rounded-xl border border-gray-150 dark:border-gray-800/50 shadow-inner">
                                                                          {/* Front Side */}
                                                                          <div className="flex flex-col gap-2">
                                                                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Front Side</span>
                                                                              <div className="flex items-center gap-3">
                                                                                  <input
                                                                                      type="file"
                                                                                      accept="image/*"
                                                                                      onChange={(e) => handleGuestFileUpload(index, e, false)}
                                                                                      className="hidden"
                                                                                      id={`guest-id-upload-front-${index}`}
                                                                                  />
                                                                                  <label
                                                                                      htmlFor={`guest-id-upload-front-${index}`}
                                                                                      className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 shadow-sm border-dashed"
                                                                                  >
                                                                                      {idUploading[`front-${index}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                                      {watch(`guests.${index}.idImage`) ? 'Change Front' : 'Upload Front'}
                                                                                  </label>
                                                                                  {watch(`guests.${index}.idImage`) && (
                                                                                      <a
                                                                                          href={watch(`guests.${index}.idImage`)}
                                                                                          target="_blank"
                                                                                          rel="noreferrer"
                                                                                          className="h-10 w-16 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-80 transition-all group/img relative shadow-sm block"
                                                                                      >
                                                                                          <img
                                                                                              src={watch(`guests.${index}.idImage`)}
                                                                                              alt="Front ID"
                                                                                              className="w-full h-full object-cover"
                                                                                          />
                                                                                      </a>
                                                                                  )}
                                                                              </div>
                                                                          </div>

                                                                          {/* Back Side */}
                                                                          <div className="flex flex-col gap-2">
                                                                              <span className="text-[9px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Back Side (Optional)</span>
                                                                              <div className="flex items-center gap-3">
                                                                                  <input
                                                                                      type="file"
                                                                                      accept="image/*"
                                                                                      onChange={(e) => handleGuestFileUpload(index, e, true)}
                                                                                      className="hidden"
                                                                                      id={`guest-id-upload-back-${index}`}
                                                                                  />
                                                                                  <label
                                                                                      htmlFor={`guest-id-upload-back-${index}`}
                                                                                      className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 shadow-sm border-dashed"
                                                                                  >
                                                                                      {idUploading[`back-${index}`] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                                      {watch(`guests.${index}.idImageBack`) ? 'Change Back' : 'Upload Back'}
                                                                                  </label>
                                                                                  {watch(`guests.${index}.idImageBack`) && (
                                                                                      <a
                                                                                          href={watch(`guests.${index}.idImageBack`)}
                                                                                          target="_blank"
                                                                                          rel="noreferrer"
                                                                                          className="h-10 w-16 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:opacity-80 transition-all group/img relative shadow-sm block"
                                                                                      >
                                                                                          <img
                                                                                              src={watch(`guests.${index}.idImageBack`)}
                                                                                              alt="Back ID"
                                                                                              className="w-full h-full object-cover"
                                                                                          />
                                                                                      </a>
                                                                                  )}
                                                                              </div>
                                                                          </div>
                                                                      </div>
                                                                      <p className="text-[10px] text-gray-400 italic mt-2">Accepted formats: JPG, PNG. Max 5MB.</p>
                                                                  </div>
                                                             </div>
                                                         )}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>

                                    {/* Price Override & Payments - Moved here for better workflow */}
                                    <div className="mt-8 bg-gradient-to-br from-emerald-50/40 to-teal-50/40 dark:from-emerald-950/5 dark:to-teal-950/5 p-6 sm:p-8 rounded-2xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 hover:shadow-md transition-all duration-300">
                                        <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-emerald-800 dark:text-emerald-400 pb-3 border-b border-emerald-100/50 dark:border-emerald-900/20">
                                            <CheckCircle className="h-5 w-5 text-emerald-500" /> Manage Payment for this Booking
                                        </h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Payment Option / Status</label>
                                                <select {...register('paymentOption')} className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer">
                                                    <option value="FULL">Collect Full Payment Now</option>
                                                    <option value="PARTIAL">Collect Partial / Deposit</option>
                                                </select>
                                            </div>
                                            {watch('paymentOption') === 'PARTIAL' && (
                                                <div className="animate-in zoom-in-95 duration-200">
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-blue-500 mb-1.5">Initial Deposit Amount (₹)</label>
                                                    <input
                                                        type="number"
                                                        {...register('paidAmount', { valueAsNumber: true })}
                                                        className="w-full border-blue-200 dark:border-blue-900 dark:bg-gray-950 dark:text-white rounded-xl shadow-sm h-11 px-4 font-black text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                        placeholder="0.00"
                                                        required={watch('paymentOption') === 'PARTIAL'}
                                                    />
                                                </div>
                                            )}
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">Payment Method</label>
                                                <select {...register('paymentMethod')} className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all cursor-pointer">
                                                    <option value="CASH">Cash Payment</option>
                                                    <option value="UPI">UPI / QR Code</option>
                                                    <option value="CARD">Debit / Credit Card</option>
                                                    <option value="WALLET">Channel Partner Wallet</option>
                                                    <option value="ONLINE">Send Payment Link (Email/SMS)</option>
                                                </select>
                                            </div>
                                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-emerald-100/50 dark:border-emerald-900/20 pt-5 mt-2">
                                                <div>
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Override Price (Optional)</label>
                                                        <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg border border-gray-200/10">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setValue('isOverrideInclusive', true);
                                                                    if (watch('overrideTotal')) handleCheckAvailability();
                                                                }}
                                                                className={clsx('px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200', watch('isOverrideInclusive') ? 'bg-white dark:bg-gray-800 text-blue-650 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-650')}
                                                            >
                                                                Inc. GST
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setValue('isOverrideInclusive', false);
                                                                    if (watch('overrideTotal')) handleCheckAvailability();
                                                                }}
                                                                className={clsx('px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all duration-200', !watch('isOverrideInclusive') ? 'bg-white dark:bg-gray-800 text-blue-650 dark:text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-650')}
                                                            >
                                                                Exc. GST
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <input
                                                        type="number"
                                                        {...register('overrideTotal', {
                                                            setValueAs: v => (v === '' || v === undefined || v === null) ? undefined : Number(v),
                                                            onBlur: () => { if (watch('overrideTotal')) handleCheckAvailability(); }
                                                        })}
                                                        className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-extrabold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-gray-400"
                                                        placeholder={watch('isOverrideInclusive') ? "Final Total amount" : "Base amount (add GST)"}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-405 mb-1.5">Reason for Override</label>
                                                    <input 
                                                        type="text" 
                                                        {...register('overrideReason')} 
                                                        className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-semibold focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder-gray-400" 
                                                        placeholder="Why the custom price?" 
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )
                        }

                        <div className="flex justify-end pt-4">
                            <button 
                                type="submit" 
                                disabled={!availability?.available || createBookingMutation.isPending}
                                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-base font-bold shadow-md hover:shadow-lg transition-all active:scale-95 duration-200"
                            >
                                {createBookingMutation.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>) : 'Confirm Booking'}
                            </button>
                        </div>

                        {/* Historical Entry Option */}
                        {
                            watch('isManualBooking') && (
                                <div className="mt-6 flex flex-col gap-3.5 p-5 border border-gray-200/60 dark:border-gray-700/50 rounded-2xl bg-gray-50/50 dark:bg-gray-900/20">
                                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            {...register('isHistoricalEntry')}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500/40 w-4 h-4 cursor-pointer"
                                        />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                                Backdate this booking (Historical Entry)
                                            </span>
                                            {watchedCheckInDate && new Date(watchedCheckInDate) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                                                <span className="text-[10px] text-orange-600 font-extrabold uppercase mt-0.5 tracking-wider">Required for past dates</span>
                                            )}
                                        </div>
                                    </label>
                                    {errors.isHistoricalEntry && <p className="text-red-500 text-xs mt-1 font-bold">{errors.isHistoricalEntry.message}</p>}
                                    {watch('isHistoricalEntry') && (
                                        <div className="pl-6 animate-in slide-in-from-top-3 duration-300 space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Original Transaction Date</label>
                                                <input
                                                    type="date"
                                                    {...register('transactionDate')}
                                                    className="border-gray-200 dark:border-gray-700 dark:bg-gray-900/50 dark:text-white rounded-xl shadow-sm h-11 px-4 text-sm font-semibold w-full md:w-64 cursor-pointer focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                                                />
                                                {errors.transactionDate && <p className="text-red-500 text-xs mt-1">{errors.transactionDate.message}</p>}
                                            </div>

                                            <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-150 dark:border-blue-800/40 rounded-xl">
                                                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase mb-1.5 flex items-center gap-1">
                                                    <ShieldCheck className="h-4 w-4" /> Historical Verification Rules
                                                </p>
                                                <ul className="text-[10px] text-gray-500 dark:text-gray-400 list-disc pl-4 space-y-1 font-medium">
                                                    <li>Guest ID details are **mandatory** (Type & Number)</li>
                                                    <li>System will record **Full Payment** automatically</li>
                                                    <li>Booking status will be set to **Checked Out**</li>
                                                </ul>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        }
                    </form >
                </div >

                {/* Right Sidebar: Interactive Calendar & Price Summary */}
                <div className="xl:col-span-7 space-y-6">
                    {/* 1. Interactive Availability Calendar (Desktop only) */}
                    <div className="hidden xl:block">
                        <BookingAvailabilityCalendar
                            propertyId={watch('propertyId')}
                            roomTypeId={watch('roomTypeId')}
                            isGroupBooking={!!watch('isGroupBooking')}
                            selectedCheckIn={watch('checkInDate')}
                            selectedCheckOut={watch('checkOutDate')}
                            monthsToShow={2}
                            onSelectDates={(checkIn, checkOut) => {
                                setValue('checkInDate', checkIn);
                                setValue('checkOutDate', checkOut);
                                handleCheckAvailability();
                            }}
                        />
                    </div>

                    {/* Mobile Calendar Modal */}
                    {showMobileCalendar && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm xl:hidden">
                            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
                                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                                    <h3 className="font-bold text-foreground">Select Dates</h3>
                                    <button onClick={() => setShowMobileCalendar(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                                        <X className="h-5 w-5 text-muted-foreground" />
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto">
                                    <BookingAvailabilityCalendar
                                        propertyId={watch('propertyId')}
                                        roomTypeId={watch('roomTypeId')}
                                        isGroupBooking={!!watch('isGroupBooking')}
                                        selectedCheckIn={watch('checkInDate')}
                                        selectedCheckOut={watch('checkOutDate')}
                                        monthsToShow={1} // Show 1 month on mobile to save vertical space
                                        onSelectDates={(checkIn, checkOut) => {
                                            setValue('checkInDate', checkIn);
                                            setValue('checkOutDate', checkOut);
                                            handleCheckAvailability();
                                            // Optional: Close modal after selection
                                            setTimeout(() => setShowMobileCalendar(false), 500);
                                        }}
                                        className="border-none shadow-none p-0"
                                    />
                                </div>
                                <div className="p-4 border-t border-border bg-muted/10">
                                    <button 
                                        onClick={() => setShowMobileCalendar(false)}
                                        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-transform"
                                    >
                                        Done
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 2. Price Summary */}
                    <div className="bg-card p-6 rounded-2xl shadow-xl border border-border sticky top-[72px] overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-primary/70 to-primary/40"></div>
                        <h2 className="text-xl font-extrabold mb-5 flex items-center gap-2 text-foreground">
                            <span className="text-primary">₹</span> Price Summary
                        </h2>
                        {!priceDetails ? (
                            <p className="text-muted-foreground text-sm italic py-4 text-center">
                                Select stay details and room type, then check availability to view pricing.
                            </p>
                        ) : (
                            <div className="space-y-4">
                                {/* ── ALWAYS show the ORIGINAL breakdown (real room rate, no override) ── */}
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">
                                            {watch('isGroupBooking') ? (
                                                <>
                                                    Group of {watch('groupSize') || 0} Guests
                                                    {availability?.roomList && ` (${availability.roomList.length} Rooms)`}
                                                </>
                                            ) : (
                                                (watch('selectedRoomIds') || []).length > 1 ? `${(watch('selectedRoomIds') || []).length} Rooms` : '1 Room'
                                            )} x {priceDetails.numberOfNights} Nights
                                        </span>
                                        <span className="font-semibold text-foreground">₹{(originalPriceDetails || priceDetails).baseAmount.toFixed(2)}</span>
                                    </div>
                                    {(originalPriceDetails || priceDetails).extraAdultAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                                Extra Adult Charges
                                                {(() => {
                                                    const rt = selectedRoomType;
                                                    const baseAllowance = rt?.maxAdults || 2;
                                                    const adults = Number(watch('adultsCount')) || 1;
                                                    const roomsSelected = Math.max((watch('selectedRoomIds') || []).length, 1);
                                                    const extraAdults = Math.max(0, adults - baseAllowance * roomsSelected);
                                                    return extraAdults > 0
                                                        ? <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{extraAdults} extra</span>
                                                        : <span className="text-[10px] font-bold text-muted-foreground opacity-60">(charged)</span>;
                                                })()}
                                            </span>
                                            <span className="font-semibold text-foreground">₹{(originalPriceDetails || priceDetails).extraAdultAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(originalPriceDetails || priceDetails).extraChildAmount > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground font-medium flex items-center gap-1">
                                                Extra Child Charges
                                                {(() => {
                                                    const rt = selectedRoomType;
                                                    const baseAllowance = rt?.maxChildren || 2;
                                                    const children = Number(watch('childrenCount')) || 0;
                                                    const roomsSelected = Math.max((watch('selectedRoomIds') || []).length, 1);
                                                    const extraChildren = Math.max(0, children - baseAllowance * roomsSelected);
                                                    return extraChildren > 0
                                                        ? <span className="text-[10px] font-black bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">{extraChildren} extra</span>
                                                        : <span className="text-[10px] font-bold text-muted-foreground opacity-60">(charged)</span>;
                                                })()}
                                            </span>
                                            <span className="font-semibold text-foreground">₹{(originalPriceDetails || priceDetails).extraChildAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(originalPriceDetails || priceDetails).offerDiscountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-semibold bg-green-500/10 px-2.5 py-1 rounded-lg">
                                            <span>Offer Discount</span><span>-₹{(originalPriceDetails || priceDetails).offerDiscountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(originalPriceDetails || priceDetails).couponDiscountAmount > 0 && (originalPriceDetails || priceDetails).appliedCodeType === 'COUPON' && (
                                        <div className="flex justify-between text-sm text-green-600 font-semibold bg-green-500/10 px-2.5 py-1 rounded-lg">
                                            <span>Coupon Discount</span><span>-₹{(originalPriceDetails || priceDetails).couponDiscountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {(originalPriceDetails || priceDetails).referralDiscountAmount > 0 && (originalPriceDetails || priceDetails).appliedCodeType === 'REFERRAL' && (
                                        <div className="flex justify-between text-sm text-green-600 font-semibold bg-green-500/10 px-2.5 py-1 rounded-lg">
                                            <span>Referral Discount</span><span>-₹{(originalPriceDetails || priceDetails).referralDiscountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm border-b border-border pb-3">
                                        <span className="text-muted-foreground font-medium">GST / Taxes ({(originalPriceDetails || priceDetails).taxRate}%)</span>
                                        <span className="font-semibold text-foreground">₹{(originalPriceDetails || priceDetails).taxAmount.toFixed(2)}</span>
                                    </div>
                                    {/* Original total — strikethrough if override is active */}
                                    <div className="flex justify-between items-center pt-1">
                                        <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">
                                            {watch('overrideTotal') ? 'Original Total' : 'Total'}
                                        </span>
                                        <span className={`font-extrabold tracking-tight ${watch('overrideTotal') ? 'text-xl text-muted-foreground line-through' : 'text-3xl text-primary'}`}>
                                            ₹{(originalPriceDetails || priceDetails).totalAmount.toFixed(2)}
                                        </span>
                                    </div>
                                </div>

                                {/* ── Override section (shown only when override is set) ── */}
                                {watch('overrideTotal') && (
                                    <div className="space-y-3 p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl animate-in fade-in zoom-in-95">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 tracking-wider bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                                                Override Active
                                            </span>
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                                                {watch('isOverrideInclusive') ? 'Incl. GST' : 'Excl. GST'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-muted-foreground font-medium">Override Base Tariff</span>
                                            <span className="font-bold text-foreground">₹{(watch('isOverrideInclusive') ? (watch('overrideTotal')! / (1 + priceDetails.taxRate / 100)) : watch('overrideTotal')!).toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm border-b border-amber-200/40 dark:border-amber-900/20 pb-3">
                                            <span className="text-muted-foreground font-medium">GST Tax ({priceDetails.taxRate}%)</span>
                                            <span className="font-bold text-foreground">₹{(watch('isOverrideInclusive') ? (watch('overrideTotal')! - watch('overrideTotal')! / (1 + priceDetails.taxRate / 100)) : (watch('overrideTotal')! * priceDetails.taxRate / 100)).toFixed(2)}</span>
                                        </div>
                                        {(originalPriceDetails || priceDetails).offerDiscountAmount > 0 || (originalPriceDetails || priceDetails).discountAmount > 0 ? (
                                            <p className="text-[9px] text-muted-foreground italic">Discounts are bypassed when a manual override is active.</p>
                                        ) : null}
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="font-bold text-xs text-muted-foreground uppercase tracking-wider">Override Total</span>
                                            <span className="font-extrabold text-3xl tracking-tight text-amber-600 dark:text-amber-400">
                                                ₹{(watch('isOverrideInclusive') ? watch('overrideTotal')! : watch('overrideTotal')! * (1 + priceDetails.taxRate / 100)).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div >

            {showInsufficientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-amber-50/50 dark:bg-amber-950/20">
                            <div>
                                <h2 className="text-lg font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    Insufficient Rooms
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowInsufficientModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-4">
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                                    <AlertCircle className="h-10 w-10" />
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                                    {(availability?.roomList || []).length < requiredRooms ? (
                                        <span>
                                            Not enough rooms available on these dates! The guest count requires at least <strong>{requiredRooms} rooms</strong>, but only <strong>{(availability?.roomList || []).length} rooms</strong> are available of this type. Please choose different dates, select a different room type, reduce the guest count, <strong className="text-amber-600 dark:text-amber-400 font-black">or split the booking into multiple room types</strong>.
                                        </span>
                                    ) : (
                                        <span>
                                            The selected guest count cannot fit in the number of rooms currently selected. Please select additional available rooms to accommodate all guests.
                                        </span>
                                    )}
                                </p>
                            </div>

                            <div className="p-4 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Guests:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {watch('adultsCount')} Adult(s), {watch('childrenCount')} Child(ren)
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 font-medium">Room Type:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {selectedRoomType?.name || 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs border-t border-gray-100 dark:border-gray-800 pt-2">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold">Required Rooms:</span>
                                    <span className="font-black text-amber-600 dark:text-amber-400">{requiredRooms} Room(s)</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400 font-bold">Currently Selected:</span>
                                    <span className="font-black text-red-600 dark:text-red-400">
                                        {(watch('selectedRoomIds') || []).length} Room(s)
                                    </span>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInsufficientModal(false)}
                                    className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all shadow-md flex items-center justify-center"
                                >
                                    {(availability?.roomList || []).length < requiredRooms ? 'Modify Search' : 'Select More Rooms'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
}
