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
    Sun,
    Moon,
    ChevronDown,
    Building2
} from 'lucide-react';
import clsx from 'clsx';
import logo from '../assets/logo.svg';
import NotificationBell from '../components/NotificationBell';

import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '../services/bookings';

export default function DashboardLayout() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const { selectedProperty, properties, setSelectedProperty } = useProperty();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const { data: unreadCount = 0 } = useQuery({
        queryKey: ['bookings', 'unread-count', selectedProperty?.id],
        queryFn: () => bookingsService.getUnreadCount(selectedProperty?.id),
        enabled: !!selectedProperty?.id && isAuthenticated,
        refetchInterval: 30000, // Poll every 30 seconds
    });

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

    const navItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/' },

        // Only show operational links if property is approved
        ...(selectedProperty?.status === 'APPROVED' ? [
            // Bookings & Guests
            ...(hasPermission('bookings.read') ? [
                {
                    icon: Calendar,
                    label: 'Bookings',
                    path: '/bookings',
                    badge: unreadCount > 0 ? unreadCount : undefined
                },
                { icon: Users, label: 'Guests', path: '/guests' },
            ] : []),

            // Rooms
            ...(hasPermission('rooms.read') ? [
                { icon: BedDouble, label: 'Rooms', path: '/rooms' },
            ] : []),

            // Room Types
            ...(hasPermission('roomTypes.read') ? [
                { icon: BedDouble, label: 'Room Types', path: '/room-types' },
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

            // Team & Roles
            ...(hasPermission('users.read') ? [
                { icon: Users, label: 'My Team', path: '/team' },
            ] : []),

            ...(hasPermission('roles.read') ? [
                { icon: Shield, label: 'Roles', path: '/roles' },
            ] : []),

            // Reports
            ...(hasPermission('reports.viewDashboard') ? [
                { icon: PieChart, label: 'Reports', path: '/reports' }
            ] : []),
        ] : []),

        // My Property is always accessible
        { icon: Building2, label: 'My Property', path: '/my-property' },
    ];

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border fixed h-full z-10 transition-colors duration-300">
                <div className="p-6 border-b border-border">
                    <Link to="/" className="flex items-center justify-center mb-6 overflow-hidden">
                        <img
                            src={logo}
                            alt="Route Guide"
                            className="h-40 w-auto object-contain -my-16"
                        />
                    </Link>


                    {/* Property Switcher */}
                    {properties.length > 1 && (
                        <div className="relative">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                                Property
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedProperty?.id || ''}
                                    onChange={(e) => {
                                        const prop = properties.find(p => p.id === e.target.value);
                                        setSelectedProperty(prop || null);
                                    }}
                                    className="w-full p-2 pr-8 text-sm border border-border rounded-lg focus:ring-primary focus:border-primary bg-background text-foreground appearance-none cursor-pointer"
                                >
                                    {properties.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Single Property Name */}
                    {properties.length === 1 && selectedProperty && (
                        <div className="mt-1">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Property</p>
                            <p className="text-sm font-medium text-foreground truncate">{selectedProperty.name}</p>
                        </div>
                    )}
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
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
                            <span className="flex-1">{item.label}</span>
                            {item.badge !== undefined && (
                                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                    {item.badge}
                                </span>
                            )}
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
                            {user?.firstName?.charAt(0) || 'P'}
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

            {/* Mobile Header */}
            <div className="md:hidden fixed w-full bg-card border-b border-border z-20 flex items-center justify-between p-4">
                <Link to="/" className="flex items-center">
                    <img src={logo} alt="Route Guide" className="h-16 w-auto object-contain -my-4" />
                </Link>
                <div className="flex items-center gap-1">
                    <NotificationBell />
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
                                className="p-2 rounded-md hover:bg-muted text-muted-foreground"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Property Switcher in Mobile */}
                        {properties.length > 1 && (
                            <div className="px-6 py-3 border-b border-border">
                                <select
                                    value={selectedProperty?.id || ''}
                                    onChange={(e) => {
                                        const prop = properties.find(p => p.id === e.target.value);
                                        setSelectedProperty(prop || null);
                                    }}
                                    className="w-full p-2 text-sm border border-border rounded-lg bg-background text-foreground"
                                >
                                    {properties.map((p) => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {navItems.map((item) => (
                                <NavLink
                                    key={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    to={item.path}
                                    end={item.path === '/'}
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
                                    <span className="flex-1">{item.label}</span>
                                    {item.badge !== undefined && (
                                        <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                                            {item.badge}
                                        </span>
                                    )}
                                </NavLink>
                            ))}
                        </nav>
                        <div className="p-4 border-t border-border">
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
            <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
                {/* Desktop Top Header */}
                <header className="hidden md:flex items-center justify-between px-8 py-4 bg-card/50 backdrop-blur-md border-b border-border sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            {navItems.find(item => item.path === window.location.pathname)?.label || 'Overview'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <div className="h-6 w-[1px] bg-border mx-2" />
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                                {user?.firstName?.charAt(0)}
                            </div>
                            <span className="text-sm font-medium">{user?.firstName}</span>
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
