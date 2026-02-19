import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            const response: any = await api.post('/auth/login', { email, password });
            if (response.user.role !== 'ChannelPartner' && response.user.role !== 'SuperAdmin') {
                throw new Error('Access denied. This dashboard is for Channel Partners only.');
            }

            login(response.accessToken, response.user);
            navigate('/');
        } catch (err: any) {
            setError(err.message || 'Invalid email or password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top right, rgba(8, 71, 78, 0.05) 0%, transparent 40%), radial-gradient(circle at bottom left, rgba(8, 71, 78, 0.03) 0%, transparent 40%), #f1f5f9',
            padding: '2rem'
        }}>
            <div className="glass-pane animate-fade-in" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '3rem',
                textAlign: 'center'
            }}>
                <div style={{ marginBottom: '2.5rem' }}>
                    <h2 className="text-premium-gradient" style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Partner Access</h2>
                    <p style={{ color: 'var(--text-dim)' }}>Welcome back to the Route Guide network.</p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {error && (
                        <div style={{
                            padding: '0.8rem',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            fontSize: '0.9rem',
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ position: 'relative', textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="partner@example.com"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 1rem 0.8rem 3rem',
                                    background: '#ffffff',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-main)',
                                    outline: 'none',
                                    transition: 'border-color 0.2s'
                                }}
                                className="glass-pane-hover"
                            />
                        </div>
                    </div>

                    <div style={{ position: 'relative', textAlign: 'left' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                style={{
                                    width: '100%',
                                    padding: '0.8rem 3rem 0.8rem 3rem',
                                    background: '#ffffff',
                                    border: '1px solid var(--border-glass)',
                                    borderRadius: 'var(--radius-md)',
                                    color: 'var(--text-main)',
                                    outline: 'none'
                                }}
                                className="glass-pane-hover"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '1rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    color: 'var(--text-dim)'
                                }}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            padding: '1rem',
                            background: 'linear-gradient(135deg, var(--primary-teal) 0%, #0c6a75 100%)',
                            color: '#ffffff',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 700,
                            fontSize: '1rem',
                            marginTop: '1rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            boxShadow: '0 4px 15px rgba(8, 71, 78, 0.2)',
                            opacity: isLoading ? 0.7 : 1,
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        {isLoading ? 'Authenticating...' : (
                            <>
                                <LogIn size={20} />
                                Sign In
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '2rem', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                    Don't have a partner account? {' '}
                    <button
                        onClick={() => navigate('/register')}
                        style={{ background: 'none', color: 'var(--primary-teal)', fontWeight: 600 }}
                    >
                        Apply Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
