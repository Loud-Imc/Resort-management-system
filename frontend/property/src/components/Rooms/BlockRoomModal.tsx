import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useProperty } from '../../context/PropertyContext';
import { roomsService } from '../../services/rooms';
import type { Room } from '../../types/room';
import {
    Loader2,
    Calendar,
    X,
    AlertTriangle,
    Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format, differenceInDays } from 'date-fns';

interface BlockRoomModalProps {
    room: Room;
    onClose: () => void;
    onSuccess: () => void;
}

function formatTime12Hour(time24?: string | null): string {
    if (!time24) return '';
    const parts = time24.split(':');
    if (parts.length < 2) return time24;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return time24;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const minuteStr = m.toString().padStart(2, '0');
    return `${hour12}:${minuteStr} ${period}`;
}

export default function BlockRoomModal({ room, onClose, onSuccess }: BlockRoomModalProps) {
    const { selectedProperty } = useProperty();
    const queryClient = useQueryClient();
    const checkInTime = formatTime12Hour(selectedProperty?.defaultCheckInTime || '14:00');
    const checkOutTime = formatTime12Hour(selectedProperty?.defaultCheckOutTime || '11:00');

    const [formData, setFormData] = useState({
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 86400000), 'yyyy-MM-dd'), // Tomorrow
        reason: 'Maintenance',
        notes: ''
    });

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const nights = differenceInDays(end, start);

    const mutation = useMutation({
        mutationFn: (data: any) => roomsService.block(room.id, data),
        onSuccess: () => {
            toast.success(`Room ${room.roomNumber} blocked successfully`);
            queryClient.invalidateQueries({ queryKey: ['dashboard-unified'] });
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            onSuccess();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to block room');
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (nights <= 0) {
            toast.error('End date must be after start date');
            return;
        }
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
                        <X className="h-5 w-5 text-muted-foreground hover:text-foreground" />
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
                                onChange={(e) => {
                                    const newStart = e.target.value;
                                    const dateObj = new Date(newStart);
                                    if (!isNaN(dateObj.getTime())) {
                                        const nextDay = new Date(dateObj);
                                        nextDay.setDate(nextDay.getDate() + 1);
                                        setFormData({
                                            ...formData,
                                            startDate: newStart,
                                            endDate: format(nextDay, 'yyyy-MM-dd')
                                        });
                                    } else {
                                        setFormData({
                                            ...formData,
                                            startDate: newStart
                                        });
                                    }
                                }}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground"
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
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground"
                            />
                        </div>
                    </div>

                    {/* Helpful Date & Night Description Card */}
                    {nights > 0 ? (
                        <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl text-xs space-y-1 text-foreground">
                            <div className="font-bold flex items-center gap-1.5 text-primary">
                                <Calendar className="h-3.5 w-3.5" />
                                {nights} {nights === 1 ? 'Night' : 'Nights'} Block ({format(start, 'MMM d')} – {format(end, 'MMM d, yyyy')})
                            </div>
                            <p className="text-muted-foreground leading-relaxed">
                                Room {room.roomNumber} will be blocked from <strong>{format(start, 'MMM d')} at {checkInTime}</strong> until <strong>{format(end, 'MMM d')} at {checkOutTime}</strong>.
                                It will automatically become available for check-in on <strong>{format(end, 'MMM d')}</strong> after {checkOutTime}.
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-semibold text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0" />
                            End Date must be after Start Date.
                        </div>
                    )}

                    <div className="space-y-2">
                        <label className="text-sm font-bold text-foreground">Reason</label>
                        <select
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all text-foreground"
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
                            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none transition-all h-24 resize-none text-foreground"
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-bold hover:bg-muted transition-colors text-foreground"
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
