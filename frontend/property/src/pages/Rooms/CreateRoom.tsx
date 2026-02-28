import { useNavigate } from 'react-router-dom';
import type { RoomType } from '../../types/room';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { roomsService } from '../../services/rooms';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
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

export default function CreateRoom() {
    const navigate = useNavigate();
    const { selectedProperty } = useProperty();
    const propertyId = selectedProperty?.id || '';

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<RoomFormData>({
        resolver: zodResolver(roomSchema),
        defaultValues: {
            isEnabled: true,
            propertyId,
            roomNumber: '',
            roomTypeId: '',
            notes: '',
        },
    });

    const { data: roomTypes, isLoading: loadingTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', propertyId],
        queryFn: () => roomTypesService.getAllAdmin({ propertyId }),
        enabled: !!propertyId,
    });

    const createRoomMutation = useMutation({
        mutationFn: roomsService.create,
        onSuccess: () => {
            toast.success('Room created successfully');
            navigate('/rooms');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create room');
        },
    });

    const onSubmit = (data: RoomFormData) => {
        createRoomMutation.mutate(data);
    };

    if (loadingTypes) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/rooms')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                    <ArrowLeft className="h-5 w-5 text-foreground" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Add New Room</h1>
                    <p className="text-muted-foreground font-medium">Create a new room for your property</p>
                </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-1">Room Number *</label>
                        <input
                            {...register('roomNumber')}
                            placeholder="e.g. 101"
                            className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                        {errors.roomNumber && <p className="text-destructive text-xs mt-1">{errors.roomNumber.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-muted-foreground mb-1">Room Type *</label>
                        <select
                            {...register('roomTypeId')}
                            className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        >
                            <option value="">Select Type</option>
                            {roomTypes?.map((type) => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                        {errors.roomTypeId && <p className="text-destructive text-xs mt-1">{errors.roomTypeId.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Floor (Optional)</label>
                        <input
                            type="number"
                            {...register('floor', { valueAsNumber: true })}
                            className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Notes (Optional)</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            {...register('isEnabled')}
                            id="isEnabled"
                            className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                        />
                        <label htmlFor="isEnabled" className="ml-2 block text-sm text-foreground">
                            Room is enabled (Available for booking)
                        </label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || createRoomMutation.isPending}
                            className="bg-primary text-primary-foreground px-6 py-2 rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 transition-colors"
                        >
                            {createRoomMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                            Create Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
