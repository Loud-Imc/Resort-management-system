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
            toast.error(error.response?.data?.message || 'Failed to send verification code');
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
            toast.error(error.response?.data?.message || 'Invalid verification code');
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
            toast.error(error.response?.data?.message || 'Failed to reset password');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <h2 className="text-xl font-bold text-gray-900">
                    {step === 'IDENTIFIER' && 'Forgot Password'}
                    {step === 'OTP' && 'Verify Code'}
                    {step === 'RESET' && 'New Password'}
                </h2>
            </div>

            {step === 'IDENTIFIER' && (
                <form onSubmit={handleRequestOtp} className="space-y-5">
                    <p className="text-sm text-gray-500">
                        Enter your registered email or phone number and we'll send you a code to reset your password.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                            Email or Phone Number
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                placeholder="name@example.com or +91..."
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Send Code'}
                    </button>
                </form>
            )}

            {step === 'OTP' && (
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                    <p className="text-sm text-gray-500">
                        We've sent a 6-digit verification code to <span className="font-bold text-gray-900">{identifier}</span>.
                    </p>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                            Verification Code
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <ShieldCheck className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                maxLength={6}
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-center text-2xl font-bold tracking-[0.5em] text-gray-900 bg-white"
                                placeholder="000000"
                                required
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || otp.length < 6}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Verify Code'}
                    </button>
                    <p className="text-center text-xs text-gray-400">
                        Didn't receive the code?{' '}
                        <button
                            type="button"
                            onClick={handleRequestOtp}
                            className="text-primary-600 font-bold hover:underline"
                        >
                            Resend
                        </button>
                    </p>
                </form>
            )}

            {step === 'RESET' && (
                <form onSubmit={handleResetPassword} className="space-y-5">
                    <p className="text-sm text-gray-500">
                        Verification successful. Please enter your new password below.
                    </p>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                    placeholder="••••••••"
                                    required
                                    minLength={8}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                    >
                        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
}
