import { useState, useEffect } from 'react';
import { Star, MapPin, Sparkles } from 'lucide-react';
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
                    } catch (e) {
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
        <section className="mb-8">
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map(n => (
                        <div key={n} className="relative aspect-[16/9] bg-gray-200 rounded-lg animate-pulse" />
                    ))}
                </div>
            ) : properties.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs">
                    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3 text-gray-400">
                        <Sparkles className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-800">No Featured Properties</h3>
                    <p className="text-xs text-gray-500 mt-1">There are no featured properties available at the moment.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {properties.map((promo) => (
                        <div
                            key={promo.id}
                            onClick={() => handleCardClick(promo)}
                            className="group cursor-pointer relative aspect-[16/9] overflow-hidden rounded-lg transition-all duration-300 hover:shadow-2xl bg-gray-100"
                        >
                            {promo.coverImage && (
                                <img
                                    src={promo.coverImage}
                                    alt={promo.name}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            )}

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
                                                <span className="text-white text-xs font-bold">
                                                    {promo.rating ? Number(promo.rating).toFixed(1) : '4.5'}
                                                </span>
                                                <span className="text-white/80 text-[10px] ml-1">Excellent</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white text-sm font-bold">
                                                From ₹{(promo.basePrice || promo.pricePerNight || 0).toLocaleString('en-IN')}
                                            </p>
                                            <p className="text-xs font-normal text-white/80">/ night</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}
