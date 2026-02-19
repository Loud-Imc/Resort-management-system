import React, { useEffect, useState } from 'react';
import PremiumTable from '../components/PremiumTable';
import { BadgeCheck, Clock, XCircle, ExternalLink } from 'lucide-react';
import api from '../services/api';

interface Referral {
    id: string;
    guestName: string;
    status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'PENDING_PAYMENT';
    date: string;
    commission: string;
    points: number;
}

const Referrals: React.FC = () => {
    const [referrals, setReferrals] = useState<Referral[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchReferrals = async () => {
            try {
                const response: any = await api.get('/channel-partners/me');
                const mappedData = response.referrals.map((ref: any) => ({
                    id: ref.id,
                    guestName: ref.user ? `${ref.user.firstName} ${ref.user.lastName}` : 'Guest',
                    status: ref.status,
                    date: new Date(ref.createdAt).toLocaleDateString(),
                    commission: `₹${Number(ref.cpCommission || 0).toLocaleString()}`,
                    points: Math.floor(Number(ref.totalAmount || 0) / 100), // Calculation logic usually on backend but showing for UI
                }));
                setReferrals(mappedData);
            } catch (error) {
                console.error('Error fetching referrals:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchReferrals();
    }, []);

    const columns = [
        { header: 'Guest Name', accessor: 'guestName' as keyof Referral },
        { header: 'Date', accessor: 'date' as keyof Referral },
        {
            header: 'Status',
            accessor: (item: Referral) => {
                const isCompleted = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'].includes(item.status);
                const isPending = ['PENDING', 'PENDING_PAYMENT'].includes(item.status);
                const isCancelled = item.status === 'CANCELLED';

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {isCompleted && <BadgeCheck size={16} color="#10b981" />}
                        {isPending && <Clock size={16} color="#d97706" />}
                        {isCancelled && <XCircle size={16} color="#ef4444" />}
                        <span style={{
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            color: isCompleted ? '#10b981' : isPending ? '#d97706' : '#ef4444',
                            textTransform: 'capitalize'
                        }}>
                            {item.status.toLowerCase().replace('_', ' ')}
                        </span>
                    </div>
                );
            }
        },
        {
            header: 'Commission',
            accessor: (item: Referral) => (
                <span style={{ fontWeight: 600, color: 'var(--primary-teal)' }}>{item.commission}</span>
            )
        },

        { header: 'Points', accessor: 'points' as keyof Referral, align: 'center' as const },
        {
            header: 'Actions',
            accessor: () => (
                <button style={{ background: 'none', color: 'var(--text-dim)' }} className="glass-pane-hover">
                    <ExternalLink size={18} />
                </button>
            ),
            align: 'right' as const
        }
    ];

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ color: 'var(--primary-teal)' }}>Loading referrals...</div>
            </div>
        );
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Your Referrals</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Track the progress of your shared links and commissions.</p>
                </div>
            </div>

            <div className="glass-pane" style={{ padding: '2rem' }}>
                {referrals.length > 0 ? (
                    <PremiumTable columns={columns} data={referrals} />
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-dim)' }}>
                        <p>No referrals found yet.</p>
                        <p style={{ fontSize: '0.9rem' }}>Share your code from the dashboard to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Referrals;
