import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Award,
    Settings,
    LogOut,
    // Bell,
    Wallet,
    BedDouble,
    Menu,
    X,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

import logo from '../assets/routeguide.svg';
import NotificationBell from '../components/NotificationBell';
import ProgressBar from '../components/ProgressBar';

const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: BedDouble, label: 'Book a Stay', path: '/book' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Users, label: 'Referrals', path: '/referrals' },
    { icon: Award, label: 'Rewards', path: '/rewards' },
    { icon: Calendar, label: 'Bookings', path: '/bookings' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [status, setStatus] = React.useState<string | null>(null);
    const [stats, setStats] = React.useState<any>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    React.useEffect(() => {
        api.get('/channel-partners/me/stats').then((res: any) => {
            setStatus(res.status);
            setStats(res);
        }).catch(() => {
            setStatus('INACTIVE');
        });
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar Overlay for Mobile */}
            {isSidebarOpen && (
                <div
                    onClick={closeSidebar}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        background: 'rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        zIndex: 95,
                        display: 'block'
                    }}
                    className="mobile-only"
                />
            )}

            {/* Sidebar */}
            <aside style={{
                width: '280px',
                height: '100vh',
                position: 'fixed',
                left: isSidebarOpen ? 0 : '', // Responsive left handled by CSS/Inline logic
                top: 0,
                background: '#ffffff',
                borderRight: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                zIndex: 100,
                transition: 'transform 0.3s ease-in-out',
                transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            }}
                className="sidebar-container"
            >
                <style>{`
                    @media (min-width: 769px) {
                        .sidebar-container {
                            transform: translateX(0) !important;
                        }
                    }
                `}</style>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden' }}>
                    <img
                        src={logo}
                        alt="Route Guide"
                        style={{
                            height: '45px',
                            width: 'auto',
                            objectFit: 'contain',
                        }}
                    />
                    <button
                        onClick={closeSidebar}
                        className="mobile-only"
                        style={{ background: 'none', border: 'none', color: 'var(--text-dim)' }}
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav style={{ flex: 1, marginTop: '2rem' }}>
                    <ul style={{ listStyle: 'none' }}>
                        {navItems.map((item) => {
                            // If status is not approved, only show Overview
                            if (status && status !== 'APPROVED' && item.label !== 'Overview') {
                                return null;
                            }

                            return (
                                <li key={item.path} style={{ marginBottom: '0.5rem' }}>
                                    <Link
                                        to={item.path}
                                        onClick={closeSidebar}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1rem',
                                            padding: '0.8rem 1rem',
                                            borderRadius: 'var(--radius-md)',
                                            color: location.pathname === item.path ? 'var(--primary-teal)' : '#64748b',
                                            background: location.pathname === item.path ? 'rgba(8, 71, 78, 0.05)' : 'transparent',
                                            transition: 'all 0.2s',
                                            fontWeight: 600
                                        }}
                                        className="glass-pane-hover"
                                    >
                                        <item.icon size={20} />
                                        <span style={{ fontWeight: 600 }}>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                </nav>

                <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', paddingTop: '2rem' }}>
                    <button
                        onClick={handleLogout}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '1rem',
                            width: '100%',
                            padding: '0.8rem 1rem',
                            color: '#ef4444',
                            background: 'transparent',
                            textAlign: 'left',
                            fontWeight: 600
                        }}
                    >
                        <LogOut size={20} />
                        <span style={{ fontWeight: 600 }}>Sign Out</span>
                    </button>
                </div>
            </aside>


            {/* Main Content */}
            <main style={{
                flex: 1,
                marginLeft: 'var(--content-margin)',
                padding: 'var(--section-padding)',
                minWidth: 0 // Prevent flex-basis issues on small screens
            }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--section-padding)',
                    gap: '1rem',
                }}>
                    {/* Left: Mobile Logo (mobile) | Progress Bar (desktop) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                        {/* Mobile logo — only visible on mobile */}
                        <Link to="/" className="mobile-only" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
                            <img
                                src="/src/assets/routeguide-mobile.svg"
                                alt="Route Guide"
                                style={{ height: '52px', width: 'auto', objectFit: 'contain' }}
                            />
                        </Link>

                        {/* Progress bar — visible on all screen sizes when not on home */}
                        {location.pathname !== '/' && stats && (
                            <div
                                style={{
                                    maxWidth: '280px',
                                    flex: 1,
                                    background: 'rgba(184, 134, 11, 0.05)',
                                    padding: '0.6rem 1rem',
                                    borderRadius: '12px',
                                    border: '1px solid rgba(184, 134, 11, 0.15)'
                                }}
                            >
                                <ProgressBar
                                    variant="compact"
                                    colorScheme="gold"
                                    label={stats.nextLevel ? `To ${stats.nextLevel.name}` : "Max Tier"}
                                    current={stats.activePoints || 0}
                                    target={stats.nextLevel?.minPoints || stats.activePoints || 0}
                                />
                            </div>
                        )}
                    </div>

                    {/* Right: Notifications + User + Burger (burger rightmost on mobile) */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <NotificationBell />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ textAlign: 'right' }} className="desktop-only">
                                <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.firstName} {user?.lastName}</p>
                                <p style={{ fontSize: '0.8rem', color: 'var(--primary-teal)' }}>Partner Network</p>
                            </div>

                            <Link to="/settings" title="Account Settings" style={{ textDecoration: 'none' }}>
                                <div className="glass-pane" style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    boxShadow: '0 4px 10px rgba(8, 71, 78, 0.2)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                }}>
                                    {user?.firstName?.[0]}
                                </div>
                            </Link>
                        </div>

                        {/* Burger button — rightmost, mobile only */}
                        <button
                            onClick={toggleSidebar}
                            className="mobile-only"
                            style={{
                                background: 'var(--bg-card)',
                                border: '1px solid var(--border-glass)',
                                padding: '0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--primary-teal)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                            }}
                        >
                            <Menu size={24} />
                        </button>
                    </div>
                </header>

                <section className="animate-fade-in">
                    {children}
                </section>
            </main>
        </div>
    );
};

export default DashboardLayout;
