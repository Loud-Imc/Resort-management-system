import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, X, Loader2, Building2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import PropertyCard from '../components/PropertyCard';
import { propertyApi } from '../services/properties';
import { Property, PropertyType } from '../types';

const propertyTypeLabels: Record<PropertyType, string> = {
    RESORT: 'Resort',
    HOMESTAY: 'Homestay',
    HOTEL: 'Hotel',
    VILLA: 'Villa',
    OTHER: 'Other',
};

const defaultAmenities = [
    'WiFi', 'Pool', 'Restaurant', 'Spa', 'Gym', 'Parking', 'Air Conditioning'
];

export default function PropertiesPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Filter state from URL params
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [typeFilter, setTypeFilter] = useState<PropertyType | ''>(
        (searchParams.get('type') as PropertyType) || ''
    );
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

    useEffect(() => {
        loadProperties();
    }, [searchParams]);

    const loadProperties = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await propertyApi.getAll({
                search: searchParams.get('search') || undefined,
                type: (searchParams.get('type') as PropertyType) || undefined,
            });
            setProperties(response.data);
        } catch (err: any) {
            setError(err.message || 'Failed to load properties');
        } finally {
            setLoading(false);
        }
    };

    const handleApplyFilters = () => {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (typeFilter) params.set('type', typeFilter);
        setSearchParams(params);
        setShowFilters(false);
    };

    const clearFilters = () => {
        setSearch('');
        setTypeFilter('');
        setSelectedAmenities([]);
        setSearchParams({});
        setShowFilters(false);
    };

    const toggleAmenity = (amenity: string) => {
        setSelectedAmenities(prev =>
            prev.includes(amenity)
                ? prev.filter(a => a !== amenity)
                : [...prev, amenity]
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-700 pt-24 pb-12">
                <div className="container mx-auto px-4">
                    <h1 className="text-3xl md:text-4xl font-bold text-white">
                        Explore Properties
                    </h1>
                    <p className="text-primary-100 mt-2">
                        Find your perfect stay from our curated collection
                    </p>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar - Desktop */}
                    <aside className="hidden lg:block w-72 shrink-0">
                        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-semibold text-gray-900">Filters</h3>
                                <button
                                    onClick={clearFilters}
                                    className="text-sm text-primary-600 hover:text-primary-700"
                                >
                                    Clear all
                                </button>
                            </div>

                            {/* Search */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search
                                </label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search by name, city..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                                />
                            </div>

                            {/* Property Type */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Property Type
                                </label>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={typeFilter === ''}
                                            onChange={() => setTypeFilter('')}
                                            className="text-primary-600"
                                        />
                                        <span className="text-gray-700">All Types</span>
                                    </label>
                                    {Object.entries(propertyTypeLabels).map(([value, label]) => (
                                        <label key={value} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={typeFilter === value}
                                                onChange={() => setTypeFilter(value as PropertyType)}
                                                className="text-primary-600"
                                            />
                                            <span className="text-gray-700">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Amenities */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Amenities
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {defaultAmenities.map(amenity => (
                                        <button
                                            key={amenity}
                                            onClick={() => toggleAmenity(amenity)}
                                            className={`px-3 py-1 text-sm rounded-full transition-colors ${selectedAmenities.includes(amenity)
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                }`}
                                        >
                                            {amenity}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleApplyFilters}
                                className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Mobile Filters Button */}
                        <div className="lg:hidden mb-4">
                            <button
                                onClick={() => setShowFilters(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg"
                            >
                                <Filter className="h-4 w-4" />
                                Filters
                            </button>
                        </div>

                        {/* Results Count */}
                        <div className="mb-6">
                            <p className="text-gray-600">
                                {loading ? 'Searching...' : `${properties.length} properties found`}
                            </p>
                        </div>

                        {/* Loading */}
                        {loading && (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        {/* Properties Grid */}
                        {!loading && properties.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 text-center">
                                <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
                                <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-4 text-primary-600 hover:text-primary-700"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {properties.map(property => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <Footer />

            {/* Mobile Filters Modal */}
            {showFilters && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
                    <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-xl">
                        <div className="p-4 border-b flex items-center justify-between">
                            <h3 className="font-semibold">Filters</h3>
                            <button onClick={() => setShowFilters(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto h-[calc(100%-120px)]">
                            {/* Same filter content as sidebar */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Property Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value as PropertyType | '')}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                                >
                                    <option value="">All Types</option>
                                    {Object.entries(propertyTypeLabels).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="p-4 border-t flex gap-4">
                            <button
                                onClick={clearFilters}
                                className="flex-1 py-2 border border-gray-300 rounded-lg"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleApplyFilters}
                                className="flex-1 py-2 bg-primary-600 text-white rounded-lg"
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
