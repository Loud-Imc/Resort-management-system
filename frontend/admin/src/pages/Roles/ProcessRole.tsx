import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../services/roles';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ArrowLeft, Save, AlertCircle, Shield, Building2, Calendar, Star, Lock, Check } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';
import { Role } from '../../types/user';
import toast from 'react-hot-toast';

const roleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.enum(['SYSTEM', 'PROPERTY', 'EVENT']),
    permissions: z.array(z.string()),
});

type RoleFormData = z.infer<typeof roleSchema>;

// Tabs Configuration based on Sidebar Categories - 1-to-1 Mapping
const getTabsForCategory = (category: 'SYSTEM' | 'PROPERTY' | 'EVENT') => {
    if (category === 'SYSTEM') {
        return [
            { id: 'exec-dashboard', label: 'Executive Dashboard', prefix: ['reports.viewDashboard'] },
            { id: 'platform-reports', label: 'Platform Reports', prefix: ['reports.viewFinancial'] },
            { id: 'all-properties', label: 'All Properties', prefix: ['properties.read', 'properties.update', 'properties.create', 'properties.delete'] },
            { id: 'property-requests', label: 'Property Requests', prefix: ['properties.approve'] },
            { id: 'cp-onboarding', label: 'CP Onboarding', prefix: ['channelPartners'] },
            { id: 'settlements', label: 'Settlements', prefix: ['finance.approveSettlement', 'finance.processPayout'] },
            { id: 'wallet-adjustments', label: 'Wallet Adjustments', prefix: ['finance.approveAdjustment'] },
            { id: 'refund-requests', label: 'Refund Requests', prefix: ['finance.approveRefund'] },
            { id: 'reconciliation', label: 'Reconciliation', prefix: ['finance.reconcilePayment'] },
            { id: 'growth-dashboard', label: 'Growth Dashboard', prefix: ['marketing.read'] },
            { id: 'coupons', label: 'Coupons', prefix: ['marketing.manageCoupons', 'marketing.approveCoupon'] },
            { id: 'web-banners', label: 'Web Banners', prefix: ['marketing.manageOffers'] },
            { id: 'broadcast-alerts', label: 'Broadcast Alerts', prefix: ['marketing.manageBroadcasts'] },
            { id: 'platform-settings', label: 'Platform Settings', prefix: ['settings'] },
            { id: 'platform-users', label: 'Platform Users', prefix: ['users'] },
            { id: 'system-roles', label: 'System Roles', prefix: ['roles'] },
            { id: 'events', label: 'Events & Ticketing', prefix: ['events', 'eventBookings'] },
        ];
    } else if (category === 'PROPERTY') {
        return [
            { id: 'dashboard', label: 'Dashboard', prefix: ['reports.viewDashboard'] },
            { id: 'bookings', label: 'Bookings', prefix: ['bookings'] },
            { id: 'guests', label: 'Guests', prefix: ['users.read'] },
            { id: 'rooms', label: 'Rooms', prefix: ['rooms'] },
            { id: 'room-types', label: 'Room Types', prefix: ['roomTypes'] },
            { id: 'payments', label: 'Payments', prefix: ['payments'] },
            { id: 'financials', label: 'Financials', prefix: ['reports.viewFinancial', 'income'] },
            { id: 'add-expenses', label: 'Add Expenses', prefix: ['expenses'] },
            { id: 'offers-marketing', label: 'Offers & Marketing', prefix: ['marketing.read', 'marketing.manageCoupons'] },
            { id: 'promotional-boosters', label: 'Promotional Boosters', prefix: ['marketing.manageOffers'] },
            { id: 'sources', label: 'Sources', prefix: ['bookingSources'] },
            { id: 'my-team', label: 'My Team', prefix: ['propertyStaff', 'users.create', 'users.update', 'users.delete'] },
            { id: 'roles', label: 'Roles', prefix: ['roles'] },
            { id: 'reports', label: 'Reports', prefix: ['reports.viewOccupancy'] },
            { id: 'calendar-sync', label: 'Calendar Sync', prefix: ['settings'] },
            { id: 'my-property', label: 'My Property', prefix: ['properties'] },
            { id: 'events', label: 'Events & Ticketing', prefix: ['events', 'eventBookings'] },
        ];
    } else { // EVENT
        return [
            { id: 'events', label: 'Events & Ticketing', prefix: ['events', 'eventBookings'] }
        ];
    }
};

