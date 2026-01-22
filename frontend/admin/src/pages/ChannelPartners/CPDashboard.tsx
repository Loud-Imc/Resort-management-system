import { useState, useEffect } from 'react';
import {
    Users, DollarSign, TrendingUp, Gift, Copy, Check,
    Loader2, Star
} from 'lucide-react';
import { channelPartnerService } from '../../services/channel-partners';
import { CPStats } from '../../types/channel-partner';

export default function CPDashboard() {
    const [stats, setStats] = useState<CPStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [registering, setRegistering] = useState(false);
    const [isCP, setIsCP] = useState(true);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        try {
            setLoading(true);
            const data = await channelPartnerService.getMyStats();
            setStats(data);
        } catch (err: any) {
            if (err.response?.status === 404) {
                setIsCP(false);
            } else {
                setError(err.message || 'Failed to load dashboard');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleRegister = async () => {
        try {
            setRegistering(true);
            await channelPartnerService.register();
            setIsCP(true);
            loadStats();
        } catch (err: any) {
            setError(err.message || 'Failed to register as Channel Partner');
        } finally {
            setRegistering(false);
        }
    };

    const copyReferralCode = () => {
        if (stats?.referralCode) {
            navigator.clipboard.writeText(stats.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    // Registration CTA for non-CP users
    if (!isCP) {
        return (
            <div className="max-w-2xl mx-auto">
                <div className="bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl p-8 text-white text-center">
                    <Star className="h-16 w-16 mx-auto mb-4 opacity-90" />
                    <h1 className="text-3xl font-bold mb-4">Become a Channel Partner</h1>
                    <p className="text-lg text-white/90 mb-6">
                        Earn commissions and points by referring guests to our properties!
                    </p>
                    <ul className="text-left max-w-md mx-auto mb-8 space-y-2">
                        <li className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-300" />
                            Get your unique referral code
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-300" />
                            Earn 5% commission on every booking
                        </li>
                        <li className="flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-300" />
                            Collect points redeemable for rewards
                        </li>
                    </ul>
                    <button
                        onClick={handleRegister}
                        disabled={registering}
                        className="px-8 py-3 bg-white text-primary-600 font-semibold rounded-lg hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                        {registering && <Loader2 className="h-4 w-4 animate-spin" />}
                        {registering ? 'Registering...' : 'Register Now'}
                    </button>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
        );
    }

    if (!stats) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Channel Partner Dashboard</h1>
                    <p className="text-gray-500">Track your referrals and earnings</p>
                </div>
            </div>

            {/* Referral Code Card */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-6 text-white">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <p className="text-white/80 text-sm mb-1">Your Referral Code</p>
                        <div className="flex items-center gap-3">
                            <span className="text-3xl font-bold tracking-wider">{stats.referralCode}</span>
                            <button
                                onClick={copyReferralCode}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
                                title="Copy to clipboard"
                            >
                                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-white/80 text-sm mb-1">Commission Rate</p>
                        <span className="text-3xl font-bold">{stats.commissionRate}%</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Earnings</p>
                            <p className="text-2xl font-bold text-gray-900">₹{stats.totalEarnings.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <DollarSign className="h-6 w-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Pending Balance</p>
                            <p className="text-2xl font-bold text-gray-900">₹{stats.pendingBalance.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                            <TrendingUp className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Total Referrals</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.totalReferrals}</p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm">Available Points</p>
                            <p className="text-2xl font-bold text-gray-900">{stats.availablePoints.toLocaleString()}</p>
                        </div>
                        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                            <Gift className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Share Your Link</h3>
                    <p className="text-gray-500 text-sm mb-4">
                        Share this link with potential guests. They'll get a discount and you'll earn commission!
                    </p>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/book?ref=${stats.referralCode}`}
                            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                        />
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/book?ref=${stats.referralCode}`);
                            }}
                            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                        >
                            Copy
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">This Month</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-500">New Referrals</span>
                            <span className="font-semibold">{stats.thisMonthReferrals}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Confirmed Bookings</span>
                            <span className="font-semibold">{stats.confirmedReferrals}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Paid Out</span>
                            <span className="font-semibold">₹{stats.paidOut.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
