import { useState, useEffect } from 'react';
import { Building2, MapPin, Star, CheckCircle, XCircle, Loader2, LayoutDashboard } from 'lucide-react';
import propertyService from '../../services/properties';
import { Property, PropertyType, PropertyQueryParams } from '../../types/property';
import { categoryService } from '../../services/category';
import { PropertyCategory } from '../../types/category';

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
import clsx from 'clsx';

export default function PropertiesList() {

    const { user } = useAuth();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [typeFilter, setTypeFilter] = useState<PropertyType | ''>('');
    const [categoryId, setCategoryId] = useState('');
    const [categories, setCategories] = useState<PropertyCategory[]>([]);

    useEffect(() => {
        loadProperties();
        loadCategories();
    }, []);

    const loadProperties = async () => {
        try {
            setLoading(true);
            const isManageable = user?.role === 'SuperAdmin' ||
                user?.role === 'Admin' ||
                user?.role === 'PropertyOwner' ||
                user?.role === 'Property Owner' ||
                user?.role === 'Marketing';

            const params: PropertyQueryParams = {
                search,
                type: typeFilter || undefined,
                categoryId: categoryId || undefined,
                status: 'APPROVED' // Default to approved only for this list
            };

            const response = isManageable
                ? await propertyService.getAllAdmin(params)
                : await propertyService.getAll(params);
            setProperties(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const data = await categoryService.getAll();
            setCategories(data);
        } catch (err) {
            console.error('Failed to load categories', err);
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
            toast.success(`Property ${!isActive ? 'enabled' : 'disabled'} successfully`);
        } catch (err: any) {
            toast.error(err.message || 'Failed to update property status');
        }
    };

    const handleOpenDashboard = (propertyId: string) => {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');

        if (!token || !userData) {
            toast.error('Authentication session not found');
            return;
        }

        const propertyUrl = import.meta.env.VITE_PROPERTY_URL;
        // Base64 encode user data for safe transmission
        const encodedUser = btoa(userData);

        const params = new URLSearchParams({
            action: 'impersonate',
            token: token,
            user: encodedUser,
            propertyId: propertyId
        });

        window.open(`${propertyUrl}?${params.toString()}`, '_blank');
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">All Properties</h1>
                    <p className="text-muted-foreground">Platform-wide overview of active and inactive properties</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
                <div className="flex flex-col sm:flex-row gap-4">
                    <input
                        type="text"
                        placeholder="Search by name, city..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as PropertyType | '')}
                        className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    >
                        <option value="">All Types</option>
                        {Object.entries(propertyTypeLabels).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={handleSearch}
                        className="px-6 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors font-medium"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">{error}</div>
            )}

            {properties.length === 0 ? (
                <div className="bg-card rounded-xl shadow-sm border border-border p-12 text-center">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-card-foreground">No properties found</h3>
                    <p className="text-muted-foreground mt-1">Properties will appear here once approved through the Vetting process.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((property) => (
                        <div
                            key={property.id}
                            className="bg-card rounded-xl shadow-sm border border-border overflow-hidden hover:shadow-md transition-all group"
                        >
                            {/* Cover Image */}
                            <div className="h-40 bg-muted relative">
                                {property.coverImage ? (
                                    <img
                                        src={property.coverImage}
                                        alt={property.name}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Building2 className="h-12 w-12 text-muted-foreground opacity-50" />
                                    </div>
                                )}
                                {/* Type/Category Badge */}
                                <span className={`absolute top-2 left-2 px-2 py-1 text-xs font-bold rounded shadow-sm ${propertyTypeColors[property.type]} opacity-90 transition-opacity hover:opacity-100`}>
                                    {property.category?.name || propertyTypeLabels[property.type]}
                                </span>
                                {/* Status Badges */}
                                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                    {property.isVerified && (
                                        <span className="bg-green-500 text-white px-2 py-1 text-xs rounded flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3" />
                                            Verified
                                        </span>
                                    )}
                                    <span className={clsx(
                                        "px-2 py-1 text-xs rounded font-bold shadow-sm",
                                        property.status === 'APPROVED' ? 'bg-green-500 text-white' :
                                            property.status === 'PENDING' ? 'bg-amber-500 text-white' :
                                                property.status === 'REJECTED' ? 'bg-red-500 text-white' :
                                                    'bg-gray-500 text-white'
                                    )}>
                                        {property.status}
                                    </span>
                                    {!property.isActive && property.status === 'APPROVED' && (
                                        <span className="bg-red-500 text-white px-2 py-1 text-xs rounded">
                                            Disabled
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <h3 className="font-bold text-card-foreground truncate text-lg">{property.name}</h3>
                                <div className="flex items-center gap-1 text-muted-foreground text-sm mt-1">
                                    <MapPin className="h-4 w-4" />
                                    <span className="truncate font-medium">{property.city}, {property.state}</span>
                                </div>

                                {/* Stats */}
                                <div className="flex flex-wrap items-center gap-2 mt-4 text-sm text-muted-foreground font-medium">
                                    <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">{property._count?.rooms || 0} rooms</span>
                                    <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">{property._count?.bookings || 0} bookings</span>
                                    <span className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-md border border-primary/20">
                                        {property.platformCommission || 0}% Comm.
                                    </span>
                                    {property.rating && (
                                        <span className="flex items-center gap-1 bg-muted/50 px-2 py-1 rounded-md">
                                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                            {property.rating}
                                        </span>
                                    )}
                                </div>

                                <div className="flex flex-col gap-3 mt-5 pt-4 border-t border-border">
                                    <div className="space-y-3">
                                        {/* Primary Action: Oversight Impersonation */}
                                        <button
                                            onClick={() => handleOpenDashboard(property.id)}
                                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl transition-all shadow-sm group/btn"
                                        >
                                            <LayoutDashboard className="h-4 w-4 transition-transform group-hover/btn:scale-110" />
                                            Impersonate Property Dashboard
                                        </button>

                                        {/* Tertiary Actions */}
                                        <div className="flex gap-2">
                                            {/* <button
                                                onClick={() => navigate(`/properties/${property.id}/staff`)}
                                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-border/50"
                                            >
                                                <Users className="h-3.5 w-3.5" />
                                                Staff
                                            </button> */}
                                            <button
                                                onClick={() => handleToggleActive(property.id, property.isActive)}
                                                className={clsx(
                                                    "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all border border-border/50",
                                                    property.isActive
                                                        ? "text-amber-600 hover:bg-amber-50 hover:border-amber-100"
                                                        : "text-emerald-600 hover:bg-emerald-50 hover:border-emerald-100"
                                                )}
                                            >
                                                {property.isActive ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                                                {property.isActive ? 'Disable' : 'Enable'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
