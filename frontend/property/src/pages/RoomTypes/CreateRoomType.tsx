import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import ImageUpload from '../../components/ImageUpload';
import { Loader2, ArrowLeft, Save, Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { RoomType } from '../../types/room';

const roomTypeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    basePrice: z.number().min(0, 'Price must be positive'),
    maxAdults: z.number().min(1, 'At least 1 adult'),
    maxChildren: z.number().min(0),
    isPubliclyVisible: z.boolean(),
    extraAdultPrice: z.number().min(0),
    extraChildPrice: z.number().min(0),
    freeChildrenCount: z.number().min(0),
    propertyId: z.string().min(1, 'Property is required'),
    amenities: z.array(z.object({ value: z.string() })),
    highlights: z.array(z.object({ value: z.string() })),
    inclusions: z.array(z.object({ value: z.string() })),
    cancellationPolicy: z.string().optional(),
    marketingBadgeText: z.string().optional(),
    marketingBadgeType: z.string().optional(),
    images: z.array(z.string()),
});

type RoomTypeFormData = z.infer<typeof roomTypeSchema>;

export default function CreateRoomType() {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();
    const isEdit = !!id;

    const { data: existingRoomType, isLoading: loadingExisting } = useQuery<RoomType>({
        queryKey: ['roomType', id],
        queryFn: () => roomTypesService.getById(id!),
        enabled: !!id,
    });

    const {
        register, handleSubmit, control, setValue, watch,
        formState: { errors, isSubmitting }, reset,
    } = useForm<RoomTypeFormData>({
        resolver: zodResolver(roomTypeSchema),
        defaultValues: {
            isPubliclyVisible: true,
            basePrice: 0, maxAdults: 2, maxChildren: 0,
            extraAdultPrice: 0, extraChildPrice: 0, freeChildrenCount: 0,
            amenities: [], highlights: [], inclusions: [],
            cancellationPolicy: '', marketingBadgeText: '',
            marketingBadgeType: 'POSITIVE', images: [],
            propertyId: selectedProperty?.id || '',
        },
    });

    useEffect(() => {
        if (selectedProperty?.id) setValue('propertyId', selectedProperty.id);
    }, [selectedProperty, setValue]);

    useEffect(() => {
        if (existingRoomType && isEdit) {
            reset({
                name: existingRoomType.name,
                description: existingRoomType.description || '',
                basePrice: existingRoomType.basePrice,
                maxAdults: existingRoomType.maxAdults,
                maxChildren: existingRoomType.maxChildren,
                isPubliclyVisible: existingRoomType.isPubliclyVisible,
                extraAdultPrice: existingRoomType.extraAdultPrice || 0,
                extraChildPrice: existingRoomType.extraChildPrice || 0,
                freeChildrenCount: existingRoomType.freeChildrenCount || 0,
                propertyId: existingRoomType.propertyId,
                amenities: (existingRoomType.amenities || []).map((a: string) => ({ value: a })),
                highlights: (existingRoomType.highlights || []).map((h: string) => ({ value: h })),
                inclusions: (existingRoomType.inclusions || []).map((i: string) => ({ value: i })),
                cancellationPolicy: existingRoomType.cancellationPolicy || '',
                marketingBadgeText: existingRoomType.marketingBadgeText || '',
                marketingBadgeType: existingRoomType.marketingBadgeType || 'POSITIVE',
                images: existingRoomType.images || [],
            });
        }
    }, [existingRoomType, isEdit, reset]);

    const { fields: amenityFields, append: appendAmenity, remove: removeAmenity } = useFieldArray({ control, name: 'amenities' });
    const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({ control, name: 'highlights' });
    const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({ control, name: 'inclusions' });

    const images = watch('images');

    const saveMutation = useMutation({
        mutationFn: (data: RoomTypeFormData) => {
            const payload = {
                ...data,
                amenities: data.amenities.map(a => a.value).filter(v => v),
                highlights: data.highlights.map(h => h.value).filter(v => v),
                inclusions: data.inclusions.map(i => i.value).filter(v => v),
            };
            return isEdit ? roomTypesService.update(id!, payload) : roomTypesService.create(payload);
        },
        onSuccess: () => {
            toast.success(isEdit ? 'Room type updated!' : 'Room type created!');
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            navigate('/room-types');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save room type');
        },
    });

    const onSubmit = (data: RoomTypeFormData) => saveMutation.mutate(data);

    if (loadingExisting && isEdit) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="max-w-3xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/room-types')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'Create'} Room Type</h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* General Info */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">General Information</h2>
                    <input type="hidden" {...register('propertyId')} />
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                        <input {...register('name')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <textarea {...register('description')} rows={3} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Price (₹/night)</label>
                            <input type="number" {...register('basePrice', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Adults</label>
                            <input type="number" {...register('maxAdults', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Children</label>
                            <input type="number" {...register('maxChildren', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Adult Price (₹)</label>
                            <input type="number" {...register('extraAdultPrice', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Extra Child Price (₹)</label>
                            <input type="number" {...register('extraChildPrice', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Free Children</label>
                            <input type="number" {...register('freeChildrenCount', { valueAsNumber: true })} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('isPubliclyVisible')} id="isPubliclyVisible" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                        <label htmlFor="isPubliclyVisible" className="text-sm text-gray-900 dark:text-gray-300">Publicly visible on the booking website</label>
                    </div>
                </div>

                {/* Marketing Badge */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Marketing Badge</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Badge Text</label>
                            <input {...register('marketingBadgeText')} placeholder="e.g., Most Popular" className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Badge Type</label>
                            <select {...register('marketingBadgeType')} className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm">
                                <option value="POSITIVE">Positive (Green)</option>
                                <option value="NEGATIVE">Negative (Red)</option>
                                <option value="INFO">Info (Blue)</option>
                                <option value="WARNING">Warning (Yellow)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Amenities, Highlights, Inclusions */}
                {[
                    { label: 'Amenities', fields: amenityFields, append: () => appendAmenity({ value: '' }), remove: removeAmenity, name: 'amenities' as const },
                    { label: 'Highlights', fields: highlightFields, append: () => appendHighlight({ value: '' }), remove: removeHighlight, name: 'highlights' as const },
                    { label: 'Inclusions', fields: inclusionFields, append: () => appendInclusion({ value: '' }), remove: removeInclusion, name: 'inclusions' as const },
                ].map((section) => (
                    <div key={section.label} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{section.label}</h2>
                            <button type="button" onClick={section.append} className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                                <Plus className="h-4 w-4" /> Add
                            </button>
                        </div>
                        {section.fields.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 italic">No {section.label.toLowerCase()} added yet.</p>}
                        <div className="space-y-2">
                            {section.fields.map((field, index) => (
                                <div key={field.id} className="flex items-center gap-2">
                                    <input
                                        {...register(`${section.name}.${index}.value`)}
                                        placeholder={`Enter ${section.label.slice(0, -1).toLowerCase()}`}
                                        className="flex-1 border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm text-sm"
                                    />
                                    <button type="button" onClick={() => section.remove(index)} className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {/* Cancellation Policy */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Cancellation Policy</h2>
                    <textarea {...register('cancellationPolicy')} rows={4} placeholder="Describe the cancellation rules..."
                        className="w-full border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md shadow-sm" />
                </div>

                {/* Images */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Images</h2>
                    <ImageUpload images={images || []} onChange={(imgs) => setValue('images', imgs)} maxImages={10} />
                </div>

                {/* Submit */}
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => navigate('/room-types')} className="px-6 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                        Cancel
                    </button>
                    <button type="submit" disabled={isSubmitting || saveMutation.isPending}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                        {saveMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Save className="h-4 w-4" />}
                        {isEdit ? 'Update' : 'Create'} Room Type
                    </button>
                </div>
            </form>
        </div>
    );
}
