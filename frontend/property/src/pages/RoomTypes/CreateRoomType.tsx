import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import ImageUpload from '../../components/ImageUpload';
import { Loader2, ArrowLeft, Save, Plus, X, Check, Users, Info, Tag, Baby } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import type { RoomType } from '../../types/room';
import { cancellationPoliciesService, type CancellationPolicy } from '../../services/cancellationPolicies';
import CancellationPolicyModal from '../../components/CancellationPolicyModal';

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

const optionalNumPreprocess = (fallback?: number) => z.preprocess(
    (val) => {
        if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
            return fallback;
        }
        const parsed = Number(val);
        return isNaN(parsed) ? fallback : parsed;
    },
    z.number().optional().nullable()
);

const roomTypeSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().min(1, 'Description is required'),
    basePrice: z.preprocess((v) => (v === '' || v === null || v === undefined || (typeof v === 'number' && isNaN(v))) ? 0 : Number(v), z.number().min(1, 'Price must be at least 1')),
    originalPrice: optionalNumPreprocess(),
    maxAdults: optionalNumPreprocess(2),
    maxChildren: optionalNumPreprocess(0),
    baseAdults: optionalNumPreprocess(2),
    baseChildren: optionalNumPreprocess(0),
    totalBaseOccupancy: optionalNumPreprocess(),
    totalMaxOccupancy: optionalNumPreprocess(),
    baseMaxAdults: optionalNumPreprocess(),
    baseMaxChildren: optionalNumPreprocess(),
    maxPhysicalAdults: optionalNumPreprocess(),
    maxPhysicalChildren: optionalNumPreprocess(),
    maxPhysicalInfants: optionalNumPreprocess(1),
    isPubliclyVisible: z.boolean(),
    extraAdultPrice: optionalNumPreprocess(0),
    extraChildPrice: optionalNumPreprocess(0),
    freeChildrenCount: optionalNumPreprocess(0),
    propertyId: z.string().min(1, 'Property is required'),
    amenities: z.array(z.object({ value: z.string() })),
    highlights: z.array(z.object({ value: z.string() })),
    inclusions: z.array(z.object({ value: z.string() })),
    cancellationPolicy: z.string().optional(),
    cancellationPolicyId: z.string().optional(),
    marketingBadgeText: z.string().optional(),
    marketingBadgeType: z.string().optional(),
    images: z.array(z.string()).min(1, 'At least one image is required'),
    isAvailableForGroupBooking: z.boolean(),
    groupMaxOccupancy: z.number().min(0).optional(),
    isGstInclusive: z.boolean(),
    allowPayAtProperty: z.boolean(),
    size: z.preprocess(
        (val) => (val === '' || val === undefined || val === null || (typeof val === 'number' && Number.isNaN(val)) ? undefined : Number(val)),
        z.number().min(0, 'Room size must be positive').optional()
    ),
}).refine(data => {
    if (data.originalPrice && data.originalPrice <= data.basePrice) {
        return false;
    }
    return true;
}, {
    message: "Original price (MRP) must be higher than base price",
    path: ["originalPrice"]
}).refine(data => {
    return !!data.cancellationPolicyId || !!data.cancellationPolicy;
}, {
    message: "Please select a policy or provide a text override",
    path: ["cancellationPolicyId"]
}).refine(data => {
    const baseOcc = data.totalBaseOccupancy ?? (Number(data.baseAdults || 2) + Number(data.baseChildren || 0));
    const maxOcc = data.totalMaxOccupancy ?? (Number(data.maxPhysicalAdults || data.maxAdults || 2) + Number(data.maxPhysicalChildren || data.maxChildren || 0));
    if (maxOcc < baseOcc) {
        return false;
    }
    return true;
}, {
    message: "Total Max Occupancy cannot be less than Total Base Occupancy",
    path: ["totalMaxOccupancy"]
});

type RoomTypeFormData = z.infer<typeof roomTypeSchema>;

