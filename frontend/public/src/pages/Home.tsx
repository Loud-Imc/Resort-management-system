import { useState, useEffect } from 'react';
import SearchForm from '../components/booking/SearchForm';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../services/properties';
import EventsSection from '../components/home/EventsSection';
import PromoBanner from '../components/home/PromoBanner';
import PropertyCard from '../components/PropertyCard';
import { Property } from '../types';

function HeroCarousel() {
    const slides = [
        "/images/hero-slide-1.png",
        "/images/hero-slide-2.png"
    ];
    const [current, setCurrent] = useState(0);

    // Auto-advance
    useEffect(() => {
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
            <div className="absolute bottom-10 left-0 right-0 z-20 flex justify-center gap-2">
                {slides.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => setCurrent(idx)}
                        className={`h-2 rounded-full transition-all duration-300 ${idx === current ? 'w-8 bg-white' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                    />
                ))}
            </div>
        </div>
    );
}

export default function Home() {
    const { data: featuredProperties, isLoading } = useQuery({
        queryKey: ['featuredProperties'],
        queryFn: () => propertyApi.getFeatured(3)
    });

    return (
        <div className="space-y-0">
            {/* Hero Section */}
            <section className="relative h-[80vh] md:h-screen flex items-start pt-32 md:items-center md:justify-center md:pt-0 overflow-hidden">
                <HeroCarousel />
                <div className="absolute inset-0 bg-black/20 z-10" />
                <div className="relative z-20 max-w-7xl mx-auto px-4 w-full">
                    <SearchForm className="animate-fade-in-up" />
                </div>
            </section>

            {/* Events Section */}
            <EventsSection />

            {/* Promo Banner (Replaces Secondary Banner) */}
            <PromoBanner />

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
                        {isLoading ? (
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

                        {!isLoading && (!featuredProperties || featuredProperties.length === 0) && (
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

            {/* CTA Section */}
            <section className="bg-primary-900 text-white py-20 relative overflow-hidden">
                <div className="absolute top-0 right-0 opacity-10">
                    <svg width="400" height="400" viewBox="0 0 200 200">
                        <path fill="currentColor" d="M45.7,-76.3C58.9,-69.3,69.1,-55.6,76.3,-41.4C83.5,-27.2,87.7,-12.4,85.3,1.4C82.9,15.2,73.9,28,63.6,38.3C53.3,48.6,41.7,56.3,29.8,62.5C17.9,68.7,5.6,73.4,-7.6,75.1C-20.8,76.8,-35,75.5,-47.2,69.5C-59.4,63.5,-69.6,52.8,-76.3,40.5C-83,28.2,-86.2,14.1,-84.6,0.9C-83,-12.3,-76.6,-24.6,-68.2,-35.1C-59.8,-45.6,-49.4,-54.3,-37.9,-62.4C-26.4,-70.5,-13.8,-78,0.7,-79.1C15.2,-80.3,30.4,-75,43.3,-67.2L45.7,-76.3Z" transform="translate(100 100)" />
                    </svg>
                </div>

                <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
                    <h2 className="text-4xl font-serif font-bold mb-6">Begin Your Wellness Journey Today</h2>
                    <p className="text-xl text-primary-100 mb-10">
                        Book your stay directly with us to receive a complimentary nature consultation and a guided tour of our gardens.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link to="/properties" className="bg-white text-primary-900 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors">
                            Check Availability
                        </Link>
                        <a href="/contact" className="border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-primary-900 transition-colors">
                            Contact Reservations
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
