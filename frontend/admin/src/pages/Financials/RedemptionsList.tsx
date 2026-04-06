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
    Clock,
    Search
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function RedemptionsList() {
    const [statusFilter, setStatusFilter] = useState<string>('REQUESTED');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: redemptions, isLoading, refetch } = useQuery<any[]>({
        queryKey: ['cp-redemptions', statusFilter],
        queryFn: () => financialsService.getAllRedemptions({ status: statusFilter as any })
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

    const filteredRedemptions = (redemptions || []).filter(r => {
        const search = searchTerm.toLowerCase();
        const partnerName = (r.channelPartner?.authorizedPersonName ||
            `${r.channelPartner?.user?.firstName} ${r.channelPartner?.user?.lastName}`).toLowerCase();
        const orgName = (r.channelPartner?.organizationName || '').toLowerCase();
        const refId = (r.referenceId || '').toLowerCase();

        return partnerName.includes(search) || orgName.includes(search) || refId.includes(search);
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
                    <h1 className="text-2xl font-bold text-foreground">CP Redemptions</h1>
                    <p className="text-muted-foreground font-bold">Financial Operations: Approve and process Channel Partner payouts</p>
                </div>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Maker-Checker Security Enforced</p>
                    <p className="text-muted-foreground italic">Wallet mutations are centralized. Direct adjustments are blocked by the system.</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-end sm:items-center justify-between">
                <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit shrink-0">
                    {['REQUESTED', 'APPROVED', 'PAID'].map((status) => (
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
                            {status === 'REQUESTED' ? 'PENDING' : status}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search by partner name or ref ID..."
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
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Channel Partner</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested Amount</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested At</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">{statusFilter === 'PAID' ? 'Payout Info' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRedemptions.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        No {statusFilter.toLowerCase()} redemptions found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredRedemptions.map((r) => {
                                    return (
                                        <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Users className="h-5 w-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">
                                                        {r.channelPartner?.authorizedPersonName ||
                                                            `${r.channelPartner?.user?.firstName} ${r.channelPartner?.user?.lastName}`}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {r.channelPartner?.organizationName || 'Individual Partner'}
                                                    </p>
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
                                            {r.status === 'PAID' ? (
                                                <div className="text-[10px] space-y-1">
                                                    <p className="font-bold text-foreground">Ref: <span className="text-primary">{r.referenceId || 'N/A'}</span></p>
                                                    <p className="text-muted-foreground italic">
                                                        {format(new Date(r.updatedAt), 'dd MMM yyyy')}
                                                    </p>
                                                    {r.payoutBy && (
                                                        <p className="text-muted-foreground">by {r.payoutBy.firstName}</p>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    {r.status === 'REQUESTED' && (
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
                                                </>
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
