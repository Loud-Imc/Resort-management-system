import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, Navigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useProperty } from '../context/PropertyContext';
import { useTheme } from '../context/ThemeContext';
import {
    LogOut,
    Menu,
    X,
    Sun,
    Moon,
    ChevronDown,
    Loader2,
    Settings,
    LayoutGrid,
    Search,
    MapPin,
    Building2,
    CheckCircle2
} from 'lucide-react';
import clsx from 'clsx';
import logo from '../assets/logo.svg';
import NotificationBell from '../components/NotificationBell';

import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../context/SocketContext';
import { useNavigation } from '../hooks/useNavigation';

export default function DashboardLayout() {
    const { user, logout, isAuthenticated, isLoading } = useAuth();
    const { selectedProperty, properties, setSelectedProperty } = useProperty();
    const { theme, toggleTheme } = useTheme();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const navigate = useNavigate();
    const { socket } = useSocket();
    const queryClient = useQueryClient();

    const { navItems } = useNavigation();
    const [isNavHubOpen, setIsNavHubOpen] = useState(false);
    const [hubSearch, setHubSearch] = useState('');
    const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
    const [propertySearch, setPropertySearch] = useState('');

    // Real-time update for unread count
    useEffect(() => {
        if (socket) {
            socket.on('NEW_BOOKING', () => {
                queryClient.invalidateQueries({ queryKey: ['bookings', 'unread-count'] });
            });
            return () => {
                socket.off('NEW_BOOKING');
            };
        }
    }, [socket, queryClient]);

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

    // Portal role guard — belt-and-suspenders check on every render.
    // Admin/SuperAdmin are explicitly allowed here to support the impersonation flow
    // from the admin portal (they enter carrying their own token + Admin role).
    const sessionRoles: string[] = user?.roles || (user?.role ? [user.role as string] : []);
    const normalisedRoles = sessionRoles.map(r => r.toLowerCase());
    const PROPERTY_BLOCKED_ONLY = ['channelpartner', 'customer'];
    const isBlockedOnly = normalisedRoles.length > 0 && normalisedRoles.every(r => PROPERTY_BLOCKED_ONLY.includes(r));
    if (isBlockedOnly) {
        logout();
        return <Navigate to="/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-background text-foreground flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border fixed h-full z-10 transition-colors duration-300">
                <div className="p-6 border-b border-border">
                    <Link to="/" className="flex items-center justify-center mb-6 overflow-hidden">
                        <img
                            src={logo}
                            alt="Route Guide"
                            className={`h-11 w-auto object-contain ${theme !== "light" ? "brightness-0 invert" : ""}`}
                        />
                    </Link>


                    {/* Property Switcher Button */}
                    {properties.length > 1 && (
                        <div className="relative">
                            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                                Active Property
                            </label>
                            <button
                                onClick={() => setIsPropertyModalOpen(true)}
                                className="w-full flex items-center justify-between p-2.5 text-sm border border-border rounded-xl hover:border-primary/50 transition-all text-left group bg-background/50 hover:bg-primary/5"
                            >
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-foreground truncate group-hover:text-primary transition-colors leading-tight">
                                            {selectedProperty?.name || 'Select Property'}
                                        </p>
                                        {selectedProperty?.city && (
                                            <p className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                                📍 {selectedProperty.city}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 ml-1" />
                            </button>
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
                    {navItems.map((item: any) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }: { isActive: boolean }) =>
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

                    <NavLink
                        to="/account-settings"
                        className={({ isActive }: { isActive: boolean }) =>
                            clsx(
                                'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-lg',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-foreground hover:bg-muted'
                            )
                        }
                    >
                        <Settings className="h-5 w-5" />
                        Account Settings
                    </NavLink>

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
                    <img src={logo} alt="Route Guide" className={`h-11 w-auto object-contain -my-16 ${theme !== "light" ? "brightness-0 invert" : ""}`} />
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

                        {/* Property Switcher Button in Mobile */}
                        {properties.length > 1 && (
                            <div className="px-6 py-3 border-b border-border">
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
                                    Active Property
                                </label>
                                <button
                                    onClick={() => {
                                        setIsSidebarOpen(false);
                                        setIsPropertyModalOpen(true);
                                    }}
                                    className="w-full flex items-center justify-between p-2 text-sm border border-border rounded-xl bg-background text-foreground text-left"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                                        <span className="font-bold truncate">{selectedProperty?.name || 'Select Property'}</span>
                                    </div>
                                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
                                </button>
                            </div>
                        )}

                        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                            {navItems.map((item: any) => (
                                <NavLink
                                    key={item.path}
                                    onClick={() => setIsSidebarOpen(false)}
                                    to={item.path}
                                    end={item.path === '/'}
                                    className={({ isActive }: { isActive: boolean }) =>
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
                            <NavLink
                                to="/account-settings"
                                onClick={() => setIsSidebarOpen(false)}
                                className={({ isActive }: { isActive: boolean }) =>
                                    clsx(
                                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    )
                                }
                            >
                                <Settings className="h-5 w-5" />
                                <span className="flex-1">Account Settings</span>
                            </NavLink>
                        </nav>
                        <div className="p-4 border-t border-border space-y-2">
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
            <main className="flex-1 md:ml-64 pt-16 md:pt-0 min-h-screen">
                {/* Desktop Top Header */}
                <header className="hidden md:flex items-center justify-between px-8 py-4 bg-card/50 backdrop-blur-md border-b border-border sticky top-0 z-10">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                            {(navItems as any[]).find(item => item.path === window.location.pathname)?.label || 'Overview'}
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

            {/* Navigator Hub Modal */}
            {isNavHubOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto animate-in fade-in duration-200" 
                    onClick={() => setIsNavHubOpen(false)}
                >
                    <div 
                        className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-5xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300" 
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Hub Header with Search */}
                        <div className="p-6 border-b border-border flex flex-col md:flex-row gap-4 items-center justify-between bg-muted/40">
                            <div className="flex items-center gap-3">
                                <div className="bg-primary text-white p-3 rounded-2xl shadow-lg shadow-primary/20">
                                    <LayoutGrid className="h-6 w-6" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-foreground tracking-tight">Property Console Navigator</h2>
                                    <p className="text-xs text-muted-foreground font-medium">Instantly jump across property management features</p>
                                </div>
                            </div>
                            
                            <div className="relative flex-1 max-w-md w-full">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search console, booking, settings..."
                                    className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-2xl outline-none focus:ring-2 focus:ring-primary focus:border-primary text-sm font-bold transition-all shadow-sm"
                                    value={hubSearch}
                                    onChange={(e) => setHubSearch(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <button 
                                onClick={() => setIsNavHubOpen(false)}
                                className="p-2.5 bg-muted hover:bg-muted/80 rounded-xl text-muted-foreground hover:text-foreground transition-all border border-border/50"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Hub Grid Content */}
                        <div className="p-8 overflow-y-auto flex-1 bg-card/50">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {[
                                    ...navItems,
                                    { icon: Settings, label: 'Account Settings', path: '/account-settings' }
                                ]
                                    .filter(item => item.label.toLowerCase().includes(hubSearch.toLowerCase()))
                                    .map((item: any) => {
                                        const badge = item.badge;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => setIsNavHubOpen(false)}
                                                className="group flex flex-col items-center text-center p-6 bg-background border border-border/70 hover:border-primary hover:bg-primary/5 rounded-2xl transition-all hover:scale-[1.03] relative hover:shadow-md cursor-pointer"
                                            >
                                                <div className="bg-muted/50 group-hover:bg-primary/10 p-5 rounded-2xl mb-3.5 text-muted-foreground group-hover:text-primary transition-all relative border border-border/50 shadow-sm">
                                                    <item.icon className="h-7 w-7 transition-transform group-hover:scale-110" />
                                                    {badge !== undefined && badge > 0 && (
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

                                {[...navItems, { icon: Settings, label: 'Account Settings', path: '/account-settings' }].filter(item => item.label.toLowerCase().includes(hubSearch.toLowerCase())).length === 0 && (
                                    <div className="col-span-full py-16 text-center flex flex-col items-center">
                                        <Search className="h-10 w-10 text-muted-foreground opacity-20 mb-3 animate-bounce" />
                                        <p className="text-muted-foreground text-sm font-bold italic">No matching features found for "{hubSearch}"</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Property Switcher Modal */}
            {isPropertyModalOpen && (
                <div 
                    className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8 overflow-y-auto animate-in fade-in duration-200"
                    onClick={() => setIsPropertyModalOpen(false)}
                >
                    <div 
                        className="bg-card border border-border shadow-2xl rounded-3xl w-full max-w-4xl overflow-hidden max-h-[85vh] flex flex-col animate-in scale-in-95 duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b border-border flex flex-col gap-4 bg-muted/30">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="bg-primary/10 text-primary p-2.5 rounded-xl">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-foreground tracking-tight">Switch Managed Property</h2>
                                        <p className="text-xs text-muted-foreground font-medium">Select or search through your allocated portfolio</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsPropertyModalOpen(false)}
                                    className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Place/Name Filter Bar */}
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Filter properties by name or location (e.g. Kozhikkode, Beach...)"
                                    className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                                    value={propertySearch}
                                    onChange={(e) => setPropertySearch(e.target.value)}
                                    autoFocus
                                />
                                {propertySearch && (
                                    <button 
                                        onClick={() => setPropertySearch('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground font-bold"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Properties Grid */}
                        <div className="p-6 overflow-y-auto flex-1 bg-background/30 space-y-3">
                            {properties
                                .filter(p => {
                                    const matchStr = `${p.name} ${p.city || ''} ${p.address || ''}`.toLowerCase();
                                    return matchStr.includes(propertySearch.toLowerCase());
                                })
                                .map((p) => {
                                    const isSelected = selectedProperty?.id === p.id;
                                    const isPendingReq = p.isRequest || p.status === 'PENDING';
                                    const coverImg = p.coverImage || p.images?.[0];

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => {
                                                setSelectedProperty(p);
                                                setIsPropertyModalOpen(false);
                                            }}
                                            className={clsx(
                                                "group flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                                                isSelected 
                                                    ? "bg-primary/5 border-primary shadow-sm" 
                                                    : "bg-card border-border hover:border-primary/40 hover:shadow-md"
                                            )}
                                        >
                                            {/* Thumbnail / Gradient Fallback */}
                                            <div className="w-full sm:w-24 h-20 sm:h-16 rounded-xl overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shrink-0 relative flex items-center justify-center">
                                                {coverImg ? (
                                                    <img src={coverImg} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                ) : (
                                                    <Building2 className="h-6 w-6 text-primary/40" />
                                                )}
                                                {isSelected && (
                                                    <div className="absolute inset-0 bg-primary/20 backdrop-blur-[1px] flex items-center justify-center">
                                                        <CheckCircle2 className="h-6 w-6 text-primary fill-white drop-shadow-sm" />
                                                    </div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="text-sm font-black text-foreground truncate group-hover:text-primary transition-colors">
                                                        {p.name}
                                                    </h3>
                                                    {isPendingReq && (
                                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                                            Pending Approval
                                                        </span>
                                                    )}
                                                </div>

                                                {p.city && (
                                                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-semibold">
                                                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                                                        <span>{p.city}</span>
                                                        {p.state && <span className="opacity-60">, {p.state}</span>}
                                                    </p>
                                                )}

                                                {p.type && (
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mt-1">
                                                        Type: {p.type}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Active / Selection Status Button */}
                                            <div className="sm:pl-4 sm:border-l border-border/50 flex items-center justify-between sm:justify-center">
                                                <span className="text-xs font-bold text-muted-foreground sm:hidden block">Status:</span>
                                                {isSelected ? (
                                                    <span className="text-xs font-black text-primary bg-primary/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                                        Active Context
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground group-hover:bg-muted px-3 py-1.5 rounded-xl transition-all">
                                                        Select
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                            {properties.filter(p => `${p.name} ${p.city || ''} ${p.address || ''}`.toLowerCase().includes(propertySearch.toLowerCase())).length === 0 && (
                                <div className="py-12 text-center">
                                    <p className="text-sm font-bold text-muted-foreground">No properties match your filter criteria.</p>
                                </div>
                            )}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 bg-muted/20 border-t border-border flex items-center justify-between text-xs text-muted-foreground font-semibold">
                            <span>Total Allocated Portfolio: {properties.length} Properties</span>
                            <button 
                                onClick={() => {
                                    setIsPropertyModalOpen(false);
                                    navigate('/properties/requests');
                                }}
                                className="text-primary hover:underline font-bold flex items-center gap-1"
                            >
                                + Register New Listing
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
