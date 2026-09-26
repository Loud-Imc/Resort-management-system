import React, { useState } from 'react';
import { Loader2, ArrowLeft, Mail, ShieldCheck, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRequestOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/forgot-password/request', { identifier, portal: 'admin' });
            toast.success('Verification code sent to your registered email/phone!');
            setStep('OTP');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to send verification code';
            setError(Array.isArray(msg) ? msg[0] : msg);
            toast.error(Array.isArray(msg) ? msg[0] : msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await api.post('/auth/forgot-password/verify', { identifier, code: otp, portal: 'admin' });
            toast.success('Code verified successfully!');
            setStep('RESET');
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Invalid or expired verification code';
            setError(Array.isArray(msg) ? msg[0] : msg);
            toast.error(Array.isArray(msg) ? msg[0] : msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            toast.error('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters');
            toast.error('Password must be at least 6 characters');
            return;
        }
        setIsLoading(true);
        try {
            await api.post('/auth/forgot-password/reset', { identifier, code: otp, newPassword, portal: 'admin' });
            toast.success('Password reset successfully! Please sign in with your new password.');
            onBack();
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to reset password';
            setError(Array.isArray(msg) ? msg[0] : msg);
            toast.error(Array.isArray(msg) ? msg[0] : msg);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 mb-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    title="Back to login"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-foreground">
                    {step === 'IDENTIFIER' && 'Reset Admin Password'}
                    {step === 'OTP' && 'Verify Code'}
                    {step === 'RESET' && 'Set New Password'}
                </h2>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-3.5 rounded-lg border border-destructive/20 text-sm font-medium flex items-start gap-2.5">
                    <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {step === 'IDENTIFIER' && (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                        Enter your registered administrator email or phone number and we'll send you a verification code to reset your password.
                    </p>
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-2">
                            Email or Phone Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-muted-foreground opacity-60" />
                            </div>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => {
                                    setIdentifier(e.target.value);
                                    if (error) setError(null);
                                }}
                                className="w-full pl-11 pr-4 py-3 border border-border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-medium"
                                placeholder="admin@resort.com or +91..."
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !identifier.trim()}
                        className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-bold text-base hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Verification Code'}
                    </button>
                </form>
            )}

            {step === 'OTP' && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                        We've sent a 6-digit verification code to <span className="font-bold text-foreground">{identifier}</span>.
                    </p>
                    <div>
                        <label className="block text-sm font-semibold text-muted-foreground mb-2">
                            Verification Code
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <ShieldCheck className="h-5 w-5 text-muted-foreground opacity-60" />
                            </div>
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, ''));
                                    if (error) setError(null);
                                }}
                                className="w-full pl-11 pr-4 py-3 border border-border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-center text-2xl font-bold tracking-[0.4em]"
                                placeholder="000000"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || otp.length < 6}
                        className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-bold text-base hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Code'}
                    </button>
                    <p className="text-center text-xs text-muted-foreground">
                        Didn't receive the code?{' '}
                        <button
                            type="button"
                            onClick={handleRequestOtp}
                            className="text-primary font-bold hover:underline"
                        >
                            Resend Code
                        </button>
                    </p>
                </form>
            )}

            {step === 'RESET' && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                    <p className="text-sm text-muted-foreground">
                        Verification successful. Please enter your new administrator password below.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-muted-foreground mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted-foreground opacity-60" />
                                </div>
                                <input
                                    type={showNewPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={(e) => {
                                        setNewPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    className="w-full pl-11 pr-12 py-3 border border-border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-medium"
                                    placeholder="Min. 6 characters"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary transition-colors"
                                    tabIndex={-1}
                                    title={showNewPassword ? "Hide password" : "Show password"}
                                >
                                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-muted-foreground mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-muted-foreground opacity-60" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => {
                                        setConfirmPassword(e.target.value);
                                        if (error) setError(null);
                                    }}
                                    className="w-full pl-11 pr-12 py-3 border border-border bg-muted/50 text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-sm font-medium"
                                    placeholder="Repeat new password"
                                    required
                                    minLength={6}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-primary transition-colors"
                                    tabIndex={-1}
                                    title={showConfirmPassword ? "Hide password" : "Show password"}
                                >
                                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !newPassword.trim() || !confirmPassword.trim()}
                        className="w-full py-3 px-6 bg-primary text-primary-foreground rounded-lg font-bold text-base hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98]"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
}
