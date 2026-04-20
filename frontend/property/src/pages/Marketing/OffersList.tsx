import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { discountsService } from '../../services/discounts';
import type { Offer } from '../../services/discounts';
import {
    Loader2,
    Plus,
    Edit2,
    Trash2,
    Tag,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function OffersList() {
    const queryClient = useQueryClient();

    const { data: offers, isLoading } = useQuery<Offer[]>({
        queryKey: ['offers'],
        queryFn: discountsService.getOffers,
    });

    const deleteMutation = useMutation({
        mutationFn: discountsService.deleteOffer,
        onSuccess: () => {
            toast.success('Offer deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['offers'] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete offer');
        },
    });

    const handleDelete = (id: string) => {
        if (confirm('Are you sure you want to delete this offer?')) {
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
                    <h1 className="text-2xl font-bold text-foreground">Offers & Marketing</h1>
                    <p className="text-sm text-muted-foreground mt-1">Schedule discounts and festival deals for your rooms</p>
                </div>
                <Link
                    to="/marketing/offers/create"
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-bold shadow-sm"
                >
                    <Plus className="h-4 w-4" />
                    Create Offer
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {offers?.map((offer) => (
                    <div key={offer.id} className="bg-card rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-full group hover:shadow-md transition-all">
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h3 className="text-lg font-bold text-card-foreground group-hover:text-primary transition-colors">{offer.name}</h3>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-sm ${offer.isActive
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-muted text-muted-foreground'
                                    }`}>
                                    {offer.isActive ? 'Active' : 'Inactive'}
                                </span>
                            </div>

                            <p className="text-muted-foreground text-sm mb-4 line-clamp-2 flex-grow font-medium">
                                {offer.description || 'No description provided.'}
                            </p>

                            <div className="space-y-3 mb-4">
                                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                                    <div className="flex items-center gap-2">
                                        <Tag className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-bold">Discount</span>
                                    </div>
                                    <span className="text-lg font-black text-primary">
                                        {offer.discountType === 'PERCENTAGE'
                                            ? `${offer.discountValue}%`
                                            : `₹${offer.discountValue}`}
                                    </span>
                                </div>

                                <div className="space-y-1.5 text-xs font-bold text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Starts: {format(new Date(offer.startDate), 'PPP')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4" />
                                        <span>Ends: {format(new Date(offer.endDate), 'PPP')}</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                        <span>
                                            Applies to: {offer.roomTypes && offer.roomTypes.length > 0
                                                ? offer.roomTypes.map(rt => rt.name).join(', ')
                                                : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-1 pt-4 border-t border-border mt-auto">
                                <Link
                                    to={`/marketing/offers/edit/${offer.id}`}
                                    className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all"
                                    title="Edit"
                                >
                                    <Edit2 className="h-4 w-4" />
                                </Link>
                                <button
                                    onClick={() => handleDelete(offer.id)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {offers?.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-card rounded-xl border-2 border-dashed border-border group hover:border-primary/50 transition-colors">
                        <Tag className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
                        <p className="text-muted-foreground font-bold">No offers found. Create a festival deal to get started!</p>
                    </div>
                )}
            </div>
        </div>
    );
}
