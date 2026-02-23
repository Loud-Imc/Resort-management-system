import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    ArrowLeft, CheckCircle, Maximize, BedDouble, Bath,
    Wifi, Utensils, Clock, ChevronRight, ChevronLeft,
    Star, ShieldCheck, MapPin, Building2, Loader2,
    Tv, Coffee, Waves, Trees, Sparkles, Lock,
    ConciergeBell, Ticket, Snowflake, Sunset, Mountain
} from 'lucide-react';
import { roomTypeApi } from '../services/roomTypes';
import { propertyApi } from '../services/properties';
import { useCurrency } from '../context/CurrencyContext';
import { formatPrice } from '../utils/currency';

export default function RoomDetail() {
    const { slug, roomTypeId } = useParams();
    const navigate = useNavigate();
    const { selectedCurrency, rates } = useCurrency();
    const [activeImage, setActiveImage] = useState(0);

    const { data: roomType, isLoading: loadingRoom } = useQuery({
        queryKey: ['roomType', roomTypeId],
        queryFn: () => roomTypeApi.getById(roomTypeId!),
        enabled: !!roomTypeId
    });

    const { data: property, isLoading: loadingProperty } = useQuery({
        queryKey: ['property', slug],
        queryFn: () => propertyApi.getBySlug(slug!),
        enabled: !!slug
    });

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    if (loadingRoom || loadingProperty) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-10 w-10 text-primary-600 animate-spin" />
                    <p className="text-gray-500 font-medium">Loading room details...</p>
                </div>
            </div>
        );
    }

    if (!roomType || !property) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Room not found</h1>
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-4 text-primary-600 hover:underline flex items-center gap-1 justify-center mx-auto"
                    >
                        <ArrowLeft className="h-4 w-4" /> Go back
                    </button>
                </div>
            </div>
        );
    }

    const nextImage = () => {
        if (roomType.images && roomType.images.length > 0) {
            setActiveImage((prev) => (prev + 1) % roomType.images.length);
        }
    };

    const prevImage = () => {
        if (roomType.images && roomType.images.length > 0) {
            setActiveImage((prev) => (prev - 1 + roomType.images.length) % roomType.images.length);
        }
    };

    const getFeatureIcon = (text: string) => {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('wifi') || lowerText.includes('internet')) return <Wifi className="h-4 w-4" />;
        if (lowerText.includes('breakfast') || lowerText.includes('meal') || lowerText.includes('dining') || lowerText.includes('drink')) return <Utensils className="h-4 w-4" />;
        if (lowerText.includes('tv') || lowerText.includes('led') || lowerText.includes('screen')) return <Tv className="h-4 w-4" />;
        if (lowerText.includes('coffee') || lowerText.includes('tea') || lowerText.includes('nespresso') || lowerText.includes('maker')) return <Coffee className="h-4 w-4" />;
        if (lowerText.includes('pool') || lowerText.includes('swim') || lowerText.includes('infinity')) return <Waves className="h-4 w-4" />;
        if (lowerText.includes('ac') || lowerText.includes('air conditioning')) return <Snowflake className="h-4 w-4" />;
        if (lowerText.includes('view') || lowerText.includes('mountain') || lowerText.includes('valley')) return <Mountain className="h-4 w-4" />;
        if (lowerText.includes('garden') || lowerText.includes('outdoor') || lowerText.includes('nature')) return <Trees className="h-4 w-4" />;
        if (lowerText.includes('balcony') || lowerText.includes('terrace')) return <Sunset className="h-4 w-4" />;
        if (lowerText.includes('spa') || lowerText.includes('wellness') || lowerText.includes('massage')) return <Sparkles className="h-4 w-4" />;
        if (lowerText.includes('safe') || lowerText.includes('secure') || lowerText.includes('electronic')) return <Lock className="h-4 w-4" />;
        if (lowerText.includes('butler') || lowerText.includes('service') || lowerText.includes('prive')) return <ConciergeBell className="h-4 w-4" />;
        if (lowerText.includes('voucher') || lowerText.includes('off') || lowerText.includes('discount')) return <Ticket className="h-4 w-4" />;

        return <CheckCircle className="h-4 w-4" />;
    };

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header / Breadcrumbs */}
            <div className="bg-white border-b border-gray-200 pt-20">
                <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-sm text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap">
                        <Link to="/" className="hover:text-primary-600 transition">Home</Link>
                        <ChevronRight className="h-4 w-4" />
                        <Link to="/properties" className="hover:text-primary-600 transition">Properties</Link>
                        <ChevronRight className="h-4 w-4" />
                        <Link to={`/properties/${property.slug}`} className="hover:text-primary-600 transition truncate max-w-[100px] sm:max-w-none">
                            {property.name}
                        </Link>
                        <ChevronRight className="h-4 w-4" />
                        <span className="text-gray-900 font-medium truncate">{roomType.name}</span>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-2 text-primary-600 font-semibold text-sm hover:underline"
                    >
                        <ArrowLeft className="h-4 w-4" /> Back
                    </button>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Left & Center: Gallery and Content */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Premium Gallery Section */}
                        <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                            <div className="relative aspect-[16/9] md:aspect-[21/9] bg-gray-900 group">
                                {roomType.images && roomType.images.length > 0 ? (
                                    <>
                                        <img
                                            src={roomType.images[activeImage]}
                                            alt={roomType.name}
                                            className="w-full h-full object-cover transition-opacity duration-500"
                                        />

                                        {roomType.images.length > 1 && (
                                            <>
                                                <button
                                                    onClick={prevImage}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <ChevronLeft className="h-6 w-6" />
                                                </button>
                                                <button
                                                    onClick={nextImage}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <ChevronRight className="h-6 w-6" />
                                                </button>
                                            </>
                                        )}

                                        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                                            <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 flex items-center gap-3">
                                                <div className="flex -space-x-2">
                                                    {roomType.images.slice(0, 3).map((img, i) => (
                                                        <div key={i} className="w-8 h-8 rounded-full border-2 border-white overflow-hidden">
                                                            <img src={img} alt="" className="w-full h-full object-cover" />
                                                        </div>
                                                    ))}
                                                </div>
                                                <span className="text-white text-xs font-bold uppercase tracking-wider">
                                                    {roomType.images.length} Room Photos
                                                </span>
                                            </div>

                                            <div className="flex gap-2">
                                                {roomType.images.map((_, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setActiveImage(i)}
                                                        className={`w-2 h-2 rounded-full transition-all ${activeImage === i ? 'bg-primary-500 w-6' : 'bg-white/50'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
                                        <Building2 className="h-20 w-20 opacity-20" />
                                        <p>No images available for this room</p>
                                    </div>
                                )}
                            </div>

                            {/* Thumbnail Strip */}
                            {roomType.images && roomType.images.length > 1 && (
                                <div className="p-4 border-t border-gray-100 bg-white">
                                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                                        {roomType.images.map((img, i) => (
                                            <button
                                                key={i}
                                                onClick={() => setActiveImage(i)}
                                                className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${activeImage === i ? 'border-primary-500 scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                            >
                                                <img src={img} alt="" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Title & Stats */}
                        <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-primary-600 font-bold text-xs uppercase tracking-widest">
                                        <Building2 className="h-4 w-4" />
                                        <span>Luxury Accommodation</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-4xl font-black text-gray-900 tracking-tight">
                                            {roomType.name}
                                        </h1>
                                        {roomType.marketingBadgeText && (
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg border shadow-sm ${roomType.marketingBadgeType === 'URGENT'
                                                ? 'bg-red-50 text-red-600 border-red-200 shadow-red-100/50 animate-pulse'
                                                : roomType.marketingBadgeType === 'NEUTRAL'
                                                    ? 'bg-gray-50 text-gray-600 border-gray-200'
                                                    : 'bg-green-50 text-green-600 border-green-200 shadow-green-100/50'
                                                }`}>
                                                {roomType.marketingBadgeText}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-500 text-sm font-medium pt-2">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                                            <Maximize className="h-4 w-4 text-primary-500" />
                                            <span>{roomType.size || 280} sq.ft</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                                            <BedDouble className="h-4 w-4 text-primary-500" />
                                            <span>{roomType.maxAdults} Adults</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 rounded-full">
                                            <Bath className="h-4 w-4 text-primary-500" />
                                            <span>Private Bath</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-primary-50 rounded-2xl p-6 text-right border border-primary-100">
                                    <p className="text-gray-500 text-xs font-bold uppercase mb-1">Starting from</p>
                                    <div className="flex items-baseline justify-end gap-1">
                                        <span className="text-3xl font-black text-primary-700">{formatPrice(roomType.basePrice, selectedCurrency, rates)}</span>
                                        <span className="text-gray-500 text-sm font-medium">/ night</span>
                                    </div>
                                </div>
                            </div>

                            <p className="text-gray-600 leading-relaxed text-lg italic border-l-4 border-primary-500 pl-6">
                                {roomType.description || "Experience unparalleled comfort and style in our signature accommodation, designed for discerning travelers."}
                            </p>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                            {/* Highlights & Inclusions */}
                            <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100 space-y-6">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                    <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
                                    Highlights & Inclusions
                                </h3>

                                <div className="space-y-4">
                                    {/* Cancellation Policy */}
                                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-start gap-4">
                                        <ShieldCheck className="h-6 w-6 text-green-600 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-green-900">Cancellation Policy</p>
                                            <p className="text-xs text-green-700 font-medium">
                                                {roomType.cancellationPolicy || "Free cancellation until 24 hours before check-in. Instant confirmation."}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Dynamic Inclusions */}
                                    <div className="space-y-3">
                                        {(roomType.inclusions && roomType.inclusions.length > 0) ? (
                                            roomType.inclusions.map((inclusion, idx) => (
                                                <div key={idx} className="flex items-center gap-3 text-gray-700 font-medium text-sm">
                                                    <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                                                        {getFeatureIcon(inclusion)}
                                                    </div>
                                                    {inclusion}
                                                </div>
                                            ))
                                        ) : (
                                            roomType.amenities.includes('Breakfast') && (
                                                <div className="flex items-center gap-3 text-gray-700 font-medium text-sm">
                                                    <div className="p-1.5 bg-primary-100 rounded-lg text-primary-600">
                                                        <Utensils className="h-4 w-4" />
                                                    </div>
                                                    Complimentary Buffet Breakfast
                                                </div>
                                            )
                                        )}

                                        {roomType.highlights && roomType.highlights.map((highlight, idx) => (
                                            <div key={idx} className="flex items-center gap-3 text-gray-700 font-medium text-sm">
                                                <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                                    {getFeatureIcon(highlight)}
                                                </div>
                                                {highlight}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Full Amenities */}
                            <div className="bg-white rounded-3xl shadow-sm p-8 border border-gray-100 space-y-6">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3">
                                    <Wifi className="h-6 w-6 text-primary-600" />
                                    Room Amenities
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {roomType.amenities.map((amenity, idx) => (
                                        <div key={idx} className="flex items-center gap-2.5 text-sm text-gray-600 font-medium">
                                            <CheckCircle className="h-4 w-4 text-green-500" />
                                            {amenity}
                                        </div>
                                    ))}
                                    {roomType.amenities.length === 0 && (
                                        <p className="text-gray-400 text-sm italic">Standard amenities included</p>
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right: Booking Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-24 space-y-6">

                            {/* Price & Booking Card */}
                            <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between items-baseline mb-2">
                                            <h4 className="text-gray-900 font-black text-lg">Price Details</h4>
                                            <span className="text-xs font-bold text-primary-600 uppercase tracking-wider">Best Price Match</span>
                                        </div>
                                        <div className="space-y-3 py-4 border-y border-gray-50">
                                            <div className="flex justify-between text-gray-500 text-sm font-medium">
                                                <span>Base Price (1 Night)</span>
                                                <span className="text-gray-900">{formatPrice(roomType.basePrice, selectedCurrency, rates)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-500 text-sm font-medium">
                                                <span>Taxes & Fees (12%)</span>
                                                <span className="text-gray-900">{formatPrice(Math.round(roomType.basePrice * 0.12), selectedCurrency, rates)}</span>
                                            </div>
                                            <div className="flex justify-between text-gray-900 font-black text-lg pt-2">
                                                <span>Total Amount</span>
                                                <span className="text-primary-600">{formatPrice(Math.round(roomType.basePrice * 1.12), selectedCurrency, rates)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        {roomType.marketingBadgeType === 'URGENT' ? (
                                            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                                <div className="flex gap-3">
                                                    <div className="bg-red-100 p-2 rounded-xl h-fit">
                                                        <Clock className="h-5 w-5 text-red-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-red-900 mb-0.5">Limited Time Offer</p>
                                                        <p className="text-xs text-red-700 font-medium leading-relaxed">{roomType.marketingBadgeText || "Special discount expires soon! Only 2 rooms left."}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                                <div className="flex gap-3">
                                                    <div className="bg-orange-100 p-2 rounded-xl h-fit">
                                                        <Star className="h-5 w-5 text-orange-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-black text-orange-900 mb-0.5">{roomType.marketingBadgeText || "Highly Rated"}</p>
                                                        <p className="text-xs text-orange-700 font-medium leading-relaxed">Guests love this room for its comfort and view!</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <Link
                                            to={`/book?roomId=${roomType.id}&property=${property.slug}`}
                                            className="block w-full py-5 bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white text-center font-bold rounded-2xl shadow-xl shadow-primary-500/30 transition-all transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-sm"
                                        >
                                            Complete Booking
                                        </Link>
                                    </div>

                                    <div className="pt-6 border-t border-gray-50 space-y-4">
                                        <div className="flex items-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest justify-center">
                                            <ShieldCheck className="h-4 w-4" />
                                            Safe & Secure Stay
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="text-center p-3 bg-gray-50 rounded-2xl">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-In</p>
                                                <p className="text-xs font-black text-gray-800">12:00 PM</p>
                                            </div>
                                            <div className="text-center p-3 bg-gray-50 rounded-2xl">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Check-Out</p>
                                                <p className="text-xs font-black text-gray-800">11:00 AM</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Property Mini Card */}
                            <div className="bg-gray-900 rounded-3xl p-8 text-white space-y-6">
                                <h4 className="font-black text-xl">Property Location</h4>
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="bg-white/10 p-2 rounded-xl h-fit">
                                            <MapPin className="h-5 w-5" />
                                        </div>
                                        <p className="text-sm text-gray-300 leading-relaxed font-medium">
                                            {property.address}, {property.city}
                                        </p>
                                    </div>
                                    <Link
                                        to={`/properties/${property.slug}`}
                                        className="inline-flex items-center gap-2 text-primary-400 font-bold text-sm hover:text-primary-300 transition"
                                    >
                                        Visit {property.name} <ArrowLeft className="h-4 w-4 rotate-180" />
                                    </Link>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
