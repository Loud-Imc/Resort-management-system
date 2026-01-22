import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PromoBanner() {
    return (
        <section className="relative py-24 overflow-hidden">
            {/* Background with parallax effect simulation */}
            <div className="absolute inset-0 bg-gray-900">
                <div className="absolute inset-0 bg-[url('/images/pool-promo.jpg')] bg-cover bg-center opacity-40 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-gray-900 via-gray-900/80 to-transparent"></div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-2xl">
                    <span className="inline-block py-1 px-3 rounded-full bg-primary-600 text-white text-xs font-bold tracking-wider uppercase mb-6">
                        Limited Time Offer
                    </span>
                    <h2 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight">
                        Summer Escape Package
                    </h2>
                    <p className="text-xl text-gray-200 mb-8 leading-relaxed">
                        Book 3 nights and receive a complimentary spa treatment, sunset cruise vouchers, and daily breakfast at our lakeview restaurant.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            to="/search?offer=summer2026"
                            className="inline-flex justify-center items-center gap-2 bg-white text-primary-900 px-8 py-4 rounded-full font-bold hover:bg-gray-100 transition-colors shadow-lg shadow-black/20"
                        >
                            Book This Offer
                        </Link>
                        <Link
                            to="/properties"
                            className="inline-flex justify-center items-center gap-2 border border-white/30 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-colors backdrop-blur-sm"
                        >
                            View All Properties
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
