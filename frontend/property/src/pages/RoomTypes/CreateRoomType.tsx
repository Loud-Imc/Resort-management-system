import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import ImageUpload from '../../components/ImageUpload';
import { Loader2, ArrowLeft, Save, Plus, X, Check } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import type { RoomType } from '../../types/room';
import { cancellationPoliciesService, type CancellationPolicy } from '../../services/cancellationPolicies';

const COMMON_HIGHLIGHTS = [
    'Mountain View', 'River View', 'Pool View', 'Garden View', 'Ocean View',
    'Valley View', 'Forest View', 'Sunset View', 'Private Balcony', 'Jacuzzi',
    'Fireplace', 'King Size Bed', 'Queen Size Bed', 'Twin Beds', 'Spacious Room',
    'Interconnected Rooms', 'Soundproofed', 'Attached Washroom', 'Bathtub'
];

const COMMON_INCLUSIONS = [
    'Breakfast Included', 'Lunch Included', 'Dinner Included',
    'All Meals Included (MAP)', 'Welcome Drink', 'Fruit Basket', 'Free Wi-Fi',
    'Airport Transfer', 'Railway Station Pickup', 'Evening Snacks',
    'Tea/Coffee Maker', 'Nature Walk', 'Yoga Session', 'Trekking',
    'Plantation Tour', 'Campfire', 'Bird Watching', 'Indoor Games'
];

