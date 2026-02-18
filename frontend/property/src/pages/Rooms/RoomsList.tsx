import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { roomsService } from '../../services/rooms';
import type { Room } from '../../types/room';
import { RoomStatus } from '../../types/room';
import {
    Loader2,
    Search,
    Filter,
    Plus,
    MoreVertical,
    BedDouble,
    Lock,
    CheckCircle,
    AlertTriangle,
    Edit2,
    Trash2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

export default function RoomsList() {
    const { selectedProperty } = useProperty();
    const propertyId = selectedProperty?.id;

    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: rooms, isLoading, error } = useQuery<Room[]>({
        queryKey: ['rooms', statusFilter, propertyId],
        queryFn: () => roomsService.getAll({
            status: statusFilter || undefined,
            propertyId: propertyId || undefined
        }),
        enabled: !!propertyId,
    });

    const deleteMutation = useMutation({
        mutationFn: roomsService.delete,
        onSuccess: () => {
            toast.success('Room deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setActiveMenuId(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete room');
        },
    });

    const handleDelete = (id: string, roomNumber: string) => {
        if (confirm(`Are you sure you want to delete room ${roomNumber}? This action cannot be undone.`)) {
            deleteMutation.mutate(id);
        }
    };

    const getStatusColor = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE:
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
            case RoomStatus.OCCUPIED:
                return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
            case RoomStatus.MAINTENANCE:
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
            case RoomStatus.BLOCKED:
                return 'bg-destructive/10 text-destructive';
            default:
                return 'bg-muted text-muted-foreground';
        }
    };

    const getStatusIcon = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE:
                return <CheckCircle className="h-4 w-4" />;
            case RoomStatus.OCCUPIED:
                return <BedDouble className="h-4 w-4" />;
            case RoomStatus.MAINTENANCE:
                return <AlertTriangle className="h-4 w-4" />;
            case RoomStatus.BLOCKED:
                return <Lock className="h-4 w-4" />;
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
            <div className="bg-destructive/10 text-destructive p-4 rounded-lg border border-destructive/20">
                Error loading rooms. Please try again.
            </div>
        );
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage rooms for your property</p>
                </div>
                <Link
                    to="/rooms/create"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-all shadow-sm flex items-center gap-2 font-bold"
                >
                    <Plus className="h-4 w-4" />
                    Add Room
                </Link>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                {/* Filters */}
                <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <input
                            type="text"
                            placeholder="Search by room number..."
                            className="w-full pl-10 pr-4 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background text-foreground border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        >
                            <option value="">All Statuses</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="OCCUPIED">Occupied</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="BLOCKED">Blocked</option>
                        </select>
                    </div>
                </div>

                {/* Grid View for Rooms */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {rooms?.map((room) => (
                        <div
                            key={room.id}
                            className={clsx(
                                "border rounded-xl p-4 transition-all hover:shadow-md group",
                                room.status === RoomStatus.AVAILABLE ? "border-border bg-card" :
                                    room.status === RoomStatus.OCCUPIED ? "border-blue-500/20 bg-blue-500/5" :
                                        room.status === RoomStatus.MAINTENANCE ? "border-amber-500/20 bg-amber-500/5" :
                                            "border-destructive/20 bg-destructive/5"
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xl font-bold text-card-foreground">
                                    {room.roomNumber}
                                </span>
                                <span className={clsx(
                                    "px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1",
                                    getStatusColor(room.status)
                                )}>
                                    {getStatusIcon(room.status)}
                                    {room.status}
                                </span>
                            </div>

                            <div className="text-sm text-muted-foreground mb-4">
                                <p className="font-bold text-card-foreground">{room.roomType.name}</p>
                                <p>Floor: {room.floor ?? '-'}</p>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                                <span className="text-xs text-muted-foreground font-medium">
                                    {room.isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <div className="relative">
                                    <button
                                        onClick={() => setActiveMenuId(activeMenuId === room.id ? null : room.id)}
                                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </button>

                                    {activeMenuId === room.id && (
                                        <div className="absolute right-0 bottom-full mb-2 w-32 bg-card rounded-xl shadow-xl border border-border z-10 m-1 overflow-hidden">
                                            <button
                                                onClick={() => navigate(`/rooms/edit/${room.id}`)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center gap-2 font-medium transition-colors"
                                            >
                                                <Edit2 className="h-3 w-3 text-blue-500" /> Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(room.id, room.roomNumber)}
                                                className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 font-medium transition-colors"
                                            >
                                                <Trash2 className="h-3 w-3" /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Click outside to close menu */}
                {activeMenuId && (
                    <div
                        className="fixed inset-0 z-0"
                        onClick={() => setActiveMenuId(null)}
                        style={{ background: 'transparent' }}
                    />
                )}

                {rooms?.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground font-medium opacity-50">
                        No rooms found.
                    </div>
                )}
            </div>
        </div>
    );
}
