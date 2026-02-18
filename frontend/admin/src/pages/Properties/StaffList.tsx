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
import clsx from 'clsx';

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
            const users = await usersService.getAll({ isStaffOnly: 'true' });
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
            setSearchQuery('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message || 'Failed to add staff');
        } finally {
            setSubmitting(false);
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <Users className="h-7 w-7 text-primary" />
                            Staff Management
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {property?.name} • Managing the on-ground team
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setIsAddModalOpen(true);
                        loadUsers();
                    }}
                    className="bg-primary text-primary-foreground px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 font-bold shadow-lg shadow-primary/20"
                >
                    <Plus className="h-4 w-4" />
                    Add Staff Member
                </button>
            </div>

            {error && (
                <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 flex items-center gap-3">
                    <X className="h-5 w-5" />
                    {error}
                </div>
            )}

            {/* Staff Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {staff.map((member) => (
                    <div key={member.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden group hover:shadow-md hover:border-primary/20 transition-all flex flex-col">
                        <div className="p-6 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div className="h-12 w-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                                    <UserIcon className="h-6 w-6" />
                                </div>
                                <button
                                    onClick={() => handleRemoveStaff(member.userId)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all"
                                    title="Remove Staff"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>

                            <h3 className="text-lg font-bold text-card-foreground mb-1">
                                {member.user.firstName} {member.user.lastName}
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                <Mail className="h-4 w-4" />
                                {member.user.email}
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-muted/30 border-t border-border mt-auto flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                <Shield className="h-3.5 w-3.5" />
                                {member.role}
                            </span>
                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                                Active Team
                            </span>
                        </div>
                    </div>
                ))}

                {staff.length === 0 && (
                    <div className="col-span-full bg-muted/20 rounded-2xl border-2 border-dashed border-border p-12 text-center animate-in fade-in duration-500">
                        <div className="mx-auto h-20 w-20 bg-muted rounded-full flex items-center justify-center text-muted-foreground mb-6">
                            <Users className="h-10 w-10 opacity-50" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">No Staff Members Found</h3>
                        <p className="text-muted-foreground max-w-sm mx-auto mb-6">
                            Start by adding team members to manage bookings and services at this property.
                        </p>
                        <button
                            onClick={() => {
                                setIsAddModalOpen(true);
                                loadUsers();
                            }}
                            className="inline-flex items-center gap-2 text-primary hover:underline font-bold"
                        >
                            <Plus className="h-4 w-4" />
                            Add your first staff member
                        </button>
                    </div>
                )}
            </div>

            {/* Add Staff Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
                    <div className="relative bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border animate-in zoom-in-95 duration-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                                <Plus className="h-5 w-5 text-primary" />
                                Add Team Member
                            </h2>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
                                <X className="h-5 w-5 text-muted-foreground" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* User Search */}
                            {!selectedUser ? (
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-muted/30 border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-foreground transition-all"
                                            autoFocus
                                        />
                                    </div>

                                    <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20">
                                        {filteredUsers.map(u => (
                                            <button
                                                key={u.id}
                                                onClick={() => setSelectedUser(u)}
                                                className="w-full text-left p-3 rounded-xl border border-transparent hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-between group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 bg-muted rounded-xl flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors font-bold">
                                                        {u.firstName[0]}{u.lastName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-foreground">{u.firstName} {u.lastName}</p>
                                                        <p className="text-xs text-muted-foreground">{u.email}</p>
                                                    </div>
                                                </div>
                                                <div className="p-2 bg-muted rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                                    <Plus className="h-4 w-4 text-primary" />
                                                </div>
                                            </button>
                                        ))}
                                        {filteredUsers.length === 0 && searchQuery && (
                                            <div className="text-center py-8">
                                                <p className="text-sm text-muted-foreground">No eligible users found.</p>
                                                <p className="text-[10px] text-muted-foreground/60 mt-1 uppercase tracking-tighter">* ONLY USERS WITH STAFF ROLES CAN BE ADDED</p>
                                            </div>
                                        )}
                                        {filteredUsers.length === 0 && !searchQuery && (
                                            <div className="text-center py-8">
                                                <p className="text-sm text-muted-foreground">Type to search for staff members...</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                            <Check className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-foreground">{selectedUser.firstName} {selectedUser.lastName}</p>
                                            <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedUser(null)}
                                        className="text-xs text-primary font-bold hover:underline px-3 py-1"
                                    >
                                        Change
                                    </button>
                                </div>
                            )}

                            {/* Role Selection */}
                            <div className={clsx("space-y-3 transition-all duration-300", !selectedUser && "opacity-40 grayscale pointer-events-none")}>
                                <label className="block text-sm font-bold text-muted-foreground uppercase tracking-wider pl-1">
                                    Assign Property Role
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {STAFF_ROLES.map(role => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            onClick={() => setSelectedRole(role.value)}
                                            className={clsx(
                                                "px-4 py-3 rounded-xl text-left border-2 transition-all flex flex-col gap-0.5",
                                                selectedRole === role.value
                                                    ? "border-primary bg-primary/10"
                                                    : "border-border hover:border-border/80 bg-background"
                                            )}
                                        >
                                            <p className={clsx(
                                                "text-sm font-bold",
                                                selectedRole === role.value ? "text-primary" : "text-foreground"
                                            )}>{role.label}</p>
                                            <p className="text-[10px] text-muted-foreground/80 font-medium italic">Scope: Property</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-muted/20 border-t border-border flex justify-end gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(false)}
                                className="px-5 py-2 text-sm font-bold text-muted-foreground hover:bg-muted rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddStaff}
                                disabled={!selectedUser || submitting}
                                className="px-8 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 shadow-lg shadow-primary/20 transition-all"
                            >
                                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                {submitting ? 'Processing...' : 'Add to Team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
