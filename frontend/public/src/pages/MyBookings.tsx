import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, isAfter, startOfToday } from 'date-fns';
import { Loader2, Calendar, MapPin, ChevronRight, Package, User, XCircle, AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { bookingService } from '../services/booking';
import { formatPrice } from '../utils/currency';

export default function MyBookings() {
    const queryClient = useQueryClient();
    const token = localStorage.getItem('token');
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    const [cancellingBooking, setCancellingBooking] = useState<any | null>(null);
    const [cancelReason, setCancelReason] = useState('');

    if (!token || !user) {
        return <Navigate to="/login?redirect=/my-bookings" replace />;
    }

    const { data: bookings, isLoading, error } = useQuery({
        queryKey: ['my-bookings'],
        queryFn: bookingService.getMyBookings,
        enabled: !!token,
    });

    const cancelMutation = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason?: string }) => bookingService.cancelBooking(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
            setCancellingBooking(null);
            setCancelReason('');
            alert('Booking cancelled successfully. Your refund will be processed according to the policy.');
        },
        onError: (err: any) => {
            alert(err.response?.data?.message || 'Failed to cancel booking');
        }
    });

    const handleCancelSubmit = () => {
        if (!cancellingBooking) return;
        cancelMutation.mutate({ id: cancellingBooking.id, reason: cancelReason });
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-700 border-green-200';
            case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200';
            case 'REFUNDED': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'CHECKED_IN': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'CHECKED_OUT': return 'bg-gray-100 text-gray-700 border-gray-200';
            default: return 'bg-gray-100 text-gray-600 border-gray-200';
        }
    };

    const canCancel = (booking: any) => {
        const checkIn = new Date(booking.checkInDate);
        return ['CONFIRMED', 'PENDING_PAYMENT'].includes(booking.status) && isAfter(checkIn, startOfToday());
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-12 pt-8">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 font-serif">My Bookings</h1>
                        <p className="mt-1 text-gray-600">View and manage your resort reservations</p>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                    </div>
                ) : error ? (
                    <div className="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-600 mb-4">
                            <Package className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Failed to load bookings</h3>
                        <p className="text-gray-500 mt-2">Please try refreshing the page or contact support if the issue persists.</p>
                    </div>
                ) : bookings?.length === 0 ? (
                    <div className="bg-white p-16 rounded-2xl shadow-sm border border-gray-100 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-50 text-gray-400 mb-6">
                            <Calendar className="h-10 w-10" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 font-serif">No bookings found</h3>
                        <p className="text-gray-500 mt-2 mb-8 max-w-sm mx-auto">
                            You haven't made any reservations yet. Start your journey by exploring our luxury resorts.
                        </p>
                        <Link
                            to="/properties"
                            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-bold rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all"
                        >
                            Explore Resorts
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {bookings?.map((booking) => (
                            <div
                                key={booking.id}
                                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all group"
                            >
                                <div className="p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Property Thumbnail (Placeholder or first image if available) */}
                                        <div className="w-full md:w-32 h-32 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0">
                                            {booking.room?.property?.images?.[0] ? (
                                                <img
                                                    src={booking.room.property.images[0]}
                                                    alt={booking.room.property.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                    <MapPin className="h-8 w-8" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Booking Info */}
                                        <div className="flex-grow">
                                            <div className="flex flex-wrap justify-between items-start gap-4 mb-3">
                                                <div>
                                                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                                                        {booking.room?.property?.name || 'Resort Stay'}
                                                    </h3>
                                                    <div className="flex items-center text-gray-500 text-sm mt-1 gap-3">
                                                        <span className="flex items-center gap-1">
                                                            <Package className="h-4 w-4" />
                                                            {booking.roomType?.name}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <User className="h-4 w-4" />
                                                            {booking.adultsCount} Adults, {booking.childrenCount} Children
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 py-4 border-y border-gray-50">
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Check-in</p>
                                                    <p className="text-sm font-bold text-gray-800">{format(new Date(booking.checkInDate), 'EEE, MMM dd, yyyy')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Check-out</p>
                                                    <p className="text-sm font-bold text-gray-800">{format(new Date(booking.checkOutDate), 'EEE, MMM dd, yyyy')}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Booking ID</p>
                                                    <p className="text-sm font-bold text-gray-800">#{booking.bookingNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">Total Amount</p>
                                                    <p className="text-sm font-bold text-primary-600">{formatPrice(booking.totalAmount, booking.bookingCurrency || 'INR')}</p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex flex-wrap justify-between items-center gap-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        Booked on {format(new Date(booking.createdAt), 'MMM dd, yyyy')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    {canCancel(booking) && (
                                                        <button
                                                            onClick={() => setCancellingBooking(booking)}
                                                            className="text-red-600 text-sm font-bold hover:underline inline-flex items-center gap-1"
                                                        >
                                                            <XCircle className="h-4 w-4" /> Cancel Booking
                                                        </button>
                                                    )}
                                                    <Link
                                                        to={`/confirmation?bookingId=${booking.id}`}
                                                        className="text-primary-600 text-sm font-bold hover:underline inline-flex items-center gap-1"
                                                    >
                                                        View Confirmation <ChevronRight className="h-4 w-4" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Cancel Mutation Modal */}
            {cancellingBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                                    <AlertTriangle className="h-6 w-6 text-red-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 font-serif">Cancel Booking</h3>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Are you sure you want to cancel your booking <span className="font-bold text-gray-900">#{cancellingBooking.bookingNumber}</span>?
                                <br /><br />
                                Refunds will be processed according to the resort's cancellation policy. This action cannot be undone.
                            </p>

                            <div className="space-y-2 mb-8">
                                <label className="text-sm font-bold text-gray-700">Reason for cancellation (Optional)</label>
                                <textarea
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all text-sm h-24 resize-none"
                                    placeholder="Ex: Change of plans, found better price, etc."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setCancellingBooking(null)}
                                    className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                    disabled={cancelMutation.isPending}
                                >
                                    No, Keep it
                                </button>
                                <button
                                    onClick={handleCancelSubmit}
                                    className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    disabled={cancelMutation.isPending}
                                >
                                    {cancelMutation.isPending ? (
                                        <>
                                            <Loader2 className="h-5 w-5 animate-spin" /> Processing...
                                        </>
                                    ) : (
                                        'Yes, Cancel'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
