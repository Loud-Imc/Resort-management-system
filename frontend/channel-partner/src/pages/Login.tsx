import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LogIn, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import ForgotPassword from '../components/auth/ForgotPassword';
import logo from '../assets/routeguide.svg';

type ErrorField = 'email' | 'password' | 'general' | null;

function parseLoginError(err: any): { message: string; field: ErrorField } {
    const raw: string =
        err?.response?.data?.message ||
        err?.message ||
        'Something went wrong. Please try again.';

    const msg = Array.isArray(raw) ? raw[0] : raw;
    const lower = msg.toLowerCase();

    if (lower.includes('inactive')) {
        return { message: 'Your account has been deactivated. Please contact support.', field: 'general' };
    }
    if (lower.includes('not found') || lower.includes('no account')) {
        return { message: 'No account found with that email or phone number.', field: 'email' };
    }
    if (lower.includes('invalid credentials') || lower.includes('password')) {
        return { message: 'Incorrect password. Please try again.', field: 'password' };
    }
    if (lower.includes('otp')) {
        return { message: 'This account uses OTP login. Password login is not available.', field: 'general' };
    }
    if (lower.includes('access denied') || lower.includes('channel partner')) {
        return { message: 'Access denied. This portal is for Channel Partners only.', field: 'general' };
    }
    return { message: msg, field: 'general' };
}

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [errorField, setErrorField] = useState<ErrorField>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setErrorField(null);
        setIsLoading(true);

        try {
            const response: any = await api.post('/auth/login', { email, password });
            const userRoles = response.user.roles || [response.user.role];

            if (!userRoles.includes('ChannelPartner') && !userRoles.includes('SuperAdmin')) {
                throw new Error('Access denied. This portal is for Channel Partners only.');
            }

            login(response.accessToken, response.user);
            navigate('/');
        } catch (err: any) {
            const { message, field } = parseLoginError(err);
            setError(message);
            setErrorField(field);
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
                <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                    <img
                        src={logo}
                        alt="Route Guide"
                        style={{
                            height: '64px',
                            width: 'auto',
                            objectFit: 'contain'
                        }}
                    />
                </div>

                {isForgotPassword ? (
                    <ForgotPassword onBack={() => setIsForgotPassword(false)} />
                ) : (
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {error && (
                            <div style={{
                                padding: '0.8rem 1rem',
                                borderRadius: 'var(--radius-sm)',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                fontSize: '0.875rem',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                            }}>
                                <AlertCircle size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                                <span>{error}</span>
                            </div>
                        )}

                        <div style={{ position: 'relative', textAlign: 'left' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Email or Phone Number</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errorField === 'email') { setError(''); setErrorField(null); }
                                    }}
                                    placeholder="Email or Phone Number"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 1rem 0.8rem 3rem',
                                        background: '#ffffff',
                                        border: errorField === 'email' ? '1px solid #f87171' : '1px solid var(--border-glass)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-main)',
                                        outline: 'none',
                                        transition: 'border-color 0.2s',
                                        boxShadow: errorField === 'email' ? '0 0 0 2px rgba(248,113,113,0.2)' : 'none',
                                    }}
                                    className="glass-pane-hover"
                                />
                                {errorField === 'email' && (
                                    <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                        <AlertCircle size={12} /> No account found with that email or phone number.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div style={{ position: 'relative', textAlign: 'left' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errorField === 'password') { setError(''); setErrorField(null); }
                                    }}
                                    placeholder="••••••••"
                                    required
                                    style={{
                                        width: '100%',
                                        padding: '0.8rem 3rem 0.8rem 3rem',
                                        background: '#ffffff',
                                        border: errorField === 'password' ? '1px solid #f87171' : '1px solid var(--border-glass)',
                                        borderRadius: 'var(--radius-md)',
                                        color: 'var(--text-main)',
                                        outline: 'none',
                                        boxShadow: errorField === 'password' ? '0 0 0 2px rgba(248,113,113,0.2)' : 'none',
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
                            {errorField === 'password' && (
                                <p style={{ color: '#ef4444', fontSize: '0.75rem', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <AlertCircle size={12} /> Incorrect password. Please try again.
                                </p>
                            )}
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

                        <div style={{ marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={() => setIsForgotPassword(true)}
                                style={{ background: 'none', color: 'var(--primary-teal)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                                Forgot Password?
                            </button>
                        </div>
                    </form>
                )}

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
