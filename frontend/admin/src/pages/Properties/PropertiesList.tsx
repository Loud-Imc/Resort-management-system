import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Plus, MapPin, Star, CheckCircle, XCircle, Loader2, Edit, Users } from 'lucide-react';
import propertyService from '../../services/properties';
import { Property, PropertyType } from '../../types/property';

const propertyTypeLabels: Record<PropertyType, string> = {
    RESORT: 'Resort',
    HOMESTAY: 'Homestay',
    HOTEL: 'Hotel',
    VILLA: 'Villa',
    OTHER: 'Other',
};

const propertyTypeColors: Record<PropertyType, string> = {
    RESORT: 'bg-emerald-100 text-emerald-800',
    HOMESTAY: 'bg-blue-100 text-blue-800',
    HOTEL: 'bg-purple-100 text-purple-800',
    VILLA: 'bg-amber-100 text-amber-800',
    OTHER: 'bg-gray-100 text-gray-800',
};

import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function PropertiesList() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<PropertyType | ''>('');

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async () => {
        try {
            setLoading(true);
            const isManageable = user?.role === 'SuperAdmin' ||
                user?.role === 'Admin' ||
                user?.role === 'PropertyOwner' ||
                user?.role === 'Property Owner' ||
                user?.role === 'Marketing';

            const response = isManageable
                ? await propertyService.getAllAdmin({ search, type: typeFilter || undefined })
                : await propertyService.getAll({ search, type: typeFilter || undefined });
            setProperties(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = () => {
        loadProperties();
    };

    const handleToggleActive = async (id: string, isActive: boolean) => {
        try {
            await propertyService.toggleActive(id, !isActive);
            setProperties(properties.map(p =>
                p.id === id ? { ...p, isActive: !isActive } : p
            ));
        } catch (err: any) {
            toast.error(err.message || 'Failed to update property status');
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
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
                    <p className="text-gray-500">Manage all properties on the platform</p>
                </div>
                <Link
                    to="/properties/new"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Property
                </Link>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search by name, city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as PropertyType | '')}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="">All Types</option>
                        {Object.entries(propertyTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}

            {/* Properties Grid */}
            {properties.length === 0 ? (
                <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
                    <p className="text-gray-500 mt-1">Get started by adding your first property.</p>
                    <Link
                        to="/properties/new"
                        className="mt-4 inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
                    >
                        <Plus className="h-4 w-4" />
                        Add Property
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <div
                            key={property.id}
                            className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                        >
                            {/* Cover Image */}
                            <div className="h-40 bg-gray-200 relative">
                                {property.coverImage ? (
                                    <img
                                        src={property.coverImage}
                                        alt={property.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Building2 className="h-12 w-12 text-gray-400" />
                                    </div>
                                )}
                                {/* Type Badge */}
                                <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-medium rounded ${propertyTypeColors[property.type]}`}>
                                    {propertyTypeLabels[property.type]}
                                </span>
                                {/* Status Badges */}
                                <div className="absolute top-2 right-2 flex gap-1">
                                    {property.isVerified && (
                                        <span className="bg-green-500 text-white px-2 py-1 text-xs rounded flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Verified
                                        </span>
                                    )}
                                    {!property.isActive && (
                                        <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">
                                            Inactive
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-semibold text-gray-900 truncate">{property.name}</h3>
                                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate">{property.city}, {property.state}</span>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
                                    <span>{property._count?.rooms || 0} rooms</span>
                                    <span>{property._count?.bookings || 0} bookings</span>
                                    {property.rating && (
                                        <span className="flex items-center gap-1">
                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                            {property.rating}
                                        </span>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                                    <button
                                        onClick={() => navigate(`/rooms?propertyId=${property.id}`)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 rounded"
                                        title="Manage Rooms"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Rooms
                                    </button>
                                    <button
                                        onClick={() => navigate(`/room-types?propertyId=${property.id}`)}
                                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                                        title="Manage Room Types"
                                    >
                                        <Building2 className="h-4 w-4" />
                                        Types
                                    </button>
                                    <button
                                        onClick={() => navigate(`/properties/${property.id}/edit`)}
                                        className="flex-1 flex items-center justify-center p-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
                                        title="Edit Property"
                                    >
                                        <Edit className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => navigate(`/properties/${property.id}/staff`)}
                                        className="flex-1 flex items-center justify-center p-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded"
                                        title="Manage Staff"
                                    >
                                        <Users className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleActive(property.id, property.isActive)}
                                        className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm rounded ${property.isActive
                                            ? 'text-amber-600 hover:bg-amber-50'
                                            : 'text-green-600 hover:bg-green-50'
                                            }`}
                                    >
                                        {property.isActive ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        {property.isActive ? 'Disable' : 'Enable'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
