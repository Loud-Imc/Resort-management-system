import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Loader2, AlertTriangle, Trash2, Edit2, Save, X, UserCircle } from 'lucide-react';

export default function AccountSettings() {
    const { user, logout, updateUser } = useAuth();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: ''
    });

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                phone: user.phone || ''
            });
        }
    }, [user, isEditing]);

    const updateProfileMutation = useMutation({
        mutationFn: (data: typeof formData) => api.patch('/users/me', data),
        onSuccess: (response: any) => {
            toast.success('Profile updated successfully');
            
            // Flatten roles to match the structure expected by AuthContext
            const updatedUserData = {
                ...response.data,
                roles: response.data.roles?.map((ur: any) => ur.role?.name).filter(Boolean) || []
            };
            
            updateUser(updatedUserData);
            setIsEditing(false);
        },
        onError: (error: any) => {
            const errorMsg = error.response?.data?.message || 'Failed to update profile';
            toast.error(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        }
    });

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

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateProfileMutation.mutate(formData);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <User className="h-6 w-6 text-blue-600" /> Account Settings
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal account and security settings</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 rounded-xl font-bold text-xs uppercase tracking-widest transition-all border border-blue-100 dark:border-blue-800"
                    >
                        <Edit2 className="h-4 w-4" /> Edit Profile
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-500 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400 rounded-xl font-bold text-xs uppercase tracking-widest transition-all"
                        >
                            <X className="h-4 w-4" /> Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={updateProfileMutation.isPending}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-200 dark:shadow-none"
                        >
                            {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
                <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-50 dark:border-gray-700/50">
                    <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 font-bold text-2xl border border-blue-100 dark:border-blue-800 shadow-inner">
                        {user?.firstName?.charAt(0) || 'P'}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {user?.firstName} {user?.lastName}
                        </h2>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {user?.roles?.map((role: any, idx: number) => {
                                const roleName = typeof role === 'string' ? role : role.role?.name || 'User';
                                return (
                                    <span key={idx} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-md text-[10px] font-bold uppercase tracking-wider border border-gray-200 dark:border-gray-600">
                                        {roleName}
                                    </span>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* First Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <UserCircle className="h-3.5 w-3.5" /> First Name
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                required
                            />
                        ) : (
                            <p className="font-semibold text-gray-900 dark:text-white px-1 text-lg">{user?.firstName || '—'}</p>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <UserCircle className="h-3.5 w-3.5" /> Last Name
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                required
                            />
                        ) : (
                            <p className="font-semibold text-gray-900 dark:text-white px-1 text-lg">{user?.lastName || '—'}</p>
                        )}
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <Mail className="h-3.5 w-3.5" /> Email Address
                        </label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                                required
                            />
                        ) : (
                            <p className="font-semibold text-gray-900 dark:text-white px-1 text-lg">{user?.email || '—'}</p>
                        )}
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <Phone className="h-3.5 w-3.5" /> Phone Number
                        </label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 transition-all font-medium text-gray-900 dark:text-white"
                            />
                        ) : (
                            <p className="font-semibold text-gray-900 dark:text-white px-1 text-lg">{user?.phone || '—'}</p>
                        )}
                    </div>
                </form>
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
