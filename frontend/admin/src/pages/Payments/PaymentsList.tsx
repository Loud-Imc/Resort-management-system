import { useState } from 'react';
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

export default function PaymentsList() {
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'FAILED' | 'REFUNDED'>('ALL');

    const { data: payments, isLoading } = useQuery<Payment[]>({
        queryKey: ['payments'],
        queryFn: paymentsService.getAll,
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
            case 'PAID': return 'bg-green-100 text-green-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'FAILED': return 'bg-red-100 text-red-800';
            case 'REFUNDED': return 'bg-purple-100 text-purple-800';
            case 'PARTIALLY_REFUNDED': return 'bg-pink-100 text-pink-800';
            default: return 'bg-gray-100 text-gray-800';
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
                    <h1 className="text-2xl font-bold text-gray-900">Payment Transactions</h1>
                    <p className="text-sm text-gray-500 mt-1">Monitor all incoming payments and refunds</p>
                </div>
                <button
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
                    onClick={() => alert("Simulate Export CSV")}
                >
                    <Download className="h-4 w-4" />
                    Export CSV
                </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by booking #, payment ID or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5 text-gray-400" />
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as any)}
                        className="border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="PAID">Paid</option>
                        <option value="PENDING">Pending</option>
                        <option value="FAILED">Failed</option>
                        <option value="REFUNDED">Refunded</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking / User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredPayments?.map((payment) => (
                                <tr key={payment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-mono text-gray-600">
                                            {payment.razorpayPaymentId || '-'}
                                        </div>
                                        <div className="text-xs text-gray-400 font-mono mt-1">
                                            {payment.id.substring(0, 8)}...
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-primary-600">
                                            {payment.booking?.bookingNumber || 'N/A'}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {payment.booking?.user.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {format(new Date(payment.createdAt), 'MMM d, yyyy HH:mm')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {payment.paymentMethod ? (
                                            <span className="uppercase">{payment.paymentMethod}</span>
                                        ) : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-bold text-gray-900">
                                            ₹ {Number(payment.amount).toFixed(2)}
                                        </div>
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
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        <CreditCard className="h-8 w-8 mx-auto mb-3 text-gray-300" />
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
