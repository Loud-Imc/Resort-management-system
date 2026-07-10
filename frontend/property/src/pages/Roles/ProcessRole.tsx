import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../services/roles';
import { Loader2, ArrowLeft, Save, AlertCircle, Shield, Building2, Check } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { useProperty } from '../../context/PropertyContext';

interface Role {
    id: string;
    name: string;
    description?: string;
    category?: string;
    isSystem: boolean;
    permissions?: string[];
}

const roleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    category: z.enum(['SYSTEM', 'PROPERTY', 'EVENT']),
    permissions: z.array(z.string()),
    propertyId: z.string().optional().nullable(),
});

type RoleFormData = z.infer<typeof roleSchema>;

// Functional Categories Mapping for better UI grouping
const PROPERTY_TABS = [
    { id: 'dashboard-reports', label: 'Dashboard & Reports', prefix: ['reports.'] },
    { id: 'property-rooms', label: 'Property & Rooms', prefix: ['properties.', 'rooms.', 'roomTypes.', 'assets.'] },
    { id: 'bookings-ops', label: 'Bookings & Operations', prefix: ['bookings.', 'bookingSources.'] },
    { id: 'financials', label: 'Financials', prefix: ['payments.', 'income.', 'expenses.'] },
    { id: 'marketing', label: 'Marketing & Offers', prefix: ['marketing.'] },
    { id: 'team-access', label: 'Team & Access Control', prefix: ['users.', 'propertyStaff.', 'roles.'] },
    { id: 'settings', label: 'Settings', prefix: ['settings.'] },
];

const getPermissionTabId = (permName: string) => {
    // Hide event permissions from UI entirely right now as they are not used
    if (permName.startsWith('events.') || permName.startsWith('eventBookings.')) {
        return undefined;
    }

    const match = PROPERTY_TABS.find(tab => tab.prefix.some(p => permName.startsWith(p)));
    return match ? match.id : undefined;
};

