import { useState, useEffect } from 'react';
import { Calendar, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import eventsService, { Event } from '../../services/events';

export default function EventsSection() {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const data = await eventsService.getAll();
                setEvents(data);
            } catch (err) {
                console.error('Failed to fetch events', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    if (loading) {
        return (
            <section id="events" className="py-20 bg-white">
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
                </div>
            </section>
        );
    }

    if (events.length === 0) {
        return null;
    }

    return (
        <section id="events" className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                    <span className="text-primary-600 font-semibold tracking-wider uppercase">Experiences</span>
                    <h2 className="text-4xl font-serif font-bold mt-2 text-gray-900">Upcoming Events</h2>
                    <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
                        Curated experiences designed to connect you with nature, culture, and yourself.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {events.map((event) => (
                        <div key={event.id} className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col relative">
                            <Link to={`/events/${event.id}`} className="absolute inset-0 z-20" aria-label={`View details for ${event.title}`} />
                            <div className="h-64 overflow-hidden relative bg-gray-200">
                                {/* Fallback pattern */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
                                    <Calendar className="h-12 w-12 text-primary-200" />
                                </div>
                                {event.images?.[0] && (
                                    <img
                                        src={event.images[0]}
                                        alt={event.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 relative z-10"
                                    />
                                )}
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur px-3 py-1 rounded-full text-xs font-bold text-primary-800 shadow-sm z-20">
                                    {new Date(event.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            <div className="p-8 flex flex-col flex-grow">
                                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                                    <MapPin className="h-4 w-4" />
                                    {event.location}
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-primary-700 transition-colors">
                                    {event.title}
                                </h3>
                                <p className="text-gray-600 mb-6 flex-grow line-clamp-2">
                                    {event.description}
                                </p>
                                <div className="flex items-center justify-between pt-6 border-t border-gray-100 mt-auto">
                                    <span className="font-bold text-primary-900">{event.price || 'Free'}</span>
                                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-1 group/btn hover:text-primary-600 transition-colors z-30 pointer-events-none">
                                        Reserve Spot <ArrowRight className="h-4 w-4 transform group-hover/btn:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center">
                    <Link to="/contact" className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 hover:text-primary-600 hover:border-primary-100 transition-all">
                        Inquire about private events
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
