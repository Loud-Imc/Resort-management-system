import { useState } from 'react';
import { usePendingCounts } from '../hooks/usePendingCounts';
import { Outlet, NavLink, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProperty } from '../context/PropertyContext';
import { useTheme } from '../context/ThemeContext';
import {
    LayoutDashboard,
    // Calendar,
    // BedDouble,
    Users,
    CreditCard,
    DollarSign,
    LogOut,
    Menu,
    X,
    PieChart,
    // Briefcase,
    Shield,
    Loader2,
    Building2,
    Ticket,
    Sun,
    Moon,
    Bell,
    Megaphone,
    Settings,
    Image as ImageIcon,
    Type,
    LayoutGrid,
    Search
} from 'lucide-react';
import clsx from 'clsx';
import logo from '../assets/routeguide.svg';
import NotificationBell from '../components/NotificationBell';

export default function DashboardLayout() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const { selectedProperty, properties, setSelectedProperty } = useProperty();
    const { theme, toggleTheme } = useTheme();
    const navigate = useNavigate();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pendingCounts = usePendingCounts();
    const [isNavHubOpen, setIsNavHubOpen] = useState(false);
    const [hubSearch, setHubSearch] = useState('');

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
        // PILLAR 1: INTELLIGENCE
        ...(hasPermission('reports.viewDashboard') ? [
            { icon: LayoutDashboard, label: 'Executive Dashboard', path: '/', end: true }
        ] : []),
        ...(hasPermission('reports.viewFinancial') ? [
            { icon: PieChart, label: 'Platform Reports', path: '/reports' }
        ] : []),

        // PILLAR 2: PROPERTY OVERSIGHT
        ...(hasPermission('properties.read') ? [
            { icon: Building2, label: 'All Properties', path: '/properties', end: true },
        ] : []),
        ...(hasPermission('properties.create') ? [
            { icon: Shield, label: 'Property Requests', path: '/properties/requests', badgePath: '/properties/requests' },
        ] : []),
        ...((isSuperAdmin || user?.roles?.includes('Admin')) ? [
            { icon: LayoutDashboard, label: 'Property Categories', path: '/property-categories' },
        ] : []),

        // PILLAR 3: CHANNEL PARTNERS
        ...(hasPermission('channelPartners.read') ? [
            { icon: Users, label: 'CP Onboarding', path: '/channel-partners', badgePath: '/channel-partners' },
        ] : []),
        ...(hasPermission('payments.read') ? [
            { icon: DollarSign, label: 'CP Redemptions', path: '/financials/redemptions', badgePath: '/financials/redemptions' },
        ] : []),

        // PILLAR 4: FINANCIAL OPERATIONS
        ...(hasPermission('payments.read') ? [
            { icon: CreditCard, label: 'Settlements', path: '/financials/settlements', badgePath: '/financials/settlements' },
            { icon: DollarSign, label: 'Wallet Adjustments', path: '/financials/adjustments', badgePath: '/financials/adjustments' },
            { icon: CreditCard, label: 'Refund Requests', path: '/financials/refunds', badgePath: '/financials/refunds' },
            { icon: Shield, label: 'Reconciliation', path: '/financials/reconciliation' },
        ] : []),

        // PILLAR 5: GROWTH & MARKETING
        ...(hasPermission('marketing.read') ? [
            { icon: Megaphone, label: 'Growth Dashboard', path: '/marketing', end: true },
        ] : []),
        ...(hasPermission('marketing.manageCoupons') ? [
            { icon: Ticket, label: 'Coupons', path: '/marketing/coupons' },
        ] : []),
        ...(hasPermission('marketing.manageCoupons') ? [
            { icon: ImageIcon, label: 'Web Banners', path: '/marketing/banners' },
            { icon: Type, label: 'Hero Content', path: '/marketing/hero-content' },
            {icon: Megaphone, label: 'Promotions Board', path: '/marketing/promotions', badgePath: '/marketing/promotions'},
        ] : []),
        ...(hasPermission('marketing.manageBroadcasts') ? [
            { icon: Bell, label: 'Broadcast Alerts', path: '/marketing/notifications' },
        ] : []),
        ...(hasPermission('marketing.manageLoyalty') ? [
            { icon: Settings, label: 'Platform Settings', path: '/platform-settings' }
        ] : []),

        // PILLAR 6: PLATFORM INTEGRITY
        ...(hasPermission('users.read') ? [
            { icon: Users, label: 'Platform Users', path: '/users' },
        ] : []),
        ...(hasPermission('roles.read') ? [
            { icon: Shield, label: 'System Roles', path: '/roles' },
        ] : []),
    ] as { icon: any; label: string; path: string; end?: boolean; badgePath?: keyof typeof pendingCounts }[];

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border fixed h-full z-10 transition-colors duration-300">
                <div className="p-1 border-b border-gray-100">
                    <Link to="/" className="flex items-center justify-center mb-6 overflow-hidden">
                        <img
                            src={logo}
                            alt="Route Guide"
                            className="h-12 w-auto object-contain mt-2"
                        />
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
                    {navItems.map((item) => {
                        const badge = item.badgePath ? (pendingCounts[item.badgePath] ?? 0) : 0;
                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.end}
                                className={({ isActive }) =>
                                    clsx(
                                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )
                                }
                            >
                                <item.icon className="h-5 w-5 shrink-0" />
                                <span className="flex-1 truncate">{item.label}</span>
                                {badge > 0 && (
                                    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                        {badge > 99 ? '99+' : badge}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-border space-y-2">
                    <button
                        onClick={() => {
                            setHubSearch('');
                            setIsNavHubOpen(true);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-xl transition-all group shadow-sm"
                    >
                        <LayoutGrid className="h-4.5 w-4.5 group-hover:rotate-12 transition-transform" />
                        <span>Explore Hub</span>
                    </button>

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

                    <Link
                        to="/notifications"
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
                    >
                        <Bell className="h-5 w-5 text-primary" />
                        Notifications
                    </Link>

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
                <Link to="/" className="flex items-center">
                    <img src={logo} alt="Route Guide" className="h-10 w-auto object-contain -my-4" />
                </Link>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-md hover:bg-muted text-foreground"
                    >
                        {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                    </button>
                    <NotificationBell />
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
                            {navItems.map((item) => {
                                const badge = item.badgePath ? (pendingCounts[item.badgePath] ?? 0) : 0;
                                return (
                                    <NavLink
                                        key={item.path}
                                        onClick={() => setIsSidebarOpen(false)}
                                        to={item.path}
                                        end={item.end}
                                        className={({ isActive }) =>
                                            clsx(
                                                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                            )
                                        }
                                    >
                                        <item.icon className="h-5 w-5 shrink-0" />
                                        <span className="flex-1 truncate">{item.label}</span>
                                        {badge > 0 && (
                                            <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                                                {badge > 99 ? '99+' : badge}
                                            </span>
                                        )}
                                    </NavLink>
                                );
                            })}
                        </nav>
                        <div className="p-4 border-t border-gray-100 space-y-2">
                            <button
                                onClick={() => {
                                    setIsSidebarOpen(false);
                                    setHubSearch('');
                                    setIsNavHubOpen(true);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-primary bg-primary/10 rounded-xl"
                            >
                                <LayoutGrid className="h-4 w-4" />
                                <span>Explore Hub</span>
                            </button>
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

            {/* Navigator Hub Modal */}
            {isNavHubOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto animate-in fade-in duration-200" 
                    onClick={() => setIsNavHubOpen(false)}
                >
                    <div 
                        className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Hub Header with Search */}
                        <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/30">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary text-white p-3 rounded-2xl shadow-md shadow-primary/20">
                                    <LayoutGrid className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground tracking-tight">Platform Navigator</h2>
                                    <p className="text-xs text-muted-foreground font-medium">Instantly access and filter platform features</p>
                                </div>
                            </div>
                            
                            <div className="relative flex-1 max-w-md w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search navigation, dashboard, reports..."
                                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold transition-all shadow-sm"
                                    value={hubSearch}
                                    onChange={(e) => setHubSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <button 
                                onClick={() => setIsNavHubOpen(false)}
                                className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/50 shadow-sm"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Hub Grid Content */}
                        <div className="p-8 overflow-y-auto flex-1 bg-card/50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {[
                                    ...navItems,
                                    { icon: Bell, label: 'Notifications', path: '/notifications' }
                                ]
                                    .filter(item => item.label.toLowerCase().includes(hubSearch.toLowerCase()))
                                    .map((item) => {
                                        const badge = item.badgePath ? (pendingCounts[item.badgePath] ?? 0) : 0;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsNavHubOpen(false)}
                                                className="group flex flex-col items-center text-center p-6 bg-background border border-border/70 hover:border-primary hover:bg-primary/5 rounded-2xl transition-all hover:scale-[1.03] relative hover:shadow-md cursor-pointer"
                                            >
                                                <div className="bg-muted/50 group-hover:bg-primary/10 p-5 rounded-2xl mb-3.5 text-muted-foreground group-hover:text-primary transition-all relative border border-border/50 shadow-sm">
                                                    <item.icon className="h-7 w-7 transition-transform group-hover:scale-110" />
                                                    {badge > 0 && (
                                                        <span className="absolute -top-2.5 -right-2.5 h-5.5 px-2 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-card shadow-md animate-pulse">
                                                            {badge}
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-xs font-black text-foreground tracking-tight group-hover:text-primary transition-colors break-words max-w-full leading-tight uppercase">
                                                    {item.label}
                                                </span>
                                            </Link>
                                        );
                                    })}

                                {[...navItems, { icon: Bell, label: 'Notifications', path: '/notifications' }].filter(item => item.label.toLowerCase().includes(hubSearch.toLowerCase())).length === 0 && (
                                    <div className="col-span-full py-16 text-center flex flex-col items-center">
                                        <Search className="h-10 w-10 text-muted-foreground opacity-20 mb-3 animate-bounce" />
                                        <p className="text-muted-foreground text-sm font-bold italic">No sections match "{hubSearch}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
