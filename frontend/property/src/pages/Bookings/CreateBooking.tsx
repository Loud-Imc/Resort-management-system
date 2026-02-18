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
import { Loader2, Calendar, Users, CheckCircle, AlertCircle, ArrowLeft, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import type { PriceCalculationResult } from '../../types/booking';
import type { RoomType } from '../../types/room';
import { useProperty } from '../../context/PropertyContext';

const bookingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    roomTypeId: z.string().min(1, 'Room type is required'),
    adultsCount: z.number().min(1, 'At least 1 adult is required'),
    childrenCount: z.number().min(0),
    couponCode: z.string().optional(),
    bookingSourceId: z.string().optional(),
    roomId: z.string().optional(),
    isManualBooking: z.boolean().optional(),
    guests: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        phone: z.string().optional(),
        age: z.number().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
    })).min(1, 'At least 1 guest is required'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function CreateBooking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { selectedProperty } = useProperty();
    const [availability, setAvailability] = useState<{ available: boolean; availableRooms: number } | null>(null);
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    const preSelectedRoomId = searchParams.get('roomId');
    const preSelectedRoomTypeId = searchParams.get('roomTypeId');

    const {
        register, control, handleSubmit,
        formState: { errors }, getValues, setValue, watch,
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
            guests: [{ firstName: '', lastName: '' }],
        },
    });

    // Auto-set property
    useEffect(() => {
        if (selectedProperty?.id) setValue('propertyId', selectedProperty.id);
    }, [selectedProperty, setValue]);

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

    const handleCheckAvailability = async () => {
        const values = getValues();
        if (!values.checkInDate || !values.checkOutDate || !values.roomTypeId) return;
        setCheckingAvailability(true);
        setAvailability(null);
        setPriceDetails(null);
        try {
            const avail = await bookingsService.checkAvailability({
                roomTypeId: values.roomTypeId,
                checkInDate: values.checkInDate,
                checkOutDate: values.checkOutDate,
            });
            setAvailability(avail);
            if (avail.available) {
                const price = await bookingsService.calculatePrice({
                    roomTypeId: values.roomTypeId,
                    checkInDate: values.checkInDate,
                    checkOutDate: values.checkOutDate,
                    adultsCount: Number(values.adultsCount),
                    childrenCount: Number(values.childrenCount),
                    couponCode: values.couponCode,
                });
                setPriceDetails(price);
            }
        } catch (error) {
            console.error('Error checking availability:', error);
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
        const sanitizedData = {
            ...data,
            bookingSourceId: data.bookingSourceId || undefined,
            roomId: data.roomId || undefined,
        };
        createBookingMutation.mutate(sanitizedData);
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
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Booking Details */}
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-600" /> Booking Details
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Room Type</label>
                                    <select {...register('roomTypeId')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500">
                                        <option value="">Select Room Type</option>
                                        {roomTypes?.map((type) => (
                                            <option key={type.id} value={type.id}>{type.name} - ₹{type.basePrice}/night</option>
                                        ))}
                                    </select>
                                    {errors.roomTypeId && <p className="text-red-500 text-xs mt-1">{errors.roomTypeId.message}</p>}
                                </div>
                                <div className="md:col-span-2 mt-2">
                                    <button type="button" onClick={handleCheckAvailability} disabled={checkingAvailability}
                                        className="w-full bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                                        {checkingAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Availability & Price'}
                                    </button>
                                </div>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Adults</label>
                                    <input type="number" min="1" {...register('adultsCount', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Children</label>
                                    <input type="number" min="0" {...register('childrenCount', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Coupon Code (Optional)</label>
                                    <input type="text" {...register('couponCode')} placeholder="e.g., SUMMER20" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
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

                        {/* Availability Result */}
                        {availability && (
                            <div className={clsx('p-4 rounded-md border flex items-center gap-3',
                                availability.available ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300')}>
                                {availability.available ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                                <div>
                                    <p className="font-medium">{availability.available ? 'Room is Available!' : 'Room Unavailable'}</p>
                                    <p className="text-sm">{availability.available
                                        ? `${availability.availableRooms} rooms left for these dates.`
                                        : 'Please choose different dates or room type.'}</p>
                                </div>
                            </div>
                        )}

                        {/* Guest Details */}
                        {availability?.available && (
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-blue-600" /> Guest Details
                                    </h2>
                                    <button type="button" onClick={() => append({ firstName: '', lastName: '' })} className="text-sm text-blue-600 hover:text-blue-700 font-medium">+ Add Guest</button>
                                </div>
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
                                                <select {...register(`guests.${index}.idType`)} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm">
                                                    <option value="">-- ID Type --</option>
                                                    <option value="AADHAR">Aadhar Card</option>
                                                    <option value="PASSPORT">Passport</option>
                                                    <option value="VOTER_ID">Voter ID</option>
                                                    <option value="DRIVING_LICENSE">Driving License</option>
                                                    <option value="OTHER">Other</option>
                                                </select>
                                                <input {...register(`guests.${index}.idNumber`)} placeholder="ID Number (Optional)" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button type="submit" disabled={!availability?.available || createBookingMutation.isPending}
                                className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium shadow-sm transition-all">
                                {createBookingMutation.isPending ? (<><Loader2 className="h-5 w-5 animate-spin" /> Processing...</>) : 'Confirm Booking'}
                            </button>
                        </div>
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
                                    <span className="text-gray-600 dark:text-gray-400">{priceDetails.numberOfNights} Nights x ₹{priceDetails.pricePerNight}</span>
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
                                {priceDetails.couponDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Coupon Discount</span><span>-₹{priceDetails.couponDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-3">
                                    <span className="text-gray-600 dark:text-gray-400">Taxes</span>
                                    <span className="font-medium">₹{priceDetails.taxAmount.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-lg">Total</span>
                                    <span className="font-bold text-2xl text-blue-600">₹{priceDetails.totalAmount.toFixed(2)}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
