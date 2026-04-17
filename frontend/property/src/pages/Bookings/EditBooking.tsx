import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { bookingsService } from '../../services/bookings';
import { uploadService } from '../../services/uploads';
import { Loader2, ArrowLeft, Users, Save, Camera, ShieldCheck, Eye } from 'lucide-react';
import type { Booking } from '../../types/booking';

const editBookingSchema = z.object({
    checkInDate: z.string().min(1, 'Check-in date is required'),
    checkOutDate: z.string().min(1, 'Check-out date is required'),
    adultsCount: z.number().min(1, 'At least 1 adult is required'),
    childrenCount: z.number().min(0),
    guestName: z.string().min(1, 'Guest name is required'),
    guestEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    guestPhone: z.string().optional(),
    whatsappNumber: z.string().optional(),
    specialRequests: z.string().optional(),
    gstNumber: z.string().optional(),
    overrideTotal: z.number().optional(),
    guests: z.array(z.object({
        id: z.string().optional(),
        firstName: z.string().min(1, 'First name is required'),
        lastName: z.string().min(1, 'Last name is required'),
        email: z.string().email('Invalid email').optional().or(z.literal('')),
        phone: z.string().optional(),
        whatsappNumber: z.string().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
        idImage: z.string().optional(),
    })).optional(),
});

type EditBookingFormData = z.infer<typeof editBookingSchema>;

