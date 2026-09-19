import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Users, CheckCircle, Wallet, Sparkles } from 'lucide-react';
import { Property, PropertyType } from '../types';
import { PriceDisplay } from './common/PriceDisplay';

const propertyTypeLabels: Record<PropertyType, string> = {
    RESORT: 'Resort',
    HOMESTAY: 'Homestay',
    HOTEL: 'Hotel',
    VILLA: 'Villa',
    OTHER: 'Other',
};

const propertyTypeColors: Record<PropertyType, string> = {
    RESORT: 'bg-emerald-500',
    HOMESTAY: 'bg-blue-500',
    HOTEL: 'bg-purple-500',
    VILLA: 'bg-amber-500',
    OTHER: 'bg-gray-500',
};

interface PropertyCardProps {
    property: Property & {
        bestSolution?: any;
        nightlyPrice?: number;
        solutionsCount?: number;
    };
}

export default function PropertyCard({ property }: PropertyCardProps) {
    const [searchParams] = useSearchParams();

    return (
        <Link
            to={`/properties/${property.slug}?${searchParams.toString()}`}
            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex flex-col justify-between border border-gray-100 ring-1 ring-black/[0.04]"
        >
            <div>
                {/* Image Container */}
                <div className="relative h-52 overflow-hidden">
                    {property.coverImage ? (
                        <img
                            src={property.coverImage}
                            alt={property.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                    ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                            <span className="text-4xl text-white font-bold opacity-50">
                                {property.name.charAt(0)}
                            </span>
                        </div>
                    )}

                    {/* Type Badge */}
                    <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-white text-xs font-bold shadow-md ${propertyTypeColors[property.type]}`}>
                        {propertyTypeLabels[property.type]}
                    </div>

                    {/* Promoted Badge */}
                    {(property.isSponsored || property.isFeatured) && (
                        <div className="absolute top-12 left-3 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg flex items-center gap-1 text-yellow-400 text-[9px] font-black uppercase tracking-widest shadow-md border border-yellow-400/30">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {property.isSponsored ? 'Unique' : 'Featured'}
                        </div>
                    )}

                    {/* Verified Badge */}
                    <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
                        {property.isVerified && (
                            <div className="bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full flex items-center gap-1 text-emerald-600 text-xs font-bold shadow-sm border border-emerald-100">
                                <CheckCircle className="h-3 w-3" />
                                Verified
                            </div>
                        )}
                        {property.roomTypes?.some(rt => rt.allowPayAtProperty) && (
                            <div className="bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-700 backdrop-blur-md px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-white shadow-xl border border-white/30">
                                <Wallet className="h-3.5 w-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-wider">Pay At Property</span>
                            </div>
                        )}
                    </div>

                    {/* Sold Out Badge */}
                    {property.isSoldOut && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
                            <div className="bg-white/95 shadow-xl border border-rose-200 px-5 py-2.5 rounded-2xl flex flex-col items-center gap-0.5 transform -rotate-2">
                                <span className="text-rose-600 font-black text-sm uppercase tracking-wider">Fully Booked</span>
                                <span className="text-gray-500 text-[9px] font-bold">Try alternative dates</span>
                            </div>
                        </div>
                    )}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>

                {/* Content */}
                <div className="p-5 space-y-3">
                    <div>
                        <h3 className="text-lg font-black text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                            {property.name}
                        </h3>

                        <div className="flex items-center gap-1.5 text-gray-500 text-xs mt-1 font-medium">
                            <MapPin className="h-3.5 w-3.5 text-primary-500 shrink-0" />
                            <span className="truncate">{property.city}, {property.state}</span>
                        </div>
                    </div>

                    {/* Smart Accommodation Package Match Highlight */}
                    {property.bestSolution && (
                        <div className="p-3 bg-primary-50/90 rounded-2xl border border-primary-200/60 space-y-1.5">
                            <div className="flex items-center justify-between text-[10px] font-black text-primary-700 uppercase tracking-wider">
                                <span className="flex items-center gap-1">
                                    <Sparkles className="h-3.5 w-3.5 text-primary-600" />
                                    {property.bestSolution.isRecommended ? 'Best Value Solution' : 'Available Package'}
                                </span>
                                <span>{property.bestSolution.totalRooms} {property.bestSolution.totalRooms === 1 ? 'Room' : 'Rooms'}</span>
                            </div>
                            <p className="text-xs font-bold text-gray-800 line-clamp-1">
                                {property.bestSolution.rooms?.map((r: any) => `${r.roomTypeName} (${r.adults}A${r.children > 0 ? `, ${r.children}C` : ''})`).join(' + ')}
                            </p>
                        </div>
                    )}

                    {/* Stats Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        {/* Rating */}
                        <div className="flex items-center gap-1.5">
                            <div className="flex items-center">
                                {[1, 2, 3, 4, 5].map((star) => {
                                    const rating = Number(property.rating) || 0;
                                    const isFilled = star <= Math.round(rating);
                                    return (
                                        <Star
                                            key={star}
                                            className={`h-3 w-3 ${
                                                isFilled
                                                    ? 'text-amber-400 fill-amber-400'
                                                    : 'text-gray-200 fill-gray-200'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                            {property.rating ? (
                                <div className="flex items-center gap-1">
                                    <span className="font-bold text-gray-900 text-xs">{property.rating}</span>
                                    <span className="text-gray-400 text-[10px]">({property.reviewCount})</span>
                                </div>
                            ) : (
                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-tighter">New</span>
                            )}
                        </div>

                        {/* Rooms */}
                        <div className="flex items-center gap-1 text-gray-500 text-xs font-semibold">
                            <Users className="h-3.5 w-3.5" />
                            <span>{property._count?.rooms || 0} rooms</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Price & CTA Footer */}
            <div className="px-5 pb-5 pt-2 border-t border-gray-100 flex items-end justify-between gap-2">
                <div>
                    {property.minPrice || property.nightlyPrice ? (
                        <>
                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider mb-0.5">
                                {property.bestSolution ? 'Package Starting At' : 'Starting From'}
                            </p>
                            <div className="flex items-baseline gap-1">
                                <PriceDisplay 
                                    amount={property.nightlyPrice || property.minPrice || 0} 
                                    className="text-xl font-black text-gray-900" 
                                />
                                <span className="text-[10px] text-gray-500 font-bold">
                                    / night
                                </span>
                            </div>
                        </>
                    ) : (
                        <div className="pb-1">
                            <span className="text-[10px] text-primary-600 font-black uppercase tracking-wider bg-primary-50 px-2.5 py-1 rounded-lg">
                                Check Dates
                            </span>
                        </div>
                    )}
                </div>

                <div className="px-4 py-2 bg-gray-900 hover:bg-primary-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-colors shadow-sm">
                    View Packages
                </div>
            </div>
        </Link>
    );
}
