import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Users, CheckCircle } from 'lucide-react';
import { Property, PropertyType } from '../types';

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
    property: Property;
}

export default function PropertyCard({ property }: PropertyCardProps) {
    const [searchParams] = useSearchParams();

    return (
        <Link
            to={`/properties/${property.slug}?${searchParams.toString()}`}
            className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1"
        >
            {/* Image Container */}
            <div className="relative h-48 overflow-hidden">
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
                <div className={`absolute top-3 left-3 px-3 py-1 rounded-full text-white text-xs font-semibold ${propertyTypeColors[property.type]}`}>
                    {propertyTypeLabels[property.type]}
                </div>

                {/* Verified Badge */}
                {property.isVerified && (
                    <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1 text-green-600 text-xs font-medium">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                    </div>
                )}

                {/* Sold Out Badge */}
                {property.isSoldOut && (
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                        <div className="bg-white/90 shadow-xl border border-rose-200 px-4 py-2 rounded-xl flex flex-col items-center gap-0.5 transform -rotate-2">
                            <span className="text-rose-600 font-black text-sm uppercase tracking-tighter">Fully Booked</span>
                            <span className="text-gray-500 text-[8px] font-bold">Try different dates</span>
                        </div>
                    </div>
                )}

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>

            {/* Content */}
            <div className="p-5">
                <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-1">
                    {property.name}
                </h3>

                <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                    <MapPin className="h-4 w-4 text-primary-500" />
                    <span className="truncate">{property.city}, {property.state}</span>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                    {/* Rating */}
                    {property.rating ? (
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            <span className="font-semibold text-gray-900">{property.rating}</span>
                            <span className="text-gray-400 text-sm">({property.reviewCount})</span>
                        </div>
                    ) : (
                        <span className="text-gray-400 text-sm">New</span>
                    )}

                    {/* Rooms */}
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                        <Users className="h-4 w-4" />
                        <span>{property._count?.rooms || 0} rooms</span>
                    </div>
                </div>
            </div>
        </Link>
    );
}
