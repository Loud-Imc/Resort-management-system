import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financialsService } from '../../services/financials';
import { bookingsService } from '../../services/bookings';
import {
    Loader2,
    CreditCard,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Building2,
    Shield,
    Calculator,
    Search
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import clsx from 'clsx';

export default function SettlementsList() {
    const [statusFilter, setStatusFilter] = useState<string>('ELIGIBLE');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const queryClient = useQueryClient();

    const { data: listData, isLoading, refetch } = useQuery<any[]>({
        queryKey: ['financial-data', statusFilter],
        queryFn: async () => {
            if (statusFilter === 'ELIGIBLE') {
                const bookings = await bookingsService.getAll({ 
                    status: 'CHECKED_OUT',
                    hasSettlement: 'false' as any // Use string 'false' as it's passed to Query param
                });
                return (bookings || []).filter((b: any) => b.paymentStatus === 'FULL');
            }
            const settlements = await financialsService.getAllSettlements({ status: statusFilter as any });
            // Strict filter to ensure Paid data doesn't bleed into Calculated tab if backend returns it
            return (settlements || []).filter((s: any) => s.status === statusFilter);
        },
    });

    const calculateMutation = useMutation({
        mutationFn: (bookingId: string) => financialsService.calculateSettlement(bookingId),
        onSuccess: () => {
            toast.success('Settlement calculated successfully');
            queryClient.invalidateQueries({ queryKey: ['financial-data'] });
            setStatusFilter('CALCULATED');
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to calculate settlement');
        }
    });

    const handleApprove = async (id: string) => {
        try {
            setProcessingId(id);
            await financialsService.approveSettlement(id);
            toast.success('Settlement approved successfully');
            refetch();
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to approve settlement');
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
            toast.error(err.response?.data?.message || err.message || 'Failed to process payout');
        } finally {
            setProcessingId(null);
        }
    };

    const filteredData = (listData || []).filter(item => {
        const search = searchTerm.toLowerCase();
        const isBooking = statusFilter === 'ELIGIBLE';
        const bookingNumber = isBooking ? item.bookingNumber : item.booking?.bookingNumber;
        const propertyName = isBooking ? (item.property?.name || '') : (item.property?.name || '');
        const refId = (item.referenceId || '').toLowerCase();

        return (bookingNumber?.toLowerCase().includes(search)) || 
               (propertyName?.toLowerCase().includes(search)) || 
               refId.includes(search);
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
                    <h1 className="text-2xl font-bold text-foreground">Property Settlements</h1>
                    <p className="text-muted-foreground font-bold">Financial Operations: Approve and process owner payouts</p>
                </div>
            </div>

            {/* Pillar Status Info */}
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl flex items-start gap-3 shadow-sm">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div className="text-sm">
                    <p className="font-bold text-primary">Maker-Checker Security Enforced</p>
                    <p className="text-muted-foreground italic">You cannot approve settlements you calculated. You cannot process payouts you approved.</p>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-end sm:items-center justify-between">
                <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit overflow-x-auto max-w-full shrink-0">
                    {['ELIGIBLE', 'CALCULATED', 'APPROVED', 'PAID'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={clsx(
                                "px-4 py-2 text-xs font-black rounded-lg transition-all uppercase tracking-widest whitespace-nowrap",
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
                        placeholder="Search by booking # or property..."
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
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Booking / Property</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Gross</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Calculated Fees</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Net Payout</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground">Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground text-right">{statusFilter === 'PAID' ? 'Payout Info' : 'Actions'}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground italic">
                                        <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                        No {statusFilter.toLowerCase()} items found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredData.map((item) => {
                                    const isBooking = statusFilter === 'ELIGIBLE';
                                    const id = item.id;
                                    const bookingNumber = isBooking ? item.bookingNumber : item.booking?.bookingNumber;
                                    const propertyName = isBooking ? (item.property?.name || 'N/A') : item.property?.name;
                                    const gross = isBooking ? item.totalAmount : item.grossAmount;
                                    const status = isBooking ? 'PENDING' : item.status;

                                    return (
                                        <tr key={id} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                                                        <span className="font-bold text-foreground">#{bookingNumber}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Building2 className="h-3.5 w-3.5" />
                                                        <span>{propertyName}</span>
                                                        {isBooking && item.paymentOption === 'PARTIAL' && (
                                                            <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-black rounded border border-amber-200">
                                                                PARTIAL
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-bold text-foreground">
                                                    ₹{Number(gross).toLocaleString()}
                                                </div>
                                                {isBooking && (
                                                    <div className="text-[10px] text-amber-600 font-bold">
                                                        Held: ₹{Number((item.payments || [])
                                                            .filter((p: any) => p.payoutStatus === 'PENDING')
                                                            .reduce((acc: number, p: any) => acc + Number(p.amount), 0)
                                                        ).toLocaleString()}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isBooking ? (
                                                    <span className="text-xs text-muted-foreground italic">Pending calculation</span>
                                                ) : (
                                                    <div className="text-xs space-y-0.5">
                                                        <p className="text-amber-600 font-bold">Held: ₹{Number(item.collectedAmount || 0).toLocaleString()}</p>
                                                        <p className="text-rose-500 font-medium">- Fee: ₹{Number(item.platformFee).toLocaleString()}</p>
                                                        <p className="text-rose-500 font-medium">- CP: ₹{Number(item.cpCommission).toLocaleString()}</p>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                {isBooking ? (
                                                    <span className="text-muted-foreground">--</span>
                                                ) : (
                                                    <span className={clsx(
                                                        "text-lg font-black",
                                                        Number(item.netPayout) >= 0 ? "text-emerald-500" : "text-rose-500"
                                                    )}>
                                                        {Number(item.netPayout) < 0 ? '-' : ''}₹{Math.abs(Number(item.netPayout)).toLocaleString()}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-2 py-1 text-[10px] font-black rounded shadow-sm border",
                                                    status === 'PENDING' ? 'bg-slate-100 text-slate-700 border-slate-200' :
                                                        status === 'CALCULATED' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                            status === 'APPROVED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                )}>
                                                    {status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {status === 'PAID' ? (
                                                    <div className="text-[10px] space-y-1">
                                                        <p className="font-bold text-foreground">Ref: <span className="text-primary">{item.referenceId || 'N/A'}</span></p>
                                                        <p className="text-muted-foreground italic">
                                                            {item.processedAt ? format(new Date(item.processedAt), 'dd MMM yyyy') : 'N/A'}
                                                        </p>
                                                        {item.payoutBy && (
                                                            <p className="text-muted-foreground">by {item.payoutBy.firstName}</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {isBooking && (
                                                            <button
                                                                onClick={() => calculateMutation.mutate(item.id)}
                                                                disabled={calculateMutation.isPending}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-xs font-black hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 disabled:opacity-50"
                                                            >
                                                                {calculateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Calculator className="h-3 w-3" />}
                                                                CALCULATE
                                                            </button>
                                                        )}
                                                        {status === 'CALCULATED' && (
                                                            <button
                                                                onClick={() => handleApprove(id)}
                                                                disabled={processingId === id}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-black hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                                                            >
                                                                {processingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <ChevronRight className="h-3 w-3" />}
                                                                APPROVE
                                                            </button>
                                                        )}
                                                        {status === 'APPROVED' && (
                                                            <button
                                                                onClick={() => handlePayout(id)}
                                                                disabled={processingId === id}
                                                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-black hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 disabled:opacity-50"
                                                            >
                                                                {processingId === id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                                                                MARK AS PAID
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

// Missing Component (Shield) from Lucide inside this file is imported as Shield in other files,
// I should make sure all imports are correct in the actual write.
