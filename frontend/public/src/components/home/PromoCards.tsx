import { useState, useEffect } from 'react';
import { Star, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { propertyApi } from '../../services/properties';

import { useSearch } from '../../context/SearchContext';

// Fallback static cards just in case the system holds absolutely zero properties
const LOCAL_FALLBACKS = [
    {
        id: 'f1',
        name: 'Serene Lake View Hotel',
        description: 'Experience tranquility in our premium eco-villas with stunning lake vistas.',
        coverImage: '/images/promo_resort_1.png',
        category: { name: 'Eco-Luxury' },
        rating: 4.8,
        city: 'Munnar',
        state: 'Kerala'
    },
    {
        id: 'f2',
        name: 'Heritage Courtyard Stay',
        description: 'A blend of traditional architecture and modern luxury in the heart of history.',
        coverImage: '/images/promo_resort_2.png',
        category: { name: 'Cultural' },
        rating: 4.5,
        city: 'Mysore',
        state: 'Karnataka'
    },
    {
        id: 'f3',
        name: 'Private Rainforest Retreat',
        description: 'Escape to your own private sanctuary nestled within lush tropical greenery.',
        coverImage: '/images/promo_resort_3.png',
        category: { name: 'Wellness' },
        rating: 4.9,
        city: 'Coorg',
        state: 'Karnataka'
    }
];

export default function PromoCards() {
    const navigate = useNavigate();
    const { location: activeSearchLocation } = useSearch();

    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [detectedCity, setDetectedCity] = useState<string>('');

    // // 1. Detect User City via IP (First-time default context)
    // useEffect(() => {
    //     const detectLocation = async () => {
    //         try {
    //             // Check local storage first to avoid spamming public IP API
    //             const cachedCity = localStorage.getItem('user_detected_city');
    //             if (cachedCity) {
    //                 setDetectedCity(cachedCity);
    //                 return;
    //             }

    //             // Query public HTTPS IP lookup
    //             const res = await fetch('https://free.freeipapi.com/api/json');
    //             const data = await res.json();
    //             if (data && data.cityName) {
    //                 setDetectedCity(data.cityName);
    //                 localStorage.setItem('user_detected_city', data.cityName);
    //             }
    //         } catch (err) {
    //             console.warn('Failed to detect geolocation, falling back to global featured listings.', err);
    //         }
    //     };

    //     detectLocation();
    // }, []);

    // 2. Reactively fetch Featured Properties whenever location changes
   
        // 1. Detect User City via Cloudflare (from our own backend)
    useEffect(() => {
        const detectLocation = async () => {
            try {
                // Check local storage first to avoid redundant hits
                const cachedCity = localStorage.getItem('user_detected_city');
                if (cachedCity) {
                    setDetectedCity(cachedCity);
                    return;
                }

                // Query our own backend location detector
                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                const res = await fetch(`${API_URL}/api/properties/detect-location`);
                const data = await res.json();
                console.log(data)
                // If Cloudflare successfully geolocated the city
                if (data && data.city) {
                    setDetectedCity(data.city);
                    localStorage.setItem('user_detected_city', data.city);
                } else {
                    // Local development fallback (since localhost doesn't route through Cloudflare)
                    setDetectedCity('Ernakulam'); 
                }
            } catch (err) {
                console.warn('Failed to detect geolocation, falling back to default.', err);
                setDetectedCity('Idukki');
            }
        };

        detectLocation();
    }, []);

    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                setLoading(true);

                // Priority 1: Active User Search. Priority 2: IP Geo detection
                const targetRegion = activeSearchLocation || detectedCity;

                // Attempt to fetch 3 regional featured listings
                let fetchedList = await propertyApi.getFeatured(3, targetRegion || undefined);

                // If regional availability < 3, backfill with general globally featured properties
                if (fetchedList.length < 3) {
                    const globalList = await propertyApi.getFeatured(6);

                    // Merge and remove duplicates
                    const merged = [...fetchedList];
                    for (const prop of globalList) {
                        if (merged.length >= 3) break;
                        if (!merged.some(p => p.id === prop.id)) {
                            merged.push(prop);
                        }
                    }
                    fetchedList = merged;
                }

                // 3. Ultimate Active DB Fallback: If STILL < 3, query regular active database properties
                // This ensures that even if NOONE has requested promotions, we still display real live properties!
                if (fetchedList.length < 3) {
                    try {
                        const res = await propertyApi.getAll({ limit: 10 });
                        const allProperties = res?.data || [];
                        const merged = [...fetchedList];
                        for (const prop of allProperties) {
                            if (merged.length >= 3) break;
                            if (!merged.some(p => p.id === prop.id)) {
                                merged.push(prop);
                            }
                        }
                        fetchedList = merged;
                    } catch (err) {
                        console.warn('Failed to query ultimate fallback general properties.', err);
                    }
                }

                // Final Fallback to static design placeholders if DB contains 0 properties
                if (fetchedList.length === 0) {
                    setProperties(LOCAL_FALLBACKS);
                } else {
                    // We pad remaining slots if database has 1 or 2 items total to keep exactly 3 layout slots
                    const renderList = [...fetchedList];
                    let fallbackIdx = 0;
                    while (renderList.length < 3) {
                        renderList.push({ ...LOCAL_FALLBACKS[fallbackIdx], isPlaceholder: true } as any);
                        fallbackIdx++;
                    }
                    setProperties(renderList);
                }
            } catch (error) {
                console.error('Failed to load homepage promotions:', error);
                setProperties(LOCAL_FALLBACKS);
            } finally {
                setLoading(false);
            }
        };

        fetchPromotions();
    }, [activeSearchLocation, detectedCity]);

    const handleCardClick = (prop: any) => {
        if (prop.slug) {
            navigate(`/properties/${prop.slug}`);
        }
    };

    return (
        <section className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {loading && properties.length === 0 ? (
                    // Preloading pulses
                    [1, 2, 3].map(n => (
                        <div key={n} className="relative aspect-[16/9] bg-gray-200 rounded-lg animate-pulse" />
                    ))
                ) : (
                    properties.map((promo) => (
                        <div
                            key={promo.id}
                            onClick={() => handleCardClick(promo)}
                            className="group cursor-pointer relative aspect-[16/9] overflow-hidden rounded-lg transition-all duration-300 hover:shadow-2xl"
                        >
                            <img
                                src={promo.coverImage || '/images/promo_resort_1.png'}
                                alt={promo.name}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/10 to-transparent p-5 flex flex-col justify-between">
                                {/* Top Row: Category Badge */}
                                <div className="flex justify-between items-start">
                                    <span className="bg-primary-800 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                        {promo.category?.name || 'STAY'}
                                    </span>
                                </div>

                                {/* Bottom Info */}
                                <div>
                                    <h3 className="text-xl font-bold text-white leading-tight mb-1 truncate">
                                        {promo.name}
                                    </h3>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="flex items-center gap-1.5 text-white/90 mb-2">
                                                <MapPin className="h-3.5 w-3.5 text-gray-300" />
                                                <p className="text-xs truncate max-w-[150px]">
                                                    {promo.city && promo.state ? `${promo.city}, ${promo.state}` : (promo.city || promo.state || 'Discover Location')}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                                                <span className="text-white text-xs font-bold">{promo.rating ? Number(promo.rating).toFixed(1) : '4.5'}</span>
                                                <span className="text-white/80 text-[10px] ml-1">Excellent</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white text-sm font-bold">
                                                From ₹{promo.basePrice ? promo.basePrice.toLocaleString('en-IN') : (promo.pricePerNight ? promo.pricePerNight.toLocaleString('en-IN') : '4,200')}
                                            </p>
                                            <p className="text-xs font-normal text-white/80">/ night</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
