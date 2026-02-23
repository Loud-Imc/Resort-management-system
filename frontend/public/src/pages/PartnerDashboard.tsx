import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { channelPartnerService } from '../services/channelPartner';
import {
    Wallet,
    TrendingUp,
    History,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft,
    Loader2,
    Copy,
    Check,
    AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useCurrency } from '../context/CurrencyContext';
import { formatPrice } from '../utils/currency';

export default function PartnerDashboard() {
    const queryClient = useQueryClient();
    const { selectedCurrency, rates } = useCurrency();
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState<number>(1000);
    const [topUpDescription, setTopUpDescription] = useState('Wallet Top-up');
    const [copied, setCopied] = useState(false);

    const { data: profile, isLoading: profileLoading } = useQuery({
        queryKey: ['cp-profile'],
        queryFn: () => channelPartnerService.getMyProfile(),
    });

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['cp-stats'],
        queryFn: () => channelPartnerService.getStats(),
    });

    const { data: transactions, isLoading: transactionsLoading } = useQuery<any[]>({
        queryKey: ['cp-transactions'],
        queryFn: () => channelPartnerService.getTransactions(),
    });

    const topUpMutation = useMutation({
        mutationFn: (data: { amount: number; description: string }) =>
            channelPartnerService.topUpWallet(data.amount, data.description),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['cp-stats'] });
            queryClient.invalidateQueries({ queryKey: ['cp-transactions'] });
            setIsTopUpModalOpen(false);
        }
    });

    const handleCopyStatus = () => {
        if (profile?.referralCode) {
            navigator.clipboard.writeText(profile.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (profileLoading || statsLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">Not Registered</h2>
                <p className="text-gray-600 mb-6">You are not registered as a Channel Partner.</p>
                <button className="bg-primary-600 text-white px-6 py-2 rounded-lg font-bold">
                    Become a Partner
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-serif">Partner Dashboard</h1>
                    <p className="text-gray-500 mt-1">Welcome back, {profile.user?.firstName || 'Partner'}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-3 flex items-center gap-4 shadow-sm">
                    <div className="text-sm">
                        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">Your Referral Code</p>
                        <p className="font-mono text-lg font-bold text-primary-900">{profile.referralCode}</p>
                    </div>
                    <button
                        onClick={handleCopyStatus}
                        className="p-2 hover:bg-gray-50 rounded-lg transition-colors text-primary-600"
                    >
                        {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="h-10 w-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600">
                        <Wallet className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Wallet Balance</p>
                        <h3 className="text-2xl font-bold">{formatPrice(Number(stats.walletBalance || 0), 'INR', rates)}</h3>
                    </div>
                    <button
                        onClick={() => setIsTopUpModalOpen(true)}
                        className="w-full py-2 bg-primary-600 text-white text-xs font-bold rounded-lg hover:bg-primary-700 transition-colors"
                    >
                        Top Up Wallet
                    </button>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="h-10 w-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Commission</p>
                        <h3 className="text-2xl font-bold">{formatPrice(Number(stats.totalCommission || 0), 'INR', rates)}</h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Earnings from referrals</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Total Bookings</p>
                        <h3 className="text-2xl font-bold">{stats.totalBookings || 0}</h3>
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium">Referrals & direct</p>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                    <div className="h-10 w-10 bg-purple-50 rounded-lg flex items-center justify-center text-purple-600">
                        <TrendingUp className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-gray-500 text-sm font-medium">Available Points</p>
                        <h3 className="text-2xl font-bold">{stats.availablePoints || 0}</h3>
                    </div>
                    <button className="text-[10px] text-purple-600 font-bold hover:underline">REDEEM POINTS</button>
                </div>
            </div>

            {/* Transactions Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <History className="h-5 w-5 text-gray-400" />
                        <h3 className="font-bold text-lg">Transaction History</h3>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {transactionsLoading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-primary-600 mx-auto" />
                                    </td>
                                </tr>
                            ) : transactions?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                transactions?.map((tx) => (
                                    <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {format(new Date(tx.createdAt), 'dd MMM yyyy, hh:mm a')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${tx.type === 'COMMISSION' ? 'bg-green-50 text-green-700' :
                                                tx.type === 'WALLET_TOPUP' ? 'bg-blue-50 text-blue-700' :
                                                    tx.type === 'WALLET_PAYMENT' ? 'bg-orange-50 text-orange-700' :
                                                        'bg-gray-50 text-gray-700'
                                                }`}>
                                                {tx.type.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-700">
                                            {tx.description}
                                        </td>
                                        <td className={`px-6 py-4 text-sm font-bold flex items-center gap-1 ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {Number(tx.amount) > 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                                            {formatPrice(Math.abs(Number(tx.amount)), 'INR', rates)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`text-[10px] font-bold ${tx.status === 'FINALIZED' ? 'text-green-600' : 'text-amber-600'
                                                }`}>
                                                {tx.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Top Up Modal (Simplified for demo) */}
            {isTopUpModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-primary-900 text-white">
                            <h3 className="font-bold text-lg">Top Up Wallet</h3>
                            <button onClick={() => setIsTopUpModalOpen(false)} className="text-white/70 hover:text-white">✕</button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">Amount ({selectedCurrency})</label>
                                <input
                                    type="number"
                                    value={topUpAmount}
                                    onChange={(e) => setTopUpAmount(Number(e.target.value))}
                                    className="w-full p-4 text-2xl font-bold bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                                <div className="flex gap-2 mt-2">
                                    {[1000, 5000, 10000, 25000].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setTopUpAmount(amt)}
                                            className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs font-bold text-gray-600 transition-colors"
                                        >
                                            +{formatPrice(amt, 'INR', rates)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-gray-600">Description</label>
                                <input
                                    type="text"
                                    value={topUpDescription}
                                    onChange={(e) => setTopUpDescription(e.target.value)}
                                    placeholder="e.g. For booking advance"
                                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                />
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-700 font-medium">
                                    In a live environment, this would redirect you to a payment gateway. For this demonstration, the balance will be added immediately.
                                </p>
                            </div>

                            <button
                                onClick={() => topUpMutation.mutate({ amount: topUpAmount, description: topUpDescription })}
                                disabled={topUpMutation.isPending}
                                className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-shadow hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {topUpMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Top Up'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
