import { useState, useEffect } from 'react';
import { marketingService, MarketingStats } from '../../services/marketing';
import { Property } from '../../types/property';
import { Loader2, Building2, CheckCircle, Clock, Link as LinkIcon, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-hot-toast';
export default function MarketingDashboard() {
    const [stats, setStats] = useState<MarketingStats | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        loadDashboard();
    }, []);

    const loadDashboard = async () => {
        try {
            const [statsData, propertiesData] = await Promise.all([
                marketingService.getStats(),
                marketingService.getMyProperties(),
            ]);
            setStats(statsData);
            setProperties(propertiesData);
        } catch (error) {
            console.error('Failed to load marketing dashboard', error);
        } finally {
            setLoading(false);
        }
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
            <h1 className="text-2xl font-bold text-foreground">Marketing Dashboard</h1>

            {/* Referral Link Card */}
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <LinkIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-foreground">Your Referral Link</h2>
                        <p className="text-sm text-muted-foreground">Share this link with property owners. Any property that registers using this link will be automatically assigned to you for commission tracking.</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1.5 pl-4 w-full md:w-auto">
                    <code className="text-sm text-foreground truncate max-w-[200px] md:max-w-xs select-all">
                        {`${(import.meta.env.VITE_PROPERTY_URL || 'http://localhost:5175').replace('/login', '')}/register?ref=${user?.id}`}
                    </code>
                    <button
                        onClick={() => {
                            navigator.clipboard.writeText(`${(import.meta.env.VITE_PROPERTY_URL || 'http://localhost:5175').replace('/login', '')}/register?ref=${user?.id}`);
                            toast.success('Referral link copied to clipboard!');
                        }}
                        className="p-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                    >
                        <Copy className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Properties</p>
                            <p className="text-3xl font-black text-foreground">{stats?.totalProperties || 0}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl group-hover:bg-blue-500/20 transition-colors">
                            <Building2 className="h-6 w-6 text-blue-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Pending Commissions</p>
                            <p className="text-3xl font-black text-amber-500">₹{stats?.pendingEarnings || 0}</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl group-hover:bg-amber-500/20 transition-colors">
                            <Clock className="h-6 w-6 text-amber-500" />
                        </div>
                    </div>
                </div>
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border group hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Total Earnings (Paid)</p>
                            <p className="text-3xl font-black text-emerald-500">₹{stats?.totalEarnings || 0}</p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                            <CheckCircle className="h-6 w-6 text-emerald-500" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties List */}
            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <div className="p-6 border-b border-border">
                    <h2 className="text-lg font-bold text-card-foreground">My Added Properties</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-muted/50 border-b border-border">
                            <tr>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Property</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Location</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Status</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Commission</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Payout Status</th>
                                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-xs">Date Added</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {properties.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground font-medium opacity-50">
                                        No properties found. Click "Add Property" to start earning.
                                    </td>
                                </tr>
                            ) : (
                                properties.map((property) => (
                                    <tr key={property.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-card-foreground">{property.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground font-medium">
                                            {property.city}, {property.state}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${property.isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-destructive/10 text-destructive'
                                                }`}>
                                                {property.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-card-foreground">
                                            ₹{property.marketingCommission || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm ${property.commissionStatus === 'PAID'
                                                ? 'bg-emerald-500/10 text-emerald-500'
                                                : property.commissionStatus === 'CANCELLED'
                                                    ? 'bg-destructive/10 text-destructive'
                                                    : 'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                {property.commissionStatus || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-muted-foreground font-medium text-xs">
                                            {format(new Date(property.createdAt), 'MMM d, yyyy')}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
