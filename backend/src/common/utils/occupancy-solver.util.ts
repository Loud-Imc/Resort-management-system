/**
 * Pure Occupancy & Accommodation Solver Engine
 *
 * Implements Candidate Room-Set Generation + Deterministic Bounded Backtracking Partition Solver.
 *
 * Core Principles:
 * 1. Physical room rules:
 *    - Adults >= 1 per room
 *    - Adults <= maxPhysicalAdults
 *    - Children <= maxPhysicalChildren
 *    - Adults + Children <= maxPhysicalCapacity (maxPhysicalAdults + maxPhysicalChildren)
 *    - Infants <= maxPhysicalInfants
 * 2. Infants are an independent guest dimension (do not consume standard bed capacity and are free).
 * 3. Supports single room, multi-room (same type), and mixed-room types.
 * 4. Deterministic Backtracking: guarantees finding valid partitions for heterogeneous/asymmetric room types.
 * 5. Distinct room-type multisets (A+B and B+A are deduplicated).
 * 6. Respects physical inventory quantities per room type.
 */

export interface GuestParty {
    adults: number;          // A >= 1
    children: number;        // C >= 0
    infants: number;         // I >= 0
    requestedRooms?: number; // Optional preference/ranking signal
}

export interface RoomTypeInventoryCandidate {
    id: string;
    name: string;
    baseAdults: number;
    baseChildren: number;
    maxPhysicalAdults: number;
    maxPhysicalChildren: number;
    maxPhysicalCapacity?: number; // defaults to maxPhysicalAdults + maxPhysicalChildren
    maxPhysicalInfants: number;
    basePrice?: number;
    extraAdultPrice?: number;
    extraChildPrice?: number;
    availableQuantity: number;    // Physical rooms available for entire stay
}

export interface AllocatedRoom {
    roomTypeId: string;
    roomTypeName: string;
    adults: number;
    children: number;
    infants: number;
    baseAdults: number;
    baseChildren: number;
    maxPhysicalAdults: number;
    maxPhysicalChildren: number;
    maxPhysicalCapacity: number;
    maxPhysicalInfants: number;
    extraAdults: number;
    extraChildren: number;
    basePricePerNight?: number;
    extraAdultChargePerNight?: number;
    extraChildChargePerNight?: number;
    totalPricePerNight?: number;
}

export interface SolverAccommodationSolution {
    solutionId: string;
    totalRooms: number;
    isRequestedRoomCountMatch: boolean;
    roomTypeCounts: Record<string, number>;
    roomTypeBreakdown: Array<{ roomTypeId: string; roomTypeName: string; count: number }>;
    rooms: AllocatedRoom[];
    totalGuests: {
        adults: number;
        children: number;
        infants: number;
    };
    pricingSummary?: {
        baseTotal: number;
        extraAdultTotal: number;
        extraChildTotal: number;
        infantTotal: 0;
        totalPerNight: number;
    };
}

/**
 * Validates whether a single room satisfies physical occupancy rules.
 */
export function isPhysicalRoomAllocationValid(
    allocation: { adults: number; children: number; infants?: number },
    roomLimits: {
        maxPhysicalAdults: number;
        maxPhysicalChildren: number;
        maxPhysicalCapacity?: number;
        maxPhysicalInfants: number;
    }
): boolean {
    const a = allocation.adults;
    const c = allocation.children;
    const i = allocation.infants ?? 0;
    const maxA = roomLimits.maxPhysicalAdults;
    const maxC = roomLimits.maxPhysicalChildren;
    const totalCap = roomLimits.maxPhysicalCapacity ?? (maxA + maxC);
    const maxI = roomLimits.maxPhysicalInfants;

    if (a < 1) return false;
    if (a > maxA) return false;
    if (c < 0 || c > maxC) return false;
    if (a + c > totalCap) return false;
    if (i < 0 || i > maxI) return false;

    return true;
}

