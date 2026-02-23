import React from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, MapPin, Search, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe, Navigation, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { PropertyCategory } from '../../types';

const ICON_MAP: Record<string, any> = {
    Palmtree,
    Hotel,
    Home,
    Coffee,
    Tent,
    Building,
    Globe,
    Layout,
};

interface SearchProps {
    location: string;
    setLocation: (v: string) => void;
    categoryId: string;
    setCategoryId: (v: string) => void;
    checkIn: Date | null;
    setCheckIn: (v: Date | null) => void;
    checkOut: Date | null;
    setCheckOut: (v: Date | null) => void;
    adults: number;
    setAdults: (v: number) => void;
    children: number;
    setChildren: (v: number) => void;
    rooms: number;
    setRooms: (v: number) => void;
    latitude: number | null;
    setLatitude: (v: number | null) => void;
    longitude: number | null;
    setLongitude: (v: number | null) => void;
    radius: number;
    setRadius: (v: number) => void;
    handleSearch: (e: React.FormEvent) => void;
    categories: PropertyCategory[];
    theme?: 'dark' | 'light';
}

export default function SearchDesktop({
    location, setLocation,
    categoryId, setCategoryId,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults, setAdults,
    children, setChildren,
    rooms, setRooms,
    latitude, setLatitude,
    longitude, setLongitude,
    radius,
    handleSearch,
    categories,
    theme = 'dark'
}: SearchProps) {
    const isDark = theme === 'dark';
    const [isLocating, setIsLocating] = React.useState(false);

    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            alert('Geolocation is not supported by your browser');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude);
                setLongitude(position.coords.longitude);
                setLocation('Current Location');
                setIsLocating(false);
            },
            () => {
                alert('Unable to retrieve your location');
                setIsLocating(false);
            }
        );
    };

    const getIcon = (iconName?: string) => {
        const Icon = iconName ? ICON_MAP[iconName] : Layout;
        return Icon || Layout;
    };

    return (
        <div className="hidden md:block w-full">
            {/* Category Tabs */}
            <div className="flex justify-center mb-10 relative z-10">
                <div className={`flex ${isDark ? 'bg-white/10 backdrop-blur-xl border-white/10' : 'bg-gray-100 border-gray-200'} p-1.5 rounded-3xl shadow-[0_-8px_30px_-10px_rgba(0,0,0,0.12)] border max-w-full overflow-x-auto no-scrollbar`}>
                    <div className="flex min-w-max gap-1">
                        <button
                            type="button"
                            onClick={() => setCategoryId('')}
                            className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-500 group whitespace-nowrap ${categoryId === ''
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-[1.02]'
                                : isDark
                                    ? 'text-white/60 hover:text-white hover:bg-white/10'
                                    : 'text-gray-500 hover:text-primary-600 hover:bg-white'
                                }`}
                        >
                            <Building className={`h-5 w-5 transition-transform duration-500 group-hover:scale-110 ${categoryId === '' ? 'text-white' : isDark ? 'text-primary-400' : 'text-primary-500'}`} />
                            <span className={`text-[13px] font-black uppercase tracking-[0.15em]`}>All Stays</span>
                        </button>
                        {categories.map((cat) => {
                            const Icon = getIcon(cat.icon);
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryId(cat.id)}
                                    className={`flex items-center gap-3 px-8 py-4 rounded-2xl transition-all duration-500 group whitespace-nowrap ${categoryId === cat.id
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-[1.02]'
                                        : isDark
                                            ? 'text-white/60 hover:text-white hover:bg-white/10'
                                            : 'text-gray-500 hover:text-primary-600 hover:bg-white'
                                        }`}
                                >
                                    <Icon className={`h-5 w-5 transition-transform duration-500 group-hover:scale-110 ${categoryId === cat.id ? 'text-white' : isDark ? 'text-primary-400' : 'text-primary-500'}`} />
                                    <span className={`text-[13px] font-black uppercase tracking-[0.15em]`}>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Main Search Card */}
            <form
                onSubmit={handleSearch}
                className={`${isDark ? 'bg-white/10 backdrop-blur-2xl border-white/20 shadow-[0_30px_90px_-15px_rgba(0,0,0,0.4)]' : 'bg-white border-gray-200 shadow-xl'} rounded-[3rem] border overflow-visible`}
            >
                <div className={`flex divide-x ${isDark ? 'divide-white/10' : 'divide-gray-100'}`}>
                    {/* Location Segment */}
                    <div className={`flex-[1.5] p-10 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} first:hover:rounded-l-[3rem] transition-all duration-300 cursor-pointer group`}>
                        <div className="flex items-center justify-between mb-4">
                            <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-0`}>WHERE TO?</label>
                            <button
                                type="button"
                                onClick={handleUseMyLocation}
                                className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${isDark ? 'bg-white/5 text-primary-400 hover:bg-white/10' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'}`}
                            >
                                {isLocating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Navigation className="h-3 w-3" />}
                                {isLocating ? 'Locating...' : 'Use My Location'}
                            </button>
                        </div>
                        <div className="flex items-center gap-5">
                            <MapPin className={`h-7 w-7 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => {
                                        setLocation(e.target.value);
                                        if (latitude || longitude) {
                                            setLatitude(null);
                                            setLongitude(null);
                                        }
                                    }}
                                    placeholder="Where are you going?"
                                    className={`w-full bg-transparent text-2xl font-bold ${isDark ? 'text-white placeholder:text-white/20' : 'text-gray-900 placeholder:text-gray-300'} outline-none border-none p-0 focus:ring-0`}
                                />
                                <p className={`text-[11px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-2 font-medium italic tracking-wide`}>
                                    {latitude && longitude ? `Searching within ${radius}km of your location` : 'Destination, city or resort'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Check In Segment */}
                    <div className={`flex-1 p-10 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group relative`}>
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-4`}>Check In</label>
                        <div className="flex items-center gap-5">
                            <Calendar className={`h-7 w-7 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                <DatePicker
                                    selected={checkIn}
                                    onChange={(date: Date | null) => setCheckIn(date)}
                                    selectsStart
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={new Date()}
                                    dateFormat="dd MMM ''yy"
                                    className={`w-full bg-transparent text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                />
                                <p className={`text-[11px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-2 font-medium tracking-wide`}>{checkIn ? format(checkIn, 'EEEE') : 'Select date'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Check Out Segment */}
                    <div className={`flex-1 p-10 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group`}>
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-4`}>Check Out</label>
                        <div className="flex items-center gap-5">
                            <Calendar className={`h-7 w-7 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                <DatePicker
                                    selected={checkOut}
                                    onChange={(date: Date | null) => setCheckOut(date)}
                                    selectsEnd
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={checkIn ? addDays(checkIn, 1) : new Date()}
                                    dateFormat="dd MMM ''yy"
                                    className={`w-full bg-transparent text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                />
                                <p className={`text-[11px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-2 font-medium tracking-wide`}>{checkOut ? format(checkOut, 'EEEE') : 'Select date'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Guests Segment */}
                    <div className={`flex-1 p-10 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} last:hover:rounded-r-[3rem] transition-all duration-300 cursor-pointer group`}>
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-4`}>Travellers</label>
                        <div className="flex items-center gap-5">
                            <Users className={`h-7 w-7 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1 relative">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{adults + children}</span>
                                    <span className={`text-[10px] font-black ${isDark ? 'text-white/60' : 'text-gray-500'} uppercase tracking-[0.1em]`}>People</span>
                                </div>
                                <div className="flex gap-4 mt-3">
                                    <select
                                        value={adults}
                                        onChange={(e) => setAdults(Number(e.target.value))}
                                        className={`text-[12px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none hover:text-primary-400 transition-colors uppercase tracking-widest`}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(num => (
                                            <option key={num} value={num} className="bg-gray-900 text-white">{num} Adult(s)</option>
                                        ))}
                                    </select>
                                    <span className={`text-[10px] ${isDark ? 'text-white/10' : 'text-gray-200'}`}>|</span>
                                    <select
                                        value={children}
                                        onChange={(e) => setChildren(Number(e.target.value))}
                                        className={`text-[12px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none hover:text-primary-400 transition-colors uppercase tracking-widest`}
                                    >
                                        {[0, 1, 2, 3, 4].map(num => (
                                            <option key={num} value={num} className="bg-gray-900 text-white">{num} Child(ren)</option>
                                        ))}
                                    </select>
                                    <span className={`text-[10px] ${isDark ? 'text-white/10' : 'text-gray-200'}`}>|</span>
                                    <select
                                        value={rooms}
                                        onChange={(e) => setRooms(Number(e.target.value))}
                                        className={`text-[12px] font-black ${isDark ? 'text-white/40' : 'text-gray-400'} bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none hover:text-primary-400 transition-colors uppercase tracking-widest`}
                                    >
                                        {[1, 2, 3, 4, 5, 6].map(num => (
                                            <option key={num} value={num} className="bg-gray-900 text-white">{num} Room(s)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Submit Action */}
                <div className="relative h-0 flex justify-center items-center">
                    <button
                        type="submit"
                        className="absolute bottom-[-36px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white font-black px-20 py-6 rounded-full shadow-[0_20px_60px_-10px_rgba(22,163,74,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 uppercase tracking-[0.4em] text-lg group w-auto whitespace-nowrap"
                    >
                        <span className="flex items-center gap-6">
                            Start Searching
                            <Search className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
}
