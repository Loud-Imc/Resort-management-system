import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingSourcesService, type UpdateBookingSourceDto } from '../../services/bookingSources';
import { Loader2, Plus, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
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
                                <td className="px-6 py-4 font-medium text-foreground">{source.name}</td>
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
    const { register, handleSubmit } = useForm({
        defaultValues: initialData || { isActive: true },
    });

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
