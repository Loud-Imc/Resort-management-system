import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingsService } from '../../services/bookings';
import { BookingStatus } from '../../types/booking';
import type { Booking } from '../../types/booking';
import { format } from 'date-fns';
import {
    Loader2,
    Search,
    Filter,
    Eye,
    CheckCircle,
    LogOut,
    XCircle,
    MoreVertical,
    Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function BookingsList() {
    const [statusFilter, setStatusFilter] = useState<string>('');
    const queryClient = useQueryClient();

    const { data: bookings, isLoading, error } = useQuery({
        queryKey: ['bookings', statusFilter],
        queryFn: () => bookingsService.getAll({ status: statusFilter || undefined }),
    });

    const checkInMutation = useMutation({
        mutationFn: bookingsService.checkIn,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const checkOutMutation = useMutation({
        mutationFn: bookingsService.checkOut,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const cancelMutation = useMutation({
        mutationFn: (id: string) => bookingsService.cancel(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
    });

    const getStatusColor = (status: BookingStatus) => {
        switch (status) {
            case BookingStatus.CONFIRMED:
                return 'bg-green-100 text-green-800';
            case BookingStatus.CHECKED_IN:
                return 'bg-blue-100 text-blue-800';
            case BookingStatus.CHECKED_OUT:
                return 'bg-gray-100 text-gray-800';
            case BookingStatus.PENDING_PAYMENT:
                return 'bg-yellow-100 text-yellow-800';
            case BookingStatus.CANCELLED:
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                Error loading bookings. Please try again.
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage reservations and guests</p>
                </div>
                <Link
                    to="/bookings/create"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                    <Calendar className="h-4 w-4" />
                    New Booking
                </Link>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by guest name or booking ID..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                            <option value="">All Statuses</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="CHECKED_IN">Checked In</option>
                            <option value="CHECKED_OUT">Checked Out</option>
                            <option value="PENDING_PAYMENT">Pending Payment</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Booking Info
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Guest
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Room
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Dates
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {bookings?.map((booking: Booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-primary-600">
                                            {booking.bookingNumber}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {booking.isManualBooking ? 'Manual' : 'Online'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {booking.user.firstName} {booking.user.lastName}
                                        </div>
                                        <div className="text-sm text-gray-500">{booking.user.email}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">Unit {booking.room.roomNumber}</div>
                                        <div className="text-xs text-gray-500">{booking.room.roomType.name}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {format(new Date(booking.checkInDate), 'MMM d, yyyy')}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {booking.numberOfNights} nights
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                                                booking.status
                                            )}`}
                                        >
                                            {booking.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {/* Actions Dropdown could go here, simplified for now */}
                                            {booking.status === BookingStatus.CONFIRMED && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Check-in this guest?')) checkInMutation.mutate(booking.id);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-900"
                                                    title="Check In"
                                                >
                                                    <CheckCircle className="h-4 w-4" />
                                                </button>
                                            )}

                                            {booking.status === BookingStatus.CHECKED_IN && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Check-out this guest?')) checkOutMutation.mutate(booking.id);
                                                    }}
                                                    className="text-gray-600 hover:text-gray-900"
                                                    title="Check Out"
                                                >
                                                    <LogOut className="h-4 w-4" />
                                                </button>
                                            )}

                                            {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.PENDING_PAYMENT) && (
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Cancel this booking?')) cancelMutation.mutate(booking.id);
                                                    }}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Cancel"
                                                >
                                                    <XCircle className="h-4 w-4" />
                                                </button>
                                            )}

                                            <button className="text-gray-400 hover:text-gray-600">
                                                <MoreVertical className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {bookings?.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No bookings found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
}
