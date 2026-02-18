import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '../../services/roles';
import { useAuth } from '../../context/AuthContext';
import { Plus, Edit2, Trash2, Shield, Loader2, Star, Building2, Calendar } from 'lucide-react';
import clsx from 'clsx';
import { Role } from '../../types/user';

export default function RolesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const isSuperAdmin = user?.roles?.includes('SuperAdmin');

    const { data: roles, isLoading } = useQuery<Role[]>({
        queryKey: ['roles'],
        queryFn: rolesService.getAll,
    });

    const deleteMutation = useMutation({
        mutationFn: rolesService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roles'] });
        },
    });

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this role?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        );
    }

    const getCategoryIcon = (category?: string) => {
        switch (category) {
            case 'PROPERTY': return <Building2 className="h-4 w-4" />;
            case 'EVENT': return <Calendar className="h-4 w-4" />;
            default: return <Star className="h-4 w-4" />;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Roles & Permissions</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage system access and user roles</p>
                </div>
                <button
                    onClick={() => navigate('/roles/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                    <Plus className="h-5 w-5" />
                    Create Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles?.map((role) => {
                    const canEdit = isSuperAdmin || !role.isSystem;
                    return (
                        <div key={role.id} className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-primary/10 rounded-lg text-primary">
                                    <Shield className="h-6 w-6" />
                                </div>
                                {canEdit && (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => navigate(`/roles/edit/${role.id}`)}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-full transition-colors"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(role.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-card-foreground">{role.name}</h3>
                                    {role.category && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border">
                                            {getCategoryIcon(role.category)}
                                            {role.category}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                                    {role.description || 'No description provided'}
                                </p>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4 mt-auto">
                                <span>{role.permissions?.length || 0} Permissions</span>
                                <span className={clsx(
                                    "px-2.5 py-1 rounded-full font-medium transition-colors",
                                    role.isSystem ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                )}>
                                    {role.isSystem ? 'System Template' : 'Property Role'}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
