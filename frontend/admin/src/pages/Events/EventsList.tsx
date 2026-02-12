import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
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
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: events, isLoading, error } = useQuery<Event[]>({
        queryKey: ['events-admin', statusFilter, selectedProperty?.id],
        queryFn: () => eventsService.getAllAdmin({
            propertyId: selectedProperty?.id
        }),
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
                return 'bg-green-100 text-green-800 border-green-200';
            case 'PENDING':
                return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'REJECTED':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
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
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
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
                    <h1 className="text-2xl font-bold text-gray-900">Event Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage resort and community events</p>
                </div>
                <Link
                    to="/events/create"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Create Event
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4 bg-gray-50/50">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-gray-400" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
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
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event Info</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organizer</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Location</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredEvents?.map((event) => (
                                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-10 w-10 flex-shrink-0 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border border-gray-200">
                                                {event.images?.[0] ? (
                                                    <img src={event.images[0]} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <Calendar className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-medium text-gray-900">{event.title}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]">{event.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">
                                            {event.organizerType === 'PROPERTY' ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                                                    Property: {event.property?.name || 'Assigned'}
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                                    External Organizer
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            By: {event.createdBy?.firstName} {event.createdBy?.lastName}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center text-sm text-gray-900 gap-1.5">
                                            <Calendar className="h-4 w-4 text-gray-400" />
                                            {new Date(event.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-500 mt-1 gap-1.5 pl-0.5">
                                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
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
                                                    className="p-1 px-2 text-primary-600 hover:bg-primary-50 rounded border border-primary-200 flex items-center gap-1 text-xs"
                                                >
                                                    <Check className="h-3.5 w-3.5" /> Approve
                                                </button>
                                            )}
                                            <div className="relative">
                                                <button
                                                    onClick={() => setActiveMenuId(activeMenuId === event.id ? null : event.id)}
                                                    className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>

                                                {activeMenuId === event.id && (
                                                    <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20 overflow-hidden">
                                                        <button
                                                            onClick={() => navigate(`/events/edit/${event.id}`)}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                                        >
                                                            <Edit2 className="h-3.5 w-3.5" /> Edit
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(event.id, event.title)}
                                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-gray-100"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> Delete
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
                    <div className="p-12 text-center text-gray-500">
                        <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium text-gray-400">No events found.</p>
                        <p className="text-sm">Try adjusting your filters or create a new event.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