const getPermissionTabId = (permName: string, tabs: any[]) => {
    // 1. Check exact matches first
    const exactMatch = tabs.find(tab => tab.prefix.includes(permName));
    if (exactMatch) return exactMatch.id;

    // 2. Check module matches (e.g. 'rooms')
    const moduleName = permName.split('.')[0];
    const moduleMatch = tabs.find(tab => tab.prefix.includes(moduleName));
    if (moduleMatch) return moduleMatch.id;

    return undefined; // Not in any tab for this category
};

export default function ProcessRole() {
    const { id } = useParams();
    const isEditing = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.includes('SuperAdmin');

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            category: 'PROPERTY',
            permissions: [],
        },
    });

    const selectedPermissions = watch('permissions') || [];
    const currentCategory = watch('category');

    const { data: role, isLoading: isLoadingRole } = useQuery<Role>({
        queryKey: ['role', id],
        queryFn: () => rolesService.getById(id!),
        enabled: isEditing,
    });

    const { data: availablePermissions = [], isLoading: isLoadingPermissions } = useQuery<any[]>({
        queryKey: ['permissions'],
        queryFn: rolesService.getPermissions,
    });

    // Determine current tabs & permissions
    const tabs = getTabsForCategory(currentCategory);
    const categoryPermissions = availablePermissions.filter(perm => {
        const tabId = getPermissionTabId(perm.name, tabs);
        return tabId !== undefined;
    });

    useEffect(() => {
        if (role) {
            reset({
                name: role.name,
                description: role.description,
                category: (role.category || 'PROPERTY') as any,
                permissions: role.permissions || [],
            });
        }
    }, [role, reset]);

    const mutation = useMutation({
        mutationFn: (data: RoleFormData) => {
            if (isEditing) {
                return rolesService.update(id!, data);
            }
            return rolesService.create(data);
        },
        onSuccess: () => {
            toast.success(`Role ${isEditing ? 'updated' : 'created'} successfully`);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            navigate('/roles');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save role');
        },
    });

    const onSubmit = (data: RoleFormData) => {
        const validPerms = data.permissions.filter(perm => {
            return getPermissionTabId(perm, tabs) !== undefined;
        });
        mutation.mutate({
            ...data,
            permissions: validPerms
        });
    };

    const isMarketingRole = role?.name === 'Marketing';
    const fixedMarketingPermissions = [
        'marketing.read',
        'properties.approve',
        'properties.create',
        'properties.delete',
        'properties.read',
        'properties.update'
    ];

    const togglePermission = (permissionId: string) => {
        if (isMarketingRole && fixedMarketingPermissions.includes(permissionId)) {
            toast.error('This permission is required for the Marketing role and cannot be removed.');
            return;
        }
        
        const current = selectedPermissions || [];
        const updated = current.includes(permissionId)
            ? current.filter(id => id !== permissionId)
            : [...current, permissionId];
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleTabGroup = (tabId: string) => {
        const tabPermissions = categoryPermissions.filter(p => getPermissionTabId(p.name, tabs) === tabId);
        const tabIds = tabPermissions.map(p => p.name);
        const allSelected = tabIds.every(id => selectedPermissions.includes(id));

        let updated: string[];
        if (allSelected) {
            updated = selectedPermissions.filter(id => !tabIds.includes(id));
            if (isMarketingRole) {
                fixedMarketingPermissions.forEach(fixed => {
                    if (tabIds.includes(fixed) && !updated.includes(fixed)) {
                        updated.push(fixed);
                    }
                });
            }
        } else {
            updated = Array.from(new Set([...selectedPermissions, ...tabIds]));
        }
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleAll = () => {
        const allIds = categoryPermissions.map(p => p.name);
        const allSelected = allIds.every(id => selectedPermissions.includes(id));

        if (allSelected) {
            let cleared = [] as string[];
            if (isMarketingRole) {
                cleared = fixedMarketingPermissions;
                toast.success('Fixed Marketing permissions have been retained.');
            }
            setValue('permissions', cleared, { shouldDirty: true });
        } else {
            setValue('permissions', allIds, { shouldDirty: true });
        }
    };

    if ((isEditing && isLoadingRole) || isLoadingPermissions) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    const isUpdatingSystemRole = isEditing && role?.isSystem;
    const canEditProtectedFields = isSuperAdmin || !role?.isSystem;
    const allPermissionsSelected = categoryPermissions.length > 0 && categoryPermissions.every(p => selectedPermissions.includes(p.name));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/roles')}
                        className="p-2 text-muted-foreground hover:bg-muted rounded-full transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isEditing ? 'Edit Role' : 'Create Role'}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {isEditing ? 'Update role details and permissions' : 'Define a new role and its access levels'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">
                {/* Basic Info */}
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-foreground">
                        <Shield className="h-5 w-5 text-primary" />
                        Role Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Role Name</label>
                            <input
                                {...register('name')}
                                disabled={!canEditProtectedFields}
                                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none disabled:opacity-60"
                                placeholder="e.g. Shift Manager"
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-destructive flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" /> {errors.name.message}
                                </p>
                            )}
                            {isUpdatingSystemRole && !isSuperAdmin && (
                                <p className="mt-2 text-xs text-amber-500 font-medium italic">
                                    * System roles names cannot be modified by property owners.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Category (The "Box")</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'SYSTEM', icon: Star, label: 'System' },
                                    { id: 'PROPERTY', icon: Building2, label: 'Property' },
                                    { id: 'EVENT', icon: Calendar, label: 'Event' }
                                ].map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        disabled={!isSuperAdmin}
                                        onClick={() => setValue('category', cat.id as any)}
                                        className={clsx(
                                            "flex flex-col items-center gap-1 p-3 rounded-lg border transition-all text-xs font-bold",
                                            currentCategory === cat.id
                                                ? "bg-primary border-primary text-primary-foreground shadow-sm"
                                                : "bg-muted border-border text-muted-foreground hover:bg-muted/80",
                                            !isSuperAdmin && "opacity-50 cursor-not-allowed"
                                        )}
                                    >
                                        <cat.icon className="h-4 w-4" />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                            {!isSuperAdmin && (
                                <p className="mt-2 text-xs text-muted-foreground italic">
                                    * Only platform admins can change role categories.
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                            <textarea
                                {...register('description')}
                                rows={3}
                                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                                placeholder="Brief description of responsibilities"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 border-b border-border/50 pb-4">
                        <h2 className="text-lg font-semibold text-foreground">Access Permissions</h2>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className={clsx(
                                "text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto",
                                allPermissionsSelected
                                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20"
                                    : "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                        >
                            {allPermissionsSelected ? 'Deselect All' : 'Select All Categories'}
                        </button>
                    </div>

                    {/* Permissions list stacked vertically one after another */}
                    <div className="space-y-6">
                        {tabs.map(tab => {
                            const tabPermissions = categoryPermissions.filter(p => getPermissionTabId(p.name, tabs) === tab.id);
                            if (tabPermissions.length === 0) return null;

                            const count = tabPermissions.filter(p => selectedPermissions.includes(p.name)).length;
                            const total = tabPermissions.length;
                            const isTabSelected = total > 0 && tabPermissions.every(p => selectedPermissions.includes(p.name));

                            return (
                                <div key={tab.id} className="bg-muted/30 p-5 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{tab.label}</h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-muted text-muted-foreground">
                                                {count}/{total}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleTabGroup(tab.id)}
                                            className="text-xs font-bold text-primary hover:text-primary/80"
                                        >
                                            {isTabSelected ? 'Deselect Category' : 'Select Category'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {tabPermissions.map((perm) => (
                                            <div
                                                key={perm.id}
                                                onClick={() => togglePermission(perm.name)}
                                                className={clsx(
                                                    "cursor-pointer p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3 relative",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted",
                                                    isMarketingRole && fixedMarketingPermissions.includes(perm.name) && "opacity-90 ring-1 ring-primary/50"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-white border-white"
                                                        : "border-muted-foreground bg-background"
                                                )}>
                                                    {selectedPermissions?.includes(perm.name) && (
                                                        isMarketingRole && fixedMarketingPermissions.includes(perm.name) ? (
                                                            <Lock className="w-3.5 h-3.5 text-primary" />
                                                        ) : (
                                                            <Check className="w-3.5 h-3.5 text-primary stroke-[4px]" />
                                                        )
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold truncate">{perm.description}</span>
                                                    <span className={clsx(
                                                        "text-[10px] font-normal truncate",
                                                        selectedPermissions?.includes(perm.name) ? "text-primary-foreground/80" : "text-muted-foreground"
                                                    )}>{perm.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-background/80 backdrop-blur-md border-t border-border p-4 flex justify-end z-10">
                    <button
                        type="submit"
                        disabled={mutation.isPending || isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-70 font-bold"
                    >
                        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        {isEditing ? 'Update Role' : 'Create Role'}
                    </button>
                </div>
            </form>
        </div>
    );
}
