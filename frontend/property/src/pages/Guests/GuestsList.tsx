import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usersService } from '../../services/users';
import { useProperty } from '../../context/PropertyContext';
import type { User } from '../../types/user';
import {
    Loader2,
    Search,
    User as UserIcon,
    Calendar,
    Mail,
    Phone,
    ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GuestsList() {
    const [search, setSearch] = useState('');
    const { selectedProperty } = useProperty();

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['users', selectedProperty?.id],
        queryFn: () => usersService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    // Filter for users with 'Customer' role
    const filteredUsers = (users as User[] | undefined)?.filter(user => {
        const isCustomer = user.roles.some((r: any) => r.role.name === 'Customer');
        const matchesSearch =
            user.firstName.toLowerCase().includes(search.toLowerCase()) ||
            user.lastName.toLowerCase().includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());

        return isCustomer && matchesSearch;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">Guest Management</h1>
                <p className="text-sm text-muted-foreground mt-1">View guest profiles and booking history</p>
            </div>

            <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                    <input
                        type="text"
                        placeholder="Search guests by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers?.map((guest) => (
                    <Link
                        key={guest.id}
                        to={`/guests/${guest.id}`}
                        className="bg-card rounded-xl shadow-sm border border-border p-6 hover:shadow-md transition-all group block"
                    >
                        <div className="flex items-center gap-4 mb-4">
                            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                                {guest.firstName ? guest.firstName.charAt(0) : <UserIcon className="h-6 w-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">{guest.firstName} {guest.lastName}</h3>
                                <div className="flex items-center gap-1 text-xs">
                                    <span className={guest.isActive ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                                        {guest.isActive ? "Active Account" : "Inactive"}
                                    </span>
                                    {guest.idType && guest.idNumber && (
                                        <>
                                            <span className="text-muted-foreground">•</span>
                                            <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                            <span className="text-emerald-500 font-bold uppercase tracking-tighter text-[9px]">Verified</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 text-sm text-muted-foreground font-medium">
                            <div className="flex items-center gap-3">
                                <Mail className="h-4 w-4 text-muted-foreground opacity-70" />
                                <span className="truncate">{guest.email}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <Phone className="h-4 w-4 text-muted-foreground opacity-70" />
                                <span>{guest.phone || 'No phone provided'}</span>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-border flex justify-between items-center text-sm">
                            <span className="text-muted-foreground opacity-70">View History</span>
                            <div className="bg-muted p-2 rounded-full group-hover:bg-primary/10 transition-colors">
                                <Calendar className="h-4 w-4 text-foreground group-hover:text-primary transition-colors" />
                            </div>
                        </div>
                    </Link>
                ))}

                {filteredUsers?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl font-medium">
                        No guests found matching your search.
                    </div>
                )}
            </div>
        </div>
    );
}
