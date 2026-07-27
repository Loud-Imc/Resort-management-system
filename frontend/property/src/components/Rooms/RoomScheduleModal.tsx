import { format, isAfter } from 'date-fns';
import {
    X,
    CalendarDays,
    Calendar,
    Lock,
    Globe,
    User,
    ArrowRight,
    Loader2
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '../../services/rooms';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import toast from 'react-hot-toast';

interface RoomScheduleModalProps {
    roomId: string;
    selectedDate: Date;
    isOpen: boolean;
    onClose: () => void;
}

export default function RoomScheduleModal({ roomId, selectedDate, isOpen, onClose }: RoomScheduleModalProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: room, isLoading, error } = useQuery({
        queryKey: ['room-details', roomId],
        queryFn: () => roomsService.getById(roomId),
        enabled: isOpen && !!roomId,
    });

    const unblockMutation = useMutation({
        mutationFn: roomsService.unblock,
        onSuccess: () => {
            toast.success('Room unblocked successfully');
            queryClient.invalidateQueries({ queryKey: ['room-details'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to unblock room');
        },
    });

    if (!isOpen) return null;

    // Filter to only show blocks and bookings that are active on or after selectedDate
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

    // Sort combined timeline by start date
    type TimelineItem = { type: 'BOOKING' | 'BLOCK'; data: any; startDate: Date };
    const timeline: TimelineItem[] = [
        ...upcomingBookings.map((br: any) => ({
            type: 'BOOKING' as const,
            data: br.booking,
            startDate: new Date(br.booking.checkInDate)
        })),
        ...upcomingBlocks.map((b: any) => ({
            type: 'BLOCK' as const,
            data: b,
            startDate: new Date(b.startDate)
        }))
    ].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-xl max-h-[85vh] flex flex-col rounded-3xl shadow-2xl border border-border overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-border flex justify-between items-center bg-muted/50 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" />
                            Room {room?.roomNumber || '...'} Schedule
                        </h2>
                        <p className="text-xs text-muted-foreground font-medium mt-1">
                            Activity from {format(selectedDate, 'MMM d, yyyy')} onwards
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-background rounded-full transition-colors text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-background">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground font-medium">Loading schedule...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12 text-destructive bg-destructive/10 rounded-2xl border border-destructive/20">
                            Failed to load schedule.
                        </div>
                    ) : timeline.length === 0 ? (
                        <div className="text-center py-12">
                            <CalendarDays className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                            <p className="text-muted-foreground font-medium">No upcoming bookings or blocks.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                            {timeline.map((item, index) => {
                                const isBooking = item.type === 'BOOKING';
                                
                                return (
                                    <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active py-2">
                                        {/* Timeline Dot */}
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 bg-muted shadow-sm z-10">
                                            {isBooking ? (
                                                <User className="h-4 w-4 text-primary" />
                                            ) : (
                                                <Lock className="h-4 w-4 text-amber-500" />
                                            )}
                                        </div>
                                        
                                        {/* Card Content */}
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow relative">
                                            {isBooking ? (
                                                <BookingCard 
                                                    booking={item.data} 
                                                    onClick={() => {
                                                        navigate(`/bookings/${item.data.id}`);
                                                        onClose();
                                                    }}
                                                />
                                            ) : (
                                                <BlockCard 
                                                    block={item.data} 
                                                    onUnblock={() => unblockMutation.mutate(item.data.id)}
                                                    isUnblocking={unblockMutation.isPending}
                                                />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function BookingCard({ booking, onClick }: { booking: any, onClick: () => void }) {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    
    let guestName = 'Guest';
    if (booking.user?.firstName || booking.user?.lastName) {
        guestName = `${booking.user.firstName || ''} ${booking.user.lastName || ''}`.trim();
    } else if (booking.guests?.[0]?.firstName || booking.guests?.[0]?.lastName) {
        guestName = `${booking.guests[0].firstName || ''} ${booking.guests[0].lastName || ''}`.trim();
    }

    return (
        <div className="flex flex-col h-full cursor-pointer group" onClick={onClick}>
            <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase tracking-wider">
                    Booking
                </span>
                <span className={clsx(
                    "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                    booking.status === 'CHECKED_IN' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                    booking.status === 'CONFIRMED' ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                    "bg-muted text-muted-foreground"
                )}>
                    {booking.status.replace('_', ' ')}
                </span>
            </div>
            
            <h4 className="text-sm font-bold text-foreground mb-1 truncate">
                {guestName}
            </h4>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>
                    {format(checkIn, 'MMM d')} — {format(checkOut, 'MMM d, yyyy')}
                </span>
            </div>
            
            <div className="mt-auto flex items-center text-xs font-bold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                View Details <ArrowRight className="h-3 w-3 ml-1 transition-transform group-hover:translate-x-1" />
            </div>
        </div>
    );
}

function BlockCard({ block, onUnblock, isUnblocking }: { block: any, onUnblock: () => void, isUnblocking: boolean }) {
    const isExternal = block.reason.startsWith('External Booking');
    
    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-start mb-2">
                <span className={clsx(
                    "text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1",
                    isExternal ? "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}>
                    {isExternal ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                    {isExternal ? 'Cloud Sync' : 'Manual Block'}
                </span>
            </div>
            
            <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">
                {block.reason}
            </p>
            
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <Calendar className="h-3 w-3 shrink-0" />
                <span>
                    {format(new Date(block.startDate), 'MMM d')} — {format(new Date(block.endDate), 'MMM d, yyyy')}
                </span>
            </div>
            
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    onUnblock();
                }}
                disabled={isUnblocking}
                className={clsx(
                    "mt-auto w-full py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1.5 disabled:opacity-50",
                    isExternal
                        ? "bg-indigo-500/10 border-indigo-500/10 hover:bg-indigo-500 text-indigo-700 dark:text-indigo-400 hover:text-white"
                        : "bg-amber-500/10 border-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-400 hover:text-white"
                )}
            >
                {isUnblocking ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                    <X className="h-3 w-3" />
                )}
                Unblock Room
            </button>
        </div>
    );
}
