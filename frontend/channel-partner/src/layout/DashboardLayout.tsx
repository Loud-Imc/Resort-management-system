import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Award,
    Settings,
    LogOut,
    Bell,
    Wallet,
    BedDouble,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';

import logo from '../assets/routeguide.svg';

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

    React.useEffect(() => {
        api.get('/channel-partners/me/stats').then((res: any) => {
            setStatus(res.status);
        }).catch(() => {
            setStatus('INACTIVE');
        });
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <aside style={{
                width: '280px',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                background: '#ffffff',
                borderRight: '1px solid var(--border-glass)',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                zIndex: 100
            }}>
                <div style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    <img
                        src={logo}
                        alt="Route Guide"
                        style={{
                            height: '160px',
                            width: 'auto',
                            objectFit: 'contain',
                            margin: '-40px 0' // Compensate for SVG empty space
                        }}
                    />
                </div>

                <nav style={{ flex: 1 }}>
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
            <main style={{ flex: 1, marginLeft: '280px', padding: '2rem 3rem' }}>
                <header style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    marginBottom: '3rem',
                    gap: '2rem'
                }}>
                    <button className="glass-pane" style={{ padding: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Bell size={20} color="var(--text-dim)" />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.firstName} {user?.lastName}</p>
                            <p style={{ fontSize: '0.8rem', color: 'var(--primary-teal)' }}>Partner Network</p>
                        </div>

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
                            boxShadow: '0 4px 10px rgba(8, 71, 78, 0.2)'
                        }}>


                            {user?.firstName?.[0]}
                        </div>
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
