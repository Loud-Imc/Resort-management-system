import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialsService } from '../../services/financials';
import {
    Loader2,
    Users,
    CheckCircle,
    AlertCircle,
    Shield,
    ChevronRight,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function RedemptionsList() {
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { data: redemptions, isLoading, refetch } = useQuery<any[]>({
        queryKey: ['cp-redemptions', statusFilter],
        queryFn: () => financialsService.getAllRedemptions({ status: statusFilter })
    });

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await financialsService.approveRedemption(id);
            toast.success('Redemption approved successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve redemption');
        } finally {
            setProcessingId(null);
        }
    };

    const handlePayout = async (id: string) => {
        const referenceId = prompt('Enter payment reference ID:');
        if (!referenceId) return;

        try {
            setProcessingId(id);
            await financialsService.processRedemptionPayout(id, { referenceId, method: 'BANK_TRANSFER' });
            toast.success('CP payout processed successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.message || 'Failed to process payout');
        } finally {
            setProcessingId(null);
        }
    };

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
                    <h1 className="text-2xl font-bold text-foreground">CP Redemptions</h1>
                    <p className="text-muted-foreground font-bold">Financial Operations: Approve and process Channel Partner payouts</p>
                </div>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Maker-Checker Security Enforced</p>
                    <p className="text-muted-foreground italic">Wallet mutations are centralized. Direct adjustments are blocked by the system.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                {['PENDING', 'APPROVED', 'PAID'].map((status) => (
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

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Channel Partner</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested Amount</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested At</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {redemptions?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        No {statusFilter.toLowerCase()} redemptions found.
                                    </td>
                                </tr>
                            ) : (
                                redemptions?.map((r) => (
                                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Users className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{r.cp?.name}</p>
                                                    <p className="text-xs text-muted-foreground">{r.cp?.businessName}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-lg font-black text-rose-500">
                                                ₹{Number(r.amount).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4" />
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
                                                    {processingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                                                    APPROVE
                                                </button>
                                            )}
                                            {r.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handlePayout(r.id)}
                                                    disabled={processingId === r.id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                                                >
                                                    {processingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                    PAY CP
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
