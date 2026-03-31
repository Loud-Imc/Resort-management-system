import { Wallet, ArrowUpRight, ArrowDownLeft, Plus, Loader2, CreditCard, Download, Send } from 'lucide-react';
import api from '../services/api';
import { useEffect, useState } from 'react';

interface Transaction {
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];
const WALLET_TYPES = ['WALLET_TOPUP', 'PAYOUT', 'WALLET_PAYMENT', 'REFUND'];
const COMMISSION_TYPES = ['COMMISSION'];

const Wallet2Page: React.FC = () => {
    const [walletBalance, setWalletBalance] = useState<number>(0);
    const [pendingEarnings, setPendingEarnings] = useState<number>(0);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [topUpAmount, setTopUpAmount] = useState<number>(1000);
    const [payoutAmount, setPayoutAmount] = useState<number>(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'wallet' | 'commissions'>('wallet');

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
            setPendingEarnings(Number(stats.pendingBalance || 0));
            setTransactions(txs || []);
            setPayoutAmount(Math.floor(Number(stats.walletBalance || 0)));
        } catch (err: any) {
            setError('Failed to load wallet data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClaimEarnings = async () => {
        if (pendingEarnings <= 0) return;

        setIsProcessing(true);
        setError(null);
        try {
            await api.post('/channel-partners/me/claim-earnings', { amount: pendingEarnings });
            setSuccess(`Successfully claimed ₹${pendingEarnings.toLocaleString()} to your wallet!`);
            loadData();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to claim earnings');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRequestPayout = async () => {
        if (payoutAmount < 100) {
            setError('Minimum payout request is ₹100');
            return;
        }

        setIsProcessing(true);
        setError(null);
        try {
            await api.post('/channel-partners/me/redemption-request', { amount: payoutAmount });
            setSuccess(`Payout request for ₹${payoutAmount.toLocaleString()} submitted successfully!`);
            loadData();
        } catch (e: any) {
            setError(e?.response?.data?.message || 'Failed to submit payout request');
        } finally {
            setIsProcessing(false);
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
            const order: any = await api.post('/channel-partners/me/top-up/initiate', { amount: topUpAmount });
            const options = {
                key: order.keyId,
                amount: order.amount,
                currency: order.currency,
                name: 'CP Wallet Top-Up',
                description: `Adding ₹${topUpAmount} to your wallet`,
                order_id: order.orderId,
                handler: async (response: any) => {
                    try {
                        await api.post('/channel-partners/me/top-up/verify', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            amount: topUpAmount,
                        });
                        setSuccess(`₹${topUpAmount.toLocaleString()} added to your wallet!`);
                        loadData();
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
                <p style={{ color: 'var(--text-dim)' }}>Manage your earnings, wallet balance, and withdrawals.</p>
            </div>

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-pane" style={{
                        padding: '2.5rem',
                        background: 'linear-gradient(135deg, rgba(8,71,78,0.15) 0%, rgba(12,106,117,0.08) 100%)',
                        border: '1px solid var(--border-teal)',
                        position: 'relative',
                        overflow: 'hidden',
                    }}>
                        <div style={{ position: 'absolute', top: -30, right: -30, width: '150px', height: '150px', background: 'radial-gradient(circle, rgba(8,71,78,0.12) 0%, transparent 70%)', borderRadius: '50%' }} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ padding: '0.8rem', borderRadius: 'var(--radius-md)', background: 'rgba(8,71,78,0.1)', color: 'var(--primary-teal)', border: '1px solid var(--border-teal)' }}>
                                    <Wallet size={24} />
                                </div>
                                <div>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>Wallet Balance</p>
                                    <h2 className="text-premium-gradient" style={{ fontSize: '2.8rem', fontWeight: 700, lineHeight: 1.1 }}>
                                        ₹{walletBalance.toLocaleString()}
                                    </h2>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ color: 'var(--text-dim)', fontSize: '0.8rem', fontWeight: 500 }}>Unclaimed Commissions</p>
                                    <p style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--primary-teal)' }}>₹{pendingEarnings.toLocaleString()}</p>
                                </div>
                                {pendingEarnings > 0 && (
                                    <button
                                        onClick={handleClaimEarnings}
                                        disabled={isProcessing}
                                        className="btn-premium-sm"
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                                    >
                                        <Download size={14} /> Claim to Wallet
                                    </button>
                                )}
                            </div>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '1rem' }}>Spendable balance for bookings or bank redemption.</p>
                    </div>

                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Transaction History</h3>
                            <div style={{ display: 'flex', background: 'rgba(8,71,78,0.05)', padding: '0.25rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-glass)' }}>
                                <button
                                    onClick={() => setActiveTab('wallet')}
                                    style={{
                                        padding: '0.4rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: activeTab === 'wallet' ? 'var(--primary-teal)' : 'transparent',
                                        color: activeTab === 'wallet' ? '#ffffff' : 'var(--text-dim)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Wallet History
                                </button>
                                <button
                                    onClick={() => setActiveTab('commissions')}
                                    style={{
                                        padding: '0.4rem 1rem',
                                        borderRadius: 'var(--radius-sm)',
                                        background: activeTab === 'commissions' ? 'var(--primary-teal)' : 'transparent',
                                        color: activeTab === 'commissions' ? '#ffffff' : 'var(--text-dim)',
                                        fontSize: '0.85rem',
                                        fontWeight: 600,
                                        border: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Commission History
                                </button>
                            </div>
                        </div>

                        {transactions.filter(tx => activeTab === 'wallet' ? WALLET_TYPES.includes(tx.type) : COMMISSION_TYPES.includes(tx.type)).length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-dim)' }}>
                                <p>No {activeTab} transactions yet.</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {transactions
                                    .filter(tx => activeTab === 'wallet' ? WALLET_TYPES.includes(tx.type) : COMMISSION_TYPES.includes(tx.type))
                                    .map((tx) => {
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

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Redeemption / Payout Section */}
                    <div className="glass-pane" style={{ padding: '2rem', border: '1px solid var(--border-teal)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(8,71,78,0.08)', color: 'var(--primary-teal)', border: '1px solid var(--border-teal)' }}>
                                <Send size={20} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Request Payout</h3>
                        </div>

                        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                            Transfer money from your wallet to your registered bank account.
                        </p>

                        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--primary-teal)', fontSize: '1.1rem' }}>₹</span>
                            <input
                                type="number"
                                value={payoutAmount}
                                onChange={(e) => setPayoutAmount(Number(e.target.value))}
                                max={walletBalance}
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
                            onClick={handleRequestPayout}
                            disabled={isProcessing || walletBalance < 100}
                            style={{
                                width: '100%',
                                padding: '1rem',
                                background: 'var(--primary-teal)',
                                color: '#ffffff',
                                fontWeight: 700,
                                borderRadius: 'var(--radius-md)',
                                border: 'none',
                                cursor: (isProcessing || walletBalance < 100) ? 'not-allowed' : 'pointer',
                                opacity: (isProcessing || walletBalance < 100) ? 0.7 : 1,
                                fontSize: '1rem',
                                transition: 'all 0.2s',
                            }}
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Submit Payout Request'}
                        </button>
                        {walletBalance < 100 && (
                            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.5rem', textAlign: 'center' }}>
                                Minimum payout balance required: ₹100
                            </p>
                        )}
                    </div>

                    <div className="glass-pane" style={{ padding: '2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            <div style={{ padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(8,71,78,0.08)', color: 'var(--primary-teal)', border: '1px solid var(--border-teal)' }}>
                                <Plus size={20} />
                            </div>
                            <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>Add Money</h3>
                        </div>

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
                                    }}
                                >
                                    ₹{amt.toLocaleString()}
                                </button>
                            ))}
                        </div>

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
                            }}
                        >
                            {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                            {isProcessing ? 'Opening Payment...' : `Pay ₹${topUpAmount.toLocaleString()} via Razorpay`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Wallet2Page;
