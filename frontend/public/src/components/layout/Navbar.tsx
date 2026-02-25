import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User as UserIcon, LogOut, Home as HomeIcon } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import CurrencySwitcher from './CurrencySwitcher';
import logo from '../../assets/routeguide.svg';

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
            setUser(JSON.parse(userData));
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
        }
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    const navBg = isHome
        ? (isScrolled ? 'bg-white/20 backdrop-blur-lg shadow-md' : 'bg-transparent')
        : 'bg-white/20 backdrop-blur-lg shadow-sm';

    const textColor = isHome && !isScrolled
        ? 'text-white'
        : 'text-gray-700';

    return (
        <nav className={clsx(
            "fixed w-full z-50 transition-all duration-300",
            navBg,
            isHome && !isScrolled ? "py-6" : "py-1"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 md:h-20">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center">
                            <img
                                src={logo}
                                alt="Route Guide"
                                className={clsx(
                                    "h-40 md:h-50 w-auto transition-all ",
                                    isHome && !isScrolled ? "brightness-0 invert" : ""
                                )}
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-6">
                        <CurrencySwitcher />
                        {!isHome && (
                            <Link
                                to="/"
                                className={clsx("flex items-center gap-2 font-medium hover:text-primary-600 transition-colors mr-2", textColor)}
                            >
                                <HomeIcon className="h-5 w-5" />
                                Home
                            </Link>
                        )}

                        {user ? (
                            <div className="flex items-center gap-6">
                                <div className="flex items-center gap-4 border-r border-gray-200 pr-6">
                                    <span className={clsx("font-medium", textColor)}>
                                        Hi, {user.firstName}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className={clsx("p-2 rounded-full hover:bg-gray-100/10 transition-all", textColor)}
                                        title="Sign Out"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                                <Link
                                    to="/my-bookings"
                                    className={clsx(
                                        "px-8 py-2.5 rounded-full transition-all flex items-center gap-2 font-bold shadow-sm hover:shadow-md",
                                        isHome && !isScrolled
                                            ? "bg-white text-primary-900 hover:bg-gray-100"
                                            : "bg-primary-600 text-white hover:bg-primary-700"
                                    )}
                                >
                                    My Bookings
                                </Link>
                            </div>
                        ) : (
                            <div className="flex items-center gap-6">
                                <Link
                                    to="/login"
                                    className={clsx("flex items-center gap-2 font-semibold hover:text-primary-600 transition-colors", textColor)}
                                >
                                    <UserIcon className="h-5 w-5" />
                                    Sign In
                                </Link>
                                <Link
                                    to="/properties"
                                    className={clsx(
                                        "px-8 py-2.5 rounded-full transition-all flex items-center gap-2 font-bold shadow-sm hover:shadow-md",
                                        isHome && !isScrolled
                                            ? "bg-white text-primary-900 hover:bg-gray-100"
                                            : "bg-primary-600 text-white hover:bg-primary-700"
                                    )}
                                >
                                    Book Now
                                </Link>
                                <a
                                    href={`${import.meta.env.VITE_PROPERTY_URL}/register`}

                                    className={clsx("font-semibold hover:text-primary-600 transition-colors", textColor)}
                                >
                                    Register your property
                                </a>
                                <a
                                    href={`${import.meta.env.VITE_CHANNEL_PARTNER_URL}/register`}

                                    className={clsx("font-semibold hover:text-primary-600 transition-colors", textColor)}
                                >
                                    Register as CP
                                </a>
                            </div>
                        )}
                    </div>

                    <div className="md:hidden flex items-center">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            className={clsx("p-2 transition-colors", textColor)}
                        >
                            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile menu */}
            {isOpen && (
                <div className="md:hidden bg-white border-t border-gray-100 absolute w-full shadow-xl">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {!isHome && (
                            <Link
                                to="/"
                                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md flex items-center gap-2"
                                onClick={() => setIsOpen(false)}
                            >
                                <HomeIcon className="h-5 w-5" />
                                Home
                            </Link>
                        )}

                        {user ? (
                            <>
                                <div className="px-3 py-2 text-primary-600 font-bold border-t border-gray-50 mt-2">
                                    Hi, {user.firstName}
                                </div>
                                <Link
                                    to="/my-bookings"
                                    className="block px-3 py-2 text-base font-medium text-primary-600 font-bold hover:bg-primary-50 rounded-md"
                                    onClick={() => setIsOpen(false)}
                                >
                                    My Bookings
                                </Link>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left block px-3 py-2 text-base font-medium text-red-600 hover:bg-red-50 rounded-md"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    to="/login"
                                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Sign In
                                </Link>
                                <Link
                                    to="/properties"
                                    className="block px-3 py-2 text-base font-medium text-primary-600 font-bold hover:bg-primary-50 rounded-md"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Book Now
                                </Link>
                                <a
                                    href={`${import.meta.env.VITE_PROPERTY_URL}/register`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Partner with Us
                                </a>
                                <a
                                    href={`${import.meta.env.VITE_CHANNEL_PARTNER_URL}/register`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                                    onClick={() => setIsOpen(false)}
                                >
                                    Register as CP
                                </a>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}
