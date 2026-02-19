import React, { useEffect, useState } from 'react';
import { ShoppingBag, Zap, Gift, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Reward {
    id: string;
    name: string;
    pointCost: number;
    description: string;
    image: string;
}

const Rewards: React.FC = () => {
    const [rewards, setRewards] = useState<Reward[]>([]);
    const [availablePoints, setAvailablePoints] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isRedeeming, setIsRedeeming] = useState<string | null>(null);

    const fetchData = async () => {
        try {
            const [rewardsRes, statsRes]: any = await Promise.all([
                api.get('/marketing/rewards'),
                api.get('/channel-partners/me/stats')
            ]);
            setRewards(rewardsRes);
            setAvailablePoints(statsRes.availablePoints);
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Exclusive Rewards</h1>
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

            {rewards.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                    {rewards.map((reward) => (
                        <div key={reward.id} className="glass-pane glass-pane-hover" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ height: '200px', overflow: 'hidden', position: 'relative' }}>
                                <img
                                    src={reward.image || 'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&q=80&w=400'}
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
                <div className="glass-pane" style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <Gift size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <h3>Catalog empty</h3>
                    <p>No rewards are currently available. Check back soon!</p>
                </div>
            )}
        </div>
    );
};

export default Rewards;
