import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/booking';
import { useSearch } from '../context/SearchContext';
import { useCurrency } from '../context/CurrencyContext';
import SearchForm from '../components/booking/SearchForm';
import PropertyCard from '../components/PropertyCard';

import { Loader2, AlertCircle, Search, MapPin } from 'lucide-react';

export default function SearchResults() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { selectedCurrency } = useCurrency();
    const {
        location, setLocation,
        categoryId: globalCategoryId, setCategoryId: setGlobalCategoryId,
        checkIn: globalCheckIn,
        checkOut: globalCheckOut,
        adults,
        children,
        rooms,
        latitude, setLatitude,
        longitude, setLongitude,
        radius, setRadius,
        isGroupBooking,
        groupSize
    } = useSearch();


    // Format dates for API
    const checkInStr = globalCheckIn ? globalCheckIn.toISOString().split('T')[0] : '';
    const checkOutStr = globalCheckOut ? globalCheckOut.toISOString().split('T')[0] : '';

    const { data, isLoading, error } = useQuery({
        queryKey: ['availability', checkInStr, checkOutStr, adults, children, rooms, location, globalCategoryId, latitude, longitude, radius, isGroupBooking, groupSize],
        queryFn: () => bookingService.searchRooms({
            checkInDate: checkInStr,
            checkOutDate: checkOutStr,
            adults,
            children,
            location: location,
            categoryId: globalCategoryId || undefined,
            includeSoldOut: false,
            rooms,
            latitude: latitude || undefined,
            longitude: longitude || undefined,
            radius: radius || undefined,
            currency: selectedCurrency,
            isGroupBooking,
            groupSize
        }),
        enabled: !!checkInStr && !!checkOutStr,
    });


    const clearFilters = () => {
        setGlobalCategoryId('');
        setLocation('');
        setRadius(50);
        setLatitude(null);
        setLongitude(null);

        const params = new URLSearchParams(searchParams);
        params.delete('location');
        params.delete('categoryId');
        params.delete('latitude');
        params.delete('longitude');
        params.delete('radius');
        setSearchParams(params);
    };

    // Group available room types by property
    const groupedProperties = useMemo(() => {
        if (!data) return [];

        // Handle both old array response and any potential object wrapped response for safety
        const roomTypes = Array.isArray(data) ? data : (data as any).availableRoomTypes || [];

        const propertyMap = new Map<string, any>();

        roomTypes.forEach((roomType: any) => {
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

    // Split results into exact matches and nearby matches
    const isExactMatch = (city: string | undefined | null, search: string) => {
        if (!city || !search) return false;
        const c = city.toLowerCase();
        const s = search.toLowerCase();
        return c === s || c.includes(s) || s.includes(c) || c.startsWith(s.substring(0, Math.min(s.length, 6)));
    };

    const exactMatches = useMemo(() => {
        if (!location) return groupedProperties;
        return groupedProperties.filter(p => isExactMatch(p.city, location));
    }, [groupedProperties, location]);

    const nearbyMatches = useMemo(() => {
        if (!location) return [];
        return groupedProperties.filter(p => !isExactMatch(p.city, location));
    }, [groupedProperties, location]);

    if (error) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-12 text-center pt-28">
                <div className="bg-red-50 text-red-900 p-8 rounded-lg border border-red-100 max-w-lg mx-auto shadow-sm">
                    <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-red-900 mb-2">
                        {isGroupBooking ? 'Group Stay Search Unavailable' : 'Search Error'}
                    </h3>
                    <p className="text-red-600 text-sm font-medium leading-relaxed mb-6">
                        {isGroupBooking
                            ? "Currently, we're having trouble retrieving group stay options. This may be because no properties have configured group packages yet."
                            : "We encountered an issue while loading availability. Please try again in a few moments."
                        }
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2.5 bg-red-600 text-white rounded-lg text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-colors"
                    >
                        Try Refreshing
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-28">
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12 py-8">
                {/* Search Bar Refinement */}
                <div className="mb-8">
                    <div className="max-w-4xl mx-auto">
                        <SearchForm variant="inline" theme="light" />
                        

                    </div>
                </div>

                <div className="space-y-8">
                    {/* Results List */}
                    <div className="space-y-6">
                        <div className="flex items-center justify-between px-2">
                            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-4">
                                {isLoading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                                        Updating results...
                                    </span>
                                ) : (
                                    <>
                                        {groupedProperties.length} Accommodations Available
                                        {latitude && longitude && (
                                            <span className="text-[10px] bg-blue-50 text-blue-600 pl-3 pr-2 py-1 rounded-full border border-blue-100 flex items-center gap-1.5 font-black uppercase tracking-tighter shadow-sm">
                                                <MapPin className="h-3 w-3 shrink-0" />
                                                Within 
                                                <input 
                                                    type="number" 
                                                    min="1" 
                                                    max="500" 
                                                    value={radius || 50} 
                                                    onChange={(e) => {
                                                        const val = parseInt(e.target.value);
                                                        if (!isNaN(val) && val > 0) setRadius(val);
                                                    }}
                                                    className="w-10 bg-white border border-blue-200 rounded px-1 py-0.5 text-center text-blue-700 outline-none focus:ring-1 focus:ring-blue-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                                KM
                                            </span>
                                        )}
                                    </>
                                )}
                            </h2>
                        </div>

                        {/* Property Cards Grid */}
                        {/* Property Cards Grid */}
                        {!isLoading && exactMatches.length === 0 ? (
                            <div className="space-y-8">
                                <div className="bg-white p-10 rounded-lg text-center border border-gray-100 shadow-sm max-w-2xl mx-auto">
                                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                                        {isGroupBooking ? 'No groups available' : 'No matching properties'}
                                    </h2>
                                    <p className="text-gray-500 mb-6 font-medium">
                                        {isGroupBooking
                                            ? `We couldn't find any stays that can accommodate a group of ${groupSize} on these dates. Try a smaller group or different dates.`
                                            : "We couldn't find any exact stays matching your filters. Try adjusting your search."
                                        }
                                    </p>
                                    <button
                                        onClick={clearFilters}
                                        className="px-8 py-3 bg-primary-600 text-white rounded-lg font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary-500/20"
                                    >
                                        Clear all filters
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {isLoading && exactMatches.length === 0 ? (
                                    [1, 2, 3, 4, 5, 6].map(n => (
                                        <div key={n} className="h-[400px] bg-gray-100 rounded-lg animate-pulse" />
                                    ))
                                ) : (
                                    exactMatches.map((property) => (
                                        <div key={property.id} className="relative group animate-in fade-in zoom-in-95 duration-300">
                                            <PropertyCard property={property} />
                                        </div>
                                    ))
                                )}
                            </div>
                        )}

                        {/* Nearby Matches */}
                        {!isLoading && nearbyMatches.length > 0 && (
                            <div className="space-y-6 pt-8">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="h-px flex-1 bg-gray-200" />
                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-500 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
                                        <MapPin className="h-4 w-4 text-primary-500" />
                                        Nearby stays you might like
                                    </div>
                                    <div className="h-px flex-1 bg-gray-200" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {nearbyMatches.map((property) => (
                                        <div key={property.id} className="relative group animate-in fade-in zoom-in-95 duration-300">
                                            <PropertyCard property={property} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
