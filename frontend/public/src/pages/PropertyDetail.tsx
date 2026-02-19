import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
    MapPin, Star, Phone, Mail, CheckCircle, ArrowLeft,
    Wifi, Car, Coffee, Dumbbell, Waves, Loader2,
    Building2, Users, Maximize, BedDouble, Bath, ChevronRight, Clock, Info, Utensils,
    Tv, Trees, Sparkles, Lock, ConciergeBell, Ticket, Snowflake, Sunset, Mountain,
    AlertCircle
} from 'lucide-react';
import { propertyApi } from '../services/properties';
import { bookingService } from '../services/booking';
import { Property, RoomType } from '../types';

const getFeatureIcon = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('wifi') || lowerText.includes('internet')) return <Wifi className="h-4 w-4" />;
    if (lowerText.includes('breakfast') || lowerText.includes('meal') || lowerText.includes('dining') || lowerText.includes('drink') || lowerText.includes('restaurant')) return <Utensils className="h-4 w-4" />;
    if (lowerText.includes('tv') || lowerText.includes('led') || lowerText.includes('screen')) return <Tv className="h-4 w-4" />;
    if (lowerText.includes('coffee') || lowerText.includes('tea') || lowerText.includes('nespresso') || lowerText.includes('maker')) return <Coffee className="h-4 w-4" />;
    if (lowerText.includes('pool') || lowerText.includes('swim') || lowerText.includes('infinity')) return <Waves className="h-4 w-4" />;
    if (lowerText.includes('ac') || lowerText.includes('air conditioning')) return <Snowflake className="h-4 w-4" />;
    if (lowerText.includes('view') || lowerText.includes('mountain') || lowerText.includes('valley')) return <Mountain className="h-4 w-4" />;
    if (lowerText.includes('garden') || lowerText.includes('outdoor') || lowerText.includes('nature') || lowerText.includes('tree')) return <Trees className="h-4 w-4" />;
    if (lowerText.includes('balcony') || lowerText.includes('terrace')) return <Sunset className="h-4 w-4" />;
    if (lowerText.includes('spa') || lowerText.includes('wellness') || lowerText.includes('massage')) return <Sparkles className="h-4 w-4" />;
    if (lowerText.includes('safe') || lowerText.includes('secure') || lowerText.includes('electronic') || lowerText.includes('lock')) return <Lock className="h-4 w-4" />;
    if (lowerText.includes('butler') || lowerText.includes('service') || lowerText.includes('concierge')) return <ConciergeBell className="h-4 w-4" />;
    if (lowerText.includes('voucher') || lowerText.includes('off') || lowerText.includes('discount') || lowerText.includes('ticket')) return <Ticket className="h-4 w-4" />;
    if (lowerText.includes('parking') || lowerText.includes('car')) return <Car className="h-4 w-4" />;
    if (lowerText.includes('gym') || lowerText.includes('fitness')) return <Dumbbell className="h-4 w-4" />;
    if (lowerText.includes('building')) return <Building2 className="h-4 w-4" />;
    if (lowerText.includes('user') || lowerText.includes('people')) return <Users className="h-4 w-4" />;
    if (lowerText.includes('clock') || lowerText.includes('time') || lowerText.includes('hour')) return <Clock className="h-4 w-4" />;

    return <CheckCircle className="h-4 w-4" />;
};

