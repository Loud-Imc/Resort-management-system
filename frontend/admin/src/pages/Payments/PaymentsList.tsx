import { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '../../services/payments';
import {
    Loader2,
    Search,
    CreditCard,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCcw,
    Download,
    Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import type { Payment } from '../../types/payment';
import { useProperty } from '../../context/PropertyContext';

export default function PaymentsList() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');
    const { user } = useAuth();
    const { selectedProperty } = useProperty();
    const isAdmin = user?.roles?.some((r: any) =>
        r === 'SuperAdmin' || r === 'Admin' ||
        (typeof r === 'object' && (r.role?.name === 'SuperAdmin' || r.role?.name === 'Admin'))
    );

    const { data: payments, isLoading, refetch } = useQuery<Payment[]>({
        queryKey: ['payments', selectedProperty?.id],
        queryFn: () => paymentsService.getAll(selectedProperty?.id),
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['paymentStats', selectedProperty?.id],
        queryFn: () => paymentsService.getStats(selectedProperty?.id),
    });

    const filteredPayments = payments?.filter(payment => {
        const matchesSearch =
            payment.booking?.bookingNumber.toLowerCase().includes(search.toLowerCase()) ||
            payment.booking?.user.email.toLowerCase().includes(search.toLowerCase()) ||
            payment.razorpayPaymentId?.toLowerCase().includes(search.toLowerCase());

        if (filter === 'ALL') return matchesSearch;
        return matchesSearch && payment.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
            case 'FAILED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
            case 'REFUNDED': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
            case 'PARTIALLY_REFUNDED': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400';
            default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
        }
    };

    const getPayoutStatusColor = (status: string) => {
        switch (status) {
            case 'PAID': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'PENDING': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400';
            case 'CANCELLED': return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400';
            default: return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PAID': return <CheckCircle className="h-4 w-4" />;
            case 'PENDING': return <Clock className="h-4 w-4" />;
            case 'FAILED': return <XCircle className="h-4 w-4" />;
            case 'REFUNDED': return <RefreshCcw className="h-4 w-4" />;
            default: return <CreditCard className="h-4 w-4" />;
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Transactions</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Monitor all incoming payments and refunds</p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-colors"
                    onClick={() => toast("Export CSV simulation activated!", { icon: '📊' })}
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Volume</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                            {statsLoading ? '...' : `₹${stats?.totalVolume.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{isAdmin ? 'Platform Fees' : 'Platform Fee (Sync)'}</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                            {statsLoading ? '...' : `₹${stats?.totalFees.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                        <RefreshCcw className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{isAdmin ? 'Net Earnings' : 'Property Earnings'}</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            {statsLoading ? '...' : `₹${stats?.netEarnings.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                        <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by booking #, payment ID or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-lg focus:ring-primary-500 focus:border-primary-500 transition-colors"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                    </select>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                        <thead className="bg-gray-50 dark:bg-gray-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Booking / Property</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payout Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Status</th>
                                {isAdmin && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                            {filteredPayments?.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-gray-600 dark:text-gray-300">
                                            {payment.razorpayPaymentId || '-'}
                                        </div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">
                                            {payment.id.substring(0, 8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-primary-600 dark:text-primary-400">
                                            {payment.booking?.bookingNumber || 'N/A'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                            {payment.booking?.property?.name || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-sm">
                                        {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-1">
                                            <div className="text-xs text-gray-400 dark:text-gray-500">Total: ₹{Number(payment.amount).toFixed(2)}</div>
                                            {isAdmin ? (
                                                <>
                                                    <div className="text-xs text-rose-500 dark:text-rose-400">Fee: -₹{Number(payment.platformFee || 0).toFixed(2)}</div>
                                                    <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Net: ₹{Number(payment.netAmount || 0).toFixed(2)}</div>
                                                </>
                                            ) : (
                                                <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Earnings: ₹{Number(payment.netAmount || 0).toFixed(2)}</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getPayoutStatusColor(payment.payoutStatus)}`}>
                                            {payment.payoutStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium gap-1 ${getStatusColor(payment.status)}`}>
                                            {getStatusIcon(payment.status)}
                                            {payment.status}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                            {payment.status === 'PAID' && payment.payoutStatus === 'PENDING' && (
                                                <button
                                                    onClick={async () => {
                                                        try {
                                                            await paymentsService.confirmPayout(payment.id);
                                                            toast.success('Payout confirmed');
                                                            refetch();
                                                        } catch (error) {
                                                            toast.error('Failed to confirm payout');
                                                        }
                                                    }}
                                                    className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-200 font-medium text-xs bg-primary-50 dark:bg-primary-900/30 px-2 py-1 rounded border border-primary-200 dark:border-primary-800 transition-colors"
                                                >
                                                    Confirm Payout
                                                </button>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}

                            {filteredPayments?.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <CreditCard className="h-8 w-8 mx-auto mb-3 text-gray-300 dark:text-gray-700" />
                                        No payments found matching criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
