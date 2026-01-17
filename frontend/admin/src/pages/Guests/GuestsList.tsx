import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '../../services/users';
import {
    Loader2,
    Search,
    User,
    Calendar,
    Mail,
    Phone
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GuestsList() {
    const [search, setSearch] = useState('');

    const { data: users, isLoading } = useQuery({
        queryKey: ['users'],
        queryFn: usersService.getAll,
    });

    // Filter mainly for users who might be guests. 
    // In a real app, we'd filter by role 'Customer' or check if they have bookings.
    // For now, listing all users but focusing on contact info.
    // Filter for users with 'Customer' role
    const filteredUsers = users?.filter(user => {
        const isCustomer = user.roles.some((r: any) => r.role.name === 'Customer');
        const matchesSearch =
            user.firstName.toLowerCase().includes(search.toLowerCase()) ||
            user.lastName.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());

        return isCustomer && matchesSearch;
    });

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Guest Management</h1>
                <p className="text-sm text-gray-500 mt-1">View guest profiles and booking history</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search guests by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers?.map((guest) => (
                    <Link
                        key={guest.id}
                        to={`/guests/${guest.id}`}
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow block"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold text-lg">
                                {guest.firstName.charAt(0)}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{guest.firstName} {guest.lastName}</h3>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <span className={guest.isActive ? "text-green-600" : "text-gray-400"}>
                                        {guest.isActive ? "Active Account" : "Inactive"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-gray-400" />
                                <span className="truncate">{guest.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <span>{guest.phone || 'No phone provided'}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                            <span className="text-gray-500">View History</span>
                            <div className="bg-gray-50 p-2 rounded-full">
                                <Calendar className="h-4 w-4 text-gray-600" />
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredUsers?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                        No guests found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}
