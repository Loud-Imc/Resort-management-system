import React, { useState } from 'react';
import { Building2, ChevronDown, ChevronUp, AlertCircle, CheckCircle } from 'lucide-react';
import clsx from 'clsx';
import { canRoomTypeFitParty } from '../../utils/occupancy';

interface PropertyInventoryReferenceProps {
    roomTypesList: any[];
    selectedRoomTypeId: string | undefined;
    hasValidSolutions: boolean;
    adultsCount: number;
    childrenCount: number;
    infantsCount: number;
    onSelectRoomType: (roomTypeId: string) => void;
}

export const PropertyInventoryReference: React.FC<PropertyInventoryReferenceProps> = ({
    roomTypesList,
    selectedRoomTypeId,
    hasValidSolutions,
    adultsCount,
    childrenCount,
    infantsCount,
    onSelectRoomType,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [warningId, setWarningId] = useState<string | null>(null);

    if (!roomTypesList || roomTypesList.length === 0) return null;

    return (
        <div className="rounded-2xl border border-border bg-card/60 overflow-hidden transition-all">
            <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="w-full p-4 flex items-center justify-between text-left hover:bg-muted/40 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-muted rounded-lg text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                            Property Room Inventory ({roomTypesList.length} Room Types)
                        </h4>
                        <p className="text-[11px] text-muted-foreground font-medium">
                            Operational inventory status & single-room capacity reference
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        {isExpanded ? 'Hide Inventory' : 'View Inventory'}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="p-4 pt-0 border-t border-border/60 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        {roomTypesList.map((rt) => {
                            const isSelected = selectedRoomTypeId === rt.id;
                            const physAdults = rt.maxPhysicalAdults ?? rt.maxAdults ?? 2;
                            const physChildren = rt.maxPhysicalChildren ?? rt.maxChildren ?? 0;
                            const canFitSingle = canRoomTypeFitParty(rt, {
                                adults: adultsCount,
                                children: childrenCount,
                                infants: infantsCount,
                            });
                            const isPhysicalSoldOut = Boolean(rt.availableCount === 0 || (rt.isSoldOut && rt.availableCount === 0));
                            const isPartyIncompatible = Boolean(
                                rt.isPartyIncompatible || (!isPhysicalSoldOut && !canFitSingle && !hasValidSolutions)
                            );
                            const isSoldOut = isPhysicalSoldOut;
                            const showWarning = (isSoldOut || isPartyIncompatible) && warningId === rt.id;

                            return (
                                <div
                                    key={rt.id}
                                    className={clsx(
                                        "p-3.5 rounded-xl border transition-all flex flex-col justify-between gap-2.5",
                                        isSelected
                                            ? "bg-primary/5 border-primary ring-1 ring-primary/20"
                                            : isSoldOut
                                                ? "bg-muted/20 border-rose-500/20 opacity-80"
                                                : isPartyIncompatible
                                                    ? "bg-card/70 border-amber-500/25"
                                                    : !canFitSingle
                                                        ? "bg-card/70 border-amber-500/30"
                                                        : "bg-background border-border"
                                    )}
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h5 className="text-xs font-black text-foreground">{rt.name}</h5>
                                                <p className="text-[10px] text-muted-foreground font-medium">
                                                    Max Single Cap: {physAdults} Adults, {physChildren} Children
                                                </p>
                                            </div>
                                            <span
                                                className={clsx(
                                                    "text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0",
                                                    isSoldOut
                                                        ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                                                        : isPartyIncompatible
                                                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                            : !canFitSingle && hasValidSolutions
                                                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                                : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                                )}
                                            >
                                                {isSoldOut
                                                    ? 'Sold Out'
                                                    : isPartyIncompatible
                                                        ? 'Cannot Accommodate Party'
                                                        : !canFitSingle && hasValidSolutions
                                                            ? 'Multi-Room Req.'
                                                            : `${rt.availableCount ?? (rt.rooms?.length || 1)} Available`}
                                            </span>
                                        </div>

                                        {showWarning && (
                                            <div className="p-2 rounded-lg bg-muted border border-border text-[10.5px] text-muted-foreground flex items-start gap-1.5">
                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                                                <span>
                                                    {isSoldOut
                                                        ? 'No physical rooms currently available for the selected dates.'
                                                        : `Has ${rt.availableCount ?? 1} rooms available, but cannot fit party in a single room under capacity rules.`}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                                        <div className="text-xs font-bold text-foreground">
                                            ₹{Number(rt.basePrice || 0).toLocaleString()}<span className="text-[9px] text-muted-foreground font-normal">/nt</span>
                                        </div>
                                        {canFitSingle && !isSoldOut && !isPartyIncompatible && (
                                            <button
                                                type="button"
                                                onClick={() => onSelectRoomType(rt.id)}
                                                className={clsx(
                                                    "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer",
                                                    isSelected
                                                        ? "bg-primary text-primary-foreground"
                                                        : "bg-muted hover:bg-primary hover:text-primary-foreground text-foreground"
                                                )}
                                            >
                                                {isSelected ? <><CheckCircle className="h-3 w-3" /> Selected</> : 'Select'}
                                            </button>
                                        )}
                                        {(!canFitSingle || isSoldOut || isPartyIncompatible) && (
                                            <button
                                                type="button"
                                                onClick={() => setWarningId(prev => prev === rt.id ? null : rt.id)}
                                                className="text-[10px] font-bold text-muted-foreground hover:text-foreground cursor-pointer underline"
                                            >
                                                {showWarning ? 'Hide Info' : 'Details'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyInventoryReference;
