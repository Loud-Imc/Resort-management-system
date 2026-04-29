import React, { useState } from 'react';
import { Loader2, ArrowLeft, Mail, ShieldCheck, Lock } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

interface ForgotPasswordProps {
    onBack: () => void;
}

type Step = 'IDENTIFIER' | 'OTP' | 'RESET';

export default function ForgotPassword({ onBack }: ForgotPasswordProps) {
    const [step, setStep] = useState<Step>('IDENTIFIER');
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password/request', { identifier });
            toast.success('Verification code sent!');
            setStep('OTP');
        } catch (error: any) {
            toast.error(error.message || 'Failed to send verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password/verify', { identifier, code: otp });
            toast.success('Code verified!');
            setStep('RESET');
        } catch (error: any) {
            toast.error(error.message || 'Invalid verification code');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password/reset', { identifier, code: otp, newPassword });
            toast.success('Password reset successfully! Please login with your new password.');
            onBack();
        } catch (error: any) {
            toast.error(error.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    const inputStyle = {
        width: '100%',
        padding: '0.8rem 1rem 0.8rem 3rem',
        background: '#ffffff',
        border: '1px solid var(--border-glass)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-main)',
        outline: 'none',
        transition: 'border-color 0.2s'
    };

    const buttonStyle = {
        width: '100%',
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
        border: 'none',
        cursor: 'pointer',
        opacity: isLoading ? 0.7 : 1
    };

    return (
        <div className="animate-fade-in" style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button 
                    onClick={onBack}
                    style={{ background: 'none', color: 'var(--text-dim)', padding: '0.5rem', borderRadius: '50%', cursor: 'pointer' }}
                    className="glass-pane-hover"
                >
                    <ArrowLeft size={18} />
                </button>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-teal)', margin: 0 }}>
                    {step === 'IDENTIFIER' && 'Forgot Password'}
                    {step === 'OTP' && 'Verify Code'}
                    {step === 'RESET' && 'New Password'}
                </h2>
            </div>

            {step === 'IDENTIFIER' && (
                <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', margin: 0 }}>
                        Enter your registered email or phone number to receive a verification code.
                    </p>
                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Email or Phone Number</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                style={inputStyle}
                                placeholder="Email or Phone Number"
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} style={buttonStyle}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Send Code'}
                    </button>
                </form>
            )}

            {step === 'OTP' && (
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', margin: 0 }}>
                        Code sent to <strong>{identifier}</strong>. Please enter it below.
                    </p>
                    <div style={{ position: 'relative' }}>
                        <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Verification Code</label>
                        <div style={{ position: 'relative' }}>
                            <ShieldCheck size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                style={{ ...inputStyle, textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem', paddingLeft: '1rem' }}
                                placeholder="000000"
                                required
                            />
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading || otp.length < 6} style={buttonStyle}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Verify Code'}
                    </button>
                    <button 
                        type="button" 
                        onClick={handleRequestOtp}
                        style={{ background: 'none', color: 'var(--primary-teal)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
                    >
                        Resend Code
                    </button>
                </form>
            )}

            {step === 'RESET' && (
                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-dim)', margin: 0 }}>
                        Create a strong new password for your account.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>New Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    style={inputStyle}
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '0.5rem', marginLeft: '0.5rem' }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    style={inputStyle}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <button type="submit" disabled={isLoading} style={buttonStyle}>
                        {isLoading ? <Loader2 size={20} className="animate-spin" /> : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
}
