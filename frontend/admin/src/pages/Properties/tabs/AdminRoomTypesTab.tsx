import React, { useState, useEffect } from 'react';
import {
    Plus, Edit2, Trash2, BedDouble, Users,
    Loader2, Image as ImageIcon, ExternalLink
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { roomTypesService } from '../../../services/roomTypes';
import type { RoomType } from '../../../types/room';
import toast from 'react-hot-toast';
import AdminCreateRoomType from './AdminCreateRoomType';
import ConfirmModal from '../../../components/ConfirmModal';

interface AdminRoomTypesTabProps {
    propertyId: string;
    propertyName?: string;
    onRoomsCountChange?: () => void;
}

export const AdminRoomTypesTab: React.FC<AdminRoomTypesTabProps> = ({
    propertyId,
    propertyName
}) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const action = searchParams.get('action'); // 'create' | 'edit'
    const activeRoomTypeId = searchParams.get('roomTypeId');

    const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingType, setDeletingType] = useState<RoomType | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchRoomTypes = async () => {
        setLoading(true);
        try {
            const data = await roomTypesService.getAllAdmin({ propertyId });
            setRoomTypes(data || []);
        } catch (err: any) {
            console.error('Failed to load room types:', err);
            toast.error(err.response?.data?.message || 'Failed to load room types for this property');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (propertyId) {
            fetchRoomTypes();
        }
    }, [propertyId]);

    const handleBackToList = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.delete('action');
            next.delete('roomTypeId');
            return next;
        });
        fetchRoomTypes();
    };

    const handleOpenCreate = () => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('tab', 'room-types');
            next.set('action', 'create');
            next.delete('roomTypeId');
            return next;
        });
    };

    const handleOpenEdit = (rtId: string) => {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev);
            next.set('tab', 'room-types');
            next.set('action', 'edit');
            next.set('roomTypeId', rtId);
            return next;
        });
    };

    const handleDelete = async () => {
        if (!deletingType) return;
        setIsDeleting(true);
        try {
            await roomTypesService.delete(deletingType.id);
            toast.success('Room type deleted successfully');
            setDeletingType(null);
            fetchRoomTypes();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete room type');
        } finally {
            setIsDeleting(false);
        }
    };

    // If action is create or edit, render the full PMS-identical Create/Edit page
    if (action === 'create') {
        return (
            <AdminCreateRoomType
                propertyId={propertyId}
                onBack={handleBackToList}
                onSuccess={handleBackToList}
            />
        );
    }

    if (action === 'edit' && activeRoomTypeId) {
        return (
            <AdminCreateRoomType
                propertyId={propertyId}
                roomTypeId={activeRoomTypeId}
                onBack={handleBackToList}
                onSuccess={handleBackToList}
            />
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-card rounded-2xl border border-border shadow-xs">
                <div>
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <span>Room Types</span>
                        {propertyName && <span className="text-muted-foreground text-sm font-normal">({propertyName})</span>}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        Configure room categories, AC/Non-AC tariffs, occupancy allowances, and media
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg">
                        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : `${roomTypes.length} Type${roomTypes.length === 1 ? '' : 's'}`}
                    </span>
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="bg-primary text-primary-foreground px-4 py-2 rounded-xl hover:bg-primary/90 transition-all flex items-center gap-2 font-bold shadow-xs text-xs cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Add Room Type
                    </button>
                    <a
                        href={`/properties/${propertyId}/edit?tab=room-types&action=create`}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Add Room Type in New Tab"
                        className="p-2 border border-border bg-card text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </a>
                </div>
            </div>

            {/* Room Types Cards Grid */}
            {loading ? (
                <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : roomTypes.length === 0 ? (
                <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border p-8 space-y-4">
                    <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <BedDouble className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                        <h3 className="font-bold text-foreground text-base">No room types defined</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            Get started by configuring your first room type for this property.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all inline-flex items-center gap-2 cursor-pointer shadow-xs"
                    >
                        <Plus className="h-4 w-4" />
                        Create First Room Type
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {roomTypes.map((type) => {
                        const isV2Ready = type.occupancyVersion === 'V2' || (type.totalBaseOccupancy !== undefined && type.totalMaxOccupancy !== undefined);
                        const isDual = type.acOption === 'BOTH';
                        const isNonAcOnly = type.acOption === 'NON_AC_ONLY';
                        const nonAcPrice = Number(type.basePrice);
                        const acPrice = Number(type.basePriceAc || type.basePrice);

                        return (
                            <div
                                key={type.id}
                                className="bg-card rounded-2xl shadow-xs border border-border overflow-hidden flex flex-col h-full group hover:shadow-md transition-all"
                            >
                                {/* Room Image Banner */}
                                {type.images && type.images.length > 0 ? (
                                    <div className="relative w-full h-48 overflow-hidden bg-muted">
                                        <img
                                            src={type.images[0]}
                                            alt={type.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        />
                                        {type.images.length > 1 && (
                                            <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                                                +{type.images.length - 1} photos
                                            </span>
                                        )}
                                        {type.marketingBadgeText && (
                                            <span className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-extrabold uppercase shadow-xs">
                                                {type.marketingBadgeText}
                                            </span>
                                        )}
                                    </div>
                                ) : (
                                    <div className="w-full h-48 bg-muted flex flex-col items-center justify-center text-muted-foreground gap-1">
                                        <ImageIcon className="h-10 w-10 opacity-30" />
                                        <span className="text-[11px] font-medium">No images uploaded</span>
                                    </div>
                                )}

                                {/* Card Body */}
                                <div className="p-5 flex-1 flex flex-col space-y-3">
                                    {/* Title and Prices */}
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <h3 className="text-base font-bold text-foreground group-hover:text-primary transition-colors">
                                                {type.name}
                                            </h3>
                                            {type.size ? (
                                                <span className="text-[11px] text-muted-foreground font-medium">
                                                    {type.size} sq.ft
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-col items-end gap-1">
                                            {isDual ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                                        <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs" title="Non-AC Base Tariff">
                                                            🍃 ₹{nonAcPrice.toLocaleString()}
                                                        </span>
                                                        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold px-2 py-0.5 rounded-md shadow-2xs" title="AC Base Tariff">
                                                            ❄️ ₹{acPrice.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <span className="text-[9px] font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200/60 shadow-2xs">
                                                        ❄️/🍃 Dual (AC & Non-AC)
                                                    </span>
                                                </div>
                                            ) : isNonAcOnly ? (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                                                        ₹{nonAcPrice.toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] font-black text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-200/60">
                                                        🍃 Non-AC Only
                                                    </span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full shadow-2xs">
                                                        ₹{acPrice.toLocaleString()}
                                                    </span>
                                                    <span className="text-[9px] font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-200/60">
                                                        ❄️ AC Only
                                                    </span>
                                                </div>
                                            )}
                                            {type.isGstInclusive && (
                                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">
                                                    GST Inclusive
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Occupancy V2 Readiness Badge */}
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${isV2Ready ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-muted text-muted-foreground border-border'}`}>
                                            {isV2Ready ? 'V2 Configured' : 'V1 Legacy'}
                                        </span>
                                        {type.isPubliclyVisible === false && (
                                            <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                                Hidden from Public
                                            </span>
                                        )}
                                    </div>

                                    {/* Description */}
                                    <p className="text-muted-foreground text-xs line-clamp-2 leading-relaxed">
                                        {type.description || 'No description provided.'}
                                    </p>

                                    {/* Rooms Counter Link */}
                                    <div className="pt-1">
                                        <Link
                                            to={`/properties/${propertyId}/edit?tab=rooms&roomTypeId=${type.id}`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200/60 dark:border-blue-800/40"
                                            title="View physical rooms of this type"
                                        >
                                            <BedDouble className="h-3.5 w-3.5" />
                                            <span>Manage Rooms ({type._count?.rooms ?? type.rooms?.length ?? 0})</span>
                                        </Link>
                                    </div>

                                    {/* Occupancy Metrics */}
                                    <div className="p-3 bg-muted/30 rounded-xl border border-border space-y-1.5 text-xs text-foreground">
                                        <div className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                                            <span className="font-bold">
                                                Base: {type.totalBaseOccupancy || ((type.baseAdults || 2) + (type.baseChildren || 0))} Guests | Max: {type.totalMaxOccupancy || ((type.maxPhysicalAdults || type.maxAdults || 2) + (type.maxPhysicalChildren || type.maxChildren || 0))} Guests
                                            </span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground pl-5">
                                            Phys: {type.maxPhysicalAdults || type.maxAdults || 2}A + {type.maxPhysicalChildren || type.maxChildren || 0}C (+{type.maxPhysicalInfants ?? 1} Inf)
                                        </div>
                                    </div>

                                    {/* Amenities Chips */}
                                    {type.amenities && type.amenities.length > 0 && (
                                        <div className="flex flex-wrap gap-1 pt-1">
                                            {type.amenities.slice(0, 4).map((a, i) => (
                                                <span
                                                    key={i}
                                                    className="px-2 py-0.5 bg-muted text-[10px] font-medium text-muted-foreground rounded-md border border-border"
                                                >
                                                    {a}
                                                </span>
                                            ))}
                                            {type.amenities.length > 4 && (
                                                <span className="px-1.5 py-0.5 text-[10px] text-muted-foreground font-bold">
                                                    +{type.amenities.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="pt-3 border-t border-border mt-auto flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => handleOpenEdit(type.id)}
                                            className="flex-1 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-all border border-border flex items-center justify-center gap-1.5 cursor-pointer"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" />
                                            Edit
                                        </button>
                                        <a
                                            href={`/properties/${propertyId}/edit?tab=room-types&action=edit&roomTypeId=${type.id}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            title="Open Edit in New Tab"
                                            className="p-2 border border-border text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => setDeletingType(type)}
                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-all border border-border cursor-pointer"
                                            title="Delete Room Type"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={Boolean(deletingType)}
                onClose={() => setDeletingType(null)}
                onConfirm={handleDelete}
                title={`Delete Room Type "${deletingType?.name}"?`}
                description="Are you sure you want to permanently delete this room type? This will also remove or unlink all associated rooms and pricing rules."
                confirmText="Yes, Delete Room Type"
                isLoading={isDeleting}
                variant="danger"
            />
        </div>
    );
};

export default AdminRoomTypesTab;
