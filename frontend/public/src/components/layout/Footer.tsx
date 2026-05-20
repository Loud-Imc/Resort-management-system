import { useState } from 'react';
import { Facebook, Instagram, Twitter, Youtube, Send } from 'lucide-react';
import logo from '../../assets/routeguide.svg';

export default function Footer() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email) { setSubscribed(true); setEmail(''); }
    };

    return (
        <>
            {/* Promo Section above Footer */}
            <div className="relative bg-white pt-6 pb-12 text-left border-t border-gray-100 overflow-hidden">
                <div
                    className="absolute inset-0 z-0 opacity-20"
                    style={{ backgroundImage: "url('/images/hero-slide-2.png')", backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }}
                />
                <div className="relative z-10 max-w-[1500px] mx-auto px-4 md:px-12">
                    <h2 className="text-[32px] md:text-[64px] font-black text-gray-600 tracking-tight leading-[1] mb-6">
                        Love Yourself... <br /> Explore the World!!
                    </h2>
                    <div className="flex items-center justify-start gap-2 text-gray-500 font-bold text-sm md:text-base">
                        <span>Crafted with</span>
                        <span className="text-red-500 text-lg animate-pulse">❤️</span>
                        <span>LoudIMC</span>
                    </div>
                </div>
            </div>

            <footer className="bg-gray-950 text-white pt-12 pb-6" id="contact">
                <div className="max-w-[1500px] mx-auto px-4 sm:px-6 lg:px-12">

                    {/* Main 3-column layout */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center mb-10">

                        {/* Left — Quick links / tagline */}
                        <div className="flex flex-col gap-4 md:items-start items-center text-center md:text-left">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary-400">Explore</p>
                            <ul className="space-y-3">
                                {[
                                    { label: 'Home', href: '/' },
                                    { label: 'Resorts', href: '/properties' },
                                    { label: 'About Us', href: '/about' },
                                    { label: 'Track My Booking', href: '/track-booking' },
                                    { label: 'Contact', href: '/contact' },
                                    { label: 'List Your Property', href: 'http://localhost:5175/register', highlight: true },
                                ].map(link => (
                                    <li key={link.label}>
                                        <a
                                            href={link.href}
                                            target={link.href.startsWith('http') ? '_blank' : undefined}
                                            rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                                            className={`text-sm font-medium transition-colors ${link.highlight ? 'text-primary-400 hover:text-primary-300 font-bold' : 'text-gray-400 hover:text-white'}`}
                                        >
                                            {link.label}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Center — Logo + Social */}
                        <div className="flex flex-col items-center gap-4">
                            <img
                                src={logo}
                                alt="Route Guide"
                                className="h-12 w-auto brightness-0 invert opacity-90"
                            />
                            <div className="flex items-center gap-4">
                                {[
                                    { Icon: Facebook, href: '#', label: 'Facebook' },
                                    { Icon: Instagram, href: '#', label: 'Instagram' },
                                    { Icon: Twitter, href: '#', label: 'Twitter' },
                                    { Icon: Youtube, href: '#', label: 'YouTube' },
                                ].map(({ Icon, href, label }) => (
                                    <a
                                        key={label}
                                        href={href}
                                        aria-label={label}
                                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-primary-600/80 hover:border-primary-500 transition-all duration-300"
                                    >
                                        <Icon className="h-4 w-4" />
                                    </a>
                                ))}
                            </div>
                        </div>

                        {/* Right — Newsletter */}
                        <div className="flex flex-col gap-4 md:items-end items-center text-center md:text-right">
                            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-primary-400">Newsletter</p>
                            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
                                Get exclusive deals and travel inspiration straight to your inbox.
                            </p>
                            {subscribed ? (
                                <p className="text-primary-400 text-sm font-bold">✓ You're subscribed!</p>
                            ) : (
                                <form onSubmit={handleSubscribe} className="flex gap-2 w-full max-w-xs">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Your email address"
                                        required
                                        className="flex-1 bg-white/5 border border-white/10 text-white text-sm px-4 py-2.5 rounded-xl placeholder:text-gray-500 focus:outline-none focus:border-primary-500 transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-primary-600 hover:bg-primary-500 text-white px-3 py-2.5 rounded-xl transition-colors flex items-center justify-center"
                                    >
                                        <Send className="h-4 w-4" />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Bottom bar */}
                    <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-600 text-[10px]">
                        <p>© {new Date().getFullYear()} All rights Reserved by Route Guide | Develop & Designed By Loudimc.com</p>
                        <div className="flex gap-4">
                            <a href="/terms" className="hover:text-gray-400 transition-colors">Terms & Conditions</a>
                            <a href="/privacy" className="hover:text-gray-400 transition-colors">Privacy Policy</a>
                        </div>
                    </div>
                </div>
            </footer>
        </>
    );
}
