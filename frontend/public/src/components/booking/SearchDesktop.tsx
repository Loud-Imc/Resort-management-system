import React from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, Search, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe, Navigation, Loader2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
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
    const modalRef = React.useRef<HTMLDivElement>(null);

    // Click outside handler
    React.useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
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
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-3`}>Check In</label>
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
                                    dateFormat="dd MMM ''yy"
                                    popperPlacement="bottom-start"
                                    portalId="root"
                                    className={`w-full bg-transparent text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                />
                                <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-1 font-medium tracking-wide`}>{checkIn ? format(checkIn, 'EEEE') : 'Select date'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Check Out Segment */}
                    <div className={`flex-1 p-8 hover:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-all duration-300 cursor-pointer group`}>
                        <label className={`block text-[11px] font-black uppercase tracking-[0.3em] ${isDark ? 'text-white/50' : 'text-gray-400'} mb-3`}>Check Out</label>
                        <div className="flex items-center gap-4">
                            <Calendar className={`h-6 w-6 ${isDark ? 'text-white/40' : 'text-gray-300'} group-hover:text-primary-400 transition-colors`} />
                            <div className="flex-1">
                                <DatePicker
                                    selected={checkOut}
                                    onChange={(date: Date | null) => setCheckOut(date)}
                                    selectsEnd
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={checkIn ? addDays(checkIn, 1) : new Date()}
                                    dateFormat="dd MMM ''yy"
                                    popperPlacement="bottom-start"
                                    portalId="root"
                                    className={`w-full bg-transparent text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                />
                                <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-1 font-medium tracking-wide`}>{checkOut ? format(checkOut, 'EEEE') : 'Select date'}</p>
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
                            <label className="flex items-center gap-2 cursor-pointer group/toggle" onClick={(e) => e.stopPropagation()}>
                                <input
                                    type="checkbox"
                                    checked={isGroupBooking}
                                    onChange={(e) => setIsGroupBooking(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className={`w-8 h-4 bg-gray-200 dark:bg-white/10 rounded-full peer peer-checked:bg-primary-600 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:after:translate-x-4`}></div>
                                <span className={`text-[9px] font-black uppercase tracking-widest ${isGroupBooking ? 'text-primary-400' : isDark ? 'text-white/40' : 'text-gray-400'}`}>Group</span>
                            </label>
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
                                            <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{adults + children}</span>
                                            <span className={`text-[9px] font-black ${isDark ? 'text-white/60' : 'text-gray-500'} uppercase tracking-[0.05em]`}>People</span>
                                        </div>
                                        <p className={`text-[10px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-1 font-medium tracking-wide italic`}>
                                            {rooms} {rooms === 1 ? 'Room' : 'Rooms'}, {adults} {adults === 1 ? 'Adult' : 'Adults'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Guest Selection Modal/Popover */}
                        {showGuestModal && (
                            <div
                                ref={modalRef}
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute top-full right-0 mt-1 p-6 rounded-[2.5rem] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.3)] border bg-white border-gray-100 z-50 animate-in fade-in slide-in-from-top-4 zoom-in-95 duration-300 w-[420px] cursor-default`}
                            >
                                <div className="space-y-2 text-gray-900">
                                    {isGroupBooking ? (
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between gap-6">
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Group Size</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Total Travellers</p>
                                                </div>
                                                <div className="flex items-center gap-4 bg-primary-50 p-2 rounded-2xl border border-primary-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-300 text-black text-lg font-black hover:bg-primary-500 transition-all active:scale-95 shadow-lg shadow-primary-600/20"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        value={groupSize}
                                                        onChange={(e) => setGroupSize(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-16 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setGroupSize(groupSize + 1)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-300 text-black text-lg font-black hover:bg-primary-500 transition-all active:scale-95 shadow-lg shadow-primary-600/20"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {/* Adults */}
                                            <div className="flex items-center justify-between gap-6">
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Adults</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Ages 13+</p>
                                                </div>
                                                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdults(Math.max(1, adults - 1))}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-primary-300 text-black hover:bg-gray-100 border border-gray-100"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        value={adults}
                                                        onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                                                        className="w-12 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setAdults(adults + 1)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-primary-300 text-black hover:bg-gray-100 border border-gray-100"
                                                    >+</button>
                                                </div>
                                            </div>

                                            {/* Children */}
                                            <div className="flex items-center justify-between gap-6">
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Children</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Ages 2–12</p>
                                                </div>
                                                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setChildren(Math.max(0, children - 1))}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-primary-300 text-black hover:bg-gray-100 border border-gray-100"
                                                    >-</button>
                                                    <input
                                                        type="number"
                                                        value={children}
                                                        onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                                                        className="w-12 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setChildren(children + 1)}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-primary-300 text-black hover:bg-gray-100 border border-gray-100"
                                                    >+</button>
                                                </div>
                                            </div>

                                            {/* Rooms */}
                                            <div className="flex items-center justify-between gap-6">
                                                <div>
                                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Rooms</h4>
                                                    <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">Required</p>
                                                </div>
                                                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                                    <button
                                                        type="button"
                                                        onClick={() => setRooms(Math.max(1, rooms - 1))}
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-primary-300 text-black hover:bg-gray-100 border border-gray-100"
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
                                                        className="w-10 h-10 flex items-center justify-center rounded-xl transition-all font-black text-lg bg-primary-300 text-black hover:bg-gray-100 border border-gray-100"
                                                    >+</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowGuestModal(false);
                                        }}
                                        className="w-full py-4 bg-primary-600 text-white font-black uppercase tracking-[0.3em] text-[11px] rounded-2xl hover:bg-primary-500 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary-600/20"
                                    >
                                        Apply Selection
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
                            Start Searching
                            <Search className="h-6 w-6 group-hover:translate-x-2 transition-transform duration-300" />
                        </span>
                    </button>
                </div>
            </form>

            <style>{`
                /* Custom DatePicker Styling */
                .react-datepicker-wrapper { width: 100%; }
                .react-datepicker {
                    font-family: inherit;
                    border: 1px solid #f3f4f6;
                    border-radius: 1.5rem;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
                    overflow: hidden;
                    background: white;
                }
                .react-datepicker__header {
                    background-color: white;
                    border-bottom: 1px solid #f3f4f6;
                    padding-top: 1.5rem;
                }
                .react-datepicker__day-name, .react-datepicker__day {
                    width: 2.5rem;
                    line-height: 2.5rem;
                    margin: 0.2rem;
                    font-weight: 600;
                    color: #374151;
                    border-radius: 0.75rem;
                }
                .react-datepicker__day:hover {
                    background-color: #f0fdf4 !important;
                    color: #16a34a !important;
                }
                .react-datepicker__day--selected,
                .react-datepicker__day--in-selecting-range,
                .react-datepicker__day--in-range {
                    background-color: #16a34a !important;
                    color: white !important;
                }
                .react-datepicker__day--keyboard-selected {
                    background-color: #dcfce7 !important;
                    color: #16a34a !important;
                }
                .react-datepicker__current-month {
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-size: 0.875rem;
                }
                .react-datepicker-popper {
                    z-index: 1000 !important;
                }
                .react-datepicker__navigation { top: 1.5rem; }
                .react-datepicker__triangle { display: none; }
            `}</style>
        </div>
    );
}
