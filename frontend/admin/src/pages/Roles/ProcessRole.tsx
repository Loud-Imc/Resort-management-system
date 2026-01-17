import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { rolesService } from '../../services/roles';
import { Loader2, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { useEffect } from 'react';

// Common permissions list for now (should ideally come from backend)
const AVAILABLE_PERMISSIONS = [
    { id: 'bookings.view', label: 'View Bookings', group: 'Bookings' },
    { id: 'bookings.create', label: 'Create Bookings', group: 'Bookings' },
    { id: 'bookings.edit', label: 'Edit Bookings', group: 'Bookings' },
    { id: 'bookings.delete', label: 'Delete Bookings', group: 'Bookings' },
    { id: 'rooms.view', label: 'View Rooms', group: 'Rooms' },
    { id: 'rooms.create', label: 'Create Rooms', group: 'Rooms' },
    { id: 'rooms.edit', label: 'Edit Rooms', group: 'Rooms' },
    { id: 'rooms.delete', label: 'Delete Rooms', group: 'Rooms' },
    { id: 'users.view', label: 'View Users', group: 'Users' },
    { id: 'users.manage', label: 'Manage Users', group: 'Users' },
    { id: 'financials.view', label: 'View Financials', group: 'Financials' },
];

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

    const selectedPermissions = watch('permissions');

    const { data: role, isLoading: isLoadingRole } = useQuery({
        queryKey: ['role', id],
        queryFn: () => rolesService.getById(id!),
        enabled: isEditing,
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

    if (isEditing && isLoadingRole) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    const groupedPermissions = AVAILABLE_PERMISSIONS.reduce((acc, perm) => {
        if (!acc[perm.group]) acc[perm.group] = [];
        acc[perm.group].push(perm);
        return acc;
    }, {} as Record<string, typeof AVAILABLE_PERMISSIONS>);

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
                    <h2 className="text-lg font-semibold mb-6">Access Permissions</h2>
                    <div className="space-y-8">
                        {Object.entries(groupedPermissions).map(([group, permissions]) => (
                            <div key={group}>
                                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">{group}</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {permissions.map((perm) => (
                                        <div
                                            key={perm.id}
                                            onClick={() => togglePermission(perm.id)}
                                            className={clsx(
                                                "cursor-pointer p-3 rounded-lg border text-sm font-medium transition-all flex items-center gap-3",
                                                selectedPermissions?.includes(perm.id)
                                                    ? "bg-primary-50 border-primary-200 text-primary-700 shadow-sm"
                                                    : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"
                                            )}
                                        >
                                            <div className={clsx(
                                                "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                                selectedPermissions?.includes(perm.id)
                                                    ? "bg-primary-500 border-primary-500"
                                                    : "border-gray-400 bg-white"
                                            )}>
                                                {selectedPermissions?.includes(perm.id) && (
                                                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                            {perm.label}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
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
