import React, { useState, useEffect } from 'react';
import { X, Save, Loader2, Package, Tag, Hash, Box, MapPin, Calendar, DollarSign, AlignLeft, User } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { assetsService, type Asset, type CreateAssetDto, type UpdateAssetDto } from '../../services/assets';
import { roomsService } from '../../services/rooms';
import { useProperty } from '../../context/PropertyContext';
import { format } from 'date-fns';

interface AssetFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset?: Asset | null;
}

const CATEGORIES = [
    'Electronics',
    'Furniture',
    'Appliances',
    'Plumbing',
    'Electrical',
    'Decor',
    'Linens',
    'Kitchenware',
    'Tools',
    'Other'
];

export function AssetFormModal({ isOpen, onClose, asset }: AssetFormModalProps) {
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    const [formData, setFormData] = useState<Partial<CreateAssetDto>>({
        name: '',
        category: 'Furniture',
        ownership: 'LESSOR',
        quantity: 1,
        condition: 'GOOD',
        location: '',
        purchaseDate: '',
        value: undefined,
        notes: '',
        roomId: '',
    });

    const { data: rooms } = useQuery({
        queryKey: ['rooms', selectedProperty?.id],
        queryFn: () => roomsService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id && isOpen,
    });

    useEffect(() => {
        if (asset) {
            setFormData({
                name: asset.name,
                category: asset.category,
                ownership: asset.ownership,
                quantity: asset.quantity,
                condition: asset.condition,
                location: asset.location || '',
                purchaseDate: asset.purchaseDate ? format(new Date(asset.purchaseDate), 'yyyy-MM-dd') : '',
                value: asset.value || undefined,
                notes: asset.notes || '',
                roomId: asset.roomId || '',
            });
        } else {
            setFormData({
                name: '',
                category: 'Furniture',
                ownership: 'LESSOR',
                quantity: 1,
                condition: 'GOOD',
                location: '',
                purchaseDate: '',
                value: undefined,
                notes: '',
                roomId: '',
            });
        }
    }, [asset, isOpen]);

    const createMutation = useMutation({
        mutationFn: (data: CreateAssetDto) => assetsService.create(data),
        onSuccess: () => {
            toast.success('Asset added successfully');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to add asset');
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateAssetDto }) => assetsService.update(id, data),
        onSuccess: () => {
            toast.success('Asset updated successfully');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update asset');
        }
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedProperty?.id) return;
        
        const payload: CreateAssetDto = {
            propertyId: selectedProperty.id,
            name: formData.name!,
            category: formData.category!,
            ownership: formData.ownership as 'LESSOR' | 'LESSEE',
            quantity: Number(formData.quantity) || 1,
            condition: formData.condition as any,
            location: formData.location || undefined,
            purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate).toISOString() : undefined,
            value: formData.value ? Number(formData.value) : undefined,
            notes: formData.notes || undefined,
            roomId: formData.roomId || undefined,
        };

        if (asset) {
            updateMutation.mutate({ id: asset.id, data: payload });
        } else {
            createMutation.mutate(payload);
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-2xl shadow-xl border border-border/50 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                    <div>
                        <h2 className="text-lg font-black text-foreground">
                            {asset ? 'Edit Asset' : 'Add New Asset'}
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {asset ? 'Update asset details' : 'Record a new asset for this property'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-xl transition-colors text-muted-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <form id="asset-form" onSubmit={handleSubmit} className="space-y-6">
                        {/* Name & Category */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <Package className="h-3.5 w-3.5 text-primary" /> Asset Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="e.g. Samsung 55' TV"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <Tag className="h-3.5 w-3.5 text-primary" /> Category
                                </label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    {CATEGORIES.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Ownership & Condition */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <User className="h-3.5 w-3.5 text-primary" /> Ownership *
                                </label>
                                <select
                                    value={formData.ownership}
                                    onChange={(e) => setFormData({ ...formData, ownership: e.target.value as any })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="LESSOR">Lessor (Owner)</option>
                                    <option value="LESSEE">Lessee (Operator)</option>
                                </select>
                                <p className="text-[10px] text-muted-foreground">Who owns this asset?</p>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <Box className="h-3.5 w-3.5 text-primary" /> Condition
                                </label>
                                <select
                                    value={formData.condition}
                                    onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="NEW">New</option>
                                    <option value="GOOD">Good</option>
                                    <option value="FAIR">Fair</option>
                                    <option value="POOR">Poor</option>
                                    <option value="DAMAGED">Damaged</option>
                                </select>
                            </div>
                        </div>

                        {/* Room & Quantity */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-primary" /> Assign to Room (Optional)
                                </label>
                                <select
                                    value={formData.roomId || ''}
                                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    <option value="">-- General Property Asset --</option>
                                    {rooms?.map((room: any) => (
                                        <option key={room.id} value={room.id}>
                                            Unit {room.roomNumber} ({room.roomType?.name})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <Hash className="h-3.5 w-3.5 text-primary" /> Quantity
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    required
                                    value={formData.quantity}
                                    onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        {/* Value & Purchase Date */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <DollarSign className="h-3.5 w-3.5 text-primary" /> Estimated Value (Optional)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.value || ''}
                                    onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || undefined })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="0.00"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <Calendar className="h-3.5 w-3.5 text-primary" /> Purchase Date (Optional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.purchaseDate}
                                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                />
                            </div>
                        </div>

                        {/* Location Details & Notes */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <MapPin className="h-3.5 w-3.5 text-primary" /> Specific Location Details (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={formData.location || ''}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    placeholder="e.g. Near the window, living room corner"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-muted-foreground">
                                    <AlignLeft className="h-3.5 w-3.5 text-primary" /> Notes
                                </label>
                                <textarea
                                    value={formData.notes || ''}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="w-full bg-background border border-border/50 rounded-xl px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                                    placeholder="Any additional details..."
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-border/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="asset-form"
                        disabled={isPending}
                        className="inline-flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {asset ? 'Update Asset' : 'Save Asset'}
                    </button>
                </div>
            </div>
        </div>
    );
}
