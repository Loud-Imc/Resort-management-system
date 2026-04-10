import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../services/reports';
import { Loader2, Calendar, User, X } from 'lucide-react';
import { format } from 'date-fns';

interface FinancialDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'REVENUE' | 'BOOKINGS' | null;
    dateRange: { startDate: string; endDate: string };
    propertyId?: string;
}

interface DetailBooking {
    id: string;
    bookingNumber: string;
    checkInDate: string;
    checkOutDate: string;
    totalAmount: number;
    status: string;
    createdAt: string;
    user: {
        firstName: string;
        lastName: string;
    };
}

interface DetailIncome {
    id: string;
    amount: number;
    source: string;
    description: string;
    date: string;
    booking?: {
        bookingNumber: string;
        user: {
            firstName: string;
            lastName: string;
        };
    };
}

interface DetailsResponse {
    bookings: DetailBooking[];
    incomes: DetailIncome[];
}

export default function FinancialDetailsModal({ isOpen, onClose, type, dateRange, propertyId }: FinancialDetailsModalProps) {
    const { data: details, isLoading } = useQuery<DetailsResponse>({
        queryKey: ['financialDetails', dateRange, propertyId],
        queryFn: () => reportsService.getFinancialDetails(dateRange.startDate, dateRange.endDate, propertyId),
        enabled: isOpen && !!dateRange.startDate && !!dateRange.endDate && !!propertyId,
    });

    if (!isOpen) return null;

    const isBookings = type === 'BOOKINGS';
    const title = isBookings ? `Bookings (${dateRange.startDate} to ${dateRange.endDate})` : `Revenue (${dateRange.startDate} to ${dateRange.endDate})`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Detailed breakdown of records</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800/50 p-4 min-h-[400px]">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                            <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
                            <p className="text-gray-500 font-medium">Loading details...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {isBookings ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider hidden md:table-header-group">
                                            <tr>
                                                <th className="px-4 py-3">Booking #</th>
                                                <th className="px-4 py-3">Date Created</th>
                                                <th className="px-4 py-3">Dates</th>
                                                <th className="px-4 py-3">Guest</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {details?.bookings?.map((b: DetailBooking) => (
                                                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 flex flex-col md:table-row p-4 md:p-0">
                                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                                        #{b.bookingNumber}
                                                        <span className="md:hidden ml-2 text-xs font-normal text-gray-500 flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(b.createdAt), 'MMM dd, yyyy HH:mm')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">
                                                        {format(new Date(b.createdAt), 'MMM dd, yyyy HH:mm')}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                        <div className="flex items-center gap-1 text-xs whitespace-nowrap">
                                                            <Calendar className="h-3 w-3" />
                                                            {format(new Date(b.checkInDate), 'MMM dd')} - {format(new Date(b.checkOutDate), 'MMM dd')}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <User className="h-3.5 w-3.5 text-gray-400" />
                                                            <span className="font-medium text-gray-900 dark:text-white">{b.user?.firstName} {b.user?.lastName}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-gray-900 dark:text-white md:text-right">
                                                        ₹{Number(b.totalAmount).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!details?.bookings || details.bookings.length === 0) && (
                                                <tr>
                                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No bookings found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider hidden md:table-header-group">
                                            <tr>
                                                <th className="px-4 py-3">Date Received</th>
                                                <th className="px-4 py-3">Source</th>
                                                <th className="px-4 py-3">Description</th>
                                                <th className="px-4 py-3 text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {details?.incomes?.map((i: DetailIncome) => (
                                                <tr key={i.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 flex flex-col md:table-row p-4 md:p-0">
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                        {format(new Date(i.date), 'MMM dd, yyyy HH:mm')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] uppercase font-bold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                                            {i.source.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white max-w-xs truncate">
                                                        {i.description}
                                                        {i.booking && (
                                                            <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                                <User className="h-3 w-3" />
                                                                {i.booking.user?.firstName} {i.booking.user?.lastName} (Booking #{i.booking?.bookingNumber})
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400 md:text-right">
                                                        ₹{Number(i.amount).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!details?.incomes || details.incomes.length === 0) && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No revenue found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 transition-colors shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
