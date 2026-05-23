import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { bannerApi, Banner } from '../../services/banners';

// Fallback banner in case DB has no PROMO banners yet
const FALLBACK_BANNERS = [
    {
        id: 'fb1',
        title: 'Flat 20% OFF',
        badgeText: 'Monsoon Escapes 🌧️',
        description: 'On handpicked stays in Kerala',
        buttonText: 'Explore Deals',
        linkUrl: '/properties',
        imageUrl: '/images/hero-slide-1.png',
        badgeColor: '#a5d2bc',
    },
];

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

export default function HeroBanner() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        bannerApi.getActive('PROMO').then(data => {
            setBanners(data);
        }).catch(() => {}).finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        const list = banners.length > 0 ? banners : FALLBACK_BANNERS;
        if (list.length <= 1) return;
        const timer = setInterval(() => setCurrent(prev => (prev + 1) % list.length), 6000);
        return () => clearInterval(timer);
    }, [banners.length]);

    if (loading) {
        return <div className="w-full h-[160px] rounded-lg bg-gray-100 animate-pulse" />;
    }

    const list: any[] = banners.length > 0 ? banners : FALLBACK_BANNERS;
    const prev = () => setCurrent(p => (p - 1 + list.length) % list.length);
    const next = () => setCurrent(p => (p + 1) % list.length);

    return (
        <div className="w-full relative group">
            {/* Slides Container */}
            <div className="relative w-full h-[160px] md:h-[190px] rounded-lg overflow-hidden shadow-sm border border-gray-100">
                {/* Horizontal Sliding Wrapper */}
                <div 
                    className="flex h-full w-full transition-transform duration-500 ease-in-out"
                    style={{ transform: `translateX(-${current * 100}%)` }}
                >
                    {list.map((banner, index) => {
                        const align = getAlignment(banner);
                        const cleanedBadge = cleanText(banner.badgeText);
                        const cleanedTitle = cleanText(banner.title);
                        const cleanedDesc = cleanText(banner.description);

                        let positionClass = "left-6 md:left-16";
                        let cardAlignClass = "items-start text-left";
                        let buttonAlignClass = "self-start";

                        if (align === 'right') {
                            positionClass = "right-6 md:right-16 left-auto";
                            cardAlignClass = "items-start text-left";
                            buttonAlignClass = "self-start";
                        } else if (align === 'center') {
                            positionClass = "left-1/2 -translate-x-1/2";
                            cardAlignClass = "items-center text-center";
                            buttonAlignClass = "self-center";
                        }

                        return (
                            <div
                                key={banner.id || index}
                                className="w-full h-full flex-shrink-0 relative"
                            >
                                {/* Background Image */}
                                <div className="absolute inset-0">
                                    <img
                                        src={banner.imageUrl || '/images/hero-slide-1.png'}
                                        alt={cleanedTitle}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                {/* Gradient Overlay matching alignment direction for maximum legibility */}
                                <div className={`absolute inset-0 ${
                                    align === 'right' 
                                        ? 'bg-gradient-to-l from-black/85 via-black/40 to-transparent' 
                                        : align === 'center' 
                                            ? 'bg-black/45' 
                                            : 'bg-gradient-to-r from-black/85 via-black/40 to-transparent'
                                }`} />

                                {/* Text content overlay container */}
                                <div className={`absolute inset-y-0 flex flex-col justify-center z-10 max-w-[85%] md:max-w-[45%] ${positionClass}`}>
                                    {/* Text container directly (no glass card background or border!) */}
                                    <div className={`flex flex-col ${cardAlignClass}`}>
                                        {cleanedBadge && (
                                            <span
                                                className="text-xs font-semibold mb-1 inline-block"
                                                style={{ color: banner.badgeColor || '#a5d2bc', fontFamily: 'Open Sans, sans-serif' }}
                                            >
                                                {cleanedBadge}
                                            </span>
                                        )}
                                        <h3
                                            className="text-lg md:text-2xl font-bold text-white leading-tight mb-1"
                                            style={{ fontFamily: 'Playfair Display, serif' }}
                                        >
                                            {cleanedTitle}
                                        </h3>
                                        {cleanedDesc && (
                                            <p className="text-[11px] md:text-xs text-gray-200 mb-2 md:mb-3 max-w-xs" style={{ fontFamily: 'Open Sans, sans-serif' }}>
                                                {cleanedDesc}
                                            </p>
                                        )}
                                        <Link
                                            to={banner.linkUrl || '/properties'}
                                            className={`${buttonAlignClass} bg-white text-primary-800 text-[10px] md:text-xs font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:bg-gray-100 transition-colors shadow-sm`}
                                        >
                                            {banner.buttonText || 'Explore Deals'}
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Left / Right arrows */}
                {list.length > 1 && (
                    <>
                        <button
                            onClick={prev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft className="h-4 w-4 text-gray-700" />
                        </button>
                        <button
                            onClick={next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <ChevronRight className="h-4 w-4 text-gray-700" />
                        </button>
                    </>
                )}

                {/* Dots inside the container at the bottom */}
                {list.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
                        {list.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrent(idx)}
                                className={`rounded-full transition-all duration-300 ${idx === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70'}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
