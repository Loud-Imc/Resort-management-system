import { useState, useEffect } from 'react';
import { heroContentService, HeroContent } from '../../services/heroContent';
import { Loader2, Plus, Edit2, Trash2, CheckCircle, XCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HeroContentPage() {
    const [contents, setContents] = useState<HeroContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContent, setEditingContent] = useState<HeroContent | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const [formData, setFormData] = useState<Partial<HeroContent>>({
        tagline: '',
        heading: '',
        subheading: '',
        isActive: true
    });

    useEffect(() => {
        loadContents();
    }, []);

    const loadContents = async () => {
        setLoading(true);
        try {
            const data = await heroContentService.getAll();
            setContents(data);
        } catch (error) {
            console.error('Failed to load hero content', error);
            toast.error('Failed to load hero content');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.heading) {
            toast.error('Heading is required');
            return;
        }

        setIsSaving(true);
        try {
            if (editingContent) {
                await heroContentService.update(editingContent.id, formData);
                toast.success('Hero content updated successfully');
            } else {
                await heroContentService.create(formData);
                toast.success('Hero content created successfully');
            }
            setIsModalOpen(false);
            loadContents();
        } catch (error) {
            console.error('Failed to save hero content', error);
            toast.error('Failed to save hero content');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this content?')) {
            try {
                await heroContentService.delete(id);
                toast.success('Hero content deleted');
                loadContents();
            } catch (error) {
                console.error('Failed to delete content', error);
                toast.error('Failed to delete content');
            }
        }
    };

    const openModal = (content?: HeroContent) => {
        if (content) {
            setEditingContent(content);
            setFormData({ ...content });
        } else {
            setEditingContent(null);
            setFormData({
                tagline: '',
                heading: '',
                subheading: '',
                isActive: true
            });
        }
        setIsModalOpen(true);
    };

    const filteredContents = contents.filter(content => {
        const search = searchTerm.toLowerCase();
        return (
            content.heading?.toLowerCase().includes(search) ||
            content.subheading?.toLowerCase().includes(search) ||
            content.tagline?.toLowerCase().includes(search)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Hero Content Management</h1>
                    <p className="text-muted-foreground font-medium">Manage inspiration text messages for the home page hero section</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search content..."
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
                        New Content
                    </button>
                </div>
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
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Tagline</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Heading & Subheading</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Status</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredContents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                                        No hero content found.
                                    </td>
                                </tr>
                            ) : (
                                filteredContents.map((content) => (
                                    <tr key={content.id} className="hover:bg-muted/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="text-xs font-bold text-primary uppercase tracking-wider">{content.tagline || '-'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-card-foreground line-clamp-1">{content.heading}</div>
                                            <div className="text-xs text-muted-foreground line-clamp-2 max-w-lg">{content.subheading}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {content.isActive ? (
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
                                                    onClick={() => openModal(content)}
                                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(content.id)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
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
                                {editingContent ? 'Edit Hero Content' : 'Create Hero Content'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-2xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Tagline (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none"
                                    value={formData.tagline}
                                    onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                                    placeholder="e.g. SUSTAINABLE JOURNEYS, MEANINGFUL STAYS"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Main Heading</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none font-bold"
                                    value={formData.heading}
                                    onChange={(e) => setFormData({ ...formData, heading: e.target.value })}
                                    placeholder="e.g. Find places worth disappearing into"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-muted-foreground mb-1">Subheading / Description (Optional)</label>
                                <textarea
                                    className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none min-h-[100px]"
                                    value={formData.subheading}
                                    onChange={(e) => setFormData({ ...formData, subheading: e.target.value })}
                                    placeholder="e.g. Curated eco-luxury stays across India. Travel slower. Stay deeper."
                                />
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
                                <label className="text-sm text-card-foreground font-bold">Active (Available for random rotation)</label>
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
                                    {editingContent ? 'Update Content' : 'Create Content'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
