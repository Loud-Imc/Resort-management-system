import { useState, useEffect } from 'react';
import { format, isAfter } from 'date-fns';
import {
    X,
    Calendar,
    Lock,
    User,
    ArrowRight,
    Loader2,
    Trash2
} from 'lucide-react';
import { roomsService } from '../../services/rooms';
import type { Room } from '../../types/room';
import toast from 'react-hot-toast';

interface RoomScheduleModalProps {
    roomId: string;
    selectedDate: Date;
    isOpen: boolean;
    onClose: () => void;
    onUnblockSuccess?: () => void;
}

export default function RoomScheduleModal({ roomId, selectedDate, isOpen, onClose, onUnblockSuccess }: RoomScheduleModalProps) {
    const [room, setRoom] = useState<Room | null>(null);
    const [loading, setLoading] = useState(false);
    const [unblockingId, setUnblockingId] = useState<string | null>(null);

    const loadRoom = async () => {
        if (!roomId) return;
        setLoading(true);
        try {
            const data = await roomsService.getById(roomId);
            setRoom(data);
        } catch (err: any) {
            console.error('Failed to load room schedule:', err);
            toast.error(err.response?.data?.message || 'Failed to load room details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && roomId) {
            loadRoom();
        }
    }, [isOpen, roomId]);

    const handleUnblock = async (blockId: string) => {
        setUnblockingId(blockId);
        try {
            await roomsService.unblock(blockId);
            toast.success('Room unblocked successfully');
            await loadRoom();
            onUnblockSuccess?.();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to unblock room');
        } finally {
            setUnblockingId(null);
        }
    };

    if (!isOpen) return null;

    const dateToCompare = new Date(selectedDate);
    dateToCompare.setHours(0, 0, 0, 0);

    const upcomingBookings = room?.bookingRooms?.filter((br: any) => {
        const checkOut = new Date(br.booking.checkOutDate);
        return isAfter(checkOut, dateToCompare) || checkOut.getTime() === dateToCompare.getTime();
    }) || [];

    const upcomingBlocks = room?.blocks?.filter((b: any) => {
        if (b.bookingId) return false;
        if (b.reason?.startsWith('Group Booking') || b.reason?.startsWith('Multi-Room Booking')) return false;
        const endDate = new Date(b.endDate);
        return isAfter(endDate, dateToCompare) || endDate.getTime() === dateToCompare.getTime();
    }) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-border flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <span>Room {room?.roomNumber || '...'}</span>
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-primary/10 text-primary">
                                {room?.roomType?.name || 'Loading'}
                            </span>
                        </h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Upcoming bookings & blocked dates starting from {format(selectedDate, 'MMM d, yyyy')}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors cursor-pointer">
                        <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground mt-2">Loading schedule...</p>
                        </div>
                    ) : (
                        <>
                            {/* Upcoming Bookings Section */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-blue-500" />
                                    Upcoming Bookings ({upcomingBookings.length})
                                </h3>

                                {upcomingBookings.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-foreground font-medium">
                                        No upcoming bookings scheduled for this room.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingBookings.map((br: any) => {
                                            const booking = br.booking;
                                            const checkIn = new Date(booking.checkInDate);
                                            const checkOut = new Date(booking.checkOutDate);
                                            return (
                                                <div
                                                    key={br.id || booking.id}
                                                    className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between text-xs font-bold mb-2">
                                                        <span className="flex items-center gap-1.5 text-foreground">
                                                            <User className="h-3.5 w-3.5 text-blue-500" />
                                                            {booking.guestName || booking.guest?.name || 'Guest'}
                                                        </span>
                                                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold">
                                                            {booking.bookingNumber || booking.id?.slice(0, 8)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                        <span>{format(checkIn, 'MMM d, yyyy')}</span>
                                                        <ArrowRight className="h-3 w-3 text-blue-400" />
                                                        <span>{format(checkOut, 'MMM d, yyyy')}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Upcoming Blocks Section */}
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-amber-500" />
                                    Active / Upcoming Blocks ({upcomingBlocks.length})
                                </h3>

                                {upcomingBlocks.length === 0 ? (
                                    <div className="text-center py-6 border border-dashed border-border rounded-xl text-xs text-muted-foreground font-medium">
                                        No active or upcoming blocks for this room.
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingBlocks.map((b: any) => {
                                            const start = new Date(b.startDate);
                                            const end = new Date(b.endDate);
                                            return (
                                                <div
                                                    key={b.id}
                                                    className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between gap-3"
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-black text-amber-600 dark:text-amber-400 uppercase">
                                                                {b.reason || 'Blocked'}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                                            <span>{format(start, 'MMM d, yyyy')}</span>
                                                            <ArrowRight className="h-3 w-3 text-amber-400" />
                                                            <span>{format(end, 'MMM d, yyyy')}</span>
                                                        </div>
                                                        {b.notes && (
                                                            <p className="text-[11px] text-muted-foreground mt-1 italic">
                                                                "{b.notes}"
                                                            </p>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleUnblock(b.id)}
                                                        disabled={unblockingId === b.id}
                                                        className="px-3 py-1.5 text-xs font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                                                    >
                                                        {unblockingId === b.id ? (
                                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        )}
                                                        Unblock
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <div className="p-4 border-t border-border flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg text-sm font-bold transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
