import { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { roomTypesService } from '../../services/roomTypes';
import { Loader2, ArrowLeft, Save, Plus, X } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';

const roomTypeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    basePrice: z.number().min(0, 'Must be positive'),
    maxAdults: z.number().min(1, 'At least 1 adult'),
    maxChildren: z.number().min(0, 'Cannot be negative'),
    extraAdultPrice: z.number().min(0),
    extraChildPrice: z.number().min(0),
    freeChildrenCount: z.number().min(0),
    isPubliclyVisible: z.boolean(),
    amenities: z.array(z.string()).min(1, 'Add at least one amenity'),
    images: z.array(z.string()).optional(),
});

type RoomTypeFormData = z.infer<typeof roomTypeSchema>;

export default function CreateRoomType() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;
    const queryClient = useQueryClient();

    const { data: existingType, isLoading: loadingType } = useQuery({
        queryKey: ['roomType', id],
        queryFn: () => roomTypesService.getById(id!),
        enabled: isEditMode,
    });

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<RoomTypeFormData>({
        resolver: zodResolver(roomTypeSchema),
        defaultValues: {
            name: '',
            description: '',
            basePrice: 0,
            maxAdults: 2,
            maxChildren: 1,
            extraAdultPrice: 0,
            extraChildPrice: 0,
            freeChildrenCount: 0,
            isPubliclyVisible: true,
            amenities: ['WiFi', 'Air Conditioning'],
            images: [],
        },
    });

    const { fields: amenitiesFields, append: appendAmenity, remove: removeAmenity } = useFieldArray({
        control: control as any,
        name: 'amenities' as any,
    });

    // const amenitiesInput = watch('amenities');

    const handleAddAmenity = () => {
        appendAmenity('');
    };

    const handleRemoveAmenity = (index: number) => {
        removeAmenity(index);
    };

    // const handleAmenityChange = (index: number, value: string) => {
    //     setValue(`amenities.${index}`, value);
    // };

    useEffect(() => {
        if (existingType) {
            setValue('name', existingType.name);
            setValue('description', existingType.description || '');
            setValue('basePrice', existingType.basePrice);
            setValue('maxAdults', existingType.maxAdults);
            setValue('maxChildren', existingType.maxChildren);
            setValue('extraAdultPrice', existingType.extraAdultPrice);
            setValue('extraChildPrice', existingType.extraChildPrice);
            setValue('freeChildrenCount', existingType.freeChildrenCount);
            setValue('isPubliclyVisible', existingType.isPubliclyVisible);
            setValue('amenities', existingType.amenities);
            setValue('images', existingType.images);
        }
    }, [existingType, setValue]);

    const mutation = useMutation({
        mutationFn: (data: RoomTypeFormData) => {
            const submitData: any = {
                ...data,
                images: data.images || []
            };
            if (isEditMode) {
                return roomTypesService.update(id!, submitData);
            }
            return roomTypesService.create(submitData);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            navigate('/room-types');
        },
        onError: (error: any) => {
            alert(error.response?.data?.message || 'Failed to save room type');
        },
    });

    const onSubmit = (data: RoomTypeFormData) => {
        const cleanData = {
            ...data,
            amenities: data.amenities.filter(a => a.trim() !== ''),
            images: (data.images || []) as string[]
        };
        mutation.mutate(cleanData);
    };

    if (isEditMode && loadingType) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/room-types')} className="p-2 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Room Type' : 'Create Room Type'}</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
                        <h2 className="text-lg font-semibold mb-4">Basic Information</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    {...register('name')}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="e.g. Deluxe Ocean View"
                                />
                                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    {...register('description')}
                                    rows={3}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    placeholder="Describe the room..."
                                />
                            </div>
                            <div className="flex items-center md:col-span-2">
                                <input
                                    type="checkbox"
                                    {...register('isPubliclyVisible')}
                                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-900">
                                    Publicly Visible (Show on booking website)
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Pricing & Occupancy */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4">Pricing & Occupancy</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Base Price (per night)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        {...register('basePrice', { valueAsNumber: true })}
                                        className="w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice.message}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Adults</label>
                                    <input
                                        type="number"
                                        {...register('maxAdults', { valueAsNumber: true })}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Children</label>
                                    <input
                                        type="number"
                                        {...register('maxChildren', { valueAsNumber: true })}
                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Extra Charges */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <h2 className="text-lg font-semibold mb-4">Extra Guest Policy</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Adult Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        {...register('extraAdultPrice', { valueAsNumber: true })}
                                        className="w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Child Price</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                    <input
                                        type="number"
                                        {...register('extraChildPrice', { valueAsNumber: true })}
                                        className="w-full pl-7 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Free Children Count</label>
                                <input
                                    type="number"
                                    {...register('freeChildrenCount', { valueAsNumber: true })}
                                    className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Number of children allowed before charging extra.</p>
                            </div>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
                        <h2 className="text-lg font-semibold mb-4">Room Images</h2>
                        <ImageUpload
                            images={watch('images') || []}
                            onChange={(newImages) => setValue('images', newImages, { shouldDirty: true, shouldValidate: true })}
                        />
                    </div>

                    {/* Amenities */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 md:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Amenities</h2>
                            <button
                                type="button"
                                onClick={handleAddAmenity}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" /> Add Amenity
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {amenitiesFields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2">
                                    <input
                                        {...register(`amenities.${index}`)}
                                        className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 text-sm"
                                        placeholder="e.g. WiFi"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveAmenity(index)}
                                        className="text-gray-400 hover:text-red-500"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                        {errors.amenities && <p className="text-red-500 text-xs mt-1">{errors.amenities.message}</p>}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2 text-lg font-medium shadow-sm"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        {isEditMode ? 'Update Room Type' : 'Create Room Type'}
                    </button>
                </div>
            </form>
        </div>
    );
}
