import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentsService } from '../../services/payments';
import {
    Loader2,
    Shield,
    CheckCircle,
    AlertCircle,
    CreditCard,
    ArrowLeftCircle,
    Clock,
    Search
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import { RefundRequest } from '../../types/payment';

export default function RefundRequestsList() {
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: requests, isLoading, refetch } = useQuery<RefundRequest[]>({
        queryKey: ['refund-requests', statusFilter],
        queryFn: () => paymentsService.getAllRefundRequests({ status: statusFilter })
    });

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this refund? This will reverse the income and update the payment record.')) return;

        try {
            setProcessingId(id);
            await paymentsService.approveRefund(id);
            toast.success('Refund approved successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve refund');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredRequests = (requests || []).filter(r => {
        const search = searchTerm.toLowerCase();
        const paymentId = r.payment?.id?.toLowerCase() || '';
        const reason = (r.reason || '').toLowerCase();
        const guestEmail = (r.payment?.booking?.user?.email || '').toLowerCase();

        return paymentId.includes(search) || reason.includes(search) || guestEmail.includes(search);
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Refund Requests</h1>
                    <p className="text-muted-foreground font-bold">Financial Operations: Review and approve customer refund requests</p>
                </div>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Maker-Checker Authorization Cycle</p>
                    <p className="text-muted-foreground italic">Refunds must be requested by a Property Admin (Maker) and approved by Platform Finance (Checker).</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-end sm:items-center justify-between">
                <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit shrink-0">
                    {['PENDING', 'APPROVED', 'REJECTED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={clsx(
                                "px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest",
                                statusFilter === status
                                    ? "bg-card text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by payment ID or reason..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                    />
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Payment ID / Type</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Original Amount</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Refund Requested</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Reason</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested At</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        No {statusFilter.toLowerCase()} refund requests found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((r) => {
                                    return (
                                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                    <span className="font-bold text-foreground">#{r.payment?.id?.slice(-8)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                                                    {r.payment?.paymentMethod || 'Razorpay'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-muted-foreground">
                                            ₹{Number(r.payment?.amount || 0).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <ArrowLeftCircle className="h-4 w-4 text-rose-500" />
                                                <span className="text-lg font-black text-rose-500">
                                                    ₹{Number(r.amount).toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-muted-foreground italic line-clamp-1">{r.reason || 'No reason provided'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                {format(new Date(r.createdAt), 'dd MMM, HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {r.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleApprove(r.id)}
                                                    disabled={processingId === r.id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                >
                                                    {processingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                    APPROVE REFUND
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
