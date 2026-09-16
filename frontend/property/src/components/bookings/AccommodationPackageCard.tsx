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
}

interface AccommodationPackageCardProps {
    solution: any;
    isSelected: boolean;
    adultsCount: number;
    childrenCount: number;
    onSelect: (solution: any) => void;
}

interface RoomTypeGroup {
    roomTypeId: string;
    roomTypeName: string;
    totalRoomsOfType: number;
    allocations: Array<{
        count: number;
        adults: number;
        children: number;
        childAges?: number[];
        infants?: number;
        extraAdults?: number;
        extraChildren?: number;
    }>;
}

export const AccommodationPackageCard: React.FC<AccommodationPackageCardProps> = ({
    solution,
    isSelected,
    adultsCount,
    childrenCount,
    onSelect,
}) => {
    const allocatedRooms: AllocatedRoom[] = solution.rooms || solution.allocatedRooms || [];
    const totalRoomsCount = solution.totalRooms || solution.totalRoomsCount || allocatedRooms.length;

    // Group identical rooms by roomType and logical allocation
    const groupedRooms = useMemo<RoomTypeGroup[]>(() => {
        const typeMap = new Map<string, RoomTypeGroup>();

        allocatedRooms.forEach(room => {
            const typeKey = room.roomTypeId || room.roomTypeName;
            if (!typeMap.has(typeKey)) {
                typeMap.set(typeKey, {
                    roomTypeId: room.roomTypeId,
                    roomTypeName: room.roomTypeName,
                    totalRoomsOfType: 0,
                    allocations: [],
                });
            }

            const group = typeMap.get(typeKey)!;
            group.totalRoomsOfType += 1;

            const childAgesKey = (room.childAges || []).slice().sort().join(',');
            const allocKey = `${room.adults}_${room.children || 0}_${childAgesKey}_${room.infants || 0}_${room.extraAdults || 0}_${room.extraChildren || 0}`;

            const existingAlloc = group.allocations.find(a => {
                const aChildKey = (a.childAges || []).slice().sort().join(',');
                const aKey = `${a.adults}_${a.children || 0}_${aChildKey}_${a.infants || 0}_${a.extraAdults || 0}_${a.extraChildren || 0}`;
                return aKey === allocKey;
            });

            if (existingAlloc) {
                existingAlloc.count += 1;
            } else {
                group.allocations.push({
                    count: 1,
                    adults: room.adults,
                    children: room.children || 0,
                    childAges: room.childAges,
                    infants: room.infants,
                    extraAdults: room.extraAdults,
                    extraChildren: room.extraChildren,
                });
            }
        });

        return Array.from(typeMap.values());
    }, [allocatedRooms]);

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
    const totalStayPrice = solution.pricing?.totalPrice ?? solution.pricingSummary?.grandTotal ?? 0;
    const pricePerNight = solution.pricing?.pricePerNight ?? (
        totalStayPrice / (solution.pricing?.numberOfNights || solution.pricing?.nights || 1)
    );

    return (
        <div
            onClick={() => onSelect(solution)}
            className={clsx(
                "p-4 sm:p-5 rounded-2xl border-2 transition-all cursor-pointer shadow-xs select-none",
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
                    </div>

                    {/* Grouped Room Composition Breakdown */}
                    <div className="space-y-2 pt-0.5">
                        {groupedRooms.map((group, gIdx) => {
                            // Single allocation type for this room type
                            if (group.allocations.length === 1) {
                                const alloc = group.allocations[0];
                                const childAgesStr = alloc.childAges && alloc.childAges.length > 0
                                    ? ` (Age${alloc.childAges.length > 1 ? 's' : ''} ${alloc.childAges.join(', ')})`
                                    : '';
                                const infantsStr = alloc.infants && alloc.infants > 0 ? `, ${alloc.infants} Infant${alloc.infants > 1 ? 's' : ''}` : '';
                                const extraStr = alloc.extraAdults && alloc.extraAdults > 0 ? ` (+${alloc.extraAdults} Extra Bed)` : '';

                                return (
                                    <div
                                        key={gIdx}
                                        className="text-xs bg-muted/50 dark:bg-muted/30 border border-border/80 px-3 py-2 rounded-xl text-foreground flex items-center gap-2 flex-wrap"
                                    >
                                        <BedDouble className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span className="font-black text-foreground">
                                            {group.totalRoomsOfType > 1 ? `${group.totalRoomsOfType} × ` : ''}{group.roomTypeName}
                                        </span>
                                        <span className="text-muted-foreground font-medium">
                                            • {alloc.adults} Adult{alloc.adults > 1 ? 's' : ''}{alloc.children > 0 ? ` + ${alloc.children} Child${alloc.children > 1 ? 'ren' : ''}${childAgesStr}` : ''}{infantsStr}{extraStr}
                                        </span>
                                    </div>
                                );
                            }

                            // Multiple different allocations for the same room type
                            return (
                                <div
                                    key={gIdx}
                                    className="text-xs bg-muted/50 dark:bg-muted/30 border border-border/80 p-2.5 rounded-xl text-foreground space-y-1.5"
                                >
                                    <div className="flex items-center gap-2 font-black text-foreground">
                                        <BedDouble className="h-3.5 w-3.5 text-primary shrink-0" />
                                        <span>{group.roomTypeName} ({group.totalRoomsOfType} Rooms)</span>
                                    </div>
                                    <div className="pl-5 space-y-1 text-xs text-muted-foreground font-medium">
                                        {group.allocations.map((alloc, aIdx) => {
                                            const childAgesStr = alloc.childAges && alloc.childAges.length > 0
                                                ? ` (Age${alloc.childAges.length > 1 ? 's' : ''} ${alloc.childAges.join(', ')})`
                                                : '';
                                            const infantsStr = alloc.infants && alloc.infants > 0 ? `, ${alloc.infants} Infant${alloc.infants > 1 ? 's' : ''}` : '';
                                            const extraStr = alloc.extraAdults && alloc.extraAdults > 0 ? ` (+${alloc.extraAdults} Extra Bed)` : '';

                                            return (
                                                <div key={aIdx} className="flex items-center gap-1.5">
                                                    <span>• {alloc.count} {alloc.count > 1 ? 'rooms' : 'room'} — {alloc.adults} Adult{alloc.adults > 1 ? 's' : ''}{alloc.children > 0 ? ` + ${alloc.children} Child${alloc.children > 1 ? 'ren' : ''}${childAgesStr}` : ''}{infantsStr}{extraStr}</span>
                                                </div>
                                            );
                                        })}
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
                            ₹{Math.round(pricePerNight).toLocaleString()}/nt (Total Stay)
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
        </div>
    );
};

export default AccommodationPackageCard;
