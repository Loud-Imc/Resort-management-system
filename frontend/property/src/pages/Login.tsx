import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import ForgotPassword from '../components/auth/ForgotPassword';
import logo from '../assets/logo.svg';
import toast from 'react-hot-toast';

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
    if (lower.includes('not registered') || lower.includes('portal') || lower.includes('property owner')) {
        return { message: 'Access denied. This portal is for Property Owners and Staff only.', field: 'general' };
    }
    return { message: msg, field: 'general' };
}

export default function Login() {
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [errorField, setErrorField] = useState<ErrorField>(null);
    const [searchParams] = useSearchParams();

    useEffect(() => {
        const action = searchParams.get('action');
        const token = searchParams.get('token');
        const encodedUser = searchParams.get('user');
        const propertyId = searchParams.get('propertyId');

        if (action === 'impersonate' && token && encodedUser) {
            try {
                const userData = atob(encodedUser);
                localStorage.setItem('property_token', token);
                localStorage.setItem('property_user', userData);

                if (propertyId) {
                    localStorage.setItem('property_selectedPropertyId', propertyId);
                }

                toast.success('Admin impersonation successful');

                // Clear URL and redirect
                navigate('/', { replace: true });

                // Reload to ensure all context providers pick up the new localStorage items
                window.location.reload();
            } catch (e) {
                console.error('Failed to decode user for impersonation', e);
                toast.error('Impersonation failed: Invalid user data');
            }
        }
    }, [searchParams, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorField(null);
        try {
            await login({ email, password });

            // Post-login check for portal access (Property-related roles)
            const storedUser = localStorage.getItem('property_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                const rawRoles = user.roles || [];
                const roles = (rawRoles.length > 0 ? rawRoles : [user.role || '']).map((r: string) => r.toLowerCase());

                const isSuperAdmin = roles.includes('superadmin');
                const isRestrictedPortal = roles.every((r: string) => ['channelpartner', 'customer'].includes(r));

                if (!isSuperAdmin && isRestrictedPortal) {
                    logout();
                    throw new Error('Access denied. This portal is for Property Owners and Staff only.');
                }
            }

            toast.success('Welcome back!');
            navigate('/');
        } catch (error: any) {
            const { message, field } = parseLoginError(error);
            setErrorField(field);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <img src={logo} alt="Route Guide" className="h-16 w-auto" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Property Dashboard</h1>
                    <p className="text-gray-500 mt-2">Manage your property operations</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    {isForgotPassword ? (
                        <ForgotPassword onBack={() => setIsForgotPassword(false)} />
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                                    Email or Phone Number
                                </label>
                        <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (errorField === 'email') setErrorField(null);
                                    }}
                                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white ${
                                        errorField === 'email'
                                            ? 'border-red-400 ring-1 ring-red-300'
                                            : 'border-gray-200'
                                    }`}
                                    placeholder="Email or Phone Number"
                                    required
                                />
                                {errorField === 'email' && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        No account found with that email or phone number.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (errorField === 'password') setErrorField(null);
                                        }}
                                        className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white pr-12 ${
                                            errorField === 'password'
                                                ? 'border-red-400 ring-1 ring-red-300'
                                                : 'border-gray-200'
                                        }`}
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-primary-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                    </button>
                                </div>
                                {errorField === 'password' && (
                                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                                        <AlertCircle className="h-3 w-3" />
                                        Incorrect password. Please try again.
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3.5 px-4 bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-xl font-bold text-sm hover:from-primary-700 hover:to-primary-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-primary-500/25"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                        Signing in...
                                    </>
                                ) : (
                                    'Sign In'
                                )}
                            </button>

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    className="text-sm text-primary-600 font-bold hover:text-primary-700 transition-colors"
                                >
                                    Forgot Password?
                                </button>
                            </div>
                        </form>
                    )}

                    <div className="mt-8 text-center border-t border-gray-50 pt-6">
                        <p className="text-sm text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700">
                                Register Property
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-12 flex flex-col items-center gap-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Download Property Manager App</p>
                    <div className="flex flex-wrap justify-center gap-3">
                        {/* Google Play */}
                        <a
                            href="https://play.google.com/store/apps/details?id=com.routeguide.property"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center gap-3 hover:bg-primary-800 transition-all border border-white/10 active:scale-95"
                        >
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                                <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.61 3,21.09 3,20.5M16.81,15.12L18.65,14.06C21.44,12.45 21.44,11.55 18.65,9.94L16.81,8.88L14.4,11.29L16.81,13.7M15.12,14.41L14.4,13.69L14.4,10.31L15.12,9.59L17.94,11.21C18.64,11.61 18.64,12.39 17.94,12.79L15.12,14.41Z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[8px] uppercase leading-none opacity-70">Get it on</p>
                                <p className="text-sm font-bold leading-tight">Google Play</p>
                            </div>
                        </a>

                        {/* App Store */}
                        <a
                            href="https://apps.apple.com/us/app/routeguide-property-manager/id6761613055"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-primary-600 text-white px-4 py-2 rounded-xl flex items-center gap-3 hover:bg-primary-800 transition-all border border-white/10 active:scale-95"
                        >
                            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                                <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[8px] uppercase leading-none opacity-70">Download on the</p>
                                <p className="text-sm font-bold leading-tight">App Store</p>
                            </div>
                        </a>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-8">
                    Route Guide Property Management
                </p>
            </div>
        </div>
    );
}
