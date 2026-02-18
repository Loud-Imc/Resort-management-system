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
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Room Types</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage room categories, pricing, and amenities</p>
                </div>
                <Link
                    to="/room-types/create"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-bold shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Add Room Type
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roomTypes?.map((type) => (
                    <div key={type.id} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-full group hover:shadow-md transition-all">
                        {type.images && type.images.length > 0 ? (
                            <img
                                src={type.images[0]}
                                alt={type.name}
                                className="w-full h-48 object-cover"
                            />
                        ) : (
                            <div className="w-full h-48 bg-muted flex items-center justify-center text-muted-foreground">
                                <ImageIcon className="h-12 w-12 opacity-20" />
                            </div>
                        )}

                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">{type.name}</h3>
                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                    ₹{type.basePrice}
                                </span>
                            </div>

                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-grow font-medium">
                                {type.description || 'No description provided.'}
                            </p>

                            <div className="space-y-2 mb-4 text-xs font-bold text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <Users className="h-4 w-4" />
                                    <span>Max {type.maxAdults} Adults, {type.maxChildren} Children</span>
                                </div>
                                {!propertyId && type.property && (
                                    <div className="flex items-center gap-2 text-primary">
                                        <Building2 className="h-3 w-3" />
                                        <span>{type.property.name}</span>
                                    </div>
                                )}
                                {type.amenities && type.amenities.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {type.amenities.slice(0, 3).map((amenity, idx) => (
                                            <span key={idx} className="bg-muted text-muted-foreground text-[10px] px-2 py-1 rounded-md font-bold">
                                                {amenity}
                                            </span>
                                        ))}
                                        {type.amenities.length > 3 && (
                                            <span className="bg-muted text-muted-foreground text-[10px] px-2 py-1 rounded-md font-bold">
                                                +{type.amenities.length - 3}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end gap-1 pt-4 border-t border-border mt-auto">
                                <Link
                                    to={`/room-types/edit/${type.id}`}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(type.id)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {roomTypes?.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-card rounded-xl border-2 border-dashed border-border group hover:border-primary/50 transition-colors">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
                        <p className="text-muted-foreground font-bold">No room types found. Create one to get started.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
