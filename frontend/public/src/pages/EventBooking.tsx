import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Calendar, MapPin, User, Mail, Phone,
    CreditCard, ArrowLeft, Loader2, CheckCircle,
    Ticket, Printer, Download, Info
} from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { useRef } from 'react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import eventsService, { Event } from '../services/events';
import eventBookingsService, { EventBooking as EventBookingType } from '../services/eventBookings';
import { paymentService } from '../services/payment';

declare global {
    interface Window {
        Razorpay: any;
    }
}

export default function EventBookingFlow() {
    const { id: eventId } = useParams();
    // const navigate = useNavigate();

    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Confirmation
    const [booking, setBooking] = useState<EventBookingType | null>(null);
    const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);

    const [formData, setFormData] = useState({
        guestName: '',
        guestEmail: '',
        guestPhone: '',
    });

    const ticketRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            // Redirect to login or show simplified login
            // For now, let's assume they are logged in or handled by a guard
        }

        if (eventId) {
            loadEvent(eventId);
        }
    }, [eventId]);

    const loadEvent = async (id: string) => {
        try {
            setLoading(true);
            const data = await eventsService.getById(id);
            setEvent(data);
        } catch (err) {
            console.error('Failed to load event', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = () => {
        if (step === 1) {
            setStep(2);
        }
    };

    const handleConfirmBooking = async () => {
        if (!event) return;

        try {
            setSubmitting(true);
            // 1. Create PENDING booking
            const result = await eventBookingsService.create({
                eventId: event.id,
                ...formData
            });
            setBooking(result);

            // 2. Initiate Payment
            const paymentInfo = await paymentService.initiatePayment({
                eventBookingId: result.id
            });

            // 3. Open Razorpay Modal
            const options = {
                key: paymentInfo.keyId,
                amount: paymentInfo.amount,
                currency: paymentInfo.currency,
                name: 'Route Guide',
                description: `Event Ticket - ${event.title}`,
                order_id: paymentInfo.orderId,
                handler: async function (response: any) {
                    try {
                        setIsPaymentProcessing(true);
                        // 4. Verify Payment on Backend
                        await paymentService.verifyPayment({
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature
                        });

                        // 5. Update local state to confirmation
                        setBooking(prev => prev ? { ...prev, status: 'PAID' } : null);
                        setStep(3);
                    } catch (error) {
                        console.error('Payment verification failed', error);
                        alert('Payment verification failed. Please contact support.');
                    } finally {
                        setIsPaymentProcessing(false);
                    }
                },
                prefill: {
                    name: formData.guestName,
                    email: formData.guestEmail,
                    contact: formData.guestPhone
                },
                theme: {
                    color: '#0f172a'
                },
                modal: {
                    ondismiss: function () {
                        setSubmitting(false);
                    }
                }
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (err) {
            console.error('Booking failed', err);
            alert('Failed to process booking. Please try again.');
            setSubmitting(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = async () => {
        if (!ticketRef.current) return;
        try {
            const dataUrl = await toPng(ticketRef.current, { backgroundColor: '#f9fafb', quality: 1.0 });
            const link = document.createElement('a');
            link.download = `ticket-${booking?.ticketId}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Failed to download ticket', err);
            alert('Failed to download ticket. Please try printing to PDF instead.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-4">Event Not Found</h2>
                    <Link to="/" className="text-primary-600 hover:underline">Back to Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Navbar />

            <main className="flex-grow pt-28 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* Stepper */}
                    {step < 3 && (
                        <div className="mb-12">
                            <div className="flex items-center justify-between max-w-xs mx-auto mb-4">
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                                <div className={`flex-grow h-1 mx-4 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                            </div>
                            <div className="flex items-center justify-between max-w-xs mx-auto text-xs font-bold uppercase tracking-wider text-gray-400 px-2">
                                <span className={step >= 1 ? 'text-primary-700' : ''}>Information</span>
                                <span className={step >= 2 ? 'text-primary-700' : ''}>Payment</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Content */}
                        <div className="lg:col-span-2">
                            {step === 1 && (
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-8">Guest Details</h2>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
                                                <input
                                                    type="text"
                                                    value={formData.guestName}
                                                    onChange={(e) => setFormData({ ...formData, guestName: e.target.value })}
                                                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                                    placeholder="Enter your full name"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                                                <div className="relative">
                                                    <Mail className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
                                                    <input
                                                        type="email"
                                                        value={formData.guestEmail}
                                                        onChange={(e) => setFormData({ ...formData, guestEmail: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="john@example.com"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                                                <div className="relative">
                                                    <Phone className="absolute left-4 top-3 h-5 w-5 text-gray-400" />
                                                    <input
                                                        type="tel"
                                                        value={formData.guestPhone}
                                                        onChange={(e) => setFormData({ ...formData, guestPhone: e.target.value })}
                                                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                                        placeholder="+91 XXXXX XXXXX"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleNext}
                                            disabled={!formData.guestName || !formData.guestEmail}
                                            className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                                        >
                                            Continue to Payment
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                    <div className="flex items-center gap-4 mb-8">
                                        <button onClick={() => setStep(1)} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-all">
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                        <h2 className="text-2xl font-bold text-gray-900">Secure Payment</h2>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-6 bg-primary-50 border border-primary-100 rounded-2xl">
                                            <div className="flex items-center gap-3 text-primary-800 font-bold mb-2">
                                                <CreditCard className="h-5 w-5" />
                                                Razorpay Secure Payment
                                            </div>
                                            <p className="text-primary-700 text-sm opacity-80">
                                                Your payment is processed securely by Razorpay. We don't store your credit card details.
                                            </p>
                                        </div>

                                        <div className="border border-gray-200 rounded-2xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-gray-600 font-medium">Standard Admission</span>
                                                <span className="font-bold">{event.price || 'Free'}</span>
                                            </div>
                                            <div className="border-t border-gray-100 pt-4 flex items-center justify-between">
                                                <span className="text-xl font-bold text-gray-900">Total Amount</span>
                                                <span className="text-2xl font-bold text-primary-700">{event.price || '0.00'}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleConfirmBooking}
                                            disabled={submitting || isPaymentProcessing}
                                            className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 flex items-center justify-center gap-3"
                                        >
                                            {submitting || isPaymentProcessing ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <><CheckCircle className="h-5 w-5" /> Pay & Confirm Booking</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {step === 3 && booking && (
                                <div className="bg-white rounded-3xl p-1 shadow-xl border border-gray-100 overflow-hidden text-center animate-in zoom-in-95 duration-500">
                                    <div className="bg-green-500 p-12 text-white">
                                        <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-sm">
                                            <CheckCircle className="h-10 w-10 text-white" />
                                        </div>
                                        <h2 className="text-3xl font-bold mb-2">Booking Confirmed!</h2>
                                        <p className="text-green-50/80 font-medium">Your ticket is ready for download.</p>
                                    </div>

                                    <div className="p-10 space-y-8">
                                        {/* Ticket Stub UI */}
                                        <div ref={ticketRef} className="border-2 border-dashed border-gray-200 rounded-3xl p-8 relative bg-gray-50 max-w-md mx-auto print:m-0 print:border-none print:shadow-none">
                                            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-inner print:hidden" />
                                            <div className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-inner print:hidden" />

                                            <div className="flex justify-between items-start mb-6">
                                                <div className="text-left">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Pass ID</div>
                                                    <div className="text-sm font-mono font-bold text-gray-700">{booking.ticketId}</div>
                                                </div>
                                                <Ticket className="h-8 w-8 text-primary-200" />
                                            </div>

                                            {event.images && event.images.length > 0 && (
                                                <div className="w-full h-32 rounded-2xl overflow-hidden mb-6 shadow-sm border border-gray-100">
                                                    <img
                                                        src={event.images[0]}
                                                        alt={event.title}
                                                        className="w-full h-full object-cover"
                                                        crossOrigin="anonymous"
                                                    />
                                                </div>
                                            )}

                                            <div className="text-center mb-8">
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">{event.title}</h3>
                                                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(event.date).toLocaleDateString(undefined, { weekday: 'short', month: 'long', day: 'numeric' })}
                                                </div>
                                            </div>

                                            {/* Real QR Code */}
                                            <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-gray-100 mb-8">
                                                <QRCodeCanvas
                                                    value={booking.ticketId}
                                                    size={128}
                                                    level="H"
                                                    includeMargin={true}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-left border-t border-gray-200 pt-6">
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Guest</div>
                                                    <div className="text-xs font-bold text-gray-700">{booking.guestName || 'Valued Guest'}</div>
                                                </div>
                                                <div>
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Admission</div>
                                                    <div className="text-xs font-bold text-gray-700">{booking.amountPaid > 0 ? `Paid ₹${booking.amountPaid}` : 'Free Access'}</div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-center gap-4 print:hidden">
                                            <button
                                                onClick={handleDownload}
                                                className="flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-black transition-all"
                                            >
                                                <Download className="h-4 w-4" /> Download Ticket
                                            </button>
                                            <button
                                                onClick={handlePrint}
                                                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                                            >
                                                <Printer className="h-4 w-4" /> Print
                                            </button>
                                        </div>

                                        <div className="pt-6 border-t border-gray-100">
                                            <Link to="/" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
                                                Browse more experiences
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Event Card Summary (Visible in Sidebar steps 1 & 2) */}
                        {step < 3 && (
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 sticky top-28">
                                    <div className="h-40 rounded-2xl overflow-hidden mb-6 bg-gray-100">
                                        <img
                                            src={event.images?.[0] || '/placeholder-event.jpg'}
                                            alt={event.title}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900 mb-4">{event.title}</h3>

                                    <div className="space-y-4 mb-8">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <Calendar className="h-5 w-5 text-primary-600" />
                                            <span className="text-sm font-medium">{new Date(event.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <MapPin className="h-5 w-5 text-primary-600" />
                                            <span className="text-sm font-medium">{event.location}</span>
                                        </div>
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <Info className="h-5 w-5 text-primary-600" />
                                            <span className="text-sm font-medium uppercase tracking-tight">{event.organizerType === 'PROPERTY' ? 'Official Event' : 'Partner Event'}</span>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-100">
                                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 text-center">Price per person</div>
                                        <div className="text-3xl font-bold text-center text-primary-900">{event.price || 'Free'}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
