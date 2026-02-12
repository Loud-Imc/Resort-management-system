import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Users,
    Plus,
    Trash2,
    Shield,
    User as UserIcon,
    Mail,
    Loader2,
    ArrowLeft,
    X,
    Search,
    Check
} from 'lucide-react';
import staffService, { PropertyStaff } from '../../services/staff';
import { usersService } from '../../services/users';
import propertyService from '../../services/properties';
import { User } from '../../types/user';
import { Property } from '../../types/property';
import toast from 'react-hot-toast';

const STAFF_ROLES = [
    { value: 'Manager', label: 'Property Manager' },
    { value: 'Receptionist', label: 'Receptionist' },
    { value: 'Housekeeping', label: 'Housekeeping' },
    { value: 'Kitchen', label: 'Kitchen Staff' },
    { value: 'Other', label: 'General Staff' },
];

export default function StaffList() {
    const { id: propertyId } = useParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState<Property | null>(null);
    const [staff, setStaff] = useState<PropertyStaff[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [selectedRole, setSelectedRole] = useState('Manager');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (propertyId) {
            loadData();
        }
    }, [propertyId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [propertyData, staffData] = await Promise.all([
                propertyService.getById(propertyId!),
                staffService.getStaff(propertyId!)
            ]);
            setProperty(propertyData);
            setStaff(staffData);
        } catch (err: any) {
            setError(err.message || 'Failed to load staff data');
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        try {
            const users = await usersService.getAll();
            setAllUsers(users);
        } catch (err) {
            console.error('Failed to load users', err);
        }
    };

    const handleAddStaff = async () => {
        if (!propertyId || !selectedUser) return;

        try {
            setSubmitting(true);
            const newStaff = await staffService.addStaff(propertyId, selectedUser.id, selectedRole);
            toast.success('Staff member added successfully');
            setStaff([newStaff, ...staff]);
            setIsAddModalOpen(false);
            setSelectedUser(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to add staff');
        } finally {
            setSubmitting(false);
        }
    };

    const handleRemoveStaff = async (userId: string) => {
        if (!propertyId || !window.confirm('Are you sure you want to remove this staff member?')) return;

        try {
            toast.success('Staff member removed successfully');
            setStaff(staff.filter(s => s.userId !== userId));
        } catch (err: any) {
            toast.error(err.message || 'Failed to remove staff');
        }
    };

    const filteredUsers = allUsers.filter(u =>
        (u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
            `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())) &&
        !staff.some(s => s.userId === u.id)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/properties')}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            <Users className="h-7 w-7 text-primary-600" />
                            Staff Management
                        </h1>
                        <p className="text-gray-500">
                            {property?.name} • Managing the on-ground team
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setIsAddModalOpen(true);
                        loadUsers();
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Staff Member
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
            )}

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((member) => (
                    <div key={member.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden group">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center text-primary-600">
                                    <UserIcon className="h-6 w-6" />
                                </div>
                                <button
                                    onClick={() => handleRemoveStaff(member.userId)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Remove Staff"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {member.user.firstName} {member.user.lastName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                <Mail className="h-4 w-4" />
                                {member.user.email}
                            </div>

                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                    <Shield className="h-3 w-3" />
                                    {member.role}
                                </span>
                                <span className="text-xs text-gray-400">
                                    Joined {new Date(member.user.id).toLocaleDateString()}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 p-12 text-center">
                        <div className="mx-auto h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                            <Users className="h-8 w-8" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900">No staff members yet</h3>
                        <p className="text-gray-500 mb-6">Start by adding your managers or receptionists.</p>
                        <button
                            onClick={() => {
                                setIsAddModalOpen(true);
                                loadUsers();
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            <Plus className="h-4 w-4" />
                            Add First Staff
                        </button>
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Add Staff Member</h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* User Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Search User (By Name or Email)
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Search className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Type to search..."
                                        className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>

                                {searchQuery && (
                                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-100 rounded-xl bg-gray-50 divide-y divide-gray-100">
                                        {filteredUsers.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full text-left px-4 py-3 hover:bg-white flex items-center justify-between transition-colors"
                                            >
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{u.firstName} {u.lastName}</p>
                                                    <p className="text-xs text-gray-500">{u.email}</p>
                                                </div>
                                                <div className="h-6 w-6 rounded-full bg-primary-50 flex items-center justify-center text-primary-600">
                                                    <Plus className="h-4 w-4" />
                                                </div>
                                            </button>
                                        ))}
                                        {filteredUsers.length === 0 && (
                                            <div className="px-4 py-8 text-center">
                                                <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-3">
                                                    <UserIcon className="h-6 w-6" />
                                                </div>
                                                <p className="text-sm font-medium text-gray-900 mb-1">No user found</p>
                                                <p className="text-xs text-gray-500 mb-4">Would you like to create a new account for this team member?</p>
                                                <button
                                                    onClick={() => navigate(`/users/create?propertyId=${propertyId}&role=${selectedRole}`)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-bold hover:bg-primary-100 transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Create New User Account
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {selectedUser && (
                                <div className="bg-primary-50 rounded-xl p-4 flex items-center justify-between border border-primary-100 animate-in fade-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-primary-600">
                                            <Check className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</p>
                                            <p className="text-xs text-gray-600">{selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="text-xs text-primary-700 hover:underline font-medium"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {/* Role Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Assign Role
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {STAFF_ROLES.map(role => (
                                        <button
                                            key={role.value}
                                            onClick={() => setSelectedRole(role.value)}
                                            className={`px-4 py-3 rounded-xl text-left border-2 transition-all ${selectedRole === role.value
                                                ? 'border-primary-600 bg-primary-50'
                                                : 'border-gray-100 hover:border-gray-200 bg-white'
                                                }`}
                                        >
                                            <p className={`text-sm font-bold ${selectedRole === role.value ? 'text-primary-700' : 'text-gray-900'}`}>{role.label}</p>
                                            <p className="text-xs text-gray-500">Access level: {role.value}</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStaff}
                                disabled={!selectedUser || submitting}
                                className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-primary-200"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {submitting ? 'Adding...' : 'Confirm Addition'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