/**
 * Deterministic Bounded Backtracking Partition Solver.
 * Attempts to partition remainingAdults and remainingChildren across candidate rooms.
 */
function backtrackPartition(
    candidateRooms: RoomTypeInventoryCandidate[],
    remainingAdults: number,
    remainingChildren: number,
    roomIdx: number,
    currentAllocations: Array<{ adults: number; children: number }>
): Array<{ adults: number; children: number }> | null {
    const totalRooms = candidateRooms.length;

    // Base condition: all rooms processed
    if (roomIdx === totalRooms) {
        if (remainingAdults === 0 && remainingChildren === 0) {
            return currentAllocations;
        }
        return null;
    }

    const room = candidateRooms[roomIdx];
    const remainingRoomsAfterThis = totalRooms - 1 - roomIdx;

    // Rule: Every room requires at least 1 adult
    const minAdults = 1;
    // We must reserve at least 1 adult for each remaining room
    const maxAdultsPossible = remainingAdults - remainingRoomsAfterThis;
    const maxAdultsForThisRoom = Math.min(room.maxPhysicalAdults, maxAdultsPossible);

    if (maxAdultsForThisRoom < minAdults) {
        return null; // Not enough adults left to give >= 1 to all remaining rooms
    }

    const roomMaxCap = room.maxPhysicalCapacity ?? (room.maxPhysicalAdults + room.maxPhysicalChildren);

    // Explore adult allocation from highest to lowest
    for (let a = maxAdultsForThisRoom; a >= minAdults; a--) {
        const maxChildrenForThisRoom = Math.min(
            remainingChildren,
            room.maxPhysicalChildren,
            roomMaxCap - a
        );

        // Explore child allocation from highest to lowest
        for (let c = maxChildrenForThisRoom; c >= 0; c--) {
            currentAllocations.push({ adults: a, children: c });

            const result = backtrackPartition(
                candidateRooms,
                remainingAdults - a,
                remainingChildren - c,
                roomIdx + 1,
                currentAllocations
            );

            if (result !== null) {
                return result; // Solution found!
            }

            currentAllocations.pop(); // Backtrack
        }
    }

    return null;
}

/**
 * Generates distinct multisets of room types of size K.
 * Avoids permutation duplicates (e.g., [A, B] and [B, A] are the same multiset).
 * Respects availableQuantity for each room type.
 */
function generateDistinctRoomMultisets(
    availableRoomTypes: RoomTypeInventoryCandidate[],
    targetSize: number,
    typeIdx = 0,
    currentMultiset: RoomTypeInventoryCandidate[] = [],
    usedCounts: Record<string, number> = {}
): RoomTypeInventoryCandidate[][] {
    if (currentMultiset.length === targetSize) {
        return [[...currentMultiset]];
    }

    if (typeIdx >= availableRoomTypes.length) {
        return [];
    }

    const results: RoomTypeInventoryCandidate[][] = [];
    const currentType = availableRoomTypes[typeIdx];
    const alreadyUsed = usedCounts[currentType.id] || 0;
    const maxCanTake = Math.min(
        currentType.availableQuantity - alreadyUsed,
        targetSize - currentMultiset.length
    );

    // Branch 1..maxCanTake copies of currentType
    for (let count = maxCanTake; count >= 0; count--) {
        const addedRooms: RoomTypeInventoryCandidate[] = [];
        for (let i = 0; i < count; i++) {
            addedRooms.push(currentType);
            currentMultiset.push(currentType);
        }
        usedCounts[currentType.id] = alreadyUsed + count;

        const subResults = generateDistinctRoomMultisets(
            availableRoomTypes,
            targetSize,
            typeIdx + 1,
            currentMultiset,
            usedCounts
        );
        results.push(...subResults);

        // Cleanup
        for (let i = 0; i < count; i++) {
            currentMultiset.pop();
        }
        usedCounts[currentType.id] = alreadyUsed;
    }

    return results;
}

