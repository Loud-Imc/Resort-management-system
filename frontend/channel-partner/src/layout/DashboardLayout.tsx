import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard,
    Users,
    Calendar,
    Award,
    Settings,
    LogOut,
    Bell
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

const navItems = [
    { icon: LayoutDashboard, label: 'Overview', path: '/' },
    { icon: Users, label: 'Referrals', path: '/referrals' },
    { icon: Award, label: 'Rewards', path: '/rewards' },
    { icon: Calendar, label: 'Bookings', path: '/bookings' },
    { icon: Settings, label: 'Settings', path: '/settings' },
];

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-dark)' }}>
            {/* Sidebar */}
            <aside className="glass-pane" style={{
                width: '280px',
                height: '100vh',
                position: 'fixed',
                left: 0,
                top: 0,
                borderRadius: 0,
                borderLeft: 'none',
                display: 'flex',
                flexDirection: 'column',
                padding: '2rem 1.5rem',
                zIndex: 100
            }}>
                <div style={{ marginBottom: '3rem' }}>
                    <h2 className="text-premium-gradient" style={{ fontSize: '1.8rem', fontWeight: 700 }}>CP.ROOT</h2>
                </div>

                <nav style={{ flex: 1 }}>
                    <ul style={{ listStyle: 'none' }}>
                        {navItems.map((item) => (
                            <li key={item.path} style={{ marginBottom: '0.5rem' }}>
                                <Link
                                    to={item.path}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '1rem',
                                        padding: '0.8rem 1rem',
                                        borderRadius: 'var(--radius-md)',
                                        color: location.pathname === item.path ? 'var(--primary-gold)' : 'var(--text-dim)',
                                        background: location.pathname === item.path ? 'var(--bg-card-hover)' : 'transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    className="glass-pane-hover"
                                >
                                    <item.icon size={20} />
                                    <span style={{ fontWeight: 500 }}>{item.label}</span>
                                </Link>
                            </li>
                        ))}
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
                            textAlign: 'left'
                        }}
                    >
                        <LogOut size={20} />
                        <span style={{ fontWeight: 500 }}>Sign Out</span>
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
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Gold Partner</p>
                        </div>
                        <div className="glass-pane" style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, var(--primary-gold) 0%, #ecd06f 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: 'var(--bg-dark)'
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
