import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { format } from 'date-fns';
import { ChevronDown, Check, Clock } from 'lucide-react';
import { PropertyCategory } from '../../types';
import LocationAutocomplete from './LocationAutocomplete';
import GuestRoomsModal from './GuestRoomsModal';
import { useSearch } from '../../context/SearchContext';

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
    setChildren: (v: number | ((prev: number) => number)) => void;
    childAges?: number[];
    setChildAge?: (index: number, age: number) => void;
    infants?: number;
    setInfants?: (v: number) => void;
    rooms: number;
    setRooms: (v: number) => void;

    handleSearch: (e: React.FormEvent) => void;
    categories: PropertyCategory[];
    theme?: 'dark' | 'light';
    isGroupBooking: boolean;
    groupSize: number;
    setGroupSize: (v: number) => void;
    onUseLocation?: () => void;
    isLocating?: boolean;
    latitude?: number | null;
    setLatitude?: (v: number | null) => void;
    longitude?: number | null;
    setLongitude?: (v: number | null) => void;
}

const PRICE_BUCKETS = [
    { label: '₹0-₹1500, ₹1500-₹2500,...', value: 'all', desc: 'Any budget' },
    { label: '₹0 - ₹1,500', value: '0-1500', desc: 'Economy stays' },
    { label: '₹1,500 - ₹3,000', value: '1500-3000', desc: 'Standard & Comfort' },
    { label: '₹3,000 - ₹6,000', value: '3000-6000', desc: 'Premium resorts' },
    { label: '₹6,000+', value: '6000+', desc: 'Luxury villas & suites' },
];

