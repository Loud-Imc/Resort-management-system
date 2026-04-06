import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usersService } from '../../services/users';
import { rolesService } from '../../services/roles';
import staffService from '../../services/staff';
import { Loader2, ArrowLeft, Save, Eye, EyeOff, User, Mail, Phone, Lock, Shield, Activity, Percent, CheckCircle2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Role, User as UserType } from '../../types/user';
import toast from 'react-hot-toast';

const userSchema = z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().optional().or(z.literal('')), // Validated manually in mutation for create mode
    phone: z.union([z.string(), z.null(), z.undefined()]).transform(v => (v === '' || v === null) ? undefined : v),
    roleIds: z.array(z.string()).min(1, 'Select at least one role'),
    isActive: z.boolean(),
    commissionPercentage: z.union([z.number(), z.string(), z.null(), z.undefined()]).transform((val) => {
        if (val === '' || val === null || val === undefined) return null;
        const parsed = Number(val);
        return isNaN(parsed) ? null : parsed;
    }),
});

type UserFormInput = z.input<typeof userSchema>;

export default function CreateUser() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const propertyId = searchParams.get('propertyId');
    const defaultRole = searchParams.get('role');

    const isEditMode = !!id;
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);

    const { data: roles } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: rolesService.getAll,
    });

    const { data: existingUser, isLoading: loadingUser } = useQuery<UserType>({
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
    } = useForm<UserFormInput>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            email: '',
            password: '',
            phone: '',
            roleIds: [],
            isActive: true,
            commissionPercentage: undefined,
        },
    });

    // const selectedRoles = watch('roleIds');

    useEffect(() => {
        if (existingUser) {
            setValue('firstName', existingUser.firstName || '');
            setValue('lastName', existingUser.lastName || '');
            setValue('email', existingUser.email || '');
            setValue('phone', existingUser.phone || '');
            setValue('isActive', existingUser.isActive);
            setValue('roleIds', existingUser.roles?.map((ur: any) => ur.role.id) || []);
            if (existingUser.commissionPercentage !== null && existingUser.commissionPercentage !== undefined) {
                setValue('commissionPercentage', Number(existingUser.commissionPercentage) as any);
            } else {
                setValue('commissionPercentage', undefined as any);
            }
        }
    }, [existingUser, setValue]);

    const mutation = useMutation({
        mutationFn: (data: any) => {
            if (isEditMode) {
                // For update, we might filter out password if empty
                const { password, ...updateData } = data;
                return usersService.update(id!, updateData);
            }
            // For create, password is required
            if (!data.password) {
                throw new Error("Password is required for new users");
            }
            return usersService.create(data);
        },
        onSuccess: async (newUser: UserType) => {
            toast.success(`User ${isEditMode ? 'updated' : 'created'} successfully`);

            // If we came from a property staff management page, auto-link the user
            if (!isEditMode && propertyId && defaultRole) {
                try {
                    await staffService.addStaff(propertyId, newUser.id, defaultRole);
                    toast.success(`Assigned as ${defaultRole} to property`);
                    navigate(`/properties/${propertyId}/staff`);
                    return;
                } catch (err) {
                    console.error('Failed to auto-link staff:', err);
                    toast.error('User created, but failed to link to property automatically');
                }
            }

            queryClient.invalidateQueries({ queryKey: ['users'] });
            navigate('/users');
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || error.message || 'Failed to save user';
            toast.error(message);
        },
    });

    const onSubmit = (data: any) => {
        console.log('Form submitted with data:', data);
        mutation.mutate(data);
    };

    const onError = (errors: any) => {
        console.error('Form validation failed:', errors);
    };

    // ... inside return
    // <form onSubmit={handleSubmit(onSubmit, onError)} ...>

    const toggleRole = (roleId: string) => {
        const currentRoles = watch('roleIds') || [];
        if (currentRoles.includes(roleId)) {
            setValue('roleIds', currentRoles.filter(id => id !== roleId));
        } else {
            setValue('roleIds', [...currentRoles, roleId]);
        }
    };

    if (isEditMode && loadingUser) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    }

    const getRoleIcon = (roleName: string) => {
        const name = roleName.toLowerCase();
        if (name.includes('admin')) return <Shield className="h-5 w-5" />;
        if (name.includes('property') || name.includes('owner')) return <Activity className="h-5 w-5" />;
        if (name.includes('marketing') || name.includes('cp')) return <Percent className="h-5 w-5" />;
        return <User className="h-5 w-5" />;
    };

    return (
        <div className="max-w-3xl mx-auto pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/users')}
                        className="p-2.5 bg-card hover:bg-muted text-muted-foreground hover:text-foreground rounded-xl border border-border shadow-sm transition-all active:scale-95"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">{isEditMode ? 'Edit User Profile' : 'Create New User'}</h1>
                        <p className="text-muted-foreground text-sm">Manage administrative access and permissions.</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-8">
                <div className="bg-card p-8 rounded-2xl shadow-xl shadow-black/5 border border-border relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                            <User className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Personal Details</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">First Name</label>
                            <div className="relative group">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <input
                                    {...register('firstName')}
                                    placeholder="Enter first name"
                                    className="w-full pl-11 pr-4 py-3 bg-muted/30 border-border text-foreground rounded-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            {errors.firstName && <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.firstName.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Last Name</label>
                            <div className="relative group">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <input
                                    {...register('lastName')}
                                    placeholder="Enter last name"
                                    className="w-full pl-11 pr-4 py-3 bg-muted/30 border-border text-foreground rounded-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            {errors.lastName && <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.lastName.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="email"
                                    {...register('email')}
                                    placeholder="name@example.com"
                                    className="w-full pl-11 pr-4 py-3 bg-muted/30 border-border text-foreground rounded-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                            {errors.email && <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.email.message}</p>}
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Phone Number</label>
                            <div className="relative group">
                                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="tel"
                                    {...register('phone')}
                                    placeholder="+91 00000 00000"
                                    className="w-full pl-11 pr-4 py-3 bg-muted/30 border-border text-foreground rounded-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2 space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1 flex items-center gap-2">
                                Commission Percentage (%)
                                <span className="text-[10px] font-normal lowercase bg-primary/10 text-primary px-2 py-0.5 rounded-full">Optional</span>
                            </label>
                            <div className="relative group">
                                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="number"
                                    step="0.01"
                                    {...register('commissionPercentage', { valueAsNumber: true })}
                                    className="w-full pl-11 pr-4 py-3 bg-muted/30 border-border text-foreground rounded-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                                    placeholder="0.00"
                                />
                            </div>
                            <p className="text-[10px] text-muted-foreground ml-1 italic">
                                * Applies to properties onboarded by this user (typical for marketing roles).
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-card p-8 rounded-2xl shadow-xl shadow-black/5 border border-border relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-400/40 group-hover:bg-amber-400 transition-colors" />
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600 dark:text-amber-400">
                            <Lock className="h-5 w-5" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Security & Access</h2>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">
                                {isEditMode ? 'Update Password' : 'Account Password'}
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground/50 group-focus-within:text-primary transition-colors" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    {...register('password')}
                                    placeholder={isEditMode ? "Leave blank to keep current" : "••••••••"}
                                    className="w-full pl-11 pr-12 py-3 bg-muted/30 border-border text-foreground rounded-xl shadow-inner focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/50 hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                                </button>
                            </div>
                            {errors.password && <p className="text-destructive text-[10px] font-bold mt-1 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.password.message}</p>}
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider ml-1">Define Permissions (Roles)</label>
                                <span className="text-[10px] font-medium text-muted-foreground italic">Click to select multiple</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {roles?.map((role) => {
                                    const isSelected = (watch('roleIds') || []).includes(role.id);
                                    return (
                                        <div
                                            key={role.id}
                                            onClick={() => toggleRole(role.id)}
                                            className={`
                                                relative p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 transform active:scale-[0.98]
                                                ${isSelected
                                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/5'
                                                    : 'border-border bg-muted/20 hover:bg-muted/40 hover:border-muted-foreground/30'
                                                }
                                            `}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div className={`p-2 rounded-xl transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
                                                    {getRoleIcon(role.name)}
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`text-sm font-bold leading-none ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>{role.name}</h4>
                                                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary animate-in zoom-in duration-300" />}
                                                    </div>
                                                    {role.description && <p className="text-[10px] text-muted-foreground mt-2 line-clamp-2 leading-relaxed">{role.description}</p>}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            {errors.roleIds && <p className="text-destructive text-xs font-bold mt-2 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> {errors.roleIds.message}</p>}
                        </div>

                        <div
                            className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-border cursor-pointer hover:bg-muted/50 transition-all select-none"
                            onClick={() => setValue('isActive', !watch('isActive'))}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${watch('isActive') ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 'bg-muted text-muted-foreground'}`}>
                                    <Activity className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-foreground">Active Account</p>
                                    <p className="text-[10px] text-muted-foreground">Toggle to enable or disable system access.</p>
                                </div>
                            </div>
                            <div className={`
                                relative w-12 h-6 rounded-full transition-colors duration-300
                                ${watch('isActive') ? 'bg-emerald-500' : 'bg-muted-foreground/30'}
                            `}>
                                <div className={`
                                    absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300
                                    ${watch('isActive') ? 'translate-x-6' : 'translate-x-0'}
                                `} />
                            </div>
                            <input type="checkbox" {...register('isActive')} className="hidden" />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-8">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="group relative w-full sm:w-auto overflow-hidden bg-primary text-white px-10 py-4 rounded-2xl hover:opacity-95 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 flex items-center justify-center gap-3 text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-95"
                    >
                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                        {mutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        <span className="relative z-10">{isEditMode ? 'Update Profile' : 'Create User Account'}</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
