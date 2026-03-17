import { useState, useEffect } from 'react';
import {
    Users, Plus, Trash2, Shield,
    User as UserIcon, Mail, Loader2,
    X, Search, Check
} from 'lucide-react';
import staffService, { type PropertyStaff } from '../../services/staff';
import { usersService } from '../../services/users';
import { rolesService, type Role } from '../../services/roles';
import { useProperty } from '../../context/PropertyContext';
import type { User } from '../../types/user';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function StaffList() {
    const { selectedProperty } = useProperty();
    const propertyId = selectedProperty?.id;

    const [staff, setStaff] = useState<PropertyStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [dbRoles, setDbRoles] = useState<Role[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [isCreatingNew, setIsCreatingNew] = useState(false);
    const [newUser, setNewUser] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        password: 'Password@123' // Default password for setup
    });
    const [createdCredentials, setCreatedCredentials] = useState<{email: string, password: string} | null>(null);

    useEffect(() => {
        if (propertyId) loadData();
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const staffData = await staffService.getStaff(propertyId!);
            setStaff(staffData);
        } catch (err: any) {
            setError(err.message || 'Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const [users, roles] = await Promise.all([
                usersService.getAll({ isStaffOnly: 'true' }),
                rolesService.getRoles({ category: 'PROPERTY' })
            ]);
            setAllUsers(users);
            setDbRoles(roles);
            if (roles.length > 0 && !selectedRoleId) {
                setSelectedRoleId(roles[0].id);
            }
        } catch (err) {
            console.error('Failed to load users/roles', err);
        }
    };

    const handleAddStaff = async () => {
        if (!propertyId || (!selectedUser && !isCreatingNew)) return;
        if (isCreatingNew && (!newUser.firstName || !newUser.lastName || !newUser.email)) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            setSubmitting(true);
            let userId = selectedUser?.id;

            // Step 1: Create user if needed
            if (isCreatingNew) {
                const createdUser = await usersService.create({
                    ...newUser,
                    roleIds: [selectedRoleId] // Assign the role during creation too
                });
                userId = createdUser.id;
            }

            // Step 2: Add to property staff
            if (userId) {
                const newStaff = await staffService.addStaff(propertyId, userId, selectedRoleId);
                toast.success('Staff member added successfully');
                setStaff([newStaff, ...staff]);
                
                if (isCreatingNew) {
                    setCreatedCredentials({ email: newUser.email, password: newUser.password });
                } else {
                    setIsAddModalOpen(false);
                    resetModalState();
                }
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to add staff');
        } finally {
            setSubmitting(false);
        }
    };

    const resetModalState = () => {
        setSelectedUser(null);
        setSearchQuery('');
        setIsCreatingNew(false);
        setCreatedCredentials(null);
        setNewUser({
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            password: 'Password@123'
        });
    };

    const handleRemoveStaff = async (userId: string) => {
        if (!propertyId || !window.confirm('Are you sure you want to remove this staff member?')) return;
        try {
            await staffService.removeStaff(propertyId, userId);
            toast.success('Staff member removed successfully');
            setStaff(staff.filter(s => s.userId !== userId));
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove staff');
        }
    };

    const filteredUsers = (allUsers || []).filter(u =>
        (u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !staff.some(s => s.userId === u.id)
    );

    if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Users className="h-7 w-7 text-blue-600" /> Staff Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {selectedProperty?.name} • Managing the on-ground team
                    </p>
                </div>
                <button onClick={() => { setIsAddModalOpen(true); loadUsers(); }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 font-medium shadow-sm">
                    <Plus className="h-4 w-4" /> Add Staff Member
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800 flex items-center gap-3">
                    <X className="h-5 w-5" /> {error}
                </div>
            )}

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((member) => (
                    <div key={member.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden group hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all flex flex-col">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600">
                                    <UserIcon className="h-6 w-6" />
                                </div>
                                <button onClick={() => handleRemoveStaff(member.userId)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all" title="Remove Staff">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{member.user.firstName} {member.user.lastName}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                                <Mail className="h-4 w-4" /> {member.user.email}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 mt-auto flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 border border-blue-200 dark:border-blue-800">
                                <Shield className="h-3.5 w-3.5" /> {typeof member.role === 'string' ? member.role : (member.role as any)?.name}
                            </span>
                            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Active Team</span>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full bg-gray-50 dark:bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
                        <div className="mx-auto h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-gray-400 mb-6">
                            <Users className="h-10 w-10 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Staff Members Found</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">
                            Start by adding team members to manage bookings and services at this property.
                        </p>
                        <button onClick={() => { setIsAddModalOpen(true); loadUsers(); }}
                            className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium">
                            <Plus className="h-4 w-4" /> Add your first staff member
                        </button>
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Plus className="h-5 w-5 text-blue-600" /> Add Team Member
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            {createdCredentials ? (
                                <div className="text-center space-y-6 py-4">
                                    <div className="mx-auto h-20 w-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600">
                                        <Check className="h-10 w-10" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Staff Account Created!</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                                            Please copy and share these credentials with the staff member.
                                        </p>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-gray-700/50 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4 text-left">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</label>
                                            <p className="text-sm font-bold text-gray-900 dark:text-white font-mono break-all">{createdCredentials.email}</p>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Initial Password</label>
                                            <p className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">{createdCredentials.password}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setIsAddModalOpen(false); resetModalState(); }}
                                        className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm">
                                        Done, Back to Team
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {/* Toggle between Search and Create */}
                                    <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
                                        <button
                                            onClick={() => { setIsCreatingNew(false); setSelectedUser(null); }}
                                            className={clsx(
                                                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                                !isCreatingNew ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            Search Existing
                                        </button>
                                        <button
                                            onClick={() => { setIsCreatingNew(true); setSelectedUser(null); }}
                                            className={clsx(
                                                "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
                                                isCreatingNew ? "bg-white dark:bg-gray-800 text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                                            )}
                                        >
                                            Create New
                                        </button>
                                    </div>

                                    {!isCreatingNew ? (
                                        !selectedUser ? (
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                                    <input type="text" placeholder="Search by name or email..." value={searchQuery}
                                                        onChange={(e) => setSearchQuery(e.target.value)} autoFocus
                                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 dark:text-white transition-all" />
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                                                    {filteredUsers.map(u => (
                                                        <button key={u.id} onClick={() => setSelectedUser(u)}
                                                            className="w-full text-left p-3 rounded-xl border border-transparent hover:border-blue-200 dark:hover:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all flex items-center justify-between group">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 group-hover:text-blue-600 transition-colors font-bold">
                                                                    {u.firstName[0]}{u.lastName[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-bold text-gray-900 dark:text-white">{u.firstName} {u.lastName}</p>
                                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{u.email}</p>
                                                                </div>
                                                            </div>
                                                            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                                <Plus className="h-4 w-4 text-blue-600" />
                                                            </div>
                                                        </button>
                                                    ))}
                                                    {filteredUsers.length === 0 && searchQuery && (
                                                        <div className="text-center py-8"><p className="text-sm text-gray-500 dark:text-gray-400">No eligible users found.</p></div>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                                                        <Check className="h-5 w-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedUser.firstName} {selectedUser.lastName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedUser.email}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setSelectedUser(null)} className="text-xs text-blue-600 font-bold hover:underline px-3 py-1">Change</button>
                                            </div>
                                        )
                                    ) : (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">First Name</label>
                                                <input type="text" value={newUser.firstName}
                                                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Last Name</label>
                                                <input type="text" value={newUser.lastName}
                                                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white" />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Email Address</label>
                                                <input type="email" value={newUser.email}
                                                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white" />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Phone Number</label>
                                                <input type="tel" value={newUser.phone}
                                                    onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm text-gray-900 dark:text-white" />
                                            </div>
                                            <div className="col-span-2 space-y-1">
                                                <label className="text-xs font-bold text-gray-500 uppercase ml-1">Account Password</label>
                                                <input type="text" value={newUser.password}
                                                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono text-gray-900 dark:text-white" />
                                            </div>
                                            <div className="col-span-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                                                <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
                                                    <strong>Note:</strong> Share these credentials with the staff member for their first login.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Role Selection */}
                                    <div className={clsx("space-y-3 transition-all duration-300", (!selectedUser && !isCreatingNew) && "opacity-40 grayscale pointer-events-none")}>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider pl-1">
                                            Assign Property Role
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {dbRoles.map(role => (
                                                <button key={role.id} type="button" onClick={() => setSelectedRoleId(role.id)}
                                                    className={clsx("px-4 py-3 rounded-xl text-left border-2 transition-all flex flex-col gap-0.5",
                                                        selectedRoleId === role.id ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-gray-200 dark:border-gray-600 hover:border-gray-300 bg-white dark:bg-gray-800")}>
                                                    <p className={clsx("text-sm font-bold", selectedRoleId === role.id ? "text-blue-600" : "text-gray-900 dark:text-white")}>{role.name}</p>
                                                    <p className="text-[10px] text-gray-400 font-medium italic">Scope: {role.isSystem ? 'System' : 'Property'}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        {!createdCredentials && (
                            <div className="p-6 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                                <button onClick={() => setIsAddModalOpen(false)}
                                    className="px-5 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all">Cancel</button>
                                <button onClick={handleAddStaff} disabled={( !selectedUser && !isCreatingNew) || submitting}
                                    className="px-8 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-sm transition-all">
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {submitting ? 'Processing...' : 'Add to Team'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
