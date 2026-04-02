import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DeleteAccount() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(localStorage.getItem('cp_token'));
    const [user, setUser] = useState<any>(localStorage.getItem('cp_user') ? JSON.parse(localStorage.getItem('cp_user')!) : null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            localStorage.setItem('cp_token', urlToken);
            setToken(urlToken);
            fetchUser(urlToken);
        }
    }, [searchParams]);

    const fetchUser = async (authToken: string) => {
        setIsLoadingUser(true);
        try {
            const data = await api.get('/users/me', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            localStorage.setItem('cp_user', JSON.stringify(data));
            setUser(data);
        } catch (err) {
            toast.error('Session expired. Please log in again.');
            localStorage.removeItem('cp_token');
            localStorage.removeItem('cp_user');
            setToken(null);
            setUser(null);
        } finally {
            setIsLoadingUser(false);
        }
    };

    const [confirmed, setConfirmed] = useState(false);
    const [success, setSuccess] = useState(false);

    const deleteAccountMutation = useMutation({
        mutationFn: () => api.delete('/users/me'),
        onSuccess: () => {
            setSuccess(true);
            localStorage.removeItem('cp_token');
            localStorage.removeItem('cp_user');
            toast.success('Account deletion successful');
        },
        onError: (error: any) => {
            const errorMsg = error?.message || 'Failed to delete account';
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        }
    });

    if (success) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-dark)',
                padding: '2rem'
            }}>
                <div className="glass-pane animate-fade-in" style={{
                    maxWidth: '440px',
                    width: '100%',
                    padding: '3rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem'
                    }}>
                        <CheckCircle size={40} color="#10b981" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Account Deactivated</h2>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                        Your Channel Partner account has been successfully deactivated and rewards have been frozen.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'var(--primary-teal)',
                            color: '#fff',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            letterSpacing: '1px'
                        }}
                    >
                        RETURN TO LOGIN
                    </button>
                </div>
            </div>
        );
    }

    if (isLoadingUser) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)' }}>
                <Loader2 size={40} className="animate-spin" color="var(--primary-teal)" />
            </div>
        );
    }

    if (!token || !user) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-dark)',
                padding: '2rem'
            }}>
                <div className="glass-pane animate-fade-in" style={{
                    maxWidth: '440px',
                    width: '100%',
                    padding: '3rem',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'var(--primary-teal-glow)',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 2rem'
                    }}>
                        <ShieldAlert size={40} color="var(--primary-teal)" />
                    </div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '1rem' }}>Authentication Required</h2>
                    <p style={{ color: 'var(--text-dim)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
                        Please log in to your Channel Partner account to proceed with deletion.
                    </p>
                    <button
                        onClick={() => navigate('/login?redirect=/delete-account')}
                        style={{
                            width: '100%',
                            padding: '1rem',
                            background: 'var(--primary-teal)',
                            color: '#fff',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            letterSpacing: '1px'
                        }}
                    >
                        LOGIN TO CONTINUE
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', paddingTop: '5rem', paddingBottom: '3rem', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
            <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <div className="glass-pane animate-fade-in" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '3rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                            <div style={{
                                width: '80px',
                                height: '80px',
                                background: 'rgba(239, 68, 68, 0.1)',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 1.5rem'
                            }}>
                                <AlertTriangle size={40} color="#ef4444" />
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>Delete Partner Account</h2>
                            <p style={{ color: 'var(--text-dim)', fontWeight: 500 }}>Logged in as {user.firstName} {user.lastName}</p>
                        </div>

                        <div style={{
                            marginBottom: '3rem',
                            background: 'rgba(239, 68, 68, 0.05)',
                            borderRadius: 'var(--radius-lg)',
                            padding: '2rem',
                            border: '1px solid rgba(239, 68, 68, 0.1)'
                        }}>
                            <h3 style={{ fontWeight: 700, color: '#ef4444', fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <ShieldAlert size={20} />
                                Important Partner Information:
                            </h3>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                {[
                                    'All your referral codes will be permanently disabled immediately.',
                                    'You will lose access to all pending rewards and payout history.',
                                    'Your personal data (name, phone, email) will be anonymized.',
                                    'This action cannot be undone.'
                                ].map((item, idx) => (
                                    <li key={idx} style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', color: 'var(--text-dim)', fontSize: '0.9rem', fontWeight: 500 }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginTop: '0.5rem', flexShrink: 0 }} />
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <label style={{ display: 'flex', gap: '1rem', cursor: 'pointer', alignItems: 'flex-start' }}>
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    style={{ width: '20px', height: '20px', marginTop: '0.2rem', accentColor: '#ef4444' }}
                                />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.5' }}>
                                    I confirm that I want to terminate my Channel Partner account and I understand that all my rewards and codes will be lost.
                                </span>
                            </label>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button
                                    onClick={() => navigate('/')}
                                    style={{
                                        flex: 1,
                                        padding: '1rem',
                                        background: 'var(--bg-card-hover)',
                                        color: 'var(--text-dim)',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        letterSpacing: '1px'
                                    }}
                                >
                                    CANCEL
                                </button>
                                <button
                                    onClick={() => deleteAccountMutation.mutate()}
                                    disabled={!confirmed || deleteAccountMutation.isPending}
                                    style={{
                                        flex: 2,
                                        padding: '1rem',
                                        background: confirmed ? '#ef4444' : '#ef444480',
                                        color: '#fff',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 700,
                                        fontSize: '0.8rem',
                                        letterSpacing: '1px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '0.5rem',
                                        cursor: confirmed ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    {deleteAccountMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : 'CONFIRM ACCOUNT DELETION'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
