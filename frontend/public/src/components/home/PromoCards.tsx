import { useState, useEffect } from 'react';
import { ArrowRight, Star } from 'lucide-react';
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
    },
    {
        id: 'f2',
        name: 'Heritage Courtyard Stay',
        description: 'A blend of traditional architecture and modern luxury in the heart of history.',
        coverImage: '/images/promo_resort_2.png',
        category: { name: 'Cultural' },
        rating: 4.5,
    },
    {
        id: 'f3',
        name: 'Private Rainforest Retreat',
        description: 'Escape to your own private sanctuary nestled within lush tropical greenery.',
        coverImage: '/images/promo_resort_3.png',
        category: { name: 'Wellness' },
        rating: 4.9,
    }
];

export default function PromoCards() {
    const navigate = useNavigate();
    const { location: activeSearchLocation } = useSearch();
    
    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [detectedCity, setDetectedCity] = useState<string>('');

    // 1. Detect User City via IP (First-time default context)
    useEffect(() => {
        const detectLocation = async () => {
            try {
                // Check local storage first to avoid spamming public IP API
                const cachedCity = localStorage.getItem('user_detected_city');
                if (cachedCity) {
                    setDetectedCity(cachedCity);
                    return;
                }

                // Query public HTTPS IP lookup
                const res = await fetch('https://freeipapi.com/api/json');
                const data = await res.json();
                if (data && data.cityName) {
                    setDetectedCity(data.cityName);
                    localStorage.setItem('user_detected_city', data.cityName);
                }
            } catch (err) {
                console.warn('Failed to detect geolocation, falling back to global featured listings.', err);
            }
        };

        detectLocation();
    }, []);

    // 2. Reactively fetch Featured Properties whenever location changes
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
        <section className="relative z-40 -mt-28 px-4 md:px-12 mb-20">
            <div className="max-w-[1500px] mx-auto">


                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {loading && properties.length === 0 ? (
                        // Preloading pulses
                        [1, 2, 3].map(n => (
                            <div key={n} className="relative aspect-[16/10] bg-white/5 border border-white/10 rounded-[1rem] animate-pulse" />
                        ))
                    ) : (
                        properties.map((promo) => (
                            <div
                                key={promo.id}
                                onClick={() => handleCardClick(promo)}
                                className="group cursor-pointer relative aspect-[16/10] overflow-hidden rounded-[1rem] border border-white/20 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.6)] transition-all duration-700 hover:-translate-y-4 hover:shadow-primary-500/30 hover:z-50"
                            >
                                <img
                                    src={promo.coverImage || '/images/promo_resort_1.png'}
                                    alt={promo.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent p-8 flex flex-col justify-between">
                                    {/* Top Badges */}
                                    <div className="flex justify-between items-start">
                                        <span className="bg-white/10 backdrop-blur-md text-white border border-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
                                            {promo.category?.name || 'Premium Stay'}
                                        </span>
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1 mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`h-3 w-3 ${i < Math.round(Number(promo.rating) || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-white/30'}`}
                                                    />
                                                ))}
                                            </div>
                                            <span className="text-white text-[10px] font-black">
                                                {promo.rating ? `${promo.rating}/5` : 'Featured'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bottom Info */}
                                    <div>
                                        <h3 className="text-2xl font-black text-white leading-tight mb-3">
                                            {promo.name}
                                        </h3>
                                        <div className="flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-500 translate-y-4 group-hover:translate-y-0 transform duration-500">
                                            <p className="text-sm text-white/70 font-medium line-clamp-1 max-w-[75%]">
                                                {promo.description || 'Experience the finest luxury and unparalleled service.'}
                                            </p>
                                            <button className="bg-primary-500 text-white p-3 rounded-full hover:bg-primary-400 transition-all shadow-lg hover:scale-110">
                                                <ArrowRight className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </section>
    );
}
