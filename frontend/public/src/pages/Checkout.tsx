import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, ShieldCheck, CreditCard, User as UserIcon, LogIn } from 'lucide-react';
import { differenceInDays, format, addDays } from 'date-fns';
import { bookingService } from '../services/booking';
import { paymentService } from '../services/payment';
import { useQuery } from '@tanstack/react-query';

// Extend window object for Razorpay
declare global {
    interface Window {
        Razorpay: any;
    }
}

const userSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().min(10, 'Valid phone number is required'),
    whatsappNumber: z.string().optional(),
    specialRequests: z.string().optional(),
    idType: z.string().optional(),
    idNumber: z.string().optional(),
});

type FormData = z.infer<typeof userSchema>;

export default function Checkout() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
    const [appliedReferralCode, setAppliedReferralCode] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [token, setToken] = useState<string | null>(null);


    // Load Razorpay Script
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    // Check auth status and pre-fill
    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');
        if (storedUser && storedToken) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
            setToken(storedToken);

            // Pre-fill form
            setValue('firstName', userData.firstName || '');
            setValue('lastName', userData.lastName || '');
            setValue('email', userData.email || '');
            setValue('phone', userData.phone || '');
            setValue('whatsappNumber', userData.whatsappNumber || '');
        }
    }, []);

    // Get booking details from URL
    const roomId = searchParams.get('roomId');

    const checkIn = useState(() => searchParams.get('checkIn') || format(new Date(), 'yyyy-MM-dd'))[0];
    const checkOut = useState(() => searchParams.get('checkOut') || format(addDays(new Date(), 1), 'yyyy-MM-dd'))[0];

    const adults = Number(searchParams.get('adults')) || 2;
    const children = Number(searchParams.get('children')) || 0;

    const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(userSchema),
    });

    // Fetch room details directly by ID for the summary
    const { data: selectedRoom } = useQuery<any>({
        queryKey: ['room-details', roomId],
        queryFn: () => bookingService.getRoomType(roomId!),
        enabled: !!roomId,
    });

    // Fetch NON-COUPON pricing (Permanent baseline)
    const { data: basePricing } = useQuery<any>({
        queryKey: ['base-pricing', roomId, checkIn, checkOut, adults, children],
        queryFn: () => bookingService.calculatePrice({
            roomTypeId: roomId!,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adultsCount: adults,
            childrenCount: children,
        }),
        enabled: !!roomId,
    });

    // Fetch COUPON-SPECIFIC pricing (Volatile)
    const { data: couponPricing, isLoading: couponPricingLoading, error: pricingError, isError: isPricingError } = useQuery<any, any>({
        queryKey: ['pricing', roomId, checkIn, checkOut, adults, children, appliedCoupon, appliedReferralCode],
        queryFn: () => bookingService.calculatePrice({
            roomTypeId: roomId!,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adultsCount: Number(adults),
            childrenCount: Number(children),
            couponCode: appliedCoupon || undefined,
            referralCode: appliedReferralCode || undefined,
        }),
        enabled: !!roomId && (!!appliedCoupon || !!appliedReferralCode),
        retry: false,
    });

    // Derive effective pricing to display
    const effectivePricing = (appliedCoupon || appliedReferralCode) && couponPricing && !isPricingError ? couponPricing : basePricing;
    const pricingLoading = couponPricingLoading;

    // Const Selected Room is now fetched directly
    const nights = effectivePricing?.numberOfNights || differenceInDays(new Date(checkOut), new Date(checkIn)) || 1;

    const handleApplyCoupon = (e?: React.FormEvent | React.MouseEvent | React.KeyboardEvent) => {
        if (e) e.preventDefault();
        const code = couponCode.trim().toUpperCase();
        if (!code) return;

        if (code.startsWith('CP-')) {
            setAppliedReferralCode(code);
            setAppliedCoupon(null);
        } else {
            setAppliedCoupon(code);
            setAppliedReferralCode(null);
        }
    };


    const onSubmit = async (userData: FormData) => {
        if (!selectedRoom) return;

        setIsProcessing(true);
        try {
            // 1. Create the booking (Status: PENDING_PAYMENT)
            const bookingData = {
                roomTypeId: selectedRoom.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adultsCount: adults,
                childrenCount: children,
                guestName: `${userData.firstName} ${userData.lastName}`,
                guestEmail: userData.email,
                guestPhone: userData.phone,
                whatsappNumber: userData.whatsappNumber,
                specialRequests: userData.specialRequests,
                couponCode: appliedCoupon || undefined,
                referralCode: appliedReferralCode || undefined,
                guests: [{
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    phone: userData.phone,
                    whatsappNumber: userData.whatsappNumber || undefined,
                    idType: userData.idType || undefined,
                    idNumber: userData.idNumber || undefined
                }]
            };

            const booking = token
                ? await bookingService.createAuthenticatedBooking(bookingData)
                : await bookingService.createBooking(bookingData);

            // 2. Initiate Payment (Create Razorpay Order)
            const paymentInfo = await paymentService.initiatePayment({ bookingId: booking.id });

            // 3. Open Razorpay Checkout
            const options = {
                key: paymentInfo.keyId,
                amount: paymentInfo.amount,
                currency: paymentInfo.currency,
                name: 'Route Guide',
                description: `Room Booking - ${booking.bookingNumber}`,
                order_id: paymentInfo.orderId,
                handler: async function (response: any) {
                    try {
                        setIsProcessing(true);
                        // 4. Verify Payment on Backend
                        await paymentService.verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });

                        // 5. Navigate to confirmation
                        navigate('/confirmation', {
                            state: {
                                booking: { ...booking, status: 'CONFIRMED' },
                                email: userData.email
                            }
                        });
                    } catch (error) {
                        console.error('Payment verification failed', error);
                        alert('Payment verification failed. Please contact support.');
                    } finally {
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name: `${userData.firstName} ${userData.lastName}`,
                    email: userData.email,
                    contact: userData.phone
                },
                theme: {
                    color: '#0f172a' // primary-900 color
                },
                modal: {
                    ondismiss: function () {
                        setIsProcessing(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();

        } catch (error: any) {
            console.error('Booking/Payment initiation failed', error);

            // Check for specific backend errors (e.g., availability conflict)
            const errorMessage = error.response?.data?.message;

            if (error.response?.status === 400 && errorMessage === 'No rooms available for the selected dates') {
                alert('This room was just selected by another guest who is finishing their checkout. Please try again in 5-10 minutes if it becomes available, or choose another room type.');
            } else if (errorMessage) {
                alert(`Booking failed: ${errorMessage}`);
            } else {
                alert('Something went wrong with the booking. Please try again or contact support.');
            }

            setIsProcessing(false);
        }
    };

    if (!roomId) {
        return <Navigate to="/search" replace />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-8"
            >
                <ArrowLeft className="h-4 w-4" /> Back to Rooms
            </button>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                        <h2 className="text-2xl font-bold font-serif">Guest Details</h2>

                        {!user && (
                            <div className="bg-primary-50 px-4 py-2 rounded-lg border border-primary-100 flex items-center gap-3">
                                <UserIcon className="h-5 w-5 text-primary-600" />
                                <div className="text-sm">
                                    <span className="text-gray-600">Already have an account? </span>
                                    <Link
                                        to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`}
                                        className="text-primary-700 font-bold hover:underline inline-flex items-center gap-1"
                                    >
                                        Log in for a faster experience <LogIn className="h-3.5 w-3.5" />
                                    </Link>
                                </div>
                            </div>
                        )}

                        {user && (
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                <ShieldCheck className="h-4 w-4" />
                                Logged in as {user.firstName}
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">First Name</label>
                                <input
                                    {...register('firstName')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="John"
                                />
                                {errors.firstName && <span className="text-xs text-red-500">{errors.firstName.message}</span>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Last Name</label>
                                <input
                                    {...register('lastName')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Doe"
                                />
                                {errors.lastName && <span className="text-xs text-red-500">{errors.lastName.message}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Email Address</label>
                                <input
                                    {...register('email')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="john@example.com"
                                />
                                {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">Phone Number</label>
                                <input
                                    {...register('phone')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="+91 9876543210"
                                />
                                {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">WhatsApp Number (Optional)</label>
                                <input
                                    {...register('whatsappNumber')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="+91 9876543210"
                                />
                                {errors.whatsappNumber && <span className="text-xs text-red-500">{errors.whatsappNumber.message}</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">ID Type (Optional)</label>
                                <select
                                    {...register('idType')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                >
                                    <option value="">Select ID Type</option>
                                    <option value="AADHAR">Aadhar Card</option>
                                    <option value="PASSPORT">Passport</option>
                                    <option value="VOTER_ID">Voter ID</option>
                                    <option value="DRIVING_LICENSE">Driving License</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700">ID Number (Optional)</label>
                                <input
                                    {...register('idNumber')}
                                    className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="Enter your ID number"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Special Requests (Optional)</label>
                            <textarea
                                {...register('specialRequests')}
                                rows={3}
                                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                placeholder="Dietary restrictions, quiet room, etc."
                            />
                        </div>

                        <div className="border-t border-gray-100 pt-6 space-y-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary-600" />
                                Payment & Offers
                            </h3>

                            {/* Applied Offers / Coupon Section (Div instead of Form to avoid nesting) */}
                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5">
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Apply Coupon or Partner Code</label>
                                        {(appliedCoupon || appliedReferralCode) && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setAppliedCoupon(null);
                                                    setAppliedReferralCode(null);
                                                    setCouponCode('');
                                                }}
                                                className="text-[10px] text-red-500 font-bold hover:underline"
                                            >
                                                REMOVE
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={couponCode}
                                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleApplyCoupon();
                                                }
                                            }}
                                            placeholder="GUEST10 or CP-XXXXXX"
                                            className="flex-1 p-3 text-sm bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleApplyCoupon()}
                                            disabled={pricingLoading}
                                            className="px-6 py-3 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors disabled:opacity-50"
                                        >
                                            {pricingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
                                        </button>
                                    </div>

                                    {(appliedCoupon || appliedReferralCode) && !pricingLoading && !isPricingError && (
                                        <p className="text-xs text-green-600 font-medium flex items-center gap-1.5 mt-1">
                                            <ShieldCheck className="h-3.5 w-3.5" />
                                            {appliedReferralCode ? `Referral code "${appliedReferralCode}" applied!` : `Coupon "${appliedCoupon}" applied!`}
                                        </p>
                                    )}

                                    {isPricingError && (appliedCoupon || appliedReferralCode) && (
                                        <p className="text-xs text-red-500 font-medium italic mt-1">
                                            {pricingError?.response?.data?.message || 'Invalid code'}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                                <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm text-blue-800 font-medium">Secure Razorpay Checkout</p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        You will be redirected to Razorpay to complete your payment securely.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-primary-600 text-white font-bold py-3.5 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 className="animate-spin h-5 w-5" /> Processing...
                                </>
                            ) : (
                                `Reserve & Pay ₹${effectivePricing?.totalAmount?.toLocaleString('en-IN') || '...'}`
                            )}
                        </button>
                    </form>
                </div>

                <div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
                        <h3 className="text-lg font-semibold mb-6">Booking Summary</h3>

                        {selectedRoom ? (
                            <div className="space-y-4">
                                <div className="aspect-video rounded-lg overflow-hidden">
                                    <img src={selectedRoom.images[0]} alt={selectedRoom.name} className="w-full h-full object-cover" />
                                </div>

                                <div>
                                    <h4 className="font-bold text-gray-900">{selectedRoom.name}</h4>
                                    <p className="text-sm text-gray-500">{nights} Nights, {adults} Guests</p>
                                </div>

                                <div className="border-t border-dashed border-gray-200 my-4"></div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Check In</span>
                                        <span className="font-medium">{format(new Date(checkIn), 'MMM d, yyyy')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Check Out</span>
                                        <span className="font-medium">{format(new Date(checkOut), 'MMM d, yyyy')}</span>
                                    </div>
                                </div>

                                <div className="border-t border-dashed border-gray-200 my-4"></div>

                                {/* Coupon form removed from here and moved to main area */}

                                <div className="border-t border-gray-100 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Base Room Charges</span>
                                        <span>₹{effectivePricing?.baseAmount?.toLocaleString('en-IN') || '0'}</span>
                                    </div>
                                    {(effectivePricing?.extraAdultAmount || 0) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Extra Adult Charges</span>
                                            <span>₹{effectivePricing.extraAdultAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {(effectivePricing?.extraChildAmount || 0) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Extra Child Charges</span>
                                            <span>₹{effectivePricing.extraChildAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    {effectivePricing?.offerDiscountAmount > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-medium">
                                            <span>Offer Discount</span>
                                            <span>-₹{effectivePricing.offerDiscountAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Taxes & Fees ({Math.round((effectivePricing?.taxRate || 0.18) * 100)}%)</span>
                                        <span>₹{effectivePricing?.taxAmount?.toLocaleString('en-IN') || '0'}</span>
                                    </div>

                                    {appliedCoupon && !isPricingError && (effectivePricing?.couponDiscountAmount || 0) > 0 && (
                                        <div className="flex justify-between text-sm text-primary-600 font-bold border-t border-dashed border-gray-100 pt-2">
                                            <span>Coupon Discount ({appliedCoupon})</span>
                                            <span>-₹{effectivePricing.couponDiscountAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    {appliedReferralCode && !isPricingError && (effectivePricing?.referralDiscountAmount || 0) > 0 && (
                                        <div className="flex justify-between text-sm text-green-600 font-bold border-t border-dashed border-gray-100 pt-2">
                                            <span>Referral Discount ({appliedReferralCode})</span>
                                            <span>-₹{effectivePricing.referralDiscountAmount.toLocaleString('en-IN')}</span>
                                        </div>
                                    )}

                                    <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                                        <span className="text-lg font-bold text-gray-900">Total</span>
                                        <span className="text-2xl font-black text-primary-600">₹{effectivePricing?.totalAmount?.toLocaleString('en-IN') || '0'}</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-primary-600" />
                            </div>
                        )}
                    </div>
                </div>
            </div >
        </div >
    );
}
