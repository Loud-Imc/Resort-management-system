import { useState, useEffect } from 'react';
import { discountService, Coupon } from '../../services/discounts';
import { Loader2, Plus, Edit2, Trash2, Ticket, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';

export default function CouponsPage() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);
    const [formData, setFormData] = useState<Partial<Coupon>>({
        code: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: 0,
        validFrom: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        isActive: true,
        maxUses: 1000,
        minBookingAmount: 0
    });

    useEffect(() => {
        loadCoupons();
    }, []);

    const loadCoupons = async () => {
        try {
            const data = await discountService.getCoupons();
            setCoupons(data);
        } catch (error) {
            console.error('Failed to load coupons', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCoupon) {
                await discountService.updateCoupon(editingCoupon.id, formData);
            } else {
                await discountService.createCoupon(formData);
            }
            setIsModalOpen(false);
            loadCoupons();
        } catch (error) {
            console.error('Failed to save coupon', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this coupon?')) {
            try {
                await discountService.deleteCoupon(id);
                loadCoupons();
            } catch (error) {
                console.error('Failed to delete coupon', error);
            }
        }
    };

    const openModal = (coupon?: Coupon) => {
        if (coupon) {
            setEditingCoupon(coupon);
            setFormData({
                ...coupon,
                validFrom: format(new Date(coupon.validFrom), 'yyyy-MM-dd'),
                validUntil: format(new Date(coupon.validUntil), 'yyyy-MM-dd'),
            });
        } else {
            setEditingCoupon(null);
            setFormData({
                code: '',
                description: '',
                discountType: 'PERCENTAGE',
                discountValue: 0,
                validFrom: format(new Date(), 'yyyy-MM-dd'),
                validUntil: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                isActive: true,
                maxUses: 1000,
                minBookingAmount: 0
            });
        }
        setIsModalOpen(true);
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
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coupons Management</h1>
                    <p className="text-gray-500">Create and manage promotional discount codes</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    New Coupon
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-700">Coupon</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Value</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Validity</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Usage</th>
                            <th className="px-6 py-4 font-semibold text-gray-700">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-700 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {coupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary-50 rounded-lg">
                                            <Ticket className="h-5 w-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900 font-mono">{coupon.code}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{coupon.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 font-medium">
                                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Off`}
                                    </span>
                                    {coupon.minBookingAmount !== undefined && coupon.minBookingAmount > 0 && (
                                        <div className="text-[10px] text-gray-400 mt-1">Min: ₹{coupon.minBookingAmount}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-gray-700 text-xs">
                                        {format(new Date(coupon.validFrom), 'MMM d')} - {format(new Date(coupon.validUntil), 'MMM d, yyyy')}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary-500"
                                                style={{ width: `${Math.min((coupon.usedCount / (coupon.maxUses || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-500">{coupon.usedCount} / {coupon.maxUses || '∞'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {coupon.isActive ? (
                                        <span className="inline-flex items-center gap-1 text-green-600 bg-green-50 px-2.5 py-1 rounded-full text-xs font-semibold">
                                            <CheckCircle className="h-3 w-3" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full text-xs font-semibold">
                                            <XCircle className="h-3 w-3" /> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <button
                                        onClick={() => openModal(coupon)}
                                        className="p-1.5 text-gray-400 hover:text-primary-600 transition"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(coupon.id)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 transition"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none font-mono uppercase"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Value</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none h-20"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.maxUses}
                                        onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Min Booking Amt</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={formData.minBookingAmount}
                                        onChange={(e) => setFormData({ ...formData, minBookingAmount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    className="h-4 w-4 text-primary-600 rounded"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                />
                                <label htmlFor="isActive" className="text-sm text-gray-700 font-medium">Active and visible to users</label>
                            </div>

                            <div className="flex gap-3 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2 text-gray-600 font-semibold hover:bg-gray-50 rounded-lg transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-primary-600 text-white font-semibold rounded-lg hover:bg-primary-700 transition shadow-lg shadow-primary-500/20"
                                >
                                    {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
