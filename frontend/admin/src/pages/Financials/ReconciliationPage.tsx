import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialsService } from '../../services/financials';
import {
    Loader2,
    Shield,
    AlertTriangle,
    CreditCard,
    RefreshCw,
    Check
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function ReconciliationPage() {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { data: discrepancies, isLoading, refetch } = useQuery<any[]>({
        queryKey: ['financial-discrepancies'],
        queryFn: () => financialsService.getDiscrepancies()
    });

    const handleResolve = async (paymentId: string) => {
        const notes = prompt('Enter resolution notes (e.g. Verified in Razorpay Dashboard, Manual Adjustment unnecessary):');
        if (!notes) return;

        try {
            setProcessingId(paymentId);
            await financialsService.resolveDiscrepancy(paymentId, { notes });
            toast.success('Discrepancy resolved successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.message || 'Failed to resolve discrepancy');
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
                    <h1 className="text-2xl font-bold text-foreground">Financial Reconciliation</h1>
                    <p className="text-muted-foreground font-bold">Platform Integrity: Audit and resolve discrepancies between DB and Payment Gateway</p>
                </div>
                <button
                    onClick={() => refetch()}
                    className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium border border-border"
                >
                    <RefreshCw className="h-4 w-4" />
                    Refresh Audit
                </button>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Data Integrity Enforced</p>
                    <p className="text-muted-foreground italic">Reconciliation detects status mismatches between Razorpay and our ledger. Resolution requires audit-ready notes.</p>
                </div>
            </div>

            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/20">
                    <h3 className="font-bold text-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Detected Discrepancies
                    </h3>
                    <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full font-black border border-amber-200">
                        {discrepancies?.length || 0} ITEMS REQUIRES ATTENTION
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Payment ID</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Platform Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Gateway Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Recorded At</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {discrepancies?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                                <Check className="h-8 w-8 text-emerald-600" />
                                            </div>
                                            <p className="text-lg font-bold text-foreground">Ledger is Synchronized</p>
                                            <p className="text-sm text-muted-foreground italic">No status mismatches detected between DB and Gateway.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                discrepancies?.map((d) => (
                                    <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                <span className="font-bold text-foreground">#{d.id?.slice(-8)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-[10px] font-black rounded shadow-sm border bg-card text-muted-foreground uppercase border-border">
                                                {d.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-[10px] font-black rounded shadow-sm border bg-amber-100 text-amber-700 uppercase border-amber-200">
                                                {d.gatewayStatus || 'UNKNOWN'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {format(new Date(d.createdAt), 'dd MMM, HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleResolve(d.id)}
                                                disabled={processingId === d.id}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                                            >
                                                {processingId === d.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                                RESOLVE
                                            </button>
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
