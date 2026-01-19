import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesService } from '../../services/roles';
import { Plus, Edit2, Trash2, Shield, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Role } from '../../types/user';

export default function RolesList() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

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
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage system access and user roles</p>
                </div>
                <button
                    onClick={() => navigate('/roles/create')}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
                >
                    <Plus className="h-5 w-5" />
                    Create Role
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roles?.map((role) => (
                    <div key={role.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-3 bg-primary-50 rounded-lg text-primary-600">
                                <Shield className="h-6 w-6" />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => navigate(`/roles/edit/${role.id}`)}
                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => handleDelete(role.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{role.name}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                            {role.description || 'No description provided'}
                        </p>
                        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-50 pt-4">
                            <span>{role.permissions?.length || 0} Permissions</span>
                            <span className={clsx(
                                "px-2 py-1 rounded-full bg-gray-100",
                                role.isSystem ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                            )}>
                                {role.isSystem ? 'System Role' : 'Custom Role'}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
