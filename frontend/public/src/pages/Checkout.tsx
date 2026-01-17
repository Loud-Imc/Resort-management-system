import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, ShieldCheck, CreditCard } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
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
    specialRequests: z.string().optional(),
});

type FormData = z.infer<typeof userSchema>;

export default function Checkout() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(false);

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

    // Get booking details from URL
    const roomId = searchParams.get('roomId');
    const checkIn = searchParams.get('checkIn') || new Date().toISOString();
    const checkOut = searchParams.get('checkOut') || new Date().toISOString();
    const adults = Number(searchParams.get('adults')) || 2;
    const children = Number(searchParams.get('children')) || 0;

    const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(userSchema),
    });

    // Fetch room details just to display price/name (could be optimized with global state)
    const { data: availability } = useQuery<{ availableRoomTypes: any[] }>({
        queryKey: ['room-details', roomId],
        queryFn: () => bookingService.checkAvailability({
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults: adults,
            children: children
        }),
        enabled: !!roomId,
    });

    const selectedRoom = availability?.availableRoomTypes?.find((r: any) => r.id === roomId);
    const nights = differenceInDays(new Date(checkOut), new Date(checkIn));
    const totalAmount = selectedRoom ? Number(selectedRoom.basePrice) * nights : 0;
    const taxes = totalAmount * 0.18;
    const grandTotal = totalAmount + taxes;

    const onSubmit = async (userData: FormData) => {
        if (!selectedRoom) return;

        setIsProcessing(true);
        try {
            // 1. Create the booking (Status: PENDING_PAYMENT)
            const booking = await bookingService.createBooking({
                roomTypeId: selectedRoom.id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adultsCount: adults,
                childrenCount: children,
                guestName: `${userData.firstName} ${userData.lastName}`,
                guestEmail: userData.email,
                guestPhone: userData.phone,
                specialRequests: userData.specialRequests
            });

            // 2. Initiate Payment (Create Razorpay Order)
            const paymentInfo = await paymentService.initiatePayment(booking.id);

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
                            razorpaySignature: response.razorpay_signature,
                            bookingId: booking.id
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

        } catch (error) {
            console.error('Booking/Payment initiation failed', error);
            alert('Something went wrong. Please try again.');
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
                    <h2 className="text-2xl font-bold font-serif mb-6">Guest Details</h2>
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

                        <div className="border-t border-gray-100 pt-6">
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                <CreditCard className="h-5 w-5 text-primary-600" />
                                Payment Method
                            </h3>
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
                                `Reserve & Pay ₹${grandTotal.toLocaleString('en-IN')}`
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

                                <div className="border-t border-gray-100 pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Room Charges</span>
                                        <span>₹{totalAmount.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Taxes & Fees (18%)</span>
                                        <span>₹{taxes.toLocaleString('en-IN')}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold text-primary-900 pt-2 border-t border-gray-100 mt-2">
                                        <span>Total</span>
                                        <span>₹{grandTotal.toLocaleString('en-IN')}</span>
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
            </div>
        </div>
    );
}
