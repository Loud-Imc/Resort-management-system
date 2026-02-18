import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { useAuth } from '../../context/AuthContext';
import { eventsService } from '../../services/events';
import { Event } from '../../types/event';
import {
    Loader2,
    Search,
    Filter,
    Plus,
    MoreVertical,
    Calendar,
    MapPin,
    CheckCircle,
    XCircle,
    Clock,
    Edit2,
    Trash2,
    Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';

export default function EventsList() {
    const { selectedProperty } = useProperty();
    const { user } = useAuth();
    const isAdmin = user?.roles?.some(r => r === 'SuperAdmin' || r === 'Admin');

    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: events, isLoading, error } = useQuery<Event[]>({
        queryKey: ['events-admin', statusFilter, selectedProperty?.id, isAdmin],
        queryFn: () => eventsService.getAllAdmin({
            propertyId: isAdmin ? undefined : selectedProperty?.id
        }),
        enabled: Boolean(selectedProperty?.id || isAdmin),
    });

    const deleteMutation = useMutation({
        mutationFn: eventsService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events-admin'] });
            setActiveMenuId(null);
        },
    });

    const approveMutation = useMutation({
        mutationFn: eventsService.approve,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events-admin'] });
            setActiveMenuId(null);
        },
    });

    const handleDelete = (id: string, title: string) => {
        if (confirm(`Are you sure you want to delete event "${title}"?`)) {
            deleteMutation.mutate(id);
        }
    };

    const handleApprove = (id: string) => {
        if (confirm('Are you sure you want to approve this event?')) {
            approveMutation.mutate(id);
        }
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'PENDING':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            case 'REJECTED':
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
            case 'CANCELLED':
                return 'bg-muted text-muted-foreground border-border';
            default:
                return 'bg-muted text-muted-foreground border-border';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'APPROVED':
                return <CheckCircle className="h-3 w-3" />;
            case 'PENDING':
                return <Clock className="h-3 w-3" />;
            case 'REJECTED':
                return <XCircle className="h-3 w-3" />;
            default:
                return null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 font-bold">
                Error loading events. Please try again.
            </div>
        );
    }

    const filteredEvents = events?.filter(event =>
        !statusFilter || event.status === statusFilter
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Event Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage resort and community events</p>
                </div>
                <Link
                    to="/events/create"
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-xs"
                >
                    <Plus className="h-4 w-4" />
                    Create Event
                </Link>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 bg-muted/30">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            className="w-full pl-10 pr-4 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium placeholder:text-muted-foreground/30"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background text-foreground border border-border rounded-xl px-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold text-sm"
                        >
                            <option value="">All Statuses</option>
                            <option value="PENDING">Pending Approval</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="CANCELLED">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* List View */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Event Info</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Organizer</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Date & Location</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-right text-[10px] font-black text-muted-foreground uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-card divide-y divide-border">
                            {filteredEvents?.map((event) => (
                                <tr key={event.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-12 w-12 flex-shrink-0 bg-muted rounded-xl flex items-center justify-center overflow-hidden border border-border group-hover:border-primary/50 transition-all">
                                                {event.images?.[0] ? (
                                                    <img src={event.images[0]} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-foreground">{event.title}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px] font-medium">{event.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm">
                                            {event.organizerType === 'PROPERTY' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                                                    Property: {event.property?.name || 'Assigned'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest bg-purple-500/10 text-purple-500 border border-purple-500/20">
                                                    External Organizer
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">
                                            By: {event.createdBy?.firstName} {event.createdBy?.lastName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-foreground font-bold gap-1.5">
                                            <Calendar className="h-4 w-4 text-primary" />
                                            {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </div>
                                        <div className="flex items-center text-xs text-muted-foreground mt-1 gap-1.5 font-medium">
                                            <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                            {event.location}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={clsx(
                                            "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit border",
                                            getStatusStyles(event.status)
                                        )}>
                                            {getStatusIcon(event.status)}
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2">
                                            {event.status === 'PENDING' && (
                                                <button
                                                    onClick={() => handleApprove(event.id)}
                                                    className="p-1.5 px-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <Check className="h-3.5 w-3.5" /> Approve
                                                </button>
                                            )}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveMenuId(activeMenuId === event.id ? null : event.id)}
                                                    className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-all"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>

                                                {activeMenuId === event.id && (
                                                    <div className="absolute right-0 mt-2 w-40 bg-card rounded-xl shadow-xl border border-border z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                        <button
                                                            onClick={() => navigate(`/events/edit/${event.id}`)}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center gap-2 font-bold transition-all"
                                                        >
                                                            <Edit2 className="h-4 w-4 text-primary" /> Edit Event
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(event.id, event.title)}
                                                            className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-500/10 flex items-center gap-2 border-t border-border font-bold transition-all"
                                                        >
                                                            <Trash2 className="h-4 w-4" /> Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Click outside to close menu */}
                {activeMenuId && (
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setActiveMenuId(null)}
                    />
                )}

                {filteredEvents?.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground bg-muted/20 border-t border-border">
                        <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                        <p className="text-xl font-black text-foreground uppercase tracking-tight">No Events Found</p>
                        <p className="text-sm mt-1 font-medium">Try adjusting your filters or create a new event to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
