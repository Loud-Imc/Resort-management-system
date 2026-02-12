import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import eventBookingAdminService, { EventBooking } from '../../services/eventBookings';
import {
    Loader2, Search, Filter,
    User, Mail, Phone, CheckCircle,
    Clock, Download, Ticket,
    DollarSign
} from 'lucide-react';
import clsx from 'clsx';

export default function EventBookings() {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data: bookings, isLoading, error } = useQuery<EventBooking[]>({
        queryKey: ['event-bookings-admin'],
        queryFn: () => eventBookingAdminService.getAll(),
    });

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'PAID':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'CANCELLED':
                return 'bg-red-100 text-red-800 border-red-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const filteredBookings = bookings?.filter(booking => {
        const matchesSearch =
            booking.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.ticketId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            booking.event?.title.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = !statusFilter || booking.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

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

    const totalRevenue = filteredBookings?.reduce((sum, b) => sum + Number(b.amountPaid), 0) || 0;
    const totalTickets = filteredBookings?.length || 0;
    const checkedInCount = filteredBookings?.filter(b => b.checkedIn).length || 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Event Attendees</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage ticket holders and check payment status</p>
                </div>
                <button
                    disabled
                    className="bg-white text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm opacity-50 cursor-not-allowed"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-primary-600 mb-2">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Total Revenue</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">₹{totalRevenue.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400 mt-1 font-medium">Gross ticket sales for filtered events</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-indigo-600 mb-2">
                        <Ticket className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Tickets Sold</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">{totalTickets}</div>
                    <div className="text-[10px] text-gray-400 mt-1 font-medium">Total bookings across all statuses</div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-3 text-green-600 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-xs font-bold uppercase tracking-wider">Physical Turnout</span>
                    </div>
                    <div className="text-2xl font-black text-gray-900">{checkedInCount} / {totalTickets}</div>
                    <div className="text-[10px] text-gray-400 mt-1 font-medium">
                        {totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0}% attendance rate verified
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by guest, ticket, or event..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        >
                            <option value="">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ticket & Event</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredBookings?.map((booking) => (
                                <tr key={booking.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-primary-50 rounded-lg mr-3">
                                                <Ticket className="h-5 w-5 text-primary-600" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-mono font-bold text-gray-900">{booking.ticketId}</div>
                                                <div className="text-xs text-gray-500 mt-0.5">{booking.event?.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">{booking.guestName || 'Registered User'}</div>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            <span className="text-xs text-gray-500 flex items-center gap-1">
                                                <Mail className="h-3 w-3" /> {booking.guestEmail}
                                            </span>
                                            {booking.guestPhone && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> {booking.guestPhone}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">₹{Number(booking.amountPaid).toLocaleString()}</div>
                                        <div className="text-[10px] text-gray-400 uppercase tracking-tight mt-0.5">Total Paid</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                                            getStatusStyles(booking.status)
                                        )}>
                                            {booking.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {booking.checkedIn ? (
                                            <div className="flex flex-col">
                                                <span className="flex items-center gap-1.5 text-green-600 text-xs font-bold">
                                                    <CheckCircle className="h-4 w-4" /> Checked In
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-1 pl-5">
                                                    {new Date(booking.checkInTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-gray-400 text-xs font-medium italic">
                                                <Clock className="h-4 w-4" /> Waiting
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredBookings?.length === 0 && (
                    <div className="p-12 text-center text-gray-500">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-400">No attendees found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
