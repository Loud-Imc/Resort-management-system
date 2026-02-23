import { Search, Filter, X, ChevronDown, Palmtree, Hotel, Home, Coffee, Layout, Tent, Building, Globe, MapPin } from 'lucide-react';
// import { PropertyCategory } from '../types';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { propertyApi } from '../services/properties';

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

const defaultAmenities = [
    'WiFi', 'Pool', 'Restaurant', 'Spa', 'Gym', 'Parking', 'Air Conditioning'
];

interface PropertyFiltersProps {
    search: string;
    onSearchChange: (value: string) => void;
    categoryId: string;
    onCategoryChange: (id: string) => void;
    selectedAmenities: string[];
    onAmenityToggle: (amenity: string) => void;
    onApply: () => void;
    onClear: () => void;
    resultsCount?: number;
    isLoading?: boolean;
    radius?: number;
    onRadiusChange?: (radius: number) => void;
    onNearMe?: () => void;
    isNearMeActive?: boolean;
}

export default function PropertyFilters({
    search,
    onSearchChange,
    categoryId,
    onCategoryChange,
    selectedAmenities,
    onAmenityToggle,
    onApply,
    onClear,
    resultsCount,
    isLoading: isParentLoading,
    radius,
    onRadiusChange,
    onNearMe,
    isNearMeActive
}: PropertyFiltersProps) {
    const [isAmenitiesOpen, setIsAmenitiesOpen] = useState(false);
    const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);

    const { data: categories, isLoading: isCategoriesLoading } = useQuery({
        queryKey: ['property-categories'],
        queryFn: () => propertyApi.getCategories(),
    });

    const getIcon = (iconName?: string) => {
        const Icon = iconName ? ICON_MAP[iconName] : Layout;
        return Icon || Layout;
    };

    const isLoading = isParentLoading || isCategoriesLoading;

    const handleApply = () => {
        onApply();
        setIsMobileModalOpen(false);
    };

    const handleClear = () => {
        onClear();
        setIsMobileModalOpen(false);
    };

    return (
        <div className="w-full">
            {/* Mobile Trigger Button */}
            <div className="lg:hidden flex items-center gap-2">
                <button
                    onClick={() => setIsMobileModalOpen(true)}
                    className="flex-1 bg-white border border-gray-200 rounded-2xl px-5 py-3.5 flex items-center justify-between shadow-sm active:scale-[0.98] transition-all"
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-50 rounded-lg">
                            <Search className="h-4 w-4 text-primary-600" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 leading-none mb-1">Search & Filter</span>
                            <span className="text-sm font-bold text-gray-900 truncate max-w-[150px]">
                                {search || 'All Properties'}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-px h-8 bg-gray-100" />
                        <div className="relative">
                            <Filter className="h-5 w-5 text-primary-600" />
                            {(categoryId || selectedAmenities.length > 0) && (
                                <div className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary-600 rounded-full border-2 border-white" />
                            )}
                        </div>
                    </div>
                </button>
                <div className="bg-white border border-gray-200 px-4 py-3.5 rounded-2xl flex flex-col items-center justify-center min-w-[70px]">
                    <span className="text-[9px] font-black uppercase text-gray-400 leading-none mb-1">Total</span>
                    <span className="text-sm font-black text-primary-600 leading-none">{resultsCount || 0}</span>
                </div>
            </div>

            {/* Mobile Modal */}
            {isMobileModalOpen && (
                <div className="fixed inset-0 z-[100001] lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                        onClick={() => setIsMobileModalOpen(false)}
                    />
                    <div className="absolute top-0 inset-x-0 bg-white rounded-b-[2.5rem] shadow-2xl overflow-hidden animate-slide-down max-h-[92vh] flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex flex-col">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-gray-900">Filters</h3>
                                <p className="text-[10px] font-bold text-gray-400 mt-0.5">{resultsCount} properties found</p>
                            </div>
                            <button
                                onClick={() => setIsMobileModalOpen(false)}
                                className="p-2.5 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50 transition-colors"
                            >
                                <X className="h-4 w-4 text-gray-900" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                            {/* Search Input */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Keyword Search</label>
                                <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-2xl p-4 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary-500/10 transition-all">
                                    <Search className="h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => onSearchChange(e.target.value)}
                                        placeholder="Name, city or resort..."
                                        className="bg-transparent text-base font-bold text-gray-900 outline-none border-none p-0 focus:ring-0 w-full placeholder:text-gray-300"
                                    />
                                </div>
                            </div>

                            {/* Categories */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Property Category</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => onCategoryChange('')}
                                        className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${categoryId === ''
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20'
                                            : 'bg-white border-gray-100 text-gray-600'
                                            }`}
                                    >
                                        <div className={`p-2 rounded-lg ${categoryId === '' ? 'bg-white/20' : 'bg-gray-50'}`}>
                                            <Globe className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-bold">All Stays</span>
                                    </button>
                                    {categories?.map((category) => {
                                        const Icon = getIcon(category.icon);
                                        return (
                                            <button
                                                key={category.id}
                                                onClick={() => onCategoryChange(category.id)}
                                                className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${categoryId === category.id
                                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20'
                                                    : 'bg-white border-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                <div className={`p-2 rounded-lg ${categoryId === category.id ? 'bg-white/20' : 'bg-gray-50'}`}>
                                                    <Icon className="h-4 w-4" />
                                                </div>
                                                <span className="text-xs font-bold truncate">{category.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Near Me & Radius */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Location Search</label>
                                <div className="space-y-4">
                                    <button
                                        onClick={onNearMe}
                                        type="button"
                                        className={`w-full flex items-center justify-center gap-2 p-4 rounded-2xl border transition-all ${isNearMeActive
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-500/20'
                                            : 'bg-white border-gray-100 text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        <MapPin className={`h-4 w-4 ${isNearMeActive ? 'text-white' : 'text-primary-600'}`} />
                                        <span className="text-xs font-black uppercase tracking-widest">
                                            {isNearMeActive ? 'Using my location' : 'Browse Near Me'}
                                        </span>
                                    </button>

                                    {isNearMeActive && onRadiusChange && (
                                        <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Search Radius</span>
                                                <span className="text-xs font-bold text-primary-600">{radius} km</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="5"
                                                max="200"
                                                step="5"
                                                value={radius}
                                                onChange={(e) => onRadiusChange(Number(e.target.value))}
                                                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Amenities */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600">Amenities & Features</label>
                                    {selectedAmenities.length > 0 && (
                                        <button onClick={() => onAmenityToggle('CLEAR_ALL')} className="text-[9px] font-black uppercase text-red-500">Reset All</button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {defaultAmenities.map(amenity => (
                                        <button
                                            key={amenity}
                                            onClick={() => onAmenityToggle(amenity)}
                                            className={`flex items-center justify-between px-4 py-4 rounded-2xl border text-xs transition-all ${selectedAmenities.includes(amenity)
                                                ? 'bg-primary-50 border-primary-200 text-primary-700 font-bold'
                                                : 'bg-white border-gray-100 text-gray-600'
                                                }`}
                                        >
                                            {amenity}
                                            {selectedAmenities.includes(amenity) && (
                                                <div className="bg-primary-600 rounded-full p-0.5">
                                                    <X className="h-2 w-2 text-white" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex gap-3">
                            <button
                                onClick={handleClear}
                                className="flex-1 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 rounded-2xl bg-white hover:bg-gray-50 transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={handleApply}
                                className="flex-[2] bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-primary-500/20 transition-all active:scale-[0.98] uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-2"
                            >
                                <Filter className="h-4 w-4" />
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Desktop View */}
            <div className="hidden lg:block space-y-4">
                {/* Main Search and Type Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-2 flex flex-col md:flex-row items-center gap-2">
                    {/* Search Input */}
                    <div className="flex-1 w-full relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary-500 transition-colors" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Search by name, city or property..."
                            className="w-full pl-11 pr-4 py-3 bg-gray-50/50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary-500/20 transition-all outline-none"
                        />
                    </div>

                    {/* Property Type Selection */}
                    <div className="w-full md:w-auto flex items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1">
                        <button
                            onClick={() => onCategoryChange('')}
                            className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${categoryId === ''
                                ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                                }`}
                        >
                            All Stays
                        </button>
                        {categories?.map((category) => {
                            const Icon = getIcon(category.icon);
                            return (
                                <button
                                    key={category.id}
                                    onClick={() => onCategoryChange(category.id)}
                                    className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${categoryId === category.id
                                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/30'
                                        : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    <Icon className="h-3.5 w-3.5" />
                                    {category.name}
                                </button>
                            );
                        })}
                    </div>

                    {/* Radius Slider (Compact) */}
                    {isNearMeActive && (
                        <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-gray-50/50 rounded-xl border border-gray-100 min-w-[200px]">
                            <div className="flex flex-col">
                                <span className="text-[8px] font-black uppercase text-gray-400 leading-none mb-1">Radius</span>
                                <span className="text-[10px] font-bold text-primary-600 whitespace-nowrap">{radius} km</span>
                            </div>
                            <input
                                type="range"
                                min="5"
                                max="200"
                                step="5"
                                value={radius}
                                onChange={(e) => onRadiusChange?.(Number(e.target.value))}
                                className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                            />
                        </div>
                    )}

                    {/* Near Me Button */}
                    <button
                        onClick={onNearMe}
                        className={`hidden lg:flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isNearMeActive
                            ? 'bg-primary-50 text-primary-700 border-2 border-primary-600'
                            : 'bg-white text-gray-500 border border-gray-100 hover:border-gray-200'
                            }`}
                    >
                        <MapPin className="h-4 w-4" />
                        Near Me
                    </button>

                    {/* Apply Button */}
                    <button
                        onClick={onApply}
                        className="w-full md:w-auto px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-lg shadow-primary-500/20 transition-all active:scale-95"
                    >
                        Apply
                    </button>
                </div>

                {/* Amenities and Secondary Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Amenities Toggle */}
                        <div className="relative">
                            <button
                                onClick={() => setIsAmenitiesOpen(!isAmenitiesOpen)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[11px] font-bold transition-all ${selectedAmenities.length > 0 || isAmenitiesOpen
                                    ? 'border-primary-200 bg-primary-50 text-primary-700'
                                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                <Filter className="h-3.5 w-3.5" />
                                Amenities {selectedAmenities.length > 0 && `(${selectedAmenities.length})`}
                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isAmenitiesOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isAmenitiesOpen && (
                                <>
                                    <div
                                        className="fixed inset-0 z-20"
                                        onClick={() => setIsAmenitiesOpen(false)}
                                    />
                                    <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-100 p-4 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="flex items-center justify-between mb-3 border-b border-gray-50 pb-2">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Amenities</span>
                                            <button
                                                onClick={() => {
                                                    onAmenityToggle('CLEAR_ALL');
                                                    setIsAmenitiesOpen(false);
                                                }}
                                                className="text-[9px] font-black uppercase text-primary-600"
                                            >
                                                Reset
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {defaultAmenities.map(amenity => (
                                                <button
                                                    key={amenity}
                                                    onClick={() => onAmenityToggle(amenity)}
                                                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors ${selectedAmenities.includes(amenity)
                                                        ? 'bg-primary-50 text-primary-700 font-bold'
                                                        : 'hover:bg-gray-50 text-gray-600'
                                                        }`}
                                                >
                                                    {amenity}
                                                    {selectedAmenities.includes(amenity) && <X className="h-3 w-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Active Amenity Pills (Summary) */}
                        {selectedAmenities.length > 0 && (
                            <div className="hidden md:flex flex-wrap gap-1.5 animate-in fade-in slide-in-from-left-2 transition-all">
                                {selectedAmenities.slice(0, 3).map(amenity => (
                                    <span
                                        key={amenity}
                                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded-md text-[9px] font-bold flex items-center gap-1"
                                    >
                                        {amenity}
                                        <button onClick={() => onAmenityToggle(amenity)}>
                                            <X className="h-2 w-2 hover:text-red-500" />
                                        </button>
                                    </span>
                                ))}
                                {selectedAmenities.length > 3 && (
                                    <span className="text-[9px] font-bold text-gray-400 self-center">
                                        +{selectedAmenities.length - 3} more
                                    </span>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Clear All */}
                        {(search || categoryId || selectedAmenities.length > 0) && (
                            <button
                                onClick={onClear}
                                className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1.5"
                            >
                                <X className="h-3 w-3" />
                                Clear All
                            </button>
                        )}

                        {/* Results Count Wrapper */}
                        <div className="text-[11px] font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                            {isLoading ? (
                                <span className="flex items-center gap-2">
                                    <div className="h-2 w-2 bg-primary-500 rounded-full animate-pulse" />
                                    Updating...
                                </span>
                            ) : (
                                `${resultsCount || 0} Results`
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
