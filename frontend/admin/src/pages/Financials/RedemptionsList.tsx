import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { financialsService } from '../../services/financials';
import { marketingService, RewardRedemption } from '../../services/marketing';
import {
    Loader2,
    Users,
    CheckCircle,
    AlertCircle,
    Shield,
    ChevronRight,
    Clock,
    Search,
    DollarSign,
    Gift,
    Edit2,
    X,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function RedemptionsList() {
    const [mainTab, setMainTab] = useState<'PAYOUTS' | 'REWARDS'>('PAYOUTS');
    const [statusFilter, setStatusFilter] = useState<string>('REQUESTED');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Reward Redemptions Specific State
    const [rewardFilter, setRewardFilter] = useState<string>('');
    const [isRewardModalOpen, setIsRewardModalOpen] = useState(false);
    const [currentRewardRedemption, setCurrentRewardRedemption] = useState<RewardRedemption | null>(null);
    const [rewardNotes, setRewardNotes] = useState('');

    const { data: redemptions, isLoading: isPayoutsLoading, refetch: refetchPayouts } = useQuery<any[]>({
        queryKey: ['cp-redemptions', statusFilter],
        queryFn: () => financialsService.getAllRedemptions({ status: statusFilter as any }),
        enabled: mainTab === 'PAYOUTS'
    });

    const { data: rewardRedemptions, isLoading: isRewardsLoading, refetch: refetchRewards } = useQuery<RewardRedemption[]>({
        queryKey: ['reward-redemptions', rewardFilter],
        queryFn: () => marketingService.getRewardRedemptions(rewardFilter || undefined),
        enabled: mainTab === 'REWARDS'
    });

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await financialsService.approveRedemption(id);
            toast.success('Redemption approved successfully');
            refetchPayouts();
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
            refetchPayouts();
        } catch (err: any) {
            toast.error(err.message || 'Failed to process payout');
        } finally {
            setProcessingId(null);
        }
    };

    const handleUpdateRewardStatus = async (id: string, status: RewardRedemption['status']) => {
        try {
            setProcessingId(id);
            await marketingService.updateRedemptionStatus(id, status, rewardNotes);
            toast.success(`Reward request ${status.toLowerCase()} successfully`);
            setIsRewardModalOpen(false);
            setRewardNotes('');
            refetchRewards();
        } catch (error) {
            toast.error('Failed to update reward status');
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

    if (isPayoutsLoading || isRewardsLoading) {
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
                    <p className="text-muted-foreground font-bold">Fulfillment operations for Channel Partner earnings and rewards</p>
                </div>
            </div>

            {/* Main Tabs */}
            <div className="flex p-1 bg-muted rounded-2xl w-fit border border-border">
                <button
                    onClick={() => setMainTab('PAYOUTS')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm",
                        mainTab === 'PAYOUTS' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <DollarSign className="h-4 w-4" /> Payout Requests
                </button>
                <button
                    onClick={() => setMainTab('REWARDS')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all text-sm",
                        mainTab === 'REWARDS' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Gift className="h-4 w-4" /> Reward Items
                </button>
            </div>

            {mainTab === 'PAYOUTS' && (
                <div className="space-y-6 animate-in fade-in duration-300">
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
            )}

            {mainTab === 'REWARDS' && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                        <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium text-amber-900">Reward Fulfillment</p>
                            <p className="text-xs text-amber-700/70 mt-0.5">Track and process physical item rewards claimed by partners using their loyalty points.</p>
                        </div>
                    </div>

                    <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                        {['', 'PENDING', 'PROCESSING', 'DISPATCHED', 'REJECTED'].map((status) => (
                            <button
                                key={status}
                                onClick={() => setRewardFilter(status)}
                                className={clsx(
                                    "px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest",
                                    rewardFilter === status
                                        ? "bg-card text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {status || 'All'}
                            </button>
                        ))}
                    </div>

                    <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Partner</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Item</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Cost</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Requested At</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                        <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {(rewardRedemptions || []).length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">No reward redemptions found.</td>
                                        </tr>
                                    ) : (
                                        rewardRedemptions?.map((r) => (
                                            <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4 font-bold text-sm">
                                                    {r.channelPartner.user.firstName} {r.channelPartner.user.lastName}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-8 w-8 rounded bg-muted overflow-hidden">
                                                            {r.reward.imageUrl ? <img src={r.reward.imageUrl} className="h-full w-full object-cover" /> : <Gift className="h-4 w-4 m-2 text-muted-foreground" />}
                                                        </div>
                                                        <span className="text-sm font-medium">{r.reward.name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-amber-500 font-black text-sm">
                                                    {r.reward.pointCost.toLocaleString()} pts
                                                </td>
                                                <td className="px-6 py-4 text-xs text-muted-foreground">
                                                    {format(new Date(r.createdAt), 'dd MMM, HH:mm')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                        r.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                                            r.status === 'PROCESSING' ? 'bg-blue-100 text-blue-700' :
                                                                r.status === 'DISPATCHED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                    )}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => { setCurrentRewardRedemption(r); setRewardNotes(r.notes || ''); setIsRewardModalOpen(true); }}
                                                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                                                    >
                                                        <Edit2 className="h-4 w-4 text-muted-foreground" />
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
            )}

            {/* Reward Update Modal */}
            {isRewardModalOpen && currentRewardRedemption && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-card rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-border">
                        <div className="p-6 border-b border-border flex justify-between items-center bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg"><Clock className="h-5 w-5 text-amber-600" /></div>
                                <h3 className="font-bold">Process Reward Request</h3>
                            </div>
                            <button onClick={() => setIsRewardModalOpen(false)}><X className="h-5 w-5" /></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="p-4 bg-muted/30 rounded-xl space-y-2 text-xs">
                                <div className="flex justify-between"><span className="text-muted-foreground">Partner:</span><span className="font-bold">{currentRewardRedemption.channelPartner.user.firstName} {currentRewardRedemption.channelPartner.user.lastName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Reward:</span><span className="font-bold">{currentRewardRedemption.reward.name}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Cost:</span><span className="font-bold text-amber-600">{currentRewardRedemption.reward.pointCost.toLocaleString()} pts</span></div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Internal Notes / Tracking</label>
                                <textarea value={rewardNotes} onChange={(e) => setRewardNotes(e.target.value)} placeholder="Tracking ID, shipping details..." className="w-full px-4 py-3 bg-muted/50 border-none rounded-xl text-sm min-h-[100px]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => handleUpdateRewardStatus(currentRewardRedemption.id, 'PROCESSING')} disabled={processingId === currentRewardRedemption.id} className="px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-xl">{processingId === currentRewardRedemption.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'PROCESSING'}</button>
                                <button onClick={() => handleUpdateRewardStatus(currentRewardRedemption.id, 'DISPATCHED')} disabled={processingId === currentRewardRedemption.id} className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl">DISPATCHED</button>
                                <button onClick={() => handleUpdateRewardStatus(currentRewardRedemption.id, 'REJECTED')} disabled={processingId === currentRewardRedemption.id} className="col-span-2 px-4 py-2 bg-red-100 text-red-700 text-xs font-bold rounded-xl">REJECT REQUEST</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
