import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, addDays } from 'date-fns';
import { bookingsService } from '../../services/bookings';
import { roomTypesService } from '../../services/roomTypes';
import { bookingSourcesService } from '../../services/bookingSources';
import { uploadService } from '../../services/uploads';
import { Loader2, Calendar, Users, CheckCircle, AlertCircle, ArrowLeft, Briefcase, Camera, ShieldCheck, Eye } from 'lucide-react';
import clsx from 'clsx';
import SearchableSelect from '../../components/SearchableSelect';
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
    guests: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        phone: z.string().optional(),
        age: z.number().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
        idImage: z.string().optional(),
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
    const { selectedProperty } = useProperty();
    const [availability, setAvailability] = useState<{ available: boolean; availableRooms: number; roomList?: any[]; allocationPreview?: any[]; groupUnavailableReason?: string } | null>(null);
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    const preSelectedRoomId = searchParams.get('roomId');
    const preSelectedRoomTypeId = searchParams.get('roomTypeId');

    const {
        register, control, handleSubmit, watch,
        formState: { errors }, getValues, setValue,
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            propertyId: selectedProperty?.id || '',
            checkInDate: format(new Date(), 'yyyy-MM-dd'),
            checkOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            adultsCount: 1, childrenCount: 0,
            roomTypeId: preSelectedRoomTypeId || '',
            roomId: preSelectedRoomId || undefined,
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
            guests: [{ firstName: '', lastName: '' }],
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

    const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const { data: bookingSources } = useQuery<any[]>({
        queryKey: ['bookingSources'],
        queryFn: () => bookingSourcesService.getAll(),
    });

    useEffect(() => {
        if (preSelectedRoomId && preSelectedRoomTypeId) handleCheckAvailability();
    }, [preSelectedRoomId, preSelectedRoomTypeId]);

    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

    const [idUploading, setIdUploading] = useState<Record<number, boolean>>({});

    const handleGuestFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIdUploading(prev => ({ ...prev, [index]: true }));
        try {
            const data = await uploadService.upload(file);
            setValue(`guests.${index}.idImage`, data.url);
            toast.success(`Guest ${index + 1} ID uploaded`);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error(`Failed to upload ID for Guest ${index + 1}`);
        } finally {
            setIdUploading(prev => ({ ...prev, [index]: false }));
        }
    };

    const isGroupMode = !!watch('isGroupBooking');

    const handleCheckAvailability = async () => {
        const values = getValues();
        const isGroup = values.isGroupBooking;

        if (!values.checkInDate || !values.checkOutDate) return;
        if (!isGroup && !values.roomTypeId) return;

        setCheckingAvailability(true);
        setAvailability(null);
        setPriceDetails(null);
        try {
            const avail = await bookingsService.checkAvailability({
                roomTypeId: values.roomTypeId || undefined,
                checkInDate: values.checkInDate,
                checkOutDate: values.checkOutDate,
                isGroupBooking: isGroup,
                groupSize: isGroup ? Number(values.groupSize) : undefined,
                propertyId: values.propertyId,
            });
            setAvailability(avail);

            if (avail.available) {
                const values = getValues();
                const roomCount = (values.selectedRoomIds && values.selectedRoomIds.length > 0) ? values.selectedRoomIds.length : 1;
                const price = await (bookingsService as any).calculatePrice({
                    roomTypeId: isGroup ? (avail.allocationPreview?.[0]?.roomTypeId || values.roomTypeId) : values.roomTypeId,
                    checkInDate: values.checkInDate,
                    checkOutDate: values.checkOutDate,
                    adultsCount: Number(values.adultsCount),
                    childrenCount: Number(values.childrenCount),
                    isGroupBooking: isGroup,
                    groupSize: isGroup ? Number(values.groupSize) : undefined,
                    roomCount,
                    generalCode: values.appliedCode,
                    overrideTotal: values.overrideTotal ? Number(values.overrideTotal) : undefined,
                    isOverrideInclusive: values.isOverrideInclusive,
                });
                setPriceDetails(price);
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

        // Remove propertyId (unless needed for group allocation) and other non-DTO fields
        const { propertyId, paymentOption, appliedCode, ...rest } = data;

        const sanitizedData = {
            ...rest,
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
                    ? (data.paymentOption === 'FULL'
                        ? (data.overrideTotal || priceDetails?.totalAmount)
                        : (data.paidAmount || 0))
                    : undefined),
            paymentOption: data.isHistoricalEntry ? 'FULL' : paymentOption,
        };
        createBookingMutation.mutate(sanitizedData as CreateBookingDto);
    };

    if (loadingRoomTypes) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/bookings')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create New Booking</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
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
                        {/* Booking Details */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" /> Booking Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                                setAvailability(null);
                                            }}
                                            required
                                        />
                                        {errors.roomTypeId && <p className="text-red-500 text-xs mt-1">{errors.roomTypeId.message}</p>}
                                    </div>
                                )}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check-in Date</label>
                                    <input type="date" {...register('checkInDate')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                                    {errors.checkInDate && <p className="text-red-500 text-xs mt-1">{errors.checkInDate.message}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Check-out Date</label>
                                    <input type="date" {...register('checkOutDate')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                                    {errors.checkOutDate && <p className="text-red-500 text-xs mt-1">{errors.checkOutDate.message}</p>}
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Guests & Capacity</label>
                                        <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setValue('isGroupBooking', false);
                                                }}
                                                className={clsx('px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all', !isGroupMode ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                                            >
                                                Standard
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setValue('isGroupBooking', true);
                                                    setValue('groupSize', getValues('adultsCount') + getValues('childrenCount'));
                                                }}
                                                className={clsx('px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all', isGroupMode ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700')}
                                            >
                                                Group
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Adults (13+)</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    {...register('adultsCount', {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            if (isGroupMode) setValue('groupSize', (parseInt(e.target.value) || 1) + watch('childrenCount'));
                                                        }
                                                    })}
                                                    className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-10 font-bold"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Children (6-12)</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    {...register('childrenCount', {
                                                        valueAsNumber: true,
                                                        onChange: (e) => {
                                                            if (isGroupMode) setValue('groupSize', watch('adultsCount') + (parseInt(e.target.value) || 0));
                                                        }
                                                    })}
                                                    className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-10 font-bold"
                                                />
                                            </div>
                                        </div>
                                        {isGroupMode && (
                                            <div className="flex items-center justify-between py-2 px-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800 animate-in fade-in zoom-in-95">
                                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Group Stay Package Active</span>
                                                <span className="text-[10px] font-bold text-gray-500">Total: {watch('adultsCount') + watch('childrenCount')} Members</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Promo or Referral Code (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            {...register('appliedCode')}
                                            placeholder="GUEST10 or CP... (10 chars)"
                                            className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-10 uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckAvailability}
                                            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-500"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2">
                                    <hr className="my-2 border-gray-100 dark:border-gray-700" />
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Final Step: Check Availability & Total Price</label>
                                    <button type="button" onClick={handleCheckAvailability} disabled={checkingAvailability}
                                        className="w-full bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 px-4 py-3 rounded-md text-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md">
                                        {checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Check Availability'}
                                    </button>

                                    {availability && (
                                        <div className="space-y-4 mt-4">
                                            <div className={clsx('p-4 rounded-md border flex items-center gap-3 shadow-sm',
                                                availability.available ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300')}>
                                                {availability.available ? <CheckCircle className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
                                                <div className="flex-1">
                                                    <p className="font-bold text-base leading-tight">{availability.available ? 'Available' : 'Unavailable'}</p>
                                                    <p className="text-sm">{availability.available
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

                                            {!isGroupMode && availability.available && availability.roomList && availability.roomList.length > 0 && (
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in slide-in-from-top-2 mt-4">
                                                    <label className="block text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-3 tracking-widest">Select One or More Rooms</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {availability.roomList.map((room) => (
                                                            <button
                                                                key={room.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = watch('selectedRoomIds') || [];
                                                                    const next = current.includes(room.id)
                                                                        ? current.filter(id => id !== room.id)
                                                                        : [...current, room.id];
                                                                    setValue('selectedRoomIds', next);
                                                                    // Re-calculate price with new room count
                                                                    if (availability.available) handleCheckAvailability();
                                                                }}
                                                                className={clsx(
                                                                    "px-3 py-2 rounded-md border text-sm font-bold transition-all flex items-center gap-2",
                                                                    (watch('selectedRoomIds') || []).includes(room.id)
                                                                        ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none"
                                                                        : "bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:border-blue-400"
                                                                )}
                                                            >
                                                                <span className={clsx("h-2 w-2 rounded-full", (watch('selectedRoomIds') || []).includes(room.id) ? "bg-white" : "bg-blue-400")}></span>
                                                                Room {room.roomNumber || room.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[10px] text-blue-500 mt-3 italic font-medium">Select multiple rooms to scale the total price and block them all.</p>
                                                    {(watch('selectedRoomIds') || []).length > 0 && (
                                                        <div className="mt-3 pt-3 border-t border-blue-100 dark:border-blue-800/50 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-blue-800 dark:text-blue-300">{(watch('selectedRoomIds') || []).length} Rooms Selected</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => { setValue('selectedRoomIds', []); handleCheckAvailability(); }}
                                                                className="text-[10px] font-black uppercase text-red-500 hover:text-red-600"
                                                            >
                                                                Clear All
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {isGroupMode && availability.available && availability.allocationPreview && (
                                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg animate-in fade-in slide-in-from-top-2">
                                                    <h4 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 mb-3 tracking-widest">Suggested Allocation Preview</h4>
                                                    <div className="space-y-2">
                                                        {availability.allocationPreview.map((room, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-sm py-1 border-b border-blue-100 dark:border-blue-800 last:border-0">
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-gray-900 dark:text-white">Room {room.name}</span>
                                                                    <span className="text-[10px] text-gray-500">{room.roomType}</span>
                                                                </div>
                                                                <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Cap: {room.capacity}</span>
                                                            </div>
                                                        ))}
                                                        <div className="pt-2 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">Total Capacity</span>
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
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-blue-600" /> Booking Source
                            </h2>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source</label>
                                <select {...register('bookingSourceId')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm">
                                    <option value="">Direct / None</option>
                                    {bookingSources?.map((source) => (
                                        <option key={source.id} value={source.id}>{source.name} {source.commission && `(${source.commission}% Commission)`}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Guest Details */}
                        {availability?.available && (
                            <>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-semibold flex items-center gap-2">
                                            <Users className="h-5 w-5 text-blue-600" /> Guest Details
                                        </h2>
                                        <button type="button" onClick={() => append({ firstName: '', lastName: '' })} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Guest</button>
                                    </div>
                                    {errors.guests?.message && (
                                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg animate-bounce">
                                            <p className="text-red-600 dark:text-red-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                                <AlertCircle className="h-4 w-4" /> {errors.guests.message}
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        {fields.map((field, index) => (
                                            <div key={field.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg relative group">
                                                {fields.length > 1 && (
                                                    <button type="button" onClick={() => remove(index)} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-sm opacity-0 group-hover:opacity-100 transition-opacity">Remove</button>
                                                )}
                                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Guest {index + 1} {index === 0 && '(Primary)'}</h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <input {...register(`guests.${index}.firstName`)} placeholder="First Name" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm" />
                                                        {errors.guests?.[index]?.firstName && <p className="text-red-500 text-xs mt-1">{errors.guests[index]?.firstName?.message}</p>}
                                                    </div>
                                                    <div>
                                                        <input {...register(`guests.${index}.lastName`)} placeholder="Last Name" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm" />
                                                        {errors.guests?.[index]?.lastName && <p className="text-red-500 text-xs mt-1">{errors.guests[index]?.lastName?.message}</p>}
                                                    </div>
                                                    <input {...register(`guests.${index}.email`)} type="email" placeholder="Email (Optional)" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm" />
                                                    <input {...register(`guests.${index}.phone`)} placeholder="Phone (Optional)" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm" />
                                                    <div className="relative">
                                                        <select {...register(`guests.${index}.idType`)} className={clsx("w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm", errors.guests?.[index]?.idType && "border-red-500 ring-1 ring-red-500")}>
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
                                                        <div className="md:col-span-2 space-y-4 animate-in fade-in slide-in-from-top-2">
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">ID Number</label>
                                                                <input
                                                                    {...register(`guests.${index}.idNumber`)}
                                                                    placeholder="Enter ID number"
                                                                    className={clsx("w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm", errors.guests?.[index]?.idNumber && "border-red-500 ring-1 ring-red-500")}
                                                                />
                                                                {errors.guests?.[index]?.idNumber && <p className="text-red-500 text-[10px] mt-1 font-bold">{errors.guests[index].idNumber?.message}</p>}
                                                            </div>

                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Upload Guest ID Photo</label>
                                                                <div className="flex items-center gap-4">
                                                                    <input
                                                                        type="file"
                                                                        accept="image/*"
                                                                        onChange={(e) => handleGuestFileUpload(index, e)}
                                                                        className="hidden"
                                                                        id={`guest-id-upload-${index}`}
                                                                    />
                                                                    <label
                                                                        htmlFor={`guest-id-upload-${index}`}
                                                                        className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2 shadow-sm"
                                                                    >
                                                                        {idUploading[index] ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                                                                        {watch(`guests.${index}.idImage`) ? 'Change ID Image' : 'Upload ID Image'}
                                                                    </label>
                                                                    {watch(`guests.${index}.idImage`) && (
                                                                        <div className="flex items-center gap-4 animate-in fade-in zoom-in-95">
                                                                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 text-[10px] font-black uppercase tracking-wider">
                                                                                <ShieldCheck className="h-3.5 w-3.5" /> ID Uploaded
                                                                            </div>
                                                                            <div className="flex items-center gap-3">
                                                                                <a
                                                                                    href={watch(`guests.${index}.idImage`)}
                                                                                    target="_blank"
                                                                                    rel="noreferrer"
                                                                                    className="h-30 w-50 rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden hover:opacity-80 transition-opacity group/img relative"
                                                                                >
                                                                                    <img
                                                                                        src={watch(`guests.${index}.idImage`)}
                                                                                        alt="Guest ID"
                                                                                        className="w-full h-full object-cover"
                                                                                    />
                                                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                                                        <Eye className="h-4 w-4 text-white" />
                                                                                    </div>
                                                                                </a>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <p className="text-[10px] text-gray-400 italic mt-1.5">Accepted formats: JPG, PNG. Max 5MB.</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Price Override & Payments - Moved here for better workflow */}
                                <div className="mt-8 bg-green-50/50 dark:bg-green-900/10 p-6 rounded-lg shadow-sm border border-green-200 dark:border-green-800/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-700 dark:text-green-400">
                                        <CheckCircle className="h-5 w-5" /> Manage Payment for this Booking
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment Option / Status</label>
                                            <select {...register('paymentOption')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-12 font-bold focus:ring-green-500 border-2 transition-all">
                                                <option value="FULL">Collect Full Payment Now</option>
                                                <option value="PARTIAL">Collect Partial / Deposit</option>
                                            </select>
                                        </div>
                                        {watch('paymentOption') === 'PARTIAL' && (
                                            <div className="animate-in zoom-in-95 duration-200">
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Initial Deposit Amount (₹)</label>
                                                <input
                                                    type="number"
                                                    {...register('paidAmount', { valueAsNumber: true })}
                                                    className="w-full border-blue-200 dark:border-blue-900 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-12 font-black text-lg focus:ring-blue-500 border-2 transition-all"
                                                    placeholder="0.00"
                                                    required={watch('paymentOption') === 'PARTIAL'}
                                                />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Payment Method</label>
                                            <select {...register('paymentMethod')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-12 font-bold focus:ring-green-500 border-2 transition-all">
                                                <option value="CASH">Cash Payment</option>
                                                <option value="UPI">UPI / QR Code</option>
                                                <option value="CARD">Debit / Credit Card</option>
                                                <option value="WALLET">Channel Partner Wallet</option>
                                                <option value="ONLINE">Send Payment Link (Email/SMS)</option>
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 dark:border-gray-800 pt-6">
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">Override Price (Optional)</label>
                                                    <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-md">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setValue('isOverrideInclusive', true);
                                                                if (watch('overrideTotal')) handleCheckAvailability();
                                                            }}
                                                            className={clsx('px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all', watch('isOverrideInclusive') ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500')}
                                                        >
                                                            Inc. GST
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setValue('isOverrideInclusive', false);
                                                                if (watch('overrideTotal')) handleCheckAvailability();
                                                            }}
                                                            className={clsx('px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-all', !watch('isOverrideInclusive') ? 'bg-white dark:bg-gray-600 text-blue-600 shadow-sm' : 'text-gray-500')}
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
                                                    className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-10 transition-all font-bold"
                                                    placeholder={watch('isOverrideInclusive') ? "Final Total amount" : "Base amount (add GST)"}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Reason for Override</label>
                                                <input type="text" {...register('overrideReason')} className="w-full border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-10 transition-all" placeholder="Why the custom price?" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={!availability?.available || createBookingMutation.isPending}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium shadow-sm transition-all">
                                {createBookingMutation.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>) : 'Confirm Booking'}
                            </button>
                        </div>

                        {/* Historical Entry Option */}
                        {watch('isManualBooking') && (
                            <div className="mt-6 flex flex-col gap-3 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('isHistoricalEntry')}
                                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                                            Backdate this booking (Historical Entry)
                                        </span>
                                        {watchedCheckInDate && new Date(watchedCheckInDate) < new Date(new Date().setHours(0, 0, 0, 0)) && (
                                            <span className="text-[10px] text-orange-600 font-bold uppercase">Required for past dates</span>
                                        )}
                                    </div>
                                </label>
                                {errors.isHistoricalEntry && <p className="text-red-500 text-xs mt-1 font-bold">{errors.isHistoricalEntry.message}</p>}
                                {watch('isHistoricalEntry') && (
                                    <div className="pl-6 animate-in slide-in-from-top-2 space-y-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 mb-1">Original Transaction Date</label>
                                            <input
                                                type="date"
                                                {...register('transactionDate')}
                                                className="border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm h-10 w-full md:w-64"
                                            />
                                            {errors.transactionDate && <p className="text-red-500 text-xs mt-1">{errors.transactionDate.message}</p>}
                                        </div>

                                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg">
                                            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase mb-1 flex items-center gap-1">
                                                <ShieldCheck className="h-3 w-3" /> Historical Verification Rules
                                            </p>
                                            <ul className="text-[10px] text-gray-500 list-disc pl-4 space-y-1">
                                                <li>Guest ID details are **mandatory** (Type & Number)</li>
                                                <li>System will record **Full Payment** automatically</li>
                                                <li>Booking status will be set to **Checked Out**</li>
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </div>

                {/* Price Summary Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 sticky top-6">
                        <h2 className="text-lg font-semibold mb-4">₹ Price Summary</h2>
                        {!priceDetails ? (
                            <p className="text-gray-500 dark:text-gray-400 text-sm italic">Select dates and room type, then check availability to see pricing.</p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600 dark:text-gray-400">
                                        {watch('isGroupBooking') ? (
                                            <>
                                                Group of {watch('groupSize') || 0} Guests
                                                {availability?.roomList && ` (${availability.roomList.length} Rooms)`}
                                            </>
                                        ) : (
                                            (watch('selectedRoomIds') || []).length > 1 ? `${(watch('selectedRoomIds') || []).length} Rooms` : '1 Room'
                                        )} x {priceDetails.numberOfNights} Nights
                                    </span>
                                    <span className="font-medium">₹{priceDetails.baseAmount.toFixed(2)}</span>
                                </div>
                                {priceDetails.extraAdultAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Extra Adult Charges</span>
                                        <span className="font-medium">₹{priceDetails.extraAdultAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {priceDetails.extraChildAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">Extra Child Charges</span>
                                        <span className="font-medium">₹{priceDetails.extraChildAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {priceDetails.offerDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Offer Discount</span><span>-₹{priceDetails.offerDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {priceDetails.couponDiscountAmount > 0 && priceDetails.appliedCodeType === 'COUPON' && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Coupon Discount</span><span>-₹{priceDetails.couponDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {priceDetails.referralDiscountAmount > 0 && priceDetails.appliedCodeType === 'REFERRAL' && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Referral Discount</span><span>-₹{priceDetails.referralDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-3">
                                    <span className="text-gray-600 dark:text-gray-400">Taxes</span>
                                    <span className="font-medium">₹{priceDetails.taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                                    <span className="font-bold text-lg">Effective Total</span>
                                    <div className="text-right">
                                        <span className={clsx(
                                            "font-bold text-2xl block",
                                            watch('overrideTotal') ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"
                                        )}>
                                            ₹{(watch('overrideTotal') || priceDetails.totalAmount).toFixed(2)}
                                        </span>
                                        {watch('overrideTotal') && (
                                            <span className="text-[10px] text-gray-400 line-through">Original: ₹{priceDetails.totalAmount.toFixed(2)}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
