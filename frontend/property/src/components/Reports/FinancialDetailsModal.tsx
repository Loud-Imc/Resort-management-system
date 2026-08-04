import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsService } from '../../services/reports';
import { Loader2, Calendar, User, X, Info, Download } from 'lucide-react';
import { format } from 'date-fns';

interface FinancialDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'REVENUE' | 'BOOKINGS' | 'PLATFORM_FEES' | 'OCCUPANCY' | 'NET_EARNINGS' | 'GST' | null;
    dateRange: { startDate: string; endDate: string };
    propertyId?: string;
    financialReport?: any;
    occupancyReport?: any;
    totalExpenses?: number;
    gstReport?: any;
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
    cpCommission?: number;
    offlineCpCommission?: number;
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
    platformFeeDetails: any[];
}

export default function FinancialDetailsModal({ isOpen, onClose, type, dateRange, propertyId, financialReport, occupancyReport, totalExpenses, gstReport }: FinancialDetailsModalProps) {
    const [isDownloading, setIsDownloading] = useState(false);

    const { data: details, isLoading } = useQuery<DetailsResponse>({
        queryKey: ['financialDetails', dateRange, propertyId],
        queryFn: () => reportsService.getFinancialDetails(dateRange.startDate, dateRange.endDate, propertyId),
        enabled: isOpen && !!dateRange.startDate && !!dateRange.endDate && !!propertyId,
    });

    const filteredBookings = useMemo(() => {
        return details?.bookings || [];
    }, [details?.bookings]);

    const filteredIncomes = useMemo(() => {
        return details?.incomes || [];
    }, [details?.incomes]);

    const filteredPlatformFees = useMemo(() => {
        return details?.platformFeeDetails || [];
    }, [details?.platformFeeDetails]);

    const handleDownloadPdf = async () => {
        if (!type || !dateRange.startDate || !dateRange.endDate) return;
        setIsDownloading(true);
        try {
            let sectionName = '';
            if (type === 'BOOKINGS') sectionName = 'bookings_details';
            else if (type === 'REVENUE') sectionName = 'revenue_details';
            else if (type === 'PLATFORM_FEES') sectionName = 'platform_fees_details';
            
            if (sectionName) {
                await reportsService.exportPdf(dateRange.startDate, dateRange.endDate, propertyId, sectionName);
            }
        } catch (error) {
            console.error('Error downloading PDF:', error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!isOpen) return null;

    const getTitle = () => {
        switch (type) {
            case 'BOOKINGS': return `Bookings (${dateRange.startDate} to ${dateRange.endDate})`;
            case 'REVENUE': return `Revenue (${dateRange.startDate} to ${dateRange.endDate})`;
            case 'PLATFORM_FEES': return `Platform Fees (${dateRange.startDate} to ${dateRange.endDate})`;
            case 'OCCUPANCY': return `Avg. Occupancy (${dateRange.startDate} to ${dateRange.endDate})`;
            case 'NET_EARNINGS': return `Net Earnings (${dateRange.startDate} to ${dateRange.endDate})`;
            case 'GST': return `GST Collected (${dateRange.startDate} to ${dateRange.endDate})`;
            default: return `Details`;
        }
    };
    const title = getTitle();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 dark:bg-gray-900/50">
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Detailed breakdown of records</p>
                    </div>

                    {(type === 'BOOKINGS' || type === 'REVENUE' || type === 'PLATFORM_FEES') && (
                        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                            <button
                                onClick={handleDownloadPdf}
                                disabled={isDownloading}
                                className="flex items-center justify-center gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                {isDownloading ? 'Exporting...' : 'Export PDF'}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 ml-auto md:ml-0"
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
                            {type === 'BOOKINGS' ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider hidden md:table-header-group">
                                            <tr>
                                                <th className="px-4 py-3">Booking #</th>
                                                <th className="px-4 py-3">Date Created</th>
                                                <th className="px-4 py-3">Dates</th>
                                                <th className="px-4 py-3">Guest</th>
                                                <th className="px-4 py-3 text-right">Total</th>
                                                <th className="px-4 py-3 text-right">TAC</th>
                                                <th className="px-4 py-3 text-center font-bold">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredBookings?.map((b: DetailBooking) => {
                                                const tac = Number(b.cpCommission || b.offlineCpCommission || 0);
                                                return (
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
                                                        <td className="px-4 py-3 font-semibold text-gray-600 dark:text-gray-400 md:text-right">
                                                            <span className="md:hidden text-xs text-gray-400 mr-2 font-normal">TAC:</span>
                                                            {tac > 0 ? (
                                                                `₹${tac.toLocaleString()}`
                                                            ) : (
                                                                <span className="text-gray-400 dark:text-gray-500">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className="inline-flex px-2 py-1 text-[10px] font-bold rounded-md bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                                {b.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {filteredBookings.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No bookings found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : type === 'REVENUE' ? (
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
                                            {filteredIncomes?.map((i: DetailIncome) => (
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
                                            {filteredIncomes.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No revenue found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            ) : type === 'PLATFORM_FEES' ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider hidden md:table-header-group">
                                            <tr>
                                                <th className="px-4 py-3">Payment Date</th>
                                                <th className="px-4 py-3">Booking # / Guest</th>
                                                <th className="px-4 py-3 text-right">Paid Amount</th>
                                                <th className="px-4 py-3 text-right">Platform Fee</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {filteredPlatformFees?.map((p: any) => (
                                                <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 flex flex-col md:table-row p-4 md:p-0">
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                                                        {format(new Date(p.paymentDate), 'MMM dd, yyyy HH:mm')}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-gray-900 dark:text-white">#{p.booking?.bookingNumber}</div>
                                                        <div className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {p.booking?.user?.firstName} {p.booking?.user?.lastName}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-900 dark:text-white md:text-right">
                                                        ₹{Number(p.paidAmount).toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-orange-600 dark:text-orange-400 md:text-right">
                                                        ₹{Number(p.platformFee).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredPlatformFees.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No platform fees found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {(details?.platformFeeDetails?.length ?? 0) > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3 font-bold text-right text-gray-900 dark:text-white">Total Platform Fees:</td>
                                                    <td className="px-4 py-3 font-bold text-orange-600 dark:text-orange-400 text-right">₹{financialReport?.summary?.totalPlatformFees?.toLocaleString() || 0}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            ) : type === 'OCCUPANCY' ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider hidden md:table-header-group">
                                            <tr>
                                                <th className="px-4 py-3">Date</th>
                                                <th className="px-4 py-3 text-center">Occupied Rooms</th>
                                                <th className="px-4 py-3 text-center">Total Rooms</th>
                                                <th className="px-4 py-3 text-right">Occupancy Rate</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {occupancyReport?.dailyStats?.map((stat: any, index: number) => (
                                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 flex flex-col md:table-row p-4 md:p-0">
                                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                        {format(new Date(stat.date), 'MMM dd, yyyy')}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 md:text-center">
                                                        {stat.occupied}
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 md:text-center">
                                                        {stat.total}
                                                    </td>
                                                    <td className="px-4 py-3 font-bold text-sky-600 dark:text-sky-400 md:text-right">
                                                        {stat.occupancyRate}%
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!occupancyReport?.dailyStats || occupancyReport.dailyStats.length === 0) && (
                                                <tr>
                                                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">No occupancy data found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {occupancyReport?.dailyStats?.length > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <td colSpan={3} className="px-4 py-3 font-bold text-right text-gray-900 dark:text-white">Average Occupancy:</td>
                                                    <td className="px-4 py-3 font-bold text-sky-600 dark:text-sky-400 text-right">{occupancyReport.averageOccupancy}%</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            ) : type === 'NET_EARNINGS' ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden p-6 max-w-lg mx-auto mt-4">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 text-center">Net Earnings Breakdown</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Total Revenue</span>
                                            <span className="font-bold text-emerald-600">₹{financialReport?.summary?.totalIncome?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Total Expenses</span>
                                            <span className="font-bold text-red-500">- ₹{totalExpenses?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-700">
                                            <span className="text-gray-600 dark:text-gray-400 font-medium">Platform Fees</span>
                                            <span className="font-bold text-orange-500">- ₹{financialReport?.summary?.totalPlatformFees?.toLocaleString() || 0}</span>
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <span className="text-lg font-bold text-gray-900 dark:text-white">Net Earnings</span>
                                            <span className="text-xl font-black text-amber-500">₹{financialReport?.summary?.netProfit?.toLocaleString() || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : type === 'GST' ? (
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-gray-700/50 text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider hidden md:table-header-group">
                                            <tr>
                                                <th className="px-4 py-3">Booking # / Date</th>
                                                <th className="px-4 py-3">Guest Details</th>
                                                <th className="px-4 py-3 text-right">Taxable Amount</th>
                                                <th className="px-4 py-3 text-right">GST Collected</th>
                                                <th className="px-4 py-3 text-right">Gross Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                            {gstReport?.details?.map((item: any) => (
                                                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 flex flex-col md:table-row p-4 md:p-0">
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-sm text-gray-900 dark:text-white">{item.bookingNumber}</p>
                                                        <p className="text-xs text-gray-500">{format(new Date(item.date), 'MMM dd, yyyy')}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-sm text-gray-900 dark:text-white">{item.guestName}</p>
                                                        {item.gstNumber && (
                                                            <p className="text-[10px] font-bold text-primary uppercase tracking-tighter">GSTIN: {item.gstNumber}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                                                        ₹{item.taxableAmount.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                        ₹{item.taxAmount.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-extrabold text-gray-900 dark:text-white">
                                                        ₹{item.totalAmount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!gstReport?.details || gstReport.details.length === 0) && (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No GST records found for this period.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                        {gstReport?.details?.length > 0 && (
                                            <tfoot className="bg-gray-50 dark:bg-gray-700/50">
                                                <tr>
                                                    <td colSpan={2} className="px-4 py-3 font-bold text-right text-gray-900 dark:text-white">Total:</td>
                                                    <td className="px-4 py-3 font-bold text-right text-gray-700 dark:text-gray-300">₹{gstReport?.summary?.totalTaxable?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3 font-extrabold text-right text-emerald-600">₹{gstReport?.summary?.totalTax?.toLocaleString() || 0}</td>
                                                    <td className="px-4 py-3 font-black text-right text-gray-900 dark:text-white">
                                                        ₹{(Number(gstReport?.summary?.totalTaxable || 0) + Number(gstReport?.summary?.totalTax || 0))?.toLocaleString() || 0}
                                                    </td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
                                    <div className="bg-gray-100 dark:bg-gray-700/50 rounded-full p-4 mb-4">
                                        <Info className="h-8 w-8 text-gray-400" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Detailed View Coming Soon</h3>
                                    <p className="text-gray-500 max-w-sm">The detailed breakdown for this metric is not yet available in the current version of the dashboard.</p>
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
