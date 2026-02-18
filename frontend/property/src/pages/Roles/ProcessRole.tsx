import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../services/roles';
import { Loader2, ArrowLeft, Save, AlertCircle, Shield, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

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
});

type RoleFormData = z.infer<typeof roleSchema>;

export default function ProcessRole() {
    const { id } = useParams();
    const isEditing = !!id;
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, setValue, watch } = useForm<RoleFormData>({
        resolver: zodResolver(roleSchema),
        defaultValues: { name: '', description: '', category: 'PROPERTY', permissions: [] },
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

    useEffect(() => {
        if (role) {
            reset({ name: role.name, description: role.description, category: (role.category || 'PROPERTY') as any, permissions: role.permissions || [] });
        }
    }, [role, reset]);

    const mutation = useMutation({
        mutationFn: (data: RoleFormData) => isEditing ? rolesService.update(id!, data) : rolesService.create(data),
        onSuccess: () => {
            toast.success(`Role ${isEditing ? 'updated' : 'created'} successfully`);
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            navigate('/roles');
        },
        onError: (error: any) => toast.error(error.response?.data?.message || 'Failed to save role'),
    });

    const onSubmit = (data: RoleFormData) => mutation.mutate(data);

    const togglePermission = (permName: string) => {
        const current = selectedPermissions || [];
        const updated = current.includes(permName) ? current.filter(p => p !== permName) : [...current, permName];
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleGroup = (groupPermissions: any[]) => {
        const ids = groupPermissions.map(p => p.name);
        const allSelected = ids.every(id => (selectedPermissions || []).includes(id));
        const updated = allSelected ? (selectedPermissions || []).filter(p => !ids.includes(p)) : Array.from(new Set([...(selectedPermissions || []), ...ids]));
        setValue('permissions', updated, { shouldDirty: true });
    };

    const toggleAll = () => {
        const allIds = (availablePermissions || []).map((p: any) => p.name);
        const allSelected = allIds.every((id: string) => (selectedPermissions || []).includes(id));
        setValue('permissions', allSelected ? [] : allIds, { shouldDirty: true });
    };

    if ((isEditing && isLoadingRole) || isLoadingPermissions) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    const canEditName = !role?.isSystem;
    const groupedPermissions = (availablePermissions || []).reduce((acc: any, perm: any) => {
        const group = perm.module || 'Other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, any[]>);

    const allPermissionsSelected = availablePermissions.length > 0 && availablePermissions.every((p: any) => (selectedPermissions || []).includes(p.name));

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-24">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/roles')} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEditing ? 'Edit Role' : 'Create Role'}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{isEditing ? 'Update role details and permissions' : 'Define a new role and its access levels'}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                        <Shield className="h-5 w-5 text-blue-600" /> Role Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
                            <input {...register('name')} disabled={!canEditName} placeholder="e.g. Shift Manager"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:opacity-60" />
                            {errors.name && <p className="mt-1 text-sm text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> {errors.name.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[{ id: 'PROPERTY', label: 'Property' }, { id: 'EVENT', label: 'Event' }].map((cat) => (
                                    <button key={cat.id} type="button" onClick={() => setValue('category', cat.id as any)}
                                        className={clsx("flex items-center gap-2 p-3 rounded-lg border transition-all text-xs font-bold",
                                            currentCategory === cat.id ? "bg-blue-600 border-blue-600 text-white shadow-sm" : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600")}>
                                        <Building2 className="h-4 w-4" /> {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea {...register('description')} rows={3} placeholder="Brief description of responsibilities"
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Access Permissions</h2>
                        <button type="button" onClick={toggleAll}
                            className={clsx("text-sm font-medium px-4 py-2 rounded-lg transition-colors",
                                allPermissionsSelected ? "bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100")}>
                            {allPermissionsSelected ? 'Deselect All' : 'Select All Permissions'}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {Object.entries(groupedPermissions).map(([group, permissions]: [string, any[]]) => {
                            const groupIds = permissions.map((p: any) => p.name);
                            const isGroupSelected = groupIds.every((id: string) => (selectedPermissions || []).includes(id));

                            return (
                                <div key={group} className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-200/50 dark:border-gray-600/50">
                                    <div className="flex items-center justify-between mb-4 border-b border-gray-200 dark:border-gray-600 pb-2">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">{group}</h3>
                                        <button type="button" onClick={() => toggleGroup(permissions)}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700">{isGroupSelected ? 'Deselect Group' : 'Select Group'}</button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {permissions.map((perm: any) => (
                                            <div key={perm.id} onClick={() => togglePermission(perm.name)}
                                                className={clsx("cursor-pointer p-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-3",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700")}>
                                                <div className={clsx("w-4 h-4 rounded border flex items-center justify-center",
                                                    selectedPermissions?.includes(perm.name) ? "bg-white border-white" : "border-gray-300 dark:border-gray-500 bg-white dark:bg-gray-700")}>
                                                    {selectedPermissions?.includes(perm.name) && (
                                                        <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold">{perm.description}</span>
                                                    <span className={clsx("text-[10px]", selectedPermissions?.includes(perm.name) ? "text-white/80" : "text-gray-400")}>{perm.name}</span>
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
