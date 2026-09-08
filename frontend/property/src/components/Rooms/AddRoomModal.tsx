import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '../../services/rooms';
import type { RoomType } from '../../types/room';
import { Loader2, X, Plus, BedDouble } from 'lucide-react';
import toast from 'react-hot-toast';

const roomSchema = z.object({
    propertyId: z.string().min(1, 'Property is required'),
    roomNumber: z.string().min(1, 'Room number is required'),
    floor: z.union([z.number(), z.nan()]).transform(val => isNaN(val as number) ? undefined : val).optional(),
    roomTypeId: z.string().min(1, 'Room type is required'),
    notes: z.string().optional(),
    isEnabled: z.boolean(),
});

type RoomFormData = z.infer<typeof roomSchema>;

interface AddRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultRoomTypeId?: string;
    roomTypes?: RoomType[];
    propertyId: string;
    onSuccess?: () => void;
}

export default function AddRoomModal({
    isOpen,
    onClose,
    defaultRoomTypeId,
    roomTypes = [],
    propertyId,
    onSuccess,
}: AddRoomModalProps) {
    const queryClient = useQueryClient();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<RoomFormData>({
        resolver: zodResolver(roomSchema),
        defaultValues: {
            isEnabled: true,
            propertyId,
            roomNumber: '',
            roomTypeId: defaultRoomTypeId || '',
            notes: '',
        },
    });

    useEffect(() => {
        if (isOpen) {
            reset({
                isEnabled: true,
                propertyId,
                roomNumber: '',
                roomTypeId: defaultRoomTypeId || (roomTypes.length > 0 ? roomTypes[0].id : ''),
                notes: '',
            });
        }
    }, [isOpen, defaultRoomTypeId, propertyId, roomTypes, reset]);

    const createRoomMutation = useMutation({
        mutationFn: roomsService.create,
        onSuccess: () => {
            toast.success('Room created successfully');
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            if (onSuccess) onSuccess();
            onClose();
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create room');
        },
    });

    const onSubmit = (data: RoomFormData) => {
        createRoomMutation.mutate(data);
    };

    if (!isOpen) return null;

    const selectedType = roomTypes.find(rt => rt.id === defaultRoomTypeId);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-lg rounded-2xl shadow-xl border border-border overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 text-primary rounded-xl">
                            <BedDouble className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-foreground">Add New Room</h2>
                            <p className="text-xs text-muted-foreground font-medium">
                                {selectedType ? `Create a room under ${selectedType.name}` : 'Create a room for this property'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Room Number *
                        </label>
                        <input
                            {...register('roomNumber')}
                            placeholder="e.g. 101, LVH101"
                            autoFocus
                            className="w-full px-4 py-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold text-sm transition-all"
                        />
                        {errors.roomNumber && (
                            <p className="text-destructive text-xs mt-1 font-semibold">{errors.roomNumber.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Room Type *
                        </label>
                        <select
                            {...register('roomTypeId')}
                            className="w-full px-4 py-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold text-sm transition-all"
                        >
                            <option value="" disabled>Select Room Type</option>
                            {roomTypes.map((type) => (
                                <option key={type.id} value={type.id}>
                                    {type.name} (₹{type.basePrice}/night)
                                </option>
                            ))}
                        </select>
                        {errors.roomTypeId && (
                            <p className="text-destructive text-xs mt-1 font-semibold">{errors.roomTypeId.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Floor Number (Optional)
                        </label>
                        <input
                            type="number"
                            {...register('floor', { valueAsNumber: true })}
                            placeholder="e.g. 1"
                            className="w-full px-4 py-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-semibold text-sm transition-all"
                        />
                        {errors.floor && (
                            <p className="text-destructive text-xs mt-1 font-semibold">{errors.floor.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                            Notes / Description (Optional)
                        </label>
                        <textarea
                            {...register('notes')}
                            rows={2}
                            placeholder="e.g. Balcony with pool view"
                            className="w-full px-4 py-2.5 bg-background text-foreground border border-input rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-sm transition-all resize-none"
                        />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                        <input
                            type="checkbox"
                            id="isEnabled"
                            {...register('isEnabled')}
                            className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                        />
                        <label htmlFor="isEnabled" className="text-xs font-bold text-foreground cursor-pointer select-none">
                            Enable room immediately for bookings
                        </label>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createRoomMutation.isPending}
                            className="px-5 py-2 text-xs font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                            {createRoomMutation.isPending ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-4 w-4" />
                                    Create Room
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
