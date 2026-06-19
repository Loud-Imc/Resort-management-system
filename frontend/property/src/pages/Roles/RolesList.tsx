import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '../../services/roles';
import { Plus, Edit2, Trash2, Shield, Loader2, Building2 } from 'lucide-react';
import clsx from 'clsx';
import { useProperty } from '../../context/PropertyContext';

interface Role {
    id: string;
    name: string;
    description?: string;
    category?: string;
    isSystem: boolean;
    permissions?: string[];
}

export default function RolesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    const { data: roles, isLoading } = useQuery<Role[]>({
        queryKey: ['roles', selectedProperty?.id],
        queryFn: () => rolesService.getRoles({ propertyId: selectedProperty?.id }),
    });

    const deleteMutation = useMutation({
        mutationFn: rolesService.delete,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
    });

    const handleDelete = (id: string) => {
        if (window.confirm('Are you sure you want to delete this role?')) deleteMutation.mutate(id);
    };

    if (isLoading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" /> Roles & Permissions
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage property access levels</p>
                </div>
                <button onClick={() => navigate('/roles/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm font-medium">
                    <Plus className="h-5 w-5" /> Create Role
                </button>
            </div>

            {!roles || roles.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center shadow-sm max-w-2xl mx-auto my-8">
                    <div className="relative mb-6">
                        <div className="absolute inset-0 bg-primary/10 dark:bg-primary/20 rounded-full blur-2xl opacity-70 animate-pulse"></div>
                        <div className="relative p-6 bg-gradient-to-tr from-primary to-primary/80 rounded-2xl text-primary-foreground shadow-lg">
                            <Shield className="h-12 w-12" />
                        </div>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Roles Defined Yet</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">
                        Define custom roles and permissions to delegate duties safely to your team members while keeping full control of access levels.
                    </p>
                    <button
                        onClick={() => navigate('/roles/create')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    >
                        <Plus className="h-5 w-5" />
                        Create Your First Role
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roles.map((role) => (
                        <div key={role.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all flex flex-col">
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-xl text-primary">
                                    <Shield className="h-6 w-6" />
                                </div>
                                {!role.isSystem && (
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => navigate(`/roles/edit/${role.id}`)}
                                            className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-full transition-colors">
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button onClick={() => handleDelete(role.id)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors">
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{role.name}</h3>
                                    {role.category && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                                            <Building2 className="h-3 w-3" /> {role.category}
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                    {role.description || 'No description provided'}
                                </p>
                            </div>
                            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4 mt-auto">
                                <span>{role.permissions?.length || 0} Permissions</span>
                                <span className={clsx("px-2.5 py-1 rounded-full font-medium",
                                    role.isSystem ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400")}>
                                    {role.isSystem ? 'System Template' : 'Property Role'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
