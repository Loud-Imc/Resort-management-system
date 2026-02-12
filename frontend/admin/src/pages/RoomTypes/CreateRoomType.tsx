import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import { discountService, Offer } from '../../services/discounts';
import { useProperty } from '../../context/PropertyContext';
import { Loader2, ArrowLeft, Save, Plus, X, Image as ImageIcon, Ticket, Trash2, Edit2 } from 'lucide-react';
import ImageUpload from '../../components/ImageUpload';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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

    if (loadingType) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }



    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <button
                    onClick={() => navigate('/room-types')}
                    className="p-2 hover:bg-gray-100 rounded-full"
                >
                    <ArrowLeft className="h-6 w-6 text-gray-600" />
                </button>
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Room Type' : 'Create Room Type'}
                </h1>
            </div>

            <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 pb-12">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                {...register('name')}
                                placeholder="e.g. Deluxe Suite"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Base Price / Night</label>
                            <input
                                type="number"
                                {...register('basePrice', { valueAsNumber: true })}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            {errors.basePrice && <p className="text-red-500 text-xs mt-1">{errors.basePrice.message}</p>}
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                {...register('description')}
                                rows={3}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

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

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Extra Adult Price</label>
                            <input
                                type="number"
                                {...register('extraAdultPrice', { valueAsNumber: true })}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Extra Child Price</label>
                            <input
                                type="number"
                                {...register('extraChildPrice', { valueAsNumber: true })}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Free Children Count</label>
                            <input
                                type="number"
                                {...register('freeChildrenCount', { valueAsNumber: true })}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        <div className="flex items-center md:pt-6">
                            <input
                                type="checkbox"
                                {...register('isPubliclyVisible')}
                                id="isPubliclyVisible"
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label htmlFor="isPubliclyVisible" className="ml-2 block text-sm text-gray-900">
                                Publicly Visible
                            </label>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation Policy</label>
                            <input
                                {...register('cancellationPolicy')}
                                placeholder="e.g. Free cancellation until 24 hours before check-in"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                        </div>

                        {/* Marketing Badge Section */}
                        <div className="md:col-span-1 border-t border-gray-100 pt-4">
                            <label className="block text-sm font-bold text-primary-600 uppercase tracking-wider mb-2">Marketing Badge Text</label>
                            <input
                                {...register('marketingBadgeText')}
                                placeholder="e.g. Selling Fast, Early Bird Offer"
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            />
                            <p className="mt-1 text-xs text-gray-500 italic">This text appears as a prominent tag on the room card.</p>
                        </div>

                        <div className="md:col-span-1 border-t border-gray-100 pt-4">
                            <label className="block text-sm font-bold text-primary-600 uppercase tracking-wider mb-2">Badge Style</label>
                            <select
                                {...register('marketingBadgeType')}
                                className="w-full border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                            >
                                <option value="POSITIVE">Positive (Green/Trust)</option>
                                <option value="URGENT">Urgent (Red/Eye-catching)</option>
                                <option value="NEUTRAL">Neutral (Gray/Subtle)</option>
                            </select>
                            <p className="mt-1 text-xs text-gray-500 italic">Determines the color profile of the badge.</p>
                        </div>
                    </div>
                </div>

                {/* Highlights Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Room Highlights</h2>
                        <button
                            type="button"
                            onClick={() => appendHighlight({ value: '' })}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" /> Add Highlight
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {highlightsFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                                <input
                                    {...register(`highlights.${index}.value`)}
                                    placeholder="e.g. Mountain View"
                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeHighlight(index)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {highlightsFields.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-2">No highlights added. Add highlights like "Ocean View", "Private Pool", etc.</p>
                    )}
                </div>

                {/* Inclusions Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">What's Included</h2>
                        <button
                            type="button"
                            onClick={() => appendInclusion({ value: '' })}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" /> Add Inclusion
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {inclusionsFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                                <input
                                    {...register(`inclusions.${index}.value`)}
                                    placeholder="e.g. Complimentary Breakfast"
                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeInclusion(index)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    {inclusionsFields.length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-2">No inclusions added. Add items like "Free WiFi", "Breakfast included", etc.</p>
                    )}
                </div>

                {/* Amenities Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">Amenities</h2>
                        <button
                            type="button"
                            onClick={() => appendAmenity({ value: '' })}
                            className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                        >
                            <Plus className="h-4 w-4" /> Add Amenity
                        </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {amenitiesFields.map((field, index) => (
                            <div key={field.id} className="flex gap-2">
                                <input
                                    {...register(`amenities.${index}.value`)}
                                    placeholder="e.g. Free WiFi"
                                    className="flex-1 border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAmenity(index)}
                                    className="p-2 text-gray-400 hover:text-red-500"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Images Section */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <ImageIcon className="h-5 w-5 text-gray-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Room Type Images</h2>
                    </div>
                    <ImageUpload
                        images={watch('images') || []}
                        onChange={(urls) => setValue('images', urls)}
                        maxImages={10}
                    />
                </div>

                {/* Active Offers Section (Edit Mode Only) */}
                {isEditMode && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Ticket className="h-5 w-5 text-primary-600" />
                                <h2 className="text-lg font-semibold text-gray-900">Active Offers / Deals</h2>
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
                                className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center gap-1"
                            >
                                <Plus className="h-4 w-4" /> Add Offer
                            </button>
                        </div>

                        <div className="space-y-3">
                            {offers.map((offer) => (
                                <div key={offer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                                    <div>
                                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                                            {offer.name}
                                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] rounded-full font-bold uppercase">
                                                {offer.discountPercentage}% OFF
                                            </span>
                                        </div>
                                        <div className="text-xs text-gray-500">
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
                                            className="p-1.5 text-gray-400 hover:text-primary-600"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteOffer(offer.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {offers.length === 0 && (
                                <p className="text-sm text-gray-400 italic text-center py-2">No active offers for this room type. Add a deal to boost bookings!</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Offer Modal */}
                {isOfferModalOpen && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <h3 className="font-bold text-gray-900">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
                                <button type="button" onClick={() => setIsOfferModalOpen(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
                            </div>
                            <div className="p-4 space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Offer Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g., Summer Special"
                                        value={offerFormData.name}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Discount %</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                                        value={offerFormData.discountPercentage}
                                        onChange={(e) => setOfferFormData({ ...offerFormData, discountPercentage: Number(e.target.value) })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={offerFormData.startDate}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">End Date</label>
                                        <input
                                            type="date"
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={offerFormData.endDate}
                                            onChange={(e) => setOfferFormData({ ...offerFormData, endDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsOfferModalOpen(false)}
                                        className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-50 rounded-lg"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleSaveOffer}
                                        className="flex-1 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 shadow-md shadow-primary-500/20"
                                    >
                                        Save Deal
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => navigate('/room-types')}
                        className="px-6 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting || mutation.isPending}
                        className="bg-primary-600 text-white px-8 py-2 rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 flex items-center gap-2"
                    >
                        {mutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />}
                        {isEditMode ? 'Update' : 'Create'} Room Type
                    </button>
                </div>
            </form>
        </div>
    );
}
