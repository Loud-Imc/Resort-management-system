import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, Mail, Lock, ArrowRight, Phone, KeyRound } from 'lucide-react';
import api from '../services/api';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';

const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginData = z.infer<typeof loginSchema>;

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loginMode, setLoginMode] = useState<'phone' | 'email'>((searchParams.get('mode') as any) || 'phone');

    // Phone Login State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

    const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
        resolver: zodResolver(loginSchema),
    });

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);

    const setupRecaptcha = () => {
        if (!(window as any).recaptchaVerifier) {
            try {
                const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                    'size': 'invisible',
                    'callback': () => {
                        console.log('reCAPTCHA verified');
                    }
                });
                (window as any).recaptchaVerifier = verifier;
            } catch (err) {
                console.error('reCAPTCHA initialization failed:', err);
            }
        }
    };

    const handleSendOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!phoneNumber) {
            setError('Please enter a valid phone number');
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            // Ensure container exists before cleaning up
            const container = document.getElementById('recaptcha-container');
            if (!container) {
                // If container is missing, we need to wait for next render or ensure it's there
                throw new Error('reCAPTCHA container not found');
            }

            // If a verifier exists but is in a failed/weird state, clear it
            if ((window as any).recaptchaVerifier) {
                try {
                    (window as any).recaptchaVerifier.clear();
                } catch (e) {
                    console.warn('Error clearing verifier:', e);
                }
                (window as any).recaptchaVerifier = null;
            }

            setupRecaptcha();
            const appVerifier = (window as any).recaptchaVerifier;

            if (!appVerifier) {
                throw new Error('Failed to initialize reCAPTCHA');
            }

            // Format phone number (assuming India +91 if not specified)
            const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber}`;

            const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            setResendTimer(60);
        } catch (err: any) {
            console.error('Phone auth error:', err);
            // Better error messaging
            let userMessage = 'Failed to send OTP. Please try again.';
            if (err.code === 'auth/invalid-phone-number') userMessage = 'Invalid phone number format.';
            if (err.code === 'auth/too-many-requests') userMessage = 'Too many requests. Please try again later.';

            setError(err.message || userMessage);

            if ((window as any).recaptchaVerifier) {
                try {
                    (window as any).recaptchaVerifier.clear();
                } catch (e) { }
                (window as any).recaptchaVerifier = null;
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || !confirmationResult) return;

        setIsLoading(true);
        setError(null);
        try {
            console.log('Verifying OTP with Firebase...');
            const result = await confirmationResult.confirm(otp);
            const idToken = await result.user.getIdToken();
            console.log('Firebase verification successful. Sending token to backend...');

            // Send token to backend
            try {
                const response = await api.post('/auth/phone-login', { token: idToken });
                console.log('Backend authentication successful');

                localStorage.setItem('token', response.data.accessToken);
                localStorage.setItem('user', JSON.stringify(response.data.user));
                window.dispatchEvent(new Event('storage'));

                const redirect = searchParams.get('redirect');
                navigate(redirect || '/');
            } catch (backendErr: any) {
                console.error('Backend auth error:', backendErr);
                const backendMsg = backendErr.response?.data?.message || 'Authentication with server failed.';
                setError(`Server Error: ${backendMsg}`);
            }
        } catch (firebaseErr: any) {
            console.error('Firebase OTP verification error:', firebaseErr);
            setError('Invalid OTP. Please check the code sent to your phone.');
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmitEmail = async (data: LoginData) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await api.post('/auth/login', data);
            localStorage.setItem('token', response.data.accessToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            window.dispatchEvent(new Event('storage'));

            const redirect = searchParams.get('redirect');
            navigate(redirect || '/');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div id="recaptcha-container"></div>

            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <h2 className="text-center text-3xl font-extrabold text-gray-900 font-serif">
                    Sign In or Register
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Use your phone number for instant access
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-4 shadow sm:rounded-xl sm:px-10 border border-gray-100">

                    {/* Login Mode Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
                        <button
                            onClick={() => { setLoginMode('email'); setError(null); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${loginMode === 'email' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Email
                        </button>
                        <button
                            onClick={() => { setLoginMode('phone'); setError(null); }}
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition-all ${loginMode === 'phone' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Phone / OTP
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {loginMode === 'email' ? (
                        <form className="space-y-6" onSubmit={handleSubmit(onSubmitEmail)}>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        {...register('email')}
                                        type="email"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        placeholder="you@example.com"
                                    />
                                </div>
                                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Password</label>
                                <div className="mt-1 relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Lock className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        {...register('password')}
                                        type="password"
                                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                        placeholder="••••••••"
                                    />
                                </div>
                                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Sign In <ArrowRight className="ml-2 h-4 w-4" /></>}
                            </button>
                        </form>
                    ) : (
                        <div className="space-y-6">
                            {step === 'phone' ? (
                                <form onSubmit={handleSendOtp} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                        <div className="mt-1 relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="tel"
                                                value={phoneNumber}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                                                placeholder="9876543210"
                                                required
                                            />
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500 italic">We'll send you a verification code.</p>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Get OTP <ArrowRight className="ml-2 h-4 w-4" /></>}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleVerifyOtp} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
                                        <div className="mt-1 relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <KeyRound className="h-5 w-5 text-gray-400" />
                                            </div>
                                            <input
                                                type="text"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 sm:text-sm tracking-[0.5em] text-center font-bold"
                                                placeholder="000000"
                                                maxLength={6}
                                                required
                                            />
                                        </div>
                                        <div className="mt-2 flex justify-between items-center text-xs">
                                            <span className="text-gray-500">OTP sent to {phoneNumber}</span>
                                            <button
                                                type="button"
                                                onClick={() => setStep('phone')}
                                                className="text-primary-600 hover:underline font-bold"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : <>Verify & Login <ArrowRight className="ml-2 h-4 w-4" /></>}
                                    </button>

                                    <div className="text-center">
                                        {resendTimer > 0 ? (
                                            <p className="text-xs text-gray-500">Resend OTP in {resendTimer}s</p>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                className="text-primary-600 hover:underline text-xs font-bold"
                                            >
                                                Resend OTP
                                            </button>
                                        )}
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    <div className="mt-6 text-center border-t border-gray-100 pt-6">
                        <p className="text-sm text-gray-600 font-medium">
                            Need help? <Link to="/contact" className="text-primary-600 hover:underline">Contact Support</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
