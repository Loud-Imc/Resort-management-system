import { useNavigate, useSearchParams } from 'react-router-dom';
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
    floor: z.number().optional(),
    roomTypeId: z.string().min(1, 'Room type is required'),
    notes: z.string().optional(),
    isEnabled: z.boolean(),
});

type RoomFormData = z.infer<typeof roomSchema>;



export default function CreateRoom() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { propertyIdFromUrl } = { propertyIdFromUrl: searchParams.get('propertyId') }; // or just use searchParams.get directly
    const { selectedProperty } = useProperty();

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RoomFormData>({
        resolver: zodResolver(roomSchema),
        defaultValues: {
            isEnabled: true,
            propertyId: propertyIdFromUrl || selectedProperty?.id || '',
        },
    });

    const selectedPropertyId = watch('propertyId');

    const { data: roomTypes, isLoading: loadingTypes } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', selectedPropertyId],
        queryFn: () => roomTypesService.getAllAdmin({
            propertyId: selectedPropertyId
        }),
        enabled: !!selectedPropertyId,
    });

    const createRoomMutation = useMutation({
        mutationFn: roomsService.create,
        onSuccess: () => {
            toast.success('Room created successfully');
            navigate(selectedPropertyId ? `/rooms?propertyId=${selectedPropertyId}` : '/rooms');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create room');
        },
    });

    const onSubmit = (data: RoomFormData) => {
        createRoomMutation.mutate(data);
    };

    if (loadingTypes) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }



    return (
        <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate(selectedPropertyId ? `/rooms?propertyId=${selectedPropertyId}` : '/rooms')}
                    className="p-2 hover:bg-gray-100 rounded-full"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">Add New Room</h1>
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
                            disabled={isSubmitting || createRoomMutation.isPending}
                            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
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
