import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, Loader2, CheckCircle, ShieldAlert } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';

export default function DeleteAccount() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [token, setToken] = useState<string | null>(localStorage.getItem('property_token'));
    const [user, setUser] = useState<any>(localStorage.getItem('property_user') ? JSON.parse(localStorage.getItem('property_user')!) : null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);

    useEffect(() => {
        const urlToken = searchParams.get('token');
        if (urlToken) {
            localStorage.setItem('property_token', urlToken);
            setToken(urlToken);
            fetchUser(urlToken);
        }
    }, [searchParams]);

    const fetchUser = async (authToken: string) => {
        setIsLoadingUser(true);
        try {
            const { data } = await api.get('/users/me', {
                headers: { Authorization: `Bearer ${authToken}` }
            });
            localStorage.setItem('property_user', JSON.stringify(data));
            setUser(data);
        } catch (err) {
            toast.error('Session expired. Please log in again.');
            localStorage.removeItem('property_token');
            localStorage.removeItem('property_user');
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
            localStorage.removeItem('property_token');
            localStorage.removeItem('property_user');
            toast.success('Account deletion successful');
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.message || 'Failed to delete account';
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        }
    });

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-12 text-center">
                    <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="h-10 w-10 text-green-500" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Account Deactivated</h2>
                    <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                        Your account and all associated properties have been successfully deactivated.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all uppercase tracking-widest text-xs"
                    >
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (isLoadingUser) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!token || !user) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-12 text-center">
                    <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-8">
                        <ShieldAlert className="h-10 w-10 text-primary-600" />
                    </div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-4">Authentication Required</h2>
                    <p className="text-gray-500 font-medium mb-10 leading-relaxed">
                        Please log in to your Property Owner account to confirm deletion.
                    </p>
                    <button
                        onClick={() => navigate('/login?redirect=/delete-account')}
                        className="w-full py-4 bg-primary-600 text-white font-bold rounded-2xl hover:bg-primary-700 transition-all uppercase tracking-widest text-xs"
                    >
                        Login to Continue
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-20 pb-20 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-10 md:p-14">
                        <div className="text-center mb-12">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">Delete Property Owner Account</h2>
                            <p className="text-gray-400 font-medium font-serif">Logged in as {user.firstName} {user.lastName}</p>
                        </div>

                        <div className="space-y-6 mb-12 bg-red-50 rounded-3xl p-8 border border-red-100">
                            <h3 className="font-bold text-red-900 text-lg flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" />
                                Critical Warnings:
                            </h3>
                            <ul className="space-y-4 text-sm text-red-800 font-medium">
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>All your active properties will be hidden from the marketplace.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>Your personal data will be permanently anonymized.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>You will lose access to all financial reports and staff records.</span>
                                </li>
                                <li className="flex gap-3">
                                    <div className="h-1.5 w-1.5 rounded-full bg-red-400 mt-2 shrink-0" />
                                    <span>This action is **irreversible**.</span>
                                </li>
                            </ul>
                        </div>

                        <div className="space-y-8">
                            <label className="flex items-start gap-4 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={confirmed}
                                    onChange={(e) => setConfirmed(e.target.checked)}
                                    className="mt-1 w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                                <span className="text-sm font-bold text-gray-700">
                                    I understand the consequences and confirm that I want to delete my account and deactivate my properties.
                                </span>
                            </label>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex-1 py-4 bg-gray-50 text-gray-600 font-bold rounded-2xl hover:bg-gray-100 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => deleteAccountMutation.mutate()}
                                    disabled={!confirmed || deleteAccountMutation.isPending}
                                    className="flex-[2] py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 disabled:opacity-50 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-lg"
                                >
                                    {deleteAccountMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Permanent Deletion'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
