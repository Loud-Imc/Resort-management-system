import SearchForm from '../components/booking/SearchForm';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../services/properties';
import { heroContentApi } from '../services/heroContent';
import PromoBanner from '../components/home/PromoBanner';
import EventsSection from '../components/home/EventsSection';
import PromoCards from '../components/home/PromoCards';
import PropertyCard from '../components/PropertyCard';
import HeroText from '../components/home/HeroText';
import CategoriesBar from '../components/home/CategoriesBar';
import TrustBadges from '../components/home/TrustBadges';
import HeroBanner from '../components/home/HeroBanner';
import { Property } from '../types';

export default function Home() {
    const { data: topUniqueProperties, isLoading: isPropertiesLoading } = useQuery({
        queryKey: ['topUniqueProperties'],
        queryFn: () => propertyApi.getTopUnique(3)
    });

    const { data: randomHeroContent } = useQuery({
        queryKey: ['randomHeroContent'],
        queryFn: () => heroContentApi.getRandom(),
        staleTime: 0,
    });

    // Default fallback content if none in DB
    const defaultHeroContent = {
        tagline: "Sustainable Journeys, Meaningful Stays",
        heading: "Your next stay, your way.",
        subheading: "Handpicked villas, resorts and eco-stays across Kerala."
    };

    const displayContent = randomHeroContent || defaultHeroContent;

    return (
        <div className="bg-[#fafaf9] min-h-screen">

            {/* ─── HERO SECTION ─── */}
            <section className="pt-24 md:pt-24 pb-3 px-4 md:px-6 lg:px-12 max-w-[1500px] mx-auto flex flex-col items-center">

                {/* Heading */}
                <HeroText
                    heading={displayContent.heading}
                    subheading={displayContent.subheading}
                    className="w-full mb-4"
                />

                {/* Search Bar */}
                <SearchForm
                    className="w-full relative z-30"
                    theme="light"
                />
            </section>

            {/* ─── CATEGORIES BAR ─── */}
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12 mt-2">
                <CategoriesBar />
            </div>

            {/* ─── FEATURED STAYS (PromoCards) ─── */}
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12 mt-1">
                <PromoCards />
            </div>

            {/* ─── TRUST BADGES ─── */}
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12 mt-4">
                <TrustBadges />
            </div>

            {/* ─── HERO BANNER ─── */}
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12 mt-4">
                <HeroBanner />
            </div>

            {/* ─── EVENTS SECTION ─── */}
            <EventsSection />

            {/* ─── TOP UNIQUE PROPERTIES ─── */}
            <section className="relative py-16 bg-gray-50 overflow-hidden">
                <div className="relative z-10 max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12">
                    <div className="flex justify-between items-end mb-10">
                        <div>
                            <span className="text-primary-600 text-xs font-semibold tracking-wider uppercase">Collection</span>
                            <h2 className="text-3xl font-serif font-bold mt-2 text-gray-900">Stay at our top unique properties</h2>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {isPropertiesLoading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="bg-white rounded-lg overflow-hidden shadow-sm h-96 animate-pulse">
                                    <div className="h-64 bg-gray-200" />
                                    <div className="p-6 space-y-4">
                                        <div className="h-6 bg-gray-200 rounded w-3/4" />
                                        <div className="h-4 bg-gray-200 rounded w-full" />
                                        <div className="h-4 bg-gray-200 rounded w-2/3" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            topUniqueProperties?.map((property: Property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))
                        )}

                        {!isPropertiesLoading && (!topUniqueProperties || topUniqueProperties.length === 0) && (
                            <div className="col-span-3 text-center py-12 text-gray-500 bg-white rounded-lg border border-gray-100">
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

            {/* ─── PROMO BANNER ─── */}
            <div className="max-w-[1500px] mx-auto px-4 md:px-6 lg:px-12 mt-4 mb-8">
                <PromoBanner />
            </div>

        </div>
    );
}
