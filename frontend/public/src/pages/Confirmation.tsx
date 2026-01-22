import { useLocation, Link, Navigate } from 'react-router-dom';
import { CheckCircle, Download } from 'lucide-react';
import { format } from 'date-fns';

export default function Confirmation() {
    const location = useLocation();
    const booking = location.state?.booking;

    if (!booking) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4 py-12">
            <div className="bg-white p-8 md:p-12 rounded-2xl shadow-lg max-w-2xl w-full text-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                </div>

                <h1 className="text-3xl font-serif font-bold text-gray-900 mb-2">Booking Confirmed!</h1>
                <p className="text-gray-600 mb-8">
                    Thank you for choosing Route Guide. We've sent a confirmation email to your address.
                    A confirmation email has been sent to <span className="font-semibold text-gray-900">{location.state?.email}</span>.
                </p>

                <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                    <div className="grid grid-cols-2 gap-y-4">
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Booking ID</span>
                            <span className="font-mono font-medium text-gray-900">{booking.bookingNumber}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Status</span>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Confirmed
                            </span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Check In</span>
                            <span className="font-medium text-gray-900">{format(new Date(booking.checkInDate), 'MMM d, yyyy')}</span>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Check Out</span>
                            <span className="font-medium text-gray-900">{format(new Date(booking.checkOutDate), 'MMM d, yyyy')}</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link to="/" className="text-primary-600 hover:text-primary-700 font-medium px-6 py-3">
                        Return to Home
                    </Link>
                    <button
                        onClick={() => window.print()}
                        className="bg-primary-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Download Receipt
                    </button>
                </div>
            </div>
        </div>
    );
}
