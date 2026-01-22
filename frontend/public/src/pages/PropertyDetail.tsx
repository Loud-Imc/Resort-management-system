import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    MapPin, Star, Phone, Mail, CheckCircle, ArrowLeft,
    Wifi, Car, Coffee, Dumbbell, Waves, Loader2,
    Building2, Users
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { propertyApi } from '../services/properties';
import { Property } from '../types';

const amenityIcons: Record<string, any> = {
    WiFi: Wifi,
    Parking: Car,
    Restaurant: Coffee,
    Gym: Dumbbell,
    Pool: Waves,
};

export default function PropertyDetail() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (slug) {
            loadProperty(slug);
        }
    }, [slug]);

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
        <div className="min-h-screen bg-gray-50">
            <Navbar />

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
                        {/* Description */}
                        <div className="bg-white rounded-xl shadow-sm p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                            <p className="text-gray-600 leading-relaxed">
                                {property.description || 'No description available.'}
                            </p>
                        </div>

                        {/* Amenities */}
                        {property.amenities.length > 0 && (
                            <div className="bg-white rounded-xl shadow-sm p-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-4">Amenities</h2>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {property.amenities.map(amenity => {
                                        const Icon = amenityIcons[amenity] || CheckCircle;
                                        return (
                                            <div key={amenity} className="flex items-center gap-3 text-gray-700">
                                                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                                    <Icon className="h-5 w-5 text-primary-600" />
                                                </div>
                                                <span>{amenity}</span>
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

                            <Link
                                to={`/book?property=${property.slug}`}
                                className="block w-full py-3 bg-primary-600 text-white text-center font-semibold rounded-lg hover:bg-primary-700 transition"
                            >
                                Check Availability
                            </Link>

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

            <Footer />
        </div>
    );
}
