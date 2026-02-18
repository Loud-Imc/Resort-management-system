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
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Coupons Management</h1>
                    <p className="text-muted-foreground font-medium">Create and manage promotional discount codes</p>
                </div>
                <button
                    onClick={() => openModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition shadow-sm font-bold"
                >
                    <Plus className="h-4 w-4" />
                    New Coupon
                </button>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 border-b border-border text-center">
                        <tr>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Coupon</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Value</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Validity</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Usage</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Status</th>
                            <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {coupons.map((coupon) => (
                            <tr key={coupon.id} className="hover:bg-muted/30 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                            <Ticket className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-card-foreground font-mono group-hover:text-primary transition-colors">{coupon.code}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium truncate max-w-[150px]">{coupon.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold shadow-sm">
                                        {coupon.discountType === 'PERCENTAGE' ? `${coupon.discountValue}% Off` : `₹${coupon.discountValue} Off`}
                                    </span>
                                    {coupon.minBookingAmount !== undefined && coupon.minBookingAmount > 0 && (
                                        <div className="text-[10px] text-muted-foreground font-medium mt-1">Min: ₹{coupon.minBookingAmount}</div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-card-foreground text-[11px] font-bold">
                                        {format(new Date(coupon.validFrom), 'MMM d')} - {format(new Date(coupon.validUntil), 'MMM d, yyyy')}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1.5 min-w-[100px]">
                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all duration-500"
                                                style={{ width: `${Math.min((coupon.usedCount / (coupon.maxUses || 1)) * 100, 100)}%` }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground font-bold">{coupon.usedCount} / {coupon.maxUses || '∞'} uses</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {coupon.isActive ? (
                                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                                            <CheckCircle className="h-3 w-3" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                                            <XCircle className="h-3 w-3" /> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right space-x-1">
                                    <button
                                        onClick={() => openModal(coupon)}
                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    >
                                        <Edit2 className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(coupon.id)}
                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
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
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-black text-card-foreground">{editingCoupon ? 'Edit Coupon' : 'Create New Coupon'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Coupon Code</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-mono uppercase font-bold"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Discount Type</label>
                                    <select
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium"
                                        value={formData.discountType}
                                        onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                                    >
                                        <option value="PERCENTAGE">Percentage (%)</option>
                                        <option value="FIXED_AMOUNT">Fixed Amount (₹)</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Discount Value</label>
                                <input
                                    type="number"
                                    required
                                    min="1"
                                    className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold"
                                    value={formData.discountValue}
                                    onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all min-h-[80px]"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Valid From</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium"
                                        value={formData.validFrom}
                                        onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Valid Until</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium"
                                        value={formData.validUntil}
                                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Max Uses</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium"
                                        value={formData.maxUses}
                                        onChange={(e) => setFormData({ ...formData, maxUses: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Min Booking Amt</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium"
                                        value={formData.minBookingAmount}
                                        onChange={(e) => setFormData({ ...formData, minBookingAmount: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                </label>
                                <label htmlFor="isActive" className="text-sm text-card-foreground font-bold">Active and visible to users</label>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-border">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 text-muted-foreground font-bold hover:bg-muted rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
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
