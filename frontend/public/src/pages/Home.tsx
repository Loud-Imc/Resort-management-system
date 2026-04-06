import { useState, useEffect } from 'react';
import SearchForm from '../components/booking/SearchForm';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../services/properties';
import { bannerApi, Banner } from '../services/banners';
import PromoBanner from '../components/home/PromoBanner';
import EventsSection from '../components/home/EventsSection';
import PropertyCard from '../components/PropertyCard';
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
        <div className="absolute inset-0 z-0">
            {slides.map((slide, index) => (
                <div
                    key={index}
                    className={`absolute inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${index === current ? 'opacity-100' : 'opacity-0'}`}
                    style={{ backgroundImage: `url('${slide}')` }}
                />
            ))}
            {slides.length > 1 && (
                <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2">
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
    const { data: featuredProperties, isLoading: isPropertiesLoading } = useQuery({
        queryKey: ['featuredProperties'],
        queryFn: () => propertyApi.getFeatured(3)
    });

    const { data: heroBanners = [] } = useQuery({
        queryKey: ['heroBanners'],
        queryFn: () => bannerApi.getActive('HERO')
    });

    return (
        <div className="space-y-0">
            {/* Hero Section */}
            <section className="relative h-[80vh] md:h-screen flex items-start pt-32 md:items-center md:justify-center md:pt-0 z-20">
                <HeroCarousel banners={heroBanners} />
                <div className="absolute inset-0 bg-black/20 z-10" />
                <div className="relative z-30 max-w-7xl mx-auto px-4 w-full">
                    <SearchForm className="animate-fade-in-up" />
                </div>
            </section>

            {/* Events Section */}
            <EventsSection />

            {/* Featured Properties */}
            <section className="bg-gray-50 py-24">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <span className="text-primary-600 font-semibold tracking-wider uppercase">Destinations</span>
                            <h2 className="text-4xl font-serif font-bold mt-2 text-gray-900">Featured Properties</h2>
                        </div>
                        <Link to="/properties" className="hidden md:flex items-center gap-2 text-primary-700 font-semibold hover:gap-3 transition-all">
                            View All Properties <ArrowRight className="h-5 w-5" />
                        </Link>
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
                            featuredProperties?.map((property: Property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))
                        )}

                        {!isPropertiesLoading && (!featuredProperties || featuredProperties.length === 0) && (
                            <div className="col-span-3 text-center py-12 text-gray-500 bg-white rounded-xl border border-gray-100">
                                No featured properties available at the moment.
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

            {/* Promo Banner (Dynamic) - Moved to bottom for better flow */}
            <PromoBanner />
        </div>
    );
}
