import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Home as HomeIcon, MapPin, Tag, Building, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import CurrencySwitcher from './CurrencySwitcher';
import logoFull from '../../assets/logo.svg';
import logoWhite from '../../assets/logo-white.svg';
import NotificationBell from '../NotificationBell';

export default function Navbar() {
    const [isOpen, setIsOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [user, setUser] = useState<any>(null);
    const location = useLocation();
    const navigate = useNavigate();
    const isHome = location.pathname === '/';

    const checkUser = () => {
        const userData = localStorage.getItem('user');
        if (userData) {
            try {
                setUser(JSON.parse(userData));
            } catch {
                setUser(null);
            }
        } else {
            setUser(null);
        }
    };

    useEffect(() => {
        checkUser();
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('storage', checkUser);
        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('storage', checkUser);
        };
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    const isLightMode = !isHome || isScrolled;

    return (
        <header className={clsx(
            "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
            isLightMode
                ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 text-gray-700"
                : "bg-black/35 backdrop-blur-md border-b border-white/10 text-white"
        )}>
            <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-10">
                <div className="flex items-center justify-between h-16 md:h-20">

                    {/* ─── LEFT WING (Exploration & Key Links) ─── */}
                    <div className="hidden lg:flex items-center space-x-6 flex-1 justify-start">
                        {!isHome && (
                            <Link
                                to="/"
                                className={clsx(
                                    "flex items-center gap-1.5 text-xs font-bold transition-colors uppercase tracking-wider",
                                    isLightMode ? "text-gray-700 hover:text-primary-700" : "text-white/90 hover:text-white"
                                )}
                            >
                                <HomeIcon className="h-4 w-4 text-primary-500" />
                                <span>Home</span>
                            </Link>
                        )}
                        <Link
                            to="/properties"
                            className={clsx(
                                "flex items-center gap-1.5 text-xs font-bold transition-colors uppercase tracking-wider",
                                isLightMode ? "text-gray-700 hover:text-primary-700" : "text-white/90 hover:text-white"
                            )}
                        >
                            <Building className="h-4 w-4 text-primary-500" />
                            <span>All Properties</span>
                        </Link>
                        <Link
                            to="/offers"
                            className={clsx(
                                "flex items-center gap-1.5 text-xs font-bold transition-colors uppercase tracking-wider",
                                isLightMode ? "text-gray-700 hover:text-primary-700" : "text-white/90 hover:text-white"
                            )}
                        >
                            <Tag className="h-4 w-4 text-emerald-400" />
                            <span>Offers & Deals</span>
                            <span className="bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">NEW</span>
                        </Link>
                        <a
                            href={`${import.meta.env.VITE_PROPERTY_URL || ''}/register`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={clsx(
                                "text-xs font-semibold transition-colors",
                                isLightMode ? "text-gray-600 hover:text-primary-700" : "text-white/70 hover:text-white"
                            )}
                        >
                            List Your Property
                        </a>
                    </div>

                    {/* Mobile Hamburger (Left on mobile) */}
                    <div className="lg:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={clsx("p-2 transition-colors cursor-pointer", isLightMode ? "text-gray-700" : "text-white")}
                            aria-label="Toggle menu"
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>

                    {/* ─── CENTER BRAND LOGO ─── */}
                    <div className="flex items-center justify-center flex-shrink-0 px-4">
                        <Link to="/" className="flex items-center group">
                            {/* Logo with O shape and Oreedu typography */}
                            <img
                                src={isLightMode ? logoFull : logoWhite}
                                alt="Oreedu"
                                className="h-9 md:h-11 w-auto transition-transform group-hover:scale-105 drop-shadow-sm"
                            />
                        </Link>
                    </div>

                    {/* ─── RIGHT WING (Utilities, Partners, Profile) ─── */}
                    <div className="hidden lg:flex items-center space-x-5 flex-1 justify-end">
                        <CurrencySwitcher />

                        <Link
                            to="/track-booking"
                            className={clsx(
                                "flex items-center gap-1.5 text-xs font-semibold transition-colors",
                                isLightMode ? "text-gray-700 hover:text-primary-700" : "text-white/80 hover:text-white"
                            )}
                        >
                            <MapPin className="h-3.5 w-3.5 opacity-60" />
                            <span>Track Booking</span>
                        </Link>

                        <a
                            href={`${import.meta.env.VITE_CHANNEL_PARTNER_URL || ''}/register`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={clsx(
                                "flex items-center gap-1 text-xs font-semibold transition-colors",
                                isLightMode ? "text-gray-700 hover:text-primary-700" : "text-white/80 hover:text-white"
                            )}
                        >
                            <Briefcase className="h-3.5 w-3.5 opacity-60" />
                            <span>Register as CP</span>
                        </a>

                        {user ? (
                            <div className={clsx("flex items-center gap-3 pl-3 border-l", isLightMode ? "border-gray-200" : "border-white/20")}>
                                <NotificationBell />
                                <Link
                                    to="/profile"
                                    className={clsx(
                                        "flex items-center gap-2 p-1 pl-2 pr-3 rounded-full transition-all text-xs font-bold",
                                        isLightMode ? "bg-primary-50 hover:bg-primary-100 text-primary-800" : "bg-white/15 hover:bg-white/25 text-white"
                                    )}
                                >
                                    {user.avatar ? (
                                        <img src={user.avatar} alt={user.firstName} className="h-7 w-7 rounded-full object-cover" />
                                    ) : (
                                        <div className="h-7 w-7 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold">
                                            {user.firstName ? user.firstName.charAt(0).toUpperCase() : <UserIcon className="h-3.5 w-3.5" />}
                                        </div>
                                    )}
                                    <span>
                                        {user.firstName ? (user.firstName.length > 10 ? `${user.firstName.substring(0, 8)}...` : user.firstName) : 'Profile'}
                                    </span>
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="p-1.5 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                                    title="Sign Out"
                                >
                                    <LogOut className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className={clsx("flex items-center gap-3 pl-3 border-l", isLightMode ? "border-gray-200" : "border-white/20")}>
                                <Link
                                    to="/login"
                                    className={clsx(
                                        "flex items-center gap-2 px-5 py-2 rounded-full font-bold text-xs tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer",
                                        isLightMode
                                            ? "bg-gradient-to-r from-primary-700 to-primary-800 hover:from-primary-800 hover:to-primary-900 text-white"
                                            : "bg-white hover:bg-gray-100 text-gray-900 shadow-md"
                                    )}
                                >
                                    <UserIcon className="h-3.5 w-3.5" />
                                    <span>SIGN IN / JOIN</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Mobile Right Utility */}
                    <div className="lg:hidden flex items-center gap-2">
                        <CurrencySwitcher />
                        {user ? (
                            <Link to="/profile" className={clsx("p-1 rounded-full", isLightMode ? "bg-primary-50 text-primary-700" : "bg-white/20 text-white")}>
                                <UserIcon className="h-5 w-5" />
                            </Link>
                        ) : (
                            <Link to="/login" className="px-3 py-1.5 rounded-full bg-primary-700 text-white text-xs font-bold">
                                Login
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* ─── MOBILE DRAWER MENU ─── */}
            {isOpen && (
                <div className="lg:hidden bg-white text-gray-800 border-t border-gray-100 shadow-2xl animate-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-5 space-y-3">
                        <Link
                            to="/properties"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-800 hover:bg-primary-50 hover:text-primary-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <Building className="h-4 w-4 text-primary-600" />
                            All Properties
                        </Link>
                        <Link
                            to="/offers"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-800 hover:bg-primary-50 hover:text-primary-700"
                            onClick={() => setIsOpen(false)}
                        >
                            <Tag className="h-4 w-4 text-emerald-600" />
                            Offers & Deals
                        </Link>
                        <Link
                            to="/track-booking"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                            onClick={() => setIsOpen(false)}
                        >
                            <MapPin className="h-4 w-4 text-gray-500" />
                            Track Booking
                        </Link>
                        <a
                            href={`${import.meta.env.VITE_PROPERTY_URL || ''}/register`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            List Your Property
                        </a>
                        <a
                            href={`${import.meta.env.VITE_CHANNEL_PARTNER_URL || ''}/register`}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50"
                        >
                            Register as CP
                        </a>
                        {user && (
                            <div className="pt-3 border-t border-gray-100">
                                <Link
                                    to="/profile"
                                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold text-primary-800 bg-primary-50"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span>My Profile</span>
                                    <NotificationBell />
                                </Link>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 rounded-xl mt-1"
                                >
                                    Sign Out
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
