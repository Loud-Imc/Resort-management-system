import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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
    Building2
} from 'lucide-react';
import clsx from 'clsx';
import logo from '../assets/routeguide.svg';

export default function DashboardLayout() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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

        // Marketing
        ...((hasPermission('marketing.view') || user?.roles?.includes('Marketing')) ? [
            { icon: DollarSign, label: 'Marketing', path: '/marketing' }
        ] : []),

        // Properties
        ...(hasPermission('properties.view') ? [
            { icon: Building2, label: 'Properties', path: '/properties' }
        ] : []),

        // Bookings
        ...(hasPermission('bookings.view') ? [
            { icon: Calendar, label: 'Bookings', path: '/bookings' }
        ] : []),

        // Rooms
        ...(hasPermission('rooms.view') ? [
            { icon: BedDouble, label: 'Rooms', path: '/rooms' }
        ] : []),

        // Room Types
        ...(hasPermission('roomTypes.view') ? [
            { icon: BedDouble, label: 'Room Types', path: '/room-types' }
        ] : []),

        // Users
        ...(hasPermission('users.view') ? [
            { icon: Users, label: 'Users', path: '/users' }
        ] : []),

        // Guests (Assuming Booking View permission)
        ...(hasPermission('bookings.view') ? [
            { icon: Users, label: 'Guests', path: '/guests' }
        ] : []),

        // Roles (Assuming User Manage permission)
        ...(hasPermission('users.manage') ? [
            { icon: Shield, label: 'Roles', path: '/roles' }
        ] : []),

        // Payments
        ...(hasPermission('payments.view') ? [
            { icon: CreditCard, label: 'Payments', path: '/payments' }
        ] : []),

        // Financials
        ...(hasPermission('financials.view') ? [
            { icon: DollarSign, label: 'Financials', path: '/financials' }
        ] : []),

        // Sources (Settings)
        ...(hasPermission('settings.view') ? [
            { icon: Briefcase, label: 'Sources', path: '/booking-sources' }
        ] : []),

        // Reports
        ...(hasPermission('reports.view') ? [
            { icon: PieChart, label: 'Reports', path: '/reports' }
        ] : []),

        // Channel Partners (Marketing)
        ...((hasPermission('marketing.view') || user?.roles?.includes('Marketing')) ? [
            { icon: Users, label: 'CP Dashboard', path: '/cp-dashboard' },
            { icon: Users, label: 'All Partners', path: '/channel-partners' }
        ] : []),
    ];

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-10">
                <div className="p-6 border-b border-gray-100">
                    <Link to="/" className="flex items-center gap-2">
                        <img src={logo} alt="Route Guide" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-primary-600">Route Guide</span>
                    </Link>
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
                                        ? 'bg-primary-50 text-primary-700'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                )
                            }
                        >
                            <item.icon className="h-5 w-5" />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <div className="flex items-center gap-3 px-4 py-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                            {user?.firstName?.charAt(0) || 'A'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
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
            <div className="md:hidden fixed w-full bg-white border-b border-gray-200 z-20 flex items-center justify-between p-4">
                <Link to="/" className="flex items-center gap-2">
                    <img src={logo} alt="Route Guide" className="h-8 w-auto" />
                    <span className="text-lg font-bold text-primary-600">Route Guide</span>
                </Link>
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-2 rounded-md hover:bg-gray-100 text-gray-600"
                >
                    {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {/* Mobile Sidebar */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-30 md:hidden">
                    <div className="fixed inset-0 bg-black/50" onClick={() => setIsSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h1 className="text-xl font-bold text-primary-600">Menu</h1>
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
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
