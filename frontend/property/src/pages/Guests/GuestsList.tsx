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
    ShieldCheck,
    Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GuestsList() {
    const [search, setSearch] = useState('');
    const [idType, setIdType] = useState('all');
    const [status, setStatus] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    
    const { selectedProperty } = useProperty();

    const { data: users, isLoading } = useQuery<User[]>({
        queryKey: ['users', selectedProperty?.id],
        queryFn: () => usersService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    // Filter for users with 'Customer' role
    const filteredUsers = (users as User[] | undefined)?.filter(user => {
        const isCustomer = user.roles?.some((r: any) => r.role.name === 'Customer');
        const q = search.toLowerCase();
        const matchesSearch =
            (user.firstName || '').toLowerCase().includes(q) ||
            (user.lastName || '').toLowerCase().includes(q) ||
            (user.email || '').toLowerCase().includes(q) ||
            (user.phone || '').toLowerCase().includes(q);

        const matchesIdType = idType === 'all' || 
            (idType === 'none' ? !user.idType : user.idType === idType);
            
        const matchesStatus = status === 'all' || 
            (status === 'active' ? user.isActive : !user.isActive);

        let matchesDate = true;
        if (user.createdAt) {
            const userDate = new Date(user.createdAt);
            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (userDate < start) matchesDate = false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (userDate > end) matchesDate = false;
            }
        }

        return isCustomer && matchesSearch && matchesIdType && matchesStatus && matchesDate;
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const handleDownloadReport = async () => {
        if (!filteredUsers || filteredUsers.length === 0) return;
        try {
            const blob = await usersService.downloadAllGuestsReport({
                userIds: filteredUsers.map(u => u.id)
            });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Guests_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to download report:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Guest Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">View guest profiles and booking history</p>
                </div>
                <button 
                    onClick={handleDownloadReport}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors shadow-sm"
                >
                    <Download className="h-4 w-4" /> Download Report
                </button>
            </div>

            <div className="bg-card p-4 rounded-xl shadow-sm border border-border">
                <div className="flex flex-col gap-4">
                    {/* Row 1: Search */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground opacity-50" />
                        <input
                            type="text"
                            placeholder="Search guests..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                    </div>
                    
                    {/* Row 2: ID Type & Status */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <select
                            value={idType}
                            onChange={(e) => setIdType(e.target.value)}
                            className="px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all flex-1"
                        >
                            <option value="all">All ID Types</option>
                            <option value="AADHAR">Aadhar Card</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="DRIVING_LICENSE">Driving License</option>
                            <option value="VOTER_ID">Voter ID</option>
                            <option value="PAN_CARD">PAN Card</option>
                            <option value="none">No ID Provided</option>
                        </select>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all flex-1"
                        >
                            <option value="all">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>

                    {/* Row 3: Date Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 w-full">
                        <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 focus-within:ring-2 focus-within:ring-primary transition-all">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">From:</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full py-2 bg-transparent text-foreground focus:outline-none text-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 flex-1 bg-background border border-border rounded-lg px-3 focus-within:ring-2 focus-within:ring-primary transition-all">
                            <span className="text-sm text-muted-foreground whitespace-nowrap">To:</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full py-2 bg-transparent text-foreground focus:outline-none text-sm"
                            />
                        </div>
                    </div>
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
                            <span className="text-muted-foreground opacity-70">
                                {guest._count?.bookings === 1 ? '1 Booking' : `${guest._count?.bookings || 0} Bookings`}
                            </span>
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
