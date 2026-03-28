import React from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, Search, X, ChevronLeft, ChevronRight, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe } from 'lucide-react';
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
    handleSearch: (e: React.FormEvent) => void;
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    categories: PropertyCategory[];
    theme?: 'dark' | 'light';
    isGroupBooking: boolean;
    setIsGroupBooking: (v: boolean) => void;
    groupSize: number;
    setGroupSize: (v: number) => void;
}

export default function SearchMobile({
    location, setLocation,
    categoryId, setCategoryId,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults, setAdults,
    children, setChildren,
    rooms, setRooms,
    handleSearch,
    isExpanded, setIsExpanded,
    categories,
    theme = 'dark',
    isGroupBooking, setIsGroupBooking,
    groupSize, setGroupSize
}: SearchProps) {
    const isDark = theme === 'dark';
    const [showGuestModal, setShowGuestModal] = React.useState(false);

    const getIcon = (iconName?: string) => {
        const Icon = iconName ? ICON_MAP[iconName] : Layout;
        return Icon || Layout;
    };

    const handleCategorySelect = (id: string, isGroup: boolean = false) => {
        setCategoryId(id);
        setIsGroupBooking(isGroup);
        if (isGroup) setGroupSize(adults + children);
        setIsExpanded(true);
    };

    if (!isExpanded) {
        return (
            <div className={`md:hidden w-full px-6 animate-fade-in flex flex-col items-center relative z-[60]`}>
                <h2 className={`${isDark ? 'text-white drop-shadow-md' : 'text-gray-900'} font-black text-[12px] uppercase tracking-[0.4em] mb-12 text-center`}>
                    Where to next?
                </h2>
                <div className="grid grid-cols-3 gap-x-6 gap-y-12 w-full max-w-[340px]">
                    <button
                        onClick={() => handleCategorySelect('', true)}
                        className="flex flex-col items-center gap-4 transition-all duration-300 active:scale-95 group"
                    >
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 ${isGroupBooking
                            ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/40 scale-110'
                            : isDark
                                ? 'bg-white/10 backdrop-blur-xl text-white border border-white/20 group-hover:bg-white/30'
                                : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:bg-gray-200'
                            }`}>
                            <Users className="h-7 w-7" />
                        </div>
                        <span className={`${isDark ? 'text-white drop-shadow-sm' : 'text-gray-600'} text-[10px] font-black uppercase tracking-[0.2em] text-center leading-tight`}>
                            Group Stay
                        </span>
                    </button>

                    <button
                        onClick={() => handleCategorySelect('', false)}
                        className="flex flex-col items-center gap-4 transition-all duration-300 active:scale-95 group"
                    >
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 ${categoryId === '' && !isGroupBooking
                            ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/40 scale-110'
                            : isDark
                                ? 'bg-white/10 backdrop-blur-xl text-white border border-white/20 group-hover:bg-white/30'
                                : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:bg-gray-200'
                            }`}>
                            <Building className="h-7 w-7" />
                        </div>
                        <span className={`${isDark ? 'text-white drop-shadow-sm' : 'text-gray-600'} text-[10px] font-black uppercase tracking-[0.2em] text-center leading-tight`}>
                            All Stays
                        </span>
                    </button>
                    {categories.map((cat) => {
                        const Icon = getIcon(cat.icon);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => handleCategorySelect(cat.id, false)}
                                className="flex flex-col items-center gap-4 transition-all duration-300 active:scale-95 group"
                            >
                                <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 ${categoryId === cat.id && !isGroupBooking
                                    ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/40 scale-110'
                                    : isDark
                                        ? 'bg-white/10 backdrop-blur-xl text-white border border-white/20 group-hover:bg-white/30'
                                        : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:bg-gray-200'
                                    }`}>
                                    <Icon className="h-7 w-7" />
                                </div>
                                <span className={`${isDark ? 'text-white drop-shadow-sm' : 'text-gray-600'} text-[10px] font-black uppercase tracking-[0.2em] text-center leading-tight`}>
                                    {cat.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
                <p className={`${isDark ? 'text-white/40' : 'text-gray-400'} text-[9px] font-black uppercase tracking-[0.3em] text-center mt-16 animate-pulse`}>
                    Select your destination
                </p>
            </div>
        );
    }

    return (
        <div className={`md:hidden w-full px-4 animate-fade-in-up relative z-[60]`}>
            <div className="flex items-center gap-3 mb-6">
                <button
                    type="button"
                    onClick={() => setIsExpanded(false)}
                    className={`p-2.5 ${isDark ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'} backdrop-blur-md rounded-full ${isDark ? 'text-white' : 'text-gray-900'} border`}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className={`flex-1 ${isDark ? 'bg-black/30 border-white/20' : 'bg-white border-gray-200'} backdrop-blur-md rounded-2xl py-3 px-5 shadow-2xl border`}>
                    <div className="flex items-center gap-3">
                        {(() => {
                            if (isGroupBooking) return <Users className={`h-4 w-4 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />;
                            const activeCat = categories.find(c => c.id === categoryId);
                            const Icon = activeCat ? getIcon(activeCat.icon) : Building;
                            return <Icon className={`h-4 w-4 ${isDark ? 'text-primary-400' : 'text-primary-600'}`} />;
                        })()}
                        <span className={`text-[11px] font-black uppercase tracking-widest ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {isGroupBooking ? 'Group Stay Package' : (categories.find(c => c.id === categoryId)?.name || 'All Stays')}
                        </span>
                        <button
                            type="button"
                            className={`text-[9px] font-black ${isDark ? 'text-white bg-white/10' : 'text-primary-600 bg-primary-50'} ml-auto uppercase tracking-tighter px-3 py-1 rounded-lg transition-colors`}
                            onClick={() => setIsExpanded(false)}
                        >
                            Change
                        </button>
                    </div>
                </div>
            </div>

            <form
                onSubmit={handleSearch}
                className={`${isDark ? 'bg-black/10 backdrop-blur-2xl border-white/10 shadow-[0_30px_90px_-15px_rgba(0,0,0,0.4)]' : 'bg-white border-gray-200 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.3)]'} rounded-[2.5rem] overflow-visible border flex flex-col`}
            >
                <div className={`divide-y ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
                    {/* Location */}
                    <div className={`p-4 active:${isDark ? 'bg-white/5' : 'bg-gray-50'} transition-colors cursor-pointer group`}>
                        <label className={`block text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-primary-500/80'} mb-1.5`}>Where to?</label>
                        <LocationAutocomplete
                            value={location}
                            onChange={setLocation}
                            onSelect={(description) => setLocation(description.split(',')[0])}
                            placeholder="City or Resort Name"
                            theme={theme}
                            inputClassName={`w-full bg-transparent text-lg font-bold ${isDark ? 'text-white placeholder:text-white/20' : 'text-gray-900 placeholder:text-gray-200'} outline-none border-none p-0 focus:ring-0`}
                        />
                    </div>

                    {/* Dates */}
                    <div className={`flex divide-x ${isDark ? 'divide-white/5' : 'divide-gray-50'}`}>
                        <div className={`flex-1 p-4 group`}>
                            <label className={`block text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-primary-50/80'} mb-1.5`}>CHECK IN</label>
                            <div className="flex items-center gap-3">
                                <Calendar className={`h-5 w-5  ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
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
                                        portalId="root"
                                        className={`w-full bg-transparent text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                        placeholderText="Add date"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className={`flex-1 p-4 group`}>
                            <label className={`block text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-primary-50/80'} mb-1.5`}>CHECK OUT</label>
                            <div className="flex items-center gap-3">
                                <Calendar className={`h-5 w-5 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
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
                                        portalId="root"
                                        className={`w-full bg-transparent text-base font-bold ${isDark ? 'text-white' : 'text-gray-900'} outline-none border-none p-0 focus:ring-0 cursor-pointer`}
                                        placeholderText="Add date"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guests Trigger */}
                    <div
                        className={`p-4 active:${isDark ? 'bg-black/5' : 'bg-gray-50'} transition-colors cursor-pointer group`}
                        onClick={() => setShowGuestModal(true)}
                    >
                        <div className="flex items-center justify-between mb-1.5">
                            <label className={`block text-[8px] font-black uppercase tracking-[0.2em] ${isDark ? 'text-white/40' : 'text-primary-500/80'}`}>Who's coming?</label>
                            {isGroupBooking && (
                                <span className={`text-[8px] font-black uppercase tracking-widest text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full animate-pulse`}>
                                    Group Active
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-4">
                            <Users className={`h-6 w-6 ${isDark ? 'text-white/40' : 'text-gray-400'}`} />
                            <div className="flex-1">
                                <div className="flex items-baseline gap-2">
                                    <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{isGroupBooking ? groupSize : (adults + children)}</span>
                                    <span className={`text-[10px] font-black ${isDark ? 'text-white/60' : 'text-gray-900'} uppercase tracking-widest`}>
                                        {isGroupBooking ? 'Members' : 'People'}
                                    </span>
                                </div>
                                <p className={`text-[9px] ${isDark ? 'text-white/30' : 'text-gray-400'} mt-0.5 font-bold italic`}>
                                    {isGroupBooking ? 'Whole Property Stay' : `${adults} Adults${children > 0 ? `, ${children} Children` : ''}, ${rooms} Room${rooms > 1 ? 's' : ''}`}
                                </p>
                            </div>
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'} text-primary-600 transition-transform active:scale-90`}>
                                <ChevronRight className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`p-4 ${isDark ? 'bg-black/5' : 'bg-gray-50/50'} rounded-b-[2.5rem]`}>
                    <button
                        type="submit"
                        className="w-full rounded-xl bg-gradient-to-r from-primary-600 to-primary-900 text-white font-black py-5 shadow-xl shadow-primary-500/30 active:scale-95 transition-all duration-300 uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3"
                    >
                        Search Now
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </form>

            {/* Guest Selection Popup */}
            {showGuestModal && (
                <div className="fixed inset-0 z-[100000] flex items-end sm:items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setShowGuestModal(false)}
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up-fade">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="space-y-1">
                                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900">Manage Travelers</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Adjust your group size</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setShowGuestModal(false)}
                                className="p-3 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-900" />
                            </button>
                        </div>

                        <div className="p-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">
                                        {isGroupBooking ? 'Adults' : 'Adults'}
                                    </h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Ages 13+</p>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = Math.max(1, adults - 1);
                                            setAdults(newVal);
                                            if (isGroupBooking) setGroupSize(newVal + children);
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-black text-xl bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                    >-</button>
                                    <input
                                        type="number"
                                        value={adults}
                                        onChange={(e) => {
                                            const newVal = Math.max(1, parseInt(e.target.value) || 1);
                                            setAdults(newVal);
                                            if (isGroupBooking) setGroupSize(newVal + children);
                                        }}
                                        className="w-14 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = adults + 1;
                                            setAdults(newVal);
                                            if (isGroupBooking) setGroupSize(newVal + children);
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-black text-xl bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                    >+</button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">
                                        {isGroupBooking ? 'Children' : 'Children'}
                                    </h4>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Ages 6–12</p>
                                </div>
                                <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = Math.max(0, children - 1);
                                            setChildren(newVal);
                                            if (isGroupBooking) setGroupSize(adults + newVal);
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-black text-xl bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                    >-</button>
                                    <input
                                        type="number"
                                        value={children}
                                        onChange={(e) => {
                                            const newVal = Math.max(0, parseInt(e.target.value) || 0);
                                            setChildren(newVal);
                                            if (isGroupBooking) setGroupSize(adults + newVal);
                                        }}
                                        className="w-14 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const newVal = children + 1;
                                            setChildren(newVal);
                                            if (isGroupBooking) setGroupSize(adults + newVal);
                                        }}
                                        className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-black text-xl bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                    >+</button>
                                </div>
                            </div>

                            {!isGroupBooking && (
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-black uppercase tracking-widest text-gray-900">Rooms</h4>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Accommodation</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-gray-50 p-1 rounded-2xl border border-gray-100">
                                        <button
                                            type="button"
                                            onClick={() => setRooms(Math.max(1, rooms - 1))}
                                            className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-black text-xl bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                        >-</button>
                                        <input
                                            type="number"
                                            value={rooms}
                                            onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-14 bg-transparent text-center text-xl font-black outline-none border-none p-0 focus:ring-0 text-gray-900"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setRooms(rooms + 1)}
                                            className="w-12 h-12 flex items-center justify-center rounded-xl transition-all font-black text-xl bg-white text-gray-900 hover:bg-primary-600 hover:text-white shadow-sm border border-gray-100 active:scale-90"
                                        >+</button>
                                    </div>
                                </div>
                            )}

                            {isGroupBooking && (
                                <div className="p-5 bg-primary-50 rounded-2.5xl border border-primary-100/50 flex items-center justify-between shadow-inner">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                                            <Users className="h-5 w-5" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[11px] font-black uppercase tracking-widest text-primary-900 leading-none">Total Group Size</span>
                                            <span className="text-[9px] font-bold text-primary-600 uppercase mt-1">Whole property stay</span>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-black text-primary-600">{groupSize}</span>
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => setShowGuestModal(false)}
                                className="w-full rounded-xl py-5 bg-gradient-to-r from-primary-600 to-primary-700 text-white font-black uppercase tracking-[0.3em] text-[12px] shadow-lg shadow-primary-500/20 active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-3"
                            >
                                Confirm Travelers
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
