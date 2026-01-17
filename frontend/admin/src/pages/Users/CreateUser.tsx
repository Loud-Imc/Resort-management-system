import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { usersService } from '../../services/users';
import { rolesService } from '../../services/roles';
import { Loader2, ArrowLeft, Save, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const userSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters').optional().or(z.literal('')),
    phone: z.string().optional(),
    roleIds: z.array(z.string()).min(1, 'Select at least one role'),
    isActive: z.boolean(),
});

type UserFormData = z.infer<typeof userSchema>;

export default function CreateUser() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);

    const { data: roles } = useQuery({
        queryKey: ['roles'],
        queryFn: rolesService.getAll,
    });

    const { data: existingUser, isLoading: loadingUser } = useQuery({
        queryKey: ['user', id],
        queryFn: () => usersService.getById(id!),
        enabled: isEditMode,
    });

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<UserFormData>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: '',
            roleIds: [],
            isActive: true,
        },
    });

    // Watch roles to conditionally render UI if needed, or simply for debugging
    const selectedRoles = watch('roleIds');

    useEffect(() => {
        if (existingUser) {
            setValue('firstName', existingUser.firstName);
            setValue('lastName', existingUser.lastName);
            setValue('email', existingUser.email);
            setValue('phone', existingUser.phone || '');
            setValue('isActive', existingUser.isActive);
            setValue('roleIds', existingUser.roles.map(ur => ur.role.id));
        }
    }, [existingUser, setValue]);

    const mutation = useMutation({
        mutationFn: (data: UserFormData) => {
            if (isEditMode) {
                // For update, we might filter out password if empty
                const { password, ...updateData } = data;
                return usersService.update(id!, updateData);
            }
            // For create, password is required
            if (!data.password) {
                throw new Error("Password is required for new users");
            }
            return usersService.create(data as any);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            navigate('/users');
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to save user');
        },
    });

    const onSubmit = (data: UserFormData) => {
        mutation.mutate(data);
    };

    const toggleRole = (roleId: string) => {
        const currentRoles = watch('roleIds');
        if (currentRoles.includes(roleId)) {
            setValue('roleIds', currentRoles.filter(id => id !== roleId));
        } else {
            setValue('roleIds', [...currentRoles, roleId]);
        }
    };

    if (isEditMode && loadingUser) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-2xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/users')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit User' : 'Create New User'}</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                            <input
                                {...register('firstName')}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                            <input
                                {...register('lastName')}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                type="email"
                                {...register('email')}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input
                                type="tel"
                                {...register('phone')}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold mb-4">Security & Access</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                {isEditMode ? 'New Password (leave blank to keep current)' : 'Password'}
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    {...register('password')}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Roles</label>
                            <div className="grid grid-cols-2 gap-3">
                                {roles?.map((role) => (
                                    <div
                                        key={role.id}
                                        className={`
                                    border rounded-lg p-3 cursor-pointer transition-colors flex items-center gap-3
                                    ${watch('roleIds').includes(role.id)
                                                ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-500'
                                                : 'border-gray-200 hover:border-primary-200'
                                            }
                                `}
                                        onClick={() => toggleRole(role.id)}
                                    >
                                        <input
                                            type="checkbox"
                                            value={role.id}
                                            checked={watch('roleIds').includes(role.id)}
                                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                            readOnly
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{role.name}</p>
                                            {role.description && <p className="text-xs text-gray-500">{role.description}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {errors.roleIds && <p className="text-red-500 text-xs mt-1">{errors.roleIds.message}</p>}
                        </div>

                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                {...register('isActive')}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Active Account
                            </label>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 text-lg font-medium shadow-sm"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        {isEditMode ? 'Update User' : 'Create User'}
                    </button>
                </div>
            </form>
        </div>
    );
}
