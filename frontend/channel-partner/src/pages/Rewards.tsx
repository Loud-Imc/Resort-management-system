import React, { useEffect, useState } from 'react';
import { ShoppingBag, Zap, Gift, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Reward {
    id: string;
    name: string;
    pointCost: number;
    description: string;
    imageUrl: string;
}

interface Redemption {
    id: string;
    status: 'PENDING' | 'PROCESSING' | 'DISPATCHED' | 'REJECTED';
    notes?: string;
    createdAt: string;
    reward: Reward;
}

const Rewards: React.FC = () => {
    const [activeMainTab, setActiveMainTab] = useState<'CATALOG' | 'HISTORY'>('CATALOG');
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [redemptions, setRedemptions] = useState<Redemption[]>([]);
    const [availablePoints, setAvailablePoints] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [rewardsRes, statsRes, redemptionsRes]: any = await Promise.all([
                api.get('/marketing/rewards'),
                api.get('/channel-partners/me/stats'),
                api.get('/channel-partners/my/redemptions')
            ]);
            setRewards(rewardsRes);
            setAvailablePoints(statsRes.availablePoints);
            setRedemptions(redemptionsRes);
        } catch (error) {
            console.error('Error fetching rewards data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleRedeem = async (rewardId: string) => {
        if (!window.confirm('Are you sure you want to redeem this reward?')) return;

        setIsRedeeming(rewardId);
        try {
            await api.post(`/channel-partners/rewards/${rewardId}/redeem`);
            alert('Redemption request submitted successfully!');
            fetchData(); // Refresh points
        } catch (error: any) {
            alert(error.message || 'Redemption failed. Please try again.');
        } finally {
            setIsRedeeming(null);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <div style={{ color: 'var(--primary-teal)' }}>Loading rewards catalog...</div>
            </div>
        );
    }


    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-padding)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: 'clamp(1.5rem, 5vw, 2.2rem)', fontWeight: 700, lineHeight: 1.2 }}>Exclusive Rewards</h1>
                    <p style={{ color: 'var(--text-dim)' }}>Turn your hard-earned points into premium experiences and products.</p>
                </div>
                <div className="glass-pane" style={{
                    padding: '0.8rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    background: '#ffffff',
                    border: '1px solid var(--border-teal)',
                    boxShadow: '0 4px 10px rgba(8, 71, 78, 0.05)'
                }}>
                    <Zap size={20} color="var(--primary-teal)" />
                    <div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Available Balance</p>
                        <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-teal)' }}>{availablePoints.toLocaleString()} pts</p>
                    </div>
                </div>
            </div>

            {/* Tab Switcher */}
            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-teal)', paddingBottom: '0.5rem' }}>
                <button
                    onClick={() => setActiveMainTab('CATALOG')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeMainTab === 'CATALOG' ? '3px solid var(--primary-teal)' : '3px solid transparent',
                        color: activeMainTab === 'CATALOG' ? 'var(--primary-teal)' : 'var(--text-dim)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.3s'
                    }}
                >
                    Browse Catalog
                </button>
                <button
                    onClick={() => setActiveMainTab('HISTORY')}
                    style={{
                        padding: '0.5rem 1rem',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeMainTab === 'HISTORY' ? '3px solid var(--primary-teal)' : '3px solid transparent',
                        color: activeMainTab === 'HISTORY' ? 'var(--primary-teal)' : 'var(--text-dim)',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.3s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}
                >
                    My Claims
                    {redemptions.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length > 0 && (
                        <span style={{ padding: '0.1rem 0.4rem', background: 'var(--primary-teal)', color: 'white', borderRadius: '50px', fontSize: '0.7rem' }}>
                            {redemptions.filter(r => r.status === 'PENDING' || r.status === 'PROCESSING').length}
                        </span>
                    )}
                </button>
            </div>

            {activeMainTab === 'CATALOG' ? (
                rewards.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                        {rewards.map((reward) => (
                            <div key={reward.id} className="glass-pane glass-pane-hover" style={{ overflow: 'hidden', paddingTop: '1.5rem', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                                    <img
                                        src={reward.imageUrl || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=400'}
                                        alt={reward.name}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                    <div style={{
                                        position: 'absolute',
                                        top: '1rem',
                                        right: '1rem',
                                        padding: '0.5rem 1rem',
                                        background: 'rgba(8, 71, 78, 0.9)',
                                        backdropFilter: 'blur(4px)',
                                        borderRadius: 'var(--radius-md)',
                                        color: '#ffffff',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        border: '1px solid rgba(255,255,255,0.2)'
                                    }}>
                                        {reward.pointCost.toLocaleString()} PTS
                                    </div>
                                </div>

                                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                                    <h3 style={{ marginBottom: '0.5rem', fontWeight: 600 }}>{reward.name}</h3>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                                        {reward.description}
                                    </p>

                                    <button
                                        onClick={() => handleRedeem(reward.id)}
                                        disabled={availablePoints < reward.pointCost || isRedeeming !== null}
                                        style={{
                                            width: '100%',
                                            padding: '1rem',
                                            marginTop: 'auto',
                                            background: availablePoints >= reward.pointCost ? 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)' : '#f1f5f9',
                                            color: availablePoints >= reward.pointCost ? '#ffffff' : '#94a3b8',
                                            borderRadius: 'var(--radius-md)',
                                            fontWeight: 700,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '0.5rem',
                                            opacity: availablePoints >= reward.pointCost ? 1 : 0.7,
                                            cursor: availablePoints >= reward.pointCost ? 'pointer' : 'not-allowed',
                                            transition: 'all 0.3s ease',
                                            border: 'none',
                                            boxShadow: availablePoints >= reward.pointCost ? '0 4px 10px rgba(8, 71, 78, 0.2)' : 'none'
                                        }}
                                    >
                                        {isRedeeming === reward.id ? (
                                            <Loader2 size={20} className="animate-spin" />
                                        ) : (
                                            <ShoppingBag size={20} />
                                        )}
                                        {availablePoints >= reward.pointCost ? 'Redeem Now' : 'Insufficient Points'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-pane" style={{ padding: 'clamp(2rem, 8vw, 5rem)', textAlign: 'center', color: 'var(--text-dim)' }}>
                        <Gift size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h3>Catalog empty</h3>
                        <p>No rewards are currently available. Check back soon!</p>
                    </div>
                )
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {redemptions.length > 0 ? (
                        redemptions.map((redemption) => (
                            <div key={redemption.id} className="glass-pane" style={{ padding: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                                <div style={{ height: '80px', width: '80px', borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}>
                                    <img src={redemption.reward.imageUrl || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=400'} alt={redemption.reward.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                </div>
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <h4 style={{ fontWeight: 700, marginBottom: '0.2rem' }}>{redemption.reward.name}</h4>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Claimed on {new Date(redemption.createdAt).toLocaleDateString()}</p>
                                    {redemption.notes && (
                                        <div style={{ marginTop: '0.8rem', padding: '0.6rem 1rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--primary-teal)' }}>
                                            <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                                                <strong>Note:</strong> {redemption.notes}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                <div style={{ textAlign: 'right', minWidth: '120px' }}>
                                    <span style={{
                                        padding: '0.4rem 0.8rem',
                                        borderRadius: '50px',
                                        fontSize: '0.75rem',
                                        fontWeight: 700,
                                        textTransform: 'uppercase',
                                        background: redemption.status === 'PENDING' ? '#fef3c7' : redemption.status === 'PROCESSING' ? '#dbeafe' : redemption.status === 'DISPATCHED' ? '#dcfce7' : '#fee2e2',
                                        color: redemption.status === 'PENDING' ? '#92400e' : redemption.status === 'PROCESSING' ? '#1e40af' : redemption.status === 'DISPATCHED' ? '#166534' : '#991b1b'
                                    }}>
                                        {redemption.status}
                                    </span>
                                    <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-dim)' }}>{redemption.reward.pointCost.toLocaleString()} PTS</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="glass-pane" style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                            <ShoppingBag size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
                            <h3>No claims yet</h3>
                            <p>Once you redeem a reward, you can track its fulfillment status here.</p>
                            <button onClick={() => setActiveMainTab('CATALOG')} style={{ marginTop: '1.5rem', background: 'var(--primary-teal)', color: 'white', border: 'none', padding: '0.8rem 1.5rem', borderRadius: 'var(--radius-md)', fontWeight: 700, cursor: 'pointer' }}>
                                View Catalog
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Rewards;
