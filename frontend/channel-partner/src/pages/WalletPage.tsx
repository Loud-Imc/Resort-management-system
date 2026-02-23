import React, { useEffect, useState } from 'react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Loader2, CreditCard } from 'lucide-react';
import api from '../services/api';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const Wallet2Page: React.FC = () => {
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [topUpAmount, setTopUpAmount] = useState<number>(1000);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [stats, txs]: any = await Promise.all([
                api.get('/channel-partners/me/stats'),
                api.get('/channel-partners/me/transactions'),
            ]);
            setWalletBalance(Number(stats.walletBalance || 0));
            setTransactions(txs || []);
        } catch (err: any) {
            setError('Failed to load wallet data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTopUp = async () => {
        if (!topUpAmount || topUpAmount < 100) {
            setError('Minimum top-up amount is ₹100');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            // Step 1: Initiate Razorpay order
            const order: any = await api.post('/channel-partners/me/top-up/initiate', { amount: topUpAmount });

            // Step 2: Open Razorpay checkout
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'CP Wallet Top-Up',
                description: `Adding ₹${topUpAmount} to your wallet`,
                order_id: order.orderId,
                handler: async (response: any) => {
                    try {
                        // Step 3: Verify and credit wallet
                        await api.post('/channel-partners/me/top-up/verify', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            amount: topUpAmount,
                        });
                        setSuccess(`₹${topUpAmount.toLocaleString()} added to your wallet!`);
                        loadData(); // Refresh data
                    } catch (e: any) {
                        setError(e?.message || 'Payment verification failed');
                    }
                },
                prefill: {},
                theme: { color: '#08474e' },
            };

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (e: any) {
            setError(e?.message || 'Failed to initiate payment');
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
                <Loader2 size={32} className="animate-spin" color="var(--primary-teal)" />
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div>
                <h1 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700 }}>Wallet</h1>
                <p style={{ color: 'var(--text-dim)' }}>Manage your wallet balance and transactions.</p>
            </div>

            {/* Feedback Banners */}
            {error && (
                <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontWeight: 600 }}>
                    {error}
                </div>
            )}
            {success && (
                <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--radius-md)', color: '#10b981', fontWeight: 600 }}>
                    {success}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
                {/* Left: Balance + Transactions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Balance Card */}
                    <div className="glass-pane" style={{
                        padding: '2.5rem',
                        background: 'linear-gradient(135deg, rgba(8,71,78,0.15) 0%, rgba(12,106,117,0.08) 100%)',
                        border: '1px solid var(--border-teal)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(8,71,78,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                            <div style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'rgba(8,71,78,0.1)', color: 'var(--primary-teal)', border: '1px solid var(--border-teal)' }}>
                                <Wallet size={24} />
                            </div>
                            <div>
                                <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>Available Balance</p>
                                <h2 className="text-premium-gradient" style={{ fontSize: '2.8rem', fontWeight: 700, lineHeight: 1.1 }}>
                                    ₹{walletBalance.toLocaleString()}
                                </h2>
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Can be used for inline bookings. Commission deducted upfront when paying by wallet.</p>
                    </div>

                    {/* Transaction History */}
                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.2rem', fontWeight: 700 }}>Transaction History</h3>
                        {transactions.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                                <p>No transactions yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {transactions.map((tx) => {
                                    const isCredit = Number(tx.amount) > 0;
                                    return (
                                        <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.5)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-glass)' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                <div style={{ padding: '0.5rem', borderRadius: '50%', background: isCredit ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: isCredit ? '#10b981' : '#ef4444' }}>
                                                    {isCredit ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                                                </div>
                                                <div>
                                                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{tx.description}</p>
                                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.75rem' }}>{new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <p style={{ fontWeight: 700, color: isCredit ? '#10b981' : '#ef4444', fontSize: '1rem' }}>
                                                    {isCredit ? '+' : ''}₹{Math.abs(Number(tx.amount)).toLocaleString()}
                                                </p>
                                                <p style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'capitalize' }}>{tx.status.toLowerCase()}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Top-Up Panel */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(8,71,78,0.08)', color: 'var(--primary-teal)', border: '1px solid var(--border-teal)' }}>
                                <Plus size={20} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Money</h3>
                        </div>

                        {/* Preset Amounts */}
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '0.75rem', fontWeight: 500 }}>Quick Select</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            {PRESET_AMOUNTS.map((amt) => (
                                <button
                                    key={amt}
                                    onClick={() => setTopUpAmount(amt)}
                                    style={{
                                        padding: '0.5rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        border: topUpAmount === amt ? '2px solid var(--primary-teal)' : '1px solid var(--border-glass)',
                                        background: topUpAmount === amt ? 'rgba(8,71,78,0.1)' : 'transparent',
                                        color: topUpAmount === amt ? 'var(--primary-teal)' : 'var(--text-dim)',
                                        fontWeight: 700,
                                        fontSize: '0.85rem',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    ₹{amt.toLocaleString()}
                                </button>
                            ))}
                        </div>

                        {/* Custom Amount */}
                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '0.5rem', fontWeight: 500 }}>Custom Amount</p>
                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--primary-teal)', fontSize: '1.1rem' }}>₹</span>
                            <input
                                type="number"
                                value={topUpAmount}
                                onChange={(e) => setTopUpAmount(Number(e.target.value))}
                                min={100}
                                style={{
                                    width: '100%',
                                    padding: '0.9rem 1rem 0.9rem 2.5rem',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'rgba(255,255,255,0.5)',
                                    fontSize: '1.1rem',
                                    fontWeight: 700,
                                    outline: 'none',
                                    boxSizing: 'border-box',
                                }}
                            />
                        </div>

                        <button
                            onClick={handleTopUp}
                            disabled={isProcessing}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                                color: '#ffffff',
                                fontWeight: 700,
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                cursor: isProcessing ? 'not-allowed' : 'pointer',
                                opacity: isProcessing ? 0.7 : 1,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                                boxShadow: '0 4px 12px rgba(8,71,78,0.2)',
                            }}
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                            {isProcessing ? 'Opening Payment...' : `Pay ₹${topUpAmount.toLocaleString()} via Razorpay`}
                        </button>

                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '1rem', textAlign: 'center' }}>
                            Secure payment powered by Razorpay
                        </p>
                    </div>

                    {/* Info Box */}
                    <div className="glass-pane" style={{ padding: '1.5rem', border: '1px solid var(--border-teal)', background: 'rgba(8,71,78,0.05)' }}>
                        <h4 style={{ marginBottom: '0.75rem', fontSize: '0.95rem', fontWeight: 700, color: 'var(--primary-teal)' }}>How Wallet Works</h4>
                        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {[
                                'Pay via Razorpay to top up instantly.',
                                'Use wallet to book for customers.',
                                'Commission (10%) deducted upfront on wallet bookings.',
                                'Online payment? Commission credited after guest check-in.',
                            ].map((item, i) => (
                                <li key={i} style={{ fontSize: '0.82rem', color: 'var(--text-dim)', display: 'flex', gap: '0.5rem' }}>
                                    <span style={{ color: 'var(--primary-teal)', fontWeight: 700 }}>•</span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallet2Page;
