import React, { useMemo } from 'react';
import { Sparkles, BedDouble, CheckCircle } from 'lucide-react';
import clsx from 'clsx';

interface AllocatedRoom {
    roomTypeId: string;
    roomTypeName: string;
    adults: number;
    children: number;
    childAges?: number[];
    infants?: number;
    extraAdults?: number;
    extraChildren?: number;
    roomId?: string;
    roomNumber?: string;
    acOption?: 'AC_ONLY' | 'NON_AC_ONLY' | 'BOTH';
    availableAcOptions?: string[];
    isAcSelected?: boolean;
    basePriceNonAc?: number;
    basePriceAc?: number;
}

interface AccommodationPackageCardProps {
    solution: any;
    isSelected: boolean;
    adultsCount: number;
    childrenCount: number;
    onSelect: (solution: any) => void;
    selectedMealPlan?: string;
    onMealPlanChange?: (mealPlan: string) => void;
    roomAcSelections?: Record<number, boolean>;
    onRoomAcToggle?: (roomIndex: number, isAc: boolean) => void;
}

export const AccommodationPackageCard: React.FC<AccommodationPackageCardProps> = ({
    solution,
    isSelected,
    adultsCount,
    childrenCount,
    onSelect,
    selectedMealPlan = 'EP',
    onMealPlanChange,
    roomAcSelections,
    onRoomAcToggle,
}) => {
    const allocatedRooms: AllocatedRoom[] = solution.rooms || solution.allocatedRooms || [];
    const totalRoomsCount = solution.totalRooms || solution.totalRoomsCount || allocatedRooms.length;
    const nights = solution.pricing?.numberOfNights || solution.pricing?.nights || 1;

    // Format title
    const solTitle = solution.solutionName || (
        totalRoomsCount === 1
            ? (allocatedRooms[0]?.roomTypeName || 'Accommodation Solution')
            : `${totalRoomsCount}-Room Accommodation Solution`
    );

    const isBestValue = solution.isBestValue || solution.badge === 'Best Value' || solution.isRecommended;
    const totalGuestsCount = solution.totalGuestsServed || (
        allocatedRooms.reduce((acc: number, r: any) => acc + (r.adults || 0) + (r.children || 0), 0)
    ) || (adultsCount + childrenCount);

    // Calculate dynamic pricing based on active Meal Plan and room AC selections
    const activeMealPlan = selectedMealPlan || 'EP';
    const mealPricing = solution.ratesByMealPlan?.[activeMealPlan];

    const acDelta = useMemo(() => {
        return allocatedRooms.reduce((acc: number, r: any, idx: number) => {
            if (r.acOption === 'BOTH' && r.basePriceAc != null && r.basePriceNonAc != null) {
                const defaultIsAc = r.isAcSelected ?? true;
                const currentIsAc = roomAcSelections?.[idx] !== undefined ? roomAcSelections[idx] : defaultIsAc;
                if (defaultIsAc && !currentIsAc) {
                    return acc - ((r.basePriceAc - r.basePriceNonAc) * nights);
                } else if (!defaultIsAc && currentIsAc) {
                    return acc + ((r.basePriceAc - r.basePriceNonAc) * nights);
                }
            }
            return acc;
        }, 0);
    }, [allocatedRooms, roomAcSelections, nights]);

    const baseStayPrice = mealPricing?.totalPrice ?? solution.pricing?.totalPrice ?? solution.pricingSummary?.grandTotal ?? 0;
    const totalStayPrice = Math.max(0, baseStayPrice + acDelta);
    const pricePerNight = totalStayPrice / nights;

    return (
        <div
            onClick={() => onSelect(solution)}
            className={clsx(
                "p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs select-none space-y-4",
                isSelected
                    ? "bg-primary/5 border-primary ring-2 ring-primary/20 shadow-md"
                    : "bg-card border-border hover:border-primary/40 hover:shadow-sm"
            )}
        >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-3 flex-1">
                    {/* Header & Badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <h4 className={clsx("text-sm sm:text-base font-black tracking-tight", isSelected ? "text-primary" : "text-foreground")}>
                            {solTitle}
                        </h4>
                        {isBestValue && (
                            <span className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="h-3 w-3" /> Best Value
                            </span>
                        )}
                        <span className="text-[10px] font-bold px-2.5 py-0.5 bg-muted text-muted-foreground rounded-md border border-border">
                            {totalRoomsCount} Room{totalRoomsCount > 1 ? 's' : ''} · {totalGuestsCount} Guests
                        </span>
                        {solution.badge && solution.badge !== 'Best Value' && (
                            <span className="text-[10px] font-bold px-2.5 py-0.5 bg-primary/10 text-primary rounded-md border border-primary/20">
                                {solution.badge}
                            </span>
                        )}
                    </div>

                    {/* Room Breakdown with AC status & dual toggles */}
                    <div className="space-y-2 pt-0.5">
                        {allocatedRooms.map((room, rIdx) => {
                            const childAgesStr = room.childAges && room.childAges.length > 0
                                ? ` (Age${room.childAges.length > 1 ? 's' : ''} ${room.childAges.join(', ')})`
                                : '';
                            const infantsStr = room.infants && room.infants > 0 ? `, ${room.infants} Infant${room.infants > 1 ? 's' : ''}` : '';
                            const extraStr = room.extraAdults && room.extraAdults > 0 ? ` (+${room.extraAdults} Extra Bed)` : '';

                            const hasBothAc = room.acOption === 'BOTH' || (room.availableAcOptions?.includes('AC') && room.availableAcOptions?.includes('NON_AC'));
                            const defaultIsAc = room.isAcSelected ?? (room.acOption !== 'NON_AC_ONLY');
                            const isAc = roomAcSelections?.[rIdx] !== undefined ? roomAcSelections[rIdx] : defaultIsAc;

                            return (
                                <div
                                    key={rIdx}
                                    className="text-xs bg-muted/50 dark:bg-muted/30 border border-border/80 px-3 py-2 rounded-xl text-foreground flex items-center justify-between gap-2 flex-wrap"
                                >
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <BedDouble className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className="font-black text-foreground inline-flex items-center gap-1.5 flex-wrap">
                                            {allocatedRooms.length > 1 ? `Room ${rIdx + 1}: ` : ''}{room.roomTypeName}
                                            {room.roomNumber && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                                    #{room.roomNumber}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-muted-foreground font-medium">
                                            • {room.adults} Adult{room.adults > 1 ? 's' : ''}{room.children > 0 ? ` + ${room.children} Child${room.children > 1 ? 'ren' : ''}${childAgesStr}` : ''}{infantsStr}{extraStr}
                                        </span>
                                    </div>

                                    {/* AC Control: Toggle for BOTH, or static badge for AC_ONLY / NON_AC_ONLY */}
                                    <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                                        {hasBothAc ? (
                                            <div className="flex items-center bg-background p-0.5 rounded-lg border border-border shadow-2xs">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRoomAcToggle?.(rIdx, false);
                                                    }}
                                                    className={clsx(
                                                        "px-2 py-0.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer",
                                                        !isAc
                                                            ? "bg-emerald-600 text-white shadow-2xs"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    🍃 Non-AC
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onRoomAcToggle?.(rIdx, true);
                                                    }}
                                                    className={clsx(
                                                        "px-2 py-0.5 rounded-md text-[10px] font-black transition-all flex items-center gap-1 cursor-pointer",
                                                        isAc
                                                            ? "bg-cyan-600 text-white shadow-2xs"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    ❄️ AC
                                                </button>
                                            </div>
                                        ) : room.acOption === 'AC_ONLY' ? (
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/20 flex items-center gap-1">
                                                ❄️ AC Only
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                                                🍃 Non-AC
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Price & Selection Button */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-border/50 shrink-0">
                    <div className="text-left sm:text-right">
                        <div className="text-lg sm:text-xl font-black text-foreground">₹{Math.round(totalStayPrice).toLocaleString()}</div>
                        <div className="text-[10px] text-muted-foreground font-semibold">
                            ₹{Math.round(pricePerNight).toLocaleString()}/nt ({activeMealPlan})
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(solution);
                        }}
                        className={clsx(
                            "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-xs",
                            isSelected
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-muted hover:bg-primary hover:text-primary-foreground text-foreground"
                        )}
                    >
                        {isSelected ? (
                            <>
                                <CheckCircle className="h-3.5 w-3.5" /> Selected
                            </>
                        ) : (
                            'Select Solution'
                        )}
                    </button>
                </div>
            </div>

            {/* Interactive Meal Plan Tabs */}
            {solution.ratesByMealPlan && Object.keys(solution.ratesByMealPlan).length > 0 && (
                <div className="pt-2 border-t border-border/60">
                    <div className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span>Meal Plan Entitlement</span>
                        <span className="text-[10px] lowercase font-normal text-muted-foreground">tap tab to choose plan</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {[
                            { code: 'EP', label: 'Room Only', icon: '☕' },
                            { code: 'CP', label: 'Breakfast', icon: '🍳' },
                            { code: 'MAP', label: 'Half Board', icon: '🍽️' },
                            { code: 'AP', label: 'Full Board', icon: '👑' },
                        ].map((mp) => {
                            const mpRate = solution.ratesByMealPlan[mp.code];
                            const isMpActive = activeMealPlan === mp.code;
                            const mpTotal = mpRate ? Math.round(mpRate.totalPrice + acDelta) : null;
                            return (
                                <button
                                    key={mp.code}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onMealPlanChange?.(mp.code);
                                    }}
                                    className={clsx(
                                        "px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer",
                                        isMpActive
                                            ? "bg-primary/10 border-primary text-primary shadow-xs ring-1 ring-primary/30"
                                            : "bg-card/50 border-border hover:border-primary/40 text-foreground"
                                    )}
                                >
                                    <div className="flex items-center justify-between gap-1">
                                        <span className="text-xs font-black">{mp.icon} {mp.code}</span>
                                        {isMpActive && <CheckCircle className="h-3 w-3 text-primary shrink-0" />}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground font-medium truncate">{mp.label}</div>
                                    {mpTotal !== null && (
                                        <div className="text-[11px] font-bold text-foreground mt-0.5">
                                            ₹{mpTotal.toLocaleString()}
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AccommodationPackageCard;
