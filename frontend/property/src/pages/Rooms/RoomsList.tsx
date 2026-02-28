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
    Trash2,
    Calendar,
    X,
    // History
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function RoomsList() {
    const { selectedProperty } = useProperty();
    const propertyId = selectedProperty?.id;

    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [blockingRoom, setBlockingRoom] = useState<Room | null>(null);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    // const [viewingBlocksRoom, setViewingBlocksRoom] = useState<Room | null>(null);

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

    const unblockMutation = useMutation({
        mutationFn: roomsService.unblock,
        onSuccess: () => {
            toast.success('Room unblocked successfully');
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to unblock room');
        },
    });

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
                                {room.blocks && room.blocks.length > 0 && (
                                    <div className="mt-2 text-xs bg-amber-500/10 text-amber-600 p-2 rounded border border-amber-500/20">
                                        <div className="flex items-center gap-1 font-bold mb-1">
                                            <Lock className="h-3 w-3" /> Active Block
                                        </div>
                                        <p>{format(new Date(room.blocks[0].startDate), 'MMM d')} - {format(new Date(room.blocks[0].endDate), 'MMM d')}</p>
                                        <p className="truncate italic">"{room.blocks[0].reason}"</p>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                unblockMutation.mutate(room.blocks![0].id);
                                            }}
                                            className="mt-1 text-primary hover:underline font-bold"
                                        >
                                            Unblock Now
                                        </button>
                                    </div>
                                )}
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
                                                onClick={() => {
                                                    setBlockingRoom(room);
                                                    setIsBlockModalOpen(true);
                                                    setActiveMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-foreground hover:bg-muted flex items-center gap-2 font-medium transition-colors"
                                            >
                                                <Lock className="h-3 w-3 text-amber-500" /> Block Room
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

                {/* Block Room Modal */}
                {isBlockModalOpen && blockingRoom && (
                    <BlockRoomModal
                        room={blockingRoom}
                        onClose={() => {
                            setIsBlockModalOpen(false);
                            setBlockingRoom(null);
                        }}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['rooms'] });
                            setIsBlockModalOpen(false);
                            setBlockingRoom(null);
                        }}
                    />
                )}

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

interface BlockRoomModalProps {
    room: Room;
    onClose: () => void;
    onSuccess: () => void;
}

function BlockRoomModal({ room, onClose, onSuccess }: BlockRoomModalProps) {
    const [formData, setFormData] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // Tomorrow
        reason: 'Maintenance',
        notes: ''
    });

    const mutation = useMutation({
        mutationFn: (data: any) => roomsService.block(room.id, data),
        onSuccess: () => {
            toast.success(`Room ${room.roomNumber} blocked successfully`);
            onSuccess();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to block room');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-card w-full max-w-md rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Block Room {room.roomNumber}</h2>
                        <p className="text-sm text-muted-foreground">Set unavailability dates</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" /> Start Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-foreground flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" /> End Date
                            </label>
                            <input
                                type="date"
                                required
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Reason</label>
                        <select
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                        >
                            <option value="Maintenance">Maintenance</option>
                            <option value="Housekeeping">Housekeeping</option>
                            <option value="Owner Use">Owner Use</option>
                            <option value="Offline Booking">Offline Booking</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Internal Notes (Optional)</label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            placeholder="Add more details about the block..."
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all h-24 resize-none"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={mutation.isPending}
                            className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {mutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Lock className="h-4 w-4" />
                            )}
                            Block Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
