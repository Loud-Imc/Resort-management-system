import { useState, useEffect } from 'react';
import { marketingService, MarketingStats } from '../../services/marketing';
import { Property } from '../../types/property';
import { Loader2, Building2, CheckCircle, Clock } from 'lucide-react';

export default function MarketingDashboard() {
    const [stats, setStats] = useState<MarketingStats | null>(null);
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);

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
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Marketing Dashboard</h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Properties Added</p>
                            <p className="text-2xl font-bold text-gray-900">{stats?.totalProperties || 0}</p>
                        </div>
                        <Building2 className="h-8 w-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Pending Commissions</p>
                            <p className="text-2xl font-bold text-yellow-600">₹{stats?.pendingEarnings || 0}</p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-500 bg-yellow-50 p-1.5 rounded-lg" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Earnings (Paid)</p>
                            <p className="text-2xl font-bold text-emerald-600">₹{stats?.totalEarnings || 0}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-lg" />
                    </div>
                </div>
            </div>

            {/* Properties List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">My added properties</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500">Property</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Location</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Commission</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Payout Status</th>
                                <th className="px-6 py-3 font-medium text-gray-500">Date Added</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {properties.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        No properties found. Click "Add Property" to start earning.
                                    </td>
                                </tr>
                            ) : (
                                properties.map((property) => (
                                    <tr key={property.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{property.name}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {property.city}, {property.state}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${property.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {property.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ₹{property.marketingCommission || 0}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${property.commissionStatus === 'PAID'
                                                    ? 'bg-green-100 text-green-800'
                                                    : property.commissionStatus === 'CANCELLED'
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {property.commissionStatus || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {new Date(property.createdAt).toLocaleDateString()}
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
