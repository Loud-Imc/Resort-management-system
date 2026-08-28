import { useNavigate, useParams } from 'react-router-dom';
import type { Room, RoomType, RoomStatus } from '../../types/room';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '../../services/rooms';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

const roomSchema = z.object({
    roomNumber: z.string().min(1, 'Room number is required'),
    floor: z.coerce.number().optional().nullable(),
    roomTypeId: z.string().min(1, 'Room type is required'),
    status: z.enum(['AVAILABLE', 'MAINTENANCE', 'CLEANING', 'OCCUPIED', 'BLOCKED', 'RESERVED', 'OUT_TODAY']).optional(),
    notes: z.string().optional(),
    isEnabled: z.boolean(),
});

export default function EditRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();

    const { data: roomTypes, isLoading: loadingTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAll({ propertyId: selectedProperty?.id }),
        enabled: !!selectedProperty?.id,
    });

    const { data: room, isLoading: loadingRoom } = useQuery<Room>({
        queryKey: ['room', id],
        queryFn: () => roomsService.getById(id!),
        enabled: !!id,
    });

    const {
        register, handleSubmit,
        formState: { errors, isSubmitting }, reset,
    } = useForm<any>({ resolver: zodResolver(roomSchema) });

    useEffect(() => {
        if (room) {
            reset({
                roomNumber: room.roomNumber,
                floor: room.floor ?? undefined,
                roomTypeId: room.roomTypeId,
                status: room.status,
                notes: room.notes || '',
                isEnabled: room.isEnabled,
            });
        }
    }, [room, reset]);

    const updateRoomMutation = useMutation({
        mutationFn: (data: any) => {
            const floorVal = (data.floor === null || data.floor === undefined || isNaN(Number(data.floor))) ? undefined : Number(data.floor);
            return roomsService.update(id!, {
                roomNumber: data.roomNumber,
                floor: floorVal,
                roomTypeId: data.roomTypeId,
                status: data.status as RoomStatus | undefined,
                notes: data.notes,
                isEnabled: data.isEnabled,
                propertyId: selectedProperty?.id,
            });
        },
        onSuccess: () => {
            toast.success('Room updated successfully');
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room', id] });
            navigate('/rooms');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update room');
        },
    });

    const onSubmit = (data: any) => updateRoomMutation.mutate(data);

    if (loadingTypes || loadingRoom) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;
    if (!room) return <div className="p-8 text-center text-red-500 font-bold">Room not found</div>;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/rooms')} className="p-2 hover:bg-muted rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6 text-muted-foreground" />
                </button>
                <h1 className="text-2xl font-bold text-foreground">Edit Room</h1>
            </div>
            <div className="bg-card rounded-xl shadow-sm border border-border p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Room Number</label>
                        <input {...register('roomNumber')} placeholder="e.g. 101" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold" />
                        {errors.roomNumber?.message && <p className="text-destructive text-xs mt-1 font-bold">{String(errors.roomNumber.message)}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Room Type</label>
                        <select {...register('roomTypeId')} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold">
                            <option value="">Select Type</option>
                            {roomTypes?.map((type) => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                        {errors.roomTypeId?.message && <p className="text-destructive text-xs mt-1 font-bold">{String(errors.roomTypeId.message)}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Floor (Optional)</label>
                        <input type="number" {...register('floor')} placeholder="e.g. 1" className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Room Status</label>
                        <select {...register('status')} className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-semibold">
                            <option value="AVAILABLE">Available</option>
                            <option value="MAINTENANCE">Maintenance</option>
                            <option value="CLEANING">Cleaning</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-foreground mb-1">Notes (Optional)</label>
                        <textarea {...register('notes')} rows={3} placeholder="Additional details..." className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:ring-2 focus:ring-primary focus:outline-none transition-all font-medium" />
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center">
                            <input type="checkbox" {...register('isEnabled')} id="isEnabled" className="h-4 w-4 text-primary focus:ring-primary border-border rounded" />
                            <label htmlFor="isEnabled" className="ml-2 block text-sm font-bold text-foreground">Room is enabled (Available for booking)</label>
                        </div>
                        <p className="text-xs text-muted-foreground ml-6 font-medium">
                            Checking this box will restore a deactivated room and make it available for active guest bookings again.
                        </p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isSubmitting || updateRoomMutation.isPending}
                            className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2 font-bold transition-all shadow-sm">
                            {updateRoomMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                            Update Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

