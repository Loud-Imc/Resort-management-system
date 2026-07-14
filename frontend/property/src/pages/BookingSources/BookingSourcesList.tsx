import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingSourcesService, type UpdateBookingSourceDto } from '../../services/bookingSources';
import { Loader2, Plus, Edit, Trash2, CheckCircle, XCircle, Globe, Zap, ShieldCheck, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useForm } from 'react-hook-form';

export default function BookingSourcesList() {
    const queryClient = useQueryClient();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSource, setEditingSource] = useState<any>(null);

    const { data: sources, isLoading } = useQuery<any[]>({
        queryKey: ['bookingSources'],
        queryFn: bookingSourcesService.getAll,
    });

    const createMutation = useMutation({
        mutationFn: bookingSourcesService.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookingSources'] });
            setIsModalOpen(false);
            setEditingSource(null);
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: UpdateBookingSourceDto }) => bookingSourcesService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookingSources'] });
            setIsModalOpen(false);
            setEditingSource(null);
        },
    });

    const deleteMutation = useMutation({
        mutationFn: bookingSourcesService.delete,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bookingSources'] });
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this booking source?')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Booking Sources</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage where your bookings come from</p>
                </div>
                <button
                    onClick={() => { setEditingSource(null); setIsModalOpen(true); }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 flex items-center gap-2 font-bold shadow-sm"
                >
                    <Plus className="h-4 w-4" /> Add Source
                </button>
            </div>

            {/* OTA 2-Way Channel Sync Info Banner */}
            <div className="mb-6 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-primary/10 border border-blue-500/20 rounded-2xl p-6 relative overflow-hidden shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-bold text-foreground text-base">Automated OTA Booking Source Tracking</h3>
                                <span className="px-2.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                                    <ShieldCheck className="h-3 w-3" /> Live 2-Way Auto-Link Active
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed max-w-3xl">
                                Whenever a guest books through your connected online travel portals (`MakeMyTrip, Booking.com, Agoda, Airbnb, Goibibo`), your system instantly imports the guest reservation, blocks the exact room on your calendar to prevent double-bookings, and automatically assigns the corresponding Booking Source below for accurate revenue & commission reports.
                            </p>
                            <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-xl">
                                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                                    Dynamic Auto-Creation Engine (`Zero-Code OTA Onboarding`)
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                                    If a hotel property connects a 9th regional or international travel channel (`e.g., Yatra, ClearTrip, TravelGuru`) via your channel manager in the future, <strong className="text-foreground">no code changes are needed</strong>! The exact second that portal sends its first reservation, our backend engine will dynamically identify, create, and track that new travel partner right here inside your Booking Sources automatically!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Why Hotel Owners & GMs Use Booking Sources (Business Benefit Breakdown) */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card/90 border border-border/80 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
                    <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0 mt-0.5">
                        <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground text-sm">Automated Net Profit & Commission Auditing</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Instantly compare high-margin direct & walk-in bookings (`0% commission`) against OTA portals (`18-22% commission`) so owners see exact net payout and commission owed at month-end.
                        </p>
                    </div>
                </div>

                <div className="bg-card/90 border border-border/80 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
                    <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5">
                        <Users className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground text-sm">Offline B2B Travel Agents & Corporate Ties</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Use <strong className="text-foreground">"Add Source"</strong> to register local travel agencies, event planners, or corporate contracts (`e.g. Infosys Corporate @ 10%`) for clean monthly billing and partner tracking.
                        </p>
                    </div>
                </div>

                <div className="bg-card/90 border border-border/80 rounded-2xl p-5 flex items-start gap-3.5 shadow-xs">
                    <div className="p-2.5 bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded-xl shrink-0 mt-0.5">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                        <h4 className="font-bold text-foreground text-sm">Measure Marketing Campaign ROI</h4>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                            Track guest acquisition from Instagram ads, Google promos, or seasonal holiday packages to see exactly which marketing campaigns convert into actual paying reservations.
                        </p>
                    </div>
                </div>
            </div>

            <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-muted/50 border-b border-border">
                        <tr>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase">Name</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase">Description</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase">Commission</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-medium text-muted-foreground uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {sources?.map((source) => (
                            <tr key={source.id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-foreground flex items-center">
                                    <span>{source.name}</span>
                                    {['makemytrip', 'booking.com', 'agoda', 'airbnb', 'expedia', 'goibibo', 'channex', 'ota'].some(ota => source.name.toLowerCase().includes(ota)) && (
                                        <span className="inline-flex items-center gap-1 ml-2.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                                            <Zap className="h-3 w-3" /> 2-Way OTA Sync
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-muted-foreground">{source.description || '-'}</td>
                                <td className="px-6 py-4 text-muted-foreground">
                                    {source.commission ? `${source.commission}%` : '0%'}
                                </td>
                                <td className="px-6 py-4">
                                    {source.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                            <CheckCircle className="h-3 w-3" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-destructive/10 text-destructive">
                                            <XCircle className="h-3 w-3" /> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingSource(source); setIsModalOpen(true); }}
                                            className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(source.id)}
                                            className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sources?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                    No booking sources found. Add one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <BookingSourceModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    initialData={editingSource}
                    onSubmit={(data: any) => {
                        if (editingSource) {
                            updateMutation.mutate({ id: editingSource.id, data });
                        } else {
                            createMutation.mutate(data);
                        }
                    }}
                />
            )}
        </div>
    );
}

interface BookingSourceModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData: any;
    onSubmit: (data: any) => void;
}

function BookingSourceModal({ onClose, initialData, onSubmit }: BookingSourceModalProps) {
    const { register, handleSubmit, reset } = useForm({
        defaultValues: initialData ? {
            name: initialData.name,
            description: initialData.description || '',
            commission: initialData.commission ? Number(initialData.commission) : 0,
            isActive: initialData.isActive,
        } : { isActive: true, commission: 0 },
    });

    useEffect(() => {
        if (initialData) {
            reset({
                name: initialData.name,
                description: initialData.description || '',
                commission: initialData.commission ? Number(initialData.commission) : 0,
                isActive: initialData.isActive,
            });
        }
    }, [initialData, reset]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-border">
                <div className="px-6 py-4 border-b border-border flex justify-between items-center">
                    <h3 className="font-bold text-lg text-foreground">{initialData ? 'Edit Source' : 'Add Booking Source'}</h3>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Name</label>
                        <input {...register('name', { required: true })} className="w-full p-2 border border-border bg-background text-foreground rounded-lg" placeholder="e.g. Booking.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Description</label>
                        <textarea {...register('description')} className="w-full p-2 border border-border bg-background text-foreground rounded-lg" rows={3} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Commission (%)</label>
                        <input {...register('commission', { valueAsNumber: true })} type="number" step="0.01" className="w-full p-2 border border-border bg-background text-foreground rounded-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('isActive')} id="isActive" />
                        <label htmlFor="isActive" className="text-sm font-medium text-foreground">Active</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-muted-foreground hover:bg-muted rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-bold">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
