import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/booking';
import { paymentService } from '../services/payment';
import { useCurrency } from '../context/CurrencyContext';
import { formatPrice } from '../utils/currency';
import { Loader2, ShieldCheck, CreditCard, AlertCircle, ArrowRight, Zap, CheckCircle2, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PayOnline() {
    const { bookingId } = useParams<{ bookingId: string }>();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { selectedCurrency, rates } = useCurrency();
    const [isProcessing, setIsProcessing] = useState(false);
    const isIncentive = searchParams.get('incentive') === 'true';

    const { data: booking, isLoading, error } = useQuery({
        queryKey: ['public-booking', bookingId],
        queryFn: () => bookingService.getBookingById(bookingId!),
        enabled: !!bookingId,
    });

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

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-12 w-12 text-primary-600 animate-spin" />
                    <p className="text-gray-500 font-bold animate-pulse">Fetching your booking details...</p>
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-red-100 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Booking Not Found</h2>
                    <p className="text-gray-500 mb-8 font-medium">We couldn't retrieve the details for this booking. Please check the link or contact support.</p>
                    <button 
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all"
                    >
                        Go to Homepage
                    </button>
                </div>
            </div>
        );
    }

    // Check if already paid
    if (booking.paymentStatus === 'FULL') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-xl border border-green-100 text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">Already Paid!</h2>
                    <p className="text-gray-500 mb-8 font-medium">This booking is already fully paid. You're all set for your stay!</p>
                    <button 
                        onClick={() => navigate(`/track-booking`)}
                        className="w-full py-4 bg-primary-600 text-white rounded-2xl font-bold hover:bg-primary-700 transition-all"
                    >
                        View Booking Details
                    </button>
                </div>
            </div>
        );
    }

    const discountPct = 5; // Should ideally fetch from settings, but 5 is default
    const originalAmount = Number(booking.totalAmount);
    const discountAmount = isIncentive ? Math.round(originalAmount * (discountPct / 100)) : 0;
    const finalAmount = originalAmount - discountAmount;

    const handlePayment = async () => {
        setIsProcessing(true);
        try {
            // Initiate Payment
            const paymentInfo = await paymentService.initiatePayment({ 
                bookingId: booking.id,
                incentive: isIncentive
            });

            const options = {
                key: paymentInfo.keyId,
                amount: paymentInfo.amount,
                currency: paymentInfo.currency,
                name: 'Route Guide',
                description: `Complete Payment - ${booking.bookingNumber}`,
                order_id: paymentInfo.orderId,
                handler: async function (response: any) {
                    try {
                        setIsProcessing(true);
                        await paymentService.verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });

                        toast.success('Payment successful!');
                        navigate(`/confirmation?bookingId=${booking.id}`, {
                            state: {
                                booking: { ...booking, status: 'CONFIRMED', paymentStatus: 'FULL' },
                                email: booking.guestEmail
                            }
                        });
                    } catch (error) {
                        console.error('Payment verification failed', error);
                        toast.error('Payment verification failed. Please contact support.');
                    } finally {
                        setIsProcessing(false);
                    }
                },
                prefill: {
                    name: booking.guestName,
                    email: booking.guestEmail,
                    contact: booking.guestPhone
                },
                theme: {
                    color: '#0f172a'
                },
                modal: {
                    ondismiss: function () {
                        setIsProcessing(false);
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error: any) {
            console.error('Payment failed', error);
            toast.error('Failed to initiate payment. Please try again.');
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-32 pb-20 px-4">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden border border-slate-100">
                    {/* Header with Background */}
                    <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                                    <Zap className="h-6 w-6 text-primary-400 fill-primary-400" />
                                </div>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-primary-400">Exclusive Offer</span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight leading-tight">
                                Save <span className="text-primary-400">{formatPrice(discountAmount, selectedCurrency, rates)}</span> Instantly!
                            </h1>
                            <p className="text-slate-400 font-medium max-w-lg leading-relaxed">
                                Complete your payment online now and unlock a special <span className="text-white font-bold">{discountPct}% discount</span>. Avoid the queue and enjoy a faster check-in experience.
                            </p>
                        </div>
                    </div>

                    <div className="p-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Booking Summary */}
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Reservation Details</h3>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 border border-slate-100">
                                            <img src={booking.property?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'} alt={booking.property?.name} className="w-full h-full object-cover" />
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-900 leading-tight">{booking.property?.name}</p>
                                            <p className="text-sm text-slate-500 font-medium">{booking.roomType?.name}</p>
                                            <p className="text-xs font-bold text-slate-400 mt-1"># {booking.bookingNumber}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Check-In</p>
                                        <p className="font-bold text-slate-900">{new Date(booking.checkInDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Guests</p>
                                        <p className="font-bold text-slate-900">{booking.adultsCount} Adults, {booking.childrenCount} Kids</p>
                                    </div>
                                </div>

                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide">Instant Confirmation</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide">Secure SSL Encryption</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-600">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                        <span className="text-xs font-bold uppercase tracking-wide">Express Mobile Check-In</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price Breakdown & Action */}
                            <div className="flex flex-col h-full">
                                <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex-1">
                                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6">Payment Summary</h3>
                                    
                                    <div className="space-y-4 mb-8">
                                        <div className="flex justify-between items-center text-slate-500 font-medium">
                                            <span>Original Amount</span>
                                            <span className="text-slate-900">{formatPrice(originalAmount, selectedCurrency, rates)}</span>
                                        </div>
                                        {isIncentive && (
                                            <div className="flex justify-between items-center text-emerald-600 font-bold">
                                                <div className="flex items-center gap-1.5">
                                                    <span>Online Discount</span>
                                                    <span className="bg-emerald-100 text-[10px] px-1.5 py-0.5 rounded-full">-{discountPct}%</span>
                                                </div>
                                                <span>-{formatPrice(discountAmount, selectedCurrency, rates)}</span>
                                            </div>
                                        )}
                                        <div className="pt-6 border-t border-slate-200 flex justify-between items-end">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Amount Payable</span>
                                                <span className="text-xs font-medium text-slate-400 italic">Taxes Included</span>
                                            </div>
                                            <span className="text-3xl font-black text-slate-900">{formatPrice(finalAmount, selectedCurrency, rates)}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handlePayment}
                                        disabled={isProcessing}
                                        className="w-full py-5 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-[0.15em] text-sm shadow-xl shadow-primary-600/30 hover:bg-primary-700 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3 group"
                                    >
                                        {isProcessing ? (
                                            <Loader2 className="h-5 w-5 animate-spin" />
                                        ) : (
                                            <>
                                                Pay Online Now <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>

                                <div className="mt-6 flex items-start gap-3 px-4">
                                    <ShieldCheck className="h-5 w-5 text-slate-400 mt-0.5" />
                                    <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                                        Payments are processed via Razorpay. Your card details are never stored on our servers. 
                                        By clicking, you agree to our Terms of Service.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* FAQ or Why Pay Online Section */}
                <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 mb-4">
                            <Info className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Why Pay Online?</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Guaranteed lower price and prioritized check-in during peak hours.</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 mb-4">
                            <ShieldCheck className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Safe & Secure</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Industry standard 256-bit encryption for all transactions.</p>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 flex flex-col items-center text-center">
                        <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 mb-4">
                            <CreditCard className="h-6 w-6" />
                        </div>
                        <h4 className="font-bold text-slate-900 mb-2">Multiple Options</h4>
                        <p className="text-[10px] text-slate-500 font-medium">Pay via UPI, Credit/Debit cards, Netbanking or Wallets.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
