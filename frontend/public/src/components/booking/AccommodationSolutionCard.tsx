import React, { useState } from 'react';
import { AccommodationSolution, AllocatedRoomItem } from '../../types';
import { Users, Bed, Sparkles, ChevronDown, ChevronUp, CheckCircle2, Baby } from 'lucide-react';
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

    const pricePerNight = solution.pricing.pricePerNight;
    const totalPrice = solution.pricing.totalPrice;

    return (
        <div className={`relative bg-white dark:bg-gray-800 rounded-3xl border transition-all duration-300 overflow-hidden shadow-sm hover:shadow-xl ${
            solution.isRecommended ? 'border-primary-500 ring-2 ring-primary-500/20 shadow-md' : 'border-gray-200 dark:border-gray-700'
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

            <div className="p-5 md:p-7">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Package Title & Composition */}
                    <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border border-primary-200/60 dark:border-primary-800/40">
                                <Bed className="w-3.5 h-3.5 text-primary-600" />
                                {solution.totalRooms} {solution.totalRooms === 1 ? 'Room Total' : 'Rooms Package'}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                <Users className="w-3.5 h-3.5 text-gray-500" />
                                {totalAdults} {totalAdults === 1 ? 'Adult' : 'Adults'}
                                {totalChildren > 0 && `, ${totalChildren} ${totalChildren === 1 ? 'Child' : 'Children'}`}
                                {totalInfants > 0 && `, ${totalInfants} Infant`}
                            </span>
                            {totalInfants > 0 && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <Baby className="w-3 h-3 text-emerald-600" />
                                    Infant Included
                                </span>
                            )}
                        </div>

                        <h4 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                            {headline}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Complete accommodation solution physically optimized to comfortably host all {totalAdults + totalChildren} guests.
                        </p>
                    </div>

                    {/* Right: Pricing & CTA */}
                    <div className="flex flex-row lg:flex-col items-center lg:items-end justify-between lg:justify-center border-t lg:border-t-0 pt-4 lg:pt-0 border-gray-100 dark:border-gray-700">
                        <div className="text-left lg:text-right">
                            <div className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                {formatPrice(pricePerNight, selectedCurrency, rates)}
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400"> /night</span>
                            </div>
                            {nights > 1 && (
                                <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-0.5">
                                    Total: {formatPrice(totalPrice, selectedCurrency, rates)} ({nights} nights)
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => onSelect(solution)}
                            className="mt-0 lg:mt-3 px-6 py-3 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-black rounded-2xl text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2 cursor-pointer shrink-0"
                        >
                            <CheckCircle2 className="w-4.5 h-4.5" />
                            Book This Package
                        </button>
                    </div>
                </div>

                {/* Allocated Rooms Summary List with View Details button */}
                <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <Bed className="w-4 h-4 text-primary-500" />
                            Included Rooms & Guest Distribution ({solution.rooms.length})
                        </span>
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-xs font-bold text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                            {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse</> : <><ChevronDown className="w-3.5 h-3.5" /> Expand Details</>}
                        </button>
                    </div>

                    {isExpanded && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                            {solution.rooms.map((room, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 bg-gray-50/90 dark:bg-gray-900/40 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 flex flex-col justify-between gap-3 group"
                                >
                                    <div>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-primary-600 dark:text-primary-400">
                                                    Room {idx + 1}
                                                </span>
                                                <h5 className="font-black text-sm text-gray-900 dark:text-white">
                                                    {room.roomTypeName}
                                                </h5>
                                            </div>
                                            <span className="text-xs font-black text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xs">
                                                {formatPrice(room.totalPricePerNight, selectedCurrency, rates)}/nt
                                            </span>
                                        </div>

                                        <div className="mt-2 text-xs font-medium text-gray-600 dark:text-gray-300 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Users className="w-3.5 h-3.5 text-gray-400" />
                                                <span>
                                                    Assigned: <strong>{room.adults} Adults</strong>
                                                    {room.children > 0 && <>, <strong>{room.children} Ch</strong></>}
                                                    {room.infants > 0 && <>, <strong>{room.infants} Inf</strong></>}
                                                </span>
                                            </div>
                                            {(room.extraAdults > 0 || room.extraChildren > 0) && (
                                                <span className="inline-block text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800/40">
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
                                            className="w-full py-2 px-3 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-primary-600 dark:text-primary-400 hover:text-primary-700 text-xs font-black uppercase tracking-wider border border-gray-200 dark:border-gray-700 transition-all flex items-center justify-center gap-1.5 shadow-2xs hover:shadow-xs cursor-pointer"
                                        >
                                            View Room Details & Photos
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccommodationSolutionCard;
