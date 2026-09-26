import React, { useState, useMemo } from 'react';
import { AccommodationSolution, AllocatedRoomItem } from '../../types';
import { Users, Bed, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Baby, CheckCircle } from 'lucide-react';
import { useCurrency } from '../../context/CurrencyContext';
import { formatPrice } from '../../utils/currency';

interface AccommodationSolutionCardProps {
    solution: AccommodationSolution;
    onSelect: (solution: AccommodationSolution) => void;
    onViewRoomDetails?: (room: AllocatedRoomItem) => void;
    nights?: number;
}

export const AccommodationSolutionCard: React.FC<AccommodationSolutionCardProps> = ({
    solution,
    onSelect,
    onViewRoomDetails,
    nights = 1,
}) => {
    const { selectedCurrency, rates } = useCurrency();
    const [isExpanded, setIsExpanded] = useState(true);

    // Active Meal Plan state
    const [selectedMealPlan, setSelectedMealPlan] = useState<'EP' | 'CP' | 'MAP' | 'AP'>(
        (solution.selectedMealPlan as any) || 'EP'
    );

    // Per-room AC selection state
    const [roomAcSelections, setRoomAcSelections] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        solution.rooms.forEach((r: any, idx: number) => {
            if (r.acOption === 'NON_AC_ONLY') {
                initial[idx] = false;
            } else if (r.isAcSelected !== undefined) {
                initial[idx] = r.isAcSelected;
            } else {
                initial[idx] = true;
            }
        });
        return initial;
    });

    const handleRoomAcToggle = (roomIndex: number, isAc: boolean) => {
        setRoomAcSelections(prev => ({
            ...prev,
            [roomIndex]: isAc,
        }));
    };

    // Calculate AC adjustment delta across rooms for the stay length
    const acDelta = useMemo(() => {
        return solution.rooms.reduce((acc: number, r: any, idx: number) => {
            if (r.acOption === 'BOTH' && r.basePriceAc != null) {
                const baseNonAc = r.basePriceNonAc ?? r.basePricePerNight ?? 0;
                const defaultIsAc = r.isAcSelected ?? true;
                const currentIsAc = roomAcSelections[idx] !== undefined ? roomAcSelections[idx] : defaultIsAc;
                if (defaultIsAc && !currentIsAc) {
                    return acc - ((r.basePriceAc - baseNonAc) * nights);
                } else if (!defaultIsAc && currentIsAc) {
                    return acc + ((r.basePriceAc - baseNonAc) * nights);
                }
            }
            return acc;
        }, 0);
    }, [solution.rooms, roomAcSelections, nights]);

    // Active Meal Plan pricing
    const activeMealPricing = solution.ratesByMealPlan?.[selectedMealPlan];
    const baseStayPrice = activeMealPricing?.totalPrice ?? solution.pricing.totalPrice;
    const totalStayPrice = Math.max(0, baseStayPrice + acDelta);
    const pricePerNight = totalStayPrice / Math.max(1, nights);

    // Group rooms for headline display e.g. "1× Family Suite + 1× Deluxe Room"
    const roomSummaryMap = new Map<string, { name: string; count: number }>();
    solution.rooms.forEach((r: AllocatedRoomItem) => {
        if (!roomSummaryMap.has(r.roomTypeId)) {
            roomSummaryMap.set(r.roomTypeId, { name: r.roomTypeName, count: 0 });
        }
        roomSummaryMap.get(r.roomTypeId)!.count += 1;
    });

    const headline = Array.from(roomSummaryMap.values())
        .map(item => `${item.count}× ${item.name}`)
        .join(' + ');

    const totalAdults = solution.rooms.reduce((sum, r) => sum + r.adults, 0);
    const totalChildren = solution.rooms.reduce((sum, r) => sum + r.children, 0);
    const totalInfants = solution.rooms.reduce((sum, r) => sum + r.infants, 0);

    const handleConfirmSelection = () => {
        const enrichedSolution: AccommodationSolution = {
            ...solution,
            selectedMealPlan,
            ratePlanId: activeMealPricing?.ratePlanId || solution.ratePlanId,
            mealPlan: selectedMealPlan,
            isAcSelected: Object.values(roomAcSelections).some(v => v),
            pricing: {
                ...solution.pricing,
                totalPrice: totalStayPrice,
                pricePerNight: pricePerNight,
            },
            rooms: solution.rooms.map((r, idx) => ({
                ...r,
                isAcSelected: roomAcSelections[idx] !== undefined ? roomAcSelections[idx] : (r.isAcSelected ?? true),
            })),
        };
        onSelect(enrichedSolution);
    };

    return (
        <div className={`relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl ${
            solution.isRecommended ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md' : 'border-gray-200'
        }`}>
            {/* Top Highlight Banner for Recommended / Best Value */}
            {solution.isRecommended && (
                <div className="bg-gradient-to-r from-primary-600 via-amber-600 to-primary-600 px-5 py-2 text-white text-xs font-black uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        {solution.badge || 'Best Value Solution'}
                    </span>
                    <span className="text-[11px] font-bold opacity-95">Guaranteed Best Price Package</span>
                </div>
            )}

            <div className="p-5 md:p-7 space-y-5">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Package Title & Composition */}
                    <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-primary-50 text-primary-700 border border-primary-200/60">
                                <Bed className="w-3.5 h-3.5 text-primary-600" />
                                {solution.totalRooms} {solution.totalRooms === 1 ? 'Room Total' : 'Rooms Package'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                {totalAdults} {totalAdults === 1 ? 'Adult' : 'Adults'}
                                {totalChildren > 0 && `, ${totalChildren} ${totalChildren === 1 ? 'Child' : 'Children'}`}
                                {totalInfants > 0 && `, ${totalInfants} Infant`}
                            </span>
                            {totalInfants > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    <Baby className="w-3 h-3 text-emerald-600" />
                                    Infant Included
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Plan: {selectedMealPlan}
                            </span>
                        </div>

                        <h4 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                            {headline}
                        </h4>
                        <p className="text-xs text-gray-500 font-medium">
                            Complete accommodation solution physically optimized to comfortably host all {totalAdults + totalChildren} guests.
                        </p>
                    </div>

                    {/* Right: Pricing & CTA */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100">
                        <div className="text-left lg:text-right">
                            <div className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
                                {formatPrice(pricePerNight, selectedCurrency, rates)}
                                <span className="text-xs font-semibold text-gray-500"> /night</span>
                            </div>
                            <div className="text-xs font-bold text-gray-500 mt-0.5">
                                Total: {formatPrice(totalStayPrice, selectedCurrency, rates)} ({nights} {nights === 1 ? 'night' : 'nights'})
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmSelection}
                            className="mt-0 lg:mt-3 px-6 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-black rounded-2xl text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer shrink-0"
                        >
                            <CheckCircle2 className="w-4.5 h-4.5" />
                            Book This Package
                        </button>
                    </div>
                </div>

                {/* Interactive Meal Plan Tabs */}
                {solution.ratesByMealPlan && Object.keys(solution.ratesByMealPlan).length > 0 && (
                    <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-200/70 space-y-2">
                        <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-gray-700">
                            <span>Select Meal Package Option</span>
                            <span className="text-[10px] lowercase font-normal text-gray-500">Includes all {totalAdults + totalChildren} guests</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {[
                                { code: 'EP' as const, label: 'Room Only', icon: '☕' },
                                { code: 'CP' as const, label: 'Breakfast', icon: '🍳' },
                                { code: 'MAP' as const, label: 'Half Board', icon: '🍽️' },
                                { code: 'AP' as const, label: 'Full Board', icon: '👑' },
                            ].map((mp) => {
                                const rate = solution.ratesByMealPlan?.[mp.code];
                                const isActive = selectedMealPlan === mp.code;
                                const planTotal = rate ? Math.round(rate.totalPrice + acDelta) : null;
                                return (
                                    <button
                                        key={mp.code}
                                        type="button"
                                        onClick={() => setSelectedMealPlan(mp.code)}
                                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                                            isActive
                                                ? 'bg-primary-50/90 border-primary-500 text-primary-900 ring-2 ring-primary-500/20 shadow-sm'
                                                : 'bg-white border-gray-200 hover:border-primary-300 text-gray-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="text-xs font-black">{mp.icon} {mp.code}</span>
                                            {isActive && <CheckCircle className="h-3.5 w-3.5 text-primary-600 shrink-0" />}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-medium truncate mt-0.5">{mp.label}</div>
                                        {planTotal !== null && (
                                            <div className="text-xs font-black text-gray-900 mt-1">
                                                {formatPrice(planTotal, selectedCurrency, rates)}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Allocated Rooms Summary List with View Details button & AC controls */}
                <div className="pt-2 border-t border-gray-100 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                            <Bed className="w-4 h-4 text-primary-500" />
                            Included Rooms & Comfort Selection ({solution.rooms.length})
                        </span>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs font-bold text-primary-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand Details</>}
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {solution.rooms.map((room: any, idx: number) => {
                                const hasBothAc = room.acOption === 'BOTH' || (room.availableAcOptions?.includes('AC') && room.availableAcOptions?.includes('NON_AC'));
                                const defaultIsAc = room.isAcSelected ?? (room.acOption !== 'NON_AC_ONLY');
                                const isAc = roomAcSelections[idx] !== undefined ? roomAcSelections[idx] : defaultIsAc;

                                return (
                                    <div
                                        key={idx}
                                        className="p-4 bg-gray-50/90 rounded-2xl border border-gray-200/80 flex flex-col justify-between gap-3 group"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <span className="text-[10px] font-black uppercase tracking-wider text-primary-600">
                                                        Room {idx + 1}
                                                    </span>
                                                    <h5 className="font-black text-sm text-gray-900">
                                                        {room.roomTypeName}
                                                    </h5>
                                                </div>

                                                {/* AC Control: Toggle for BOTH, static badge for single mode */}
                                                <div>
                                                    {hasBothAc ? (
                                                        <div className="flex items-center bg-white p-0.5 rounded-lg border border-gray-200 shadow-2xs">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRoomAcToggle(idx, false)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                                                    !isAc
                                                                        ? 'bg-emerald-600 text-white shadow-xs'
                                                                        : 'text-gray-500 hover:text-gray-800'
                                                                }`}
                                                            >
                                                                🍃 Non-AC
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRoomAcToggle(idx, true)}
                                                                className={`px-2 py-0.5 rounded text-[10px] font-black transition-all ${
                                                                    isAc
                                                                        ? 'bg-cyan-600 text-white shadow-xs'
                                                                        : 'text-gray-500 hover:text-gray-800'
                                                                }`}
                                                            >
                                                                ❄️ AC
                                                            </button>
                                                        </div>
                                                    ) : room.acOption === 'AC_ONLY' ? (
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                            ❄️ AC Only
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                            🍃 Non-AC
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="mt-2 text-xs font-medium text-gray-600 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-gray-400" />
                                                    <span>
                                                        Assigned: <strong>{room.adults} Adults</strong>
                                                        {room.children > 0 && <>, <strong>{room.children} Ch</strong></>}
                                                        {room.infants > 0 && <>, <strong>{room.infants} Inf</strong></>}
                                                    </span>
                                                </div>
                                                {(room.extraAdults > 0 || room.extraChildren > 0) && (
                                                    <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                                        Extra Bed: {room.extraAdults > 0 ? `${room.extraAdults} Adult` : ''} {room.extraChildren > 0 ? `${room.extraChildren} Child` : ''}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {onViewRoomDetails && (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViewRoomDetails(room);
                                                }}
                                                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-gray-100 text-primary-600 hover:text-primary-700 text-xs font-black uppercase tracking-wider border border-gray-200 transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                                            >
                                                View Room Details & Photos
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccommodationSolutionCard;
