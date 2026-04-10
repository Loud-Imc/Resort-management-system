import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import logo from '../assets/logo.svg';
import toast from 'react-hot-toast';

export default function Login() {
    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
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
        try {
            await login({ email, password });

            // Post-login check for portal access (Property-related roles)
            const storedUser = localStorage.getItem('property_user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                // Ensure roles is an array of lowercase strings
                const rawRoles = user.roles || [];
                const roles = (rawRoles.length > 0 ? rawRoles : [user.role || '']).map((r: string) => r.toLowerCase());

                const isSuperAdmin = roles.includes('superadmin');
                const isRestrictedPortal = roles.every((r: string) => ['channelpartner', 'customer'].includes(r));

                if (!isSuperAdmin && isRestrictedPortal) {
                    logout();
                    throw new Error('Account not registered for this portal. This dashboard is for Property Owners and Staff.');
                }
            }

            toast.success('Welcome back!');
            navigate('/');
        } catch (error: any) {
            const message = error?.response?.data?.message || error?.message || 'Invalid credentials';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                        <img src={logo} alt="Route Guide" className="h-24 w-auto" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Property Dashboard</h1>
                    <p className="text-gray-500 mt-2">Manage your property operations</p>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                                Email or Phone Number
                            </label>
                            <input
                                type="text"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white"
                                placeholder="Email or Phone Number"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5 font-bold">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all text-sm text-gray-900 bg-white pr-12"
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
                    </form>

                    <div className="mt-8 text-center border-t border-gray-50 pt-6">
                        <p className="text-sm text-gray-400">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700">
                                Register Property
                            </Link>
                        </p>
                    </div>
                </div>

                <p className="text-center text-sm text-gray-400 mt-6">
                    Route Guide Property Management
                </p>
            </div>
        </div>
    );
}
