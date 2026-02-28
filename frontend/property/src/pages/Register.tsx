import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Building2, User, Mail, Phone, Lock, ArrowRight, MapPin, ClipboardList, ChevronLeft, CheckCircle2, KeyRound, EyeOff, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { auth } from '../config/firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';

export default function Register() {
    const { registerProperty } = useAuth();
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);

    // OTP related states
    const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [resendTimer, setResendTimer] = useState(0);

    const [formData, setFormData] = useState({
        // Owner fields
        ownerFirstName: '',
        ownerLastName: '',
        ownerEmail: '',
        ownerPhone: '',
        ownerPassword: '',
        // Property fields
        propertyName: '',
        propertyDescription: '',
        propertyType: 'RESORT',
        address: '',
        city: '',
        state: '',
        country: 'India',
        pincode: '',
        propertyPhone: '',
        propertyEmail: ''
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

    const normalizePhoneNumber = (phone: string) => {
        if (!phone) return '';
        // 1. Remove all non-numeric characters
        let cleaned = phone.replace(/\D/g, '');

        // 2. Handle 00 prefix (often used as + replacement)
        if (phone.startsWith('00')) {
            cleaned = cleaned.substring(2);
        }
        // 3. Handle single leading zero
        else if (cleaned.startsWith('0') && cleaned.length > 10) {
            cleaned = cleaned.substring(1);
        }
        else if (cleaned.startsWith('0') && cleaned.length === 11) {
            cleaned = cleaned.substring(1);
        }

        // 4. If it's 10 digits, assume India (+91)
        if (cleaned.length === 10) {
            return `+91${cleaned}`;
        }

        // 5. If it starts with 91 and is 12 digits, assume it's already got the country code
        if (cleaned.length === 12 && cleaned.startsWith('91')) {
            return `+${cleaned}`;
        }

        // 6. Otherwise, if it was long enough and already starts with +, just return it cleaned
        return phone.startsWith('+') ? `+${cleaned}` : `+${cleaned}`;
    };

    const handleSendOtp = async () => {
        if (!formData.ownerPhone) {
            toast.error('Please enter a phone number first');
            return;
        }

        setIsVerifyingPhone(true);
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

            const formattedPhone = normalizePhoneNumber(formData.ownerPhone);
            console.log('Sending OTP to:', formattedPhone);

            const result = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
            setConfirmationResult(result);
            setShowOtpInput(true);
            setResendTimer(60);
            toast.success('Verification code sent');
        } catch (error: any) {
            console.error('Error sending OTP:', error);
            let userMessage = 'Failed to send verification code';
            if (error.code === 'auth/invalid-phone-number') userMessage = 'Invalid phone number format.';
            if (error.code === 'auth/too-many-requests') userMessage = 'Too many requests. Please try again later.';
            if (error.code === 'auth/captcha-check-failed') userMessage = 'reCAPTCHA verification failed.';
            if (error.code === 'auth/invalid-app-credential') userMessage = 'Invalid app configuration. Please check Firebase settings.';

            toast.error(error.message || userMessage);
        } finally {
            setIsVerifyingPhone(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp || !confirmationResult) return;

        setIsVerifyingPhone(true);
        try {
            await confirmationResult.confirm(otp);
            setIsPhoneVerified(true);
            setShowOtpInput(false);
            toast.success('Phone number verified successfully');
        } catch (error: any) {
            toast.error('Invalid verification code');
        } finally {
            setIsVerifyingPhone(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Sync property contact with owner contact if property fields are still sync'd or empty
            if (name === 'ownerPhone' && (prev.propertyPhone === prev.ownerPhone || !prev.propertyPhone)) {
                next.propertyPhone = value;
            }
            if (name === 'ownerEmail' && (prev.propertyEmail === prev.ownerEmail || !prev.propertyEmail)) {
                next.propertyEmail = value;
            }

            return next;
        });

        // If phone changes, reset verification
        if (name === 'ownerPhone') {
            setIsPhoneVerified(false);
            setShowOtpInput(false);
            setOtp('');
        }
    };

    const nextStep = () => {
        if (step === 1) {
            if (!formData.ownerFirstName || !formData.ownerLastName || !formData.ownerEmail || !formData.ownerPhone || !formData.ownerPassword) {
                toast.error('Please fill all owner details');
                return;
            }
            if (!isPhoneVerified) {
                toast.error('Please verify your phone number first');
                return;
            }
            if (formData.ownerPassword.length < 8) {
                toast.error('Password must be at least 8 characters');
                return;
            }
        }
        setStep(prev => prev + 1);
    };

    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            // Format phone numbers to include country code for backend validation
            const formattedData = {
                ...formData,
                ownerPhone: normalizePhoneNumber(formData.ownerPhone),
                propertyPhone: normalizePhoneNumber(formData.propertyPhone)
            };

            await registerProperty(formattedData);
            toast.success('Registration successful! Property is pending approval.');
            navigate('/login', {
                state: {
                    message: 'Registration successful! Your property is being reviewed by our team. Please sign in to manage your details.'
                }
            });
        } catch (error: any) {
            console.error('Registration error:', error);
            const message = error?.response?.data?.message;
            if (Array.isArray(message)) {
                // If it's an array of validation errors, show them one by one or join them
                message.forEach((msg: string) => toast.error(msg));
            } else {
                toast.error(message || 'Registration failed');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4 py-12">
            <div className="w-full max-w-2xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white mb-4 shadow-lg text-2xl font-bold">
                        {step === 1 ? <User className="h-8 w-8" /> : <Building2 className="h-8 w-8" />}
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Partner with Route Guide</h1>
                    <p className="text-gray-500 mt-2">
                        {step === 1 ? 'Step 1: Owner Information' : 'Step 2: Property Information'}
                    </p>

                    {/* Progress Bar */}
                    <div className="flex items-center justify-center mt-6 gap-2">
                        <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 1 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                        <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 2 ? 'bg-primary-600' : 'bg-gray-200'}`} />
                    </div>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-10">
                    <div id="recaptcha-container"></div>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {step === 1 ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <User className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                name="ownerFirstName"
                                                type="text"
                                                required
                                                value={formData.ownerFirstName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                                placeholder="John"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                                        <input
                                            name="ownerLastName"
                                            type="text"
                                            required
                                            value={formData.ownerLastName}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="ownerEmail"
                                            type="email"
                                            required
                                            value={formData.ownerEmail}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="you@example.com"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Phone className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                name="ownerPhone"
                                                type="tel"
                                                required
                                                disabled={isPhoneVerified || showOtpInput}
                                                value={formData.ownerPhone}
                                                onChange={handleChange}
                                                className={`w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 ${isPhoneVerified ? 'bg-green-50 border-green-200' : ''}`}
                                                placeholder="9876543210"
                                            />
                                            {isPhoneVerified && (
                                                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                                </div>
                                            )}
                                        </div>
                                        {!isPhoneVerified && !showOtpInput && (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                disabled={isVerifyingPhone || !formData.ownerPhone}
                                                className="px-4 py-2 bg-primary-100 text-primary-700 rounded-xl font-bold text-xs hover:bg-primary-200 transition-all disabled:opacity-50"
                                            >
                                                {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                                            </button>
                                        )}
                                        {isPhoneVerified && (
                                            <button
                                                type="button"
                                                onClick={() => setIsPhoneVerified(false)}
                                                className="px-4 py-2 text-gray-500 hover:text-primary-600 transition-all text-xs font-bold"
                                            >
                                                Edit
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {showOtpInput && (
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100 animate-in fade-in slide-in-from-top-2">
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Enter 6-digit OTP</label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    <KeyRound className="h-4 w-4 text-gray-400" />
                                                </div>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={otp}
                                                    onChange={(e) => setOtp(e.target.value)}
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm tracking-widest font-bold text-gray-900"
                                                    placeholder="000000"
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                onClick={handleVerifyOtp}
                                                disabled={isVerifyingPhone || otp.length !== 6}
                                                className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 transition-all disabled:opacity-50"
                                            >
                                                {isVerifyingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm'}
                                            </button>
                                        </div>
                                        <div className="flex justify-between items-center px-1">
                                            <button
                                                type="button"
                                                onClick={() => { setShowOtpInput(false); setOtp(''); }}
                                                className="text-xs text-gray-500 hover:text-gray-700"
                                            >
                                                Cancel
                                            </button>
                                            {resendTimer > 0 ? (
                                                <span className="text-xs text-gray-400">Resend in {resendTimer}s</span>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={handleSendOtp}
                                                    className="text-xs text-primary-600 font-bold hover:underline"
                                                >
                                                    Resend Code
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="ownerPassword"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={formData.ownerPassword}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="Minimum 8 characters"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary-600 transition-colors"
                                        >
                                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                                    >
                                        Next Stage <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Name</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Building2 className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                name="propertyName"
                                                type="text"
                                                required
                                                value={formData.propertyName}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                                placeholder="e.g. Blue Lagoon Resort"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 md:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Type</label>
                                        <select
                                            name="propertyType"
                                            required
                                            value={formData.propertyType}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm appearance-none text-gray-900 bg-white"
                                        >
                                            <option value="RESORT">Resort</option>
                                            <option value="HOTEL">Hotel</option>
                                            <option value="HOMESTAY">Homestay</option>
                                            <option value="VILLA">Villa</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                                    <div className="relative">
                                        <div className="absolute top-3 left-3 pointer-events-none">
                                            <ClipboardList className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <textarea
                                            name="propertyDescription"
                                            value={formData.propertyDescription}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm min-h-[100px] text-gray-900 bg-white"
                                            placeholder="Tell us about your property..."
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Complete Address</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="address"
                                            type="text"
                                            required
                                            value={formData.address}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="123, Main Road, Area"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                                        <input
                                            name="city"
                                            type="text"
                                            required
                                            value={formData.city}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="Wayanad"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                                        <input
                                            name="state"
                                            type="text"
                                            required
                                            value={formData.state}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="Kerala"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Pincode</label>
                                        <input
                                            name="pincode"
                                            type="text"
                                            required
                                            value={formData.pincode}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="673122"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Email</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <Mail className="h-4 w-4 text-gray-400" />
                                            </div>
                                            <input
                                                name="propertyEmail"
                                                type="email"
                                                required
                                                value={formData.propertyEmail}
                                                onChange={handleChange}
                                                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                                placeholder="resort@example.com"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Property Phone</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                        </div>
                                        <input
                                            name="propertyPhone"
                                            type="tel"
                                            required
                                            value={formData.propertyPhone}
                                            onChange={handleChange}
                                            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                            placeholder="9876543210"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={prevStep}
                                        className="flex-1 py-3.5 px-4 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        <ChevronLeft className="h-4 w-4" /> Back
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isLoading}
                                        className="flex-[2] py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            <>
                                                Register Property <ArrowRight className="h-4 w-4" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </form>

                    <div className="mt-8 text-center border-t border-gray-50 pt-6">
                        <p className="text-sm text-gray-500">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-600 font-bold hover:text-primary-700">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    &copy; {new Date().getFullYear()} Route Guide Property Management. All rights reserved.
                </p>
            </div>
        </div>
    );
}
