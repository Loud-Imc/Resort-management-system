import React from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, MapPin, Search } from 'lucide-react';
import { addDays } from 'date-fns';

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
    CATEGORIES: any[];
}

export default function SearchInline({
    location, setLocation,
    propertyType, setPropertyType,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults, setAdults,
    children, setChildren,
    handleSearch,
    CATEGORIES
}: SearchProps) {
    return (
        <div className="w-full">
            {/* Main Bar */}
            <form
                onSubmit={handleSearch}
                className="bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col lg:flex-row items-center divide-y lg:divide-y-0 lg:divide-x divide-gray-100 overflow-hidden"
            >
                {/* Location */}
                <div className="w-full lg:w-[30%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Destination</label>
                    <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary-500" />
                        <input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Where to?"
                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full placeholder:text-gray-300"
                        />
                    </div>
                </div>

                {/* Dates Selection (Combined in one or two segments) */}
                <div className="w-full lg:w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Check In</label>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <DatePicker
                            selected={checkIn}
                            onChange={(date: Date | null) => setCheckIn(date)}
                            selectsStart
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={new Date()}
                            dateFormat="dd MMM yyyy"
                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full cursor-pointer"
                        />
                    </div>
                </div>

                <div className="w-full lg:w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Check Out</label>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <DatePicker
                            selected={checkOut}
                            onChange={(date: Date | null) => setCheckOut(date)}
                            selectsEnd
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={checkIn ? addDays(checkIn, 1) : new Date()}
                            dateFormat="dd MMM yyyy"
                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full cursor-pointer"
                        />
                    </div>
                </div>

                {/* Guests */}
                <div className="w-full lg:w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group relative">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Travellers</label>
                    <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-gray-400" />
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-bold text-gray-900">{adults + children}</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Guests</span>
                        </div>
                        <div className="flex gap-2 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <select
                                value={adults}
                                onChange={(e) => setAdults(Number(e.target.value))}
                                className="text-[10px] font-bold text-primary-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none"
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}A</option>)}
                            </select>
                            <select
                                value={children}
                                onChange={(e) => setChildren(Number(e.target.value))}
                                className="text-[10px] font-bold text-primary-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none"
                            >
                                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}C</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Search Action */}
                <div className="w-full lg:w-[10%] p-2">
                    <button
                        type="submit"
                        className="w-full lg:h-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 px-4 transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-primary-500/20"
                    >
                        <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                        <span className="lg:hidden font-black uppercase tracking-widest text-xs">Update Search</span>
                    </button>
                </div>
            </form>

            {/* Sub-categories (Compact Pills) */}
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        onClick={(e) => {
                            e.preventDefault();
                            setPropertyType(cat.id);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${propertyType === cat.id
                            ? 'bg-primary-50 border-primary-200 text-primary-600'
                            : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                            }`}
                    >
                        <cat.icon className={`h-3 w-3 ${propertyType === cat.id ? 'text-primary-600' : 'text-gray-300'}`} />
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
