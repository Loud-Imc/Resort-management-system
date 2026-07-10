import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { assetsService } from '../../services/assets';
import { useProperty } from '../../context/PropertyContext';
import { Loader2, Download, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { AssetDetailsModal } from '../Assets/AssetDetailsModal';
import type { Asset } from '../../services/assets';

export default function AssetReport() {
    const { selectedProperty } = useProperty();
    
    const [filters, setFilters] = useState({
        ownership: '',
        condition: '',
        categoryId: '',
    });

    const navigate = useNavigate();
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [selectedDetailsAsset, setSelectedDetailsAsset] = useState<Asset | null>(null);

    const { data: assets, isLoading } = useQuery({
        queryKey: ['assets-report', selectedProperty?.id, filters],
        queryFn: () => assetsService.getAll({ 
            propertyId: selectedProperty?.id as string,
            ownership: filters.ownership || undefined,
            condition: filters.condition || undefined,
            categoryId: filters.categoryId || undefined,
        }),
        enabled: !!selectedProperty?.id,
    });

    const handleDownload = async () => {
        try {
            const blob = await assetsService.downloadReport({
                propertyId: selectedProperty?.id,
                ownership: filters.ownership || undefined,
                condition: filters.condition || undefined,
                categoryId: filters.categoryId || undefined,
            });
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Assets_Report_${new Date().toISOString().split('T')[0]}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Failed to download report', error);
            toast.error('Failed to download PDF report');
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
                <p className="text-muted-foreground font-medium animate-pulse">Loading asset report...</p>
            </div>
        );
    }

    const totalAssets = assets?.reduce((sum, a) => sum + (a.quantity || 1), 0) || 0;
    const totalValue = assets?.reduce((sum, a) => sum + Number(a.value || 0), 0) || 0;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex gap-4">
                    <select
                        value={filters.ownership}
                        onChange={e => setFilters({ ...filters, ownership: e.target.value })}
                        className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">All Ownership</option>
                        <option value="LESSOR">Lessor</option>
                        <option value="LESSEE">Lessee</option>
                    </select>
                    <select
                        value={filters.condition}
                        onChange={e => setFilters({ ...filters, condition: e.target.value })}
                        className="bg-background border border-border/50 rounded-lg px-3 py-2 text-sm"
                    >
                        <option value="">All Conditions</option>
                        <option value="NEW">New</option>
                        <option value="GOOD">Good</option>
                        <option value="FAIR">Fair</option>
                        <option value="POOR">Poor</option>
                        <option value="DAMAGED">Damaged</option>
                    </select>
                </div>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-bold text-sm hover:bg-primary/90 transition-all shadow"
                >
                    <Download className="w-4 h-4" /> Export PDF
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                    onClick={() => navigate('/assets')}
                    className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
                >
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Package className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">Total Assets (Click to View All)</h3>
                    </div>
                    <p className="text-3xl font-black">{totalAssets}</p>
                </div>
                <div className="bg-card border border-border/50 p-6 rounded-2xl shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <span className="font-bold">₹</span>
                        </div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Estimated Value</h3>
                    </div>
                    <p className="text-3xl font-black">₹{totalValue.toLocaleString('en-IN')}</p>
                </div>
            </div>

            <div className="bg-card border border-border/50 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted/50 text-muted-foreground uppercase text-xs font-bold border-b border-border/50">
                            <tr>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Location/Room</th>
                                <th className="px-6 py-4">Condition</th>
                                <th className="px-6 py-4 text-center">Qty</th>
                                <th className="px-6 py-4 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50 font-medium">
                            {assets?.map((asset: Asset) => (
                                <tr 
                                    key={asset.id} 
                                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                                    onClick={() => {
                                        setSelectedDetailsAsset(asset);
                                        setIsDetailsOpen(true);
                                    }}
                                >
                                    <td className="px-6 py-4">
                                        {asset.name}
                                        {asset.ownership === 'LESSOR' ? 
                                            <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] uppercase">Lessor</span> : 
                                            <span className="ml-2 px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[10px] uppercase">Lessee</span>
                                        }
                                    </td>
                                    <td className="px-6 py-4">{asset.category}</td>
                                    <td className="px-6 py-4 text-muted-foreground">
                                        {asset.room ? `Room ${asset.room.roomNumber}` : (asset.location || '-')}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                                            asset.condition === 'NEW' ? 'bg-emerald-100 text-emerald-700' :
                                            asset.condition === 'GOOD' ? 'bg-blue-100 text-blue-700' :
                                            asset.condition === 'DAMAGED' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {asset.condition}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">{asset.quantity}</td>
                                    <td className="px-6 py-4 text-right">{asset.value ? `₹${asset.value.toLocaleString('en-IN')}` : '-'}</td>
                                </tr>
                            ))}
                            {assets?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                                        No assets found for this criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AssetDetailsModal
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                asset={selectedDetailsAsset}
            />
        </div>
    );
}
