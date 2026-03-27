import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialsService } from '../../services/financials';
import {
    Loader2,
    Shield,
    CheckCircle,
    AlertCircle,
    User,
    ArrowUpCircle,
    ArrowDownCircle,
    MessageSquare,
    Clock
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function AdjustmentRequestsList() {
    const [statusFilter, setStatusFilter] = useState<string>('PENDING');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { data: adjustments, isLoading, refetch } = useQuery<any[]>({
        queryKey: ['financial-adjustments', statusFilter],
        queryFn: () => financialsService.getAllAdjustments({ status: statusFilter })
    });

    const handleApprove = async (id: string) => {
        if (!confirm('Are you sure you want to approve this balance adjustment? This will directly mutate the user wallet/points.')) return;

        try {
            setProcessingId(id);
            await financialsService.approveAdjustment(id);
            toast.success('Adjustment applied successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve adjustment');
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
                    <h1 className="text-2xl font-bold text-foreground">Wallet Adjustments</h1>
                    <p className="text-muted-foreground font-bold">Financial Operations: Review and approve manual wallet/points adjustments</p>
                </div>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Maker-Checker Safety Enforced</p>
                    <p className="text-muted-foreground italic">Balance mutations require explicit approval from a separate administrator.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
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

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Target User</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Adjustment</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Reason</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested At</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {adjustments?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        No {statusFilter.toLowerCase()} adjustments found.
                                    </td>
                                </tr>
                            ) : (
                                adjustments?.map((a) => (
                                    <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="font-bold text-foreground truncate max-w-[150px]">{a.user?.firstName} {a.user?.lastName}</p>
                                                    <p className="text-[10px] text-muted-foreground">{a.type}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {a.amount > 0 ? (
                                                    <ArrowUpCircle className="h-4 w-4 text-emerald-500" />
                                                ) : (
                                                    <ArrowDownCircle className="h-4 w-4 text-rose-500" />
                                                )}
                                                <span className={clsx(
                                                    "text-lg font-black",
                                                    a.amount > 0 ? "text-emerald-500" : "text-rose-500"
                                                )}>
                                                    {a.amount > 0 ? '+' : ''}{a.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-start gap-2 max-w-[250px]">
                                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-1" />
                                                <span className="text-sm text-muted-foreground line-clamp-2">{a.reason}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-3.5 w-3.5" />
                                                {format(new Date(a.createdAt), 'dd MMM, HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {a.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleApprove(a.id)}
                                                    disabled={processingId === a.id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                >
                                                    {processingId === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                    APPROVE
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
