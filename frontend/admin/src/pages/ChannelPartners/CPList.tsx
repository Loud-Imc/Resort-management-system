import { useState, useEffect } from 'react';
import {
    Users, Loader2, CheckCircle, XCircle, DollarSign, Percent,
    Eye, X, Calendar, ArrowRight, TrendingUp, Hash, Search, Filter
} from 'lucide-react';
import { channelPartnerService } from '../../services/channel-partners';
import { financialsService } from '../../services/financials';
import { ChannelPartner, CPPartnerDetails, CPReferralBooking } from '../../types/channel-partner';
import toast from 'react-hot-toast';

export default function CPList() {
    const [partners, setPartners] = useState<ChannelPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingDiscountId, setEditingDiscountId] = useState<string | null>(null);
    const [newRate, setNewRate] = useState('');
    const [newDiscountRate, setNewDiscountRate] = useState('');

    // Detail drawer
    const [selectedPartner, setSelectedPartner] = useState<CPPartnerDetails | null>(null);
    const [drawerLoading, setDrawerLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'bookings' | 'transactions'>('bookings');
    const [transactions, setTransactions] = useState<any[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE'>('ALL');

    // Adjustment Modal
    const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
    const [adjustPartner, setAdjustPartner] = useState<ChannelPartner | null>(null);
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustDescription, setAdjustDescription] = useState('Admin adjustment');
    const [isAdjusting, setIsAdjusting] = useState(false);

    useEffect(() => {
        loadPartners();
    }, []);

    const loadPartners = async () => {
        try {
            setLoading(true);
            const response = await channelPartnerService.getAll();
            setPartners(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load channel partners');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async (partner: ChannelPartner) => {
        try {
            const newStatus = partner.status === 'APPROVED' ? 'INACTIVE' : 'APPROVED';
            await channelPartnerService.updateStatus(partner.id, newStatus as any);
            setPartners(partners.map(p =>
                p.id === partner.id ? { ...p, status: newStatus as any } : p
            ));
            toast.success(`Partner ${newStatus === 'APPROVED' ? 'enabled' : 'disabled'} successfully`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED' | 'INACTIVE') => {
        try {
            await channelPartnerService.updateStatus(id, status);
            setPartners(partners.map(p =>
                p.id === id ? { ...p, status } : p
            ));
            toast.success(`Partner ${status.toLowerCase()} successfully`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update status');
        }
    };

    const handleUpdateRate = async (id: string) => {
        try {
            const rate = parseFloat(newRate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                toast.error('Please enter a valid rate between 0 and 100');
                return;
            }

            await channelPartnerService.updateCommissionRate(id, rate);
            toast.success('Commission rate updated successfully');
            setPartners(partners.map(p =>
                p.id === id ? { ...p, commissionRate: rate } : p
            ));
            setEditingId(null);
            setNewRate('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update rate');
        }
    };

    const handleUpdateDiscountRate = async (id: string) => {
        try {
            const rate = parseFloat(newDiscountRate);
            if (isNaN(rate) || rate < 0 || rate > 100) {
                toast.error('Please enter a valid rate between 0 and 100');
                return;
            }

            await channelPartnerService.updateReferralDiscountRate(id, rate);
            toast.success('Customer discount updated successfully');
            setPartners(partners.map(p =>
                p.id === id ? { ...p, referralDiscountRate: rate } : p
            ));
            setEditingDiscountId(null);
            setNewDiscountRate('');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update discount');
        }
    };

    const openPartnerDetails = async (partnerId: string) => {
        try {
            setDrawerLoading(true);
            setSelectedPartner(null);
            setActiveTab('bookings');
            const details = await channelPartnerService.getPartnerDetails(partnerId);
            setSelectedPartner(details);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load partner details');
        } finally {
            setDrawerLoading(false);
        }
    };

    const loadTransactions = async (partnerId: string) => {
        try {
            setTxLoading(true);
            const data = await channelPartnerService.getTransactions(partnerId);
            setTransactions(data);
        } catch (err: any) {
            toast.error(err.message || 'Failed to load transactions');
        } finally {
            setTxLoading(false);
        }
    };

    useEffect(() => {
        if (selectedPartner && activeTab === 'transactions') {
            loadTransactions(selectedPartner.id);
        }
    }, [selectedPartner, activeTab]);

    const handleAdjustWallet = async () => {
        if (!adjustPartner) return;
        const amount = parseFloat(adjustAmount);
        if (isNaN(amount) || amount === 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsAdjusting(true);
            await financialsService.createAdjustment({
                targetId: adjustPartner.id,
                amount,
                type: 'WALLET',
                reason: adjustDescription
            });
            toast.success('Wallet adjustment request submitted for approval');

            setIsAdjustModalOpen(false);
            setAdjustAmount('');
            setAdjustDescription('Admin adjustment');
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit adjustment request');
        } finally {
            setIsAdjusting(false);
        }
    };

    const closeDrawer = () => {
        setSelectedPartner(null);
        setDrawerLoading(false);
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            CONFIRMED: 'bg-green-100 text-green-700',
            CHECKED_IN: 'bg-blue-100 text-blue-700',
            CHECKED_OUT: 'bg-gray-100 text-gray-700',
            CANCELLED: 'bg-red-100 text-red-700',
            PENDING: 'bg-amber-100 text-amber-700',
        };
        return styles[status] || 'bg-gray-100 text-gray-600';
    };

    const filteredPartners = partners.filter(partner => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            partner.user?.firstName?.toLowerCase().includes(search) ||
            partner.user?.lastName?.toLowerCase().includes(search) ||
            partner.user?.email?.toLowerCase().includes(search) ||
            partner.referralCode?.toLowerCase().includes(search);

        const matchesStatus = statusFilter === 'ALL' || partner.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Channel Partners</h1>
                    <p className="text-muted-foreground text-sm font-medium">Manage all channel partners, commission rates, and payouts</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search partners..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="border border-border bg-background text-foreground rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all min-w-[120px]"
                        >
                            <option value="ALL">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}

            {/* Partners Table */}
            {partners.length === 0 ? (
                <div className="bg-card rounded-xl shadow-sm p-12 text-center border border-border">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No channel partners yet</h3>
                    <p className="text-muted-foreground mt-1">Channel partners will appear here once they register.</p>
                </div>
            ) : (
                <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Partner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Referral Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Comm. Rate</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cust. Disc.</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Wallet</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Earnings</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Referrals</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredPartners.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground italic font-medium">
                                        No partners matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredPartners.map(partner => {
                                    return (
                                        <tr key={partner.id} className="hover:bg-muted/30">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-foreground">
                                                    {partner.user?.firstName} {partner.user?.lastName}
                                                </div>
                                                <div className="text-sm text-muted-foreground">{partner.user?.email}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono bg-muted px-2 py-1 rounded text-sm text-foreground border border-border">
                                                {partner.referralCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingId === partner.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={newRate}
                                                        onChange={(e) => setNewRate(e.target.value)}
                                                        className="w-20 px-2 py-1 border border-input rounded bg-background text-foreground"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateRate(partner.id)}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingId(null); setNewRate(''); }}
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setEditingId(partner.id); setNewRate(partner.commissionRate.toString()); }}
                                                    className="flex items-center gap-1 text-foreground hover:text-primary transition-colors"
                                                >
                                                    <Percent className="h-4 w-4 text-blue-500" />
                                                    {partner.commissionRate}%
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {editingDiscountId === partner.id ? (
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        value={newDiscountRate}
                                                        onChange={(e) => setNewDiscountRate(e.target.value)}
                                                        className="w-20 px-2 py-1 border border-input rounded bg-background text-foreground"
                                                        min="0"
                                                        max="100"
                                                        step="0.5"
                                                    />
                                                    <button
                                                        onClick={() => handleUpdateDiscountRate(partner.id)}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        <CheckCircle className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingDiscountId(null); setNewDiscountRate(''); }}
                                                        className="text-muted-foreground hover:text-foreground"
                                                    >
                                                        <XCircle className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setEditingDiscountId(partner.id); setNewDiscountRate((partner.referralDiscountRate || 0).toString()); }}
                                                    className="flex items-center gap-1 text-foreground hover:text-primary transition-colors"
                                                >
                                                    <Percent className="h-4 w-4 text-green-500" />
                                                    {partner.referralDiscountRate || 0}%
                                                </button>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-foreground font-bold">
                                                <DollarSign className="h-4 w-4 text-primary" />
                                                ₹{partner.walletBalance?.toLocaleString() || 0}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 text-foreground">
                                                <DollarSign className="h-4 w-4 text-green-600" />
                                                ₹{partner.totalEarnings.toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-foreground">{partner._count?.referrals || 0}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${partner.status === 'APPROVED'
                                                ? 'bg-green-100 text-green-700'
                                                : partner.status === 'PENDING'
                                                    ? 'bg-amber-100 text-amber-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {partner.status.charAt(0) + partner.status.slice(1).toLowerCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => {
                                                        setAdjustPartner(partner);
                                                        setIsAdjustModalOpen(true);
                                                    }}
                                                    className="text-xs bg-primary-50 text-primary-600 px-2 py-1 rounded hover:bg-primary-100 font-bold"
                                                    title="Adjust Wallet"
                                                >
                                                    Wallet
                                                </button>
                                                <button
                                                    onClick={() => openPartnerDetails(partner.id)}
                                                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                                                    title="View Details"
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </button>
                                                {partner.status === 'PENDING' ? (
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleUpdateStatus(partner.id, 'APPROVED')}
                                                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(partner.id, 'REJECTED')}
                                                            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => handleToggleActive(partner)}
                                                        className={`text-sm ${partner.status === 'APPROVED'
                                                            ? 'text-red-600 hover:text-red-700'
                                                            : 'text-green-600 hover:text-green-700'
                                                            }`}
                                                    >
                                                        {partner.status === 'APPROVED' ? 'Disable' : 'Enable'}
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ===== Detail Drawer ===== */}
            {(selectedPartner || drawerLoading) && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDrawer} />

                    {/* Drawer */}
                    <div className="relative w-full max-w-2xl bg-card shadow-2xl overflow-y-auto animate-slide-in-right border-l border-border">
                        {drawerLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : selectedPartner && (
                            <>
                                {/* Drawer Header */}
                                <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10">
                                    <div>
                                        <h2 className="text-lg font-bold text-foreground">
                                            {selectedPartner.user?.firstName} {selectedPartner.user?.lastName}
                                        </h2>
                                        <p className="text-sm text-muted-foreground">{selectedPartner.user?.email}</p>
                                    </div>
                                    <button onClick={closeDrawer} className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Partner Info Row */}
                                    <div className="flex flex-wrap gap-3">
                                        <InfoBadge icon={<Hash className="h-3.5 w-3.5" />} label="Referral Code" value={selectedPartner.referralCode} />
                                        <InfoBadge icon={<Percent className="h-3.5 w-3.5 text-blue-500" />} label="Commission" value={`${selectedPartner.commissionRate}%`} />
                                        <InfoBadge icon={<Percent className="h-3.5 w-3.5 text-green-500" />} label="Customer Discount" value={`${selectedPartner.referralDiscountRate || 0}%`} />
                                        <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${selectedPartner.status === 'APPROVED'
                                            ? 'bg-green-100 text-green-700'
                                            : selectedPartner.status === 'PENDING'
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-red-100 text-red-700'}`}>
                                            {selectedPartner.status === 'APPROVED' ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                            {selectedPartner.status.charAt(0) + selectedPartner.status.slice(1).toLowerCase()}
                                        </span>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        <StatCard label="Total Earnings" value={`₹${selectedPartner.totalEarnings.toLocaleString()}`} icon={<DollarSign className="h-5 w-5 text-green-600" />} bg="bg-green-100 dark:bg-green-900/30" />
                                        <StatCard label="Pending" value={`₹${selectedPartner.pendingBalance.toLocaleString()}`} icon={<TrendingUp className="h-5 w-5 text-amber-600" />} bg="bg-amber-100 dark:bg-amber-900/30" />
                                        <StatCard label="Total Referrals" value={selectedPartner.totalReferrals.toString()} icon={<Users className="h-5 w-5 text-blue-600" />} bg="bg-blue-100 dark:bg-blue-900/30" />
                                        <StatCard label="This Month" value={selectedPartner.thisMonthReferrals.toString()} icon={<Calendar className="h-5 w-5 text-purple-600" />} bg="bg-purple-100 dark:bg-purple-900/30" />
                                    </div>

                                    {/* Extra Details */}
                                    <div className="grid grid-cols-2 gap-4 bg-muted/50 rounded-xl p-4 text-sm border border-border">
                                        <div>
                                            <span className="text-muted-foreground">Confirmed Referrals</span>
                                            <p className="font-semibold text-foreground">{selectedPartner.confirmedReferrals}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Paid Out</span>
                                            <p className="font-semibold text-foreground">₹{selectedPartner.paidOut.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Total Points</span>
                                            <p className="font-semibold text-gray-900">{selectedPartner.totalPoints.toLocaleString()}</p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Available Points</span>
                                            <p className="font-semibold text-gray-900">{selectedPartner.availablePoints.toLocaleString()}</p>
                                        </div>
                                        {selectedPartner.user?.phone && (
                                            <div>
                                                <span className="text-gray-500">Phone</span>
                                                <p className="font-semibold text-gray-900">{selectedPartner.user.phone}</p>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-gray-500">Joined</span>
                                            <p className="font-semibold text-gray-900">
                                                {new Date(selectedPartner.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-gray-500">Registration Fee</span>
                                            <p className="font-semibold text-gray-900">
                                                {selectedPartner.registrationFeePaid ? (
                                                    <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs">Paid</span>
                                                ) : (
                                                    <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-xs">Unpaid</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>

                                    {/* KYC Documents */}
                                    {(selectedPartner.aadhaarImage || selectedPartner.licenceImage) && (
                                        <div className="bg-muted/50 rounded-xl p-4 border border-border">
                                            <h3 className="text-sm font-semibold text-foreground mb-3">KYC Documents</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {selectedPartner.aadhaarImage && (
                                                    <div>
                                                        <span className="text-xs text-muted-foreground block mb-1">Aadhaar Document</span>
                                                        <a href={selectedPartner.aadhaarImage} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-border group bg-background hover:border-primary transition-colors">
                                                            <img src={selectedPartner.aadhaarImage} alt="Aadhaar" className="w-full h-full object-contain p-2" />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Eye className="h-6 w-6 text-white" />
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}
                                                {selectedPartner.licenceImage && (
                                                    <div>
                                                        <span className="text-xs text-gray-500 block mb-1">Business License</span>
                                                        <a href={selectedPartner.licenceImage} target="_blank" rel="noreferrer" className="block relative aspect-video rounded-lg overflow-hidden border border-gray-200 group bg-white hover:border-primary-500 transition-colors">
                                                            <img src={selectedPartner.licenceImage} alt="License" className="w-full h-full object-contain p-2" />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <Eye className="h-6 w-6 text-white" />
                                                            </div>
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Tabs */}
                                    <div className="flex border-b border-gray-100">
                                        <button
                                            onClick={() => setActiveTab('bookings')}
                                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'bookings' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Bookings
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('transactions')}
                                            className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${activeTab === 'transactions' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                                        >
                                            Transactions
                                        </button>
                                    </div>

                                    {/* Tab Content */}
                                    {activeTab === 'bookings' ? (
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <Calendar className="h-4 w-4 text-blue-600" />
                                                Referral Bookings ({selectedPartner.referralBookings.length})
                                            </h3>

                                            {selectedPartner.referralBookings.length === 0 ? (
                                                <div className="text-center py-8 bg-muted/50 rounded-xl border border-border">
                                                    <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-sm text-muted-foreground">No referral bookings yet</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                                    {selectedPartner.referralBookings.map((booking: CPReferralBooking) => (
                                                        <div key={booking.id} className="bg-muted/50 rounded-xl p-4 hover:bg-muted/80 transition-colors border border-border">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-mono text-sm font-bold text-foreground">
                                                                            #{booking.bookingNumber}
                                                                        </span>
                                                                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${getStatusBadge(booking.status)}`}>
                                                                            {booking.status}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-sm text-gray-600 mt-1">
                                                                        {booking.user ? `${booking.user.firstName} ${booking.user.lastName}` : 'N/A'}
                                                                    </p>
                                                                    {booking.property && (
                                                                        <p className="text-xs text-gray-400 mt-0.5">{booking.property.name}</p>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-sm font-semibold text-foreground">
                                                                        ₹{Number(booking.totalAmount).toLocaleString()}
                                                                    </p>
                                                                    <p className="text-xs text-green-600 font-medium">
                                                                        Commission: ₹{Number(booking.cpCommission || 0).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                                                                <span>Check-in: {new Date(booking.checkInDate).toLocaleDateString()}</span>
                                                                <ArrowRight className="h-3 w-3" />
                                                                <span>Check-out: {new Date(booking.checkOutDate).toLocaleDateString()}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div>
                                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-primary" />
                                                Wallet Transactions
                                            </h3>

                                            {txLoading ? (
                                                <div className="flex items-center justify-center py-12">
                                                    <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                                                </div>
                                            ) : transactions.length === 0 ? (
                                                <div className="text-center py-8 bg-muted/50 rounded-xl border border-border">
                                                    <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                                                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                                    {transactions.map((tx: any) => (
                                                        <div key={tx.id} className="bg-muted/50 rounded-xl p-4 flex items-center justify-between border border-border">
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${tx.type === 'COMMISSION' ? 'bg-green-100 text-green-700' :
                                                                        tx.type === 'WALLET_TOPUP' ? 'bg-blue-100 text-blue-700' :
                                                                            tx.type === 'WALLET_PAYMENT' ? 'bg-orange-100 text-orange-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                        }`}>
                                                                        {tx.type}
                                                                    </span>
                                                                    <span className="text-[10px] text-gray-400">
                                                                        {new Date(tx.createdAt).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                                <p className="text-sm text-gray-700 mt-1 font-medium">{tx.description}</p>
                                                            </div>
                                                            <div className={`text-sm font-bold ${Number(tx.amount) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {Number(tx.amount) > 0 ? '+' : ''}₹{Math.abs(Number(tx.amount)).toLocaleString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ===== Adjustment Modal ===== */}
            {isAdjustModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAdjustModalOpen(false)} />
                    <div className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 border border-border">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold text-foreground">Request Wallet Adjustment</h3>
                            <button onClick={() => setIsAdjustModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Adjust balance for <span className="font-bold text-foreground">{adjustPartner?.user?.firstName} {adjustPartner?.user?.lastName}</span>.
                            Use positive for credit, negative for debit.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Amount (₹)</label>
                                <input
                                    type="number"
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="e.g. 5000 or -2000"
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none font-bold text-foreground"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Description</label>
                                <input
                                    type="text"
                                    value={adjustDescription}
                                    onChange={(e) => setAdjustDescription(e.target.value)}
                                    placeholder="Reason for adjustment"
                                    className="w-full px-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary outline-none text-foreground"
                                />
                            </div>
                        </div>

                        <button
                            onClick={handleAdjustWallet}
                            disabled={isAdjusting}
                            className="w-full py-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isAdjusting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Adjustment Request'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Small helper components
function StatCard({ label, value, icon, bg }: { label: string; value: string; icon: React.ReactNode; bg: string }) {
    return (
        <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}>{icon}</div>
            </div>
            <p className="text-lg font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
        </div>
    );
}

function InfoBadge({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
    return (
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-lg text-sm border border-border">
            {icon}
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-semibold text-foreground">{value}</span>
        </span>
    );
}