export default function PropertyDetail() {
    const { slug } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Booking search params
    const checkIn = searchParams.get('checkIn') || '';
    const checkOut = searchParams.get('checkOut') || '';
    const adults = searchParams.get('adults') || '2';
    const children = searchParams.get('children') || '0';

    const [property, setProperty] = useState<Property | null>(null);
    const [availability, setAvailability] = useState<RoomType[] | null>(null);
    const [, setLoadingAvailability] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            loadProperty(slug);
        }
    }, [slug]);

    // Fetch availability if dates are selected
    useEffect(() => {
        if (property && checkIn && checkOut) {
            fetchAvailability();
        }
    }, [property, checkIn, checkOut]);

    const fetchAvailability = async () => {
        try {
            setLoadingAvailability(true);
            const data = await bookingService.checkAvailability({
                checkInDate: checkIn,
                checkOutDate: checkOut,
                adults: Number(adults),
                children: Number(children),
                includeSoldOut: true
            });
            setAvailability(data.availableRoomTypes);
        } catch (err) {
            console.error('Error fetching availability:', err);
        } finally {
            setLoadingAvailability(false);
        }
    };

    const loadProperty = async (propertySlug: string) => {
        try {
            setLoading(true);
            const data = await propertyApi.getBySlug(propertySlug);
            setProperty(data);
        } catch (err: any) {
            setError(err.message || 'Property not found');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Property Not Found</h2>
                    <p className="text-gray-500 mb-6">{error || 'The property you are looking for does not exist.'}</p>
                    <Link to="/properties" className="text-primary-600 hover:text-primary-700">
                        ← Back to Properties
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-16">

            {/* Hero Image */}
            <div className="relative h-[400px] md:h-[500px]">
                {property.coverImage ? (
                    <img
                        src={property.coverImage}
                        alt={property.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <Building2 className="h-24 w-24 text-white/50" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Back Button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-24 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white transition"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                {/* Property Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
                    <div className="container mx-auto">
                        <div className="flex items-center gap-2 mb-2">
                            {property.isVerified && (
                                <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                    <CheckCircle className="h-4 w-4" />
                                    Verified
                                </span>
                            )}
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                            {property.name}
                        </h1>
                        <div className="flex flex-wrap items-center gap-4 text-white/90">
                            <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {property.city}, {property.state}
                            </span>
                            {property.rating && (
                                <span className="flex items-center gap-1">
                                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                    {property.rating} ({property.reviewCount} reviews)
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Amenities */}
                        {property.amenities.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {property.amenities.map(amenity => {
                                        return (
                                            <div key={amenity} className="flex items-center gap-3 text-gray-700">
                                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                                                    {getFeatureIcon(amenity)}
                                                </div>
                                                <span>{amenity}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* Available Accommodations */}
                        {property.roomTypes && property.roomTypes.length > 0 && (
                            <div id="accommodations" className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                                <div className="bg-gray-50/50 border-b border-gray-100 p-6">
                                    <h2 className="text-2xl font-bold text-gray-900">Available Accommodations</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {property.roomTypes.map((roomType) => {
                                        const availabilityInfo = availability?.find(a => a.id === roomType.id);

                                        // A room is "fundamentally" sold out if it has rooms defined but none are AVAILABLE
                                        const isFundamentallySoldOut = roomType.rooms && roomType.rooms.length > 0 &&
                                            roomType.rooms.every((r: any) => r.status !== 'AVAILABLE');

                                        const isSoldOut = (checkIn && checkOut)
                                            ? availabilityInfo?.isSoldOut
                                            : isFundamentallySoldOut;

                                        const availableCount = (checkIn && checkOut)
                                            ? availabilityInfo?.availableCount
                                            : roomType.rooms?.filter((r: any) => r.status === 'AVAILABLE').length;

                                        return (
                                            <div key={roomType.id} className={clsx(
                                                "p-6 hover:bg-gray-50/30 transition-colors relative",
                                                isSoldOut && "opacity-75 grayscale-[0.5]"
                                            )}>
                                                {isSoldOut && (
                                                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
                                                        <div className="bg-white/90 shadow-xl border border-rose-200 px-6 py-3 rounded-2xl flex flex-col items-center gap-1 transform -rotate-3">
                                                            <span className="text-rose-600 font-black text-xl uppercase tracking-tighter">Fully Booked</span>
                                                            <span className="text-gray-500 text-[10px] font-bold">Try different dates for this room</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                                                    {/* Left: Photos & Basic Info */}
                                                    <div className="md:col-span-1 space-y-4">
                                                        <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-sm group">
                                                            {roomType.images && roomType.images.length > 0 ? (
                                                                <img
                                                                    src={roomType.images[0]}
                                                                    alt={roomType.name}
                                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                                />
                                                            ) : (
                                                                <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                                                    <Building2 className="h-10 w-10 text-gray-300" />
                                                                </div>
                                                            )}
                                                            <Link
                                                                to={`/properties/${property.slug}/rooms/${roomType.id}`}
                                                                className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1.5 border border-white/10 hover:bg-black/80 transition-colors"
                                                            >
                                                                <span>{roomType.images?.length || 0} PHOTOS</span>
                                                                <ChevronRight className="h-2.5 w-2.5" />
                                                            </Link>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-start justify-between">
                                                                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                                                                    {roomType.name}
                                                                </h3>
                                                                {isSoldOut ? (
                                                                    <span className="bg-rose-50 text-rose-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border border-rose-200 shadow-sm shrink-0 whitespace-nowrap ml-2">
                                                                        Sold Out
                                                                    </span>
                                                                ) : roomType.marketingBadgeText && (
                                                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-md border shadow-sm shrink-0 whitespace-nowrap ml-2 ${roomType.marketingBadgeType === 'URGENT'
                                                                        ? 'bg-red-50 text-red-600 border-red-200 shadow-red-100/50'
                                                                        : roomType.marketingBadgeType === 'NEUTRAL'
                                                                            ? 'bg-gray-50 text-gray-600 border-gray-200'
                                                                            : 'bg-green-50 text-green-600 border-green-200'
                                                                        }`}>
                                                                        {roomType.marketingBadgeText}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {/* Availability Warning */}
                                                            {checkIn && checkOut && !isSoldOut && availableCount !== undefined && availableCount <= 3 && (
                                                                <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-600 uppercase tracking-tight py-1">
                                                                    <AlertCircle className="h-3 w-3 animate-pulse" />
                                                                    Only {availableCount} room{availableCount > 1 ? 's' : ''} left at this price!
                                                                </div>
                                                            )}
                                                            <div className="flex flex-col gap-2 pt-2">
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <Maximize className="h-3.5 w-3.5 text-primary-500" />
                                                                    <span>{roomType.size || 280} sq.ft (26 sq.mt)</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <BedDouble className="h-3.5 w-3.5 text-primary-500" />
                                                                    <span>{roomType.maxAdults} Adult(s) & {roomType.maxChildren} Child(ren)</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                                    <Bath className="h-3.5 w-3.5 text-primary-500" />
                                                                    <span>Private Bathroom</span>
                                                                </div>
                                                            </div>
                                                            <Link
                                                                to={`/properties/${property.slug}/rooms/${roomType.id}`}
                                                                className="text-primary-600 text-xs font-semibold hover:underline flex items-center gap-1 mt-3"
                                                            >
                                                                View Details <Info className="h-3 w-3" />
                                                            </Link>
                                                        </div>
                                                    </div>

                                                    {/* Middle: Highlights & Features */}
                                                    <div className="md:col-span-2 space-y-4 border-l border-gray-100 pl-8">
                                                        <div className="space-y-3">
                                                            <h4 className="text-sm font-bold text-gray-900 border-b border-gray-100 pb-2">Room Highlights & Inclusions</h4>
                                                            <ul className="space-y-2.5">
                                                                {/* Cancellation Policy */}
                                                                {roomType.cancellationPolicy ? (
                                                                    <li className="flex items-start gap-2.5 text-sm text-green-700 font-medium bg-green-50/50 p-2 rounded-lg border border-green-100/50">
                                                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                                                        <span>{roomType.cancellationPolicy}</span>
                                                                    </li>
                                                                ) : (
                                                                    <li className="flex items-start gap-2.5 text-sm text-gray-600">
                                                                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                                                        <span>Standard Cancellation Policy applies</span>
                                                                    </li>
                                                                )}

                                                                {/* Inclusions */}
                                                                {roomType.inclusions && roomType.inclusions.length > 0 ? (
                                                                    roomType.inclusions.map((inclusion, idx) => (
                                                                        <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-700">
                                                                            <div className="bg-primary-50 p-1.5 rounded-md text-primary-600">
                                                                                {getFeatureIcon(inclusion)}
                                                                            </div>
                                                                            <span className="pt-0.5">{inclusion}</span>
                                                                        </li>
                                                                    ))
                                                                ) : (
                                                                    roomType.amenities.includes('Breakfast') && (
                                                                        <li className="flex items-start gap-2.5 text-sm text-gray-700">
                                                                            <div className="bg-primary-50 p-1.5 rounded-md text-primary-600">
                                                                                <Utensils className="h-3.5 w-3.5" />
                                                                            </div>
                                                                            <span className="pt-0.5">Complimentary Breakfast included</span>
                                                                        </li>
                                                                    )
                                                                )}

                                                                {/* Highlights */}
                                                                {roomType.highlights && roomType.highlights.length > 0 && roomType.highlights.map((highlight, idx) => (
                                                                    <li key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                                                                        <div className="bg-blue-50 p-1.5 rounded-md text-blue-500">
                                                                            {getFeatureIcon(highlight)}
                                                                        </div>
                                                                        <span className="pt-0.5">{highlight}</span>
                                                                    </li>
                                                                ))}

                                                                {(!roomType.highlights || roomType.highlights.length === 0) && (
                                                                    <li className="flex items-start gap-2.5 text-sm text-gray-600">
                                                                        <div className="bg-blue-50 p-1 rounded-md">
                                                                            <Clock className="h-3 w-3 text-blue-500 shrink-0" />
                                                                        </div>
                                                                        <span>Early Check-In (subject to availability)</span>
                                                                    </li>
                                                                )}
                                                            </ul>
                                                        </div>

                                                        <div className="pt-4 mt-4 border-t border-dashed border-gray-100">
                                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                                                                {roomType.amenities.slice(0, 6).map((amenity) => (
                                                                    <div key={amenity} className="flex items-center gap-2 text-[11px] text-gray-500">
                                                                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                                                                        {amenity}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Right: Pricing & CTA */}
                                                    <div className="md:col-span-1 border-l border-gray-100 pl-8 flex flex-col justify-between">
                                                        <div className="text-right space-y-1">
                                                            {roomType.offers && roomType.offers.length > 0 ? (
                                                                <>
                                                                    <div className="text-gray-400 text-xs line-through decoration-red-400">
                                                                        ₹{roomType.basePrice.toLocaleString()}
                                                                    </div>
                                                                    <div className="text-3xl font-black text-gray-900">
                                                                        ₹{Math.round(roomType.basePrice * (1 - Number(roomType.offers[0].discountPercentage) / 100)).toLocaleString()}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="text-gray-400 text-xs line-through decoration-gray-300">
                                                                        ₹{Math.round(roomType.basePrice * 1.25).toLocaleString()}
                                                                    </div>
                                                                    <div className="text-3xl font-black text-gray-900">
                                                                        ₹{roomType.basePrice.toLocaleString()}
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="text-[10px] text-gray-500 font-medium">
                                                                + ₹{Math.round(roomType.basePrice * 0.12).toLocaleString()} Taxes & fees / night
                                                            </div>
                                                        </div>

                                                        <div className="space-y-3 mt-8">
                                                            {roomType.offers && roomType.offers.length > 0 ? (
                                                                <div className="bg-orange-50 text-orange-700 p-3 rounded-lg border border-orange-100">
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Limited Time Deal</p>
                                                                    <p className="text-[11px] leading-snug">Save {roomType.offers[0].discountPercentage}% with this special offer!</p>
                                                                </div>
                                                            ) : roomType.marketingBadgeText ? (
                                                                <div className="bg-primary-50 text-primary-700 p-3 rounded-lg border border-primary-100">
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1">{roomType.marketingBadgeType || 'Member Benefit'}</p>
                                                                    <p className="text-[11px] leading-snug">{roomType.marketingBadgeText}</p>
                                                                </div>
                                                            ) : (
                                                                <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-100">
                                                                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1">Best Value</p>
                                                                    <p className="text-[11px] leading-snug">Lowest price guaranteed for today.</p>
                                                                </div>
                                                            )}

                                                            {isSoldOut ? (
                                                                <button
                                                                    disabled
                                                                    className="block w-full py-4 px-6 bg-gray-100 text-gray-400 text-center font-bold rounded-xl border border-gray-200 cursor-not-allowed text-sm uppercase tracking-wider"
                                                                >
                                                                    Sold Out
                                                                </button>
                                                            ) : (
                                                                <Link
                                                                    to={`/book?roomId=${roomType.id}&property=${property.slug}&checkIn=${checkIn}&checkOut=${checkOut}&adults=${adults}&children=${children}`}
                                                                    className="block w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-center font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
                                                                >
                                                                    Book Now
                                                                </Link>
                                                            )}
                                                            <p className="text-[10px] text-center text-gray-400">
                                                                Instant confirmation • Secure payment
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Gallery */}
                        {property.images.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Gallery</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {property.images.map((image, index) => (
                                        <img
                                            key={index}
                                            src={image}
                                            alt={`${property.name} ${index + 1}`}
                                            className="w-full h-40 object-cover rounded-lg"
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Description */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                            <p className="text-gray-600 leading-relaxed">
                                {property.description || 'No description available.'}
                            </p>
                        </div>
                    </div>

                    {/* Sidebar - Booking CTA */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Book Your Stay</h3>

                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Building2 className="h-5 w-5 text-primary-600" />
                                    <span>{property._count?.rooms || 0} rooms available</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Users className="h-5 w-5 text-primary-600" />
                                    <span>{property._count?.bookings || 0} bookings</span>
                                </div>
                            </div>

                            <button
                                onClick={() => document.getElementById('accommodations')?.scrollIntoView({ behavior: 'smooth' })}
                                className="block w-full py-3 bg-primary-600 text-white text-center font-semibold rounded-lg hover:bg-primary-700 transition"
                            >
                                Select a Room
                            </button>

                            {/* Contact Info */}
                            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3">
                                <a
                                    href={`tel:${property.phone}`}
                                    className="flex items-center gap-3 text-gray-600 hover:text-primary-600"
                                >
                                    <Phone className="h-5 w-5" />
                                    <span>{property.phone}</span>
                                </a>
                                <a
                                    href={`mailto:${property.email}`}
                                    className="flex items-center gap-3 text-gray-600 hover:text-primary-600"
                                >
                                    <Mail className="h-5 w-5" />
                                    <span>{property.email}</span>
                                </a>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <MapPin className="h-5 w-5" />
                                    <span className="text-sm">{property.address}, {property.city}, {property.state} {property.pincode}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
