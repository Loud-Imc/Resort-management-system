import { useState, useEffect } from 'react';
import SearchForm from '../components/booking/SearchForm';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../services/properties';
import { bannerApi, Banner } from '../services/banners';
import { heroContentApi } from '../services/heroContent';
import PromoBanner from '../components/home/PromoBanner';
import EventsSection from '../components/home/EventsSection';
import PromoCards from '../components/home/PromoCards';
import PropertyCard from '../components/PropertyCard';
import HeroText from '../components/home/HeroText';
import { Property } from '../types';

interface HeroCarouselProps {
    banners: Banner[];
}

function HeroCarousel({ banners }: HeroCarouselProps) {
    const defaultSlides = [
        "/images/hero-slide-1.png",
        "/images/hero-slide-2.png",
    ];

    const slides = banners.length > 0 ? banners.map(b => b.imageUrl) : defaultSlides;
    const [current, setCurrent] = useState(0);

    // Auto-advance
    useEffect(() => {
        if (slides.length <= 1) return;
        const timer = setInterval(() => {
            setCurrent(prev => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [slides.length]);

    return (
        <div className="absolute inset-0 z-0 overflow-hidden">
            {slides.map((slide, index) => {
                const isColor = slide?.startsWith('color::');
                const colorVal = isColor ? slide.replace('color::', '') : '';
                return (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === current ? 'opacity-100' : 'opacity-0'}`}
                        style={isColor
                            ? { background: colorVal }
                            : { backgroundImage: `url('${slide}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        }
                    />
                );
            })}
            {slides.length > 1 && (
                <div className="absolute bottom-32 left-0 right-0 z-20 flex justify-center gap-2">
                    {slides.map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrent(idx)}
                            className={`h-2 rounded-full transition-all duration-300 ${idx === current ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function Home() {
    const { data: topUniqueProperties, isLoading: isPropertiesLoading } = useQuery({
        queryKey: ['topUniqueProperties'],
        queryFn: () => propertyApi.getTopUnique(3)
    });

    const { data: heroBanners = [] } = useQuery({
        queryKey: ['heroBanners'],
        queryFn: () => bannerApi.getActive('HERO')
    });

    const { data: randomHeroContent } = useQuery({
        queryKey: ['randomHeroContent'],
        queryFn: () => heroContentApi.getRandom(),
        staleTime: 0, // Ensure refresh on each load
    });

    // Default fallback content if none in DB
    const defaultHeroContent = {
        tagline: "Sustainable Journeys, Meaningful Stays",
        heading: "Find places worth disappearing into",
        subheading: "Curated eco-luxury stays across India. Travel slower. Stay deeper."
    };

    const displayContent = randomHeroContent || defaultHeroContent;

    return (
        <div className="space-y-0 bg-white">
            {/* Full-Width Compact Hero — image behind heading + search bar only */}
            <section className="relative w-full">
                {/* Dynamic banner slideshow */}
                <HeroCarousel banners={heroBanners} />
                {/* Subtle dark overlay for readability */}
                <div className="absolute inset-0 bg-black/30 pointer-events-none" />

                {/* Content */}
                <div className="relative z-10 max-w-[1500px] mx-auto px-4 md:px-12 flex flex-col items-center text-center gap-8 pt-24 md:pt-28 pb-12">
                    <HeroText
                        heading={displayContent.heading}
                        className="w-full max-w-5xl text-white drop-shadow-lg"
                    />
                    <SearchForm
                        className="w-full max-w-[1400px]"
                        theme="dark"
                    />
                </div>
            </section>

            {/* Promotional Cards — on white, immediately below the hero image */}
            <div className="bg-white">
                <PromoCards />
            </div>

            {/* Events Section */}
            <EventsSection />

            {/* Featured Properties */}
            <section className="relative py-20 bg-gray-50 overflow-hidden">
                <div 
                    className="absolute inset-0 z-0 opacity-5"
                    style={{ backgroundImage: "url('/images/hero-slide-1.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }} 
                />
                <div className="relative z-10 max-w-[1500px] mx-auto px-4 md:px-12">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <span className="text-primary-600 text-xs font-semibold tracking-wider uppercase">Collection</span>
                            <h2 className="text-3xl font-serif font-bold mt-2 text-gray-900">Stay at our top unique properties</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {isPropertiesLoading ? (
                            // Loading Skeletons
                            [1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-2xl overflow-hidden shadow-sm h-96 animate-pulse">
                                    <div className="h-64 bg-gray-200" />
                                    <div className="p-6 space-y-4">
                                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            // Real Data
                            topUniqueProperties?.map((property: Property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))
                        )}

                        {!isPropertiesLoading && (!topUniqueProperties || topUniqueProperties.length === 0) && (
                            <div className="col-span-3 text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                                No unique properties available at the moment.
                            </div>
                        )}
                    </div>

                    <div className="mt-12 text-center md:hidden">
                        <Link to="/properties" className="inline-flex items-center gap-2 text-primary-700 font-semibold hover:gap-3 transition-all">
                            View All Properties <ArrowRight className="h-5 w-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Promo Banner (Dynamic) */}
            <PromoBanner />
        </div>
    );
}
