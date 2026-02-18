import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { bookingsService } from '../../services/bookings';
import { BookingStatus } from '../../types/booking';
import type { Booking } from '../../types/booking';
import { format } from 'date-fns';
import {
    Loader2,
    Search,
    Filter,
    LogOut,
    XCircle,
    MoreVertical,
    Calendar,
    ShieldCheck,
    X,
    User as UserIcon,
    ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function BookingsList() {
    const [statusFilter, setStatusFilter] = useState<string>('');
    const { selectedProperty } = useProperty();
    const queryClient = useQueryClient();

    const { user } = useAuth();
    const isAdmin = user?.roles?.some(r => r === 'SuperAdmin' || r === 'Admin');

    const [checkInBooking, setCheckInBooking] = useState<Booking | null>(null);

    const { data: bookings, isLoading, error } = useQuery<Booking[]>({
        queryKey: ['bookings', statusFilter, selectedProperty?.id],
        queryFn: () => bookingsService.getAll({
            status: statusFilter || undefined,
            propertyId: selectedProperty?.id
        }),
        enabled: Boolean(selectedProperty?.id || isAdmin),
    });

    const checkInMutation = useMutation({
        mutationFn: bookingsService.checkIn,
        onSuccess: () => {
            toast.success('Guest checked in successfully');
            setCheckInBooking(null);
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to check-in');
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
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            case BookingStatus.CHECKED_IN:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            case BookingStatus.CHECKED_OUT:
                return 'bg-muted text-muted-foreground';
            case BookingStatus.PENDING_PAYMENT:
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
            case BookingStatus.CANCELLED:
                return 'bg-destructive/10 text-destructive';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                Error loading bookings. Please try again.
            </div>
        );
    }

    return (
        <>
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
                        <p className="text-sm text-muted-foreground mt-1">Manage reservations and guests</p>
                    </div>
                    <Link
                        to="/bookings/create"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                        <Calendar className="h-4 w-4" />
                        New Booking
                    </Link>
                </div>

                <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                    {/* Filters */}
                    <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search by guest name or booking ID..."
                                className="w-full pl-10 pr-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-muted-foreground" />
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Booking Info
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Guest
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Room
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Dates
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-card divide-y divide-border">
                                {bookings?.map((booking: Booking) => (
                                    <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-primary">
                                                {booking.bookingNumber}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {booking.isManualBooking ? 'Manual' : 'Online'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-foreground">
                                                {booking.user.firstName} {booking.user.lastName}
                                            </div>
                                            <div className="text-sm text-muted-foreground">{booking.user.email}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">Unit {booking.room.roomNumber}</div>
                                            <div className="text-xs text-muted-foreground">{booking.room.roomType?.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-foreground">
                                                {format(new Date(booking.checkInDate), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
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
                                                        onClick={() => setCheckInBooking(booking)}
                                                        className="text-emerald-600 hover:text-emerald-700 p-1.5 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                        title="Verify & Check In"
                                                    >
                                                        <ShieldCheck className="h-4 w-4" />
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
                                                        className="text-destructive hover:text-destructive/80"
                                                        title="Cancel"
                                                    >
                                                        <XCircle className="h-4 w-4" />
                                                    </button>
                                                )}

                                                <button className="text-muted-foreground hover:text-foreground">
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
                        <div className="p-8 text-center text-muted-foreground font-medium">
                            No bookings found matching your criteria.
                        </div>
                    )}
                </div>
            </div>

            {/* Check-In Verification Modal */}
            {checkInBooking && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
                    <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <ShieldCheck className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-foreground">Guest Verification</h2>
                                    <p className="text-sm text-muted-foreground">Verify identity before check-in</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCheckInBooking(null)}
                                className="p-2 hover:bg-muted rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            if (!checkInBooking) return;
                            const formData = new FormData(e.currentTarget);
                            const guestsData = checkInBooking.guests?.map((g, idx) => ({
                                id: g.id,
                                idType: (formData.get(`guest-${idx}-idType`) as string) || undefined,
                                idNumber: (formData.get(`guest-${idx}-idNumber`) as string) || undefined,
                            })) || [];

                            checkInMutation.mutate({
                                id: checkInBooking.id,
                                data: { guests: guestsData }
                            });
                        }}>
                            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">
                                {/* Booking Info Summary */}
                                <div className="p-4 bg-muted/50 rounded-lg space-y-2 border border-border/50">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Booking Number:</span>
                                        <span className="text-foreground font-bold">{checkInBooking.bookingNumber}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground font-medium">Room:</span>
                                        <span className="text-foreground font-bold">Unit {checkInBooking.room.roomNumber} ({checkInBooking.room.roomType.name})</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                        <UserIcon className="h-4 w-4" /> Guest Details
                                    </h3>

                                    {checkInBooking.guests?.map((guest, idx) => (
                                        <div key={guest.id} className="p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-foreground">{guest.firstName} {guest.lastName}</span>
                                                {idx === 0 && <span className="bg-primary/10 text-primary text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Primary</span>}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-muted-foreground">ID Type</label>
                                                    <select
                                                        name={`guest-${idx}-idType`}
                                                        defaultValue={guest.idType || ''}
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                    >
                                                        <option value="">-- Select --</option>
                                                        <option value="AADHAR">Aadhar Card</option>
                                                        <option value="PASSPORT">Passport</option>
                                                        <option value="VOTER_ID">Voter ID</option>
                                                        <option value="DRIVING_LICENSE">Driving License</option>
                                                        <option value="OTHER">Other</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-xs font-bold text-muted-foreground">ID Number</label>
                                                    <input
                                                        type="text"
                                                        name={`guest-${idx}-idNumber`}
                                                        defaultValue={guest.idNumber || ''}
                                                        placeholder="Enter ID number"
                                                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 border-t border-border bg-muted/30 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setCheckInBooking(null)}
                                    className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl font-bold text-sm hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkInMutation.isPending}
                                    className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                                >
                                    {checkInMutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            Complete Check-In <ArrowRight className="h-4 w-4" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
