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
    CalendarDays,
    Archive
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { format, isAfter } from 'date-fns';
import GuestDetailsModal from '../../components/Rooms/GuestDetailsModal';
import RoomScheduleModal from '../../components/Rooms/RoomScheduleModal';
import BlockRoomModal from '../../components/Rooms/BlockRoomModal';
import ConfirmModal from '../../components/ConfirmModal';

export default function RoomsList() {
    const { selectedProperty } = useProperty();
    const propertyId = selectedProperty?.id;

    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
    const [blockingRoom, setBlockingRoom] = useState<Room | null>(null);
    const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
    const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
    const [isGuestModalOpen, setIsGuestModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [showDisabled, setShowDisabled] = useState<boolean>(false);
    const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);

    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const { data: rooms, isLoading, error } = useQuery<Room[]>({
        queryKey: ['rooms', statusFilter, propertyId, format(selectedDate, 'yyyy-MM-dd'), showDisabled],
        queryFn: () => roomsService.getAll({
            status: statusFilter || undefined,
            propertyId: propertyId || undefined,
            date: format(selectedDate, 'yyyy-MM-dd'),
            isEnabled: showDisabled ? undefined : true,
        }),
        enabled: !!propertyId,
    });

    const deleteMutation = useMutation({
        mutationFn: roomsService.delete,
        onSuccess: (data: any) => {
            toast.success(data?.message || 'Room deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setActiveMenuId(null);
            setDeletingRoom(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete room');
        },
    });

    const restoreMutation = useMutation({
        mutationFn: (id: string) => roomsService.update(id, { isEnabled: true, status: 'AVAILABLE', propertyId }),
        onSuccess: () => {
            toast.success('Room restored and re-enabled successfully!');
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            setActiveMenuId(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to restore room');
        },
    });

    const handleDelete = (room: Room) => {
        setDeletingRoom(room);
        setActiveMenuId(null);
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
            case RoomStatus.RESERVED:
                return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400';
            case RoomStatus.OUT_TODAY:
                return 'bg-orange-500/10 text-orange-600 dark:text-orange-400';
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
            case RoomStatus.RESERVED:
                return <Calendar className="h-4 w-4" />;
            case RoomStatus.OUT_TODAY:
                return <AlertTriangle className="h-4 w-4" />;
            default:
                return null;
        }
    };

    const getCardStyle = (status: RoomStatus) => {
        switch (status) {
            case RoomStatus.AVAILABLE: return "border-border bg-card";
            case RoomStatus.OCCUPIED: return "border-blue-500/20 bg-blue-500/5";
            case RoomStatus.MAINTENANCE: return "border-amber-500/20 bg-amber-500/5";
            case RoomStatus.BLOCKED: return "border-destructive/20 bg-destructive/5";
            case RoomStatus.RESERVED: return "border-indigo-500/20 bg-indigo-500/5";
            case RoomStatus.OUT_TODAY: return "border-orange-500/20 bg-orange-500/5";
            default: return "border-border bg-card";
        }
    };



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
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-foreground">Rooms</h1>
                        {isLoading && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                    </div>
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
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground opacity-50" />
                        <input
                            type="text"
                            placeholder="Search by room number..."
                            className="w-full pl-10 pr-4 py-2 bg-background text-foreground border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        />
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2">
                            <CalendarDays className="h-4 w-4 text-muted-foreground" />
                            <input
                                type="date"
                                value={format(selectedDate, 'yyyy-MM-dd')}
                                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                className="bg-transparent text-sm text-foreground focus:outline-none focus:ring-0 border-none p-0 cursor-pointer"
                            />
                        </div>
                        <Filter className="h-4 w-4 text-muted-foreground ml-2" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="bg-background text-foreground border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                        >
                            <option value="">All Statuses</option>
                            <option value="AVAILABLE">Available</option>
                            <option value="OCCUPIED">Occupied</option>
                            <option value="RESERVED">Reserved</option>
                            <option value="OUT_TODAY">Out Today</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="BLOCKED">Blocked</option>
                        </select>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold cursor-pointer ml-2">
                            <input
                                type="checkbox"
                                checked={showDisabled}
                                onChange={(e) => setShowDisabled(e.target.checked)}
                                className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5"
                            />
                            Show Disabled Rooms
                        </label>
                    </div>
                </div>

                {/* Grid View for Rooms */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {isLoading ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm font-semibold text-muted-foreground">Loading rooms...</p>
                        </div>
                    ) : rooms?.length === 0 ? (
                        <div className="col-span-full text-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl font-medium">
                            No rooms found.
                        </div>
                    ) : (
                        rooms?.map((room) => {
                        const dateToCompare = new Date(selectedDate);
                        dateToCompare.setHours(0, 0, 0, 0);

                        // Calculate upcoming counts (after selected date)
                        const upcomingBookings = room.bookingRooms?.filter((br: any) => {
                            const checkIn = new Date(br.booking.checkInDate);
                            return isAfter(checkIn, dateToCompare);
                        }) || [];

                        const upcomingBlocks = room.blocks?.filter((b: any) => {
                            if (b.bookingId) return false;
                            if (b.reason?.startsWith('Group Booking') || b.reason?.startsWith('Multi-Room Booking')) return false;
                            const startDate = new Date(b.startDate);
                            return isAfter(startDate, dateToCompare);
                        }) || [];

                        return (
                        <div
                            key={room.id}
                            onClick={() => {
                                setSelectedRoomId(room.id);
                                setIsScheduleModalOpen(true);
                            }}
                            className={clsx(
                                "border rounded-xl p-4 transition-all hover:shadow-md group cursor-pointer hover:border-primary/30",
                                getCardStyle(room.status)
                            )}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xl font-bold text-card-foreground group-hover:text-primary transition-colors">
                                    {room.roomNumber}
                                </span>
                                <span className={clsx(
                                    "px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1",
                                    !room.isEnabled ? "bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20" : getStatusColor(room.status)
                                )}>
                                    {!room.isEnabled ? <Archive className="h-3.5 w-3.5 text-slate-500" /> : getStatusIcon(room.status)}
                                    {!room.isEnabled ? 'DEACTIVATED' : room.status}
                                </span>
                            </div>

                            <div className="text-sm text-muted-foreground mb-4">
                                <p className="font-bold text-card-foreground mb-3">{room.roomType.name}</p>
                                <p className="mb-2">Floor: {room.floor ?? '-'}</p>
                                
                                <div className="flex gap-2 mt-3">
                                    {upcomingBookings.length > 0 && (
                                        <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            {upcomingBookings.length} Upcoming {upcomingBookings.length === 1 ? 'Booking' : 'Bookings'}
                                        </div>
                                    )}
                                    {upcomingBlocks.length > 0 && (
                                        <div className="text-[10px] font-bold px-2 py-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                                            <Lock className="h-3 w-3" />
                                            {upcomingBlocks.length} Upcoming {upcomingBlocks.length === 1 ? 'Block' : 'Blocks'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                                <span className="text-xs text-muted-foreground font-medium">
                                    {room.isEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveMenuId(activeMenuId === room.id ? null : room.id);
                                        }}
                                        className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors opacity-70 group-hover:opacity-100"
                                    >
                                        <MoreVertical className="h-5 w-5" />
                                    </button>

                                    {activeMenuId === room.id && (
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 bottom-full mb-2 w-32 bg-card rounded-xl shadow-xl border border-border z-10 m-1 overflow-hidden"
                                        >
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
                                            {!room.isEnabled ? (
                                                <button
                                                    onClick={() => restoreMutation.mutate(room.id)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-2 font-bold transition-colors"
                                                >
                                                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> Restore Room
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleDelete(room)}
                                                    className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 font-medium transition-colors"
                                                >
                                                    <Trash2 className="h-3 w-3" /> Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})
                    )}
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

            {/* Schedule Modal */}
            <RoomScheduleModal
                roomId={selectedRoomId || ''}
                selectedDate={selectedDate}
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
            />

            {/* Guest Details Modal */}
            <GuestDetailsModal
                roomId={selectedRoomId || ''}
                isOpen={isGuestModalOpen}
                onClose={() => setIsGuestModalOpen(false)}
            />

            {/* Custom Confirm Modal for Room Deletion */}
            {(() => {
                const hasHistory = !!deletingRoom?.hasHistory || ((deletingRoom?._count?.bookingRooms || 0) + (deletingRoom?._count?.bookings || 0) + (deletingRoom?._count?.blocks || 0)) > 0;
                return (
                    <ConfirmModal
                        isOpen={!!deletingRoom}
                        onClose={() => setDeletingRoom(null)}
                        onConfirm={() => deletingRoom && deleteMutation.mutate(deletingRoom.id)}
                        isLoading={deleteMutation.isPending}
                        variant={hasHistory ? 'warning' : 'danger'}
                        title={hasHistory ? `Deactivate Room ${deletingRoom?.roomNumber || ''}?` : `Permanently Delete Room ${deletingRoom?.roomNumber || ''}?`}
                        description={
                            hasHistory ? (
                                <span>
                                    Room <strong className="text-foreground font-bold">{deletingRoom?.roomNumber}</strong> has historical booking or block records.
                                    <br /><br />
                                    To protect past financial reports and audit logs, this room will be <strong className="text-amber-500 font-bold uppercase">DEACTIVATED</strong>. It will no longer receive new bookings, but can be restored anytime by toggling <em>"Show Disabled Rooms"</em>.
                                </span>
                            ) : (
                                <span>
                                    Room <strong className="text-foreground font-bold">{deletingRoom?.roomNumber}</strong> has zero historical bookings or blocks.
                                    <br /><br />
                                    This room will be <strong className="text-rose-500 font-bold uppercase">PERMANENTLY DELETED</strong> from the system database. This action cannot be undone.
                                </span>
                            )
                        }
                        confirmText={hasHistory ? "Deactivate Room" : "Permanently Delete"}
                    />
                );
            })()}
        </div>
    );
}


