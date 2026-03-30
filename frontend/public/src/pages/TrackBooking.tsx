import { useState } from 'react';
import { Search, Hash, Mail, Calendar, MapPin, Loader2, ArrowRight, ShieldCheck, CheckCircle2, Clock, CreditCard, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { toast } from 'react-hot-toast';
import api from '../services/api';
import { useCurrency } from '../context/CurrencyContext';
import { formatPrice } from '../utils/currency';

interface BookingDetails {
    id: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    adultsCount: number;
    childrenCount: number;
    status: string;
    totalAmount: number;
    bookingCurrency: string;
    paymentStatus: string;
    property: {
        name: string;
        address: string;
        city: string;
        images: string[];
    };
    roomType: {
        name: string;
    };
    guests: any[];
    payments: any[];
}

export default function TrackBooking() {
    const [bookingNumber, setBookingNumber] = useState('');
    const [emailOrPhone, setEmailOrPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [booking, setBooking] = useState<BookingDetails | null>(null);
    const { selectedCurrency, rates } = useCurrency();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setBooking(null);

        try {
            const normalizedBookingNumber = bookingNumber.trim().replace(/^#/, '');
            const response = await api.post('/bookings/track', {
                bookingNumber: normalizedBookingNumber,
                emailOrPhone: emailOrPhone.trim()
            });
            setBooking(response.data);
            toast.success('Booking retrieved successfully!');
        } catch (error: any) {
            console.error('Tracking error:', error);
            const message = error.response?.data?.message || 'Could not find booking. Please check your credentials.';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING_PAYMENT': return 'bg-orange-100 text-orange-700 border-orange-200';
            case 'CHECKED_IN': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 pt-32 pb-20">
            <div className="container mx-auto px-4 max-w-4xl">
                {/* Header Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-4">
                        Track Your <span className="text-primary-600">Booking</span>
                    </h1>
                    <p className="text-gray-500 font-medium max-w-lg mx-auto">
                        Enter your booking details below to view your reservation status, check-in information, and booking summary.
                    </p>
                </div>

                {/* Search Form */}
                <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 md:p-10 border border-gray-100 mb-12">
                    <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <Hash className="h-4 w-4 text-primary-500" />
                                Booking Number
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. BK-123456"
                                value={bookingNumber}
                                onChange={(e) => setBookingNumber(e.target.value)}
                                required
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center gap-2">
                                <Mail className="h-4 w-4 text-primary-500" />
                                Email or Phone
                            </label>
                            <input
                                type="text"
                                placeholder="john@example.com or +91..."
                                value={emailOrPhone}
                                onChange={(e) => setEmailOrPhone(e.target.value)}
                                required
                                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all font-medium"
                            />
                        </div>
                        <div className="md:col-span-2 pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-5 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-black rounded-2xl shadow-xl shadow-primary-500/30 transition-all transform hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-3 uppercase tracking-[0.1em] text-sm disabled:opacity-70"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Searching Reservation...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-5 w-5" />
                                        Retrieve Booking Details
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Booking Result */}
                {booking && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                        {/* Status Bar */}
                        <div className={clsx(
                            "rounded-2xl border px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm",
                            getStatusColor(booking.status)
                        )}>
                            <div className="flex items-center gap-3 font-black text-lg uppercase tracking-wider">
                                <ShieldCheck className="h-6 w-6" />
                                {booking.status.replace('_', ' ')}
                            </div>
                            <div className="flex items-center gap-3 text-sm font-bold">
                                <span>Reference: {booking.bookingNumber}</span>
                                <span className="w-1 h-1 bg-current rounded-full"></span>
                                <span>Placed on {format(new Date(booking.id.split('-')[0] ? new Date() : new Date()), 'MMM dd, yyyy')}</span>
                            </div>
                        </div>

                        {/* Main Info Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Property & Room Info */}
                            <div className="md:col-span-2 space-y-6">
                                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="h-48 relative">
                                        <img
                                            src={booking.property.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'}
                                            alt={booking.property.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                        <div className="absolute bottom-6 left-6 text-white">
                                            <h2 className="text-2xl font-black">{booking.property.name}</h2>
                                            <p className="text-sm text-gray-300 flex items-center gap-1">
                                                <MapPin className="h-3 w-3" />
                                                {booking.property.address}, {booking.property.city}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="p-8 space-y-8">
                                        <div className="grid grid-cols-2 gap-8">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    <Calendar className="h-4 w-4 text-primary-500" />
                                                    Check-In
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-black text-gray-900">{format(new Date(booking.checkInDate), 'MMM dd')}</p>
                                                    <p className="text-sm text-gray-500 font-medium">{format(new Date(booking.checkInDate), 'EEEE, yyyy')}</p>
                                                    <p className="text-xs font-bold text-green-600 mt-1 uppercase tracking-wider flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> After 12 PM
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    <Calendar className="h-4 w-4 text-primary-500" />
                                                    Check-Out
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-black text-gray-900">{format(new Date(booking.checkOutDate), 'MMM dd')}</p>
                                                    <p className="text-sm text-gray-500 font-medium">{format(new Date(booking.checkOutDate), 'EEEE, yyyy')}</p>
                                                    <p className="text-xs font-bold text-orange-600 mt-1 uppercase tracking-wider flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Before 11 AM
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-primary-50 rounded-2xl text-primary-600">
                                                    <HomeIcon className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Accommodation</p>
                                                    <p className="font-black text-gray-900">{booking.roomType.name}</p>
                                                    <p className="text-sm text-gray-500">Luxury Suite • Pool View</p>
                                                </div>
                                            </div>
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                                                    <Users className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Guests</p>
                                                    <p className="font-black text-gray-900">{booking.adultsCount} Adults, {booking.childrenCount} Children</p>
                                                    <p className="text-sm text-gray-500">Full Occupancy Used</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-6">
                                {/* Price Summary */}
                                <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
                                    <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                                        <CreditCard className="h-5 w-5 text-primary-500" />
                                        Payment Summary
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between text-sm font-medium text-gray-500">
                                            <span>Total Amount</span>
                                            <span className="text-gray-900">{formatPrice(booking.totalAmount, selectedCurrency, rates)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-medium text-gray-500">
                                            <span>Paid Amount</span>
                                            <span className="text-green-600 font-bold">
                                                {booking.paymentStatus === 'FULL' ? formatPrice(booking.totalAmount, selectedCurrency, rates) : '₹0.00'}
                                            </span>
                                        </div>
                                        <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-xs font-black text-gray-900 uppercase">Status</span>
                                            <span className={clsx(
                                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                                booking.paymentStatus === 'FULL'
                                                    ? "bg-green-50 text-green-600 border-green-100"
                                                    : "bg-red-50 text-red-600 border-red-100"
                                            )}>
                                                {booking.paymentStatus}
                                            </span>
                                        </div>
                                    </div>

                                    {booking.paymentStatus !== 'FULL' && booking.status !== 'CANCELLED' && (
                                        <button className="w-full mt-8 py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800 transition shadow-lg">
                                            Complete Payment <ArrowRight className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Guest List */}
                                <div className="bg-gray-900 rounded-3xl p-8 text-white">
                                    <h3 className="text-lg font-black mb-6 flex items-center gap-2">
                                        <User className="h-5 w-5 text-primary-400" />
                                        Guest Information
                                    </h3>
                                    <div className="space-y-4">
                                        {booking.guests.map((guest, idx) => (
                                            <div key={idx} className="flex items-center gap-3 py-3 border-b border-white/10 last:border-0">
                                                <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-primary-400">
                                                    {guest.firstName[0]}{guest.lastName[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold">{guest.firstName} {guest.lastName}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider">Primary Guest</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Security Message */}
                                <div className="p-6 rounded-2xl bg-primary-50 border border-primary-100 flex gap-4">
                                    <CheckCircle2 className="h-6 w-6 text-primary-600 shrink-0" />
                                    <p className="text-xs text-primary-800 font-medium leading-relaxed">
                                        Your booking is securely stored. Changes to guests or dates must be made via our support team.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function HomeIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
    )
}
