import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Calendar, User as UserIcon, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import clsx from 'clsx';
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
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        navigate('/');
    };

    const navBg = isHome
        ? (isScrolled ? 'bg-white shadow-md' : 'bg-transparent')
        : 'bg-white shadow-sm';

    const textColor = isHome && !isScrolled
        ? 'text-white'
        : 'text-gray-700';


    const isActive = (path: string) => location.pathname === path;
    const activeClass = "text-primary-600 font-bold";

    return (
        <nav className={clsx(
            "fixed w-full z-50 transition-all duration-300",
            navBg,
            isHome && !isScrolled ? "py-6" : "py-4"
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-12">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center">
                            <img
                                src={logo}
                                alt="Route Guide"
                                className={clsx(
                                    "h-50 w-auto transition-all",
                                    isHome && !isScrolled ? "brightness-0 invert" : ""
                                )}
                            />
                        </Link>
                    </div>

                    <div className="hidden md:flex items-center space-x-8">
                        <Link
                            to="/"
                            className={clsx("hover:text-primary-600 font-medium transition-colors", isActive('/') ? activeClass : textColor)}
                        >
                            Home
                        </Link>

                        <Link
                            to="/properties"
                            className={clsx("hover:text-primary-600 font-medium transition-colors", isActive('/properties') || isActive('/search') ? activeClass : textColor)}
                        >
                            Properties
                        </Link>

                        <a
                            href="/#events"
                            className={clsx("hover:text-primary-600 font-medium transition-colors", textColor)}
                        >
                            Events
                        </a>

                        <Link
                            to="/about"
                            className={clsx("hover:text-primary-600 font-medium transition-colors", isActive('/about') ? activeClass : textColor)}
                        >
                            About
                        </Link>

                        <Link
                            to="/contact"
                            className={clsx("hover:text-primary-600 font-medium transition-colors", isActive('/contact') ? activeClass : textColor)}
                        >
                            Contact
                        </Link>

                        {user ? (
                            <div className="flex items-center gap-6">
                                <Link
                                    to="/my-bookings"
                                    className={clsx("hover:text-primary-600 font-medium transition-colors", isActive('/my-bookings') ? activeClass : textColor)}
                                >
                                    My Bookings
                                </Link>
                                <div className="flex items-center gap-4 border-l border-gray-200 pl-6">
                                    <span className={clsx("font-medium", textColor)}>
                                        Hi, {user.firstName}
                                    </span>
                                    <button
                                        onClick={handleLogout}
                                        className={clsx("p-2 rounded-full hover:bg-gray-100 transition-all", textColor)}
                                        title="Sign Out"
                                    >
                                        <LogOut className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <Link
                                to="/login"
                                className={clsx("flex items-center gap-2 font-medium hover:text-primary-600 transition-colors", textColor)}
                            >
                                <UserIcon className="h-5 w-5" />
                                Sign In
                            </Link>
                        )}

                        <Link
                            to="/properties"
                            className={clsx(
                                "px-6 py-2.5 rounded-full transition-all flex items-center gap-2 font-medium shadow-sm hover:shadow-md",
                                isHome && !isScrolled
                                    ? "bg-white text-primary-900 hover:bg-gray-100"
                                    : "bg-primary-600 text-white hover:bg-primary-700"
                            )}
                        >
                            <Calendar className="h-4 w-4" />
                            Book Now
                        </Link>
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
                        <Link
                            to="/"
                            className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                            onClick={() => setIsOpen(false)}
                        >
                            Home
                        </Link>
                        <Link
                            to="/properties"
                            className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                            onClick={() => setIsOpen(false)}
                        >
                            Properties
                        </Link>

                        {user ? (
                            <>
                                <div className="px-3 py-2 text-primary-600 font-bold border-t border-gray-50 mt-2">
                                    Hi, {user.firstName}
                                </div>
                                <Link
                                    to="/my-bookings"
                                    className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
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
                            <Link
                                to="/login"
                                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                                onClick={() => setIsOpen(false)}
                            >
                                Sign In
                            </Link>
                        )}

                        <Link
                            to="/properties"
                            className="block px-3 py-2 text-base font-medium text-primary-600 font-bold hover:bg-primary-50 rounded-md"
                            onClick={() => setIsOpen(false)}
                        >
                            Book Now
                        </Link>
                    </div>
                </div>
            )}
        </nav>
    );
}
