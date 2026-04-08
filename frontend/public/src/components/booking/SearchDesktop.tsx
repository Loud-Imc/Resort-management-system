import React from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, Search, X, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe, Navigation, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
// import { format, addDays } from 'date-fns';
import { PropertyCategory } from '../../types';
import LocationAutocomplete from './LocationAutocomplete';

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
    isGroupBooking: boolean;
    setIsGroupBooking: (v: boolean) => void;
    groupSize: number;
    setGroupSize: (v: number) => void;
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
    theme = 'dark',
    isGroupBooking, setIsGroupBooking,
    groupSize, setGroupSize
}: SearchProps) {
    const isDark = theme === 'dark';
    const [isLocating, setIsLocating] = React.useState(false);
    const [showGuestModal, setShowGuestModal] = React.useState(false);
    const guestModalRef = React.useRef<HTMLDivElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = React.useState(false);
    const [showRightArrow, setShowRightArrow] = React.useState(false);

    const checkScroll = () => {
        if (scrollContainerRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
            setShowLeftArrow(scrollLeft > 0);
            setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5);
        }
    };

    React.useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [categories]);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 300;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth'
            });
            setTimeout(checkScroll, 300);
        }
    };

    // Click outside handler
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (guestModalRef.current && !guestModalRef.current.contains(event.target as Node)) {
                setShowGuestModal(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            {/* Category Tabs & Group Toggle */}
            <div className="flex justify-center mb-10 relative z-20 group/categories">
                <div className="relative max-w-6xl w-full flex items-center">
                    {/* Left Arrow */}
                    {showLeftArrow && (
                        <button
                            type="button"
                            onClick={() => scroll('left')}
                            className={`absolute -left-5 z-30 p-2 rounded-full border shadow-xl transition-all duration-300 ${isDark ? 'bg-gray-900 border-white/10 text-white hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}

                    <div
                        ref={scrollContainerRef}
                        onScroll={checkScroll}
                        className={`flex flex-1 justify-center ${isDark ? 'bg-white/5 backdrop-blur-xl border-white/10' : 'bg-white border-gray-200'} p-1.5 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border overflow-x-auto no-scrollbar scroll-smooth items-center`}
                    >
                        <div className="flex min-w-max gap-1 items-center px-1">
                            {/* Group Mode Toggle Button */}
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !isGroupBooking;
                                    setIsGroupBooking(next);
                                    if (next) setGroupSize(adults + children);
                                }}
                                className={`flex items-center gap-3 px-8 py-4 rounded-3xl transition-all duration-500 group/btn whitespace-nowrap ${isGroupBooking
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-[1.02]'
                                    : isDark
                                        ? 'text-white/60 hover:text-white hover:bg-white/10'
                                        : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="relative">
                                    <Users className={`h-5 w-5 transition-transform duration-500 group-hover/btn:scale-110 ${isGroupBooking ? 'text-white' : isDark ? 'text-primary-400' : 'text-primary-500'}`} />
                                    {isGroupBooking && (
                                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                                        </span>
                                    )}
                                </div>
                                <span className={`text-[13px] font-black uppercase tracking-[0.15em]`}>
                                    {isGroupBooking ? 'Group' : 'Group'}
                                </span>
                            </button>

                            {/* Divider */}
                            <div className={`w-[1px] h-8 mx-2 ${isDark ? 'bg-white/10' : 'bg-gray-200/50'}`} />

                            <button
                                type="button"
                                onClick={() => {
                                    setCategoryId('');
                                    setIsGroupBooking(false);
                                }}
                                className={`flex items-center gap-3 px-8 py-4 rounded-3xl transition-all duration-500 group/btn whitespace-nowrap ${categoryId === '' && !isGroupBooking
                                    ? 'bg-gray-900 text-white shadow-lg scale-[1.02]'
                                    : isDark
                                        ? 'text-white/60 hover:text-white hover:bg-white/10'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <Building className={`h-5 w-5 transition-transform duration-500 group-hover/btn:scale-110 ${categoryId === '' && !isGroupBooking ? (isDark ? 'text-primary-400' : 'text-primary-500') : 'text-current'}`} />
                                <span className={`text-[13px] font-black uppercase tracking-[0.15em]`}>All</span>
                            </button>

                            {categories.map((cat) => {
                                const Icon = getIcon(cat.icon);
                                return (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => {
                                            setCategoryId(cat.id);
                                            setIsGroupBooking(false);
                                        }}
                                        className={`flex items-center gap-3 px-7 py-4 rounded-3xl transition-all duration-500 group/btn whitespace-nowrap ${categoryId === cat.id && !isGroupBooking
                                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30 scale-[1.02]'
                                            : isDark
                                                ? 'text-white/60 hover:text-white hover:bg-white/10'
                                                : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className={`h-5 w-5 transition-transform duration-500 group-hover/btn:scale-110 ${categoryId === cat.id && !isGroupBooking ? 'text-white' : isDark ? 'text-primary-400' : 'text-primary-500'}`} />
                                        <span className={`text-[13px] font-black uppercase tracking-[0.15em]`}>{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right Arrow */}
                    {showRightArrow && (
                        <button
                            type="button"
                            onClick={() => scroll('right')}
                            className={`absolute -right-5 z-30 p-2 rounded-full border shadow-xl transition-all duration-300 ${isDark ? 'bg-gray-900 border-white/10 text-white hover:bg-gray-800' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Main Search Card */}
            <form
                onSubmit={handleSearch}
                className={`relative z-50 ${isDark ? 'bg-white/10 backdrop-blur-2xl border-white/20 shadow-[0_30px_90px_-15px_rgba(0,0,0,0.4)]' : 'bg-white border-gray-200 shadow-xl'} rounded-[3rem] border overflow-visible`}
            >
                <div className={`flex divide-x ${isDark ? 'divide-white/10' : 'divide-gray-100'}`}>
                    {/* Location Segment */}
                    <div className={`flex-[1.5] p-8 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} first:hover:rounded-l-[3rem] transition-all duration-300 cursor-pointer group`}>
                        <div className="flex items-center justify-between mb-3">
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
                        <LocationAutocomplete
                            value={location}
                            onChange={(val) => {
                                setLocation(val);
                                if (latitude || longitude) {
                                    setLatitude(null);
                                    setLongitude(null);
                                }
                            }}
                            onSelect={(description) => setLocation(description.split(',')[0])}
                            placeholder="Where are you going?"
                            theme={theme}
                            inputClassName={`w-full bg-transparent text-xl font-bold ${isDark ? 'text-white placeholder:text-white/20' : 'text-gray-900 placeholder:text-gray-300'} outline-none border-none p-0 focus:ring-0`}
                        />
                        <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-1 font-medium italic tracking-wide`}>
                            {latitude && longitude ? `Searching within ${radius}km of your location` : 'Destination, city or resort'}
                        </p>
                    </div>

                    {/* Check In Segment */}
                    <div className={`flex-1 p-8 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group relative`}>
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-3`}>CHECK IN</label>
                        <div className="flex items-center gap-4">
                            <Calendar className={`h-6 w-6 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                <DatePicker
                                    selected={checkIn}
                                    onChange={(date: Date | null) => setCheckIn(date)}
                                    selectsStart
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={new Date()}
                                    dateFormat="dd MMM yyyy"
                                    showPopperArrow={true}
                                    className={`w-full bg-transparent text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                    placeholderText="Select date"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Check Out Segment */}
                    <div className={`flex-1 p-8 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group`}>
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-3`}>CHECK OUT</label>
                        <div className="flex items-center gap-4">
                            <Calendar className={`h-6 w-6 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                <DatePicker
                                    selected={checkOut}
                                    onChange={(date: Date | null) => setCheckOut(date)}
                                    selectsEnd
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={checkIn || new Date()}
                                    dateFormat="dd MMM yyyy"
                                    showPopperArrow={true}
                                    className={`w-full bg-transparent text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                    placeholderText="Select date"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guests Segment */}
                    <div
                        className={`flex-1 p-8 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} last:hover:rounded-r-[3rem] transition-all duration-300 cursor-pointer group relative overflow-visible`}
                        onClick={() => setShowGuestModal(!showGuestModal)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-0`}>Travellers</label>
                            {isGroupBooking && (
                                <span className="bg-primary-600/10 text-primary-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse">
                                    Group Active
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <Users className={`h-6 w-6 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                {isGroupBooking ? (
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{groupSize}</span>
                                            <span className={`text-[9px] font-black ${isDark ? 'text-white/60' : 'text-gray-500'} uppercase tracking-[0.05em]`}>Group Members</span>
                                        </div>
                                        <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-1 font-medium tracking-wide`}>Click to edit</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col">
                                        <div className="flex items-baseline gap-1.5">
                                            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{isGroupBooking ? (adults + children) : (adults + children)}</span>
                                            <span className={`text-[9px] font-black ${isDark ? 'text-white/60' : 'text-gray-500'} uppercase tracking-[0.05em]`}>{isGroupBooking ? 'Group Size' : 'People'}</span>
                                        </div>
                                        <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-1 font-medium tracking-wide italic`}>
                                            {isGroupBooking ? 'Whole Property Stay' : `${rooms} ${rooms === 1 ? 'Room' : 'Rooms'}`}, {adults} {adults === 1 ? 'Adult' : 'Adults'}{children > 0 ? `, ${children} ${children === 1 ? 'Child' : 'Children'}` : ''}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guest Selection Modal/Popover */}
                        {showGuestModal && (
                            <div
                                ref={guestModalRef}
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute top-full right-0 -mt-12 p-6 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] border bg-white/95 backdrop-blur-2xl border-white/50 z-[100] animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-500 w-[380px] cursor-default max-h-[80vh] overflow-y-auto no-scrollbar`}
                            >
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary-600">Traveler Details</h3>
                                        <button
                                            onClick={() => setShowGuestModal(false)}
                                            className="text-gray-400 hover:text-gray-900 transition-colors p-1"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>

                                    <div className="space-y-1">
                                        {/* Adults */}
                                        <div className="flex items-center justify-between group/row">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 group-hover/row:text-primary-600 transition-colors">
                                                    {isGroupBooking ? 'Adults' : 'Adults'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Ages 13+</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 shadow-inner group-hover/row:border-primary-100 transition-all">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVal = Math.max(1, adults - 1);
                                                        setAdults(newVal);
                                                        if (isGroupBooking) setGroupSize(newVal + children);
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    value={adults}
                                                    onChange={(e) => {
                                                        const newVal = Math.max(1, parseInt(e.target.value) || 1);
                                                        setAdults(newVal);
                                                        if (isGroupBooking) setGroupSize(newVal + children);
                                                    }}
                                                    className="w-12 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVal = adults + 1;
                                                        setAdults(newVal);
                                                        if (isGroupBooking) setGroupSize(newVal + children);
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                                >+</button>
                                            </div>
                                        </div>

                                        {/* Children */}
                                        <div className="flex items-center justify-between group/row">
                                            <div className="space-y-0.5">
                                                <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 group-hover/row:text-primary-600 transition-colors">
                                                    {isGroupBooking ? 'Children' : 'Children'}
                                                </h4>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Ages 6–12</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 shadow-inner group-hover/row:border-primary-100 transition-all">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVal = Math.max(0, children - 1);
                                                        setChildren(newVal);
                                                        if (isGroupBooking) setGroupSize(adults + newVal);
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    value={children}
                                                    onChange={(e) => {
                                                        const newVal = Math.max(0, parseInt(e.target.value) || 0);
                                                        setChildren(newVal);
                                                        if (isGroupBooking) setGroupSize(adults + newVal);
                                                    }}
                                                    className="w-12 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newVal = children + 1;
                                                        setChildren(newVal);
                                                        if (isGroupBooking) setGroupSize(adults + newVal);
                                                    }}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                                >+</button>
                                            </div>
                                        </div>

                                        {/* Rooms (Only for Standard) */}
                                        {!isGroupBooking && (
                                            <div className="flex items-center justify-between group/row">
                                                <div className="space-y-0.5">
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900 group-hover/row:text-primary-600 transition-colors">Rooms</h4>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Accommodation</p>
                                                </div>
                                                <div className="flex items-center gap-2 bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 shadow-inner group-hover/row:border-primary-100 transition-all">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        value={rooms}
                                                        onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-12 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setRooms(rooms + 1)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                                    >+</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {isGroupBooking && (
                                        <div className="p-3 bg-primary-50 rounded-2xl border border-primary-100/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary-900">Total Group Size</span>
                                            </div>
                                            <span className="text-lg font-black text-primary-600">{groupSize}</span>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowGuestModal(false);
                                        }}
                                        className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:shadow-[0_20px_40px_-10px_rgba(22,163,74,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                    >
                                        Set Travelers
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Action */}
                <div className="relative h-0 flex justify-center items-center">
                    <button
                        type="submit"
                        className="absolute bottom-[-36px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white font-black px-20 py-6 rounded-full shadow-[0_20px_60px_-10px_rgba(22,163,74,0.5)] hover:scale-105 active:scale-95 transition-all duration-300 uppercase tracking-[0.4em] text-lg group w-auto whitespace-nowrap"
                    >
                        <span className="flex items-center gap-6">
                            Start
                            <Search className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
}
