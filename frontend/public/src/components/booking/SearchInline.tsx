import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, MapPin, Search, X, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe } from 'lucide-react';
import { addDays, format } from 'date-fns';
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
    handleSearch: (e: React.FormEvent) => void;
    categories: PropertyCategory[];
}

export default function SearchInline({
    location, setLocation,
    categoryId, setCategoryId,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults, setAdults,
    children, setChildren,
    rooms, setRooms,
    handleSearch,
    categories
}: SearchProps) {
    const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

    const getIcon = (iconName?: string) => {
        const Icon = iconName ? ICON_MAP[iconName] : Layout;
        return Icon || Layout;
    };

    const onSubmit = (e: React.FormEvent) => {
        handleSearch(e);
        setIsMobileModalOpen(false);
    };

    return (
        <div className="w-full">
            {/* Mobile Trigger Button */}
            <div className="lg:hidden">
                <button
                    onClick={() => setIsMobileModalOpen(true)}
                    className="w-full bg-primary-600 backdrop-blur-md border border-white/20 rounded-2xl  px-4 flex items-center justify-between text-white shadow-xl group animate-fade-in"
                >
                    <div className="flex items-center gap-2.5 px-4 py-2.5 ">
                        <Search className="h-4.5 w-4.5 text-white" />
                        <span className="text-[12px] font-black uppercase tracking-[0.1em] text-white whitespace-nowrap">
                            Update Searches
                        </span>
                    </div>
                    <div className="text-right flex-1 ml-4 overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">
                            {location || 'Anywhere'} • {checkIn ? format(checkIn, 'MMM d') : 'Add dates'}
                        </p>
                    </div>
                </button>
            </div>

            {/* Mobile Fullscreen Modal/Dropdown */}
            {isMobileModalOpen && (
                <div className="fixed inset-0 z-[100000] lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsMobileModalOpen(false)}
                    />
                    <div className="absolute top-0 inset-x-0 bg-white rounded-b-[2.5rem] shadow-2xl overflow-hidden animate-slide-down">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900">Update Your Search</h3>
                            <button
                                onClick={() => setIsMobileModalOpen(false)}
                                className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-900" />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="p-6 space-y-6">
                            {/* Destination */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Destination</label>
                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                    <MapPin className="h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="Where to?"
                                        className="bg-transparent text-base font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Check In</label>
                                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                        <DatePicker
                                            selected={checkIn}
                                            onChange={(date: Date | null) => setCheckIn(date)}
                                            selectsStart
                                            startDate={checkIn}
                                            endDate={checkOut}
                                            minDate={new Date()}
                                            dateFormat="dd MMM"
                                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Check Out</label>
                                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-4">
                                        <Calendar className="h-5 w-5 text-gray-400" />
                                        <DatePicker
                                            selected={checkOut}
                                            onChange={(date: Date | null) => setCheckOut(date)}
                                            selectsEnd
                                            startDate={checkIn}
                                            endDate={checkOut}
                                            minDate={checkIn ? addDays(checkIn, 1) : new Date()}
                                            dateFormat="dd MMM"
                                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Guests */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Who's Coming?</label>
                                <div className="flex items-center justify-between bg-gray-50 border border-gray-100 rounded-xl p-4">
                                    <div className="flex items-center gap-3">
                                        <Users className="h-5 w-5 text-gray-400" />
                                        <span className="text-base font-bold text-gray-900">{adults + children} Travellers</span>
                                    </div>
                                    <div className="flex gap-4">
                                        <select
                                            value={adults}
                                            onChange={(e) => setAdults(Number(e.target.value))}
                                            className="text-xs font-bold text-primary-600 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-0"
                                        >
                                            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}A</option>)}
                                        </select>
                                        <select
                                            value={children}
                                            onChange={(e) => setChildren(Number(e.target.value))}
                                            className="text-xs font-bold text-primary-600 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-0"
                                        >
                                            {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n}C</option>)}
                                        </select>
                                        <select
                                            value={rooms}
                                            onChange={(e) => setRooms(Number(e.target.value))}
                                            className="text-xs font-bold text-primary-600 bg-white border border-gray-200 rounded-lg px-2 py-1 focus:ring-0"
                                        >
                                            {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}R</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Property Type</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                    <button
                                        type="button"
                                        onClick={() => setCategoryId('')}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${categoryId === ''
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30'
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <Building className={`h-3 w-3 ${categoryId === '' ? 'text-white' : 'text-gray-400'}`} />
                                        All Stays
                                    </button>
                                    {categories.map(cat => {
                                        const Icon = getIcon(cat.icon);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setCategoryId(cat.id)}
                                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${categoryId === cat.id
                                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30'
                                                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                                    }`}
                                            >
                                                <Icon className={`h-3 w-3 ${categoryId === cat.id ? 'text-white' : 'text-gray-400'}`} />
                                                {cat.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-black py-4 rounded-xl shadow-lg shadow-primary-500/20 active:scale-95 transition-all uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3"
                            >
                                <Search className="h-4 w-4" />
                                Apply Changes
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Desktop Horizontal Bar (Visible only on LG+) */}
            <form
                onSubmit={handleSearch}
                className="hidden lg:flex bg-white border border-gray-200 rounded-2xl shadow-sm items-center divide-x divide-gray-100 overflow-hidden"
            >
                {/* Location */}
                <div className="w-[30%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
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

                {/* Dates */}
                <div className="w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
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

                <div className="w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
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
                <div className="w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group relative">
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
                            <select
                                value={rooms}
                                onChange={(e) => setRooms(Number(e.target.value))}
                                className="text-[10px] font-bold text-primary-600 bg-transparent border-none p-0 focus:ring-0 cursor-pointer appearance-none"
                            >
                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}R</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Search Action */}
                <div className="w-[10%] p-2">
                    <button
                        type="submit"
                        className="w-full lg:h-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 px-4 transition-all duration-300 flex items-center justify-center gap-2 group shadow-lg shadow-primary-500/20"
                    >
                        <Search className="h-5 w-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </form>

            {/* Sub-categories (Compact Pills) */}
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setCategoryId('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${categoryId === ''
                        ? 'bg-primary-50 border-primary-200 text-primary-600'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                        }`}
                >
                    <Building className={`h-3 w-3 ${categoryId === '' ? 'text-primary-600' : 'text-gray-300'}`} />
                    All Stays
                </button>
                {categories.map(cat => {
                    const Icon = getIcon(cat.icon);
                    return (
                        <button
                            key={cat.id}
                            onClick={(e) => {
                                e.preventDefault();
                                setCategoryId(cat.id);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${categoryId === cat.id
                                ? 'bg-primary-50 border-primary-200 text-primary-600'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                                }`}
                        >
                            <Icon className={`h-3 w-3 ${categoryId === cat.id ? 'text-primary-600' : 'text-gray-300'}`} />
                            {cat.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
