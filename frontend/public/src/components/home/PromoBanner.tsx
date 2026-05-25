import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bannerApi, Banner } from '../../services/banners';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Helper to parse layout alignment from banner text
const getAlignment = (banner: any): 'left' | 'right' | 'center' => {
    const textToSearch = `${banner.title} ${banner.badgeText || ''} ${banner.description || ''}`;
    if (textToSearch.includes('[right]')) return 'right';
    if (textToSearch.includes('[center]')) return 'center';
    if (textToSearch.includes('[left]')) return 'left';
    return 'left'; // default
};

// Helper to remove formatting tags from rendered text
const cleanText = (text?: string): string => {
    if (!text) return '';
    return text.replace(/\[(left|right|center)\]/g, '').trim();
};

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

    return (
        <section className="relative h-[50vh] md:h-[60vh] rounded-lg overflow-hidden group w-full">
            {/* Slides with crossfade */}
            {banners.map((banner, index) => {
                const align = getAlignment(banner);
                const cleanedBadge = cleanText(banner.badgeText);
                const cleanedTitle = cleanText(banner.title);
                const cleanedDesc = cleanText(banner.description);

                let positionClass = "left-6 md:left-24";
                let cardAlignClass = "items-start text-left";
                let buttonAlignClass = "self-start";

                if (align === 'right') {
                    positionClass = "right-6 md:right-24 left-auto";
                    cardAlignClass = "items-start text-left";
                    buttonAlignClass = "self-start";
                } else if (align === 'center') {
                    positionClass = "left-1/2 -translate-x-1/2";
                    cardAlignClass = "items-center text-center";
                    buttonAlignClass = "self-center";
                }

                const isActive = index === current;

                return (
                    <div
                        key={banner.id || index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}
                    >
                        {/* Background Image */}
                        <div
                            className="absolute inset-0 bg-cover bg-center"
                            style={{ backgroundImage: `url('${banner.imageUrl}')` }}
                        />
                        
                        {/* Gradient Overlay matching alignment direction for maximum legibility */}
                        <div className={`absolute inset-0 ${
                            align === 'right' 
                                ? 'bg-gradient-to-l from-black/85 via-black/40 to-transparent' 
                                : align === 'center' 
                                    ? 'bg-black/45' 
                                    : 'bg-gradient-to-r from-black/85 via-black/40 to-transparent'
                        }`} />

                        {/* Text and buttons container (matching alignment directly on slide background) */}
                        <div className={`absolute inset-y-0 flex flex-col justify-center max-w-[90%] md:max-w-[50%] z-20 ${positionClass}`}>
                            <div className={`flex flex-col ${cardAlignClass}`}>
                                {cleanedBadge && (
                                    <span 
                                        className="inline-block py-1 px-3 rounded-lg bg-primary-800 text-white text-[10px] font-bold tracking-wider uppercase mb-4"
                                    >
                                        {cleanedBadge}
                                    </span>
                                )}
                                <h2 className="text-2xl md:text-5xl font-serif font-bold text-white mb-4 md:mb-6 leading-tight">
                                    {cleanedTitle}
                                </h2>
                                {cleanedDesc && (
                                    <p className="text-xs md:text-lg text-gray-200 mb-6 md:mb-8 leading-relaxed">
                                        {cleanedDesc}
                                    </p>
                                )}

                                <div className={`flex flex-col sm:flex-row gap-3 ${buttonAlignClass === 'self-center' ? 'justify-center w-full' : ''}`}>
                                    <Link
                                        to={banner.linkUrl || '/properties'}
                                        className="inline-flex justify-center items-center gap-2 bg-white text-primary-800 px-6 py-3 rounded-lg text-sm font-bold hover:bg-gray-100 transition-all shadow-lg transform hover:-translate-y-0.5"
                                    >
                                        {banner.buttonText || 'Book Now'}
                                    </Link>
                                    <Link
                                        to="/properties"
                                        className="inline-flex justify-center items-center gap-2 border border-white/30 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-white/10 transition-all backdrop-blur-sm"
                                    >
                                        View All Properties
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Controls */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md hover:bg-white/20 z-30"
                    >
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                        onClick={next}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white opacity-0 group-hover:opacity-100 transition-all backdrop-blur-md hover:bg-white/20 z-30"
                    >
                        <ChevronRight className="h-6 w-6" />
                    </button>

                    <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-2 z-30">
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
