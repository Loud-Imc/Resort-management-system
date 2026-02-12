import React from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, MapPin, Search, ChevronLeft } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface SearchProps {
    location: string;
    setLocation: (v: string) => void;
    propertyType: string;
    setPropertyType: (v: string) => void;
    checkIn: Date | null;
    setCheckIn: (v: Date | null) => void;
    checkOut: Date | null;
    setCheckOut: (v: Date | null) => void;
    adults: number;
    setAdults: (v: number) => void;
    children: number;
    setChildren: (v: number) => void;
    handleSearch: (e: React.FormEvent) => void;
    isExpanded: boolean;
    setIsExpanded: (v: boolean) => void;
    CATEGORIES: any[];
    theme?: 'dark' | 'light';
}

export default function SearchMobile({
    location, setLocation,
    propertyType, setPropertyType,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults, setAdults,
    children, setChildren,
    handleSearch,
    isExpanded, setIsExpanded,
    CATEGORIES,
    theme = 'dark'
}: SearchProps) {
    const isDark = theme === 'dark';

    const handleCategorySelect = (id: string) => {
        setPropertyType(id);
        setIsExpanded(true);
    };

    if (!isExpanded) {
        return (
            <div className={`md:hidden w-full px-6 animate-fade-in flex flex-col items-center relative z-[60]`}>
                <h2 className={`${isDark ? 'text-white drop-shadow-md' : 'text-gray-900'} font-black text-[12px] uppercase tracking-[0.4em] mb-12 text-center`}>
                    Where to next?
                </h2>
                <div className="grid grid-cols-3 gap-x-6 gap-y-12 w-full max-w-[340px]">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat.id)}
                            className="flex flex-col items-center gap-4 transition-all duration-300 active:scale-95 group"
                        >
                            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 ${propertyType === cat.id
                                ? 'bg-primary-600 text-white shadow-xl shadow-primary-500/40 scale-110'
                                : isDark
                                    ? 'bg-white/10 backdrop-blur-xl text-white border border-white/20 group-hover:bg-white/30'
                                    : 'bg-gray-100 text-gray-500 border border-gray-200 group-hover:bg-gray-200'
                                }`}>
                                <cat.icon className="h-7 w-7" />
                            </div>
                            <span className={`${isDark ? 'text-white drop-shadow-sm' : 'text-gray-600'} text-[10px] font-black uppercase tracking-[0.2em] text-center leading-tight`}>
                                {cat.label}
                            </span>
                        </button>
                    ))}
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
                    onClick={() => setIsExpanded(false)}
                    className={`p-2.5 ${isDark ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'} backdrop-blur-md rounded-full ${isDark ? 'text-white' : 'text-gray-900'} border`}
                >
                    <ChevronLeft className="h-5 w-5" />
                </button>
                <div className={`flex-1 ${isDark ? 'bg-white/95 border-white' : 'bg-white border-gray-200'} backdrop-blur-md rounded-2xl py-3 px-5 shadow-2xl border`}>
                    <div className="flex items-center gap-3">
                        {(() => {
                            const activeCat = CATEGORIES.find(c => c.id === propertyType);
                            const Icon = activeCat?.icon || CATEGORIES[0].icon;
                            return <Icon className="h-4 w-4 text-primary-600" />;
                        })()}
                        <span className="text-[11px] font-black uppercase tracking-widest text-gray-900">
                            {CATEGORIES.find(c => c.id === propertyType)?.label || 'All Stays'}
                        </span>
                        <button className="text-[9px] font-black text-primary-600 ml-auto uppercase tracking-tighter bg-primary-50 px-3 py-1 rounded-lg" onClick={() => setIsExpanded(false)}>
                            Change
                        </button>
                    </div>
                </div>
            </div>

            <form
                onSubmit={handleSearch}
                className={`bg-white rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.3)] overflow-hidden border ${isDark ? 'border-gray-100' : 'border-gray-200'} flex flex-col`}
            >
                <div className="divide-y divide-gray-50">
                    {/* Location */}
                    <div className="p-4 active:bg-gray-50 transition-colors cursor-pointer group">
                        <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-primary-500/80 mb-1.5">Where to?</label>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-5 w-5 text-primary-600" />
                            <input
                                type="text"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="City or Resort Name"
                                className="w-full bg-transparent text-lg font-bold text-gray-900 placeholder:text-gray-200 outline-none border-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="flex divide-x divide-gray-50">
                        <div className="flex-1 p-4 active:bg-gray-50 transition-colors cursor-pointer group">
                            <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-primary-500/80 mb-1.5">Check In</label>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div className="flex-1">
                                    <DatePicker
                                        selected={checkIn}
                                        onChange={(date: Date | null) => setCheckIn(date)}
                                        selectsStart
                                        startDate={checkIn}
                                        endDate={checkOut}
                                        minDate={new Date()}
                                        dateFormat="dd MMM"
                                        className="w-full bg-transparent text-base font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 cursor-pointer"
                                    />
                                    <p className="text-[9px] text-gray-400 font-bold">{checkIn ? format(checkIn, 'EEEE') : ''}</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 p-4 active:bg-gray-50 transition-colors cursor-pointer group">
                            <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-primary-500/80 mb-1.5">Check Out</label>
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-gray-400" />
                                <div className="flex-1">
                                    <DatePicker
                                        selected={checkOut}
                                        onChange={(date: Date | null) => setCheckOut(date)}
                                        selectsEnd
                                        startDate={checkIn}
                                        endDate={checkOut}
                                        minDate={checkIn ? addDays(checkIn, 1) : new Date()}
                                        dateFormat="dd MMM"
                                        className="w-full bg-transparent text-base font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 cursor-pointer"
                                    />
                                    <p className="text-[9px] text-gray-400 font-bold">{checkOut ? format(checkOut, 'EEEE') : ''}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Guests */}
                    <div className="p-4 active:bg-gray-50 transition-colors cursor-pointer group">
                        <label className="block text-[8px] font-black uppercase tracking-[0.2em] text-primary-500/80 mb-1.5">Who's coming?</label>
                        <div className="flex items-center gap-4">
                            <Users className="h-5 w-5 text-gray-400" />
                            <div className="flex-1 flex items-baseline gap-2">
                                <span className="text-xl font-bold text-gray-900">{adults + children}</span>
                                <span className="text-[10px] font-black text-gray-900 uppercase">Travellers</span>
                            </div>
                            <div className="flex gap-4">
                                <select
                                    value={adults}
                                    onChange={(e) => setAdults(Number(e.target.value))}
                                    className="text-[11px] font-black text-primary-600 bg-transparent border-none p-0 focus:ring-0 appearance-none"
                                >
                                    {[1, 2, 3, 4, 5, 6].map(num => <option key={num} value={num}>{num} Adult</option>)}
                                </select>
                                <select
                                    value={children}
                                    onChange={(e) => setChildren(Number(e.target.value))}
                                    className="text-[11px] font-black text-primary-600 bg-transparent border-none p-0 focus:ring-0 appearance-none"
                                >
                                    {[0, 1, 2, 3, 4].map(num => <option key={num} value={num}>{num} Child</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50/50">
                    <button
                        type="submit"
                        className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-primary-500/30 active:scale-95 transition-all duration-300 uppercase tracking-[0.3em] text-xs flex items-center justify-center gap-3"
                    >
                        Search Now
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </form>
        </div>
    );
}
