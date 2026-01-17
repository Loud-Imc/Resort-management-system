import { useState, useEffect } from 'react';
import SearchForm from '../components/booking/SearchForm';
import { ArrowRight, Star, Coffee, Leaf, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/booking';

function HeroCarousel() {
    const slides = [
        "/public/images/hero-slide-1.png",
        "/public/images/hero-slide-2.png"
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
    const { data: featuredRooms, isLoading } = useQuery({
        queryKey: ['featuredRooms'],
        queryFn: bookingService.getFeaturedRooms
    });

    return (
        <div className="space-y-20">
            {/* Hero Section */}
            {/* Hero Section with Carousel */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <HeroCarousel />
                <div className="absolute inset-0 bg-black/20 z-10" />
                <div className="relative z-20 max-w-7xl mx-auto px-4 w-full">
                    <div className="text-center text-white mb-12">
                        <span className="uppercase tracking-widest text-sm font-semibold mb-4 block text-primary-200 animate-fade-in-up">
                            Welcome to Paradise
                        </span>
                        <h1 className="text-5xl md:text-7xl font-serif font-bold mb-6 animate-fade-in-up delay-100">
                            Route Guide
                        </h1>
                        <p className="text-xl text-gray-100 max-w-3xl mx-auto animate-fade-in-up delay-200 drop-shadow-lg">
                            An exclusive eco-retreat nestled on the banks of the Banasura Sagar Dam reservoir.
                            Where nature meets luxury.
                        </p>
                    </div>

                    <SearchForm className="max-w-5xl mx-auto shadow-2xl rounded-xl overflow-hidden animate-fade-in-up delay-300" />
                </div>
            </section>

            {/* Features Section */}
            <section className="max-w-7xl mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 mx-auto bg-primary-50 rounded-full flex items-center justify-center mb-6">
                            <Leaf className="h-8 w-8 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Eco-Luxury Stay</h3>
                        <p className="text-gray-600">Premium villas and suites designed to blend seamlessly with the natural surroundings.</p>
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 mx-auto bg-primary-50 rounded-full flex items-center justify-center mb-6">
                            <Coffee className="h-8 w-8 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Farm-to-Table Dining</h3>
                        <p className="text-gray-600">Organic vegetarian cuisine harvested straight from our local gardens.</p>
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="w-16 h-16 mx-auto bg-primary-50 rounded-full flex items-center justify-center mb-6">
                            <Star className="h-8 w-8 text-primary-600" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Guided Nature Treks</h3>
                        <p className="text-gray-600">Experience the local flora and fauna with our expert nature guides.</p>
                    </div>
                </div>
            </section>

            {/* Secondary Banner - Dam View Experience */}
            <section className="relative h-[60vh] flex items-center bg-gray-900 overflow-hidden">
                <div className="absolute inset-0 opacity-70">
                    <img
                        src="/public/images/secondary-banner.png"
                        alt="Resort Interior View"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-4 w-full">
                    <div className="max-w-2xl bg-white/10 backdrop-blur-md p-8 md:p-12 rounded-2xl border border-white/20 text-white">
                        <h2 className="text-3xl md:text-5xl font-serif font-bold mb-6">Wake up to Serenity</h2>
                        <p className="text-lg text-gray-100 mb-8 leading-relaxed">
                            Experience the magic of the Banasura Sagar Dam right from your window.
                            Every room at Route Guide offers a unique perspective of the reservoir,
                            blending modern comfort with the raw beauty of nature.
                        </p>
                        <Link
                            to="/gallery"
                            className="inline-flex items-center gap-2 bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
                        >
                            View Gallery <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Featured Rooms */}
            <section className="bg-gray-50 py-20">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <span className="text-primary-600 font-semibold tracking-wider uppercase">Accommodation</span>
                            <h2 className="text-4xl font-serif font-bold mt-2">Our Rooms & Suites</h2>
                        </div>
                        <Link to="/rooms" className="hidden md:flex items-center gap-2 text-primary-700 font-semibold hover:gap-3 transition-all">
                            View All Rooms <ArrowRight className="h-5 w-5" />
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
                            featuredRooms?.slice(0, 3).map((room: any) => (
                                <div key={room.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full">
                                    <div className="h-64 overflow-hidden relative">
                                        {room.images && room.images.length > 0 ? (
                                            <img
                                                src={room.images[0]}
                                                alt={room.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400">
                                                No Image
                                            </div>
                                        )}
                                        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary-800 shadow-sm">
                                            {room.maxAdults} Adults, {room.maxChildren} Kids
                                        </div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-xl font-bold mb-2">{room.name}</h3>
                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{room.description}</p>
                                        <div className="flex justify-between items-center border-t border-gray-100 pt-4 mt-auto">
                                            <div>
                                                <span className="text-xs text-gray-500 block">Starting from</span>
                                                <span className="text-lg font-bold text-primary-700">${room.basePrice}</span>
                                                <span className="text-xs text-gray-500">/night</span>
                                            </div>
                                            <Link to={`/search?roomType=${room.id}`} className="text-gray-900 font-medium text-sm hover:text-primary-600 flex items-center gap-1 group/link">
                                                Book Now <ArrowRight className="h-4 w-4 transform group-hover/link:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}

                        {!isLoading && (!featuredRooms || featuredRooms.length === 0) && (
                            <div className="col-span-3 text-center py-12 text-gray-500 bg-gray-50 rounded-xl">
                                No featured rooms available at the moment.
                            </div>
                        )}
                    </div>

                    <div className="mt-8 text-center md:hidden">
                        <Link to="/rooms" className="inline-flex items-center gap-2 text-primary-700 font-semibold hover:gap-3 transition-all">
                            View All Rooms <ArrowRight className="h-5 w-5" />
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
                        <Link to="/book" className="bg-white text-primary-900 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors">
                            Check Availability
                        </Link>
                        <a href="#contact" className="border-2 border-white text-white px-8 py-4 rounded-full font-bold hover:bg-white hover:text-primary-900 transition-colors">
                            Contact Reservations
                        </a>
                    </div>
                </div>
            </section>
        </div>
    );
}
