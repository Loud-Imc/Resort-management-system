import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Trash2, Users, CheckCircle2, AlertCircle, Sparkles, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { bookingsService } from '../../services/bookings';

interface CustomAccommodationModalProps {
    isOpen: boolean;
    onClose: () => void;
    roomTypes: any[];
    checkInDate: string;
    checkOutDate: string;
    requiredAdults: number;
    requiredChildren: number;
    requiredInfants: number;
    requiredChildAges: number[];
    isPropertyGstApplicable?: boolean;
    onApplyCustomSolution: (solution: any, roomAssignments: Record<number, string>) => void;
}

interface CustomRoomItem {
    id: string;
    roomTypeId: string;
    physicalRoomId: string;
    adults: number;
    children: number;
    childAges: number[];
    infants: number;
}

export const CustomAccommodationModal: React.FC<CustomAccommodationModalProps> = ({
    isOpen,
    onClose,
    roomTypes,
    checkInDate,
    checkOutDate,
    requiredAdults,
    requiredChildren,
    requiredInfants,
    requiredChildAges,
    onApplyCustomSolution,
}) => {
    const [customRooms, setCustomRooms] = useState<CustomRoomItem[]>([]);
    const [availableRoomsByRoomType, setAvailableRoomsByRoomType] = useState<Record<string, any[]>>({});
    const [loadingRoomsByRoomType, setLoadingRoomsByRoomType] = useState<Record<string, boolean>>({});
    const [livePrice, setLivePrice] = useState<{
        baseAmount: number;
        extraAmount: number;
        extraAdultAmount: number;
        extraChildAmount: number;
        taxAmount: number;
        totalPrice: number;
        taxRate: number;
        isGstInclusive: boolean;
    } | null>(null);
    const [isPriceCalculating, setIsPriceCalculating] = useState(false);

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))) || 1;

    // Filter room types
    const availableRoomTypes = useMemo(() => {
        return roomTypes || [];
    }, [roomTypes]);

    // Ref to track latest available rooms map for async callbacks
    const availableRoomsRef = useRef<Record<string, any[]>>({});
    availableRoomsRef.current = availableRoomsByRoomType;

    // Fix G1: Fetch genuinely available physical rooms for requested dates per room type
    useEffect(() => {
        if (!isOpen || !checkInDate || !checkOutDate || availableRoomTypes.length === 0) {
            setAvailableRoomsByRoomType({});
            setLoadingRoomsByRoomType({});
            return;
        }

        let isCancelled = false;

        const fetchAvailableRooms = async () => {
            for (const rt of availableRoomTypes) {
                if (isCancelled) break;
                setLoadingRoomsByRoomType(prev => ({ ...prev, [rt.id]: true }));
                try {
                    const result = await bookingsService.checkAvailability({
                        roomTypeId: rt.id,
                        checkInDate,
                        checkOutDate,
                    });
                    if (!isCancelled) {
                        const roomList = result.roomList || [];
                        setAvailableRoomsByRoomType(prev => ({
                            ...prev,
                            [rt.id]: roomList,
                        }));
                    }
                } catch (err) {
                    console.error(`Failed to fetch available rooms for room type ${rt.id}:`, err);
                    if (!isCancelled) {
                        setAvailableRoomsByRoomType(prev => ({
                            ...prev,
                            [rt.id]: [],
                        }));
                    }
                } finally {
                    if (!isCancelled) {
                        setLoadingRoomsByRoomType(prev => ({ ...prev, [rt.id]: false }));
                    }
                }
            }
        };

        fetchAvailableRooms();

        return () => {
            isCancelled = true;
        };
    }, [isOpen, checkInDate, checkOutDate, availableRoomTypes]);

    // Initialize custom rooms when modal opens
    useEffect(() => {
        if (isOpen && customRooms.length === 0 && availableRoomTypes.length > 0) {
            const firstRt = availableRoomTypes[0];
            setCustomRooms([
                {
                    id: `room_${Date.now()}_1`,
                    roomTypeId: firstRt.id,
                    physicalRoomId: '',
                    adults: Math.min(requiredAdults, firstRt.maxPhysicalAdults ?? firstRt.maxAdults ?? 2),
                    children: Math.min(requiredChildren, firstRt.maxPhysicalChildren ?? firstRt.maxChildren ?? 0),
                    childAges: requiredChildAges.slice(0, Math.min(requiredChildren, firstRt.maxPhysicalChildren ?? 0)),
                    infants: Math.min(requiredInfants, firstRt.maxPhysicalInfants ?? 1),
                }
            ]);
        }
    }, [isOpen, availableRoomTypes]);

    // Auto-select first genuinely available physical room once availableRoomsByRoomType is loaded
    useEffect(() => {
        if (!isOpen) return;
        setCustomRooms(prev => {
            let hasChanges = false;
            const assignedIds = new Set<string>();
            const updated = prev.map(cr => {
                const availableForType = availableRoomsByRoomType[cr.roomTypeId] || [];
                const isCurrentlyAssignedValid = availableForType.some(pr => pr.id === cr.physicalRoomId);
                let newPhysId = cr.physicalRoomId;

                if (!isCurrentlyAssignedValid || assignedIds.has(cr.physicalRoomId)) {
                    const firstUnused = availableForType.find(pr => !assignedIds.has(pr.id));
                    newPhysId = firstUnused?.id || '';
                }

                if (newPhysId) assignedIds.add(newPhysId);
                if (newPhysId !== cr.physicalRoomId) hasChanges = true;
                return { ...cr, physicalRoomId: newPhysId };
            });

            return hasChanges ? updated : prev;
        });
    }, [availableRoomsByRoomType, isOpen]);

    // Authoritative Live Pricing from backend pricing service (Fix G3 & G5)
    useEffect(() => {
        let isCancelled = false;
        if (!isOpen || !checkInDate || !checkOutDate || customRooms.length === 0) {
            setLivePrice(null);
            return;
        }

        const calculateLivePricing = async () => {
            setIsPriceCalculating(true);
            try {
                let accBase = 0;
                let accExtraAdult = 0;
                let accExtraChild = 0;
                let accTax = 0;
                let accTotal = 0;
                let isInclusive = false;
                const taxRates: number[] = [];

                for (const cr of customRooms) {
                    if (!cr.roomTypeId) continue;
                    const res = await bookingsService.calculatePrice({
                        roomTypeId: cr.roomTypeId,
                        checkInDate,
                        checkOutDate,
                        adultsCount: cr.adults,
                        childrenCount: cr.children,
                        childAges: cr.childAges,
                        infantsCount: cr.infants,
                        roomCount: 1,
                    });
                    accBase += res.baseAmount;
                    accExtraAdult += (res.extraAdultAmount || 0);
                    accExtraChild += (res.extraChildAmount || 0);
                    accTax += res.taxAmount;
                    accTotal += res.totalAmount;
                    if (res.isGstInclusive) isInclusive = true;
                    if (res.taxRate !== undefined && res.taxRate !== null) taxRates.push(res.taxRate);
                }

                const totalTaxable = accBase + accExtraAdult + accExtraChild;
                const effectiveTaxRate = totalTaxable > 0 && accTax > 0
                    ? Number(((accTax / totalTaxable) * 100).toFixed(1))
                    : (taxRates[0] || 0);

                if (!isCancelled) {
                    setLivePrice({
                        baseAmount: Number(accBase.toFixed(2)),
                        extraAmount: Number((accExtraAdult + accExtraChild).toFixed(2)),
                        extraAdultAmount: Number(accExtraAdult.toFixed(2)),
                        extraChildAmount: Number(accExtraChild.toFixed(2)),
                        taxAmount: Number(accTax.toFixed(2)),
                        totalPrice: Number(accTotal.toFixed(2)),
                        taxRate: effectiveTaxRate,
                        isGstInclusive: isInclusive,
                    });
                }
            } catch (err) {
                console.error('Failed to calculate custom solution live price', err);
                if (!isCancelled) setLivePrice(null);
            } finally {
                if (!isCancelled) setIsPriceCalculating(false);
            }
        };

        const timer = setTimeout(calculateLivePricing, 150);
        return () => {
            isCancelled = true;
            clearTimeout(timer);
        };
    }, [isOpen, customRooms, checkInDate, checkOutDate]);

    if (!isOpen) return null;

    // Calculate totals across configured custom rooms
    const totalAllocatedAdults = customRooms.reduce((sum, r) => sum + r.adults, 0);
    const totalAllocatedChildren = customRooms.reduce((sum, r) => sum + r.children, 0);
    const totalAllocatedInfants = customRooms.reduce((sum, r) => sum + r.infants, 0);

    const isAdultsMatched = totalAllocatedAdults === requiredAdults;
    const isChildrenMatched = totalAllocatedChildren === requiredChildren;
    const isInfantsMatched = totalAllocatedInfants === requiredInfants;
    const isPartyFullyAllocated = isAdultsMatched && isChildrenMatched && isInfantsMatched;

    // Physical room uniqueness check
    const selectedPhysicalRoomIds = customRooms.map(r => r.physicalRoomId).filter(Boolean);
    const hasDuplicatePhysicalRooms = new Set(selectedPhysicalRoomIds).size !== selectedPhysicalRoomIds.length;

    // Validate per-room physical capacities & physical room selection
    const roomValidationErrors: Record<string, string[]> = {};
    customRooms.forEach((r) => {
        const errors: string[] = [];
        const rt = roomTypes.find(t => t.id === r.roomTypeId);
        if (!rt) {
            errors.push('Select a valid room type.');
        } else {
            const maxPhysAdults = rt.maxPhysicalAdults ?? rt.maxAdults ?? 2;
            const maxPhysChildren = rt.maxPhysicalChildren ?? rt.maxChildren ?? 0;
            const maxPhysInfants = rt.maxPhysicalInfants ?? 1;
            const totalMax = rt.totalMaxOccupancy ?? (maxPhysAdults + maxPhysChildren);

            if (r.adults < 1) errors.push('At least 1 adult required per room.');
            if (r.adults > maxPhysAdults) errors.push(`Exceeds max adult capacity (${maxPhysAdults}).`);
            if (r.children > maxPhysChildren) errors.push(`Exceeds max child capacity (${maxPhysChildren}).`);
            if (r.infants > maxPhysInfants) errors.push(`Exceeds max infant capacity (${maxPhysInfants}).`);
            if (r.adults + r.children > totalMax) errors.push(`Exceeds total combined capacity (${totalMax}).`);
            if (!r.physicalRoomId) errors.push('Please select an available physical room number.');
        }
        if (errors.length > 0) roomValidationErrors[r.id] = errors;
    });

    const isAllRoomsValid = Object.keys(roomValidationErrors).length === 0 && !hasDuplicatePhysicalRooms;
    const canApply = isPartyFullyAllocated && isAllRoomsValid && customRooms.length > 0 && !isPriceCalculating && livePrice !== null;

    const enrichedCustomRooms = customRooms.map(cr => {
        const rt = roomTypes.find(t => t.id === cr.roomTypeId);
        const basePrice = Number(rt?.basePrice || 0);
        const extraAdultPrice = Number(rt?.extraAdultPrice || 0);
        const extraChildPrice = Number(rt?.extraChildPrice || 0);

        const baseAdults = rt?.baseMaxAdults ?? rt?.baseAdults ?? 2;
        const baseChildren = rt?.baseMaxChildren ?? rt?.baseChildren ?? 0;
        const freeChildrenCount = rt?.freeChildrenCount ?? 0;

        const extraAdults = Math.max(0, cr.adults - baseAdults);
        const paidChildren = Math.max(0, cr.children - freeChildrenCount);
        const extraChildren = Math.max(0, cr.children - baseChildren);

        const extraAdultCharge = extraAdults * extraAdultPrice;
        const extraChildCharge = extraChildren * extraChildPrice;
        const roomTotalPerNight = basePrice + extraAdultCharge + extraChildCharge;

        return {
            ...cr,
            rt,
            roomTypeName: rt?.name || 'Standard Room',
            basePricePerNight: basePrice,
            extraAdults,
            extraChildren,
            freeChildren: Math.min(cr.children, freeChildrenCount),
            paidChildren,
            extraAdultChargePerNight: extraAdultCharge,
            extraChildChargePerNight: extraChildCharge,
            totalPricePerNight: roomTotalPerNight,
            maxPhysicalAdults: rt?.maxPhysicalAdults ?? 2,
            maxPhysicalChildren: rt?.maxPhysicalChildren ?? 0,
            maxPhysicalInfants: rt?.maxPhysicalInfants ?? 1,
            totalMaxOccupancy: rt?.totalMaxOccupancy ?? (baseAdults + baseChildren),
            totalBaseOccupancy: rt?.totalBaseOccupancy ?? (baseAdults + baseChildren),
        };
    });

    const handleAddRoom = () => {
        if (availableRoomTypes.length === 0) return;
        const rt = availableRoomTypes[0];
        const assignedIds = new Set(customRooms.map(r => r.physicalRoomId).filter(Boolean));
        const availableForType = availableRoomsByRoomType[rt.id] || [];
        const unusedRoom = availableForType.find((r: any) => !assignedIds.has(r.id));

        setCustomRooms(prev => [
            ...prev,
            {
                id: `room_${Date.now()}_${prev.length + 1}`,
                roomTypeId: rt.id,
                physicalRoomId: unusedRoom?.id || '',
                adults: Math.max(1, requiredAdults - totalAllocatedAdults),
                children: Math.max(0, requiredChildren - totalAllocatedChildren),
                childAges: [],
                infants: Math.max(0, requiredInfants - totalAllocatedInfants),
            }
        ]);
    };

    const handleRemoveRoom = (id: string) => {
        setCustomRooms(prev => prev.filter(r => r.id !== id));
    };

    const handleUpdateRoom = (id: string, updates: Partial<CustomRoomItem>) => {
        setCustomRooms(prev => prev.map(r => {
            if (r.id !== id) return r;
            const next = { ...r, ...updates };
            if (updates.roomTypeId && updates.roomTypeId !== r.roomTypeId) {
                const assignedIds = new Set(prev.filter(x => x.id !== id).map(x => x.physicalRoomId).filter(Boolean));
                const availableForNewType = availableRoomsByRoomType[updates.roomTypeId] || [];
                const availablePhys = availableForNewType.find((pr: any) => !assignedIds.has(pr.id));
                next.physicalRoomId = availablePhys?.id || '';
            }
            return next;
        }));
    };

    const handleConfirmCustomSolution = () => {
        if (!canApply || !livePrice) return;

        const customSolution = {
            id: `custom_sol_${Date.now()}`,
            propertyId: roomTypes[0]?.propertyId,
            solutionName: 'Custom Accommodation Arrangement',
            isCustom: true,
            totalRooms: customRooms.length,
            isRecommended: false,
            badge: 'Custom Staff Arrangement',
            numberOfNights: nights,
            pricing: {
                baseAmount: livePrice.baseAmount,
                extraAmount: livePrice.extraAmount,
                extraAdultAmount: livePrice.extraAdultAmount,
                extraChildAmount: livePrice.extraChildAmount,
                taxAmount: livePrice.taxAmount,
                taxRate: livePrice.taxRate,
                isGstInclusive: livePrice.isGstInclusive,
                totalPrice: livePrice.totalPrice,
                pricePerNight: Number((livePrice.totalPrice / nights).toFixed(2)),
                numberOfNights: nights,
                currency: 'INR',
            },
            rooms: enrichedCustomRooms.map(r => ({
                roomTypeId: r.roomTypeId,
                roomTypeName: r.roomTypeName,
                adults: r.adults,
                children: r.children,
                childAges: r.childAges,
                infants: r.infants,
                extraAdults: r.extraAdults,
                extraChildren: r.extraChildren,
                freeChildren: r.freeChildren,
                paidChildren: r.paidChildren,
                basePricePerNight: r.basePricePerNight,
                extraAdultChargePerNight: r.extraAdultChargePerNight,
                extraChildChargePerNight: r.extraChildChargePerNight,
                totalPricePerNight: r.totalPricePerNight,
                maxPhysicalAdults: r.maxPhysicalAdults,
                maxPhysicalChildren: r.maxPhysicalChildren,
                maxPhysicalInfants: r.maxPhysicalInfants,
                totalMaxOccupancy: r.totalMaxOccupancy,
                totalBaseOccupancy: r.totalBaseOccupancy,
            })),
        };

        const assignments: Record<number, string> = {};
        customRooms.forEach((r, idx) => {
            if (r.physicalRoomId) assignments[idx] = r.physicalRoomId;
        });

        onApplyCustomSolution(customSolution, assignments);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-card w-full max-w-4xl rounded-3xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/40">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-primary/10 rounded-xl text-primary">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-primary block">
                                Staff Manual Arrangement
                            </span>
                            <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight">
                                CREATE CUSTOM ACCOMMODATION SOLUTION
                            </h2>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
                    {/* Target Party Allocation Bar */}
                    <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground block">
                                Required Party to Accommodate
                            </span>
                            <p className="text-sm font-black text-foreground flex items-center gap-2">
                                <Users className="h-4 w-4 text-primary" />
                                {requiredAdults} Adults (13+ yrs), {requiredChildren} Children (3–12 yrs){requiredInfants > 0 ? `, ${requiredInfants} Infants (0–2 yrs)` : ''}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={clsx(
                                "text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1",
                                isPartyFullyAllocated
                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            )}>
                                {isPartyFullyAllocated ? (
                                    <><CheckCircle2 className="h-3.5 w-3.5" /> Fully Allocated ({totalAllocatedAdults}A, {totalAllocatedChildren}C{totalAllocatedInfants > 0 ? `, ${totalAllocatedInfants}I` : ''})</>
                                ) : (
                                    <><AlertCircle className="h-3.5 w-3.5" /> Allocated: {totalAllocatedAdults}/{requiredAdults}A, {totalAllocatedChildren}/{requiredChildren}C{requiredInfants > 0 ? `, ${totalAllocatedInfants}/${requiredInfants}I` : ''}</>
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Room Configurator Cards */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                Configured Rooms ({customRooms.length})
                            </h3>
                            <button
                                type="button"
                                onClick={handleAddRoom}
                                className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                                <Plus className="h-3.5 w-3.5" /> Add Another Room
                            </button>
                        </div>

                        {customRooms.map((roomItem, idx) => {
                            const rt = roomTypes.find(t => t.id === roomItem.roomTypeId);
                            const errors = roomValidationErrors[roomItem.id] || [];
                            const assignedIdsInOtherSlots = new Set(
                                customRooms.filter(x => x.id !== roomItem.id).map(x => x.physicalRoomId).filter(Boolean)
                            );
                            const availablePhysRooms = availableRoomsByRoomType[roomItem.roomTypeId] || [];
                            const isLoadingPhys = loadingRoomsByRoomType[roomItem.roomTypeId];

                            const maxPhysA = rt?.maxPhysicalAdults ?? rt?.maxAdults ?? 2;
                            const maxPhysC = rt?.maxPhysicalChildren ?? rt?.maxChildren ?? 0;
                            const maxPhysInf = rt?.maxPhysicalInfants ?? 1;

                            return (
                                <div key={roomItem.id} className="p-4 sm:p-5 rounded-2xl border border-border bg-card space-y-4 shadow-xs">
                                    <div className="flex items-center justify-between pb-2.5 border-b border-border">
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                                                {idx + 1}
                                            </span>
                                            <h4 className="text-sm font-black text-foreground">
                                                Room {idx + 1}: {rt?.name || 'Select Room Type'}
                                            </h4>
                                        </div>
                                        {customRooms.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveRoom(roomItem.id)}
                                                className="text-xs font-bold text-red-500 hover:text-red-600 p-1 rounded-md hover:bg-red-500/10 flex items-center gap-1 cursor-pointer"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Remove
                                            </button>
                                        )}
                                    </div>

                                    {/* Selection Row: RoomType & Physical Room */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1">
                                                Room Type <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={roomItem.roomTypeId}
                                                onChange={(e) => handleUpdateRoom(roomItem.id, { roomTypeId: e.target.value })}
                                                className="w-full border border-input bg-background rounded-xl h-10 px-3 text-xs font-bold cursor-pointer"
                                            >
                                                {availableRoomTypes.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name} (₹{Number(t.basePrice || 0).toLocaleString()}/nt • Max: {t.maxPhysicalAdults ?? 2}A+{t.maxPhysicalChildren ?? 0}C)
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-muted-foreground mb-1">
                                                Available Physical Room Assignment <span className="text-red-500">*</span>
                                            </label>
                                            <select
                                                value={roomItem.physicalRoomId}
                                                onChange={(e) => handleUpdateRoom(roomItem.id, { physicalRoomId: e.target.value })}
                                                className="w-full border border-input bg-background rounded-xl h-10 px-3 text-xs font-bold cursor-pointer"
                                                disabled={isLoadingPhys}
                                            >
                                                {isLoadingPhys ? (
                                                    <option value="" disabled>Loading genuinely available rooms...</option>
                                                ) : availablePhysRooms.length === 0 ? (
                                                    <option value="" disabled>No physical rooms available for selected dates</option>
                                                ) : (
                                                    <>
                                                        <option value="">-- Choose Available Physical Room --</option>
                                                        {availablePhysRooms.map((pr: any) => {
                                                            const isUsedElsewhere = assignedIdsInOtherSlots.has(pr.id);
                                                            return (
                                                                <option key={pr.id} value={pr.id} disabled={isUsedElsewhere}>
                                                                    Room #{pr.roomNumber || pr.name} {isUsedElsewhere ? '(Selected in another room slot)' : ''}
                                                                </option>
                                                            );
                                                        })}
                                                    </>
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Guest Allocation Row */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                                        <div>
                                            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                                                Adults (13+ yrs) (Cap: {maxPhysA})
                                            </label>
                                            <input
                                                type="number"
                                                min={1}
                                                max={maxPhysA}
                                                value={roomItem.adults}
                                                onChange={(e) => handleUpdateRoom(roomItem.id, { adults: Math.max(1, Number(e.target.value) || 1) })}
                                                className="w-full border border-input bg-background rounded-lg h-9 px-3 text-xs font-bold"
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                                                Children (3–12 yrs) (Cap: {maxPhysC})
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={maxPhysC}
                                                value={roomItem.children}
                                                onChange={(e) => {
                                                    const count = Math.max(0, Number(e.target.value) || 0);
                                                    const currentAges = roomItem.childAges || [];
                                                    const nextAges = Array.from({ length: count }).map((_, i) => currentAges[i] ?? 5);
                                                    handleUpdateRoom(roomItem.id, { children: count, childAges: nextAges });
                                                }}
                                                className="w-full border border-input bg-background rounded-lg h-9 px-3 text-xs font-bold"
                                            />
                                        </div>

                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block text-[11px] font-bold text-muted-foreground mb-1">
                                                Infants (0–2 yrs) (Cap: {maxPhysInf})
                                            </label>
                                            <input
                                                type="number"
                                                min={0}
                                                max={maxPhysInf}
                                                value={roomItem.infants}
                                                onChange={(e) => handleUpdateRoom(roomItem.id, { infants: Math.max(0, Number(e.target.value) || 0) })}
                                                className="w-full border border-input bg-background rounded-lg h-9 px-3 text-xs font-bold"
                                            />
                                        </div>
                                    </div>

                                    {/* Child Ages if Children > 0 */}
                                    {roomItem.children > 0 && (
                                        <div className="p-3 bg-muted/40 rounded-xl space-y-1.5">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                                Child Ages (3–12 yrs)
                                            </span>
                                            <div className="flex flex-wrap gap-2">
                                                {Array.from({ length: roomItem.children }).map((_, cIdx) => (
                                                    <div key={cIdx} className="flex items-center gap-1.5">
                                                        <span className="text-[10px] font-semibold text-muted-foreground">C{cIdx + 1}:</span>
                                                        <select
                                                            value={roomItem.childAges[cIdx] ?? 5}
                                                            onChange={(e) => {
                                                                const nextAges = [...(roomItem.childAges || [])];
                                                                nextAges[cIdx] = Number(e.target.value) || 5;
                                                                handleUpdateRoom(roomItem.id, { childAges: nextAges });
                                                            }}
                                                            className="border border-input bg-background rounded-md px-2 py-1 text-xs font-bold"
                                                        >
                                                            {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(age => (
                                                                <option key={age} value={age}>{age} yrs</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Room Validation Errors */}
                                    {errors.length > 0 && (
                                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 space-y-0.5">
                                            {errors.map((err, i) => (
                                                <p key={i} className="flex items-center gap-1.5">
                                                    <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {err}
                                                </p>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Price Breakdown Preview (Authoritative Backend Result) */}
                    <div className="p-5 rounded-2xl bg-muted/20 border border-border space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                            <span className="text-xs font-black uppercase tracking-wider text-foreground">
                                Custom Arrangement Pricing ({customRooms.length} Rooms × {nights} Night{nights > 1 ? 's' : ''})
                            </span>
                            <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                                {isPriceCalculating ? (
                                    <span className="flex items-center gap-1 text-primary">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Calculating backend price...
                                    </span>
                                ) : livePrice ? (
                                    livePrice.isGstInclusive ? 'GST Inclusive Tariff' : 'GST Exclusive Tariff'
                                ) : (
                                    'Pricing unavailable'
                                )}
                            </span>
                        </div>

                        {isPriceCalculating || !livePrice ? (
                            <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                <span>Fetching authoritative pricing from server...</span>
                            </div>
                        ) : (
                            <div className="space-y-1.5 text-xs">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Base Room Charges</span>
                                    <span className="font-semibold text-foreground">₹{livePrice.baseAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                                {livePrice.extraAmount > 0 && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Extra Guest Charges</span>
                                        <span className="font-semibold text-foreground">+₹{livePrice.extraAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                )}
                                {livePrice.taxAmount > 0 && (
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Dynamic GST ({livePrice.taxRate}%){livePrice.isGstInclusive ? ' (Included)' : ''}</span>
                                        <span className="font-semibold text-foreground">
                                            {livePrice.isGstInclusive ? '' : '+'}₹{livePrice.taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center pt-2 border-t border-border font-black text-sm text-foreground">
                                    <span>Calculated Total Price</span>
                                    <span className="text-lg text-primary">₹{livePrice.totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-xs text-muted-foreground">
                        {!isPartyFullyAllocated ? (
                            <span className="text-amber-600 font-bold flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" /> Please allocate all {requiredAdults} Adults and {requiredChildren} Children to continue.
                            </span>
                        ) : !isAllRoomsValid ? (
                            <span className="text-red-500 font-bold flex items-center gap-1">
                                <AlertCircle className="h-4 w-4" /> Please resolve room capacity / physical room selection errors.
                            </span>
                        ) : isPriceCalculating ? (
                            <span className="text-primary font-bold flex items-center gap-1">
                                <Loader2 className="h-4 w-4 animate-spin" /> Verifying authoritative price calculation...
                            </span>
                        ) : (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> Custom arrangement verified against capacity and availability rules.
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2.5 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 sm:flex-none px-5 py-2.5 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            disabled={!canApply}
                            onClick={handleConfirmCustomSolution}
                            className="flex-1 sm:flex-none px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-black rounded-xl text-xs uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                            <CheckCircle2 className="h-4 w-4" /> Use This Solution
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomAccommodationModal;