export default function CreateRoomType() {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();
    const isEdit = !!id;
    const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);

    const { data: existingRoomType, isLoading: loadingExisting } = useQuery<RoomType>({
        queryKey: ['roomType', id],
        queryFn: () => roomTypesService.getById(id!),
        enabled: !!id,
    });

    const {
        register, handleSubmit, control, setValue, watch,
        formState: { errors, isSubmitting }, reset,
    } = useForm<any>({
        resolver: zodResolver(roomTypeSchema),
        defaultValues: {
            isPubliclyVisible: true,
            basePrice: 0,
            originalPrice: null,
            maxAdults: 2, maxChildren: 0,
            baseAdults: 2, baseChildren: 0,
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 4,
            baseMaxAdults: undefined,
            baseMaxChildren: undefined,
            maxPhysicalAdults: 4, maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            extraAdultPrice: 0, extraChildPrice: 0, freeChildrenCount: 0,
            amenities: [], highlights: [], inclusions: [],
            cancellationPolicy: '',
            cancellationPolicyId: '',
            marketingBadgeText: '',
            marketingBadgeType: 'POSITIVE', images: [],
            propertyId: selectedProperty?.id || '',
            isAvailableForGroupBooking: false,
            isGstInclusive: false,
            allowPayAtProperty: false,
            size: undefined,
        },
    });

    useEffect(() => {
        if (selectedProperty?.id) setValue('propertyId', selectedProperty.id);
    }, [selectedProperty, setValue]);

    useEffect(() => {
        if (existingRoomType && isEdit) {
            const rawBaseA = existingRoomType.baseAdults ?? existingRoomType.maxAdults ?? 2;
            const rawBaseC = existingRoomType.baseChildren ?? existingRoomType.maxChildren ?? 0;
            const rawTotBase = existingRoomType.totalBaseOccupancy ?? (rawBaseA + rawBaseC);
            const rawPhysA = existingRoomType.maxPhysicalAdults ?? 4;
            const rawPhysC = existingRoomType.maxPhysicalChildren ?? 2;
            const rawTotMax = existingRoomType.totalMaxOccupancy ?? (rawPhysA + rawPhysC);

            reset({
                name: existingRoomType.name,
                description: existingRoomType.description || '',
                basePrice: Number(existingRoomType.basePrice),
                originalPrice: existingRoomType.originalPrice ? Number(existingRoomType.originalPrice) : null,
                maxAdults: existingRoomType.maxAdults,
                maxChildren: existingRoomType.maxChildren,
                baseAdults: rawBaseA,
                baseChildren: rawBaseC,
                totalBaseOccupancy: rawTotBase,
                totalMaxOccupancy: rawTotMax,
                baseMaxAdults: existingRoomType.baseMaxAdults ?? undefined,
                baseMaxChildren: existingRoomType.baseMaxChildren ?? undefined,
                maxPhysicalAdults: rawPhysA,
                maxPhysicalChildren: rawPhysC,
                maxPhysicalInfants: existingRoomType.maxPhysicalInfants ?? 1,
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
                isGstInclusive: existingRoomType.isGstInclusive || false,
                allowPayAtProperty: existingRoomType.allowPayAtProperty || false,
                size: existingRoomType.size || undefined,
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
    const watchedBaseAdultsVal = watch('baseAdults');
    const watchedBaseChildrenVal = watch('baseChildren');
    const watchedTotalBaseVal = watch('totalBaseOccupancy');
    const watchedTotalMaxVal = watch('totalMaxOccupancy');
    const watchedMaxPhysicalAdultsVal = watch('maxPhysicalAdults');
    const watchedMaxPhysicalChildrenVal = watch('maxPhysicalChildren');
    const watchedMaxPhysicalInfantsVal = watch('maxPhysicalInfants');

    const watchedBaseAdults = watchedBaseAdultsVal !== undefined && watchedBaseAdultsVal !== null && watchedBaseAdultsVal !== '' && !isNaN(Number(watchedBaseAdultsVal)) ? Math.max(1, Number(watchedBaseAdultsVal)) : 2;
    const watchedBaseChildren = watchedBaseChildrenVal !== undefined && watchedBaseChildrenVal !== null && watchedBaseChildrenVal !== '' && !isNaN(Number(watchedBaseChildrenVal)) ? Math.max(0, Number(watchedBaseChildrenVal)) : 0;
    const watchedTotalBase = watchedTotalBaseVal !== undefined && watchedTotalBaseVal !== null && watchedTotalBaseVal !== '' && !isNaN(Number(watchedTotalBaseVal)) ? Math.max(1, Number(watchedTotalBaseVal)) : (watchedBaseAdults + watchedBaseChildren);
    const watchedMaxPhysicalAdults = watchedMaxPhysicalAdultsVal !== undefined && watchedMaxPhysicalAdultsVal !== null && watchedMaxPhysicalAdultsVal !== '' && !isNaN(Number(watchedMaxPhysicalAdultsVal)) ? Math.max(1, Number(watchedMaxPhysicalAdultsVal)) : watchedBaseAdults;
    const watchedMaxPhysicalChildren = watchedMaxPhysicalChildrenVal !== undefined && watchedMaxPhysicalChildrenVal !== null && watchedMaxPhysicalChildrenVal !== '' && !isNaN(Number(watchedMaxPhysicalChildrenVal)) ? Math.max(0, Number(watchedMaxPhysicalChildrenVal)) : watchedBaseChildren;
    const watchedTotalMax = watchedTotalMaxVal !== undefined && watchedTotalMaxVal !== null && watchedTotalMaxVal !== '' && !isNaN(Number(watchedTotalMaxVal)) ? Math.max(1, Number(watchedTotalMaxVal)) : (watchedMaxPhysicalAdults + watchedMaxPhysicalChildren);
    const watchedMaxPhysicalInfants = watchedMaxPhysicalInfantsVal !== undefined && watchedMaxPhysicalInfantsVal !== null && watchedMaxPhysicalInfantsVal !== '' && !isNaN(Number(watchedMaxPhysicalInfantsVal)) ? Math.max(0, Number(watchedMaxPhysicalInfantsVal)) : 1;

    const [debouncedParams, setDebouncedParams] = useState({
        baseAdults: watchedBaseAdults,
        baseChildren: watchedBaseChildren,
        maxPhysicalAdults: watchedMaxPhysicalAdults,
        maxPhysicalChildren: watchedMaxPhysicalChildren,
        maxPhysicalInfants: watchedMaxPhysicalInfants,
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedParams({
                baseAdults: watchedBaseAdults,
                baseChildren: watchedBaseChildren,
                maxPhysicalAdults: watchedMaxPhysicalAdults,
                maxPhysicalChildren: watchedMaxPhysicalChildren,
                maxPhysicalInfants: watchedMaxPhysicalInfants,
            });
        }, 120);
        return () => clearTimeout(timer);
    }, [watchedBaseAdults, watchedBaseChildren, watchedMaxPhysicalAdults, watchedMaxPhysicalChildren, watchedMaxPhysicalInfants]);

    const { data: backendPreview } = useQuery({
        queryKey: ['previewOccupancy', debouncedParams],
        queryFn: () => roomTypesService.previewOccupancy(debouncedParams),
        staleTime: 60 * 1000,
    });

    const baseCompositions = backendPreview?.baseCompositions ?? [];
    const maxPhysicalCompositions = backendPreview?.maxPhysicalCompositions ?? [];

    const saveMutation = useMutation({
        mutationFn: (data: RoomTypeFormData) => {
            const resolvedBaseAdults = data.baseAdults ?? 2;
            const resolvedBaseChildren = data.baseChildren ?? 0;
            const resolvedTotalBase = data.totalBaseOccupancy ?? (resolvedBaseAdults + resolvedBaseChildren);
            const resolvedMaxPhysA = data.maxPhysicalAdults ?? resolvedBaseAdults;
            const resolvedMaxPhysC = data.maxPhysicalChildren ?? resolvedBaseChildren;
            const resolvedTotalMax = data.totalMaxOccupancy ?? (resolvedMaxPhysA + resolvedMaxPhysC);

            const payload = {
                ...data,
                baseAdults: resolvedBaseAdults,
                baseChildren: resolvedBaseChildren,
                totalBaseOccupancy: resolvedTotalBase,
                totalMaxOccupancy: resolvedTotalMax,
                baseMaxAdults: data.baseMaxAdults ? Number(data.baseMaxAdults) : null,
                baseMaxChildren: data.baseMaxChildren ? Number(data.baseMaxChildren) : null,
                maxPhysicalAdults: resolvedMaxPhysA,
                maxPhysicalChildren: resolvedMaxPhysC,
                maxPhysicalInfants: data.maxPhysicalInfants ?? 1,
                extraAdultPrice: data.extraAdultPrice ?? 0,
                extraChildPrice: data.extraChildPrice ?? 0,
                maxAdults: resolvedMaxPhysA,
                maxChildren: resolvedMaxPhysC,
                freeChildrenCount: data.freeChildrenCount ?? 0,
                groupMaxOccupancy: data.groupMaxOccupancy !== undefined ? data.groupMaxOccupancy : (isEdit ? existingRoomType?.groupMaxOccupancy : undefined),
                originalPrice: (data.originalPrice === null || data.originalPrice === undefined) ? null : Number(data.originalPrice),
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

    const onSubmit = (data: any) => saveMutation.mutate(data);

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
                    <p className="text-sm text-gray-500 font-medium">Define room features, pricing, and canonical V2 occupancy rules</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 space-y-8">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-4">
                        <div className="w-1 h-6 bg-primary-600 rounded-full"></div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">General Information</h2>
                    </div>

                    <input type="hidden" {...register('propertyId')} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Room Type Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('name')}
                                placeholder="e.g. Deluxe Suite"
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-bold placeholder:text-gray-400`}
                            />
                            {errors.name?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.name.message)}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Base Price / Night (₹) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                {...register('basePrice', { valueAsNumber: true })}
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.basePrice ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-black`}
                            />
                            {errors.basePrice?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.basePrice.message)}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                Market Price (Static Strikethrough) (₹)
                                <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                            </label>
                            <input
                                type="number"
                                {...register('originalPrice')}
                                placeholder="e.g. 5000 (Optional)"
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.originalPrice ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:text-gray-400`}
                            />
                            {errors.originalPrice?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.originalPrice.message)}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Description <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                {...register('description')}
                                rows={3}
                                placeholder="Describe the room experience..."
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.description ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all min-h-[100px]`}
                            />
                            {errors.description?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.description.message)}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                                Room Size (sq.ft)
                                <Info className="h-3.5 w-3.5 text-gray-400" />
                            </label>
                            <input
                                type="number"
                                {...register('size', { valueAsNumber: true })}
                                placeholder="e.g. 280"
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.size ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold placeholder:text-gray-400`}
                            />
                            {errors.size?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.size.message)}</p>}
                        </div>

                        {/* ========================================================================= */}
                        {/* OCCUPANCY CONFIGURATION (CANONICAL V2)                                      */}
                        {/* ========================================================================= */}

                        {/* CARD 1: PHYSICAL CAPACITY (Hard Room Limits) */}
                        <div className="md:col-span-2 p-5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                                <div className="flex items-center gap-2">
                                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">1. Physical Capacity (Hard Limits)</h4>
                                        <p className="text-[11px] text-slate-500 font-medium">Absolute maximum physical guest capacity (including extra beds, mattresses, and cots).</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                    Physical Limit
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Max Physical Adults <span className="text-red-500">*</span></span>
                                        <span className="text-[10px] text-slate-400 font-normal">Min 1</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register('maxPhysicalAdults', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Maximum adults physically allowed in this RoomType.</p>
                                    {errors.maxPhysicalAdults?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.maxPhysicalAdults.message)}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Max Physical Children</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Age 2-12</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('maxPhysicalChildren', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Maximum children physically allowed in this RoomType.</p>
                                    {errors.maxPhysicalChildren?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.maxPhysicalChildren.message)}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Total Max Occupancy <span className="text-red-500">*</span></span>
                                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">A + C Cap</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register('totalMaxOccupancy', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Maximum physical number of adults + children combined.</p>
                                    {errors.totalMaxOccupancy?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.totalMaxOccupancy.message)}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                                        <Baby className="h-3.5 w-3.5 text-pink-500" />
                                        <span>Max Infants (0-2y)</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('maxPhysicalInfants', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Infants in cots (always ₹0, do not consume A+C occupancy).</p>
                                    {errors.maxPhysicalInfants?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.maxPhysicalInfants.message)}</p>}
                                </div>
                            </div>

                            {/* Live Physical Composition Preview */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                                        Physical Combinations Preview
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                                        Max Cap: {watchedMaxPhysicalAdults}A + {watchedMaxPhysicalChildren}C (Total: {watchedTotalMax})
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {maxPhysicalCompositions.map((comp) => (
                                        <span
                                            key={`max-${comp.adults}-${comp.children}`}
                                            className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
                                        >
                                            {comp.label}
                                        </span>
                                    ))}
                                </div>
                                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                    <Baby className="h-3.5 w-3.5 text-pink-500" />
                                    <span>+ Up to <strong className="text-slate-900 dark:text-white font-bold">{watchedMaxPhysicalInfants} Infant(s)</strong> (0-2 yrs, Free in cots)</span>
                                </div>
                            </div>
                        </div>

                        {/* CARD 2: BASE RATE OCCUPANCY (Pricing Inclusion) */}
                        <div className="md:col-span-2 p-5 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/60 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-emerald-200/60 dark:border-emerald-900/60 pb-3">
                                <div className="flex items-center gap-2">
                                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-200">2. Base Rate Occupancy (Included in Base Price)</h4>
                                        <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">Number of adults + children included in standard room rate without extra person charges.</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                    Included in Base Rate
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Total Base Occupancy <span className="text-red-500">*</span></span>
                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">Base Cap</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        {...register('totalBaseOccupancy', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Number of adults + children included in the base room price.</p>
                                    {errors.totalBaseOccupancy?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.totalBaseOccupancy.message)}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Base Max Adults</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="None (Up to Base Cap)"
                                        {...register('baseMaxAdults', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm placeholder:text-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Optional pricing restriction. Adults above this count incur extra adult charge.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Base Max Children</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Optional</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="None (Up to Base Cap)"
                                        {...register('baseMaxChildren', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm placeholder:text-slate-400"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Optional pricing restriction. Children above this count incur extra child charge.</p>
                                </div>
                            </div>

                            {/* Base Rate Validation Warnings */}
                            {watchedTotalMax < watchedTotalBase && (
                                <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2 text-red-800 dark:text-red-200 text-xs font-bold">
                                    <Info className="h-4 w-4 shrink-0 text-red-500" />
                                    <span>Configuration Error: Total Max Occupancy ({watchedTotalMax}) cannot be less than Total Base Occupancy ({watchedTotalBase}).</span>
                                </div>
                            )}

                            {watchedTotalBase > watchedMaxPhysicalAdults && (
                                <div className="p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-2 text-amber-800 dark:text-amber-200 text-xs font-semibold">
                                    <Info className="h-4 w-4 shrink-0 text-amber-500" />
                                    <span>Channex Sync Notice: Total Base Occupancy ({watchedTotalBase}) exceeds Max Physical Adults ({watchedMaxPhysicalAdults}). Channex requires base occupancy ≤ adult physical occupancy for OTA channels.</span>
                                </div>
                            )}

                            {/* Live Base Rate Composition Preview */}
                            <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-900/60 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                                        <Check className="h-3.5 w-3.5" />
                                        Base Rate Included Compositions Preview
                                    </span>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                        Base Cap: {watchedTotalBase} Guests Included
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-1.5 pt-0.5">
                                    {baseCompositions.map((comp) => (
                                        <span
                                            key={`base-${comp.adults}-${comp.children}`}
                                            className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-100/80 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                                        >
                                            {comp.label}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CARD 3: CHILD & EXTRA GUEST PRICING */}
                        <div className="md:col-span-2 p-5 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-200/70 dark:border-amber-900/50 space-y-4 shadow-sm">
                            <div className="flex items-center justify-between border-b border-amber-200/60 dark:border-amber-900/50 pb-3">
                                <div className="flex items-center gap-2">
                                    <Tag className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                    <div>
                                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-900 dark:text-amber-200">3. Child & Extra Guest Pricing</h4>
                                        <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80 font-medium">Extra guest charges for adults/children beyond base rate occupancy or free allowance.</p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    Extra Guest Rates
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Free Children Count</span>
                                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">Waived Charge</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('freeChildrenCount', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Number of children aged 2–12 whose child charge is waived.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Extra Adult Price (₹)</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Per Night</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('extraAdultPrice', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Charge per adult exceeding base rate capacity.</p>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                                        <span>Extra Child Price (₹)</span>
                                        <span className="text-[10px] text-slate-400 font-normal">Per Night</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        {...register('extraChildPrice', { setValueAs: (v) => (v === '' || v === null || isNaN(v) ? undefined : Number(v)) })}
                                        className="w-full px-3.5 py-2 bg-white dark:bg-slate-950 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold text-sm shadow-sm"
                                    />
                                    <p className="text-[10px] text-slate-500 mt-1">Charge per child exceeding base capacity and free allowance.</p>
                                </div>
                            </div>
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

                                <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-700 pt-4 md:pt-0 md:pl-8">
                                    <label className="inline-flex items-center cursor-pointer group">
                                        <input type="checkbox" {...register('allowPayAtProperty')} className="sr-only peer" />
                                        <div className="relative w-11 h-6 bg-red-500 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        <div className="ml-3">
                                            <span className="block text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-primary-600 transition-colors">Pay at Property</span>
                                            <span className="block text-[10px] text-gray-500 font-medium">Allow guests to book without upfront payment</span>
                                        </div>
                                    </label>
                                </div>

                                {watch('isAvailableForGroupBooking') && (
                                    <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-left-2 duration-200 pt-4 border-t border-gray-100 dark:border-gray-700">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-primary-600 flex items-center gap-2">
                                            Single Room Capacity (Auto-calculated)
                                        </label>
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 rounded-xl flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Users className="h-4 w-4 text-emerald-600" />
                                                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                                                    {(Number(watch('maxPhysicalAdults') || watch('maxAdults') || 2)) + (Number(watch('maxPhysicalChildren') || watch('maxChildren') || 0))} Guests / Room
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                                                ({watch('maxPhysicalAdults') || watch('maxAdults') || 2} Max Physical Adults + {watch('maxPhysicalChildren') || watch('maxChildren') || 0} Max Physical Children)
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium italic">
                                            Total group capacity for this room type will automatically multiply across all active rooms created under it.
                                        </p>
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
                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Cancellation Policy (Text Override) <span className="text-red-500">*</span>
                            </label>
                            <input
                                {...register('cancellationPolicy')}
                                placeholder="e.g. Free cancellation until 24 hours before check-in"
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.cancellationPolicyId ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-gray-400 font-medium`}
                            />
                            <p className="mt-1 text-[10px] text-gray-500 font-medium italic">Type a custom policy if not selecting from the list.</p>
                        </div>

                        <div className="md:col-span-1">
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                    Select Cancellation Policy <span className="text-red-500">*</span>
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsPolicyModalOpen(true)}
                                    className="text-[10px] cursor-pointer font-black uppercase text-primary-600 hover:underline"
                                >
                                    Manage Policies
                                </button>
                            </div>
                            <select
                                {...register('cancellationPolicyId')}
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border ${errors.cancellationPolicyId ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'} rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold`}
                            >
                                {policies.length > 0 ? (
                                    <>
                                        <option value="">
                                            {policies.find(p => p.isDefault) 
                                                ? `Use Property Default (${policies.find(p => p.isDefault)?.name})` 
                                                : 'Use Property Default'}
                                        </option>
                                        {policies.map(p => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} {p.isDefault ? '(Default)' : ''}
                                            </option>
                                        ))}
                                    </>
                                ) : (
                                    <option value="">No Policies Defined - Use Text Override</option>
                                )}
                            </select>
                            {errors.cancellationPolicyId?.message && <p className="text-red-500 text-xs mt-1 font-bold">{String(errors.cancellationPolicyId.message)}</p>}
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
                                const isSelected = section.fields.some(f => (f as any).value === item);
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
                                {section.fields.filter(f => !section.common.includes((f as any).value)).map((field) => {
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
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Room Type Images <span className="text-red-500">*</span>
                        </h2>
                    </div>
                    <ImageUpload images={images || []} onChange={(imgs) => setValue('images', imgs)} maxImages={10} allowCoverSelect />
                    {errors.images?.message && <p className="text-red-500 text-xs font-bold">{String(errors.images.message)}</p>}
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

            {selectedProperty?.id && (
                <CancellationPolicyModal
                    isOpen={isPolicyModalOpen}
                    onClose={() => setIsPolicyModalOpen(false)}
                    propertyId={selectedProperty.id}
                    onPoliciesChange={() => {
                        queryClient.invalidateQueries({ queryKey: ['cancellationPolicies', selectedProperty.id] });
                    }}
                />
            )}
        </div>
    );
}
