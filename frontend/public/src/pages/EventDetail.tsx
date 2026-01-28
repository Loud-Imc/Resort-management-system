import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    MapPin, Calendar, Clock, Tag, ArrowLeft,
    ArrowRight, Loader2, Share2, Info
} from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import eventsService, { Event } from '../services/events';

export default function EventDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (id) {
            loadEvent(id);
        }
    }, [id]);

    const loadEvent = async (eventId: string) => {
        try {
            setLoading(true);
            const data = await eventsService.getById(eventId);
            setEvent(data);
        } catch (err: any) {
            setError(err.message || 'Event not found');
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

    if (error || !event) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center px-4">
                    <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Info className="h-10 w-10 text-red-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Event Not Found</h2>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                        {error || "We couldn't find the event you're looking for. It might have been moved or removed."}
                    </p>
                    <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200">
                        <ArrowLeft className="h-4 w-4" />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const eventDate = new Date(event.date);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            {/* Hero Section */}
            <div className="relative h-[400px] md:h-[600px] w-full overflow-hidden pt-20">
                {event.images?.[0] ? (
                    <img
                        src={event.images[0]}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
                        <Calendar className="h-32 w-32 text-white/20" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-900/40 to-transparent" />

                <div className="absolute inset-0 container mx-auto px-4 flex flex-col justify-end pb-12">
                    <button
                        onClick={() => navigate(-1)}
                        className="absolute top-10 left-4 bg-white/10 backdrop-blur-md border border-white/20 p-2 rounded-full text-white hover:bg-white/20 transition-all"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>

                    <div className="max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="flex flex-wrap gap-3 mb-4">
                            <span className="bg-primary-600/90 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase">
                                {event.organizerType === 'PROPERTY' ? 'Property Event' : 'Community Event'}
                            </span>
                            <span className="bg-white/10 backdrop-blur-sm text-white px-4 py-1.5 rounded-full text-sm font-medium border border-white/20">
                                {event.price || 'Free Admission'}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">
                            {event.title}
                        </h1>
                        <div className="flex flex-wrap items-center gap-6 text-white/90">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary-400" />
                                <span className="text-lg font-medium">
                                    {eventDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-primary-400" />
                                <span className="text-lg font-medium">{event.location}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="container mx-auto px-4 py-16">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    {/* Details Column */}
                    <div className="lg:col-span-2 space-y-12">
                        <section className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-gray-100">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                                <Info className="h-6 w-6 text-primary-600" />
                                Event Overview
                            </h2>
                            <div className="prose prose-lg max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap">
                                {event.description || 'No detailed description available for this event.'}
                            </div>
                        </section>

                        {event.images && event.images.length > 1 && (
                            <section>
                                <h2 className="text-2xl font-bold text-gray-900 mb-8 px-2">Experience Gallery</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {event.images.slice(1).map((image, index) => (
                                        <div key={index} className="group overflow-hidden rounded-2xl aspect-[4/3] bg-gray-100 shadow-sm">
                                            <img
                                                src={image}
                                                alt={`${event.title} Gallery ${index + 1}`}
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Sidebar / RSVP Column */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-28 space-y-6">
                            <div className="bg-white rounded-3xl p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
                                <div className="mb-8">
                                    <div className="text-sm font-bold text-primary-600 uppercase tracking-widest mb-2">Admission</div>
                                    <div className="text-4xl font-bold text-gray-900">{event.price || 'Free'}</div>
                                </div>

                                <div className="space-y-5 mb-8">
                                    <div className="flex items-center gap-4 text-gray-700 p-3 rounded-2xl bg-gray-50">
                                        <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                            <Clock className="h-5 w-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Time</div>
                                            <div className="font-semibold">{eventDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-gray-700 p-3 rounded-2xl bg-gray-50">
                                        <div className="h-10 w-10 bg-white rounded-xl shadow-sm flex items-center justify-center">
                                            <Tag className="h-5 w-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Event At</div>
                                            <div className="font-semibold">{event.property?.name || 'External Venue'}</div>
                                        </div>
                                    </div>
                                </div>

                                <Link
                                    to={`/events/${event.id}/book`}
                                    className="block w-full py-4 bg-primary-600 text-white text-center font-bold rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-200 hover:shadow-primary-300 transform hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    Reserve Your Spot
                                </Link>

                                <button
                                    className="mt-4 w-full py-3 bg-white text-gray-700 text-center font-semibold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                                    onClick={() => {
                                        if (navigator.share) {
                                            navigator.share({
                                                title: event.title,
                                                text: event.description,
                                                url: window.location.href,
                                            });
                                        }
                                    }}
                                >
                                    <Share2 className="h-4 w-4 text-gray-400" />
                                    Share Event
                                </button>
                            </div>

                            {/* Property Link if applicable */}
                            {event.property && (
                                <div className="bg-primary-900 rounded-3xl p-8 text-white">
                                    <h3 className="text-xl font-bold mb-4">Hosted at {event.property.name}</h3>
                                    <p className="text-primary-100/80 mb-6 text-sm leading-relaxed">
                                        Experience our hospitality while attending this event. Book a room to make your visit even more memorable.
                                    </p>
                                    <Link
                                        to={`/properties/${event.propertyId}`} // Need slug really, but id works if handled
                                        className="inline-flex items-center gap-2 text-primary-300 font-bold hover:text-white transition-colors"
                                    >
                                        View Property <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Footer />
        </div>
    );
}