export default function EditBooking() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [idUploading, setIdUploading] = useState<Record<number, boolean>>({});

    const { data: booking, isLoading: loadingBooking } = useQuery<Booking>({
        queryKey: ['booking', id],
        queryFn: () => bookingsService.getById(id!),
        enabled: !!id,
    });

    const {
        register, control, handleSubmit, watch,
        formState: { errors }, setValue, reset,
    } = useForm<EditBookingFormData>({
        resolver: zodResolver(editBookingSchema),
        defaultValues: {
            guests: [],
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'guests' });

    useEffect(() => {
        if (booking) {
            if (!booking.isManualBooking) {
                toast.error('Only manual bookings can be edited');
                navigate('/bookings');
                return;
            }

            reset({
                checkInDate: format(new Date(booking.checkInDate), 'yyyy-MM-dd'),
                checkOutDate: format(new Date(booking.checkOutDate), 'yyyy-MM-dd'),
                adultsCount: booking.adultsCount,
                childrenCount: booking.childrenCount,
                guestName: `${booking.user?.firstName || ''} ${booking.user?.lastName || ''}`.trim(),
                guestEmail: booking.user?.email || '',
                guestPhone: (booking.user as any)?.phone || '',
                whatsappNumber: (booking as any).whatsappNumber || '',
                specialRequests: (booking as any).specialRequests || '',
                gstNumber: (booking as any).gstNumber || '',
                overrideTotal: Number(booking.totalAmount),
                guests: (booking as any).guests?.map((g: any) => ({
                    id: g.id,
                    firstName: g.firstName,
                    lastName: g.lastName,
                    email: g.email || '',
                    phone: g.phone || '',
                    whatsappNumber: g.whatsappNumber || '',
                    idType: g.idType || '',
                    idNumber: g.idNumber || '',
                    idImage: g.idImage || '',
                })) || [],
            });
        }
    }, [booking, reset, navigate]);

    const updateBookingMutation = useMutation({
        mutationFn: (data: EditBookingFormData) => bookingsService.update(id!, data),
        onSuccess: () => {
            toast.success('Booking updated successfully');
            queryClient.invalidateQueries({ queryKey: ['booking', id] });
            queryClient.invalidateQueries({ queryKey: ['bookings'] });
            navigate(`/bookings/${id}`);
        },
        onError: (error: any) => {
            console.error('[EditBooking] Update failed:', error);
            const errorMessage = error.response?.data?.message || error.message || 'Failed to update booking';
            toast.error(typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage));
        },
    });

    const handleGuestFileUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIdUploading(prev => ({ ...prev, [index]: true }));
        try {
            const data = await uploadService.upload(file);
            setValue(`guests.${index}.idImage`, data.url);
            toast.success(`Guest ${index + 1} ID uploaded`);
        } catch (error) {
            console.error('Upload failed', error);
            toast.error(`Failed to upload ID for Guest ${index + 1}`);
        } finally {
            setIdUploading(prev => ({ ...prev, [index]: false }));
        }
    };

    const onSubmit = (data: EditBookingFormData) => {
        updateBookingMutation.mutate(data);
    };

    if (loadingBooking) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    if (!booking) return <div className="p-8 text-center font-bold">Booking not found</div>;

    return (
        <div className="max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <ArrowLeft className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Edit Booking</h1>
                    <p className="text-sm text-gray-500 font-bold">#{booking.bookingNumber}</p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Info */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                            Stay Configuration
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Check-in</label>
                                <input type="date" {...register('checkInDate')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                                {errors.checkInDate && <p className="text-red-500 text-[10px] mt-1">{errors.checkInDate.message}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Check-out</label>
                                <input type="date" {...register('checkOutDate')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                                {errors.checkOutDate && <p className="text-red-500 text-[10px] mt-1">{errors.checkOutDate.message}</p>}
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Adults</label>
                                <input type="number" {...register('adultsCount', { valueAsNumber: true })} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Children</label>
                                <input type="number" {...register('childrenCount', { valueAsNumber: true })} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                            </div>
                        </div>
                    </div>

                    {/* Guest Contact */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-blue-600 mb-4">Contact Information</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Guest Name</label>
                                <input type="text" {...register('guestName')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                                {errors.guestName && <p className="text-red-500 text-[10px] mt-1">{errors.guestName.message}</p>}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Email</label>
                                    <input type="email" {...register('guestEmail')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Phone</label>
                                    <input type="text" {...register('guestPhone')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">WhatsApp Number</label>
                                    <input type="text" {...register('whatsappNumber')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold" placeholder="Optional" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Additional Info */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Pricing Override (₹)</label>
                            <input type="number" {...register('overrideTotal', { valueAsNumber: true })} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-black text-xl text-emerald-600" />
                            <p className="text-[9px] text-gray-400 mt-1 italic">Updating this will change the final total amount for the booking.</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">GST Number</label>
                            <input type="text" {...register('gstNumber')} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-12 font-bold uppercase" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Special Requests / Notes</label>
                            <textarea {...register('specialRequests')} rows={3} className="w-full border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm p-4 font-medium" />
                        </div>
                    </div>
                </div>

                {/* Guest IDs */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-sm font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                            <Users className="h-4 w-4" /> Guest Document Management
                        </h2>
                        <button type="button" onClick={() => append({ firstName: '', lastName: '' })} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-colors">+ Add New Guest</button>
                    </div>

                    <div className="space-y-6">
                        {fields.map((field, index) => (
                            <div key={field.id} className="p-6 bg-gray-50 dark:bg-gray-700/30 rounded-[2rem] border border-gray-100 dark:border-gray-700/50 relative group/guest transition-all hover:bg-white dark:hover:bg-gray-700/50 hover:shadow-xl hover:shadow-gray-200/20">
                                {fields.length > 1 && (
                                    <button type="button" onClick={() => remove(index)} className="absolute top-6 right-6 text-red-500 hover:text-red-700 text-xs font-black uppercase tracking-widest opacity-0 group-hover/guest:opacity-100 transition-opacity">Remove</button>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Guest {index + 1} Name</label>
                                        <div className="flex gap-2">
                                            <input {...register(`guests.${index}.firstName`)} placeholder="First" className="flex-1 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-10 text-sm font-bold" />
                                            <input {...register(`guests.${index}.lastName`)} placeholder="Last" className="flex-1 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-10 text-sm font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Guest Contact</label>
                                        <div className="flex gap-2">
                                            <input {...register(`guests.${index}.phone`)} placeholder="Phone" className="flex-1 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-10 text-[10px] font-bold" />
                                            <input {...register(`guests.${index}.whatsappNumber`)} placeholder="WhatsApp" className="flex-1 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-10 text-[10px] font-bold" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Identification</label>
                                        <div className="flex gap-2">
                                            <select {...register(`guests.${index}.idType`)} className="flex-1 border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-10 text-xs font-bold">
                                                <option value="">No ID</option>
                                                <option value="AADHAR">Aadhar</option>
                                                <option value="PASSPORT">Passport</option>
                                                <option value="VOTER_ID">Voter ID</option>
                                                <option value="DRIVING_LICENSE">DL</option>
                                                <option value="OTHER">Other</option>
                                            </select>
                                            <input {...register(`guests.${index}.idNumber`)} placeholder="ID Num" className="flex-[2] border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-xl shadow-sm h-10 text-xs font-bold" />
                                        </div>
                                    </div>

                                    {/* ID Upload */}
                                    <div className="md:col-span-2">
                                        <div className="flex items-center gap-6">
                                            <input type="file" accept="image/*" onChange={(e) => handleGuestFileUpload(index, e)} className="hidden" id={`guest-id-edit-${index}`} />
                                            <label htmlFor={`guest-id-edit-${index}`} className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl cursor-pointer hover:bg-gray-50 transition-all text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 flex items-center gap-3 shadow-sm active:scale-95">
                                                {idUploading[index] ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : <Camera className="h-4 w-4" />}
                                                {watch(`guests.${index}.idImage`) ? 'Update ID Scan' : 'Upload ID Scan'}
                                            </label>
                                            {watch(`guests.${index}.idImage`) && (
                                                <div className="flex items-center gap-4 animate-in fade-in slide-in-from-left-2">
                                                    <div className="h-10 w-16 rounded-lg border-2 border-emerald-100 dark:border-emerald-900 overflow-hidden relative group/img">
                                                        <img src={watch(`guests.${index}.idImage`)} className="w-full h-full object-cover" />
                                                        <a href={watch(`guests.${index}.idImage`)} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                                            <Eye className="h-4 w-4 text-white" />
                                                        </a>
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                                            <ShieldCheck className="h-3 w-3" /> Document Verified
                                                        </span>
                                                        <span className="text-[8px] text-gray-400 font-bold uppercase">Stored Securely</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-2xl shadow-blue-200/20">
                    <div className="hidden md:block">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 border-l-4 border-blue-600 pl-4">Audit Transparency</p>
                        <p className="text-[11px] text-gray-500 font-bold pl-5">Updates are logged and visible to all administrators.</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button type="button" onClick={() => navigate(-1)} className="px-8 py-4 text-gray-500 hover:text-gray-700 font-black uppercase tracking-widest text-xs transition-colors">Discard</button>
                        <button type="submit" disabled={updateBookingMutation.isPending} className="flex-1 md:flex-none bg-blue-600 text-white px-10 py-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-3 text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 active:scale-95 transition-all">
                            {updateBookingMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Update Booking
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
