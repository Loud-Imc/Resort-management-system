import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import { discountService, Offer } from '../../services/discounts';
import { useProperty } from '../../context/PropertyContext';
import { Loader2, ArrowLeft, Save, Plus, X, Trash2, Edit2 } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { Check } from 'lucide-react';

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
    marketingBadgeText: z.string().optional(),
    marketingBadgeType: z.string().optional(),
    images: z.array(z.string()),
});

type RoomTypeFormData = z.infer<typeof roomTypeSchema>;

export default function CreateRoomType() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();
    const isEditMode = !!id;
    const propertyIdFromUrl = searchParams.get('propertyId');


    const { data: existingType, isLoading: loadingType } = useQuery({
        queryKey: ['roomType', id],
        queryFn: () => roomTypesService.getById(id!),
        enabled: isEditMode,
    });

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<RoomTypeFormData>({
        resolver: zodResolver(roomTypeSchema),
        defaultValues: {
            isPubliclyVisible: true,
            basePrice: 0,
            maxAdults: 2,
            maxChildren: 0,
            extraAdultPrice: 0,
            extraChildPrice: 0,
            freeChildrenCount: 0,
            amenities: [],
            highlights: [],
            inclusions: [],
            cancellationPolicy: '',
            marketingBadgeText: '',
            marketingBadgeType: 'POSITIVE',
            images: [],
            propertyId: propertyIdFromUrl || selectedProperty?.id || '',
        },
    });

    const { fields: highlightsFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
        control,
        name: 'highlights',
    });

    const { fields: inclusionsFields, append: appendInclusion, remove: removeInclusion } = useFieldArray({
        control,
        name: 'inclusions',
    });

    const { fields: amenitiesFields, append: appendAmenity, remove: removeAmenity } = useFieldArray({
        control,
        name: 'amenities',
    });

    useEffect(() => {
        if (existingType) {
            setValue('name', existingType.name);
            setValue('description', existingType.description || '');
            setValue('basePrice', Number(existingType.basePrice));
            setValue('maxAdults', existingType.maxAdults);
            setValue('maxChildren', existingType.maxChildren);
            setValue('isPubliclyVisible', existingType.isPubliclyVisible);
            setValue('extraAdultPrice', Number(existingType.extraAdultPrice));
            setValue('extraChildPrice', Number(existingType.extraChildPrice));
            setValue('freeChildrenCount', existingType.freeChildrenCount);
            setValue('propertyId', existingType.propertyId);
            setValue('amenities', (existingType.amenities || []).map(a => ({ value: a })));
            setValue('highlights', (existingType.highlights || []).map(h => ({ value: h })));
            setValue('inclusions', (existingType.inclusions || []).map(i => ({ value: i })));
            setValue('cancellationPolicy', existingType.cancellationPolicy || '');
            setValue('marketingBadgeText', existingType.marketingBadgeText || '');
            setValue('marketingBadgeType', existingType.marketingBadgeType || 'POSITIVE');
            setValue('images', existingType.images || []);
        }
    }, [existingType, setValue]);

    const mutation = useMutation({
        mutationFn: (data: RoomTypeFormData) => {
            const submitData = {
                ...data,
                amenities: data.amenities.map(a => a.value),
                highlights: data.highlights.map(h => h.value),
                inclusions: data.inclusions.map(i => i.value),
            };
            if (isEditMode) {
                return roomTypesService.update(id!, submitData as any);
            }
            return roomTypesService.create(submitData as any);
        },
        onSuccess: () => {
            toast.success(`Room type ${isEditMode ? 'updated' : 'created'} successfully`);
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            navigate('/room-types');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save room type');
        },
    });

    const onSubmit = (data: RoomTypeFormData) => {
        mutation.mutate(data);
    };

    // --- OFFERS MANAGEMENT ---
    const [offers, setOffers] = useState<Offer[]>([]);
    const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
    const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
    const [offerFormData, setOfferFormData] = useState<Partial<Offer>>({
        name: '',
        discountPercentage: 0,
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        isActive: true
    });

    useEffect(() => {
        if (isEditMode) {
            loadOffers();
        }
    }, [isEditMode, id]);

    const loadOffers = async () => {
        try {
            const allOffers = await discountService.getOffers();
            setOffers(allOffers.filter(o => o.roomTypeId === id));
        } catch (error) {
            console.error('Failed to load offers', error);
        }
    };

    const handleSaveOffer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingOffer) {
                await discountService.updateOffer(editingOffer.id, offerFormData);
            } else {
                await discountService.createOffer({ ...offerFormData, roomTypeId: id });
            }
            setIsOfferModalOpen(false);
            loadOffers();
            toast.success('Offer saved successfully');
        } catch (error) {
            toast.error('Failed to save offer');
        }
    };

    const handleDeleteOffer = async (offerId: string) => {
        if (window.confirm('Are you sure you want to delete this offer?')) {
            try {
                await discountService.deleteOffer(offerId);
                loadOffers();
                toast.success('Offer deleted');
            } catch (error) {
                toast.error('Failed to delete offer');
            }
        }
    };

    const toggleItem = (value: string, fields: any[], append: Function, remove: Function) => {
        const index = fields.findIndex(f => f.value === value);
        if (index > -1) {
            remove(index);
        } else {
            append({ value });
        }
    };

    if (loadingType) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }



    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/room-types')}
                    className="p-2 hover:bg-muted rounded-lg transition-colors border border-border bg-card shadow-sm"
                >
                    <ArrowLeft className="h-5 w-5 text-card-foreground" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {isEditMode ? 'Edit Room Type' : 'Add New Room Type'}
                    </h1>
                    <p className="text-sm text-muted-foreground font-medium">Define room features, pricing, and availability</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 pb-12">
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-8">
                    <div className="flex items-center gap-2 border-b border-border pb-4">
                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                        <h2 className="text-lg font-bold text-card-foreground">General Information</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Room Type Name</label>
                            <input
                                {...register('name')}
                                placeholder="e.g. Deluxe Suite"
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                            />
                            {errors.name && <p className="text-destructive text-xs mt-1 font-bold">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Base Price / Night (₹)</label>
                            <input
                                type="number"
                                {...register('basePrice', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-black"
                            />
                            {errors.basePrice && <p className="text-destructive text-xs mt-1 font-bold">{errors.basePrice.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Description</label>
                            <textarea
                                {...register('description')}
                                rows={3}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all min-h-[100px]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Max Adults</label>
                            <input
                                type="number"
                                {...register('maxAdults', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Max Children</label>
                            <input
                                type="number"
                                {...register('maxChildren', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Extra Adult Price (₹)</label>
                            <input
                                type="number"
                                {...register('extraAdultPrice', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Extra Child Price (₹)</label>
                            <input
                                type="number"
                                {...register('extraChildPrice', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Free Children Count</label>
                            <input
                                type="number"
                                {...register('freeChildrenCount', { valueAsNumber: true })}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all"
                            />
                        </div>

                        <div className="flex items-center md:pt-4">
                            <label className="relative inline-flex items-center cursor-pointer group">
                                <input
                                    type="checkbox"
                                    {...register('isPubliclyVisible')}
                                    id="isPubliclyVisible"
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                <span className="ml-3 text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">Publicly Visible</span>
                            </label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-bold text-muted-foreground mb-1">Cancellation Policy</label>
                            <input
                                {...register('cancellationPolicy')}
                                placeholder="e.g. Free cancellation until 24 hours before check-in"
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                            />
                        </div>

                        {/* Marketing Badge Section */}
                        <div className="md:col-span-1 border-t border-border pt-6">
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Marketing Badge Text</label>
                            <input
                                {...register('marketingBadgeText')}
                                placeholder="e.g. Selling Fast, Early Bird Offer"
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                            />
                            <p className="mt-1 text-[10px] text-muted-foreground font-medium italic">This text appears as a prominent tag on the room card.</p>
                        </div>

                        <div className="md:col-span-1 border-t border-border pt-6">
                            <label className="block text-[10px] font-black text-primary uppercase tracking-widest mb-2">Badge Style</label>
                            <select
                                {...register('marketingBadgeType')}
                                className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold"
                            >
                                <option value="POSITIVE">Positive (Green/Trust)</option>
                                <option value="URGENT">Urgent (Red/Eye-catching)</option>
                                <option value="NEUTRAL">Neutral (Gray/Subtle)</option>
                            </select>
                            <p className="mt-1 text-[10px] text-muted-foreground font-medium italic">Determines the color profile of the badge.</p>
                        </div>
                    </div>
                </div>

                {/* Highlights Section */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-6 bg-primary rounded-full"></div>
                            <h2 className="text-lg font-bold text-card-foreground">Room Highlights</h2>
                        </div>
                    </div>

                    {/* Predefined Chips */}
                    <div className="flex flex-wrap gap-2">
                        {COMMON_HIGHLIGHTS.map(item => {
                            const isSelected = highlightsFields.some(f => f.value === item);
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => toggleItem(item, highlightsFields, appendHighlight, removeHighlight)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected
                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                        : 'bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/30'
                                        }`}
                                >
                                    {isSelected && <Check className="h-3 w-3" />}
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-dashed border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Custom Highlights</h3>
                            <button
                                type="button"
                                onClick={() => appendHighlight({ value: '' })}
                                className="text-primary hover:text-primary/80 text-xs font-black uppercase tracking-widest flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus className="h-3 w-3" /> Add More
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {highlightsFields.filter(f => !COMMON_HIGHLIGHTS.includes(f.value)).map((field) => {
                                // Find the actual index in the full list for react-hook-form
                                const realIndex = highlightsFields.findIndex(f => f.id === field.id);
                                return (
                                    <div key={field.id} className="flex gap-2 group">
                                        <input
                                            {...register(`highlights.${realIndex}.value`)}
                                            placeholder="e.g. Mountain View"
                                            className="flex-1 px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeHighlight(realIndex)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Inclusions Section */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-6 bg-primary rounded-full"></div>
                            <h2 className="text-lg font-bold text-card-foreground">What's Included</h2>
                        </div>
                    </div>

                    {/* Predefined Chips */}
                    <div className="flex flex-wrap gap-2">
                        {COMMON_INCLUSIONS.map(item => {
                            const isSelected = inclusionsFields.some(f => f.value === item);
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => toggleItem(item, inclusionsFields, appendInclusion, removeInclusion)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected
                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                        : 'bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/30'
                                        }`}
                                >
                                    {isSelected && <Check className="h-3 w-3" />}
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-dashed border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Custom Inclusions</h3>
                            <button
                                type="button"
                                onClick={() => appendInclusion({ value: '' })}
                                className="text-primary hover:text-primary/80 text-xs font-black uppercase tracking-widest flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus className="h-3 w-3" /> Add More
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {inclusionsFields.filter(f => !COMMON_INCLUSIONS.includes(f.value)).map((field) => {
                                const realIndex = inclusionsFields.findIndex(f => f.id === field.id);
                                return (
                                    <div key={field.id} className="flex gap-2 group">
                                        <input
                                            {...register(`inclusions.${realIndex}.value`)}
                                            placeholder="e.g. Complimentary Breakfast"
                                            className="flex-1 px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeInclusion(realIndex)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Amenities Section */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-6 bg-primary rounded-full"></div>
                            <h2 className="text-lg font-bold text-card-foreground">Amenities</h2>
                        </div>
                    </div>

                    {/* Predefined Chips */}
                    <div className="flex flex-wrap gap-2">
                        {COMMON_AMENITIES.map(item => {
                            const isSelected = amenitiesFields.some(f => f.value === item);
                            return (
                                <button
                                    key={item}
                                    type="button"
                                    onClick={() => toggleItem(item, amenitiesFields, appendAmenity, removeAmenity)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected
                                        ? 'bg-primary/10 border-primary text-primary shadow-sm'
                                        : 'bg-muted/50 border-border text-muted-foreground hover:border-muted-foreground/30'
                                        }`}
                                >
                                    {isSelected && <Check className="h-3 w-3" />}
                                    {item}
                                </button>
                            );
                        })}
                    </div>

                    <div className="pt-4 border-t border-dashed border-border">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Custom Amenities</h3>
                            <button
                                type="button"
                                onClick={() => appendAmenity({ value: '' })}
                                className="text-primary hover:text-primary/80 text-xs font-black uppercase tracking-widest flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus className="h-3 w-3" /> Add More
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {amenitiesFields.filter(f => !COMMON_AMENITIES.includes(f.value)).map((field) => {
                                const realIndex = amenitiesFields.findIndex(f => f.id === field.id);
                                return (
                                    <div key={field.id} className="flex gap-2 group">
                                        <input
                                            {...register(`amenities.${realIndex}.value`)}
                                            placeholder="e.g. Free WiFi"
                                            className="flex-1 px-4 py-2 bg-background text-foreground border border-border rounded-lg focus:ring-2 focus:ring-primary focus:outline-none transition-all placeholder:text-muted-foreground/30 font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeAmenity(realIndex)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                        >
                                            <X className="h-5 w-5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Images Section */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                    <div className="flex items-center gap-2 border-b border-border pb-4">
                        <div className="w-1 h-6 bg-primary rounded-full"></div>
                        <h2 className="text-lg font-bold text-card-foreground">Room Type Images</h2>
                    </div>
                    <ImageUpload
                        images={watch('images') || []}
                        onChange={(urls) => setValue('images', urls)}
                        maxImages={10}
                    />
                </div>

                {/* Active Offers Section (Edit Mode Only) */}
                {isEditMode && (
                    <div className="bg-card rounded-xl shadow-sm border border-border p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                            <div className="flex items-center gap-2">
                                <div className="w-1 h-6 bg-primary rounded-full"></div>
                                <h2 className="text-lg font-bold text-card-foreground">Active Offers / Deals</h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingOffer(null);
                                    setOfferFormData({
                                        name: '',
                                        discountPercentage: 10,
                                        startDate: format(new Date(), 'yyyy-MM-dd'),
                                        endDate: format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
                                        isActive: true
                                    });
                                    setIsOfferModalOpen(true);
                                }}
                                className="text-primary hover:text-primary/80 text-xs font-black uppercase tracking-widest flex items-center gap-1 bg-primary/10 px-3 py-1.5 rounded-lg transition-all"
                            >
                                <Plus className="h-3 w-3" /> Add Offer
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {offers.map((offer) => (
                                <div key={offer.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border group hover:border-primary/50 transition-all">
                                    <div>
                                        <div className="font-bold text-foreground flex items-center gap-2">
                                            {offer.name}
                                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] rounded-full font-black uppercase shadow-sm">
                                                {offer.discountPercentage}% OFF
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground font-medium mt-1">
                                            Valid: {format(new Date(offer.startDate), 'MMM d')} - {format(new Date(offer.endDate), 'MMM d, yyyy')}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingOffer(offer);
                                                setOfferFormData({
                                                    ...offer,
                                                    startDate: format(new Date(offer.startDate), 'yyyy-MM-dd'),
                                                    endDate: format(new Date(offer.endDate), 'yyyy-MM-dd'),
                                                });
                                                setIsOfferModalOpen(true);
                                            }}
                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteOffer(offer.id)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {offers.length === 0 && (
                                <p className="text-sm text-muted-foreground italic text-center py-4 bg-muted/30 rounded-lg border border-dashed border-border">No active offers for this room type. Add a deal to boost bookings!</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Offer Modal */}
                {isOfferModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border animate-in fade-in zoom-in duration-200">
                            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/50">
                                <h3 className="font-bold text-foreground">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
                                <button
                                    type="button"
                                    onClick={() => setIsOfferModalOpen(false)}
                                    className="p-1 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Offer Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-bold placeholder:text-muted-foreground/30"
                                        placeholder="e.g., Summer Special"
                                        value={offerFormData.name}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Discount %</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all font-black"
                                        value={offerFormData.discountPercentage}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, discountPercentage: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-bold [color-scheme:dark]"
                                            value={offerFormData.startDate}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-4 py-2 bg-background text-foreground border border-border rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition-all text-sm font-bold [color-scheme:dark]"
                                            value={offerFormData.endDate}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsOfferModalOpen(false)}
                                        className="flex-1 py-2.5 bg-muted text-muted-foreground font-bold hover:bg-muted/80 rounded-xl transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveOffer}
                                        className="flex-1 py-2.5 bg-primary text-primary-foreground font-bold rounded-xl hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save className="h-4 w-4" /> Save Deal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end items-center gap-4 pt-4 border-t border-border mt-8">
                    <button
                        type="button"
                        onClick={() => navigate('/room-types')}
                        className="px-6 py-2.5 bg-muted text-muted-foreground font-bold hover:bg-muted/80 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || mutation.isPending}
                        className="bg-primary text-primary-foreground px-10 py-2.5 rounded-xl hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-lg shadow-primary/20 disabled:opacity-50 transition-all flex items-center gap-2 font-black uppercase tracking-widest"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        {isEditMode ? 'Update' : 'Create'} Type
                    </button>
                </div>
            </form>
        </div>
    );
}
