import { useState, useEffect } from 'react';
import { Star, MapPin, Sparkles, CheckCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { propertyApi } from '../../services/properties';

export default function PromoCards() {
    const navigate = useNavigate();

    const [properties, setProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [detectedCity, setDetectedCity] = useState<string>('');

    // Detect user city: Step 0 → GPS + Google Reverse Geocode, Step 1 → IP detection
    useEffect(() => {
        const detectLocation = async () => {
            try {
                // Check local storage first (24h TTL)
                const cachedCityRaw = localStorage.getItem('user_detected_city');
                if (cachedCityRaw) {
                    try {
                        const { city, timestamp } = JSON.parse(cachedCityRaw);
                        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
                            setDetectedCity(city);
                            return;
                        }
                    } catch {
                        // ignore parse error, proceed to detect fresh
                    }
                }

                const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

                // STEP 0: Browser GPS → Reverse Geocode
                const gpsCity = await new Promise<string | null>((resolve) => {
                    if (!navigator.geolocation) {
                        resolve(null);
                        return;
                    }
                    navigator.geolocation.getCurrentPosition(
                        async (position) => {
                            try {
                                const { latitude, longitude } = position.coords;
                                const res = await fetch(
                                    `${API_URL}/api/properties/reverse-geocode?lat=${latitude}&lng=${longitude}`
                                );
                                const data = await res.json();
                                resolve(data?.city || null);
                            } catch {
                                resolve(null);
                            }
                        },
                        () => resolve(null),
                        { timeout: 8000, maximumAge: 60000 }
                    );
                });

                if (gpsCity) {
                    setDetectedCity(gpsCity);
                    localStorage.setItem('user_detected_city', JSON.stringify({
                        city: gpsCity,
                        timestamp: Date.now()
                    }));
                    return;
                }

                // STEP 1: IP-based detection via backend
                const res = await fetch(`${API_URL}/api/properties/detect-location`);
                const data = await res.json();

                if (data && data.city) {
                    setDetectedCity(data.city);
                    localStorage.setItem('user_detected_city', JSON.stringify({
                        city: data.city,
                        timestamp: Date.now()
                    }));
                } else {
                    setDetectedCity('');
                }
            } catch (err) {
                console.warn('Failed to detect geolocation, fetching global featured.', err);
                setDetectedCity('');
            }
        };

        detectLocation();
    }, []);

    // Fetch real Featured Properties from DB
    useEffect(() => {
        const fetchPromotions = async () => {
            try {
                setLoading(true);
                const fetchedList = await propertyApi.getHomepageFeatured(3, detectedCity || undefined);
                setProperties(Array.isArray(fetchedList) ? fetchedList : []);
            } catch (error) {
                console.error('Failed to load homepage promotions:', error);
                setProperties([]);
            } finally {
                setLoading(false);
            }
        };

        fetchPromotions();
    }, [detectedCity]);

    const handleCardClick = (prop: any) => {
        if (prop.slug) {
            navigate(`/properties/${prop.slug}`);
        }
    };

    return (
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow ring-1 ring-black/[0.04]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-2 pb-6 border-b border-gray-100">
                <div>
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary-600" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary-700">Oreedu Assured Collections</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
                        Featured & Verified Stays
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                        Handpicked premier resorts & private villas with highest guest satisfaction
                    </p>
                </div>

                <button
                    onClick={() => navigate('/properties')}
                    className="inline-flex items-center gap-1.5 text-xs font-black text-primary-700 hover:text-primary-800 uppercase tracking-wider cursor-pointer"
                >
                    <span>View All Collections</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Content Cards */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="bg-gray-100 rounded-2xl h-80 animate-pulse" />
                    ))}
                </div>
            ) : properties.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-10 text-center mt-6">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400 shadow-2xs">
                        <Sparkles className="h-6 w-6 text-amber-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">Discover Exclusive Stays</h3>
                    <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                        Explore our handpicked collection of villas, eco-stays, and resorts across God's Own Country.
                    </p>
                    <button
                        onClick={() => navigate('/properties')}
                        className="mt-4 px-6 py-2 rounded-full bg-primary-600 text-white text-xs font-bold shadow-sm hover:shadow-md transition-all cursor-pointer"
                    >
                        Explore All Properties
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    {properties.map((promo) => (
                        <div
                            key={promo.id}
                            onClick={() => handleCardClick(promo)}
                            className="group cursor-pointer bg-white rounded-2xl overflow-hidden shadow-2xs hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 ring-1 ring-black/[0.04] flex flex-col justify-between"
                        >
                            <div>
                                {/* Image Container */}
                                <div className="relative h-48 overflow-hidden">
                                    {promo.coverImage ? (
                                        <img
                                            src={promo.coverImage}
                                            alt={promo.name}
                                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center">
                                            <span className="text-3xl font-black text-white/50">{promo.name?.charAt(0)}</span>
                                        </div>
                                    )}

                                    {/* Badges */}
                                    <div className="absolute top-3 left-3 flex items-center gap-2">
                                        <span className="bg-white/95 backdrop-blur-sm text-primary-800 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3 text-emerald-600" />
                                            Assured
                                        </span>
                                        {promo.category?.name && (
                                            <span className="bg-black/50 backdrop-blur-sm text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                                {promo.category.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Content Details */}
                                <div className="p-4">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-current" />
                                        <span className="text-xs font-black text-gray-900">
                                            {promo.rating ? Number(promo.rating).toFixed(1) : '4.8'}
                                        </span>
                                        <span className="text-gray-400 text-[11px]">• Very Good ({promo.reviewCount || 45} reviews)</span>
                                    </div>

                                    <h3 className="text-base font-bold text-gray-900 group-hover:text-primary-700 transition-colors line-clamp-1 leading-snug">
                                        {promo.name}
                                    </h3>

                                    <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                                        <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                        <span className="truncate">
                                            {promo.city && promo.state ? `${promo.city}, ${promo.state}` : (promo.city || promo.state || 'Kerala, India')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer: Price and CTA */}
                            <div className="p-4 pt-0 border-t border-gray-100/80 mt-2">
                                <div className="flex items-baseline justify-between pt-3">
                                    <div>
                                        <span className="text-[10px] text-gray-400 block leading-tight">Starting from</span>
                                        <span className="text-lg font-black text-gray-900 leading-tight">
                                            ₹{(promo.basePrice || promo.pricePerNight || 3999).toLocaleString('en-IN')}
                                        </span>
                                        <span className="text-[10px] text-gray-500 font-normal"> / night + taxes</span>
                                    </div>
                                    <span className="text-xs font-black text-primary-700 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                                        View Stay <ArrowRight className="h-3.5 w-3.5" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
