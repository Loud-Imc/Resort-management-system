import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import type { RoomType } from '../../types/room';
import {
    Loader2,
    Plus,
    Edit2,
    Trash2,
    Users,
    Image as ImageIcon
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2 } from 'lucide-react';


import { useProperty } from '../../context/PropertyContext';
import toast from 'react-hot-toast';

export default function RoomTypesList() {
    const { selectedProperty } = useProperty();
    const [searchParams] = useSearchParams();
    const urlPropertyId = searchParams.get('propertyId');
    const propertyId = selectedProperty?.id || urlPropertyId;
    const queryClient = useQueryClient();

    const { data: roomTypes, isLoading } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', propertyId],
        queryFn: () => roomTypesService.getAllAdmin({ propertyId: propertyId || undefined }),
    });

    const deleteMutation = useMutation({
        mutationFn: roomTypesService.delete,
        onSuccess: () => {
            toast.success('Room type deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete room type');
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this room type? This action cannot be undone.')) {
            deleteMutation.mutate(id);
        }
    };

    if (isLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Room Types</h1>
                    <p className="text-sm text-gray-500 mt-1">Manage room categories, pricing, and amenities</p>
                </div>
                <Link
                    to="/room-types/create"
                    className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                    <Plus className="h-4 w-4" />
                    Add Room Type
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roomTypes?.map((type) => (
                    <div key={type.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full">
                        {type.images && type.images.length > 0 ? (
                            <img
                                src={type.images[0]}
                                alt={type.name}
                                className="w-full h-48 object-cover"
                            />
                        ) : (
                            <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400">
                                <ImageIcon className="h-12 w-12" />
                            </div>
                        )}

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-gray-900">{type.name}</h3>
                                <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded-full">
                                    ${type.basePrice}
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">
                                {type.description || 'No description provided.'}
                            </p>

                            <div className="space-y-2 mb-4 text-sm text-gray-500">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>Max {type.maxAdults} Adults, {type.maxChildren} Children</span>
                                </div>
                                {!propertyId && type.property && (
                                    <div className="flex items-center gap-2 text-xs text-primary-600 font-medium">
                                        <Building2 className="h-3 w-3" />
                                        <span>{type.property.name}</span>
                                    </div>
                                )}
                                {type.amenities && type.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {type.amenities.slice(0, 3).map((amenity, idx) => (
                                            <span key={idx} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                                {amenity}
                                            </span>
                                        ))}
                                        {type.amenities.length > 3 && (
                                            <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                                +{type.amenities.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-auto">
                                <Link
                                    to={`/room-types/edit/${type.id}`}
                                    className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                                    title="Edit"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(type.id)}
                                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {roomTypes?.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        No room types found. Create one to get started.
                    </div>
                )}
            </div>
        </div>
    );
}
