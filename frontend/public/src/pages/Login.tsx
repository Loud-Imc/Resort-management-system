import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Loader2, ArrowRight, KeyRound } from 'lucide-react';
import api from '../services/api';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Phone Login State
    const [phoneNumber, setPhoneNumber] = useState('');
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState<'phone' | 'otp'>('phone');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

    useEffect(() => {
        let interval: any;
        if (resendTimer > 0) {
            interval = setInterval(() => {
                setResendTimer((prev) => prev - 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [resendTimer]);


    const normalizePhoneNumber = (phone: string) => {
        if (!phone) return '';
        // PhoneInput already provides digits including country code
        const cleaned = phone.replace(/\D/g, '');
        return `+${cleaned}`;
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
            // Clean up existing container if any
            const container = document.getElementById('recaptcha-container');
            if (container) {
                container.innerHTML = '';
            }

            const appVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
                'size': 'invisible',
                'callback': () => {
                    console.log('reCAPTCHA verified');
                }
            });

            const formattedPhone = normalizePhoneNumber(phoneNumber);
            console.log('Sending OTP to:', formattedPhone);

            const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(result);
            setStep('otp');
            setResendTimer(60);
        } catch (err: any) {
            console.error('Phone auth error:', err);
            let userMessage = 'Failed to send OTP. Please try again.';
            if (err.code === 'auth/invalid-phone-number') userMessage = 'Invalid phone number format.';
            if (err.code === 'auth/too-many-requests') userMessage = 'Too many requests. Please try again later.';
            if (err.code === 'auth/invalid-app-credential') userMessage = 'Invalid app configuration. Please check Firebase settings.';

            setError(err.message || userMessage);
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

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6">
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        {step === 'phone' ? (
                            <form onSubmit={handleSendOtp} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                                    <div className="mt-1 phone-input-container">
                                        <PhoneInput
                                            country={'in'}
                                            value={phoneNumber}
                                            onChange={setPhoneNumber}
                                            inputClass="!w-full !h-[42px] !pl-12 !pr-3 !py-2 !border !border-gray-300 !rounded-lg focus:!ring-primary-500 focus:!border-primary-500 !text-sm"
                                            buttonClass="!bg-transparent !border-r-0 !rounded-l-lg hover:!bg-gray-50"
                                            containerClass="!w-full"
                                            placeholder="Enter phone number"
                                            enableSearch={true}
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
