import React, { useState } from 'react';
import { DoorClosed, BedDouble, Users, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import type { RoomType } from '../../types/room';

interface RoomAssignmentSectionProps {
    selectedSolution: any;
    roomTypes: RoomType[] | undefined;
    solutionRoomAssignments: Record<number, string>;
    onAssignRoom: (roomIndex: number, roomId: string) => void;
}

export const RoomAssignmentSection: React.FC<RoomAssignmentSectionProps> = ({
    selectedSolution,
    roomTypes,
    solutionRoomAssignments,
    onAssignRoom,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const allocatedRooms = selectedSolution?.rooms || selectedSolution?.allocatedRooms || [];
    if (allocatedRooms.length === 0) return null;

    const assignedCount = Object.values(solutionRoomAssignments).filter(Boolean).length;

    return (
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden animate-in fade-in slide-in-from-top-2">
            {/* Collapsible Header Toggle */}
            <button
                type="button"
                onClick={() => setIsExpanded(prev => !prev)}
                className="w-full p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-left hover:bg-muted/30 transition-colors cursor-pointer select-none"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-primary/10 rounded-xl text-primary shrink-0">
                        <DoorClosed className="h-5 w-5" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-black text-foreground uppercase tracking-wider">
                                3. Physical Room Assignment ({allocatedRooms.length} Room{allocatedRooms.length > 1 ? 's' : ''})
                            </h3>
                            {assignedCount > 0 ? (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    {assignedCount}/{allocatedRooms.length} Specified
                                </span>
                            ) : (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                    Auto-Assign Active
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">
                            {isExpanded 
                                ? 'Select specific physical rooms from currently available inventory for these dates.'
                                : 'Rooms are auto-assigned upon confirmation. Click to expand and choose specific room numbers.'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span className="text-[11px] font-bold text-primary hover:underline">
                        {isExpanded ? 'Collapse' : 'Customize Rooms'}
                    </span>
                    <div className="p-1 rounded-lg bg-muted border border-border">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </div>
            </button>

            {/* Expandable Content Body */}
            {isExpanded && (
                <div className="p-5 sm:p-6 pt-0 border-t border-border/60 space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pt-4">
                        <span className="text-[11px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-lg border border-border">
                            Logical Allocation → Physical Door Key
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                            Only unoccupied, non-blocked rooms are displayed below
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allocatedRooms.map((room: any, rIdx: number) => {
                            // Backend-driven available rooms list for this stay package
                            const backendAvailableRooms = room.availableRooms || selectedSolution.availableRoomsByRoomType?.[room.roomTypeId];
                            const rt = roomTypes?.find(r => r.id === room.roomTypeId);
                            const selectableRooms: any[] = (backendAvailableRooms && backendAvailableRooms.length > 0)
                                ? backendAvailableRooms
                                : (rt?.rooms?.filter((r: any) => r.isEnabled) || []);

                            const childAgesStr = room.childAges && room.childAges.length > 0 ? ` (Ages: ${room.childAges.join(', ')})` : '';
                            const infantsStr = room.infants && room.infants > 0 ? `, ${room.infants} Infant${room.infants > 1 ? 's' : ''}` : '';
                            const extraStr = room.extraAdults > 0 ? ` (+${room.extraAdults} Extra Bed)` : '';
                            const currentAssignedId = solutionRoomAssignments[rIdx] || '';

                            return (
                                <div 
                                    key={rIdx} 
                                    className="p-4 rounded-xl border border-border bg-background/80 flex flex-col justify-between gap-3 shadow-xs"
                                >
                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-black uppercase text-primary tracking-wider flex items-center gap-1.5">
                                                <BedDouble className="h-4 w-4" /> Room {rIdx + 1}: {room.roomTypeName}
                                            </span>
                                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border">
                                                {room.adults + (room.children || 0)} Guests
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 bg-muted/40 p-2 rounded-lg border border-border/50">
                                            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span>
                                                <strong>Logical:</strong> {room.adults} Adult{room.adults > 1 ? 's' : ''}{room.children > 0 ? `, ${room.children} Child${room.children > 1 ? 'ren' : ''}${childAgesStr}` : ''}{infantsStr}{extraStr}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10.5px] font-black uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                                            <span>Assign Physical Room:</span>
                                            {Boolean(currentAssignedId && selectableRooms.some((er: any) => er.id === currentAssignedId)) ? (
                                                <span className="text-emerald-600 font-bold flex items-center gap-1">
                                                    <CheckCircle2 className="h-3 w-3" /> Specific Room Assigned
                                                </span>
                                            ) : (
                                                <span className="text-amber-600 font-bold">Auto-Assign (First Available)</span>
                                            )}
                                        </label>
                                        <select
                                            value={selectableRooms.some((er: any) => er.id === currentAssignedId) ? currentAssignedId : ''}
                                            onChange={(e) => onAssignRoom(rIdx, e.target.value)}
                                            className="w-full text-xs font-bold border border-input bg-card text-foreground rounded-xl px-3 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
                                        >
                                            <option value="">Auto-Assign (First Available)</option>
                                            {selectableRooms.map((er: any) => {
                                                const isAssignedToOther = Object.entries(solutionRoomAssignments).some(
                                                    ([otherIdx, otherId]) => Number(otherIdx) !== rIdx && otherId === er.id
                                                );
                                                return (
                                                    <option key={er.id} value={er.id} disabled={isAssignedToOther}>
                                                        Room #{er.roomNumber} ({er.name || 'Standard'}){isAssignedToOther ? ' — (Assigned to other room)' : ''}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <p className="text-[11px] text-muted-foreground italic pt-1">
                        * Note: Changing the physical room number assigns the physical door key and does not modify the party solver's logical occupancy.
                    </p>
                </div>
            )}
        </div>
    );
};

export default RoomAssignmentSection;
