import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../services/properties';
import SearchForm from '../components/booking/SearchForm';
import CategoriesBar from '../components/home/CategoriesBar';
import TrustBadges from '../components/home/TrustBadges';
import OffersSection from '../components/home/OffersSection';
import PromoCards from '../components/home/PromoCards';
import ThirdPartyAdBanner from '../components/home/ThirdPartyAdBanner';
import HandpickedCollections from '../components/home/HandpickedCollections';
import AppDownloadBanner from '../components/home/AppDownloadBanner';
import EventsSection from '../components/home/EventsSection';
import SeoDirectory from '../components/home/SeoDirectory';
import PropertyCard from '../components/PropertyCard';
import { Property } from '../types';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Home() {
    const { data: topUniqueProperties, isLoading: isPropertiesLoading } = useQuery({
        queryKey: ['topUniqueProperties'],
        queryFn: () => propertyApi.getTopUnique(3)
    });

    return (
        <div className="bg-[#f2f2f2] min-h-screen text-gray-900">

            {/* ─── 1. EXACT MMT HERO SECTION WITH FULL-BLEED BACKGROUND ─── */}
            <div className="relative pt-24 md:pt-32 pb-8 md:pb-12 overflow-visible">
                {/* High-Resolution Hero Background Image with MMT-style bottom cut */}
                <div 
                    className="absolute inset-x-0 top-0 bottom-24 md:bottom-28 bg-cover bg-center -z-10"
                    style={{
                        backgroundImage: `url('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2400&q=85')`,
                    }}
                >
                    {/* Dark gradient overlay matching MMT */}
                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/75" />
                </div>

                <div className="max-w-[1280px] mx-auto px-4 sm:px-6 relative z-20 flex flex-col items-center">
                    {/* Category Bar perched atop the Search Card */}
                    <CategoriesBar />

                    {/* Search Form Card */}
                    <SearchForm
                        className="w-full relative z-20"
                        theme="light"
                    />
                </div>
            </div>

            {/* ─── 2. CONTENT SECTIONS (Starting with Offers directly below Hero) ─── */}
            <div className="max-w-[1240px] mx-auto px-4 sm:px-6 space-y-8 mt-4 pb-16">

                {/* Offers & Deals Carousel (Exactly below hero as in MMT) */}
                <OffersSection />

                {/* Trust & Peace of Mind Badges */}
                <TrustBadges />

                {/* Audited 3-Card Featured Stays (Oreedu Assured) */}
                <PromoCards />

                {/* Native 3rd-Party Sponsored Banner */}
                <ThirdPartyAdBanner />

                {/* Handpicked Curated Collections */}
                <HandpickedCollections />

                {/* Events & Experiences Section */}
                <EventsSection />

                {/* Mobile App Download Banner */}
                <AppDownloadBanner />

                {/* Top Unique Properties Collection */}
                <section className="bg-white rounded-xl p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-6 border-b border-gray-100">
                        <div>
                            <div className="flex items-center gap-1.5 text-primary-700 text-xs font-black tracking-widest uppercase">
                                <Sparkles className="h-4 w-4 fill-current" />
                                <span>Curated Boutique Stays</span>
                            </div>
                            <h2 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mt-1">
                                Stay at our top unique properties
                            </h2>
                        </div>
                        <Link
                            to="/properties"
                            className="inline-flex items-center gap-1.5 text-xs font-black text-primary-700 hover:text-primary-800 uppercase tracking-wider"
                        >
                            <span>View All Properties</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        {isPropertiesLoading ? (
                            [1, 2, 3].map((i) => (
                                <div key={i} className="bg-gray-100 rounded-xl h-96 animate-pulse" />
                            ))
                        ) : (
                            topUniqueProperties?.map((property: Property) => (
                                <PropertyCard key={property.id} property={property} />
                            ))
                        )}

                        {!isPropertiesLoading && (!topUniqueProperties || topUniqueProperties.length === 0) && (
                            <div className="col-span-3 text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                                Explore all available resort villas and homestays.
                            </div>
                        )}
                    </div>
                </section>

                {/* Comprehensive High-Density SEO Directory Links */}
                <SeoDirectory />
            </div>

        </div>
    );
}