/**
 * Pure Accommodation Solver Engine
 *
 * Takes a guest party and available room types with physical inventory,
 * and returns all valid accommodation solutions.
 */
export function solveAccommodationOptions(
    party: GuestParty,
    roomTypes: RoomTypeInventoryCandidate[]
): SolverAccommodationSolution[] {
    const adults = Number(party.adults) || 0;
    const children = Number(party.children) || 0;
    const infants = Number(party.infants) || 0;
    const requestedRooms = party.requestedRooms && party.requestedRooms >= 1 ? Number(party.requestedRooms) : undefined;

    // Boundary check: At least 1 adult is mandatory for any booking
    if (adults < 1) {
        return [];
    }

    // Filter room types with available physical inventory > 0
    const availableTypes = roomTypes
        .filter((rt) => rt.availableQuantity > 0 && rt.maxPhysicalAdults >= 1)
        .map((rt) => ({
            ...rt,
            maxPhysicalCapacity: rt.maxPhysicalCapacity ?? (rt.maxPhysicalAdults + rt.maxPhysicalChildren),
        }));

    if (availableTypes.length === 0) {
        return [];
    }

    const totalAvailableRooms = availableTypes.reduce((acc, rt) => acc + rt.availableQuantity, 0);
    // Bounded search: A booking can occupy at most adults count (each room needs >= 1 adult)
    // and cannot exceed total physical rooms available.
    const maxRoomsToSearch = Math.min(adults, totalAvailableRooms);

    const solutions: SolverAccommodationSolution[] = [];
    const seenSolutionKeys = new Set<string>();

    for (let k = 1; k <= maxRoomsToSearch; k++) {
        const multisets = generateDistinctRoomMultisets(availableTypes, k);

        for (const candidateRooms of multisets) {
            // Gross feasibility checks before backtracking
            const sumMaxAdults = candidateRooms.reduce((acc, r) => acc + r.maxPhysicalAdults, 0);
            const sumMaxChildren = candidateRooms.reduce((acc, r) => acc + r.maxPhysicalChildren, 0);
            const sumMaxCap = candidateRooms.reduce((acc, r) => acc + (r.maxPhysicalCapacity ?? (r.maxPhysicalAdults + r.maxPhysicalChildren)), 0);
            const sumMaxInfants = candidateRooms.reduce((acc, r) => acc + r.maxPhysicalInfants, 0);

            if (sumMaxAdults < adults || sumMaxChildren < children || sumMaxCap < (adults + children) || sumMaxInfants < infants) {
                continue; // Physically impossible for this multiset
            }

            // Execute deterministic backtracking
            const partition = backtrackPartition(candidateRooms, adults, children, 0, []);

            if (partition !== null) {
                // Distribute infants across rooms up to each room's maxPhysicalInfants
                let remainingInfantsToPlace = infants;
                const infantAllocations: number[] = [];
                for (const r of candidateRooms) {
                    const placeInThisRoom = Math.min(remainingInfantsToPlace, r.maxPhysicalInfants);
                    infantAllocations.push(placeInThisRoom);
                    remainingInfantsToPlace -= placeInThisRoom;
                }

                if (remainingInfantsToPlace > 0) {
                    continue; // Infant cot limit exceeded
                }

                // Construct allocated rooms & pricing inputs
                const allocatedRooms: AllocatedRoom[] = candidateRooms.map((r, idx) => {
                    const alloc = partition[idx];
                    const inf = infantAllocations[idx];
                    const extraA = Math.max(0, alloc.adults - r.baseAdults);
                    const extraC = Math.max(0, alloc.children - r.baseChildren);

                    const basePrice = r.basePrice ?? 0;
                    const extraAPrice = r.extraAdultPrice ?? 0;
                    const extraCPrice = r.extraChildPrice ?? 0;

                    const extraACharge = extraA * extraAPrice;
                    const extraCCharge = extraC * extraCPrice;
                    const totalRoomPrice = basePrice + extraACharge + extraCCharge;

                    return {
                        roomTypeId: r.id,
                        roomTypeName: r.name,
                        adults: alloc.adults,
                        children: alloc.children,
                        infants: inf,
                        baseAdults: r.baseAdults,
                        baseChildren: r.baseChildren,
                        maxPhysicalAdults: r.maxPhysicalAdults,
                        maxPhysicalChildren: r.maxPhysicalChildren,
                        maxPhysicalCapacity: r.maxPhysicalCapacity!,
                        maxPhysicalInfants: r.maxPhysicalInfants,
                        extraAdults: extraA,
                        extraChildren: extraC,
                        basePricePerNight: basePrice,
                        extraAdultChargePerNight: extraACharge,
                        extraChildChargePerNight: extraCCharge,
                        totalPricePerNight: totalRoomPrice,
                    };
                });

                // Compute roomTypeCounts & unique key
                const roomTypeCounts: Record<string, number> = {};
                const roomTypeBreakdownMap = new Map<string, { roomTypeId: string; roomTypeName: string; count: number }>();

                for (const room of allocatedRooms) {
                    roomTypeCounts[room.roomTypeId] = (roomTypeCounts[room.roomTypeId] || 0) + 1;
                    if (!roomTypeBreakdownMap.has(room.roomTypeId)) {
                        roomTypeBreakdownMap.set(room.roomTypeId, {
                            roomTypeId: room.roomTypeId,
                            roomTypeName: room.roomTypeName,
                            count: 0,
                        });
                    }
                    roomTypeBreakdownMap.get(room.roomTypeId)!.count += 1;
                }

                // Unique key based on sorted room types and their assigned guest counts
                const canonicalKey = Object.entries(roomTypeCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([typeId, cnt]) => `${typeId}:${cnt}`)
                    .join('|');

                if (seenSolutionKeys.has(canonicalKey)) {
                    continue; // Skip duplicate room-set combination
                }
                seenSolutionKeys.add(canonicalKey);

                // Pricing Summary
                const baseTotal = allocatedRooms.reduce((acc, r) => acc + (r.basePricePerNight || 0), 0);
                const extraAdultTotal = allocatedRooms.reduce((acc, r) => acc + (r.extraAdultChargePerNight || 0), 0);
                const extraChildTotal = allocatedRooms.reduce((acc, r) => acc + (r.extraChildChargePerNight || 0), 0);
                const totalPerNight = baseTotal + extraAdultTotal + extraChildTotal;

                const isRequestedRoomCountMatch = requestedRooms !== undefined ? k === requestedRooms : false;

                solutions.push({
                    solutionId: `sol-${canonicalKey}-${k}`,
                    totalRooms: k,
                    isRequestedRoomCountMatch,
                    roomTypeCounts,
                    roomTypeBreakdown: Array.from(roomTypeBreakdownMap.values()),
                    rooms: allocatedRooms,
                    totalGuests: {
                        adults,
                        children,
                        infants,
                    },
                    pricingSummary: {
                        baseTotal,
                        extraAdultTotal,
                        extraChildTotal,
                        infantTotal: 0,
                        totalPerNight,
                    },
                });
            }
        }
    }

    // Sort solutions:
    // 1. Requested room count match first (if requestedRooms was provided)
    // 2. Fewer rooms first (more compact)
    // 3. Lowest total price per night first
    return solutions.sort((a, b) => {
        if (requestedRooms !== undefined) {
            if (a.isRequestedRoomCountMatch && !b.isRequestedRoomCountMatch) return -1;
            if (!a.isRequestedRoomCountMatch && b.isRequestedRoomCountMatch) return 1;
        }
        if (a.totalRooms !== b.totalRooms) {
            return a.totalRooms - b.totalRooms;
        }
        return (a.pricingSummary?.totalPerNight || 0) - (b.pricingSummary?.totalPerNight || 0);
    });
}
