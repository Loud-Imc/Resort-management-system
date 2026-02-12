import { useState, useEffect } from 'react';
import { Users, Loader2, CheckCircle, XCircle, DollarSign, Percent } from 'lucide-react';
import { channelPartnerService } from '../../services/channel-partners';
import { ChannelPartner } from '../../types/channel-partner';
import toast from 'react-hot-toast';

export default function CPList() {
    const [partners, setPartners] = useState<ChannelPartner[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newRate, setNewRate] = useState('');

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
            await channelPartnerService.toggleActive(partner.id, !partner.isActive);
            setPartners(partners.map(p =>
                p.id === partner.id ? { ...p, isActive: !partner.isActive } : p
            ));
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
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Channel Partners</h1>
                <p className="text-gray-500">Manage all channel partners and their commission rates</p>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}

            {/* Partners Table */}
            {partners.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No channel partners yet</h3>
                    <p className="text-gray-500 mt-1">Channel partners will appear here once they register.</p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referral Code</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commission</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Earnings</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Referrals</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {partners.map(partner => (
                                <tr key={partner.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {partner.user?.firstName} {partner.user?.lastName}
                                            </div>
                                            <div className="text-sm text-gray-500">{partner.user?.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
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
                                                    className="w-20 px-2 py-1 border rounded"
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
                                                    className="text-gray-400 hover:text-gray-500"
                                                >
                                                    <XCircle className="h-5 w-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => { setEditingId(partner.id); setNewRate(partner.commissionRate.toString()); }}
                                                className="flex items-center gap-1 text-gray-900 hover:text-primary-600"
                                            >
                                                <Percent className="h-4 w-4" />
                                                {partner.commissionRate}%
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 text-gray-900">
                                            <DollarSign className="h-4 w-4 text-green-600" />
                                            ₹{partner.totalEarnings.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="font-medium">{partner._count?.referrals || 0}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs rounded-full ${partner.isActive
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {partner.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleActive(partner)}
                                            className={`text-sm ${partner.isActive
                                                ? 'text-red-600 hover:text-red-700'
                                                : 'text-green-600 hover:text-green-700'
                                                }`}
                                        >
                                            {partner.isActive ? 'Disable' : 'Enable'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
