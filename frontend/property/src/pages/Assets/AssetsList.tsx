import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
    PackageSearch,
    Plus,
    Box,
    Filter,
    Edit2,
    Trash2,
    Loader2,
    AlertCircle,
    User,
    DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useProperty } from '../../context/PropertyContext';
import { assetsService, type Asset } from '../../services/assets';
import { AssetFormModal } from '../../components/Assets/AssetFormModal';

export default function AssetsList() {
    const { selectedProperty } = useProperty();
    const queryClient = useQueryClient();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

    // Filters
    const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'LESSOR' | 'LESSEE'>('ALL');
    const [conditionFilter, setConditionFilter] = useState<string>('ALL');

    const { data: assets, isLoading, isError } = useQuery({
        queryKey: ['assets', selectedProperty?.id, ownershipFilter, conditionFilter],
        queryFn: () => assetsService.getAll({
            propertyId: selectedProperty?.id || '',
            ownership: ownershipFilter === 'ALL' ? undefined : ownershipFilter,
            condition: conditionFilter === 'ALL' ? undefined : conditionFilter,
        }),
        enabled: !!selectedProperty?.id,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => assetsService.delete(id),
        onSuccess: () => {
            toast.success('Asset deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['assets'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to delete asset');
        }
    });

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete ${name}?`)) {
            deleteMutation.mutate(id);
        }
    };

    const openEditForm = (asset: Asset) => {
        setSelectedAsset(asset);
        setIsFormOpen(true);
    };

    const openAddForm = () => {
        setSelectedAsset(null);
        setIsFormOpen(true);
    };

    // Derived stats
    const stats = (assets || []).reduce((acc, curr) => {
        acc.totalAssets += curr.quantity;
        if (curr.value) acc.totalValue += (curr.value * curr.quantity);
        if (curr.ownership === 'LESSOR') acc.lessorAssets += curr.quantity;
        if (curr.ownership === 'LESSEE') acc.lesseeAssets += curr.quantity;
        return acc;
    }, { totalAssets: 0, totalValue: 0, lessorAssets: 0, lesseeAssets: 0 });

    const conditionColors: Record<string, string> = {
        'NEW': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        'GOOD': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        'FAIR': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        'POOR': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        'DAMAGED': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    };

    return (
        <div className="flex-1 max-w-screen-2xl mx-auto w-full px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 text-primary rounded-xl rotate-3">
                            <PackageSearch className="h-6 w-6" />
                        </div>
                        Property Assets
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">
                        Track and manage assets belonging to the Lessor (Owner) and Lessee (Operator).
                    </p>
                </div>
                <button
                    onClick={openAddForm}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-black text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 active:scale-95 whitespace-nowrap"
                >
                    <Plus className="h-4 w-4" /> Add New Asset
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-primary/5 group-hover:text-primary/10 transition-colors">
                        <Box className="w-32 h-32 rotate-12" />
                    </div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest relative z-10">Total Assets</p>
                    <h2 className="text-3xl font-black text-foreground relative z-10">{stats.totalAssets}</h2>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-emerald-500/5 group-hover:text-emerald-500/10 transition-colors">
                        <DollarSign className="w-32 h-32 rotate-12" />
                    </div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest relative z-10">Est. Total Value</p>
                    <h2 className="text-3xl font-black text-emerald-600 relative z-10">
                        {stats.totalValue > 0 ? `₹${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A'}
                    </h2>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-indigo-500/5 group-hover:text-indigo-500/10 transition-colors">
                        <User className="w-32 h-32 rotate-12" />
                    </div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest relative z-10">Lessor (Owner) Assets</p>
                    <h2 className="text-3xl font-black text-indigo-600 relative z-10">{stats.lessorAssets}</h2>
                </div>
                <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm space-y-3 relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 text-amber-500/5 group-hover:text-amber-500/10 transition-colors">
                        <User className="w-32 h-32 rotate-12" />
                    </div>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest relative z-10">Lessee (Operator) Assets</p>
                    <h2 className="text-3xl font-black text-amber-600 relative z-10">{stats.lesseeAssets}</h2>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 p-1">
                <div className="flex items-center gap-2 p-1.5 bg-muted/30 rounded-xl border border-border/50 overflow-x-auto hide-scrollbar shrink-0">
                    {['ALL', 'LESSOR', 'LESSEE'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setOwnershipFilter(filter as any)}
                            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                                ownershipFilter === filter 
                                    ? 'bg-background shadow-sm text-foreground' 
                                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                            }`}
                        >
                            {filter === 'ALL' ? 'All Owners' : filter === 'LESSOR' ? 'Lessor (Owner)' : 'Lessee (Operator)'}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-2 bg-background border border-border/50 rounded-xl focus-within:ring-2 ring-primary/50 transition-shadow">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={conditionFilter}
                            onChange={(e) => setConditionFilter(e.target.value)}
                            className="bg-transparent text-sm font-semibold focus:outline-none w-32"
                        >
                            <option value="ALL">All Conditions</option>
                            <option value="NEW">New</option>
                            <option value="GOOD">Good</option>
                            <option value="FAIR">Fair</option>
                            <option value="POOR">Poor</option>
                            <option value="DAMAGED">Damaged</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Asset List */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Loading Assets...</p>
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 text-destructive">
                    <AlertCircle className="h-12 w-12" />
                    <p className="text-sm font-bold">Failed to load assets. Please try again.</p>
                </div>
            ) : !assets || assets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4 border border-dashed border-border/60 rounded-3xl bg-muted/10">
                    <div className="p-4 bg-muted/30 rounded-2xl">
                        <Box className="h-10 w-10 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-black text-foreground">No assets found</h3>
                    <p className="text-sm text-muted-foreground max-w-sm text-center">
                        There are no assets matching your current filters, or you haven't added any yet.
                    </p>
                    <button
                        onClick={openAddForm}
                        className="mt-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-bold text-sm hover:bg-primary/20 transition-colors"
                    >
                        Add Your First Asset
                    </button>
                </div>
            ) : (
                <div className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-border/50 bg-muted/30">
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Asset Details</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Ownership</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Location</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider text-right">Qty</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider">Condition</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider text-right">Value</th>
                                    <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {assets.map((asset) => (
                                    <tr key={asset.id} className="hover:bg-muted/20 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-foreground text-sm">{asset.name}</span>
                                                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-wider mt-0.5">{asset.category}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider ${
                                                asset.ownership === 'LESSOR' 
                                                    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' 
                                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                                            }`}>
                                                {asset.ownership === 'LESSOR' ? 'Lessor (Owner)' : 'Lessee (Operator)'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col text-xs text-muted-foreground">
                                                {asset.room ? (
                                                    <span className="font-semibold text-foreground">Unit {asset.room.roomNumber}</span>
                                                ) : (
                                                    <span>General Property</span>
                                                )}
                                                {asset.location && <span className="text-[10px] mt-0.5">{asset.location}</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-bold text-foreground text-sm">{asset.quantity}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2 py-1 rounded border text-[10px] font-black uppercase tracking-wider ${conditionColors[asset.condition] || 'bg-muted text-muted-foreground border-border'}`}>
                                                {asset.condition}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {asset.value ? (
                                                <span className="font-bold text-emerald-600 text-sm">₹{Number(asset.value).toLocaleString()}</span>
                                            ) : (
                                                <span className="text-muted-foreground text-xs italic">N/A</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => openEditForm(asset)}
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                    title="Edit Asset"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id, asset.name)}
                                                    className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                    title="Delete Asset"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {isFormOpen && (
                <AssetFormModal
                    isOpen={isFormOpen}
                    onClose={() => setIsFormOpen(false)}
                    asset={selectedAsset}
                />
            )}
        </div>
    );
}
