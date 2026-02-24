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
import { Loader2, Calendar, Users, CheckCircle, AlertCircle, ArrowLeft, Briefcase, Building2 } from 'lucide-react';
import clsx from 'clsx';
import type { PriceCalculationResult } from '../../types/booking';
import type { RoomType } from '../../types/room';
import type { User } from '../../types/user';

import { useProperty } from '../../context/PropertyContext';

// Schema for form validation
const bookingSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    roomTypeId: z.string().min(1, 'Room type is required'),
    adultsCount: z.number().min(1, 'At least 1 adult is required'),
    childrenCount: z.number().min(0, 'Children count cannot be negative'),
    couponCode: z.string().optional(),
    referralCode: z.string().optional(),
    bookingSourceId: z.string().optional(),
    agentId: z.string().optional(),
    roomId: z.string().optional(),
    isManualBooking: z.boolean().optional(),
    overrideTotal: z.number().optional(),
    overrideReason: z.string().optional(),
    paymentMethod: z.enum(['CASH', 'UPI', 'ONLINE']),
    paymentOption: z.enum(['FULL', 'PARTIAL']),
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
    const { selectedProperty, properties } = useProperty();
    const [availability, setAvailability] = useState<{ available: boolean; availableRooms: number } | null>(null);
    const [priceDetails, setPriceDetails] = useState<PriceCalculationResult | null>(null);
    const [checkingAvailability, setCheckingAvailability] = useState(false);

    const preSelectedRoomId = searchParams.get('roomId');
    const preSelectedRoomTypeId = searchParams.get('roomTypeId');

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        getValues,
        setValue,
        watch,
    } = useForm<BookingFormData>({
        resolver: zodResolver(bookingSchema),
        defaultValues: {
            propertyId: selectedProperty?.id || '',
            checkInDate: format(new Date(), 'yyyy-MM-dd'),
            checkOutDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
            adultsCount: 1,
            childrenCount: 0,
            roomTypeId: preSelectedRoomTypeId || '',
            roomId: preSelectedRoomId || undefined,
            isManualBooking: true,
            overrideTotal: undefined,
            overrideReason: '',
            paymentMethod: 'CASH',
            paymentOption: 'FULL',
            couponCode: '',
            referralCode: '',
            guests: [{ firstName: '', lastName: '' }],
        },
    });

    const currentPropertyId = watch('propertyId');

    // Fetch Room Types for the selected property
    const { data: roomTypes, isLoading: loadingRoomTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', currentPropertyId],
        queryFn: () => roomTypesService.getAll({ propertyId: currentPropertyId }),
        enabled: Boolean(currentPropertyId),
    });

    // Reset roomTypeId if property changes
    useEffect(() => {
        if (currentPropertyId && currentPropertyId !== selectedProperty?.id && !preSelectedRoomTypeId) {
            setValue('roomTypeId', '');
            setAvailability(null);
            setPriceDetails(null);
        }
    }, [currentPropertyId, selectedProperty, setValue, preSelectedRoomTypeId]);

    // Sync from context
    useEffect(() => {
        if (selectedProperty?.id) {
            setValue('propertyId', selectedProperty.id);
        }
    }, [selectedProperty, setValue]);

    // Fetch Booking Sources (can be global or filtered if we add propertyId later, for now global is fine as per schema)
    const { data: bookingSources } = useQuery<any[]>({
        queryKey: ['bookingSources'],
        queryFn: () => bookingSourcesService.getAll(),
    });

    // Fetch Users for Agent selection
    const { data: users } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: () => usersService.getAll(),
    });

    const agents = (users as User[] | undefined)?.filter(u => u.roles?.some((r: any) => r.role.name === 'Agent' || r.role.name === 'Manager')) || [];

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
                    referralCode: values.referralCode,
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

        // Remove propertyId and other non-DTO fields
        const { propertyId, paymentOption, ...rest } = data;

        // Sanitize relational IDs
        const sanitizedData = {
            ...rest,
            paymentOption,
            bookingSourceId: data.bookingSourceId || undefined,
            agentId: data.agentId || undefined,
            roomId: data.roomId || undefined,
            overrideTotal: data.overrideTotal ? Number(data.overrideTotal) : undefined,
            paymentMethod: data.isManualBooking ? data.paymentMethod : 'ONLINE',
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

                        {/* Property Selection - Only shown if not selected in context */}
                        {!selectedProperty && (
                            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 border-l-4 border-blue-500">
                                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-blue-600" />
                                    Property Selection
                                </h2>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Property *</label>
                                    <select
                                        {...register('propertyId')}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                    >
                                        <option value="">-- Choose Resort/Hotel --</option>
                                        {properties.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    {errors.propertyId && <p className="text-red-500 text-xs mt-1">{errors.propertyId.message}</p>}
                                </div>
                            </div>
                        )}

                        {/* Booking Details Section */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary-600" />
                                Booking Details
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                                    <select
                                        {...register('roomTypeId')}
                                        disabled={!currentPropertyId || loadingRoomTypes}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                    >
                                        <option value="">
                                            {!currentPropertyId ? 'Select Property first' : (loadingRoomTypes ? 'Loading types...' : 'Select Room Type')}
                                        </option>
                                        {roomTypes?.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name} - ₹{type.basePrice}/night
                                            </option>
                                        ))}
                                    </select>
                                    {errors.roomTypeId && <p className="text-red-500 text-xs mt-1">{errors.roomTypeId.message}</p>}
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
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            {...register('couponCode')}
                                            placeholder="e.g. SAVE10"
                                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 h-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckAvailability}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 border border-gray-300"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CP Referral Code (Optional)</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            {...register('referralCode')}
                                            placeholder="e.g. PARTNER20"
                                            className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 h-10 px-3 border uppercase"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleCheckAvailability}
                                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 border border-gray-300"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <hr className="my-2 border-gray-100" />
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Final Step: Check Availability & Total Price</label>
                                    <button
                                        type="button"
                                        onClick={handleCheckAvailability}
                                        disabled={checkingAvailability || !currentPropertyId}
                                        className="w-full bg-primary-600 text-white hover:bg-primary-700 px-4 py-3 rounded-md text-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
                                    >
                                        {checkingAvailability ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Calculate Total Amount'}
                                    </button>

                                    {availability && (
                                        <div
                                            className={clsx(
                                                'mt-4 p-4 rounded-md border flex items-center gap-3 shadow-sm',
                                                availability.available
                                                    ? 'bg-green-50 border-green-200 text-green-700'
                                                    : 'bg-red-50 border-red-200 text-red-700'
                                            )}
                                        >
                                            {availability.available ? (
                                                <CheckCircle className="h-6 w-6" />
                                            ) : (
                                                <AlertCircle className="h-6 w-6" />
                                            )}
                                            <div className="flex-1">
                                                <p className="font-bold text-base leading-tight">
                                                    {availability.available ? 'Room Available' : 'Room Unavailable'}
                                                </p>
                                                <p className="text-sm">
                                                    {availability.available
                                                        ? `${availability.availableRooms} rooms left for these dates.`
                                                        : 'Please choose different dates or room type.'}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Price Override & Payments */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-5 w-5" /> Price Override & Payment
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Override Total Price (₹)</label>
                                    <input type="number" {...register('overrideTotal', { valueAsNumber: true })} className="w-full border-gray-300 rounded-md shadow-sm h-10 px-3 border" placeholder="Optional" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Override</label>
                                    <input type="text" {...register('overrideReason')} className="w-full border-gray-300 rounded-md shadow-sm h-10 px-3 border" placeholder="e.g. Birthday Discount" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                                    <select {...register('paymentMethod')} className="w-full border-gray-300 rounded-md shadow-sm h-10 px-3 border">
                                        <option value="CASH">Cash</option>
                                        <option value="UPI">UPI / QR</option>
                                        <option value="ONLINE">Online Link</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Option</label>
                                    <select {...register('paymentOption')} className="w-full border-gray-300 rounded-md shadow-sm h-10 px-3 border">
                                        <option value="FULL">Fully Paid</option>
                                        <option value="PARTIAL">Partially Paid</option>
                                    </select>
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
                                                <div>
                                                    <select
                                                        {...register(`guests.${index}.idType`)}
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                                    >
                                                        <option value="">-- ID Type --</option>
                                                        <option value="AADHAR">Aadhar Card</option>
                                                        <option value="PASSPORT">Passport</option>
                                                        <option value="VOTER_ID">Voter ID</option>
                                                        <option value="DRIVING_LICENSE">Driving License</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <input
                                                        {...register(`guests.${index}.idNumber`)}
                                                        placeholder="ID Number (Optional)"
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
                            ₹ Price Summary
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
                                {priceDetails.referralDiscountAmount ? priceDetails.referralDiscountAmount > 0 && (
                                    <div className="flex justify-between text-sm text-green-600 font-medium">
                                        <span>Referral Discount</span>
                                        <span>-₹{priceDetails.referralDiscountAmount.toFixed(2)}</span>
                                    </div>
                                ) : null}

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
            </div >
        </div >
    );
}
