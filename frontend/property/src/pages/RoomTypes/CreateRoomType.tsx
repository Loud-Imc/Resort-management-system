import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import ImageUpload from '../../components/ImageUpload';
import { Loader2, ArrowLeft, Save, Plus, X, Check, Users, Info } from 'lucide-react';
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
    'Wi-Fi', 'Air Conditioning (AC)', 'Fan', 'Room Heater', 'TV',
    'Mini Fridge', 'Electric Kettle', 'Safe Box', 'Telephone', 'Hair Dryer',
    'Iron box', 'Daily Housekeeping', 'Toiletries', 'Desk & Chair',
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
    isAvailableForGroupBooking: z.boolean(),
    groupMaxOccupancy: z.number().min(0).optional(),
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
            isAvailableForGroupBooking: false,
            groupMaxOccupancy: 0,
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
                isAvailableForGroupBooking: existingRoomType.isAvailableForGroupBooking || false,
                groupMaxOccupancy: existingRoomType.groupMaxOccupancy || 0,
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

                        <div className="md:col-span-2 space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary-600" />
                                <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Group Booking Configuration</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                <div className="flex flex-col justify-center">
                                    <label className="inline-flex items-center cursor-pointer group">
                                        <input type="checkbox" {...register('isPubliclyVisible')} className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-red-500 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        <div className="ml-3">
                                            <span className="block text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">Publicly Visible</span>
                                            <span className="block text-[10px] text-gray-500 font-medium">Show this room type on the public website</span>
                                        </div>
                                    </label>
                                </div>

                                <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-8">
                                    <label className="inline-flex items-center cursor-pointer group">
                                        <input type="checkbox" {...register('isAvailableForGroupBooking')} className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-red-500 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        <div className="ml-3">
                                            <span className="block text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">Enable Group Bookings</span>
                                            <span className="block text-[10px] text-gray-500 font-medium">Allows guests to book per head for large groups</span>
                                        </div>
                                    </label>
                                </div>

                                {watch('isAvailableForGroupBooking') && (
                                    <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-2 duration-200 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                                            Max Group Occupancy
                                            <div className="group/info relative">
                                                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-56 p-2.5 bg-gray-900 text-[10px] text-white rounded-xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-10 leading-relaxed font-medium shadow-xl border border-white/10">
                                                    Maximum number of people allowed in this room for a group stay (can be higher than normal occupancy).
                                                </div>
                                            </div>
                                        </label>
                                        <div className="relative">
                                            <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="number"
                                                {...register('groupMaxOccupancy', { valueAsNumber: true })}
                                                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition-all"
                                                placeholder="e.g. 10"
                                            />
                                        </div>
                                    </div>
                                )}

                                {watch('isAvailableForGroupBooking') && (
                                    <div className="animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col justify-center pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
                                            <span className="block text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Pricing Strategy</span>
                                            <span className="block text-[11px] text-blue-500 dark:text-blue-400 font-medium leading-tight">Group rates for adults and children are configured in <span className="font-black">Property Settings</span>.</span>
                                        </div>
                                    </div>
                                )}
                            </div>
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
