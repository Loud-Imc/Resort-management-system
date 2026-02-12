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
import { usersService } from '../../services/users';
import { Loader2, Calendar, Users, DollarSign, CheckCircle, AlertCircle, ArrowLeft, Briefcase } from 'lucide-react';
import clsx from 'clsx';
import type { PriceCalculationResult } from '../../types/booking';
import type { RoomType } from '../../types/room';
import type { User } from '../../types/user';

// Schema for form validation
const bookingSchema = z.object({
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    roomTypeId: z.string().min(1, 'Room type is required'),
    adultsCount: z.number().min(1, 'At least 1 adult is required'),
    childrenCount: z.number().min(0, 'Children count cannot be negative'),
    couponCode: z.string().optional(),
    bookingSourceId: z.string().optional(),
    agentId: z.string().optional(),
    roomId: z.string().optional(),
    isManualBooking: z.boolean().optional(),
    guests: z.array(z.object({
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        phone: z.string().optional(),
        age: z.number().optional(),
    })).min(1, 'At least 1 guest is required'),
});

type BookingFormData = z.infer<typeof bookingSchema>;

export default function CreateBooking() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [availability, setAvailability] = useState<{ available: boolean; availableRooms: number } | null>(null);
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    const preSelectedRoomId = searchParams.get('roomId');
    const preSelectedRoomTypeId = searchParams.get('roomTypeId');

    // Fetch Room Types
    const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes'],
        queryFn: () => roomTypesService.getAll(),
    });

    // Fetch Booking Sources
    const { data: bookingSources } = useQuery<any[]>({
        queryKey: ['bookingSources'],
        queryFn: () => bookingSourcesService.getAll(),
    });

    // Fetch Users for Agent selection
    const { data: users } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: () => usersService.getAll(),
    });

    // Filter users who have 'Agent' role (assuming logic or just listing all for now and user filters)
    // Ideally backend should provide a filter for this, or we filter on frontend if roles are populated
    const agents = (users as User[] | undefined)?.filter(u => u.roles?.some((r: any) => r.role.name === 'Agent' || r.role.name === 'Manager')) || [];

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        getValues,
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            checkInDate: format(new Date(), 'yyyy-MM-dd'),
            checkOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            adultsCount: 1,
            childrenCount: 0,
            roomTypeId: preSelectedRoomTypeId || '',
            roomId: preSelectedRoomId || undefined,
            isManualBooking: true,
            guests: [{ firstName: '', lastName: '' }],
        },
    });

    // Auto-check availability if pre-selected
    useEffect(() => {
        if (preSelectedRoomId && preSelectedRoomTypeId) {
            handleCheckAvailability();
        }
    }, [preSelectedRoomId, preSelectedRoomTypeId]);

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'guests',
    });

    const handleCheckAvailability = async () => {
        const values = getValues();
        if (!values.checkInDate || !values.checkOutDate || !values.roomTypeId) return;

        setCheckingAvailability(true);
        setAvailability(null);
        setPriceDetails(null);

        try {
            // 1. Check Availability
            const avail = await bookingsService.checkAvailability({
                roomTypeId: values.roomTypeId,
                checkInDate: values.checkInDate,
                checkOutDate: values.checkOutDate,
            });
            setAvailability(avail);

            if (avail.available) {
                // 2. Calculate Price only if available
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
            console.error('Failed to create booking:', error);
            toast.error(error.response?.data?.message || 'Failed to create booking');
        },
    });

    const onSubmit = (data: BookingFormData) => {
        if (!availability?.available) {
            toast.error('Please check availability first');
            return;
        }

        // Sanitize relational IDs
        const sanitizedData = {
            ...data,
            bookingSourceId: data.bookingSourceId || undefined,
            agentId: data.agentId || undefined,
            roomId: data.roomId || undefined,
        };

        createBookingMutation.mutate(sanitizedData);
    };

    if (loadingRoomTypes) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/bookings')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Create New Booking</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        {/* Booking Details Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary-600" />
                                Booking Details
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                                    <select
                                        {...register('roomTypeId')}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Select Room Type</option>
                                        {roomTypes?.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name} - ${type.basePrice}/night
                                            </option>
                                        ))}
                                    </select>
                                    {errors.roomTypeId && <p className="text-red-500 text-xs mt-1">{errors.roomTypeId.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Checking Availability</label>
                                    <button
                                        type="button"
                                        onClick={handleCheckAvailability}
                                        disabled={checkingAvailability}
                                        className="w-full bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        {checkingAvailability ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Check Availability & Price'}
                                    </button>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                                    <input
                                        type="date"
                                        {...register('checkInDate')}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    {errors.checkInDate && <p className="text-red-500 text-xs mt-1">{errors.checkInDate.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                                    <input
                                        type="date"
                                        {...register('checkOutDate')}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    {errors.checkOutDate && <p className="text-red-500 text-xs mt-1">{errors.checkOutDate.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register('adultsCount', { valueAsNumber: true })}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    {errors.adultsCount && <p className="text-red-500 text-xs mt-1">{errors.adultsCount.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('childrenCount', { valueAsNumber: true })}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                    {errors.childrenCount && <p className="text-red-500 text-xs mt-1">{errors.childrenCount.message}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code (Optional)</label>
                                    <input
                                        type="text"
                                        {...register('couponCode')}
                                        placeholder="e.g., SUMMER20"
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Source & Agent Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Briefcase className="h-5 w-5 text-primary-600" />
                                Booking Source & Agent
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Booking Source</label>
                                    <select
                                        {...register('bookingSourceId')}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">Direct / None</option>
                                        {bookingSources?.map((source) => (
                                            <option key={source.id} value={source.id}>
                                                {source.name} {source.commission && `(${source.commission}% Commission)`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Agent (Optional)</label>
                                    <select
                                        {...register('agentId')}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    >
                                        <option value="">No Agent</option>
                                        {agents?.map((agent) => (
                                            <option key={agent.id} value={agent.id}>
                                                {agent.firstName} {agent.lastName}
                                            </option>
                                        ))}
                                    </select>
                                    {agents.length === 0 && (
                                        <p className="text-xs text-gray-500 mt-1">No users with 'Agent' role found.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Availability Result Alert */}
                        {availability && (
                            <div
                                className={clsx(
                                    'p-4 rounded-md border flex items-center gap-3',
                                    availability.available
                                        ? 'bg-green-50 border-green-200 text-green-700'
                                        : 'bg-red-50 border-red-200 text-red-700'
                                )}
                            >
                                {availability.available ? (
                                    <CheckCircle className="h-5 w-5" />
                                ) : (
                                    <AlertCircle className="h-5 w-5" />
                                )}
                                <div>
                                    <p className="font-medium">
                                        {availability.available ? 'Room is Available!' : 'Room Unavailable'}
                                    </p>
                                    <p className="text-sm">
                                        {availability.available
                                            ? `${availability.availableRooms} rooms left for these dates.`
                                            : 'Please choose different dates or room type.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Guest Details Section */}
                        {availability?.available && (
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold flex items-center gap-2">
                                        <Users className="h-5 w-5 text-primary-600" />
                                        Guest Details
                                    </h2>
                                    <button
                                        type="button"
                                        onClick={() => append({ firstName: '', lastName: '' })}
                                        className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                                    >
                                        + Add Guest
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {fields.map((field, index) => (
                                        <div key={field.id} className="p-4 bg-gray-50 rounded-lg relative group">
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {fields.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => remove(index)}
                                                        className="text-red-500 hover:text-red-700 text-sm"
                                                    >
                                                        Remove
                                                    </button>
                                                )}
                                            </div>
                                            <h3 className="text-sm font-medium text-gray-500 mb-2">Guest {index + 1} {index === 0 && '(Primary)'}</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <input
                                                        {...register(`guests.${index}.firstName`)}
                                                        placeholder="First Name"
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                                    />
                                                    {errors.guests?.[index]?.firstName && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.guests[index]?.firstName?.message}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <input
                                                        {...register(`guests.${index}.lastName`)}
                                                        placeholder="Last Name"
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                                    />
                                                    {errors.guests?.[index]?.lastName && (
                                                        <p className="text-red-500 text-xs mt-1">{errors.guests[index]?.lastName?.message}</p>
                                                    )}
                                                </div>
                                                <div>
                                                    <input
                                                        {...register(`guests.${index}.email`)}
                                                        type="email"
                                                        placeholder="Email (Optional)"
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <input
                                                        {...register(`guests.${index}.phone`)}
                                                        placeholder="Phone (Optional)"
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={!availability?.available || createBookingMutation.isPending}
                                className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-lg font-medium shadow-sm transition-all"
                            >
                                {createBookingMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    'Confirm Booking'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Right Column: Price Summary Sticky Sidebar */}
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 sticky top-6">
                        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                            <DollarSign className="h-5 w-5 text-gray-700" />
                            Price Summary
                        </h2>

                        {!priceDetails ? (
                            <p className="text-gray-500 text-sm italic">
                                Select dates and room type, then check availability to see pricing.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-600">
                                        {priceDetails.numberOfNights} Nights x ₹{priceDetails.pricePerNight}
                                    </span>
                                    <span className="font-medium">₹{priceDetails.baseAmount.toFixed(2)}</span>
                                </div>

                                {priceDetails.extraAdultAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Extra Adult Charges</span>
                                        <span className="font-medium">₹{priceDetails.extraAdultAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {priceDetails.extraChildAmount > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Extra Child Charges</span>
                                        <span className="font-medium">₹{priceDetails.extraChildAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                {priceDetails.offerDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600">
                                        <span>Offer Discount</span>
                                        <span>-₹{priceDetails.offerDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}
                                {priceDetails.couponDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Coupon Discount</span>
                                        <span>-₹{priceDetails.couponDiscountAmount.toFixed(2)}</span>
                                    </div>
                                )}

                                <div className="flex justify-between text-sm border-b border-gray-100 pb-3">
                                    <span className="text-gray-600">Taxes</span>
                                    <span className="font-medium">₹{priceDetails.taxAmount.toFixed(2)}</span>
                                </div>

                                <div className="flex justify-between items-center pt-2">
                                    <span className="font-bold text-lg">Total</span>
                                    <span className="font-bold text-2xl text-primary-600">
                                        ₹{priceDetails.totalAmount.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