export default function ProcessRole() {
    const { id } = useParams();
    const isEditing = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: {
            name: '',
            description: '',
            category: 'PROPERTY',
            permissions: [],
            propertyId: selectedProperty?.id || null
        },
    });

    const selectedPermissions = watch('permissions') || [];

    const { data: role, isLoading: isLoadingRole } = useQuery<Role>({
        queryKey: ['role', id],
        queryFn: () => rolesService.getById(id!),
        enabled: isEditing,
    });

    const { data: availablePermissions = [], isLoading: isLoadingPermissions } = useQuery<any[]>({
        queryKey: ['permissions'],
        queryFn: rolesService.getPermissions,
    });

    // Filter out global/admin-only permissions to prevent escalation
    const filteredPermissions = (availablePermissions || []).filter(perm => {
        return getPermissionTabId(perm.name) !== undefined;
    });

    useEffect(() => {
        if (role) {
            reset({
                name: role.name,
                description: role.description,
                category: (role.category || 'PROPERTY') as any,
                permissions: role.permissions || [],
                propertyId: selectedProperty?.id || null
            });
        }
    }, [role, reset, selectedProperty]);

    const mutation = useMutation({
        mutationFn: (data: RoleFormData) => isEditing ? rolesService.update(id!, data) : rolesService.create(data),
        onSuccess: () => {
            toast.success(`Role ${isEditing ? 'updated' : 'created'} successfully`);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            navigate('/roles');
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to save role'),
    });

    const onSubmit = (data: RoleFormData) => {
        const validPerms = data.permissions.filter(perm => getPermissionTabId(perm) !== undefined);
        const payload = {
            ...data,
            permissions: validPerms,
            propertyId: data.propertyId || selectedProperty?.id
        };
        mutation.mutate(payload);
    };

    const togglePermission = (permName: string) => {
        const current = selectedPermissions || [];
        const updated = current.includes(permName) ? current.filter(p => p !== permName) : [...current, permName];
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleTabGroup = (tabId: string) => {
        const tabPermissions = filteredPermissions.filter(p => getPermissionTabId(p.name) === tabId);
        const ids = tabPermissions.map(p => p.name);
        const allSelected = ids.every(id => selectedPermissions.includes(id));
        const updated = allSelected
            ? selectedPermissions.filter(p => !ids.includes(p))
            : Array.from(new Set([...selectedPermissions, ...ids]));
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleAll = () => {
        const allIds = filteredPermissions.map((p: any) => p.name);
        const allSelected = allIds.every((id: string) => selectedPermissions.includes(id));
        setValue('permissions', allSelected ? [] : allIds, { shouldDirty: true });
    };

    if ((isEditing && isLoadingRole) || isLoadingPermissions) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const canEditName = !role?.isSystem;
    const allPermissionsSelected = filteredPermissions.length > 0 && filteredPermissions.every((p: any) => selectedPermissions.includes(p.name));

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/roles')} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Role' : 'Create Role'}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isEditing ? 'Update role details and permissions' : 'Define a new role and its access levels'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Details Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Shield className="h-5 w-5 text-blue-600" /> Role Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
                            <input {...register('name')} disabled={!canEditName} placeholder="e.g. Shift Manager"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60 outline-none" />
                            {errors.name && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button type="button" disabled
                                    className="flex items-center gap-2 p-3 rounded-lg border bg-blue-600 border-blue-600 text-white shadow-sm opacity-90 cursor-not-allowed text-xs font-bold">
                                    <Building2 className="h-4 w-4" /> Property
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea {...register('description')} rows={3} placeholder="Brief description of responsibilities"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                {/* Permissions Section */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Access Permissions</h2>
                        <button type="button" onClick={toggleAll}
                            className={clsx("text-sm font-medium px-4 py-2 rounded-lg transition-colors w-full sm:w-auto",
                                allPermissionsSelected ? "bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100")}>
                            {allPermissionsSelected ? 'Deselect All' : 'Select All Categories'}
                        </button>
                    </div>

                    {/* Permissions list stacked vertically one after another */}
                    <div className="space-y-6">
                        {PROPERTY_TABS.map(tab => {
                            const tabPermissions = filteredPermissions.filter(p => getPermissionTabId(p.name) === tab.id);
                            if (tabPermissions.length === 0) return null;

                            const count = tabPermissions.filter(p => selectedPermissions.includes(p.name)).length;
                            const total = tabPermissions.length;
                            const isTabSelected = total > 0 && tabPermissions.every(p => selectedPermissions.includes(p.name));

                            return (
                                <div key={tab.id} className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{tab.label}</h3>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full font-black bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                {count}/{total}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => toggleTabGroup(tab.id)}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-700"
                                        >
                                            {isTabSelected ? 'Deselect Category' : 'Select Category'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {tabPermissions.map((perm: any) => (
                                            <div key={perm.id} onClick={() => togglePermission(perm.name)}
                                                className={clsx("cursor-pointer p-4 rounded-xl border text-sm font-medium transition-all flex items-center gap-3",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700")}>
                                                <div className={clsx("w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0",
                                                    selectedPermissions?.includes(perm.name) ? "bg-white border-white" : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700")}>
                                                    {selectedPermissions?.includes(perm.name) && (
                                                        <Check className="w-3.5 h-3.5 text-blue-600 stroke-[4px]" />
                                                    )}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold truncate">{perm.description.replace(/^Permission for /i, '')}</span>
                                                    <span className={clsx("text-[10px] font-normal truncate", selectedPermissions?.includes(perm.name) ? "text-white/80" : "text-gray-400")}>{perm.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={mutation.isPending || isSubmitting}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-sm disabled:opacity-70 font-bold">
                        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        {isEditing ? 'Update Role' : 'Create Role'}
                    </button>
                </div>
            </form>
        </div>
    );
}