const COMMON_AMENITIES = [
    'Wi-Fi', 'Air Conditioning (AC)', 'Fan', 'Room Heater', 'LED TV',
    'Mini Fridge', 'Electric Kettle', 'Safe Box', 'Telephone', 'Hair Dryer',
    'Iron & Board', 'Daily Housekeeping', 'Toiletries', 'Desk & Chair',
    'Wardrobe', 'Sofa / Seating Area', 'Extra Mattress', 'Bathrobes',
    'Plush Towels', 'Laundry Service'
];

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
    cancellationPolicyId: z.string().optional(),
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
            cancellationPolicy: '',
            cancellationPolicyId: '',
            marketingBadgeText: '',
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
                basePrice: Number(existingRoomType.basePrice),
                maxAdults: existingRoomType.maxAdults,
                maxChildren: existingRoomType.maxChildren,
                isPubliclyVisible: existingRoomType.isPubliclyVisible,
                extraAdultPrice: Number(existingRoomType.extraAdultPrice) || 0,
                extraChildPrice: Number(existingRoomType.extraChildPrice) || 0,
                freeChildrenCount: existingRoomType.freeChildrenCount || 0,
                propertyId: existingRoomType.propertyId,
                amenities: (existingRoomType.amenities || []).map((a: string) => ({ value: a })),
                highlights: (existingRoomType.highlights || []).map((h: string) => ({ value: h })),
                inclusions: (existingRoomType.inclusions || []).map((i: string) => ({ value: i })),
                cancellationPolicy: existingRoomType.cancellationPolicyText || '',
                cancellationPolicyId: existingRoomType.cancellationPolicyId || '',
                marketingBadgeText: existingRoomType.marketingBadgeText || '',
                marketingBadgeType: existingRoomType.marketingBadgeType || 'POSITIVE',
                images: existingRoomType.images || [],
            });
        }
    }, [existingRoomType, isEdit, reset]);

    const { fields: amenityFields, append: appendAmenity, remove: removeAmenity } = useFieldArray({ control, name: 'amenities' });
    const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({ control, name: 'highlights' });
    const { fields: inclusionFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({ control, name: 'inclusions' });

    const toggleItem = (value: string, fields: any[], append: Function, remove: Function) => {
        const index = fields.findIndex(f => f.value === value);
        if (index > -1) {
            remove(index);
        } else {
            append({ value });
        }
    };

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

    const { data: policies = [] } = useQuery<CancellationPolicy[]>({
        queryKey: ['cancellationPolicies', selectedProperty?.id],
        queryFn: () => cancellationPoliciesService.getAll(selectedProperty!.id),
        enabled: !!selectedProperty?.id,
    });

    if (loadingExisting && isEdit) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div className="max-w-4xl mx-auto pb-12 space-y-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/room-types')}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{isEdit ? 'Edit' : 'Create'} Room Type</h1>
                    <p className="text-sm text-gray-500 font-medium">Define room features, pricing, and availability</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* General Info */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-8">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">General Information</h2>
                    </div>

                    <input type="hidden" {...register('propertyId')} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Room Type Name</label>
                            <input
                                {...register('name')}
                                placeholder="e.g. Deluxe Suite"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-bold placeholder:text-gray-400"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1 font-bold">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Base Price / Night (₹)</label>
                            <input
                                type="number"
                                {...register('basePrice', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-black"
                            />
                            {errors.basePrice && <p className="text-red-500 text-xs mt-1 font-bold">{errors.basePrice.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                            <textarea
                                {...register('description')}
                                rows={3}
                                placeholder="Describe the room experience..."
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all min-h-[100px]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Max Adults</label>
                            <input type="number" {...register('maxAdults', { valueAsNumber: true })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Max Children</label>
                            <input type="number" {...register('maxChildren', { valueAsNumber: true })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Extra Adult Price (₹)</label>
                            <input type="number" {...register('extraAdultPrice', { valueAsNumber: true })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Extra Child Price (₹)</label>
                            <input type="number" {...register('extraChildPrice', { valueAsNumber: true })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Free Children Count</label>
                            <input type="number" {...register('freeChildrenCount', { valueAsNumber: true })} className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all" />
                        </div>

                        <div className="flex items-center md:pt-4">
                            <label className="relative inline-flex items-center cursor-pointer group">
                                <input type="checkbox" {...register('isPubliclyVisible')} id="isPubliclyVisible" className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                <span className="ml-3 text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">Publicly Visible</span>
                            </label>
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Cancellation Policy (Text Override)</label>
                            <input
                                {...register('cancellationPolicy')}
                                placeholder="e.g. Free cancellation until 24 hours before check-in"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-gray-400 font-medium"
                            />
                        </div>

                        <div className="md:col-span-1">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">Select Cancellation Policy</label>
                            <select
                                {...register('cancellationPolicyId')}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                            >
                                <option value="">Use Property Default</option>
                                {policies.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} {p.isDefault ? '(Default)' : ''}</option>
                                ))}
                            </select>
                        </div>

                        {/* Marketing Badge Section */}
                        <div className="md:col-span-1 border-t border-gray-100 dark:border-gray-700 pt-6">
                            <label className="block text-[10px] font-black text-primary-600 uppercase tracking-widest mb-2">Marketing Badge Text</label>
                            <input
                                {...register('marketingBadgeText')}
                                placeholder="e.g. Selling Fast, Early Bird Offer"
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:text-gray-400"
                            />
                            <p className="mt-1 text-[10px] text-gray-500 font-medium italic">This text appears as a prominent tag on the room card.</p>
                        </div>

                        <div className="md:col-span-1 border-t border-gray-100 dark:border-gray-700 pt-6">
                            <label className="block text-[10px] font-black text-primary-600 uppercase tracking-widest mb-2">Badge Style</label>
                            <select
                                {...register('marketingBadgeType')}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                            >
                                <option value="POSITIVE">Positive (Green/Trust)</option>
                                <option value="INFO">Info (Blue/Standard)</option>
                                <option value="WARNING">Warning (Yellow/Urgent)</option>
                                <option value="NEGATIVE">Urgent (Red/Alert)</option>
                            </select>
                            <p className="mt-1 text-[10px] text-gray-500 font-medium italic">Determines the color profile of the badge.</p>
                        </div>
                    </div>
                </div>

                {/* Highlights, Inclusions, Amenities */}
                {[
                    { label: 'Room Highlights', fields: highlightFields, append: appendHighlight, remove: removeHighlight, name: 'highlights' as const, common: COMMON_HIGHLIGHTS },
                    { label: "What's Included", fields: inclusionFields, append: appendInclusion, remove: removeInclusion, name: 'inclusions' as const, common: COMMON_INCLUSIONS },
                    { label: 'Amenities', fields: amenityFields, append: appendAmenity, remove: removeAmenity, name: 'amenities' as const, common: COMMON_AMENITIES },
                ].map((section) => (
                    <div key={section.label} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
                        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                            <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{section.label}</h2>
                        </div>

                        {/* Predefined Chips */}
                        <div className="flex flex-wrap gap-2">
                            {section.common.map(item => {
                                const isSelected = section.fields.some(f => f.value === item);
                                return (
                                    <button
                                        key={item}
                                        type="button"
                                        onClick={() => toggleItem(item, section.fields, section.append, section.remove)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected
                                            ? 'bg-primary-50 border-primary-600 text-primary-700 shadow-sm'
                                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                            }`}
                                    >
                                        {isSelected && <Check className="h-3 w-3" />}
                                        {item}
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pt-4 border-t border-dashed border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Custom {section.label}</h3>
                                <button
                                    type="button"
                                    onClick={() => section.append({ value: '' })}
                                    className="text-primary-600 hover:text-primary-700 text-xs font-black uppercase tracking-widest flex items-center gap-1 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg transition-all"
                                >
                                    <Plus className="h-3 w-3" /> Add More
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {section.fields.filter(f => !section.common.includes(f.value)).map((field) => {
                                    const realIndex = section.fields.findIndex(f => f.id === field.id);
                                    return (
                                        <div key={field.id} className="flex gap-2 group">
                                            <input
                                                {...register(`${section.name}.${realIndex}.value`)}
                                                placeholder={`Enter custom ${section.label.toLowerCase().slice(0, -1)}`}
                                                className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => section.remove(realIndex)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                            >
                                                <X className="h-5 w-5" />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Images */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-6">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Room Type Images</h2>
                    </div>
                    <ImageUpload images={images || []} onChange={(imgs) => setValue('images', imgs)} maxImages={10} />
                </div>

                {/* Submit */}
                <div className="flex justify-end items-center gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={() => navigate('/room-types')}
                        className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || saveMutation.isPending}
                        className="bg-primary-600 text-white px-10 py-2.5 rounded-xl hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500/20 shadow-lg shadow-primary-600/20 disabled:opacity-50 transition-all flex items-center gap-2 font-black uppercase tracking-widest"
                    >
                        {saveMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        {isEdit ? 'Update' : 'Create'} Type
                    </button>
                </div>
            </form>
        </div>
    );
}
