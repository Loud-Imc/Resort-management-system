import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DeleteAccount() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [user, setUser] = useState<any>(localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!) : null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            localStorage.setItem('token', urlToken);
            setToken(urlToken);
            // Fetch user info to confirm who is being deleted
            fetchUser(urlToken);
        }
    }, [searchParams]);

    const fetchUser = async (authToken: string) => {
        setIsLoadingUser(true);
        try {
            const { data } = await api.get('/users/me', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
        } catch (err) {
            toast.error('Session expired. Please log in again.');
            localStorage.clear();
            setToken(null);
            setUser(null);
        } finally {
            setIsLoadingUser(false);
        }
    };

    const [confirmed, setConfirmed] = useState(false);
    const [success, setSuccess] = useState(false);

    const deleteAccountMutation = useMutation({
        mutationFn: () => api.delete('/users/me'),
        onSuccess: () => {
            setSuccess(true);
            localStorage.clear();
            toast.success('Account deletion successful');
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.message || 'Failed to delete account';
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        }
    });

    if (success) {
        return (
            <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center pt-20 px-4">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 p-12 text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 font-serif mb-4">Account Deactivated</h2>
                    <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                        Your account has been successfully anonymized and all associated records have been deactivated.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full py-4 bg-primary-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-primary-100 uppercase tracking-widest text-xs"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (isLoadingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fcfcfc] pt-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!token || !user) {
        return (
            <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center pt-20 px-4">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 p-12 text-center">
                    <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="h-10 w-10 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 font-serif mb-4">Authentication Required</h2>
                    <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                        To protect your account, please log in before making a deletion request.
                    </p>
                    <button
                        onClick={() => navigate('/login?redirect=/delete-account')}
                        className="w-full py-4 bg-primary-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-primary-100 uppercase tracking-widest text-xs"
                    >
                        Login to Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fcfcfc] pt-32 pb-20 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                    <div className="p-10 md:p-14">
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 font-serif mb-2">Delete My Account</h2>
                            <p className="text-gray-400 font-medium tracking-tight">Logged in as {user.firstName} {user.lastName}</p>
                        </div>

                        <div className="space-y-6 mb-12 bg-red-50/50 rounded-3xl p-8 border border-red-100/50">
                            <h3 className="font-bold text-red-900 text-lg flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                What happens when you delete your account?
                            </h3>
                            <ul className="space-y-4 text-sm text-red-800/80 font-medium">
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>Your personal data (name, email, phone) will be permanently anonymized.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>All properties you own will be automatically deactivated and hidden.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>Your Channel Partner rewards and referral codes will be disabled.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>You will lose access to all your past bookings and rewards.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-8">
                            <label className="flex items-start gap-4 cursor-pointer group">
                                <div className="relative flex items-center mt-1">
                                    <input
                                        type="checkbox"
                                        checked={confirmed}
                                        onChange={(e) => setConfirmed(e.target.checked)}
                                        className="w-6 h-6 rounded-lg border-2 border-gray-200 text-red-600 focus:ring-red-500 transition-all cursor-pointer group-hover:border-red-300"
                                    />
                                </div>
                                <span className="text-sm font-bold text-gray-700 leading-snug">
                                    I understand that this action is permanent and cannot be undone. I wish to proceed with deactivating my account.
                                </span>
                            </label>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button
                                    onClick={() => navigate('/profile')}
                                    className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel & Go Back
                                </button>
                                <button
                                    onClick={() => deleteAccountMutation.mutate()}
                                    disabled={!confirmed || deleteAccountMutation.isPending}
                                    className="flex-[2] py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-red-100 uppercase tracking-widest text-xs flex items-center justify-center gap-3"
                                >
                                    {deleteAccountMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Permanently Delete Account'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <p className="text-center text-gray-400 text-xs mt-12 font-medium">
                    Need help? <a href="/contact" className="text-primary-600 underline underline-offset-4">Contact our support team</a>
                </p>
            </div>
        </div>
    );
}
