import {
    X,
    User,
    Phone,
    Mail,
    Calendar,
    Users,
    ArrowRight,
    ExternalLink,
    BedDouble,
    Clock,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { Booking } from '../../types/booking';

interface HistoricalGuestDetailsModalProps {
    booking: Booking | null;
    roomNumber: string;
    isOpen: boolean;
    onClose: () => void;
}

export default function HistoricalGuestDetailsModal({ booking, roomNumber, isOpen, onClose }: HistoricalGuestDetailsModalProps) {
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleViewBooking = () => {
        if (booking) {
            navigate(`/bookings?id=${booking.id}`);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <BedDouble className="h-5 w-5 text-blue-600" />
                            Room {roomNumber}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Guest & Booking Details</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6">
                    {!booking ? (
                        <div className="text-center py-12">
                            <Clock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-gray-400 font-medium">No booking found for this date.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Guest Primary Info */}
                            <div className="flex items-start gap-4 p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-none">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                                        {booking.user?.firstName} {booking.user?.lastName}
                                    </h3>
                                    <div className={clsx(
                                        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 uppercase tracking-wider",
                                        ['CHECKED_IN', 'CHECKED_OUT', 'CONFIRMED'].includes(booking.status)
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                                    )}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                        {booking.status.replace('_', ' ')}
                                    </div>
                                </div>
                                <button
                                    onClick={handleViewBooking}
                                    className="ml-auto p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all group"
                                    title="Go to Booking"
                                >
                                    <ExternalLink className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                </button>
                            </div>

                            {/* Contact Details Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Phone</p>
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{booking.user?.phone || 'N/A'}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-1">Email</p>
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                        <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{booking.user?.email || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stay Details */}
                            <div className="bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div className="grid grid-cols-2 divide-x divide-gray-100 dark:divide-gray-700">
                                    <div className="p-4 flex flex-col items-center text-center">
                                        <Calendar className="h-5 w-5 text-blue-500 mb-1" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Check-in</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {format(new Date(booking.checkInDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                    <div className="p-4 flex flex-col items-center text-center">
                                        <Calendar className="h-5 w-5 text-red-500 mb-1" />
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Check-out</p>
                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                            {format(new Date(booking.checkOutDate), 'MMM d, yyyy')}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-100/50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex justify-center items-center gap-4">
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                        <Users className="h-3.5 w-3.5" />
                                        {booking.adultsCount} Adult(s), {booking.childrenCount} Child(ren)
                                    </div>
                                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                                        <Clock className="h-3.5 w-3.5" />
                                        {booking.numberOfNights} Night(s)
                                    </div>
                                </div>
                            </div>

                            {/* Guest Documents */}
                            {booking.guests && booking.guests.length > 0 && booking.guests.some(g => g.idType || g.idImage) && (
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                        <FileText className="h-4 w-4" /> Guest Documents
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {booking.guests.filter(g => g.idType || g.idImage || g.idImageBack).map((guest, idx) => (
                                            <div key={idx} className="p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center gap-3">
                                                <div className="flex gap-1.5 shrink-0">
                                                    {guest.idImage ? (
                                                        <a href={guest.idImage} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-blue-500 transition-all block bg-white dark:bg-gray-800" title="Front Side">
                                                            <img src={guest.idImage} alt={`${guest.firstName} ID Front`} className="w-full h-full object-cover" />
                                                        </a>
                                                    ) : (
                                                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 text-gray-500 rounded-lg flex items-center justify-center">
                                                            <FileText className="h-5 w-5" />
                                                        </div>
                                                    )}
                                                    {guest.idImageBack && (
                                                        <a href={guest.idImageBack} target="_blank" rel="noopener noreferrer" className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 hover:ring-2 hover:ring-blue-500 transition-all block bg-white dark:bg-gray-800" title="Back Side">
                                                            <img src={guest.idImageBack} alt={`${guest.firstName} ID Back`} className="w-full h-full object-cover" />
                                                        </a>
                                                    )}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                                        {guest.firstName} {guest.lastName}
                                                    </p>
                                                    <p className="text-xs text-gray-500 truncate">
                                                        {guest.idType || 'Document'}: {guest.idNumber || 'No ID Number'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={onClose}
                                    className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
                                >
                                    Close
                                </button>
                                <button
                                    onClick={handleViewBooking}
                                    className="flex-[2] px-4 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none flex items-center justify-center gap-2 group"
                                >
                                    View Full Booking
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
