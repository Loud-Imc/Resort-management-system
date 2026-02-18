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
import type { Payment } from '../../types/payment';
import { useProperty } from '../../context/PropertyContext';

export default function PaymentsList() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');
    const { selectedProperty } = useProperty();

    const { data: payments, isLoading } = useQuery<Payment[]>({
        queryKey: ['payments', selectedProperty?.id],
        queryFn: () => paymentsService.getAll(selectedProperty?.id),
        enabled: !!selectedProperty?.id,
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['paymentStats', selectedProperty?.id],
        queryFn: () => paymentsService.getStats(selectedProperty?.id),
        enabled: !!selectedProperty?.id,
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
                    <h1 className="text-2xl font-bold text-foreground">Payment Transactions</h1>
                    <p className="text-sm text-muted-foreground mt-1">Monitor all payments for your property</p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted bg-card shadow-sm transition-colors"
                    onClick={() => toast("Export CSV simulation activated!", { icon: '📊' })}
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Total Volume</p>
                        <p className="text-2xl font-bold text-foreground mt-1">
                            {statsLoading ? '...' : `₹${stats?.totalVolume.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Platform Fee</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
                            {statsLoading ? '...' : `₹${stats?.totalFees.toLocaleString()}`}
                        </p>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-900/20 rounded-lg">
                        <RefreshCcw className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                    </div>
                </div>

                <div className="bg-card p-6 rounded-xl shadow-sm border border-border flex items-center justify-between transition-colors">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Property Earnings</p>
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by booking #, payment ID or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-muted-foreground" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="border border-border bg-background text-foreground rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary focus:outline-none transition-colors"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                    </select>
                </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Booking</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Amount Details</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payout Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {filteredPayments?.map((payment) => (
                                <tr key={payment.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-muted-foreground">
                                            {payment.razorpayPaymentId || '-'}
                                        </div>
                                        <div className="text-xs text-muted-foreground/50 font-mono mt-1">
                                            {payment.id.substring(0, 8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-primary">
                                            {payment.booking?.bookingNumber || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                        {format(new Date(payment.createdAt), 'MMM d, yyyy')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="space-y-1">
                                            <div className="text-xs text-muted-foreground">Total: ₹{Number(payment.amount).toFixed(2)}</div>
                                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Earnings: ₹{Number(payment.netAmount || 0).toFixed(2)}</div>
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
                                </tr>
                            ))}

                            {filteredPayments?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                        <CreditCard className="h-8 w-8 mx-auto mb-3 opacity-30" />
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
