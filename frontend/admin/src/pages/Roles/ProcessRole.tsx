import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../services/roles';
import { Loader2, ArrowLeft, Save, AlertCircle, Shield } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';
import { Role } from '../../types/user';

const roleSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
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
        defaultValues: {
            name: '',
            description: '',
            permissions: [],
        },
    });

    const selectedPermissions = watch('permissions') || [];

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
            queryClient.invalidateQueries({ queryKey: ['roles'] });
            navigate('/roles');
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to save role');
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
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
        );
    }

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
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            {isEditing ? 'Edit Role' : 'Create Role'}
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            {isEditing ? 'Update role details and permissions' : 'Define a new role and its access levels'}
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary-500" />
                        Role Details
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Role Name</label>
                            <input
                                {...register('name')}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                                placeholder="e.g. Shift Manager"
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                                    <AlertCircle className="h-4 w-4" /> {errors.name.message}
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input
                                {...register('description')}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none"
                                placeholder="Brief description of responsibilities"
                            />
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold">Access Permissions</h2>
                        <button
                            type="button"
                            onClick={toggleAll}
                            className={clsx(
                                "text-sm font-medium px-4 py-2 rounded-lg transition-colors",
                                allPermissionsSelected
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-primary-50 text-primary-600 hover:bg-primary-100"
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
                                <div key={group}>
                                    <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
                                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{group}</h3>
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(permissions)}
                                            className="text-xs font-medium text-primary-600 hover:text-primary-800"
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
                                                        ? "bg-primary-50 border-primary-200 text-primary-700 shadow-sm"
                                                        : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                                                )}
                                            >
                                                <div className={clsx(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                    selectedPermissions?.includes(perm.name)
                                                        ? "bg-primary-500 border-primary-500"
                                                        : "border-gray-400 bg-white"
                                                )}>
                                                    {selectedPermissions?.includes(perm.name) && (
                                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    )}
                                                </div>
                                                <div className='flex flex-col'>
                                                    <span>{perm.description}</span>
                                                    <span className='text-xs text-gray-400 font-normal'>{perm.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={mutation.isPending || isSubmitting}
                        className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/30 disabled:opacity-70"
                    >
                        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Save Role
                    </button>
                </div>
            </form>
        </div>
    );
}
