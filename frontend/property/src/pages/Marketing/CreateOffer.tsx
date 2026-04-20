import { useNavigate, useParams } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discountsService } from '../../services/discounts';
import type { CreateOfferDto, Offer } from '../../services/discounts';
import { roomTypesService } from '../../services/roomTypes';
import { useProperty } from '../../context/PropertyContext';
import { Loader2, ArrowLeft, Save, Tag, Calendar, Info } from 'lucide-react';
import { useEffect } from 'react';
import toast from 'react-hot-toast';

const offerSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    description: z.string().optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: z.number().min(0, 'Value must be positive'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    roomTypeIds: z.array(z.string()).min(1, 'Select at least one room type'),
    isActive: z.boolean(),
}).refine(data => {
    return new Date(data.endDate) >= new Date(data.startDate);
}, {
    message: "End date must be after start date",
    path: ["endDate"]
});

type OfferFormData = z.infer<typeof offerSchema>;

export default function CreateOffer() {
    const navigate = useNavigate();
    const { id } = useParams();
    const queryClient = useQueryClient();
    const { selectedProperty } = useProperty();
    const isEdit = !!id;

    const { data: existingOffer, isLoading: loadingExisting } = useQuery<Offer>({
        queryKey: ['offer', id],
        queryFn: () => discountsService.getOffer(id!),
        enabled: !!id,
    });

    const { data: roomTypes } = useQuery({
        queryKey: ['roomTypes', selectedProperty?.id],
        queryFn: () => roomTypesService.getAllAdmin({ propertyId: selectedProperty?.id || undefined }),
        enabled: !!selectedProperty?.id,
    });

    const {
        register, handleSubmit, setValue, watch,
        formState: { errors, isSubmitting }, reset,
    } = useForm<OfferFormData>({
        resolver: zodResolver(offerSchema),
        defaultValues: {
            isActive: true,
            discountType: 'PERCENTAGE',
            discountValue: 0,
            startDate: new Date().toISOString().split('T')[0],
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            roomTypeIds: [],
        },
    });

    useEffect(() => {
        if (existingOffer) {
            reset({
                ...existingOffer,
                startDate: new Date(existingOffer.startDate).toISOString().split('T')[0],
                endDate: new Date(existingOffer.endDate).toISOString().split('T')[0],
                roomTypeIds: existingOffer.roomTypes?.map(rt => rt.id) || existingOffer.roomTypeIds || [],
            });
        }
    }, [existingOffer, reset]);

    const mutation = useMutation({
        mutationFn: (data: CreateOfferDto) =>
            isEdit ? discountsService.updateOffer(id, data) : discountsService.createOffer(data),
        onSuccess: () => {
            toast.success(isEdit ? 'Offer updated successfully' : 'Offer created successfully');
            queryClient.invalidateQueries({ queryKey: ['offers'] });
            navigate('/marketing/offers');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to save offer');
        },
    });

    const onSubmit: SubmitHandler<OfferFormData> = (data) => {
        mutation.mutate(data as CreateOfferDto);
    };

    if (isEdit && loadingExisting) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const discountType = watch('discountType');

    return (
        <div className="max-w-4xl mx-auto">
            <button
                onClick={() => navigate('/marketing/offers')}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors font-bold"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to Offers
            </button>

            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground uppercase italic">
                        {isEdit ? 'Edit Offer' : 'Create New Offer'}
                    </h1>
                    <p className="text-muted-foreground font-medium mt-1">
                        {isEdit ? 'Update your festival deal details' : 'Set up a new discount for your guests'}
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
                    <div className="p-1 px-6 bg-primary/5 border-b border-border flex items-center gap-2">
                        <Tag className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">Offer Information</span>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-card-foreground ml-1">Offer Name</label>
                                <input
                                    {...register('name')}
                                    className="w-full px-4 py-3 rounded-xl bg-muted border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold placeholder:font-medium"
                                    placeholder="e.g. Festival Special Sale"
                                />
                                {errors.name && <p className="text-xs font-bold text-destructive ml-1">{errors.name.message}</p>}
                            </div>

                            <div className="col-span-full space-y-4">
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-sm font-bold text-card-foreground">Applicable Room Types</label>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const allIds = roomTypes?.map((rt: any) => rt.id) || [];
                                            const current = watch('roomTypeIds');
                                            setValue('roomTypeIds', current.length === allIds.length ? [] : allIds);
                                        }}
                                        className="text-[10px] font-black uppercase text-primary hover:underline"
                                    >
                                        {watch('roomTypeIds').length === (roomTypes?.length || 0) ? 'Deselect All' : 'Select All'}
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {roomTypes?.map((rt: any) => {
                                        const isSelected = watch('roomTypeIds').includes(rt.id);
                                        return (
                                            <label
                                                key={rt.id}
                                                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${isSelected
                                                    ? 'bg-primary/5 border-primary shadow-sm'
                                                    : 'bg-muted border-transparent hover:border-border'
                                                    }`}
                                            >
                                                <div className="relative flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        value={rt.id}
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            const current = watch('roomTypeIds');
                                                            if (e.target.checked) {
                                                                setValue('roomTypeIds', [...current, rt.id]);
                                                            } else {
                                                                setValue('roomTypeIds', current.filter(id => id !== rt.id));
                                                            }
                                                        }}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="h-5 w-5 rounded-md border-2 border-primary/30 peer-checked:bg-primary peer-checked:border-primary transition-all flex items-center justify-center">
                                                        {isSelected && (
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                </div>
                                                <span className={`text-xs font-bold ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                                                    {rt.name}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                                {errors.roomTypeIds && <p className="text-xs font-bold text-destructive ml-1">{errors.roomTypeIds.message}</p>}
                            </div>

                            <div className="col-span-full space-y-2">
                                <label className="text-sm font-bold text-card-foreground ml-1">Description (Optional)</label>
                                <textarea
                                    {...register('description')}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl bg-muted border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold placeholder:font-medium resize-none"
                                    placeholder="Special discount message for guests..."
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-card-foreground ml-1">Discount Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setValue('discountType', 'PERCENTAGE')}
                                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-tighter transition-all border-2 ${discountType === 'PERCENTAGE'
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        Percentage (%)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setValue('discountType', 'FIXED_AMOUNT')}
                                        className={`py-3 rounded-xl font-black text-xs uppercase tracking-tighter transition-all border-2 ${discountType === 'FIXED_AMOUNT'
                                            ? 'bg-primary border-primary text-primary-foreground'
                                            : 'bg-muted border-transparent text-muted-foreground hover:bg-muted/80'
                                            }`}
                                    >
                                        Fixed Amount (₹)
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-card-foreground ml-1">
                                    {discountType === 'PERCENTAGE' ? 'Discount Percentage (%)' : 'Discount Amount (₹)'}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        {...register('discountValue', { valueAsNumber: true })}
                                        className="w-full px-4 py-3 rounded-xl bg-muted border-none focus:ring-2 focus:ring-primary/20 transition-all font-black text-lg"
                                        placeholder="0"
                                    />
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 font-black text-primary/40">
                                        {discountType === 'PERCENTAGE' ? '%' : '₹'}
                                    </div>
                                </div>
                                {errors.discountValue && <p className="text-xs font-bold text-destructive ml-1">{errors.discountValue.message}</p>}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-bold text-card-foreground">Start Date</label>
                                </div>
                                <input
                                    type="date"
                                    {...register('startDate')}
                                    className="w-full px-4 py-3 rounded-xl bg-muted border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                />
                                {errors.startDate && <p className="text-xs font-bold text-destructive ml-1">{errors.startDate.message}</p>}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <label className="text-sm font-bold text-card-foreground">End Date</label>
                                </div>
                                <input
                                    type="date"
                                    {...register('endDate')}
                                    className="w-full px-4 py-3 rounded-xl bg-muted border-none focus:ring-2 focus:ring-primary/20 transition-all font-bold"
                                />
                                {errors.endDate && <p className="text-xs font-bold text-destructive ml-1">{errors.endDate.message}</p>}
                            </div>
                        </div>

                        <div className="flex items-center gap-6 pt-6 border-t border-border">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    {...register('isActive')}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                                <span className="ml-3 text-sm font-bold text-card-foreground uppercase tracking-widest italic">Offer Active</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl flex items-start gap-3">
                    <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-primary">Pro Tip</p>
                        <p className="text-xs font-medium text-primary/80 leading-relaxed">
                            Scheduled offers will automatically strike through the base price on the public portal during the dates you selected. guests will see the "Festival Price" as the main headline rate.
                        </p>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                    <button
                        type="button"
                        onClick={() => navigate('/marketing/offers')}
                        className="px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all bg-card border border-border"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2"
                    >
                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        {isEdit ? 'Update Offer' : 'Create Offer'}
                    </button>
                </div>
            </form>
        </div>
    );
}
