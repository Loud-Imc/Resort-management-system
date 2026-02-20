import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { categoryService } from '../../services/category';
import {
    Loader2,
    Plus,
    Edit2,
    Trash2,
    Search,
    Type,
    Link as LinkIcon,
    FileText,
    Settings,
    Palmtree,
    Hotel,
    Home,
    Coffee,
    Layout,
    Globe,
    Building,
    Tent,
    X
} from 'lucide-react';
import clsx from 'clsx';
import type { PropertyCategory, CreatePropertyCategoryDto } from '../../types/category';
import toast from 'react-hot-toast';

const ICON_OPTIONS = [
    { name: 'Palmtree', icon: Palmtree },
    { name: 'Hotel', icon: Hotel },
    { name: 'Home', icon: Home },
    { name: 'Coffee', icon: Coffee },
    { name: 'Tent', icon: Tent },
    { name: 'Building', icon: Building },
    { name: 'Globe', icon: Globe },
    { name: 'Layout', icon: Layout },
];

export default function CategoryList() {
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<PropertyCategory | null>(null);
    const [formData, setFormData] = useState<CreatePropertyCategoryDto>({
        name: '',
        slug: '',
        icon: 'Palmtree',
        description: '',
        isActive: true
    });

    const queryClient = useQueryClient();

    const { data: categories, isLoading } = useQuery<PropertyCategory[]>({
        queryKey: ['property-categories'],
        queryFn: () => categoryService.getAll(true),
    });

    const createMutation = useMutation({
        mutationFn: categoryService.create,
        onSuccess: () => {
            toast.success('Category created successfully');
            queryClient.invalidateQueries({ queryKey: ['property-categories'] });
            closeModal();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create category');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<PropertyCategory> }) => categoryService.update(id, data),
        onSuccess: () => {
            toast.success('Category updated successfully');
            queryClient.invalidateQueries({ queryKey: ['property-categories'] });
            closeModal();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update category');
        }
    });

    const deleteMutation = useMutation({
        mutationFn: categoryService.delete,
        onSuccess: () => {
            toast.success('Category deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['property-categories'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete category');
        }
    });

    const handleOpenCreate = () => {
        setEditingCategory(null);
        setFormData({
            name: '',
            slug: '',
            icon: 'Palmtree',
            description: '',
            isActive: true
        });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (category: PropertyCategory) => {
        setEditingCategory(category);
        setFormData({
            name: category.name,
            slug: category.slug,
            icon: category.icon || 'Palmtree',
            description: category.description || '',
            isActive: category.isActive
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCategory(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingCategory) {
            updateMutation.mutate({ id: editingCategory.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this category? If properties are assigned to it, deletion will fail.')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredCategories = categories?.filter(cat =>
        cat.name.toLowerCase().includes(search.toLowerCase()) ||
        cat.description?.toLowerCase().includes(search.toLowerCase())
    );

    const getIconComponent = (iconName: string) => {
        const option = ICON_OPTIONS.find(opt => opt.name === iconName);
        return option ? <option.icon className="h-5 w-5" /> : <Layout className="h-5 w-5" />;
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Category Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage property categories, icons, and types</p>
                </div>
                <button
                    onClick={handleOpenCreate}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Category
                </button>
            </div>

            <div className="bg-card p-4 rounded-lg shadow-sm border border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 border-border bg-background text-foreground rounded-lg focus:ring-primary focus:border-primary"
                    />
                </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {filteredCategories?.map((category) => (
                                <tr key={category.id} className="hover:bg-muted/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                                    {getIconComponent(category.icon || 'Palmtree')}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-foreground">{category.name}</div>
                                                <div className="text-sm text-muted-foreground max-w-xs truncate">{category.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">
                                        /{category.slug}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                            category.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-destructive/10 text-destructive"
                                        )}>
                                            {category.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleOpenEdit(category)}
                                                className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(category.id)}
                                                className="text-destructive hover:bg-destructive/10 p-2 rounded-full transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredCategories?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground font-medium">
                                        No categories found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
                    <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                {editingCategory ? <Edit2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                                {editingCategory ? 'Edit Category' : 'Create Category'}
                            </h2>
                            <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                    <Type className="h-4 w-4" /> Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData(prev => ({
                                            ...prev,
                                            name: val,
                                            slug: editingCategory ? prev.slug : val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
                                        }))
                                    }}
                                    className="w-full rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary"
                                    placeholder="e.g., Luxury Resort"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                    <LinkIcon className="h-4 w-4" /> Slug
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '') }))}
                                    className="w-full rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary font-mono"
                                    placeholder="e.g., luxury-resort"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                    <Settings className="h-4 w-4" /> Icon
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {ICON_OPTIONS.map((option) => (
                                        <button
                                            key={option.name}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, icon: option.name }))}
                                            className={clsx(
                                                "p-3 rounded-lg border flex flex-col items-center gap-1 transition-all",
                                                formData.icon === option.name
                                                    ? "border-primary bg-primary/10 text-primary"
                                                    : "border-border hover:border-primary/50"
                                            )}
                                        >
                                            <option.icon className="h-6 w-6" />
                                            <span className="text-[10px] truncate w-full text-center">{option.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                                    <FileText className="h-4 w-4" /> Description
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                    className="w-full rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary h-24 resize-none"
                                    placeholder="Describe this category..."
                                />
                            </div>

                            <label className="flex items-center gap-2 cursor-pointer pt-2">
                                <input
                                    type="checkbox"
                                    checked={formData.isActive}
                                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                                    className="rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="text-sm font-medium">Active (Visible in search)</span>
                            </label>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editingCategory ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
