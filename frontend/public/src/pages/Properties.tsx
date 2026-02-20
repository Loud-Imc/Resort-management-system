import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2, Building2 } from 'lucide-react';
import PropertyCard from '../components/PropertyCard';
import { propertyApi } from '../services/properties';
import { Property } from '../types';
import SearchForm from '../components/booking/SearchForm';
import PropertyFilters from '../components/PropertyFilters';

export default function PropertiesPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filter state from URL params
    const [search, setSearch] = useState(searchParams.get('search') || '');
    const [categoryId, setCategoryId] = useState<string>(
        searchParams.get('categoryId') || ''
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
                categoryId: searchParams.get('categoryId') || undefined,
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
        if (categoryId) params.set('categoryId', categoryId);
        setSearchParams(params);
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryId('');
        setSelectedAmenities([]);
        setSearchParams({});
    };

    const toggleAmenity = (amenity: string) => {
        if (amenity === 'CLEAR_ALL') {
            setSelectedAmenities([]);
            return;
        }
        setSelectedAmenities(prev =>
            prev.includes(amenity)
                ? prev.filter(a => a !== amenity)
                : [...prev, amenity]
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pt-16">

            {/* Hero Section with Search */}
            <section className="relative h-[45vh] flex items-center justify-center overflow-hidden mb-12">
                <div className="absolute inset-0 z-0">
                    <div
                        className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out"
                        style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&q=80&w=2070')` }}
                    />
                    <div className="absolute inset-0 bg-black/40 z-10" />
                </div>

                <div className="relative z-20 max-w-7xl mx-auto px-4 w-full">
                    <div className="text-center mb-10 animate-fade-in">
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-4">
                            Properties Marketplace
                        </h1>
                        <p className="text-lg text-white/70 max-w-2xl mx-auto">
                            Search and filter through our exclusive collection of luxury properties.
                        </p>
                    </div>
                    <SearchForm className="animate-fade-in-up" variant="inline" theme="dark" />
                </div>
            </section>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col gap-10">
                    {/* Horizontal Filters Section */}
                    <div className="max-w-5xl mx-auto w-full">
                        <PropertyFilters
                            search={search}
                            onSearchChange={setSearch}
                            categoryId={categoryId}
                            onCategoryChange={setCategoryId}
                            selectedAmenities={selectedAmenities}
                            onAmenityToggle={toggleAmenity}
                            onApply={handleApplyFilters}
                            onClear={clearFilters}
                            resultsCount={properties.length}
                            isLoading={loading}
                        />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1">
                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
                                {error}
                            </div>
                        )}

                        {/* Properties Grid */}
                        {!loading && properties.length === 0 ? (
                            <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-gray-100 max-w-2xl mx-auto">
                                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No properties found</h3>
                                <p className="text-gray-500 mt-1">Try adjusting your search or filters to explore more stays.</p>
                                <button
                                    onClick={clearFilters}
                                    className="mt-6 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors uppercase text-[10px] font-black tracking-widest"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {properties.map(property => (
                                    <PropertyCard key={property.id} property={property} />
                                ))}
                            </div>
                        )}

                        {/* Loading More / Loading State */}
                        {loading && properties.length > 0 && (
                            <div className="flex items-center justify-center pt-12">
                                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                            </div>
                        )}

                        {loading && properties.length === 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                {[1, 2, 3, 4, 5, 6].map(n => (
                                    <div key={n} className="h-[400px] bg-gray-100 rounded-3xl animate-pulse" />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
}
