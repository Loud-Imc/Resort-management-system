import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Users, Search, X, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe, ChevronLeft, ChevronRight } from 'lucide-react';
import { PropertyCategory } from '../../types';
import LocationAutocomplete from './LocationAutocomplete';

const ICON_MAP: Record<string, any> = {
    Palmtree, Hotel, Home, Coffee, Tent, Building, Globe, Layout,
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
    handleSearch,
    categories,
    theme,
    isGroupBooking, setIsGroupBooking,
    groupSize, setGroupSize
}: SearchProps) {
    const isDark = theme === 'light';
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

    const getIcon = (iconName?: string) => {
        const Icon = iconName ? ICON_MAP[iconName] : Layout;
        return Icon || Layout;
    };

    return (
        <div className="hidden md:block w-full">
            <form
                onSubmit={handleSearch}
                className={`${isDark ? 'bg-black/20 backdrop-blur-3xl border-white/10 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)]' : 'bg-black/20 backdrop-blur-3xl border-white/10 shadow-[0_40px_100px_-15px_rgba(0,0,0,0.5)] bg-white border-gray-100 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)]'} rounded-[1rem] border overflow-visible flex flex-col relative z-20`}
            >
                {/* Unified Category Tabs */}
                <div className={`px-6 py-2.5 border-b ${isDark ? 'border-white/5' : 'border-gray-50'}`}>
                    <div className="relative flex items-center justify-center group/cat-scroll">
                        {/* Left Arrow */}
                        {showLeftArrow && (
                            <button
                                type="button"
                                onClick={() => scroll('left')}
                                className={`absolute left-0 z-30 p-1.5 rounded-full backdrop-blur-md transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-900 hover:bg-black/10'}`}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}

                        <div
                            ref={scrollContainerRef}
                            onScroll={checkScroll}
                            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth px-8"
                        >
                            {/* Group Stay Toggle */}
                            <button
                                type="button"
                                onClick={() => {
                                    const next = !isGroupBooking;
                                    setIsGroupBooking(next);
                                    if (next) setGroupSize(adults + children);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 whitespace-nowrap ${isGroupBooking
                                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                    : isDark
                                        ? 'text-white/60 hover:text-white hover:bg-white/10'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <Users className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase tracking-widest">Group Stay</span>
                            </button>

                            <div className={`w-[1px] h-6 mx-2 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`} />

                            <button
                                type="button"
                                onClick={() => {
                                    setCategoryId('');
                                    setIsGroupBooking(false);
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 whitespace-nowrap ${categoryId === '' && !isGroupBooking
                                    ? (isDark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white')
                                    : isDark
                                        ? 'text-white/60 hover:text-white hover:bg-white/10'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                                    }`}
                            >
                                <Building className="h-4 w-4" />
                                <span className="text-[11px] font-black uppercase tracking-[0.15em]">All</span>
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
                                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all duration-300 whitespace-nowrap ${categoryId === cat.id && !isGroupBooking
                                            ? 'bg-primary-600 text-white shadow-lg'
                                            : isDark
                                                ? 'text-white/60 hover:text-white hover:bg-white/10'
                                                : 'text-gray-500 hover:text-primary-600 hover:bg-gray-50'
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span className="text-[11px] font-black uppercase tracking-[0.15em]">{cat.name}</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Right Arrow */}
                        {showRightArrow && (
                            <button
                                type="button"
                                onClick={() => scroll('right')}
                                className={`absolute right-0 z-30 p-1.5 rounded-full backdrop-blur-md transition-all ${isDark ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-black/5 text-gray-900 hover:bg-black/10'}`}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Compact Search Inputs */}
                <div className="flex divide-x divide-gray-100/10 items-stretch h-18">
                    {/* Location Segment */}
                    <div className={`flex-[1.5] px-6 flex items-center gap-3 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group rounded-bl-[1rem]`}>
                        <div className="flex flex-col min-w-0">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-400'} leading-none mb-1`}>Where</span>
                            <LocationAutocomplete
                                value={location}
                                onChange={(val) => {
                                    setLocation(val);
                                }}
                                onSelect={(description) => setLocation(description.split(',')[0])}
                                placeholder="Search destinations"
                                theme={theme}
                                inputClassName={`w-full bg-transparent text-sm font-bold ${isDark ? 'text-white placeholder:text-white/20' : 'text-gray-900 placeholder:text-gray-300'} outline-none border-none p-0 focus:ring-0`}
                            />
                        </div>
                    </div>

                    {/* Check-In Segment */}
                    <div
                        className={`flex-1 px-6 flex items-center gap-3 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group relative`}
                        onClick={() => {
                            const input = document.getElementById('hero-check-in');
                            if (input) (input as any).focus();
                        }}
                    >
                        <div className="flex flex-col w-full">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-400'} leading-none mb-1`}>Check-In</span>
                            <div className="flex items-center gap-1">
                                <DatePicker
                                    id="hero-check-in"
                                    selected={checkIn}
                                    onChange={(date: Date | null) => setCheckIn(date)}
                                    selectsStart
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={new Date()}
                                    dateFormat="dd MMM"
                                    className={`w-full bg-transparent text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                    placeholderText="Add date"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Check-Out Segment */}
                    <div
                        className={`flex-1 px-6 flex items-center gap-3 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group relative`}
                        onClick={() => {
                            const input = document.getElementById('hero-check-out');
                            if (input) (input as any).focus();
                        }}
                    >
                        <div className="flex flex-col w-full">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-400'} leading-none mb-1`}>Check-Out</span>
                            <div className="flex items-center gap-1">
                                <DatePicker
                                    id="hero-check-out"
                                    selected={checkOut}
                                    onChange={(date: Date | null) => setCheckOut(date)}
                                    selectsEnd
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={checkIn || new Date()}
                                    dateFormat="dd MMM"
                                    className={`w-full bg-transparent text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                    placeholderText="Add date"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guests Segment */}
                    <div
                        className={`flex-1 px-6 flex items-center gap-3 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group relative overflow-visible rounded-br-[1rem]`}
                        onClick={() => setShowGuestModal(!showGuestModal)}
                    >
                        <div className="flex flex-col">
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-gray-400'} leading-none mb-1`}>Guests</span>
                            {isGroupBooking ? (
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{groupSize}</span>
                                    <span className={`text-[8px] font-black ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-tighter`}>Members</span>
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-1">
                                    <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{adults + children}</span>
                                    <span className={`text-[8px] font-black ${isDark ? 'text-white/40' : 'text-gray-500'} uppercase tracking-tighter`}>People</span>
                                </div>
                            )}
                        </div>

                        {/* Guest Selection Modal (Dropdown style) */}
                        {showGuestModal && (
                            <div
                                ref={guestModalRef}
                                className={`absolute top-full right-0 mt-4 w-96 ${isDark ? 'bg-gray-900 border-white/10' : 'bg-white border-gray-100'} border rounded-[2rem] shadow-2xl p-8 z-[100] animate-in fade-in slide-in-from-top-4`}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className={`text-xs font-black uppercase tracking-[0.3em] ${isDark ? 'text-white' : 'text-gray-900'}`}>Travellers</h4>
                                    <button
                                        type="button"
                                        onClick={() => setShowGuestModal(false)}
                                        className="text-gray-400 hover:text-gray-900 transition-colors p-1"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Adults */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Adults</p>
                                            <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest font-black mt-1`}>Ages 13+</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(1, adults - 1);
                                                    setAdults(newVal);
                                                    if (isGroupBooking) setGroupSize(newVal + children);
                                                }}
                                                className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} flex items-center justify-center transition-all font-bold text-lg`}
                                            >-</button>
                                            <span className={`w-6 text-center font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{adults}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = adults + 1;
                                                    setAdults(newVal);
                                                    if (isGroupBooking) setGroupSize(newVal + children);
                                                }}
                                                className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} flex items-center justify-center transition-all font-bold text-lg`}
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Children */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Children</p>
                                            <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest font-black mt-1`}>Ages 2-12</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(0, children - 1);
                                                    setChildren(newVal);
                                                    if (isGroupBooking) setGroupSize(adults + newVal);
                                                }}
                                                className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} flex items-center justify-center transition-all font-bold text-lg`}
                                            >-</button>
                                            <span className={`w-6 text-center font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = children + 1;
                                                    setChildren(newVal);
                                                    if (isGroupBooking) setGroupSize(adults + newVal);
                                                }}
                                                className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} flex items-center justify-center transition-all font-bold text-lg`}
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Rooms */}
                                    {!isGroupBooking && (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Rooms</p>
                                                <p className={`text-[10px] ${isDark ? 'text-white/40' : 'text-gray-400'} uppercase tracking-widest font-black mt-1`}>Total needed</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setRooms(Math.max(1, rooms - 1))}
                                                    className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} flex items-center justify-center transition-all font-bold text-lg`}
                                                >-</button>
                                                <span className={`w-6 text-center font-bold text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>{rooms}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setRooms(rooms + 1)}
                                                    className={`w-10 h-10 rounded-full border ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-600 hover:bg-gray-50'} flex items-center justify-center transition-all font-bold text-lg`}
                                                >+</button>
                                            </div>
                                        </div>
                                    )}

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
                        className="absolute bottom-[-28px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 via-primary-500 to-primary-700 text-white font-black px-12 py-3 rounded-full shadow-[0_20px_50px_-10px_rgba(22,163,74,0.4)] hover:scale-105 active:scale-95 transition-all duration-300 uppercase tracking-[0.3em] text-sm group w-auto whitespace-nowrap"
                    >
                        <span className="flex items-center gap-3">
                            Start
                            <Search className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                    </button>
                </div>
            </form>
        </div>
    );
}
