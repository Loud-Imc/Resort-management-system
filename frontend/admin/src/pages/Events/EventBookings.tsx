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
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'PENDING':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'CANCELLED':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            default:
                return 'bg-muted text-muted-foreground border-border';
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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 font-bold">
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
                    <h1 className="text-2xl font-bold text-foreground">Event Attendees</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage ticket holders and check payment status</p>
                </div>
                <button
                    disabled
                    className="bg-muted text-muted-foreground px-6 py-2.5 rounded-xl border border-border hover:bg-muted/80 transition-all flex items-center gap-2 shadow-sm opacity-50 cursor-not-allowed font-bold"
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 text-emerald-500 mb-2">
                        <DollarSign className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Total Revenue</span>
                    </div>
                    <div className="text-2xl font-black text-foreground">₹{totalRevenue.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-bold">Gross ticket sales for filtered events</div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 text-primary mb-2">
                        <Ticket className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Tickets Sold</span>
                    </div>
                    <div className="text-2xl font-black text-foreground">{totalTickets}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-bold">Total bookings across all statuses</div>
                </div>

                <div className="bg-card p-6 rounded-xl border border-border shadow-sm group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <CheckCircle className="h-5 w-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Physical Turnout</span>
                    </div>
                    <div className="text-2xl font-black text-foreground">{checkedInCount} / {totalTickets}</div>
                    <div className="text-[10px] text-muted-foreground mt-1 font-bold">
                        {totalTickets > 0 ? Math.round((checkedInCount / totalTickets) * 100) : 0}% attendance rate verified
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 bg-muted/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by guest, ticket, or event..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background text-foreground border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="PAID">Paid</option>
                            <option value="PENDING">Pending</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Ticket & Event</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Guest Details</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Amount</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Check-in</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {filteredBookings?.map((booking) => (
                                <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="p-2.5 bg-primary/10 rounded-xl mr-3">
                                                <Ticket className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <div className="text-sm font-mono font-black text-foreground">{booking.ticketId}</div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5 font-bold">{booking.event?.title}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-foreground">{booking.guestName || 'Registered User'}</div>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                                                <Mail className="h-3 w-3" /> {booking.guestEmail}
                                            </span>
                                            {booking.guestPhone && (
                                                <span className="text-[10px] text-muted-foreground flex items-center gap-1 font-bold">
                                                    <Phone className="h-3 w-3" /> {booking.guestPhone}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-black text-foreground">₹{Number(booking.amountPaid).toLocaleString()}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase tracking-tight mt-0.5 font-bold">Total Paid</div>
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
                                                <span className="flex items-center gap-1.5 text-emerald-500 text-xs font-black uppercase">
                                                    <CheckCircle className="h-4 w-4" /> Checked In
                                                </span>
                                                <span className="text-[10px] text-muted-foreground mt-1 pl-5 font-bold">
                                                    {new Date(booking.checkInTime!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-muted-foreground text-xs font-bold italic uppercase tracking-widest opacity-50">
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
                    <div className="p-12 text-center text-muted-foreground bg-muted/20 border-t border-border">
                        <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                        <p className="text-xl font-black text-foreground uppercase tracking-tight">No Attendees Found</p>
                    </div>
                )}
            </div>
        </div>
    );
}
