import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { bookingSourcesService, UpdateBookingSourceDto } from '../../services/bookingSources';
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

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold font-serif text-gray-900">Booking Sources</h1>
                <button
                    onClick={() => { setEditingSource(null); setIsModalOpen(true); }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" /> Add Source
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-500">Name</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-500">Description</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-500">Commission</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-500">Status</th>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-500 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {sources?.map((source) => (
                            <tr key={source.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{source.name}</td>
                                <td className="px-6 py-4 text-gray-600">{source.description || '-'}</td>
                                <td className="px-6 py-4 text-gray-600">
                                    {source.commission ? `${source.commission}%` : '0%'}
                                </td>
                                <td className="px-6 py-4">
                                    {source.isActive ? (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700">
                                            <CheckCircle className="h-3 w-3" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700">
                                            <XCircle className="h-3 w-3" /> Inactive
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => { setEditingSource(source); setIsModalOpen(true); }}
                                            className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(source.id)}
                                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {sources?.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg">{initialData ? 'Edit Source' : 'Add Booking Source'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XCircle className="h-6 w-6" />
                    </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                        <input {...register('name', { required: true })} className="w-full p-2 border border-gray-300 rounded-lg" placeholder="e.g. Booking.com" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea {...register('description')} className="w-full p-2 border border-gray-300 rounded-lg" rows={3} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Commission (%)</label>
                        <input {...register('commission', { valueAsNumber: true })} type="number" step="0.01" className="w-full p-2 border border-gray-300 rounded-lg" />
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" {...register('isActive')} id="isActive" />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