export default function SearchDesktop({
    location, setLocation,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults,
    rooms,
    handleSearch,
    isGroupBooking,
    groupSize,
    onUseLocation, isLocating,
    latitude,
    setLatitude,
    setLongitude,
}: SearchProps) {
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [isPriceDropdownOpen, setIsPriceDropdownOpen] = useState(false);
    const priceDropdownRef = useRef<HTMLDivElement>(null);

    const {
        petFriendly, setPetFriendly,
        priceBucket, setPriceBucket,
        rawChildAges
    } = useSearch();

    const totalChildren = rawChildAges.length;
    const infantsCount = rawChildAges.filter(a => a >= 0 && a <= 2).length;
    const paidOrFreeChildren = rawChildAges.filter(a => a >= 3).length;

    const currentPriceObj = PRICE_BUCKETS.find(p => p.value === priceBucket) || PRICE_BUCKETS[0];

    // Format dates matching exact MMT style
    const checkInDay = checkIn ? format(checkIn, 'dd') : '23';
    const checkInMonthYear = checkIn ? format(checkIn, "MMM''yy") : "Sep'26";
    const checkInWeekDay = checkIn ? format(checkIn, 'EEEE') : 'Wednesday';

    const checkOutDay = checkOut ? format(checkOut, 'dd') : '24';
    const checkOutMonthYear = checkOut ? format(checkOut, "MMM''yy") : "Sep'26";
    const checkOutWeekDay = checkOut ? format(checkOut, 'EEEE') : 'Thursday';

    const displayCity = location || 'Goa';
    const displayCountry = 'India';

    return (
        <div className="hidden md:block w-full max-w-[1240px] mx-auto">
            <form
                onSubmit={handleSearch}
                className="bg-white rounded-xl shadow-2xl p-6 md:p-8 pt-10 pb-12 relative z-20"
            >
                {/* ─── TOP BAR (Radio Options & Property Listing Link) ─── */}
                <div className="flex items-center justify-between pb-3 text-xs">
                    {/* Left Radio Options */}
                    <div className="flex items-center gap-5">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-900">
                            <input
                                type="radio"
                                name="bookingType"
                                checked={!isGroupBooking}
                                onChange={() => {}}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                            <span>Upto 4 Rooms</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                            <input
                                type="radio"
                                name="bookingType"
                                checked={isGroupBooking}
                                onChange={() => {}}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 cursor-pointer"
                            />
                            <span>Group Deals</span>
                            <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                                new
                            </span>
                        </label>

                        {/* Pet Friendly Toggle Button */}
                        <button
                            type="button"
                            onClick={() => setPetFriendly(!petFriendly)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                                petFriendly
                                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                        >
                            <span>🐾</span>
                            <span>{petFriendly ? 'Pet-Friendly Stays' : 'Travelling with Pets?'}</span>
                            {petFriendly && <Check className="h-3 w-3 text-emerald-700" />}
                        </button>
                    </div>

                    {/* Right Property Listing Link */}
                    <div className="hidden lg:block text-gray-600 text-xs">
                        <span>Book Domestic and International Property Online. To list your property </span>
                        <a
                            href={`${import.meta.env.VITE_PROPERTY_URL || ''}/register`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary-600 hover:underline font-bold"
                        >
                            Click Here
                        </a>
                    </div>
                </div>

                {/* ─── 5-COLUMN SEARCH SEGMENT BOX (Exact MMT Layout) ─── */}
                <div className="mt-2 border border-gray-200 rounded-lg flex divide-x divide-gray-200 overflow-visible bg-white hover:border-gray-300 transition-colors">

                    {/* 1. Location Segment */}
                    <div className="flex-[1.4] p-3.5 px-4 cursor-pointer hover:bg-sky-50/20 transition-colors relative flex flex-col justify-center min-h-[82px] group">
                        <label className="text-[11px] font-medium text-gray-500 block leading-tight mb-0.5">
                            City, Property Name Or Location
                        </label>
                        <LocationAutocomplete
                            value={location}
                            onChange={(val) => setLocation(val)}
                            onSelect={(description, lat, lng) => {
                                setLocation(description.split(',')[0]);
                                if (lat !== undefined && lng !== undefined) {
                                    setLatitude?.(lat);
                                    setLongitude?.(lng);
                                } else {
                                    setLatitude?.(null);
                                    setLongitude?.(null);
                                }
                            }}
                            placeholder="Goa"
                            theme="light"
                            hideIcon={true}
                            onUseLocation={onUseLocation}
                            isLocating={isLocating}
                            latitude={latitude}
                            inputClassName="w-full bg-transparent text-3xl font-black text-gray-900 placeholder:text-gray-900 outline-none border-none p-0 focus:ring-0 leading-tight truncate"
                        />
                        <span className="text-xs text-gray-500 block mt-0.5 truncate">
                            {location ? `${location}, India` : displayCountry}
                        </span>
                    </div>

                    {/* 2. Check-In Segment */}
                    <div className="flex-1 p-3.5 px-4 cursor-pointer hover:bg-sky-50/20 transition-colors relative flex flex-col justify-center min-h-[82px] group">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-0.5">
                            <span>Check-In</span>
                            <ChevronDown className="h-3 w-3 text-primary-600" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-gray-900 leading-tight">{checkInDay}</span>
                            <span className="text-sm font-bold text-gray-800">{checkInMonthYear}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5">{checkInWeekDay}</span>
                        <DatePicker
                            selected={checkIn}
                            onChange={(date: Date | null) => setCheckIn(date)}
                            selectsStart
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={new Date()}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>

                    {/* 3. Check-Out Segment */}
                    <div className="flex-1 p-3.5 px-4 cursor-pointer hover:bg-sky-50/20 transition-colors relative flex flex-col justify-center min-h-[82px] group">
                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-0.5">
                            <span>Check-Out</span>
                            <ChevronDown className="h-3 w-3 text-primary-600" />
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-3xl font-black text-gray-900 leading-tight">{checkOutDay}</span>
                            <span className="text-sm font-bold text-gray-800">{checkOutMonthYear}</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5">{checkOutWeekDay}</span>
                        <DatePicker
                            selected={checkOut}
                            onChange={(date: Date | null) => setCheckOut(date)}
                            selectsEnd
                            startDate={checkIn}
                            endDate={checkOut}
                            minDate={checkIn || new Date()}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                    </div>

                    {/* 4. Rooms & Guests Segment */}
                    <div
                        onClick={() => setIsGuestModalOpen(!isGuestModalOpen)}
                        className="flex-[1.1] p-3.5 px-4 cursor-pointer hover:bg-sky-50/20 transition-colors relative flex flex-col justify-center min-h-[82px] group"
                    >
                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-0.5">
                            <span>Rooms & Guests</span>
                            <ChevronDown className="h-3 w-3 text-primary-600" />
                        </div>
                        <div className="flex items-baseline gap-1 leading-tight">
                            <span className="text-2xl font-black text-gray-900">{rooms}</span>
                            <span className="text-xs font-semibold text-gray-700 mr-1.5">Rooms</span>
                            <span className="text-2xl font-black text-gray-900">{adults}</span>
                            <span className="text-xs font-semibold text-gray-700">Adults</span>
                        </div>
                        <span className="text-xs text-gray-500 mt-0.5 truncate">
                            {totalChildren > 0
                                ? `${paidOrFreeChildren} Children${infantsCount > 0 ? `, ${infantsCount} Infants` : ''}`
                                : '0 Children'}
                        </span>

                        {/* Guest modal popover matching Screenshot 2 */}
                        <GuestRoomsModal
                            isOpen={isGuestModalOpen}
                            onClose={() => setIsGuestModalOpen(false)}
                        />
                    </div>

                    {/* 5. Price Per Night Segment */}
                    <div
                        ref={priceDropdownRef}
                        onClick={() => setIsPriceDropdownOpen(!isPriceDropdownOpen)}
                        className="flex-1 p-3.5 px-4 cursor-pointer hover:bg-sky-50/20 transition-colors relative flex flex-col justify-center min-h-[82px] group"
                    >
                        <div className="flex items-center gap-1 text-[11px] font-medium text-gray-500 mb-0.5">
                            <span>Price Per Night</span>
                            <ChevronDown className="h-3 w-3 text-primary-600" />
                        </div>
                        <div className="flex items-baseline truncate">
                            <span className="text-sm font-bold text-gray-900 truncate leading-tight">
                                {currentPriceObj.label}
                            </span>
                        </div>
                        <span className="text-xs text-gray-400 mt-0.5 truncate">
                            {currentPriceObj.desc}
                        </span>

                        {/* Price Dropdown Menu */}
                        {isPriceDropdownOpen && (
                            <div
                                className="absolute top-full right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl p-2 z-50 border border-gray-100 animate-in fade-in zoom-in-95 duration-200"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="p-2 border-b border-gray-100">
                                    <span className="text-xs font-bold text-gray-900">Select Budget Range</span>
                                </div>
                                <div className="py-1 space-y-1">
                                    {PRICE_BUCKETS.map((bucket) => (
                                        <button
                                            key={bucket.value}
                                            type="button"
                                            onClick={() => {
                                                setPriceBucket(bucket.value);
                                                setIsPriceDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                                                priceBucket === bucket.value
                                                    ? 'bg-primary-50 text-primary-800 font-bold'
                                                    : 'hover:bg-gray-50 text-gray-700'
                                            }`}
                                        >
                                            <div>
                                                <p className="font-bold">{bucket.label}</p>
                                                <p className="text-[10px] text-gray-400 font-normal">{bucket.desc}</p>
                                            </div>
                                            {priceBucket === bucket.value && (
                                                <Check className="h-4 w-4 text-primary-600" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* ─── LAST SEARCH PILL (Matching MMT screenshot) ─── */}
                <div className="flex justify-center mt-3">
                    <div className="inline-flex items-center gap-2 text-[11px] text-gray-500">
                        <span>Last Search:</span>
                        <div className="bg-gray-50 border border-gray-200/80 rounded-md px-2.5 py-0.5 text-gray-700 font-medium inline-flex items-center gap-1.5 shadow-2xs">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span>{displayCity}, India</span>
                            <span className="text-gray-300">|</span>
                            <span>{checkInDay} {checkInMonthYear.split("'")[0]} - {checkOutDay} {checkOutMonthYear.split("'")[0]}</span>
                        </div>
                    </div>
                </div>

                {/* ─── OVERLAPPING CENTERED SEARCH BUTTON (Matching MMT) ─── */}
                <button
                    type="submit"
                    className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-16 py-3 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-extrabold text-xl tracking-wider uppercase shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 active:scale-95 cursor-pointer z-30"
                >
                    SEARCH
                </button>
            </form>

            {/* ─── QUICK EXPLORE NAVIGATION PILLS (Matching MMT Screenshot 1) ─── */}
            <div className="flex items-center justify-center gap-3 sm:gap-6 mt-10">
                <Link 
                    to="/properties" 
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-xs border border-gray-100 hover:shadow-md text-xs font-bold text-gray-700 hover:text-primary-700 transition-all hover:scale-105"
                >
                    <span>🧭</span>
                    <span>Where2Go</span>
                </Link>
                <Link 
                    to="/properties?deals=group" 
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-xs border border-gray-100 hover:shadow-md text-xs font-bold text-gray-700 hover:text-primary-700 transition-all hover:scale-105"
                >
                    <span>💳</span>
                    <span>Group Deals</span>
                    <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                        new
                    </span>
                </Link>
                <Link 
                    to="/properties?theme=beachfront" 
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-xs border border-gray-100 hover:shadow-md text-xs font-bold text-gray-700 hover:text-primary-700 transition-all hover:scale-105"
                >
                    <span>🏖️</span>
                    <span>Beachfront Escapes</span>
                </Link>
                <Link 
                    to="/properties?theme=weekend" 
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white shadow-xs border border-gray-100 hover:shadow-md text-xs font-bold text-gray-700 hover:text-primary-700 transition-all hover:scale-105"
                >
                    <span>🏡</span>
                    <span>Nearby Getaways</span>
                </Link>
            </div>
        </div>
    );
}
