import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProperty } from '../context/PropertyContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    Calendar,
    BedDouble,
    Users,
    CreditCard,
    DollarSign,
    LogOut,
    Menu,
    X,
    PieChart,
    Briefcase,
    Shield,
    Loader2,
    Building2,
    Ticket,
    Sun,
    Moon
} from 'lucide-react';
import clsx from 'clsx';
import logo from '../assets/routeguide.svg';

export default function DashboardLayout() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const { selectedProperty, properties, setSelectedProperty } = useProperty();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const hasPermission = (permission: string) => {
        return user?.permissions?.includes(permission) || user?.roles?.includes('SuperAdmin');
    };

    const isSuperAdmin = user?.roles?.includes('SuperAdmin');

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },

        // Properties & Management
        ...(hasPermission('properties.read') ? [
            { icon: Building2, label: isSuperAdmin ? 'All Properties' : 'Properties', path: '/properties' },
        ] : []),
        ...((isSuperAdmin || user?.roles?.includes('Admin')) ? [
            { icon: LayoutDashboard, label: 'Categories', path: '/property-categories' },
        ] : []),

        // Bookings & Rooms
        ...(hasPermission('bookings.read') ? [
            { icon: Calendar, label: 'Bookings', path: '/bookings' },
            { icon: Users, label: 'Guests', path: '/guests' },
        ] : []),

        ...(hasPermission('rooms.read') ? [
            { icon: BedDouble, label: 'Rooms', path: '/rooms' },
        ] : []),

        ...(hasPermission('roomTypes.read') ? [
            { icon: BedDouble, label: 'Room Types', path: '/room-types' },
        ] : []),

        // Events
        ...(hasPermission('events.read') ? [
            { icon: Calendar, label: 'Events', path: '/events' },
            { icon: Users, label: 'Attendees', path: '/events/bookings' },
            { icon: Shield, label: 'Check-In', path: '/events/check-in' }
        ] : []),

        // Marketing
        ...(hasPermission('marketing.read') ? [
            { icon: DollarSign, label: 'Marketing', path: '/marketing' },
            { icon: Ticket, label: 'Coupons', path: '/marketing/coupons' },
            { icon: Users, label: 'Channel Partners', path: '/channel-partners' }
        ] : []),

        // Financials
        ...(hasPermission('payments.read') ? [
            { icon: CreditCard, label: 'Payments', path: '/payments' },
        ] : []),

        ...(hasPermission('reports.viewFinancial') ? [
            { icon: DollarSign, label: 'Financials', path: '/financials' },
        ] : []),

        ...(hasPermission('bookingSources.read') ? [
            { icon: Briefcase, label: 'Sources', path: '/booking-sources' },
        ] : []),

        // User Management
        ...(hasPermission('users.read') ? [
            { icon: Users, label: isSuperAdmin ? 'Platform Users' : 'Team Accounts', path: '/users' },
        ] : []),

        ...(hasPermission('roles.read') ? [
            { icon: Shield, label: isSuperAdmin ? 'System Roles' : 'Team Roles', path: '/roles' },
        ] : []),

        // Reports
        ...(hasPermission('reports.viewDashboard') ? [
            { icon: PieChart, label: 'Reports', path: '/reports' }
        ] : []),
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border fixed h-full z-10 transition-colors duration-300">
                <div className="p-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2 mb-4">
                        <img src={logo} alt="Route Guide" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-primary italic tracking-tight">Route Guide</span>
                    </Link>

                    {properties.length > 0 && (
                        <div className="relative">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">
                                Property
                            </label>
                            <select
                                value={selectedProperty?.id || 'all'}
                                onChange={(e) => {
                                    if (e.target.value === 'all') {
                                        setSelectedProperty(null);
                                    } else {
                                        const prop = properties.find(p => p.id === e.target.value);
                                        setSelectedProperty(prop || null);
                                    }
                                }}
                                className="w-full p-2 text-sm border border-border rounded-md focus:ring-primary focus:border-primary bg-background text-foreground"
                            >
                                {(isSuperAdmin || user?.roles?.includes('Admin')) && (
                                    <option value="all">All Properties</option>
                                )}
                                {properties.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                clsx(
                                    'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                )
                            }
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={toggleTheme}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        {theme === 'light' ? (
                            <Moon className="h-5 w-5 text-indigo-500" />
                        ) : (
                            <Sun className="h-5 w-5 text-yellow-500" />
                        )}
                        {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                    </button>

                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                            {user?.firstName?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Header & Sidebar Overlay */}
            <div className="md:hidden fixed w-full bg-card border-b border-border z-20 flex items-center justify-between p-4">
                <Link to="/" className="flex items-center gap-2">
                    <img src={logo} alt="Route Guide" className="h-8 w-auto" />
                    <span className="text-lg font-bold text-primary">Route Guide</span>
                </Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-md hover:bg-muted text-foreground"
                    >
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </button>
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-2 rounded-md hover:bg-muted text-foreground"
                    >
                        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </div>
            </div>

            {/* Mobile Sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-30 md:hidden">
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-64 bg-card shadow-xl flex flex-col">
                        <div className="p-6 border-b border-border flex items-center justify-between">
                            <h1 className="text-xl font-bold text-primary">Menu</h1>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <nav className="flex-1 p-4 space-y-1">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        clsx(
                                            'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        )
                                    }
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="p-4 border-t border-gray-100">
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pt-16 md:pt-0 p-6">
                <Outlet />
            </main>
        </div>
    );
}
