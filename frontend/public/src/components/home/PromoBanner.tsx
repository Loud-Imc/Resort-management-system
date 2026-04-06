import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bannerApi, Banner } from '../../services/banners';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function PromoBanner() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const data = await bannerApi.getActive('PROMO');
                setBanners(data);
            } catch (error) {
                console.error('Failed to fetch banners', error);
            } finally {
                setLoading(false);
            }
        };
        fetchBanners();
    }, []);

    // Auto-advance
    useEffect(() => {
        if (banners.length <= 1) return;
        const timer = setInterval(() => {
            setCurrent(prev => (prev + 1) % banners.length);
        }, 8000);
        return () => clearInterval(timer);
    }, [banners.length]);

    if (loading) return null;
    if (banners.length === 0) return null;

    const next = () => setCurrent(prev => (prev + 1) % banners.length);
    const prev = () => setCurrent(prev => (prev - 1 + banners.length) % banners.length);

    const activeBanner = banners[current];

    return (
        <section className="relative h-[60vh] md:h-[70vh] overflow-hidden group">
            {/* Background with crossfade */}
            {banners.map((banner, index) => (
                <div key={banner.id} className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === current ? 'opacity-100' : 'opacity-0'}`}>
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${banner.imageUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-900/90 via-gray-900/60 to-transparent"></div>
                </div>
            ))}

            <div className="relative z-10 h-full max-w-7xl mx-auto px-4 flex items-center">
                <div className="max-w-2xl">
                    {activeBanner.badgeText && (
                        <span className="inline-block py-1 px-3 rounded-full bg-primary-600 text-white text-[10px] font-bold tracking-wider uppercase mb-6 animate-fade-in">
                            {activeBanner.badgeText}
                        </span>
                    )}
                    <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight animate-fade-in-up">
                        {activeBanner.title}
                    </h2>
                    {activeBanner.description && (
                        <p className="text-lg md:text-xl text-gray-200 mb-8 leading-relaxed max-w-xl animate-fade-in-up delay-100">
                            {activeBanner.description}
                        </p>
                    )}

                    <div className="flex flex-col sm:flex-row gap-4 animate-fade-in-up delay-200">
                        <Link
                            to={activeBanner.linkUrl || '/properties'}
                            className="inline-flex justify-center items-center gap-2 bg-white text-primary-900 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-all shadow-lg transform hover:-translate-y-1"
                        >
                            {activeBanner.buttonText || 'Book Now'}
                        </Link>
                        <Link
                            to="/properties"
                            className="inline-flex justify-center items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all backdrop-blur-sm"
                        >
                            View All Properties
                        </Link>
                    </div>
                </div>
            </div>

            {/* Controls */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md hover:bg-white/20"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md hover:bg-white/20"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-20">
                        {banners.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrent(idx)}
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === current ? 'w-8 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
                            />
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
