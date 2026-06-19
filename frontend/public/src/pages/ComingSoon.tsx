import { useState, useEffect } from 'react';
import { Mail, Instagram, Globe, Building2, UserCheck } from 'lucide-react';
import logo from '../assets/routeguide.svg';

export default function ComingSoon() {


    // Target launch date (e.g., 60 days from now)
    const [timeLeft, setTimeLeft] = useState({
        days: 45,
        hours: 12,
        minutes: 30,
        seconds: 45
    });

    useEffect(() => {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 45); // 45 days from today
        
        const interval = setInterval(() => {
            const now = new Date().getTime();
            const difference = targetDate.getTime() - now;

            if (difference <= 0) {
                clearInterval(interval);
                return;
            }

            const d = Math.floor(difference / (1000 * 60 * 60 * 24));
            const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((difference % (1000 * 60)) / 1000);

            setTimeLeft({ days: d, hours: h, minutes: m, seconds: s });
        }, 1000);

        return () => clearInterval(interval);
    }, []);

  

    // Load URLs from environment or use local fallbacks
    const propertyRegisterUrl = `${import.meta.env.VITE_PROPERTY_URL || 'http://localhost:5175'}/register`;
    const cpRegisterUrl = `${import.meta.env.VITE_CHANNEL_PARTNER_URL || 'http://localhost:5176'}/register`;

    return (
        <div className="relative min-h-screen flex flex-col justify-between bg-slate-950 text-white overflow-hidden font-sans">
            
            {/* ─── STUNNING BACKGROUND IMAGE WITH DARK GRADIENT OVERLAYS ─── */}
            <div className="absolute inset-0 z-0">
                <img 
                    src="/images/coming_soon_bg.png" 
                    alt="Kerala Eco Resort background" 
                    className="w-full h-full object-cover opacity-40 scale-105 filter blur-[2px]"
                />
                {/* Smooth color transitions for premium atmosphere */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-slate-950/25 to-slate-950/60" />
                <div className="absolute inset-0 bg-gradient-to-r from-primary-900/10 via-transparent to-primary-950/10" />
                
                {/* Pulsing glow highlights */}
                <div className="absolute top-1/4 left-1/4 w-[30vw] h-[30vw] rounded-full bg-primary-500/10 blur-[120px] animate-pulse duration-[8000ms]" />
                <div className="absolute bottom-1/4 right-1/4 w-[25vw] h-[25vw] rounded-full bg-teal-500/10 blur-[100px] animate-pulse duration-[6000ms]" />
            </div>

            {/* ─── HEADER ─── */}
            <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-8 flex justify-between items-center shrink-0 flex-wrap gap-4">
                <div className="flex items-center">
                    <img src={logo} alt="Route Guide Logo" className="h-10 md:h-12 w-auto brightness-0 invert" />
                </div>
                <div className="flex items-center gap-3">
                    <a 
                        href={propertyRegisterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-xs font-bold text-white transition-all hover:border-primary-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <Building2 className="h-3.5 w-3.5 text-primary-400" />
                        <span>List Your Property</span>
                    </a>
                    <a 
                        href={cpRegisterUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/10 rounded-xl text-xs font-bold text-white transition-all hover:border-teal-500/40 hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <UserCheck className="h-3.5 w-3.5 text-teal-400" />
                        <span>Register as Partner</span>
                    </a>
                </div>
            </header>

            {/* ─── MAIN CONTENT ─── */}
            <main className="relative z-10 w-full max-w-4xl mx-auto px-6 py-12 flex flex-col items-center text-center flex-1 justify-center space-y-12">
                
                {/* Intro Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-xs font-semibold uppercase tracking-widest animate-fade-in">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-ping" />
                    Launching Soon Across India
                </div>

                {/* Main Headings */}
                <div className="space-y-4 max-w-2xl">
                    <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-primary-300 leading-tight">
                        Sustainable Journeys,<br />Meaningful Stays
                    </h1>
                    <p className="text-sm sm:text-base text-slate-400 font-medium leading-relaxed">
                        We are currently handpicking the finest villas, premium resorts, and eco-stays in Kerala. 
                        A curated travel ecosystem designed for the modern explorer who values nature and luxury.
                    </p>
                </div>

                {/* ─── COUNTDOWN TIMER (GLASSMORPHIC CARDS) ─── */}
                <div className="grid grid-cols-4 gap-3 sm:gap-6 max-w-md w-full">
                    {[
                        { label: 'Days', value: timeLeft.days },
                        { label: 'Hours', value: timeLeft.hours },
                        { label: 'Minutes', value: timeLeft.minutes },
                        { label: 'Seconds', value: timeLeft.seconds }
                    ].map((item, idx) => (
                        <div key={idx} className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-5 flex flex-col items-center justify-center shadow-lg relative group hover:border-primary-500/30 transition-colors">
                            <div className="absolute inset-0 bg-primary-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            <span className="text-2xl sm:text-4xl font-black text-white relative z-10 font-mono tracking-tight">
                                {String(item.value).padStart(2, '0')}
                            </span>
                            <span className="text-[10px] sm:text-xs text-primary-300/80 font-bold uppercase tracking-widest mt-1 relative z-10">
                                {item.label}
                            </span>
                        </div>
                    ))}
                </div>

        
                

            </main>

            {/* ─── FOOTER ─── */}
            <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-500 shrink-0">
                <p>© {new Date().getFullYear()} All rights Reserved by Route Guide | Develop & Designed By Loudimc.com</p>
                <div className="flex items-center gap-6">
                    <a href="https://instagram.com" className="hover:text-white transition-colors" target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4" />
                    </a>
                    <a href="mailto:info@routeguide.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                        <Mail className="h-4 w-4" /> info@routeguide.in
                    </a>
                    <a href="https://routeguide.in" className="hover:text-white transition-colors flex items-center gap-1.5">
                        <Globe className="h-4 w-4" /> routeguide.in
                    </a>
                </div>
            </footer>
        </div>
    );
}


