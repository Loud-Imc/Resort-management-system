import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersService } from '../../services/users';
import {
    Loader2,
    Plus,
    Edit2,
    Trash2,
    User as UserIcon,
    Shield,
    Search
} from 'lucide-react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';

export default function UsersList() {
    const [search, setSearch] = useState('');
    const queryClient = useQueryClient();

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: usersService.getAll,
    });

    const deleteMutation = useMutation({
        mutationFn: usersService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to delete user');
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    const filteredUsers = users?.filter(user =>
        user.firstName.toLowerCase().includes(search.toLowerCase()) ||
        user.lastName.toLowerCase().includes(search.toLowerCase()) ||
        user.email.toLowerCase().includes(search.toLowerCase())
    );

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage staff access, roles, and permissions</p>
                </div>
                <Link
                    to="/users/create"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add New User
                </Link>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roles</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsers?.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0">
                                                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600">
                                                    <UserIcon className="h-5 w-5" />
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                                                <div className="text-sm text-gray-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-wrap gap-1">
                                            {user.roles.map((ur, idx) => (
                                                <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    <Shield className="h-3 w-3 mr-1" />
                                                    {ur.role.name}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                                            user.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                                        )}>
                                            {user.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex justify-end gap-2">
                                            <Link
                                                to={`/users/edit/${user.id}`}
                                                className="text-primary-600 hover:text-primary-900 bg-primary-50 p-2 rounded-full"
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-full"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}

                            {filteredUsers?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No users found matching your search.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
