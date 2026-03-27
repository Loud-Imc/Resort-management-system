import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialsService } from '../../services/financials';
import {
    Loader2,
    CreditCard,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Building2,
    Shield
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function SettlementsList() {
    const [statusFilter, setStatusFilter] = useState<string>('CALCULATED');
    const [processingId, setProcessingId] = useState<string | null>(null);

    const { data: settlements, isLoading, refetch } = useQuery<any[]>({
        queryKey: ['property-settlements', statusFilter],
        queryFn: () => financialsService.getAllSettlements({ status: statusFilter }),
    });

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await financialsService.approveSettlement(id);
            toast.success('Settlement approved successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve settlement');
        } finally {
            setProcessingId(null);
        }
    };

    const handlePayout = async (id: string) => {
        const referenceId = prompt('Enter payment reference ID (e.g. Bank Transfer ID, Razorpay Payout ID):');
        if (!referenceId) return;

        try {
            setProcessingId(id);
            await financialsService.processSettlementPayout(id, { referenceId, method: 'BANK_TRANSFER' });
            toast.success('Payout processed successfully');
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
                    <h1 className="text-2xl font-bold text-foreground">Property Settlements</h1>
                    <p className="text-muted-foreground font-bold">Financial Operations: Approve and process owner payouts</p>
                </div>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Maker-Checker Security Enforced</p>
                    <p className="text-muted-foreground italic">You cannot approve settlements you calculated. You cannot process payouts you approved.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                {['CALCULATED', 'APPROVED', 'PAID'].map((status) => (
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
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Booking / Property</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Gross</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Calculated Fees</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Net Payout</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {settlements?.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        No {statusFilter.toLowerCase()} settlements found.
                                    </td>
                                </tr>
                            ) : (
                                settlements?.map((s) => (
                                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                    <span className="font-bold text-foreground">#{s.booking?.bookingNumber}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Building2 className="h-3.5 w-3.5" />
                                                    <span>{s.property?.name}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-foreground">
                                            ₹{Number(s.grossAmount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-xs space-y-0.5">
                                                <p className="text-rose-500 font-bold">- Platform: ₹{Number(s.platformFee).toLocaleString()}</p>
                                                <p className="text-rose-500 font-bold">- CP Comm: ₹{Number(s.cpCommission).toLocaleString()}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-lg font-black text-emerald-500">
                                                ₹{Number(s.netPayout).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={clsx(
                                                "px-2 py-1 text-[10px] font-black rounded shadow-sm border",
                                                s.status === 'CALCULATED' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                    s.status === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                        'bg-emerald-100 text-emerald-700 border-emerald-200'
                                            )}>
                                                {s.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {s.status === 'CALCULATED' && (
                                                <button
                                                    onClick={() => handleApprove(s.id)}
                                                    disabled={processingId === s.id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                >
                                                    {processingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                                                    APPROVE
                                                </button>
                                            )}
                                            {s.status === 'APPROVED' && (
                                                <button
                                                    onClick={() => handlePayout(s.id)}
                                                    disabled={processingId === s.id}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                                                >
                                                    {processingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                    MARK AS PAID
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

// Missing Component (Shield) from Lucide inside this file is imported as Shield in other files,
// I should make sure all imports are correct in the actual write.
