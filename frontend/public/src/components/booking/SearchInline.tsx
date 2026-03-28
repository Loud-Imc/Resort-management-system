import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Users, Calendar, Search, X, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe } from 'lucide-react';
import { format } from 'date-fns';
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
    categories: PropertyCategory[];
    isGroupBooking: boolean;
    setIsGroupBooking: (v: boolean) => void;
    groupSize: number;
    setGroupSize: (v: number) => void;
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
    categories,
    isGroupBooking, setIsGroupBooking,
    groupSize, setGroupSize
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
                    <div className="absolute top-0 inset-x-0 bg-white rounded-b-[2.5rem] shadow-2xl overflow-hidden  flex flex-col animate-slide-down">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-gray-900">Update Your Search</h3>
                            <button
                                onClick={() => setIsMobileModalOpen(false)}
                                className="p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-900" />
                            </button>
                        </div>

                        <form onSubmit={onSubmit} className="p-5 space-y-4 overflow-y-auto flex-1 no-scrollbar pb-8">
                            {/* Destination */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Destination</label>
                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                                    <LocationAutocomplete
                                        value={location}
                                        onChange={setLocation}
                                        onSelect={(description) => setLocation(description.split(',')[0])}
                                        placeholder="Where to?"
                                        theme="light"
                                        inputClassName="bg-transparent text-base font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">CHECK IN</label>
                                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                                        <Calendar className="h-5 w-5 text-gray-400" />
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
                                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full cursor-pointer"
                                            placeholderText="Add date"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">CHECK OUT</label>
                                    <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3.5">
                                        <Calendar className="h-5 w-5 text-gray-400" />
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
                                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full cursor-pointer"
                                            placeholderText="Add date"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Guests */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-primary-600 px-1">Traveler Details</label>
                                <div className="space-y-3">
                                    {/* Adults */}
                                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                <Users className="h-4.5 w-4.5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">
                                                    {isGroupBooking ? 'Adults' : 'Adults'}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Ages 13+</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(1, adults - 1);
                                                    setAdults(newVal);
                                                    if (isGroupBooking) setGroupSize(newVal + children);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 text-gray-900 font-black hover:bg-primary-600 hover:text-white active:scale-90 transition-all"
                                            >-</button>
                                            <input
                                                type="number"
                                                value={adults}
                                                onChange={(e) => {
                                                    const val = Math.max(1, parseInt(e.target.value) || 1);
                                                    setAdults(val);
                                                    if (isGroupBooking) setGroupSize(val + children);
                                                }}
                                                className="w-9 bg-transparent text-center font-black text-gray-900 outline-none border-none p-0 focus:ring-0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = adults + 1;
                                                    setAdults(newVal);
                                                    if (isGroupBooking) setGroupSize(newVal + children);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 text-gray-900 font-black hover:bg-primary-600 hover:text-white active:scale-90 transition-all"
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Children */}
                                    <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm group">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                <Users className="h-4.5 w-4.5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">
                                                    {isGroupBooking ? 'Children' : 'Children'}
                                                </p>
                                                <p className="text-[8px] font-bold text-gray-400 uppercase">Ages 6-12</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-inner">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(0, children - 1);
                                                    setChildren(newVal);
                                                    if (isGroupBooking) setGroupSize(adults + newVal);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 text-gray-900 font-black hover:bg-primary-600 hover:text-white active:scale-90 transition-all"
                                            >-</button>
                                            <input
                                                type="number"
                                                value={children}
                                                onChange={(e) => {
                                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                                    setChildren(val);
                                                    if (isGroupBooking) setGroupSize(adults + val);
                                                }}
                                                className="w-9 bg-transparent text-center font-black text-gray-900 outline-none border-none p-0 focus:ring-0"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = children + 1;
                                                    setChildren(newVal);
                                                    if (isGroupBooking) setGroupSize(adults + newVal);
                                                }}
                                                className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 text-gray-900 font-black hover:bg-primary-600 hover:text-white active:scale-90 transition-all"
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Rooms */}
                                    {!isGroupBooking && (
                                        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-primary-50 group-hover:text-primary-600 transition-colors">
                                                    <Hotel className="h-4.5 w-4.5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-900">Rooms</p>
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase">Total rooms needed</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 bg-gray-50 p-1 rounded-xl border border-gray-100 shadow-inner">
                                                <button
                                                    type="button"
                                                    onClick={() => setRooms(Math.max(1, rooms - 1))}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 text-gray-900 font-black hover:bg-primary-600 hover:text-white active:scale-90 transition-all"
                                                >-</button>
                                                <input
                                                    type="number"
                                                    value={rooms}
                                                    onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                                                    className="w-9 bg-transparent text-center font-black text-gray-900 outline-none border-none p-0 focus:ring-0"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setRooms(rooms + 1)}
                                                    className="w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-gray-100 text-gray-900 font-black hover:bg-primary-600 hover:text-white active:scale-90 transition-all"
                                                >+</button>
                                            </div>
                                        </div>
                                    )}

                                    {isGroupBooking && (
                                        <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100/50 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-primary-900">Total Group Size</span>
                                            </div>
                                            <span className="text-xl font-black text-primary-600">{groupSize}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Travel Categories</label>
                                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsGroupBooking(false);
                                            setCategoryId('');
                                        }}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${(!isGroupBooking && categoryId === '')
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30'
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <Building className={`h-3 w-3 ${(!isGroupBooking && categoryId === '') ? 'text-white' : 'text-gray-400'}`} />
                                        All Stays
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsGroupBooking(true);
                                            setGroupSize(Math.max(10, adults + children));
                                            setCategoryId('');
                                        }}
                                        className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${isGroupBooking
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30'
                                            : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                            }`}
                                    >
                                        <Users className={`h-3 w-3 ${isGroupBooking ? 'text-white' : 'text-gray-400'}`} />
                                        Group Stay
                                    </button>

                                    {categories.map(cat => {
                                        const Icon = getIcon(cat.icon);
                                        return (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => {
                                                    setIsGroupBooking(false);
                                                    setCategoryId(cat.id);
                                                }}
                                                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${(categoryId === cat.id && !isGroupBooking)
                                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/30'
                                                    : 'bg-white border-gray-100 text-gray-500 hover:border-gray-200'
                                                    }`}
                                            >
                                                <Icon className={`h-3 w-3 ${(categoryId === cat.id && !isGroupBooking) ? 'text-white' : 'text-gray-400'}`} />
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
                className="hidden lg:flex bg-white border border-gray-200 rounded-2xl shadow-sm items-center divide-x divide-gray-100 overflow-visible"
            >
                {/* Location */}
                <div className="w-[30%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Destination</label>
                    <LocationAutocomplete
                        value={location}
                        onChange={setLocation}
                        onSelect={(description) => setLocation(description.split(',')[0])}
                        placeholder="Where to?"
                        theme="light"
                        inputClassName="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full placeholder:text-gray-300"
                    />
                </div>

                {/* Dates */}
                <div className="w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">CHECK IN</label>
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
                            showPopperArrow={true}
                            portalId="root"
                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full placeholder:text-gray-300 cursor-pointer"
                            placeholderText="Add date"
                        />
                    </div>
                </div>

                <div className="w-[20%] px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer group">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">CHECK OUT</label>
                    <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
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
                            className="bg-transparent text-sm font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full placeholder:text-gray-300 cursor-pointer"
                            placeholderText="Add date"
                        />
                    </div>
                </div>

                <div className="w-[30%] px-8 py-4 hover:bg-white transition-colors cursor-pointer group relative">
                    <label className="block text-[8px] font-black uppercase tracking-[0.3em] text-primary-600 mb-1.5 group-hover:text-primary-700 transition-colors">
                        {isGroupBooking ? 'Group Stay Details' : 'Traveler Details'}
                    </label>
                    <div className="flex items-center gap-6">
                        {isGroupBooking ? (
                            <div className="flex items-center justify-between w-full">
                                <div className="flex gap-4">
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Adults</span>
                                        <input
                                            type="number"
                                            value={adults}
                                            onChange={(e) => {
                                                const val = Math.max(1, parseInt(e.target.value) || 1);
                                                setAdults(val);
                                                setGroupSize(val + children);
                                            }}
                                            className="w-8 bg-transparent text-sm font-black text-gray-900 outline-none border-none p-0 focus:ring-0 group-hover:text-primary-600 transition-colors"
                                        />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Children</span>
                                        <input
                                            type="number"
                                            value={children}
                                            onChange={(e) => {
                                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                                setChildren(val);
                                                setGroupSize(adults + val);
                                            }}
                                            className="w-8 bg-transparent text-sm font-black text-gray-900 outline-none border-none p-0 focus:ring-0 group-hover:text-primary-600 transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-primary-600 uppercase tracking-widest">{groupSize} Members</span>
                                    <span className="text-[7px] font-bold text-gray-400 uppercase">Whole Resort</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 w-full divide-x divide-gray-100">
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Adults</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={adults}
                                        onChange={(e) => setAdults(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-8 bg-transparent text-sm font-black text-gray-900 outline-none border-none p-0 focus:ring-0 group-hover:text-primary-600 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col pl-4">
                                    <span className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Children</span>
                                    <input
                                        type="number"
                                        min={0}
                                        value={children}
                                        onChange={(e) => setChildren(Math.max(0, parseInt(e.target.value) || 0))}
                                        className="w-8 bg-transparent text-sm font-black text-gray-900 outline-none border-none p-0 focus:ring-0 group-hover:text-primary-600 transition-colors"
                                    />
                                </div>
                                <div className="flex flex-col pl-4">
                                    <span className="text-[7px] font-black text-gray-400 uppercase leading-none mb-1">Rooms</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={rooms}
                                        onChange={(e) => setRooms(Math.max(1, parseInt(e.target.value) || 1))}
                                        className="w-8 bg-transparent text-sm font-black text-gray-900 outline-none border-none p-0 focus:ring-0 group-hover:text-primary-600 transition-colors"
                                    />
                                </div>
                            </div>
                        )}
                        <Users className="h-4 w-4 text-gray-300 group-hover:text-primary-600 transition-colors ml-auto" />
                    </div>
                </div>

                {/* Search Action */}
                <div className="w-[10%] p-3">
                    <button
                        type="submit"
                        className="w-full aspect-square lg:h-full bg-gradient-to-br from-primary-600 to-primary-800 hover:from-primary-700 hover:to-primary-900 text-white rounded-xl transition-all duration-500 flex items-center justify-center group shadow-[0_10px_20px_-5px_rgba(22,163,74,0.4)] hover:shadow-[0_15px_30px_-5px_rgba(22,163,74,0.5)] hover:-translate-y-0.5 active:translate-y-0 active:scale-95"
                    >
                        <Search className="h-5 w-5 group-hover:scale-110 transition-transform duration-500" />
                    </button>
                </div>
            </form>

            {/* Sub-categories (Compact Pills) */}
            <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setIsGroupBooking(false);
                        setCategoryId('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${(!isGroupBooking && categoryId === '')
                        ? 'bg-primary-50 border-primary-200 text-primary-600'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                        }`}
                >
                    <Building className={`h-3 w-3 ${(!isGroupBooking && categoryId === '') ? 'text-primary-600' : 'text-gray-300'}`} />
                    All Stays
                </button>

                <button
                    onClick={(e) => {
                        e.preventDefault();
                        setIsGroupBooking(true);
                        setGroupSize(Math.max(10, adults + children));
                        setCategoryId('');
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${isGroupBooking
                        ? 'bg-primary-50 border-primary-200 text-primary-600'
                        : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                        }`}
                >
                    <Users className={`h-3 w-3 ${isGroupBooking ? 'text-primary-600' : 'text-gray-300'}`} />
                    Group Stay
                </button>
                {categories.map(cat => {
                    const Icon = getIcon(cat.icon);
                    return (
                        <button
                            key={cat.id}
                            onClick={(e) => {
                                e.preventDefault();
                                setIsGroupBooking(false);
                                setCategoryId(cat.id);
                            }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all duration-300 whitespace-nowrap ${(categoryId === cat.id && !isGroupBooking)
                                ? 'bg-primary-50 border-primary-200 text-primary-600'
                                : 'bg-white border-gray-100 text-gray-400 hover:border-gray-300 hover:text-gray-600'
                                }`}
                        >
                            <Icon className={`h-3 w-3 ${(categoryId === cat.id && !isGroupBooking) ? 'text-primary-600' : 'text-gray-300'}`} />
                            {cat.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
