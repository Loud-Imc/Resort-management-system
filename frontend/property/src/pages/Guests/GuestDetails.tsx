import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { usersService } from '../../services/users';
import type { User } from '../../types/user';
import { Loader2, ArrowLeft, Mail, Phone, Calendar, ShieldCheck, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function GuestDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: user, isLoading } = useQuery<User>({
        queryKey: ['user', id],
        queryFn: () => usersService.getById(id!),
        enabled: !!id,
    });

    if (isLoading) return (
        <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
    );

    if (!user) return (
        <div className="p-12 text-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 mt-6">
            <p className="text-gray-500 dark:text-gray-400 font-medium">Guest not found</p>
        </div>
    );

    const totalBookings = user.bookings?.length || 0;
    const totalSpent = user.bookings?.reduce((acc: number, booking: any) => acc + Number(booking.totalAmount), 0) || 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
            case 'CHECKED_IN': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
            case 'CHECKED_OUT': return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
            case 'CANCELLED': return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
            case 'PENDING_PAYMENT': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
            default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/guests')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Guest Profile</h1>
            </div>

            {/* Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-start text-center md:text-left">
                    <div className="h-24 w-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 font-bold text-3xl flex-shrink-0 mx-auto md:mx-0">
                        {user.firstName.charAt(0)}
                    </div>
                    <div className="flex-1 space-y-4">
                        <div>
                            <div className="flex items-center justify-center md:justify-start gap-2">
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white">{user.firstName} {user.lastName}</h2>
                                {user.idType && user.idNumber ? (
                                    <ShieldCheck className="h-5 w-5 text-emerald-500" title="Verified Guest" />
                                ) : (
                                    <Shield className="h-5 w-5 text-gray-400 opacity-30" title="Unverified" />
                                )}
                            </div>
                            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                                {user.roles?.map((ur: any, idx: number) => (
                                    <span key={idx} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-600 font-bold">
                                        {typeof ur === 'string' ? ur : ur.role?.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm font-medium">
                            <div className="flex items-center justify-center md:justify-start gap-3 text-gray-500 dark:text-gray-400">
                                <Mail className="h-5 w-5 opacity-60" />
                                <a href={`mailto:${user.email}`} className="hover:text-blue-600 transition-colors">{user.email}</a>
                            </div>
                            <div className="flex items-center justify-center md:justify-start gap-3 text-gray-500 dark:text-gray-400">
                                <Phone className="h-5 w-5 opacity-60" />
                                <a href={`tel:${user.phone}`} className="hover:text-blue-600 transition-colors">{user.phone || 'N/A'}</a>
                            </div>
                            {user.idType && (
                                <div className="flex items-center justify-center md:justify-start gap-3 text-gray-500 dark:text-gray-400">
                                    <ShieldCheck className="h-5 w-5 text-emerald-500 opacity-60" />
                                    <span><span className="font-bold text-gray-900 dark:text-white">{user.idType.replace('_', ' ')}:</span> {user.idNumber || 'Not provided'}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-6 border border-gray-200 dark:border-gray-600 flex-shrink-0 min-w-[200px]">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Lifecycle Stats</p>
                        <div className="space-y-4">
                            <div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white">{totalBookings}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Bookings</p>
                            </div>
                            <div>
                                <p className="text-2xl font-black text-emerald-500">₹{totalSpent.toFixed(2)}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Total Spent</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking History */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" /> Booking History
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {user.bookings && user.bookings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Booking Ref</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Room Type</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Check In/Out</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {user.bookings.map((booking: any) => (
                                        <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-bold text-blue-600">#{booking.bookingNumber}</span>
                                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{format(new Date(booking.createdAt), 'MMM d, yyyy')}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{booking.roomType?.name || 'Standard Room'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white font-medium">
                                                    {format(new Date(booking.checkInDate), 'MMM d')} - {format(new Date(booking.checkOutDate), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400">{booking.numberOfNights} Nights</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">₹{Number(booking.totalAmount).toFixed(2)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2.5 py-1 text-[10px] font-bold leading-5 rounded-full shadow-sm ${getStatusColor(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 font-medium border-2 border-dashed border-gray-200 dark:border-gray-700 m-4 rounded-xl">
                            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-3 opacity-30" />
                            <p>No booking history found for this guest.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
