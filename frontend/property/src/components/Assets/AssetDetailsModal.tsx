import { X, Package, Tag, FileText, Image as ImageIcon, ExternalLink, Calendar, MapPin, Info } from 'lucide-react';
import type { Asset } from '../../services/assets';

interface AssetDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
}

export function AssetDetailsModal({ isOpen, onClose, asset }: AssetDetailsModalProps) {
    if (!isOpen || !asset) return null;

    const conditionColors: Record<string, string> = {
        'NEW': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
        'GOOD': 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        'FAIR': 'bg-amber-500/10 text-amber-600 border-amber-500/20',
        'POOR': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
        'DAMAGED': 'bg-rose-500/10 text-rose-600 border-rose-500/20',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-2xl rounded-3xl shadow-2xl border border-border/50 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border/50 bg-muted/20">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 text-primary rounded-xl rotate-3">
                            <Package className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-foreground tracking-tight">{asset.name}</h2>
                            <p className="text-sm text-muted-foreground font-medium flex items-center gap-2 mt-1">
                                <Tag className="h-3 w-3" />
                                {asset.category}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-xl transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    
                    {/* Basic Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Ownership</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-black uppercase tracking-wider ${
                                asset.ownership === 'LESSOR' 
                                    ? 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20' 
                                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                            }`}>
                                {asset.ownership === 'LESSOR' ? 'Lessor' : 'Lessee'}
                            </span>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Condition</span>
                            <span className={`inline-flex items-center px-2 py-1 rounded border text-xs font-black uppercase tracking-wider ${conditionColors[asset.condition] || 'bg-muted text-muted-foreground border-border'}`}>
                                {asset.condition}
                            </span>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Quantity</span>
                            <span className="text-lg font-black text-foreground">{asset.quantity}</span>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-2xl border border-border/50">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Total Value</span>
                            <span className="text-lg font-black text-emerald-600">
                                {asset.value ? `₹${Number(asset.value).toLocaleString()}` : 'N/A'}
                            </span>
                        </div>
                    </div>

                    {/* Location & Dates */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                                <MapPin className="h-4 w-4" /> Location Details
                            </h3>
                            <div className="bg-muted/10 border border-border/50 rounded-2xl p-4 space-y-3">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium block">Room / Unit</span>
                                    <span className="text-sm font-bold text-foreground">{asset.room ? `Unit ${asset.room.roomNumber}` : 'General Property'}</span>
                                </div>
                                {asset.location && (
                                    <div>
                                        <span className="text-xs text-muted-foreground font-medium block">Specific Location</span>
                                        <span className="text-sm font-bold text-foreground">{asset.location}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Calendar className="h-4 w-4" /> Timeline
                            </h3>
                            <div className="bg-muted/10 border border-border/50 rounded-2xl p-4 space-y-3">
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium block">Purchase Date</span>
                                    <span className="text-sm font-bold text-foreground">
                                        {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : 'Unknown'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground font-medium block">Added to System</span>
                                    <span className="text-sm font-bold text-foreground">
                                        {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {asset.notes && (
                        <div>
                            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2 mb-3">
                                <Info className="h-4 w-4" /> Additional Notes
                            </h3>
                            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                                {asset.notes}
                            </div>
                        </div>
                    )}

                    {/* Attachments Section */}
                    <div className="border-t border-border/50 pt-6">
                        <h3 className="text-sm font-black text-foreground tracking-tight flex items-center gap-2 mb-4">
                            <FileText className="h-5 w-5 text-primary" /> Attachments & Documents
                        </h3>
                        
                        <div className="space-y-6">
                            {/* Bill / Receipt */}
                            <div>
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Bill / Invoice</h4>
                                {asset.billUrl ? (
                                    <a 
                                        href={asset.billUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="group flex items-center justify-between p-4 bg-muted/20 border border-border/50 rounded-2xl hover:bg-muted/40 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-blue-500/10 text-blue-600 rounded-xl">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">View Asset Bill</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">Click to open document</p>
                                            </div>
                                        </div>
                                        <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </a>
                                ) : (
                                    <div className="p-4 bg-muted/10 border border-dashed border-border/60 rounded-2xl text-center">
                                        <p className="text-sm font-medium text-muted-foreground">No bill or invoice attached</p>
                                    </div>
                                )}
                            </div>

                            {/* Images */}
                            <div>
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3">Asset Photos</h4>
                                {asset.images && asset.images.length > 0 ? (
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                        {asset.images.map((img, idx) => (
                                            <a 
                                                key={idx}
                                                href={img}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="group relative aspect-square rounded-2xl overflow-hidden border border-border/50 bg-muted block"
                                            >
                                                <img 
                                                    src={img} 
                                                    alt={`${asset.name} photo ${idx + 1}`} 
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                                />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                                    <ExternalLink className="h-6 w-6 text-white" />
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-4 bg-muted/10 border border-dashed border-border/60 rounded-2xl text-center">
                                        <p className="text-sm font-medium text-muted-foreground flex items-center justify-center gap-2">
                                            <ImageIcon className="h-4 w-4" /> No photos attached
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
