import { useLocation, Link, Navigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Download, Loader2, MapPin, Package, Calendar, User } from 'lucide-react';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/booking';
import { formatPrice } from '../utils/currency';

export default function Confirmation() {
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const bookingIdFromUrl = searchParams.get('bookingId');

    // 1. First check if we have booking in state (from fresh checkout)
    // 2. Otherwise check if we have bookingId in URL (from My Bookings)

    const { data: fetchedBooking, isLoading, error } = useQuery({
        queryKey: ['booking', bookingIdFromUrl],
        queryFn: () => bookingService.getBookingById(bookingIdFromUrl!),
        enabled: !!bookingIdFromUrl,
    });

    const booking = fetchedBooking || location.state?.booking;

    if (isLoading) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary-600 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">Retrieving booking details...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4">
                <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center max-w-md w-full">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-4">
                        <Package className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Booking not found</h3>
                    <p className="text-gray-500 mt-2 mb-8">We couldn't find the reservation you're looking for. It may have been removed or the ID is incorrect.</p>
                    <Link to="/profile" className="bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors inline-block w-full">
                        View My Bookings
                    </Link>
                </div>
            </div>
        );
    }

    if (!booking) {
        return <Navigate to="/" replace />;
    }

    const property = booking.property || booking.room?.property;
    const roomType = booking.roomType;

    // Calculate totals from payments for accuracy (especially after refunds)
    const payments = booking.payments || [];
    const originalPaidAmount = payments.reduce((sum: number, p: any) => {
        if (p.status === 'PAID' || p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED') {
            return sum + Number(p.amount);
        }
        return sum;
    }, 0);

    const totalRefundedAmount = payments.reduce((sum: number, p: any) => {
        return sum + (Number(p.refundAmount) || 0);
    }, 0);

    const refundDate = payments.find((p: any) => p.refundDate)?.refundDate;

    const isCancelled = booking.status === 'CANCELLED' || booking.status === 'REFUNDED';

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'CANCELLED': return 'bg-red-100 text-red-800 border-red-200';
            case 'REFUNDED': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    return (
        <div className="min-h-[70vh] bg-gray-50 px-4 py-12">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Header Area */}
                    <div className={`${isCancelled ? 'bg-gray-800' : 'bg-primary-600'} p-8 md:p-12 text-center text-white transition-colors`}>
                        <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="h-10 w-10 text-white" />
                        </div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold mb-2">
                            {isCancelled ? 'Booking Cancelled' : 'Booking Confirmed!'}
                        </h1>
                        <p className="text-primary-50 opacity-90 max-w-md mx-auto">
                            {isCancelled
                                ? 'Your reservation has been cancelled. Refund details are provided below.'
                                : `Thank you for choosing us ${booking.user?.firstName ? `, ${booking.user.firstName}` : ''}. We've sent your confirmation details to your registered email.`
                            }
                        </p>
                    </div>

                    <div className="p-8 md:p-12">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                            {/* Left Column: Reservation Summary */}
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary-600" />
                                    Reservation Summary
                                </h3>

                                <div className="space-y-6">
                                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                        <div className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden flex-shrink-0">
                                            {property?.images?.[0] ? (
                                                <img src={property.images[0]} alt={property.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-primary-50 text-primary-300">
                                                    <MapPin className="h-6 w-6" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{property?.name || 'Luxury Resort'}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">{roomType?.name || 'Suite Room'}</p>
                                            <div className="flex items-center gap-1 mt-1 text-primary-600 font-bold text-sm">
                                                <span>#{booking.bookingNumber}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6 pt-2">
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Check In</span>
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <Calendar className="h-4 w-4 text-primary-500" />
                                                <span className="font-bold">{format(new Date(booking.checkInDate), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Check Out</span>
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <Calendar className="h-4 w-4 text-primary-500" />
                                                <span className="font-bold">{format(new Date(booking.checkOutDate), 'MMM d, yyyy')}</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Guests</span>
                                            <div className="flex items-center gap-2 text-gray-800">
                                                <User className="h-4 w-4 text-primary-500" />
                                                <span className="font-bold">{booking.adultsCount} Adults, {booking.childrenCount} Child</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Status</span>
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusStyles(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Payment Details */}
                            <div className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900 mb-6">Payment Details</h3>

                                <div className="space-y-4">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Nightly Rate x {booking.numberOfNights}</span>
                                        <span className="font-medium text-gray-900">{formatPrice(booking.baseAmount || 0, booking.bookingCurrency || 'INR')}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Taxes & Fees</span>
                                        <span className="font-medium text-gray-900">{formatPrice(booking.taxAmount || 0, booking.bookingCurrency || 'INR')}</span>
                                    </div>
                                    {(booking.couponDiscountAmount > 0) && (
                                        <div className="flex justify-between text-sm text-green-600 font-medium">
                                            <span>Coupon Discount</span>
                                            <span>-{formatPrice(booking.couponDiscountAmount, booking.bookingCurrency || 'INR')}</span>
                                        </div>
                                    )}
                                    <div className="pt-4 border-t border-gray-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">Booking Total</span>
                                            <span className="text-lg font-bold text-gray-900">{formatPrice(booking.totalAmount, booking.bookingCurrency || 'INR')}</span>
                                        </div>

                                        <div className="flex justify-between items-center text-emerald-600">
                                            <span className="text-sm font-bold uppercase tracking-wider">Amount Paid</span>
                                            <span className="text-lg font-black">{formatPrice(originalPaidAmount, booking.bookingCurrency || 'INR')}</span>
                                        </div>

                                        {!isCancelled && Number(booking.paidAmount) < Number(booking.totalAmount) && (
                                            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Balance Due at Resort</span>
                                                    <span className="text-xs text-amber-700 italic">To be paid during check-in</span>
                                                </div>
                                                <span className="text-xl font-black text-amber-600">
                                                    {formatPrice(Number(booking.totalAmount) - Number(booking.paidAmount), booking.bookingCurrency || 'INR')}
                                                </span>
                                            </div>
                                        )}

                                        {totalRefundedAmount > 0 && (
                                            <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-purple-700 uppercase tracking-wider text-[10px]">Total Refunded</span>
                                                    <span className="text-lg font-black text-purple-700">{formatPrice(totalRefundedAmount, booking.bookingCurrency || 'INR')}</span>
                                                </div>
                                                {refundDate && (
                                                    <p className="text-[10px] text-purple-600 font-medium">
                                                        Processed on {format(new Date(refundDate), 'MMM d, yyyy')}
                                                    </p>
                                                )}
                                                <p className="text-[10px] text-purple-500 leading-tight mt-2 italic">
                                                    Refunds typically take 5-7 business days to reflect in your original payment method.
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-gray-200">
                                        {!isCancelled && (
                                            <button
                                                onClick={() => window.print()}
                                                className="w-full bg-white border-2 border-primary-600 text-primary-600 hover:bg-primary-50 px-8 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                            >
                                                <Download className="h-4 w-4" />
                                                Download Invoice
                                            </button>
                                        )}
                                        <Link
                                            to="/"
                                            className="w-full mt-3 text-center text-sm font-bold text-gray-500 hover:text-primary-600 transition-colors inline-block"
                                        >
                                            Return to Homepage
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Note Area */}
                        {!isCancelled && (
                            <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex gap-4">
                                <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <User className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900 text-sm">Important Information</h4>
                                    <p className="text-sm text-blue-800/70 mt-1 leading-relaxed">
                                        Please present this confirmation and a valid photo ID at the resort reception during check-in.
                                        Standard check-in time is 2:00 PM and check-out is 11:00 AM.
                                    </p>
                                </div>
                            </div>
                        )}
                        {isCancelled && (
                            <div className="mt-12 p-6 bg-red-50 rounded-2xl border border-red-100 flex gap-4">
                                <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                                    <User className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-red-900 text-sm">Cancellation Policy</h4>
                                    <p className="text-sm text-red-800/70 mt-1 leading-relaxed">
                                        Your booking has been cancelled and is no longer valid. If you have any questions about your refund, please contact our support team with your booking ID.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
