import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../services/roles';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ArrowLeft, Save, AlertCircle, Shield, Building2, Calendar, Star } from 'lucide-react';
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

    const { data: availablePermissions = [], isLoading: isLoadingPermissions } = useQuery({
        queryKey: ['permissions'],
        queryFn: rolesService.getPermissions,
    });

    useEffect(() => {
        if (role) {
            reset({
                name: role.name,
                description: role.description,
                category: role.category || 'PROPERTY',
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
        mutation.mutate(data);
    };

    const togglePermission = (permissionId: string) => {
        const current = selectedPermissions || [];
        const updated = current.includes(permissionId)
            ? current.filter(id => id !== permissionId)
            : [...current, permissionId];
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleGroup = (groupPermissions: typeof availablePermissions) => {
        const current = selectedPermissions || [];
        const groupIds = groupPermissions.map(p => p.name);
        const allSelected = groupIds.every(id => current.includes(id));

        let updated;
        if (allSelected) {
            updated = current.filter(id => !groupIds.includes(id));
        } else {
            const unique = new Set([...current, ...groupIds]);
            updated = Array.from(unique);
        }
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleAll = () => {
        const current = selectedPermissions || [];
        const allIds = availablePermissions.map(p => p.name);
        const allSelected = allIds.every(id => current.includes(id));

        setValue('permissions', allSelected ? [] : allIds, { shouldDirty: true });
    }

    if ((isEditing && isLoadingRole) || isLoadingPermissions) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    // Restriction check
    const isUpdatingSystemRole = isEditing && role?.isSystem;
    const canEditProtectedFields = isSuperAdmin || !role?.isSystem;

    const groupedPermissions = availablePermissions.reduce((acc, perm) => {
        const group = perm.module || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, typeof availablePermissions>);

    const allPermissionsSelected = availablePermissions.length > 0 &&
        availablePermissions.every(p => (selectedPermissions || []).includes(p.name));

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
                                className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all underline-none disabled:opacity-60"
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
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
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
                            {allPermissionsSelected ? 'Deselect All' : 'Select All Permissions'}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {Object.entries(groupedPermissions).map(([group, permissions]) => {
                            const groupIds = permissions.map(p => p.name);
                            const isGroupSelected = groupIds.every(id => (selectedPermissions || []).includes(id));

                            return (
                                <div key={group} className="bg-muted/30 p-4 rounded-xl border border-border/50">
                                    <div className="flex items-center justify-between mb-4 border-b border-border/50 pb-2">
                                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">{group}</h3>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(permissions)}
                                            className="text-xs font-medium text-primary hover:text-primary/80"
                                        >
                                            {isGroupSelected ? 'Deselect Group' : 'Select Group'}
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {permissions.map((perm) => (
                                            <div
                                                key={perm.id}
                                                onClick={() => togglePermission(perm.name)}
                                                className={clsx(
                                                    "cursor-pointer p-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-3",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                        : "bg-card border-border text-muted-foreground hover:bg-muted"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-white border-white"
                                                        : "border-muted-foreground bg-background"
                                                )}>
                                                    {selectedPermissions?.includes(perm.name) && (
                                                        <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{perm.description}</span>
                                                    <span className={clsx(
                                                        "text-[10px] font-normal",
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
