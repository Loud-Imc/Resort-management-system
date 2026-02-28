import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { notificationsService } from '../../services/notifications';
import { rolesService } from '../../services/roles';
import { usersService } from '../../services/users';
import { propertyService } from '../../services/properties';
import { 
    Send, 
    Users, 
    Shield, 
    Building2, 
    User as UserIcon, 
    Loader2, 
    BellRing,
    CheckCircle2,
    Search,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function NotificationCenter() {
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetType, setTargetType] = useState<'ALL' | 'ROLE' | 'PROPERTY' | 'USER'>('ALL');
    const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState('');
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');

    // Fetch Roles
    const { data: roles = [] } = useQuery({
        queryKey: ['roles'],
        queryFn: () => rolesService.getAll(),
        enabled: targetType === 'ROLE'
    });

    // Fetch Properties
    const { data: properties = [] } = useQuery({
        queryKey: ['properties'],
        queryFn: async () => {
            const response = await propertyService.getAll();
            return response.data;
        },
        enabled: targetType === 'PROPERTY'
    });

    // Fetch Users for search
    const { data: searchedUsers = [], isLoading: isSearchingUsers } = useQuery({
        queryKey: ['users-search', userSearchTerm],
        queryFn: () => usersService.getAll(), // Ideally this would be a search endpoint
        enabled: targetType === 'USER' && userSearchTerm.length > 2
    });

    const filteredUsers = searchedUsers.filter(u => 
        u.firstName?.toLowerCase().includes(userSearchTerm.toLowerCase()) || 
        u.lastName?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
    ).slice(0, 5);

    const broadcastMutation = useMutation({
        mutationFn: (payload: any) => notificationsService.broadcast(payload),
        onSuccess: (data) => {
            toast.success(`Successfully sent to ${data.count} recipients!`);
            // Reset form
            setTitle('');
            setMessage('');
            setSelectedRoles([]);
            setSelectedUserIds([]);
            setSelectedPropertyId('');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to send notification');
        }
    });

    const handleSend = () => {
        if (!title.trim() || !message.trim()) {
            toast.error('Please provide both title and message');
            return;
        }

        const payload: any = {
            title,
            message,
            type: 'MARKETING_BROADCAST',
            data: { sentAt: new Date().toISOString() }
        };

        if (targetType === 'ROLE') {
            if (selectedRoles.length === 0) return toast.error('Select at least one role');
            payload.targetRoles = selectedRoles;
        } else if (targetType === 'PROPERTY') {
            if (!selectedPropertyId) return toast.error('Select a property');
            payload.propertyId = selectedPropertyId;
        } else if (targetType === 'USER') {
            if (selectedUserIds.length === 0) return toast.error('Select at least one user');
            payload.targetUsers = selectedUserIds;
        }

        broadcastMutation.mutate(payload);
    };

    const toggleRole = (roleName: string) => {
        setSelectedRoles(prev => 
            prev.includes(roleName) ? prev.filter(r => r !== roleName) : [...prev, roleName]
        );
    };

    const toggleUser = (user: any) => {
        if (selectedUserIds.includes(user.id)) {
            setSelectedUserIds(prev => prev.filter(id => id !== user.id));
        } else {
            setSelectedUserIds(prev => [...prev, user.id]);
        }
        setUserSearchTerm('');
    };

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <BellRing className="h-8 w-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight">Notification Center</h1>
                    <p className="text-muted-foreground mt-1">Compose and broadcast alerts to your users</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Compose Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Send className="h-5 w-5 text-primary" />
                                Compose Message
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Notification Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Special Summer Deal! 🏖️"
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1.5">Message Content</label>
                                <textarea
                                    rows={4}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Describe your offer or update here..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none resize-none"
                                />
                            </div>

                            <div className="pt-4 border-t border-border">
                                <button
                                    onClick={handleSend}
                                    disabled={broadcastMutation.isPending}
                                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-bold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20 disabled:shadow-none"
                                >
                                    {broadcastMutation.isPending ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <Send className="h-5 w-5" />
                                    )}
                                    Broadcast Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Target Selection */}
                <div className="space-y-6">
                    <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/30">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                Select Recipients
                            </h2>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'ALL', label: 'Everyone', icon: Users },
                                    { id: 'ROLE', label: 'By Role', icon: Shield },
                                    { id: 'PROPERTY', label: 'Property', icon: Building2 },
                                    { id: 'USER', label: 'Individuals', icon: UserIcon },
                                ].map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setTargetType(type.id as any)}
                                        className={clsx(
                                            "flex flex-col items-center justify-center p-3 rounded-xl border transition-all gap-1.5",
                                            targetType === type.id 
                                                ? "bg-primary text-primary-foreground border-primary shadow-sm" 
                                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                                        )}
                                    >
                                        <type.icon className="h-5 w-5" />
                                        <span className="text-xs font-semibold">{type.label}</span>
                                    </button>
                                ))}
                            </div>

                            <div className="pt-6 border-t border-border animate-in fade-in slide-in-from-top-2 duration-300">
                                {targetType === 'ALL' && (
                                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl">
                                        <p className="text-sm font-medium text-primary flex items-center gap-2">
                                            <BellRing className="h-4 w-4" />
                                            Everyone on the platform
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">This will be sent to all active users, property owners, and partners.</p>
                                    </div>
                                )}

                                {targetType === 'ROLE' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Choose Roles</label>
                                        <div className="space-y-1.5">
                                            {roles.map(role => (
                                                <button
                                                    key={role.id}
                                                    onClick={() => toggleRole(role.name)}
                                                    className={clsx(
                                                        "w-full flex items-center justify-between p-3 rounded-lg border text-sm transition-all",
                                                        selectedRoles.includes(role.name) 
                                                            ? "bg-primary/10 border-primary text-primary font-medium" 
                                                            : "bg-background border-border text-foreground hover:bg-muted"
                                                    )}
                                                >
                                                    {role.name}
                                                    {selectedRoles.includes(role.name) && <CheckCircle2 className="h-4 w-4" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {targetType === 'PROPERTY' && (
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Choose Property</label>
                                        <select
                                            value={selectedPropertyId}
                                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                                            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                        >
                                            <option value="">Select a property...</option>
                                            {properties.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                        <p className="text-xs text-muted-foreground mt-1 px-1">Sends to all guests who have booked this property.</p>
                                    </div>
                                )}

                                {targetType === 'USER' && (
                                    <div className="space-y-4">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <input
                                                type="text"
                                                value={userSearchTerm}
                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                                placeholder="Search by name or email..."
                                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 transition-all outline-none text-sm"
                                            />
                                            {isSearchingUsers && (
                                                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                                            )}
                                        </div>

                                        {userSearchTerm.length > 2 && filteredUsers.length > 0 && (
                                            <div className="bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                                                {filteredUsers.map(u => (
                                                    <button
                                                        key={u.id}
                                                        onClick={() => toggleUser(u)}
                                                        className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                            {u.firstName[0]}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">{u.email}</p>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-1">Selected Recipients ({selectedUserIds.length})</label>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedUserIds.length === 0 ? (
                                                    <p className="text-xs italic text-muted-foreground px-1">No users selected.</p>
                                                ) : (
                                                    selectedUserIds.map(id => (
                                                        <span key={id} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                                                            {searchedUsers.find(u => u.id === id)?.firstName || 'User'}
                                                            <button 
                                                                onClick={() => setSelectedUserIds(prev => prev.filter(uid => uid !== id))}
                                                                className="hover:bg-primary/20 rounded-full p-0.5"
                                                            >
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </span>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
