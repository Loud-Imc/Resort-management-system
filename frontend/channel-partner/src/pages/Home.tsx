import React, { useEffect, useState } from 'react';
import StatsCard from '../components/StatsCard';
import ProgressBar from '../components/ProgressBar';
import { DollarSign, Star, TrendingUp, Handshake, Copy, Check } from 'lucide-react';
import api from '../services/api';

interface DashboardStats {
    referralCode: string;
    commissionRate: number;
    totalPoints: number;
    availablePoints: number;
    pendingPoints: number;
    totalEarnings: number;
    pendingEarnings: number;
    paidOut: number;
    pendingBalance: number;
    totalReferrals: number;
    confirmedReferrals: number;
    thisMonthReferrals: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
}

const Home: React.FC = () => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data: any = await api.get('/channel-partners/me/stats');
                setStats(data);
            } catch (error) {
                console.error('Error fetching dashboard stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, []);

    const copyCode = () => {
        if (stats?.referralCode) {
            navigator.clipboard.writeText(stats.referralCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ color: 'var(--primary-gold)' }}>Loading your dashboard...</div>
            </div>
        );
    }

    if (stats && stats.status !== 'APPROVED') {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                height: '60vh',
                textAlign: 'center',
                padding: '2rem'
            }}>
                <div className="glass-pane" style={{ padding: '3rem', maxWidth: '500px' }}>
                    <Handshake size={64} style={{ color: 'var(--primary-gold)', marginBottom: '1.5rem' }} />
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem' }}>
                        {stats.status === 'PENDING' ? 'Registration Pending' : 'Account Inactive'}
                    </h2>
                    <p style={{ color: 'var(--text-dim)', lineHeight: '1.6' }}>
                        {stats.status === 'PENDING'
                            ? "Thank you for joining! Our team is currently reviewing your registration. You'll receive full access to the dashboard once your account is approved."
                            : "Your account is currently inactive. Please contact the administrator for more information."}
                    </p>
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(236, 208, 111, 0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(236, 208, 111, 0.2)' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--primary-gold)' }}>
                            <strong>Status:</strong> {stats.status}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Performance Dashboard</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Monitor your earnings, points, and referral progress.</p>
                </div>
                <button
                    onClick={copyCode}
                    className="glass-pane-hover"
                    style={{
                        padding: '0.8rem 1.5rem',
                        background: 'linear-gradient(135deg, var(--primary-gold) 0%, #ecd06f 100%)',
                        color: 'var(--bg-dark)',
                        fontWeight: 700,
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        transition: 'all 0.3s ease'
                    }}
                >
                    {copied ? <Check size={18} /> : <Copy size={18} />}
                    {copied ? 'Copied!' : `Code: ${stats?.referralCode}`}
                </button>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                <StatsCard
                    title="Total Earnings"
                    value={`₹${stats?.totalEarnings?.toLocaleString() || '0'}`}
                    icon={DollarSign}
                    trend={`₹${stats?.pendingEarnings?.toLocaleString() || '0'} pending Check-in`}
                    isPositive={true}
                />
                <StatsCard
                    title="Available Points"
                    value={stats?.availablePoints?.toLocaleString() || '0'}
                    icon={Star}
                    trend={`${stats?.pendingPoints?.toLocaleString() || '0'} pending Check-in`}
                    isPositive={true}
                />
                <StatsCard
                    title="Total Referrals"
                    value={stats?.totalReferrals || '0'}
                    icon={Handshake}
                    trend={`${stats?.confirmedReferrals || '0'} confirmed`}
                    isPositive={true}
                />
                <StatsCard
                    title="Commission Rate"
                    value={`${stats?.commissionRate}%`}
                    icon={TrendingUp}
                />
            </div>

            <div style={{ gridTemplateColumns: '1fr 380px', display: 'grid', gap: '1.5rem' }}>
                <div className="glass-pane" style={{ padding: '2rem' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Recent Activity</h3>
                    <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '3rem' }}>
                        <p>Detailed transaction history will be displayed here.</p>
                        <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>Check the 'Referrals' tab for detailed guest info.</p>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <ProgressBar
                        label="Growth Progress"
                        current={stats?.totalPoints || 0}
                        target={5000} // This should eventually be dynamic based on levels
                    />

                    <div className="glass-pane" style={{ padding: '1.5rem' }}>
                        <h4 style={{ marginBottom: '1rem' }}>Tier Benefits</h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                            <li style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Commission Rate</span>
                                <span style={{ fontWeight: 600 }}>{stats?.commissionRate}%</span>
                            </li>
                            <li style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Points per ₹100</span>
                                <span style={{ fontWeight: 600, color: 'var(--primary-gold)' }}>1 pt</span>
                            </li>
                            <li style={{ fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: 'var(--text-dim)' }}>Payout Frequency</span>
                                <span style={{ fontWeight: 600, color: '#10b981' }}>Monthly</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
