import React, { useState } from 'react';
import { X, CreditCard, Loader2, Wallet, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface WalletTopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (newBalance: number) => void;
}

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000];

const WalletTopUpModal: React.FC<WalletTopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [topUpAmount, setTopUpAmount] = useState<number>(1000);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

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
                        const verifiedResponse: any = await api.post('/channel-partners/me/top-up/verify', {
                            razorpayOrderId: response.razorpay_order_id,
                            razorpayPaymentId: response.razorpay_payment_id,
                            razorpaySignature: response.razorpay_signature,
                            amount: topUpAmount,
                        });

                        if (onSuccess) {
                            onSuccess(Number(verifiedResponse.walletBalance || 0));
                        }
                        onClose();
                    } catch (e: any) {
                        setError(e?.message || 'Payment verification failed');
                        setIsProcessing(false);
                    }
                },
                modal: {
                    ondismiss: () => {
                        setIsProcessing(false);
                    }
                },
                prefill: {},
                theme: { color: '#08474e' },
            };

            const razorpay = new (window as any).Razorpay(options);
            razorpay.open();
        } catch (e: any) {
            setError(e?.response?.data?.message || e?.message || 'Failed to initiate payment');
            setIsProcessing(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(8px)',
        }} onClick={onClose}>
            <div style={{
                width: '100%',
                maxWidth: '450px',
                background: '#fff',
                borderRadius: '1.5rem',
                position: 'relative',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                animation: 'slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
            }} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ padding: '0.6rem', borderRadius: '12px', background: 'rgba(8,71,78,0.08)', color: 'var(--primary-teal)' }}>
                            <Wallet size={20} />
                        </div>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>Add Money to Wallet</h3>
                    </div>
                    <button onClick={onClose} style={{ border: 'none', background: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '0.5rem' }}>
                        <X size={24} />
                    </button>
                </div>

                <div style={{ padding: '2rem' }}>
                    {error && (
                        <div style={{
                            padding: '1rem',
                            background: 'rgba(239,68,68,0.06)',
                            border: '1px solid rgba(239,68,68,0.2)',
                            borderRadius: '1rem',
                            color: '#ef4444',
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            marginBottom: '1.5rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.6rem'
                        }}>
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                        Add funds to your partner wallet to enable faster booking confirmations and upfront commission benefits.
                    </p>

                    {/* Presets */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.5rem' }}>
                        {PRESET_AMOUNTS.map((amt) => (
                            <button
                                key={amt}
                                onClick={() => {
                                    setTopUpAmount(amt);
                                    setError(null);
                                }}
                                style={{
                                    flex: '1 0 30%',
                                    padding: '0.6rem 0.5rem',
                                    borderRadius: '0.75rem',
                                    border: topUpAmount === amt ? '2px solid var(--primary-teal)' : '1px solid var(--border-glass)',
                                    background: topUpAmount === amt ? 'rgba(8,71,78,0.05)' : 'transparent',
                                    color: topUpAmount === amt ? 'var(--primary-teal)' : 'var(--text-dim)',
                                    fontWeight: 700,
                                    fontSize: '0.85rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                ₹{amt.toLocaleString()}
                            </button>
                        ))}
                    </div>

                    {/* Custom Input */}
                    <div style={{ position: 'relative', marginBottom: '2rem' }}>
                        <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: 'var(--primary-teal)', fontSize: '1.2rem' }}>₹</span>
                        <input
                            type="number"
                            value={topUpAmount}
                            onChange={(e) => {
                                setTopUpAmount(Number(e.target.value));
                                setError(null);
                            }}
                            placeholder="Enter amount"
                            min={100}
                            style={{
                                width: '100%',
                                padding: '1rem 1.25rem 1rem 2.8rem',
                                border: '1px solid var(--border-glass)',
                                borderRadius: '1rem',
                                background: 'rgba(0,0,0,0.02)',
                                fontSize: '1.2rem',
                                fontWeight: 800,
                                outline: 'none',
                                boxSizing: 'border-box',
                                transition: 'border-color 0.2s',
                                color: 'var(--text-main)'
                            }}
                            onFocus={(e) => e.target.parentElement!.style.borderColor = 'var(--primary-teal)'}
                            onBlur={(e) => e.target.parentElement!.style.borderColor = 'var(--border-glass)'}
                        />
                        <p style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.7rem', fontWeight: 900, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>INR</p>
                    </div>

                    <button
                        onClick={handleTopUp}
                        disabled={isProcessing}
                        style={{
                            width: '100%',
                            padding: '1.25rem',
                            background: 'var(--primary-teal)',
                            color: '#ffffff',
                            fontWeight: 800,
                            borderRadius: '1rem',
                            border: 'none',
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                            opacity: isProcessing ? 0.8 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            fontSize: '1.1rem',
                            boxShadow: '0 10px 20px rgba(8, 71, 78, 0.15)',
                            transition: 'all 0.3s'
                        }}
                        className="hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <CreditCard size={20} />}
                        {isProcessing ? 'Connecting...' : `Proceed to Pay ₹${topUpAmount.toLocaleString()}`}
                    </button>

                    <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Secured by Razorpay</p>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes slide-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
};

export default WalletTopUpModal;
