import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { roomTypesService } from '../../services/roomTypes';
import type { RoomType } from '../../types/room';
import {
    Loader2,
    Plus,
    Edit2,
    Trash2,
    Users,
    Image as ImageIcon,
    Building2,
    BedDouble,
    Sparkles,
    Utensils,
    Sliders,
    Calendar,
    LayoutGrid
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useProperty } from '../../context/PropertyContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import AddRoomModal from '../../components/Rooms/AddRoomModal';
import OccupancyMigrationModal from '../../components/OccupancyMigrationModal';
import { RatePlansManagerModal } from '../../components/RatePlansManagerModal';
import { BulkPricingRuleModal } from '../../components/BulkPricingRuleModal';
import { PropertyRateMatrix } from './PropertyRateMatrix';

export default function RoomTypesList() {
    const { selectedProperty } = useProperty();
    const propertyId = selectedProperty?.id;
    const queryClient = useQueryClient();
    const [deletingType, setDeletingType] = useState<RoomType | null>(null);
    const [isAddRoomModalOpen, setIsAddRoomModalOpen] = useState(false);
    const [selectedRoomTypeIdForAdd, setSelectedRoomTypeIdForAdd] = useState<string | undefined>(undefined);
    const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);

    // Active View Tab ('list' or 'matrix')
    const [activeTab, setActiveTab] = useState<'list' | 'matrix'>('list');

    // Rate Plans & Bulk Pricing Modal States
    const [ratePlanModalTarget, setRatePlanModalTarget] = useState<RoomType | null>(null);
    const [bulkPricingModalTarget, setBulkPricingModalTarget] = useState<RoomType | null>(null);

    const { data: roomTypes, isLoading } = useQuery<RoomType[]>({
        queryKey: ['roomTypes', propertyId],
        queryFn: () => roomTypesService.getAllAdmin({ propertyId: propertyId || undefined }),
        enabled: !!propertyId,
    });

    const deleteMutation = useMutation({
        mutationFn: roomTypesService.delete,
        onSuccess: () => {
            toast.success('Room type deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
            setDeletingType(null);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete room type');
        },
    });

    const handleDelete = (type: RoomType) => {
        setDeletingType(type);
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
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Room Types & Pricing</h1>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage room categories, EP/CP/MAP/AP meal plans, and monthly rates</p>
                </div>

                {/* Center: View Switcher Tabs */}
                <div className="flex items-center gap-1.5 bg-muted/60 p-1.5 rounded-2xl border border-border/80 shadow-inner">
                    <button
                        onClick={() => setActiveTab('list')}
                        className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'list'
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30 font-black'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-bold'
                        }`}
                    >
                        <LayoutGrid className="h-4 w-4" />
                        Room Types Cards
                    </button>
                    <button
                        onClick={() => setActiveTab('matrix')}
                        className={`px-3.5 py-2 rounded-xl text-xs transition-all flex items-center gap-2 cursor-pointer ${
                            activeTab === 'matrix'
                                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/25 ring-2 ring-primary/30 font-black'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 font-bold'
                        }`}
                    >
                        <Calendar className="h-4 w-4" />
                        📅 Monthly Rate Matrix & All Room Prices
                    </button>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-3">
                    {propertyId && (
                        <button
                            type="button"
                            onClick={() => setIsMigrationModalOpen(true)}
                            className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3.5 py-2 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-2 font-bold shadow-sm text-xs cursor-pointer"
                        >
                            <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            Occupancy Readiness (V2)
                        </button>
                    )}
                    <Link
                        to="/room-types/create"
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 font-bold shadow-sm text-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Add Room Type
                    </Link>
                </div>
            </div>

            {activeTab === 'matrix' ? (
                <PropertyRateMatrix
                    propertyId={propertyId || ''}
                    roomTypes={roomTypes || []}
                    onRefresh={() => queryClient.invalidateQueries({ queryKey: ['roomTypes'] })}
                />
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {roomTypes?.map((type) => {
                    const roomCount = type.rooms?.length ?? type._count?.rooms ?? 0;
                    const isV2Ready = type.occupancyVersion === 'V2' || (type.totalBaseOccupancy !== undefined && type.totalMaxOccupancy !== undefined);
                    const primaryRatePlan = type.ratePlans?.find((p: any) => Boolean(p.isPrimary));
                    const displayPrice = primaryRatePlan ? Number(primaryRatePlan.basePrice) : Number(type.basePrice);
                    const mealPlanBadge = primaryRatePlan ? primaryRatePlan.mealPlan : 'EP';
                    const acBadge = primaryRatePlan?.acType && primaryRatePlan.acType !== 'DEFAULT' ? primaryRatePlan.acType : null;

                    return (
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
                                    <div className="flex flex-col items-end gap-1">
                                        <div className="flex items-center gap-1.5">
                                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-sm">
                                                ₹{displayPrice}
                                            </span>
                                            <span className="bg-primary/10 text-primary text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-primary/20" title={`Primary Rate Plan (${mealPlanBadge})`}>
                                                ⭐ {mealPlanBadge}
                                            </span>
                                        </div>
                                        {acBadge && (
                                            <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200/60">
                                                {acBadge === 'AC' ? '❄️ AC Plan' : '💨 Non-AC Plan'}
                                            </span>
                                        )}
                                        {selectedProperty?.isGstApplicable && type.isGstInclusive && (
                                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">GST Inclusive</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 mb-2">
                                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isV2Ready ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}>
                                        {isV2Ready ? 'V2 Configured' : 'V1 Legacy'}
                                    </span>
                                </div>

                                <p className="text-muted-foreground text-sm mb-3 line-clamp-2 font-medium">
                                    {type.description || 'No description provided.'}
                                </p>

                                <div className="flex items-center gap-2 mb-3">
                                    <Link
                                        to={`/rooms?roomTypeId=${type.id}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-black hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200/60 dark:border-blue-800/40"
                                        title={`Click to view all ${roomCount} rooms of this type`}
                                    >
                                        <BedDouble className="h-3.5 w-3.5" />
                                        <span>{roomCount} {roomCount === 1 ? 'Room' : 'Rooms'}</span>
                                    </Link>
                                    <span className="text-[10px] text-muted-foreground font-semibold">
                                        (click to view rooms)
                                    </span>
                                </div>

                                <div className="space-y-2 mb-4 text-xs font-bold text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-indigo-500" />
                                        <span>Base: {type.totalBaseOccupancy || ((type.baseAdults || 2) + (type.baseChildren || 0))} | Max: {type.totalMaxOccupancy || ((type.maxPhysicalAdults || type.maxAdults || 2) + (type.maxPhysicalChildren || type.maxChildren || 0))} Guests</span>
                                    </div>
                                    <div className="text-[11px] font-medium text-slate-500 pl-6">
                                        Phys: {type.maxPhysicalAdults || type.maxAdults || 2}A + {type.maxPhysicalChildren || type.maxChildren || 0}C (+{type.maxPhysicalInfants ?? 1} Inf)
                                    </div>
                                    {type.isAvailableForGroupBooking && (
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                            <Users className="h-4 w-4" />
                                            <span>In Group Pool (Property Global Price)</span>
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

                                 <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border mt-auto">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedRoomTypeIdForAdd(type.id);
                                                setIsAddRoomModalOpen(true);
                                            }}
                                            className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Room
                                        </button>

                                         <button
                                             type="button"
                                             onClick={() => setRatePlanModalTarget(type)}
                                             className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-600 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                             title="Manage Rate Plans (AC / Non-AC & EP, CP, MAP, AP Meal Plans)"
                                         >
                                             <Utensils className="h-3.5 w-3.5" />
                                             Rate & Meal Plans
                                         </button>

                                        <button
                                            type="button"
                                            onClick={() => setBulkPricingModalTarget(type)}
                                            className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-600 text-emerald-600 hover:text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                                            title="Set Seasonal / Weekend / Festival Pricing Overrides"
                                        >
                                            <Sliders className="h-3.5 w-3.5" />
                                            Date Overrides
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-1 ml-auto">
                                        <Link
                                            to={`/room-types/edit/${type.id}`}
                                            className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted transition-colors"
                                            title="Edit Room Type"
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(type)}
                                            className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted transition-colors"
                                            title="Delete Room Type"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}

                {roomTypes?.length === 0 && (
                    <div className="col-span-full text-center py-20 bg-card rounded-xl border-2 border-dashed border-border group hover:border-primary/50 transition-colors">
                        <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20 group-hover:opacity-40 transition-opacity" />
                        <p className="text-muted-foreground font-bold">No room types found. Create one to get started.</p>
                    </div>
                )}
            </div>
            )}

            {/* Add Room Modal */}
            {isAddRoomModalOpen && (
                <AddRoomModal
                    isOpen={isAddRoomModalOpen}
                    onClose={() => setIsAddRoomModalOpen(false)}
                    propertyId={propertyId || ''}
                    onSuccess={() => {
                        queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
                        queryClient.invalidateQueries({ queryKey: ['rooms'] });
                    }}
                    roomTypes={roomTypes || []}
                    defaultRoomTypeId={selectedRoomTypeIdForAdd}
                />
            )}

            {/* Rate Plans Manager Modal (EP, CP, MAP, AP) */}
            {ratePlanModalTarget && (
                <RatePlansManagerModal
                    isOpen={!!ratePlanModalTarget}
                    onClose={() => {
                        setRatePlanModalTarget(null);
                        queryClient.invalidateQueries({ queryKey: ['roomTypes'] });
                    }}
                    roomTypeId={ratePlanModalTarget.id}
                    roomTypeName={ratePlanModalTarget.name}
                    defaultBasePrice={Number(ratePlanModalTarget.basePrice || 1000)}
                />
            )}

            {/* Bulk Pricing Rule Modal (Weekends vs Weekdays & Festivals) */}
            {bulkPricingModalTarget && (
                <BulkPricingRuleModal
                    isOpen={!!bulkPricingModalTarget}
                    onClose={() => setBulkPricingModalTarget(null)}
                    propertyId={propertyId || ''}
                    roomTypeId={bulkPricingModalTarget.id}
                    roomTypeName={bulkPricingModalTarget.name}
                    roomTypes={roomTypes || []}
                    ratePlans={bulkPricingModalTarget.ratePlans || []}
                    onSuccess={() => queryClient.invalidateQueries({ queryKey: ['roomTypes'] })}
                />
            )}

            {/* Custom Confirm Modal for Room Type Deletion */}
            {(() => {
                const roomCount = deletingType?._count?.rooms || 0;
                const hasRooms = roomCount > 0;
                return (
                    <ConfirmModal
                        isOpen={!!deletingType}
                        onClose={() => setDeletingType(null)}
                        onConfirm={() => deletingType && deleteMutation.mutate(deletingType.id)}
                        isLoading={deleteMutation.isPending}
                        variant={hasRooms ? 'warning' : 'danger'}
                        title={hasRooms ? `Delete ${deletingType?.name || 'Category'}?` : `Permanently Delete ${deletingType?.name || 'Category'}?`}
                        description={
                            hasRooms ? (
                                <span>
                                    <strong className="text-foreground font-bold">{deletingType?.name}</strong> has <strong className="text-amber-500 font-bold">{roomCount} physical room(s)</strong> assigned to it.
                                    <br /><br />
                                    Please delete or reassign the physical rooms first before deleting this category. System safety checks will prevent deletion while active physical rooms exist.
                                </span>
                            ) : (
                                <span>
                                    <strong className="text-foreground font-bold">{deletingType?.name}</strong> has zero associated physical rooms or active reservations.
                                    <br /><br />
                                    This room category will be <strong className="text-rose-500 font-bold uppercase">PERMANENTLY DELETED</strong> from the system database. This action cannot be undone.
                                </span>
                            )
                        }
                        confirmText={hasRooms ? "Attempt Delete" : "Permanently Delete"}
                    />
                );
            })()}

            {/* Occupancy V2 Migration Modal */}
            {propertyId && (
                <OccupancyMigrationModal
                    propertyId={propertyId}
                    propertyName={selectedProperty?.name || 'Property'}
                    isOpen={isMigrationModalOpen}
                    onClose={() => setIsMigrationModalOpen(false)}
                    onStatusChange={() => queryClient.invalidateQueries({ queryKey: ['roomTypes'] })}
                />
            )}
        </div>
    );
}

