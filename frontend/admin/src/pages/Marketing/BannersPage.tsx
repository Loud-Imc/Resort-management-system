import { useState, useEffect } from 'react';
import { bannerService, Banner, BannerType } from '../../services/banners';
import { Loader2, Plus, Edit2, Trash2, Image, CheckCircle, XCircle, MoveUp, MoveDown, Layout, Megaphone, Search } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function BannersPage() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<BannerType>('HERO');
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Partial<Banner>>({
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        buttonText: 'Book Now',
        badgeText: '',
        type: 'HERO',
        isActive: true,
        position: 0
    });

    useEffect(() => {
        loadBanners();
    }, [activeTab]);

    const loadBanners = async () => {
        setLoading(true);
        try {
            const data = await bannerService.getBanners(activeTab);
            setBanners(data);
        } catch (error) {
            console.error('Failed to load banners', error);
            toast.error('Failed to load banners');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.imageUrl) {
            toast.error('Please upload a banner image');
            return;
        }

        setIsSaving(true);
        try {
            if (editingBanner) {
                await bannerService.updateBanner(editingBanner.id, formData);
                toast.success('Banner updated successfully');
            } else {
                await bannerService.createBanner(formData);
                toast.success('Banner created successfully');
            }
            setIsModalOpen(false);
            loadBanners();
        } catch (error) {
            console.error('Failed to save banner', error);
            toast.error('Failed to save banner');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this banner?')) {
            try {
                await bannerService.deleteBanner(id);
                toast.success('Banner deleted');
                loadBanners();
            } catch (error) {
                console.error('Failed to delete banner', error);
                toast.error('Failed to delete banner');
            }
        }
    };

    const handleMove = async (index: number, direction: 'up' | 'down') => {
        const newBanners = [...banners];
        const otherIndex = direction === 'up' ? index - 1 : index + 1;

        if (otherIndex < 0 || otherIndex >= banners.length) return;

        const current = newBanners[index];
        const other = newBanners[otherIndex];

        try {
            await bannerService.updateBanner(current.id, { position: other.position });
            await bannerService.updateBanner(other.id, { position: current.position });
            loadBanners();
        } catch (error) {
            toast.error('Failed to reorder banners');
        }
    };

    const openModal = (banner?: Banner) => {
        if (banner) {
            setEditingBanner(banner);
            setFormData({ ...banner });
        } else {
            setEditingBanner(null);
            setFormData({
                title: '',
                description: '',
                imageUrl: '',
                linkUrl: '',
                buttonText: 'Book Now',
                badgeText: '',
                type: activeTab,
                isActive: true,
                position: banners.length
            });
        }
        setIsModalOpen(true);
    };

    const filteredBanners = banners.filter(banner => {
        const search = searchTerm.toLowerCase();
        return (
            banner.title?.toLowerCase().includes(search) ||
            banner.description?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Banners Management</h1>
                    <p className="text-muted-foreground font-medium">Manage hero backgrounds and promotional banners</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search by title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
                        />
                    </div>
                    <button
                        onClick={() => openModal()}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition shadow-sm font-bold whitespace-nowrap"
                    >
                        <Plus className="h-4 w-4" />
                        New Banner
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-muted rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab('HERO')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                        activeTab === 'HERO' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Layout className="h-4 w-4" />
                    Hero Backgrounds
                </button>
                <button
                    onClick={() => setActiveTab('PROMO')}
                    className={clsx(
                        "flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all",
                        activeTab === 'PROMO' ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                >
                    <Megaphone className="h-4 w-4" />
                    Promo Banners
                </button>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Preview</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Title & Info</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Link</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Status</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredBanners.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground italic">
                                        No banners found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredBanners.map((banner, index) => {
                                    return (
                                        <tr key={banner.id} className="hover:bg-muted/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="w-32 h-20 bg-muted rounded-lg overflow-hidden border border-border">
                                                    {banner.imageUrl ? (
                                                        <img src={banner.imageUrl} alt={banner.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            <Image className="h-6 w-6 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-card-foreground">{banner.title}</div>
                                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-xs">{banner.description}</div>
                                                {banner.badgeText && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase">
                                                        {banner.badgeText}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-xs font-mono">{banner.linkUrl || 'No link'}</div>
                                                <div className="text-[10px] text-muted-foreground">Button: {banner.buttonText}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {banner.isActive ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-500/10 px-2.5 py-1 rounded-full text-[10px] font-bold">
                                                        <CheckCircle className="h-3 w-3" /> Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-muted-foreground bg-muted px-2.5 py-1 rounded-full text-[10px] font-bold">
                                                        <XCircle className="h-3 w-3" /> Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => handleMove(index, 'up')}
                                                        disabled={index === 0}
                                                        className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30 rounded-lg"
                                                    >
                                                        <MoveUp className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleMove(index, 'down')}
                                                        disabled={index === banners.length - 1}
                                                        className="p-1.5 text-muted-foreground hover:text-primary disabled:opacity-30 rounded-lg"
                                                    >
                                                        <MoveDown className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(banner)}
                                                        className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(banner.id)}
                                                        className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-border">
                        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                            <h2 className="text-xl font-black text-card-foreground">
                                {editingBanner ? 'Edit Banner' : 'Create New Banner'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1 text-center">Banner Image</label>
                                <ImageUpload
                                    images={formData.imageUrl ? [formData.imageUrl] : []}
                                    onChange={(images) => setFormData({ ...formData, imageUrl: images[0] || '' })}
                                    maxImages={1}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Banner Type</label>
                                    <select
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none font-bold"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value as BannerType })}
                                    >
                                        <option value="HERO">Hero Background</option>
                                        <option value="PROMO">Promo Banner</option>
                                    </select>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Badge Text (Optional)</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={formData.badgeText}
                                        onChange={(e) => setFormData({ ...formData, badgeText: e.target.value })}
                                        placeholder="e.g. Limited Time Offer"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Title</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none font-bold"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    placeholder="e.target.value Summer Escape Package"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Description</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[80px]"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Book 3 nights and receive a complimentary spa treatment..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Button Text</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={formData.buttonText}
                                        onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-sm font-bold text-muted-foreground mb-1">Link URL</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                                        value={formData.linkUrl}
                                        onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                                        placeholder="/search?offer=summer2026"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={formData.isActive}
                                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                    />
                                    <div className="w-11 h-6 bg-muted rounded-full peer peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                                </label>
                                <label className="text-sm text-card-foreground font-bold">Active and visible to users</label>
                            </div>

                            <div className="flex gap-4 pt-6 border-t border-border">
                                <button
                                    type="button"
                                    disabled={isSaving}
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-2.5 text-muted-foreground font-bold hover:bg-muted rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 transition-all flex items-center justify-center gap-2"
                                >
                                    {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingBanner ? 'Update Banner' : 'Create Banner'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
