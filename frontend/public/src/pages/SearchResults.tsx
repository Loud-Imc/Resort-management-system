import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/booking';
import { useCurrency } from '../context/CurrencyContext';
import SearchForm from '../components/booking/SearchForm';
import PropertyCard from '../components/PropertyCard';
import PropertyFilters from '../components/PropertyFilters';
import { Loader2, AlertCircle, Search } from 'lucide-react';
import { format, addDays } from 'date-fns';

export default function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedCurrency } = useCurrency();

    // Use state to hold stable default dates that don't change on re-renders
    const [defaults] = useState(() => {
        const today = new Date();
        return {
            checkIn: format(today, 'yyyy-MM-dd'),
            checkOut: format(addDays(today, 1), 'yyyy-MM-dd')
        };
    });

    // URL Param values
    const checkIn = searchParams.get('checkIn') || defaults.checkIn;
    const checkOut = searchParams.get('checkOut') || defaults.checkOut;
    const adults = Number(searchParams.get('adults')) || 2;
    const children = Number(searchParams.get('children')) || 0;
    const locationParam = searchParams.get('location') || '';
    const categoryIdParam = searchParams.get('categoryId') || '';
    const rooms = Number(searchParams.get('rooms')) || 1;
    const latitudeParam = searchParams.get('latitude') ? Number(searchParams.get('latitude')) : undefined;
    const longitudeParam = searchParams.get('longitude') ? Number(searchParams.get('longitude')) : undefined;
    const radiusParam = searchParams.get('radius') ? Number(searchParams.get('radius')) : 50;

    // Local filter state
    const [search, setSearch] = useState(locationParam);
    const [categoryId, setCategoryId] = useState<string>(categoryIdParam);
    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
    const [radius, setRadius] = useState<number>(radiusParam);

    const { data, isLoading, error } = useQuery({
        queryKey: ['availability', checkIn, checkOut, adults, children, rooms, locationParam, categoryIdParam, latitudeParam, longitudeParam, radiusParam],
        queryFn: () => bookingService.searchRooms({
            checkInDate: checkIn,
            checkOutDate: checkOut,
            adults,
            children,
            location: locationParam,
            categoryId: categoryIdParam || undefined,
            includeSoldOut: false,
            rooms,
            latitude: latitudeParam,
            longitude: longitudeParam,
            radius: radiusParam,
            currency: selectedCurrency
        }),
        enabled: !!checkIn && !!checkOut,
    });

    const handleApplyFilters = () => {
        const params = new URLSearchParams(searchParams);
        if (search) params.set('location', search);
        else params.delete('location');

        if (categoryId) params.set('categoryId', categoryId);
        else params.delete('categoryId');

        if (latitudeParam) params.set('latitude', latitudeParam.toString());
        if (longitudeParam) params.set('longitude', longitudeParam.toString());
        if (radius) params.set('radius', radius.toString());

        setSearchParams(params);
    };

    const handleNearMe = () => {
        if (latitudeParam && longitudeParam) {
            // Toggle off
            const params = new URLSearchParams(searchParams);
            params.delete('latitude');
            params.delete('longitude');
            params.delete('radius');
            setSearchParams(params);
            return;
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const params = new URLSearchParams(searchParams);
                    params.set('latitude', position.coords.latitude.toString());
                    params.set('longitude', position.coords.longitude.toString());
                    params.set('radius', radius.toString());
                    setSearchParams(params);
                },
                (error) => {
                    console.error('Error getting location:', error);
                    alert('Failed to get your location. Please check browser permissions.');
                }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    };

    const clearFilters = () => {
        setSearch('');
        setCategoryId('');
        setSelectedAmenities([]);
        setRadius(50);
        const params = new URLSearchParams(searchParams);
        params.delete('location');
        params.delete('categoryId');
        params.delete('latitude');
        params.delete('longitude');
        params.delete('radius');
        setSearchParams(params);
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

    // Group available room types by property
    const groupedProperties = useMemo(() => {
        if (!data?.availableRoomTypes) return [];

        const propertyMap = new Map<string, any>();

        data.availableRoomTypes.forEach((roomType: any) => {
            if (roomType.property) {
                const propId = roomType.property.id;
                if (!propertyMap.has(propId)) {
                    propertyMap.set(propId, {
                        ...roomType.property,
                        isSoldOut: true,
                        minPrice: roomType.totalPrice,
                        availableRoomCount: 0
                    });
                }

                const property = propertyMap.get(propId);
                if (!roomType.isSoldOut) {
                    property.isSoldOut = false;
                    property.availableRoomCount += (roomType.availableCount || 0);
                    if (roomType.totalPrice < property.minPrice) {
                        property.minPrice = roomType.totalPrice;
                    }
                }
            }
        });

        return Array.from(propertyMap.values()).sort((a, b) => {
            if (a.isSoldOut !== b.isSoldOut) {
                return a.isSoldOut ? 1 : -1;
            }
            return a.minPrice - b.minPrice;
        });
    }, [data]);


    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center pt-28">
                <div className="bg-red-50 text-red-800 p-4 rounded-lg inline-flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5" />
                    Unable to load availability. Please try again later.
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-28">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Search Bar Refinement */}
                <div className="mb-12">
                    <div className="max-w-4xl mx-auto">
                        <SearchForm variant="inline" theme="light" />
                    </div>
                </div>

                <div className="space-y-8">
                    {/* Horizontal Filters */}
                    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100">
                        <PropertyFilters
                            search={search}
                            onSearchChange={setSearch}
                            categoryId={categoryId}
                            onCategoryChange={setCategoryId}
                            selectedAmenities={selectedAmenities}
                            onAmenityToggle={toggleAmenity}
                            onApply={handleApplyFilters}
                            onClear={clearFilters}
                            resultsCount={groupedProperties.length}
                            isLoading={isLoading}
                            radius={radius}
                            onRadiusChange={setRadius}
                            onNearMe={handleNearMe}
                            isNearMeActive={!!(latitudeParam && longitudeParam)}
                        />
                    </div>

                    {/* Results List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-gray-900">
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                                        Updating results...
                                    </span>
                                ) : (
                                    <>
                                        {groupedProperties.length} Accommodations Available
                                    </>
                                )}
                            </h2>
                        </div>

                        {/* Property Cards Grid */}
                        {!isLoading && groupedProperties.length === 0 ? (
                            <div className="bg-white p-16 rounded-3xl text-center border border-gray-100 shadow-sm max-w-2xl mx-auto">
                                <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                <h2 className="text-xl font-bold text-gray-900 mb-2">No matching properties</h2>
                                <p className="text-gray-500 mb-8">We couldn't find any stays matching your filters. Try clearing them to see more options.</p>
                                <button
                                    onClick={clearFilters}
                                    className="px-8 py-3 bg-primary-600 text-white rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-500/20"
                                >
                                    Clear all filters
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {isLoading && groupedProperties.length === 0 ? (
                                    [1, 2, 3, 4, 5, 6].map(n => (
                                        <div key={n} className="h-[400px] bg-gray-100 rounded-3xl animate-pulse" />
                                    ))
                                ) : (
                                    groupedProperties.map((property) => (
                                        <div key={property.id} className="relative group animate-in fade-in zoom-in-95 duration-300">
                                            <PropertyCard property={property} />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
