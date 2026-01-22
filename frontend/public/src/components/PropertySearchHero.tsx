import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Calendar, Users } from 'lucide-react';
import { PropertyType } from '../types';

const propertyTypes: { value: PropertyType | ''; label: string }[] = [
    { value: '', label: 'All Types' },
    { value: 'RESORT', label: 'Resort' },
    { value: 'HOMESTAY', label: 'Homestay' },
    { value: 'HOTEL', label: 'Hotel' },
    { value: 'VILLA', label: 'Villa' },
];

export default function PropertySearchHero() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [propertyType, setPropertyType] = useState<PropertyType | ''>('');
    const [checkIn, setCheckIn] = useState('');
    const [guests, setGuests] = useState('2');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (propertyType) params.set('type', propertyType);
        if (checkIn) params.set('checkIn', checkIn);
        if (guests) params.set('guests', guests);
        navigate(`/properties?${params.toString()}`);
    };

    return (
        <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
            {/* Background Image with Parallax Effect */}
            <div
                className="absolute inset-0 bg-cover bg-center bg-fixed"
                style={{
                    backgroundImage: `url('https://images.unsplash.com/photo-1566073771259-6a8506099945?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')`,
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
            </div>

            {/* Content */}
            <div className="relative z-10 container mx-auto px-4 text-center">
                {/* Headline */}
                <h1 className="text-4xl md:text-6xl font-bold text-white mb-4 leading-tight">
                    Discover Your Perfect
                    <span className="block text-primary-400">Getaway</span>
                </h1>
                <p className="text-lg md:text-xl text-gray-200 mb-8 max-w-2xl mx-auto">
                    Explore handpicked resorts, homestays, and villas for an unforgettable experience
                </p>

                {/* Search Form */}
                <form
                    onSubmit={handleSearch}
                    className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl p-4 md:p-6 max-w-4xl mx-auto"
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Location/Search */}
                        <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Where to?"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {/* Property Type */}
                        <div className="relative">
                            <select
                                value={propertyType}
                                onChange={(e) => setPropertyType(e.target.value as PropertyType | '')}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
                            >
                                {propertyTypes.map(type => (
                                    <option key={type.value} value={type.value}>{type.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Check-in Date */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <input
                                type="date"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                        </div>

                        {/* Guests */}
                        <div className="relative">
                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                            <select
                                value={guests}
                                onChange={(e) => setGuests(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none bg-white"
                            >
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                                    <option key={n} value={n}>{n} Guest{n > 1 ? 's' : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Search Button */}
                    <button
                        type="submit"
                        className="mt-4 w-full md:w-auto px-8 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Search className="h-5 w-5" />
                        Search Properties
                    </button>
                </form>

                {/* Quick Stats */}
                <div className="flex flex-wrap justify-center gap-8 mt-12 text-white">
                    <div className="text-center">
                        <div className="text-3xl font-bold">50+</div>
                        <div className="text-gray-300 text-sm">Properties</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold">10+</div>
                        <div className="text-gray-300 text-sm">Destinations</div>
                    </div>
                    <div className="text-center">
                        <div className="text-3xl font-bold">1000+</div>
                        <div className="text-gray-300 text-sm">Happy Guests</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
