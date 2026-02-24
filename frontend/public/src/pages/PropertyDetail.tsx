import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { clsx } from 'clsx';
import {
    MapPin, Star, Phone, Mail, CheckCircle, ArrowLeft,
    Wifi, Car, Coffee, Dumbbell, Waves, Loader2,
    Building2, Users, Maximize, BedDouble, Bath, ChevronRight, Clock, Info, Utensils,
    Tv, Trees, Sparkles, Lock, ConciergeBell, Ticket, Snowflake, Sunset, Mountain,
    AlertCircle, Calendar
} from 'lucide-react';
import { propertyApi } from '../services/properties';
import { bookingService } from '../services/booking';
import { Property, RoomType } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { formatPrice } from '../utils/currency';
import DatePicker from 'react-datepicker';
import { format, addDays } from 'date-fns';
import "react-datepicker/dist/react-datepicker.css";

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
    const { selectedCurrency, rates } = useCurrency();
    const pickerRef = useRef<HTMLDivElement>(null);

    // Booking state
    const [checkIn, setCheckIn] = useState<Date | null>(() => {
        const param = searchParams.get('checkIn');
        return param ? new Date(param) : null;
    });
    const [checkOut, setCheckOut] = useState<Date | null>(() => {
        const param = searchParams.get('checkOut');
        return param ? new Date(param) : null;
    });
    const [adults, setAdults] = useState(Number(searchParams.get('adults')) || 2);
    const [children, setChildren] = useState(Number(searchParams.get('children')) || 0);

    const [property, setProperty] = useState<Property | null>(null);
    const [availability, setAvailability] = useState<RoomType[] | null>(null);
    const [loadingAvailability, setLoadingAvailability] = useState(false);
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
        if (!checkIn || !checkOut) return;
        try {
            setLoadingAvailability(true);
            const data = await bookingService.checkAvailability({
                checkInDate: checkIn.toISOString(),
                checkOutDate: checkOut.toISOString(),
                adults,
                children,
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Property not found');
        } finally {
            setLoading(false);
        }
    };

    const handleBookNowValidation = (e: React.MouseEvent) => {
        if (!checkIn || !checkOut) {
            e.preventDefault();
            pickerRef.current?.scrollIntoView({ behavior: 'smooth' });
            // Highlight picker
            pickerRef.current?.classList.add('ring-4', 'ring-primary-500/30', 'bg-primary-50/50');
            setTimeout(() => {
                pickerRef.current?.classList.remove('ring-4', 'ring-primary-500/30', 'bg-primary-50/50');
            }, 2000);
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
        <div className="min-h-screen bg-gray-50 pt-16 pb-24 lg:pb-0">

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
                                                                        {formatPrice(roomType.basePrice, selectedCurrency, rates)}
                                                                    </div>
                                                                    <div className="text-3xl font-black text-gray-900">
                                                                        {formatPrice(Math.round(roomType.basePrice * (1 - Number(roomType.offers[0].discountPercentage) / 100)), selectedCurrency, rates)}
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <div className="text-gray-400 text-xs line-through decoration-gray-300">
                                                                        {formatPrice(Math.round(roomType.basePrice * 1.25), selectedCurrency, rates)}
                                                                    </div>
                                                                    <div className="text-3xl font-black text-gray-900">
                                                                        {formatPrice(roomType.basePrice, selectedCurrency, rates)}
                                                                    </div>
                                                                </>
                                                            )}
                                                            <div className="text-[10px] text-gray-500 font-medium">
                                                                + {formatPrice(Math.round(roomType.basePrice * 0.12), selectedCurrency, rates)} Taxes & fees / night
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
                                                                    onClick={handleBookNowValidation}
                                                                    to={checkIn && checkOut ? `/book?roomId=${roomType.id}&property=${property.slug}&checkIn=${checkIn.toISOString()}&checkOut=${checkOut.toISOString()}&adults=${adults}&children=${children}` : '#'}
                                                                    className="block w-full py-4 px-6 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-center font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all transform hover:-translate-y-0.5 active:scale-95 text-sm uppercase tracking-wider"
                                                                >
                                                                    {(!checkIn || !checkOut) ? 'Select Dates' : 'Book Now'}
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

                        {/* Location / Map */}
                        <div className="bg-white rounded-xl shadow-sm p-6 overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900">Location</h2>
                                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {property.city}, {property.state}
                                </span>
                            </div>

                            <div className="mb-6">
                                <p className="text-sm text-gray-700 font-medium mb-1">Address</p>
                                <p className="text-sm text-gray-500 leading-relaxed">
                                    {property.address}<br />
                                    {property.city}, {property.state} - {property.pincode || '673121'}<br />
                                    {property.country}
                                </p>
                            </div>

                            {property.latitude && property.longitude ? (
                                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-inner h-[350px] relative bg-gray-50 group">
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        loading="lazy"
                                        allowFullScreen
                                        referrerPolicy="no-referrer-when-downgrade"
                                        src={`https://www.google.com/maps/embed/v1/place?key=REPLACE_WITH_GOOGLE_MAPS_API_KEY&q=${property.latitude},${property.longitude}&zoom=15`}
                                    // Since I don't have an API key, I'll use the search embed which works without key (mostly, or can use the public URL)
                                    />
                                    {/* Fallback using open-embed if API key is not available */}
                                    <iframe
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0, position: 'absolute', top: 0, left: 0 }}
                                        src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                                        title="Property Location"
                                    ></iframe>
                                    <div className="absolute bottom-4 right-4 z-10 flex gap-2">
                                        <a
                                            href={`https://www.google.com/maps/dir/?api=1&destination=${property.latitude},${property.longitude}`}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="bg-white px-4 py-2 rounded-lg shadow-lg text-xs font-bold text-primary-600 flex items-center gap-2 hover:bg-primary-50 transition-colors"
                                        >
                                            Get Directions
                                            <ChevronRight className="h-3 w-3" />
                                        </a>
                                    </div>
                                </div>
                            ) : (
                                <div className="rounded-xl overflow-hidden border border-gray-100 shadow-inner h-[250px] flex flex-col items-center justify-center bg-gray-50 text-gray-400">
                                    <MapPin className="h-10 w-10 mb-2 opacity-20" />
                                    <p className="text-sm font-medium">Exact location coordinates not available</p>
                                    <p className="text-[11px]">Contact the property for precise directions</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar - Booking CTA */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sticky top-24">
                            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary-500" />
                                Perfect Stay Starts Here
                            </h3>

                            <div ref={pickerRef} id="stay-selection" className="space-y-5 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 transition-all duration-300">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Check In & Out</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
                                            <DatePicker
                                                selected={checkIn}
                                                onChange={(date: Date | null) => setCheckIn(date)}
                                                selectsStart
                                                startDate={checkIn}
                                                endDate={checkOut}
                                                minDate={new Date()}
                                                placeholderText="Check In"
                                                className="w-full pl-9 pr-2 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20"
                                            />
                                        </div>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
                                            <DatePicker
                                                selected={checkOut}
                                                onChange={(date: Date | null) => setCheckOut(date)}
                                                selectsEnd
                                                startDate={checkIn}
                                                endDate={checkOut}
                                                minDate={checkIn ? addDays(checkIn, 1) : addDays(new Date(), 1)}
                                                placeholderText="Check Out"
                                                className="w-full pl-9 pr-2 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 px-1">Guests</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                            <select
                                                value={adults}
                                                onChange={(e) => setAdults(Number(e.target.value))}
                                                className="w-full pl-9 pr-2 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none"
                                            >
                                                {[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} Adults</option>)}
                                            </select>
                                        </div>
                                        <div className="flex-1 relative">
                                            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                            <select
                                                value={children}
                                                onChange={(e) => setChildren(Number(e.target.value))}
                                                className="w-full pl-9 pr-2 py-3 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-900 outline-none focus:ring-2 focus:ring-primary-500/20 appearance-none"
                                            >
                                                {[0, 1, 2, 3, 4].map(n => <option key={n} value={n}>{n} Children</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {loadingAvailability && (
                                    <div className="flex items-center justify-center py-2 animate-in fade-in slide-in-from-top-1">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-600" />
                                        <span className="ml-2 text-[9px] font-black text-primary-600 uppercase tracking-widest">Updating Availability...</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => {
                                    if (!checkIn || !checkOut) {
                                        pickerRef.current?.scrollIntoView({ behavior: 'smooth' });
                                    } else {
                                        document.getElementById('accommodations')?.scrollIntoView({ behavior: 'smooth' });
                                    }
                                }}
                                className="block w-full py-4 mt-6 bg-primary-600 text-white text-center font-black rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/30 uppercase tracking-[0.2em] text-xs active:scale-95 transform duration-200"
                            >
                                {(!checkIn || !checkOut) ? 'Select Dates to View Price' : 'See Remaining Rooms'}
                            </button>

                            {/* Contact Info */}
                            <div className="mt-8 pt-6 border-t border-gray-100 space-y-4">
                                <a
                                    href={`tel:${property.phone}`}
                                    className="flex items-center gap-3 text-gray-600 hover:text-primary-600 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary-50">
                                        <Phone className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium">{property.phone}</span>
                                </a>
                                <a
                                    href={`mailto:${property.email}`}
                                    className="flex items-center gap-3 text-gray-600 hover:text-primary-600 transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary-50">
                                        <Mail className="h-4 w-4" />
                                    </div>
                                    <span className="text-sm font-medium">{property.email}</span>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Sticky Selection Bar */}
            {!checkIn || !checkOut ? (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-50 animate-in slide-in-from-bottom-full duration-500">
                    <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Reservation Info</p>
                            <p className="text-xs text-gray-500 font-bold leading-tight">Select check-in/out dates to unlock availability.</p>
                        </div>
                        <button
                            onClick={() => pickerRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-6 py-3 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary-500/20 active:scale-95"
                        >
                            Pick Dates
                        </button>
                    </div>
                </div>
            ) : (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 p-4 shadow-[0_-8px_30px_rgb(0,0,0,0.12)] z-50">
                    <div className="flex items-center justify-between gap-4 max-w-lg mx-auto">
                        <div className="flex-1">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mb-1">Your Selected Stay</p>
                            <div className="flex items-center gap-2 text-xs font-bold text-gray-900">
                                <span>{format(checkIn, 'MMM dd')} - {format(checkOut, 'MMM dd')}</span>
                                <span className="text-gray-300">•</span>
                                <span>{adults} Guests</span>
                            </div>
                        </div>
                        <button
                            onClick={() => document.getElementById('accommodations')?.scrollIntoView({ behavior: 'smooth' })}
                            className="px-6 py-3 bg-primary-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary-500/20 active:scale-95"
                        >
                            See Rooms
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
