import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomsService } from '../../services/rooms';
import { roomTypesService } from '../../services/roomTypes';
import { Loader2, ArrowLeft, Save } from 'lucide-react';
import { useEffect } from 'react';

const roomSchema = z.object({
    roomNumber: z.string().min(1, 'Room number is required'),
    floor: z.number().optional(),
    roomTypeId: z.string().min(1, 'Room type is required'),
    notes: z.string().optional(),
    isEnabled: z.boolean().default(true),
});

type RoomFormData = z.infer<typeof roomSchema>;

export default function EditRoom() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const { data: roomTypes, isLoading: loadingTypes } = useQuery({
        queryKey: ['roomTypes'],
        queryFn: roomTypesService.getAll,
    });

    const { data: room, isLoading: loadingRoom } = useQuery({
        queryKey: ['room', id],
        queryFn: () => roomsService.getById(id!),
        enabled: !!id,
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<RoomFormData>({
        resolver: zodResolver(roomSchema),
    });

    useEffect(() => {
        if (room) {
            reset({
                roomNumber: room.roomNumber,
                floor: room.floor,
                roomTypeId: room.roomTypeId,
                notes: room.notes || '',
                isEnabled: room.isEnabled,
            });
        }
    }, [room, reset]);

    const updateRoomMutation = useMutation({
        mutationFn: (data: RoomFormData) => roomsService.update(id!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rooms'] });
            queryClient.invalidateQueries({ queryKey: ['room', id] });
            navigate('/rooms');
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to update room');
        },
    });

    const onSubmit = (data: RoomFormData) => {
        updateRoomMutation.mutate(data);
    };

    if (loadingTypes || loadingRoom) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (!room) {
        return <div className="p-8 text-center text-red-500">Room not found</div>;
    }

    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/rooms')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Edit Room</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                        <input
                            {...register('roomNumber')}
                            placeholder="e.g. 101"
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                        {errors.roomNumber && <p className="text-red-500 text-xs mt-1">{errors.roomNumber.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                        <select
                            {...register('roomTypeId')}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        >
                            <option value="">Select Type</option>
                            {roomTypes?.map((type) => (
                                <option key={type.id} value={type.id}>{type.name}</option>
                            ))}
                        </select>
                        {errors.roomTypeId && <p className="text-red-500 text-xs mt-1">{errors.roomTypeId.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Floor (Optional)</label>
                        <input
                            type="number"
                            {...register('floor', { valueAsNumber: true })}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                        <textarea
                            {...register('notes')}
                            rows={3}
                            className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            {...register('isEnabled')}
                            id="isEnabled"
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label htmlFor="isEnabled" className="ml-2 block text-sm text-gray-900">
                            Room is enabled (Available for booking)
                        </label>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting || updateRoomMutation.isPending}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                        >
                            {updateRoomMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                            Update Room
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
