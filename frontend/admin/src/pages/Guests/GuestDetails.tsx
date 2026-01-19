import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { usersService } from '../../services/users';
import type { User } from '../../types/user';
import {
    Loader2,
    ArrowLeft,
    Mail,
    Phone,
    Calendar
} from 'lucide-react';
import { format } from 'date-fns';

export default function GuestDetails() {
    const { id } = useParams();
    const navigate = useNavigate();

    const { data: user, isLoading } = useQuery<User>({
        queryKey: ['user', id],
        queryFn: () => usersService.getById(id!),
        enabled: !!id,
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!user) {
        return <div className="p-8 text-center">Guest not found</div>;
    }

    // Calculate stats
    const totalBookings = user.bookings?.length || 0;
    const totalSpent = user.bookings?.reduce((acc, booking) => acc + Number(booking.totalAmount), 0) || 0;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'CONFIRMED': return 'bg-green-100 text-green-800';
            case 'CHECKED_IN': return 'bg-blue-100 text-blue-800';
            case 'CHECKED_OUT': return 'bg-gray-100 text-gray-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            case 'PENDING_PAYMENT': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/guests')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Guest Profile</h1>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-start">
                    <div className="h-24 w-24 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-3xl flex-shrink-0">
                        {user.firstName.charAt(0)}
                    </div>

                    <div className="flex-1 space-y-4">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">{user.firstName} {user.lastName}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {user.roles.map((ur, idx) => (
                                    <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full border border-gray-200">
                                        {ur.role.name}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div className="flex items-center gap-3 text-gray-600">
                                <Mail className="h-5 w-5 text-gray-400" />
                                <a href={`mailto:${user.email}`} className="hover:text-primary-600">{user.email}</a>
                            </div>
                            <div className="flex items-center gap-3 text-gray-600">
                                <Phone className="h-5 w-5 text-gray-400" />
                                <a href={`tel:${user.phone}`} className="hover:text-primary-600">{user.phone || 'N/A'}</a>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 flex-shrink-0 min-w-[200px]">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Lifecycle Stats</p>
                        <div className="space-y-3">
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{totalBookings}</p>
                                <p className="text-xs text-gray-500">Total Bookings</p>
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-green-600">${totalSpent.toFixed(2)}</p>
                                <p className="text-xs text-gray-500">Total Spent</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Booking History */}
            <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-500" />
                    Booking History
                </h3>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    {user.bookings && user.bookings.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Ref</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check In/Out</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {user.bookings.map((booking: any) => (
                                        <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="font-medium text-primary-600">#{booking.bookingNumber}</span>
                                                <p className="text-xs text-gray-500">{format(new Date(booking.createdAt), 'MMM d, yyyy')}</p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{booking.roomType?.name || 'Standard Room'}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {format(new Date(booking.checkInDate), 'MMM d')} - {format(new Date(booking.checkOutDate), 'MMM d, yyyy')}
                                                </div>
                                                <div className="text-xs text-gray-500">{booking.numberOfNights} Nights</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">${Number(booking.totalAmount).toFixed(2)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 text-xs font-semibold leading-5 rounded-full ${getStatusColor(booking.status)}`}>
                                                    {booking.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-12 text-center text-gray-500">
                            <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                            <p>No booking history found for this guest.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
