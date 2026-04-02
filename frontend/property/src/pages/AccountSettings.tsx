import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Loader2, AlertTriangle, Trash2 } from 'lucide-react';

export default function AccountSettings() {
    const { user, logout } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const deleteAccountMutation = useMutation({
        mutationFn: () => api.delete('/users/me'),
        onSuccess: () => {
            toast.success('Account deleted successfully');
            logout();
            window.location.href = '/login';
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.message || 'Failed to delete account';
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        }
    });

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <User className="h-6 w-6 text-blue-600" /> Account Settings
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal account and security settings</p>
            </div>

            {/* Profile Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-100 dark:border-blue-800">
                        {user?.firstName?.charAt(0) || 'P'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {user?.firstName} {user?.lastName}
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {user?.roles?.map((role: string) => (
                                <span key={role} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                                    {role}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> Email Address
                        </label>
                        <p className="font-semibold text-gray-900 dark:text-white px-1">{user?.email || '—'}</p>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> Phone Number
                        </label>
                        <p className="font-semibold text-gray-900 dark:text-white px-1">{user?.phone || '—'}</p>
                    </div>
                </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 p-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <h4 className="text-lg font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                            <Trash2 className="h-5 w-5" /> Delete Account
                        </h4>
                        <p className="text-red-600/70 dark:text-red-400/60 text-sm mt-1 max-w-md">
                            Permanently deactivate your account and anonymize your personal data.
                            If you own properties, you must transfer or delete them first.
                            <strong> This action cannot be undone.</strong>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="px-6 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-all text-xs uppercase tracking-widest shadow-lg shadow-red-200 dark:shadow-none"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowDeleteConfirm(false)} />
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-10 text-center">
                            <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <AlertTriangle className="h-10 w-10 text-red-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white font-serif mb-4">Are you sure?</h3>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-10 leading-relaxed">
                                This will permanently deactivate your account.
                                Property details and historical financial data will be preserved but anonymized.
                            </p>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => deleteAccountMutation.mutate()}
                                    disabled={deleteAccountMutation.isPending}
                                    className="w-full py-4 bg-red-600 text-white font-bold rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-100 dark:shadow-none uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                                >
                                    {deleteAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Yes, Delete My Account'}
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="w-full py-4 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
