import React from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Users, Search, X, 
    // Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe, 
    ChevronRight, MapPin, Calendar, User } from 'lucide-react';
import { PropertyCategory } from '../../types';
import LocationAutocomplete from './LocationAutocomplete';

// const ICON_MAP: Record<string, any> = {
//     Palmtree, Hotel, Home, Coffee, Tent, Building, Globe, Layout,
// };

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
    groupSize: number;
    setGroupSize: (v: number) => void;
    onUseLocation?: () => void;
    isLocating?: boolean;
    latitude?: number | null;
}

export default function SearchDesktop({
    location, setLocation,
    checkIn, setCheckIn,
    checkOut, setCheckOut,
    adults, setAdults,
    children, setChildren,
    rooms, setRooms,
    handleSearch,
    isGroupBooking,
    groupSize, setGroupSize,
    onUseLocation, isLocating,
    latitude
}: SearchProps) {
    const [showGuestModal, setShowGuestModal] = React.useState(false);
    const guestModalRef = React.useRef<HTMLDivElement>(null);

    return (
        <div className="hidden md:block w-full">
            <form
                onSubmit={handleSearch}
                className="bg-white rounded-lg border border-primary-800 shadow-[0_2px_10px_rgba(15,63,71,0.06)] flex items-center p-2 relative z-50 w-full"
            >
                <div className="flex divide-x divide-primary-800 items-stretch flex-1 h-14 w-full">
                    {/* Location Segment */}
                    <div className="flex-[1.5] px-6 flex items-center gap-3 hover:bg-gray-50 rounded-l-lg transition-all duration-300 cursor-pointer group">
                        <MapPin className="h-5 w-5 text-primary-800 flex-shrink-0" />
                        <div className="flex flex-col min-w-0 w-full">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black leading-none mb-1">Where to?</span>
                            <LocationAutocomplete
                                value={location}
                                onChange={(val) => setLocation(val)}
                                onSelect={(description) => setLocation(description.split(',')[0])}
                                placeholder="Search destinations"
                                theme="light"
                                hideIcon={true}
                                onUseLocation={onUseLocation}
                                isLocating={isLocating}
                                latitude={latitude}
                                inputClassName="w-full bg-transparent text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none border-none p-0 focus:ring-0"
                            />
                        </div>
                    </div>

                    {/* Dates Segment */}
                    <div className="flex-[2] px-6 flex items-center gap-3 hover:bg-gray-50 transition-all duration-300 cursor-pointer group relative">
                        <Calendar className="h-5 w-5 text-primary-800 flex-shrink-0" />
                        <div className="flex flex-col w-full">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black leading-none mb-1">Check-in — Check-out</span>
                            <div className="flex items-center gap-2">
                                <DatePicker
                                    selected={checkIn}
                                    onChange={(date: Date | null) => setCheckIn(date)}
                                    selectsStart
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={new Date()}
                                    dateFormat="dd MMM"
                                    className="w-full bg-transparent text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none border-none p-0 focus:ring-0 cursor-pointer"
                                    placeholderText="Add dates"
                                />
                                <span className="text-gray-300">-</span>
                                <DatePicker
                                    selected={checkOut}
                                    onChange={(date: Date | null) => setCheckOut(date)}
                                    selectsEnd
                                    startDate={checkIn}
                                    endDate={checkOut}
                                    minDate={checkIn || new Date()}
                                    dateFormat="dd MMM"
                                    className="w-full bg-transparent text-sm font-semibold text-gray-900 placeholder:text-gray-400 outline-none border-none p-0 focus:ring-0 cursor-pointer"
                                    placeholderText="Add dates"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Guests Segment */}
                    <div
                        className="flex-1 px-6 flex items-center gap-3 hover:bg-gray-50 transition-all duration-300 cursor-pointer group relative overflow-visible"
                        onClick={() => setShowGuestModal(!showGuestModal)}
                    >
                        <User className="h-5 w-5 text-primary-800 flex-shrink-0" />
                        <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-black leading-none mb-1">Guests</span>
                            {isGroupBooking ? (
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-gray-900">{groupSize}</span>
                                    <span className="text-sm text-gray-600">Members</span>
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-semibold text-gray-900">{adults + children}</span>
                                    <span className="text-sm text-gray-600 truncate">Guests, {rooms} Room{rooms > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400 rotate-90 shrink-0" />

                        {/* Guest Selection Modal (Dropdown style) */}
                        {showGuestModal && (
                            <div
                                ref={guestModalRef}
                                className="absolute top-full right-0 mt-4 w-80 bg-white border border-gray-100 rounded-lg shadow-xl p-6 z-[100] animate-in fade-in slide-in-from-top-2"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="text-sm font-bold text-gray-900">Travellers</h4>
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
                                            <p className="text-sm font-bold text-gray-900">Adults</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Ages 13+</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(1, adults - 1);
                                                    setAdults(newVal);
                                                    if (isGroupBooking) setGroupSize(newVal + children);
                                                }}
                                                className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all font-bold"
                                            >-</button>
                                            <span className="w-4 text-center font-bold text-gray-900">{adults}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = adults + 1;
                                                    setAdults(newVal);
                                                    if (isGroupBooking) setGroupSize(newVal + children);
                                                }}
                                                className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all font-bold"
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Children */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">Children</p>
                                            <p className="text-xs text-gray-500 mt-0.5">Ages 2-12</p>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = Math.max(0, children - 1);
                                                    setChildren(newVal);
                                                    if (isGroupBooking) setGroupSize(adults + newVal);
                                                }}
                                                className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all font-bold"
                                            >-</button>
                                            <span className="w-4 text-center font-bold text-gray-900">{children}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newVal = children + 1;
                                                    setChildren(newVal);
                                                    if (isGroupBooking) setGroupSize(adults + newVal);
                                                }}
                                                className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all font-bold"
                                            >+</button>
                                        </div>
                                    </div>

                                    {/* Rooms */}
                                    {!isGroupBooking && (
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">Rooms</p>
                                                <p className="text-xs text-gray-500 mt-0.5">Total needed</p>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    type="button"
                                                    onClick={() => setRooms(Math.max(1, rooms - 1))}
                                                    className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all font-bold"
                                                >-</button>
                                                <span className="w-4 text-center font-bold text-gray-900">{rooms}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setRooms(rooms + 1)}
                                                    className="w-8 h-8 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-all font-bold"
                                                >+</button>
                                            </div>
                                        </div>
                                    )}

                                    {isGroupBooking && (
                                        <div className="p-3 bg-primary-50 rounded-lg border border-primary-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white">
                                                    <Users className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-bold text-primary-900">Total Group Size</span>
                                            </div>
                                            <span className="text-lg font-bold text-primary-600">{groupSize}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Submit Action */}
                <button
                    type="submit"
                    className="ml-2 bg-primary-800 text-white font-medium px-8 h-12 rounded-lg hover:bg-primary-900 transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
                >
                    <Search className="h-4 w-4" />
                    Search Stays
                </button>
            </form>
        </div>
    );
}
