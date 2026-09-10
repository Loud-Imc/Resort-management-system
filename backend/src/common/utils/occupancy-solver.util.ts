/**
 * Canonical Occupancy & Accommodation Solver Engine (V2)
 *
 * Single Mathematical Authority for:
 * 1. Physical Feasibility Validation: <P_A, P_C, M, P_I>
 * 2. Headcount Base Rate Allocation: B (flexible A+C headcount)
 * 3. Base Rate Demographic Pricing Caps: bMA, bMC
 * 4. Free Children Exemption: FC (ages 2–6)
 * 5. Infant Cot Independence: P_I (ages 0–2, ₹0, decoupled)
 * 6. Mixed Excess Headcount Rule: (A+C > B) charged as Extra Adult
 * 7. Multi-Room Combinatorial Generation & Deterministic Bounded Backtracking
 * 8. Deterministic 4-Tier Solution Ranking & "Best Value" Recommendation
 */

export interface GuestParty {
    adults: number;          // A >= 1
    children: number;        // C >= 0 (ages 2–6)
    infants: number;         // I >= 0 (ages 0–2)
    requestedRooms?: number; // Optional preference/ranking signal
}

export interface CanonicalRoomLimits {
    totalMaxOccupancy: number;   // M: Hard physical capacity (A+C)
    maxPhysicalAdults: number;   // P_A: Physical adult bed limit
    maxPhysicalChildren: number; // P_C: Physical child bed limit
    maxPhysicalInfants: number;  // P_I: Dedicated infant cot limit
}

export interface CanonicalRoomPricingConfig extends CanonicalRoomLimits {
    totalBaseOccupancy: number;      // B: Included standard guests in base price
    baseMaxAdults?: number | null;   // bMA: Optional base adult pricing cap
    baseMaxChildren?: number | null; // bMC: Optional base child pricing cap
    freeChildrenCount?: number;      // FC: Free children count (ages 2–6)
    basePrice?: number;
    extraAdultPrice?: number;
    extraChildPrice?: number;
}

export interface FeasibilityResult {
    isValid: boolean;
    violations: string[];
}

export interface SurchargeBreakdown {
    isFeasible: boolean;
    violations?: string[];
    baseGuestsCovered: number;
    baseAdultsCovered: number;
    baseChildrenCovered: number;
    extraAdultsCount: number;
    extraChildrenCount: number;
    freeChildrenCount: number;
    extraAdultAmount: number;
    extraChildAmount: number;
    totalExtraAmount: number;
    basePrice?: number;
    totalPrice?: number;
}

export interface RoomTypeInventoryCandidate extends CanonicalRoomPricingConfig {
    id: string;
    name: string;
    availableQuantity: number;

    // Optional legacy fields for backward compatibility
    baseAdults?: number;
    baseChildren?: number;
    maxAdults?: number;
    maxChildren?: number;
    maxPhysicalCapacity?: number;
}

export interface AllocatedRoom {
    roomTypeId: string;
    roomTypeName: string;
    adults: number;
    children: number;
    infants: number;

    // Canonical limits
    totalBaseOccupancy: number;
    totalMaxOccupancy: number;
    maxPhysicalAdults: number;
    maxPhysicalChildren: number;
    maxPhysicalInfants: number;
    baseMaxAdults?: number | null;
    baseMaxChildren?: number | null;

    // Headcount breakdown
    baseGuestsCovered: number;
    baseAdultsCovered: number;
    baseChildrenCovered: number;
    extraAdults: number;
    extraChildren: number;
    freeChildren: number;

    // Pricing details
    basePricePerNight: number;
    extraAdultChargePerNight: number;
    extraChildChargePerNight: number;
    totalPricePerNight: number;

    // Legacy fields for backward compatibility
    baseAdults?: number;
    baseChildren?: number;
    maxPhysicalCapacity?: number;
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
    pricingSummary: {
        baseTotal: number;
        extraAdultTotal: number;
        extraChildTotal: number;
        infantTotal: 0;
        totalPerNight: number;
    };
    distinctRoomTypeCount: number;
    spareCapacity: number;
    isRecommended?: boolean;
    badge?: string | null;
}

/**
 * Validates physical feasibility for a single room allocation.
 *
 * Rules:
 * 1. A >= 1 (Unaccompanied children/infants strictly rejected)
 * 2. C >= 0, I >= 0
 * 3. A <= P_A (Physical adult bedding limit)
 * 4. C <= P_C (Physical child bedding limit)
 * 5. A + C <= M (Hard room physical capacity)
 * 6. I <= P_I (Dedicated infant cot limit)
 * Infants do NOT consume standard A+C physical bed capacity.
 */
export function validatePhysicalFeasibility(
    party: { adults: number; children: number; infants?: number },
    room: {
        totalMaxOccupancy?: number;
        maxPhysicalAdults: number;
        maxPhysicalChildren: number;
        maxPhysicalInfants: number;
        maxPhysicalCapacity?: number; // legacy fallback
    }
): FeasibilityResult {
    const A = party.adults;
    const C = party.children;
    const I = party.infants ?? 0;
    const maxA = room.maxPhysicalAdults;
    const maxC = room.maxPhysicalChildren;
    const M = room.totalMaxOccupancy ?? room.maxPhysicalCapacity ?? (maxA + maxC);
    const maxI = room.maxPhysicalInfants;

    const violations: string[] = [];

    if (A < 1) {
        violations.push('At least one adult is required per room.');
    }
    if (C < 0) {
        violations.push('Children count cannot be negative.');
    }
    if (I < 0) {
        violations.push('Infants count cannot be negative.');
    }
    if (A > maxA) {
        violations.push(`Adults (${A}) exceed physical adult capacity (${maxA}).`);
    }
    if (C > maxC) {
        violations.push(`Children (${C}) exceed physical child capacity (${maxC}).`);
    }
    if (A + C > M) {
        violations.push(`Total guests (${A + C}) exceed max room capacity (${M}).`);
    }
    if (I > maxI) {
        violations.push(`Infants (${I}) exceed baby cot capacity (${maxI}).`);
    }

    return {
        isValid: violations.length === 0,
        violations,
    };
}

/**
 * Backward compatibility alias for single-room boolean check.
 */
export function isPhysicalRoomAllocationValid(
    allocation: { adults: number; children: number; infants?: number },
    roomLimits: {
        maxPhysicalAdults: number;
        maxPhysicalChildren: number;
        maxPhysicalCapacity?: number;
        totalMaxOccupancy?: number;
        maxPhysicalInfants: number;
    }
): boolean {
    return validatePhysicalFeasibility(allocation, roomLimits).isValid;
}

/**
 * Deterministic Pricing & Surcharge Allocation Engine
 *
 * Implements the mathematically verified canonical surcharge algorithm:
 * 1. Base rate covers adults up to min(A, bMA, B).
 * 2. Base rate covers children up to min(C, bMC, remainingBaseSlots).
 * 3. Total excess headcount above B is charged as Extra Adult.
 * 4. Free children allowance (FC) reduces uncovered children not charged as Extra Adults.
 * 5. Infants are always ₹0 and do not consume base/max occupancy.
 */
export function calculateCanonicalSurcharges(
    party: { adults: number; children: number; infants?: number },
    room: {
        totalBaseOccupancy: number;
        totalMaxOccupancy?: number;
        maxPhysicalAdults: number;
        maxPhysicalChildren: number;
        maxPhysicalInfants: number;
        baseMaxAdults?: number | null;
        baseMaxChildren?: number | null;
        freeChildrenCount?: number;
        basePrice?: number;
        extraAdultPrice?: number;
        extraChildPrice?: number;
        maxPhysicalCapacity?: number;
    }
): SurchargeBreakdown {
    const A = party.adults;
    const C = party.children;
    const I = party.infants ?? 0;

    const B = room.totalBaseOccupancy;
    const bMA = room.baseMaxAdults !== null && room.baseMaxAdults !== undefined ? room.baseMaxAdults : B;
    const bMC = room.baseMaxChildren !== null && room.baseMaxChildren !== undefined ? room.baseMaxChildren : B;
    const FC = room.freeChildrenCount ?? 0;
    const basePrice = room.basePrice ?? 0;
    const extraAdultPrice = room.extraAdultPrice ?? 0;
    const extraChildPrice = room.extraChildPrice ?? 0;

    // Step 1: Physical Feasibility Check
    const feasibility = validatePhysicalFeasibility(party, room);
    if (!feasibility.isValid) {
        return {
            isFeasible: false,
            violations: feasibility.violations,
            baseGuestsCovered: 0,
            baseAdultsCovered: 0,
            baseChildrenCovered: 0,
            extraAdultsCount: 0,
            extraChildrenCount: 0,
            freeChildrenCount: 0,
            extraAdultAmount: 0,
            extraChildAmount: 0,
            totalExtraAmount: 0,
            basePrice,
            totalPrice: 0,
        };
    }

    // Step 2: Base Rate Adult Allocation
    const baseAdultsCovered = Math.min(A, bMA, B);
    const remainingBaseSlots = Math.max(0, B - baseAdultsCovered);

    // Step 3: Base Rate Child Allocation
    const baseChildrenCovered = Math.min(C, bMC, remainingBaseSlots);
    const baseGuestsCovered = baseAdultsCovered + baseChildrenCovered;

    // Step 4: Determine Uncovered Headcounts
    const uncoveredAdults = A - baseAdultsCovered;
    const uncoveredChildren = C - baseChildrenCovered;

    // Step 5: Mixed Excess & Extra Adult Calculation
    const totalHeadcount = A + C;
    const totalExcessHeadcount = Math.max(0, totalHeadcount - B);

    // Excess above total base is charged as Extra Adult
    const extraAdultsCount = Math.max(uncoveredAdults, totalExcessHeadcount);

    // Step 6: Extra Children Calculation
    const childrenChargedAsAdults = Math.max(0, extraAdultsCount - uncoveredAdults);
    const remainingUncoveredChildren = Math.max(0, uncoveredChildren - childrenChargedAsAdults);

    // Free children available for uncovered children
    const freeChildrenAvailableForUncovered = Math.max(0, FC - baseChildrenCovered);

    // Extra children charged extraChildPrice
    const extraChildrenCount = Math.max(0, remainingUncoveredChildren - freeChildrenAvailableForUncovered);
    const freeChildrenCount = Math.min(
        C,
        baseChildrenCovered + Math.min(remainingUncoveredChildren, freeChildrenAvailableForUncovered)
    );

    // Step 7: Surcharge Totals
    const extraAdultAmount = extraAdultsCount * extraAdultPrice;
    const extraChildAmount = extraChildrenCount * extraChildPrice;
    const totalExtraAmount = extraAdultAmount + extraChildAmount;

    return {
        isFeasible: true,
        baseGuestsCovered,
        baseAdultsCovered,
        baseChildrenCovered,
        extraAdultsCount,
        extraChildrenCount,
        freeChildrenCount,
        extraAdultAmount,
        extraChildAmount,
        totalExtraAmount,
        basePrice,
        totalPrice: basePrice + totalExtraAmount,
    };
}

/**
 * Deterministic Bounded Backtracking Partition Solver.
 * Explores all valid partitions of remainingAdults and remainingChildren across candidate rooms
 * and finds the partition that minimizes total price.
 */
function findOptimalPartition(
    candidateRooms: RoomTypeInventoryCandidate[],
    remainingAdults: number,
    remainingChildren: number,
    roomIdx: number,
    currentAllocations: Array<{ adults: number; children: number }>,
    best: {
        allocation: Array<{ adults: number; children: number }> | null;
        minPrice: number;
    }
): void {
    const totalRooms = candidateRooms.length;

    // Base condition: all rooms processed
    if (roomIdx === totalRooms) {
        if (remainingAdults === 0 && remainingChildren === 0) {
            let totalPrice = 0;
            for (let i = 0; i < totalRooms; i++) {
                const r = candidateRooms[i];
                const alloc = currentAllocations[i];
                const surcharges = calculateCanonicalSurcharges(
                    { adults: alloc.adults, children: alloc.children, infants: 0 },
                    r
                );
                totalPrice += (r.basePrice ?? 0) + surcharges.totalExtraAmount;
            }

            if (best.allocation === null || totalPrice < best.minPrice) {
                best.minPrice = totalPrice;
                best.allocation = [...currentAllocations];
            }
        }
        return;
    }

    const room = candidateRooms[roomIdx];
    const remainingRoomsAfterThis = totalRooms - 1 - roomIdx;

    // Rule: Every room requires at least 1 adult
    const minAdults = 1;
    const maxAdultsPossible = remainingAdults - remainingRoomsAfterThis;
    const maxAdultsForThisRoom = Math.min(room.maxPhysicalAdults, maxAdultsPossible);

    if (maxAdultsForThisRoom < minAdults) {
        return;
    }

    const roomMaxCap = room.totalMaxOccupancy ?? room.maxPhysicalCapacity ?? (room.maxPhysicalAdults + room.maxPhysicalChildren);

    // Explore adult allocation
    for (let a = maxAdultsForThisRoom; a >= minAdults; a--) {
        const maxChildrenForThisRoom = Math.min(
            remainingChildren,
            room.maxPhysicalChildren,
            roomMaxCap - a
        );

        // Explore child allocation
        for (let c = maxChildrenForThisRoom; c >= 0; c--) {
            currentAllocations.push({ adults: a, children: c });

            findOptimalPartition(
                candidateRooms,
                remainingAdults - a,
                remainingChildren - c,
                roomIdx + 1,
                currentAllocations,
                best
            );

            currentAllocations.pop(); // Backtrack
        }
    }
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

        for (let i = 0; i < count; i++) {
            currentMultiset.pop();
        }
        usedCounts[currentType.id] = alreadyUsed;
    }

    return results;
}

/**
 * Pure Canonical Accommodation Solver Engine
 *
 * Takes a guest party and candidate room types with physical inventory,
 * generates all valid accommodation permutations, prices them deterministically,
 * ranks them according to the 4-tier policy, and badges the "Best Value" solution.
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

    // Normalize room candidates to canonical model
    const availableTypes: RoomTypeInventoryCandidate[] = roomTypes
        .filter((rt) => rt.availableQuantity > 0 && rt.maxPhysicalAdults >= 1)
        .map((rt) => {
            const totalBase = rt.totalBaseOccupancy ?? ((rt.baseAdults ?? 2) + (rt.baseChildren ?? 1));
            const totalMax = rt.totalMaxOccupancy ?? rt.maxPhysicalCapacity ?? (rt.maxPhysicalAdults + rt.maxPhysicalChildren);
            return {
                ...rt,
                totalBaseOccupancy: totalBase,
                totalMaxOccupancy: totalMax,
                maxPhysicalAdults: rt.maxPhysicalAdults,
                maxPhysicalChildren: rt.maxPhysicalChildren,
                maxPhysicalInfants: rt.maxPhysicalInfants ?? 1,
                baseMaxAdults: rt.baseMaxAdults ?? rt.baseAdults ?? null,
                baseMaxChildren: rt.baseMaxChildren ?? rt.baseChildren ?? null,
                freeChildrenCount: rt.freeChildrenCount ?? 0,
            };
        });

    if (availableTypes.length === 0) {
        return [];
    }

    const totalAvailableRooms = availableTypes.reduce((acc, rt) => acc + rt.availableQuantity, 0);
    const maxRoomsToSearch = Math.min(adults, totalAvailableRooms);

    const solutions: SolverAccommodationSolution[] = [];
    const seenSolutionKeys = new Set<string>();

    for (let k = 1; k <= maxRoomsToSearch; k++) {
        const multisets = generateDistinctRoomMultisets(availableTypes, k);

        for (const candidateRooms of multisets) {
            // Gross feasibility check before deep search
            const sumMaxAdults = candidateRooms.reduce((acc, r) => acc + r.maxPhysicalAdults, 0);
            const sumMaxChildren = candidateRooms.reduce((acc, r) => acc + r.maxPhysicalChildren, 0);
            const sumMaxCap = candidateRooms.reduce((acc, r) => acc + r.totalMaxOccupancy, 0);
            const sumMaxInfants = candidateRooms.reduce((acc, r) => acc + r.maxPhysicalInfants, 0);

            if (
                sumMaxAdults < adults ||
                sumMaxChildren < children ||
                sumMaxCap < (adults + children) ||
                sumMaxInfants < infants
            ) {
                continue;
            }

            // Execute deterministic backtracking to find optimal cost partition
            const best: { allocation: Array<{ adults: number; children: number }> | null; minPrice: number } = {
                allocation: null,
                minPrice: Infinity,
            };
            findOptimalPartition(candidateRooms, adults, children, 0, [], best);
            const partition = best.allocation;

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

                // Construct allocated rooms & pricing via calculateCanonicalSurcharges
                const allocatedRooms: AllocatedRoom[] = candidateRooms.map((r, idx) => {
                    const alloc = partition[idx];
                    const inf = infantAllocations[idx];

                    const surchargeResult = calculateCanonicalSurcharges(
                        { adults: alloc.adults, children: alloc.children, infants: inf },
                        r
                    );

                    const basePrice = r.basePrice ?? 0;

                    return {
                        roomTypeId: r.id,
                        roomTypeName: r.name,
                        adults: alloc.adults,
                        children: alloc.children,
                        infants: inf,
                        totalBaseOccupancy: r.totalBaseOccupancy,
                        totalMaxOccupancy: r.totalMaxOccupancy,
                        maxPhysicalAdults: r.maxPhysicalAdults,
                        maxPhysicalChildren: r.maxPhysicalChildren,
                        maxPhysicalInfants: r.maxPhysicalInfants,
                        baseMaxAdults: r.baseMaxAdults,
                        baseMaxChildren: r.baseMaxChildren,
                        baseGuestsCovered: surchargeResult.baseGuestsCovered,
                        baseAdultsCovered: surchargeResult.baseAdultsCovered,
                        baseChildrenCovered: surchargeResult.baseChildrenCovered,
                        extraAdults: surchargeResult.extraAdultsCount,
                        extraChildren: surchargeResult.extraChildrenCount,
                        freeChildren: surchargeResult.freeChildrenCount,
                        basePricePerNight: basePrice,
                        extraAdultChargePerNight: surchargeResult.extraAdultAmount,
                        extraChildChargePerNight: surchargeResult.extraChildAmount,
                        totalPricePerNight: (surchargeResult.totalPrice ?? (basePrice + surchargeResult.totalExtraAmount)),
                        // Legacy compatibility fields
                        baseAdults: r.baseAdults,
                        baseChildren: r.baseChildren,
                        maxPhysicalCapacity: r.totalMaxOccupancy,
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

                // Unique key based on sorted room types and their counts
                const canonicalKey = Object.entries(roomTypeCounts)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([typeId, cnt]) => `${typeId}:${cnt}`)
                    .join('|');

                if (seenSolutionKeys.has(canonicalKey)) {
                    continue; // Skip duplicate combination
                }
                seenSolutionKeys.add(canonicalKey);

                // Pricing Summary
                const baseTotal = allocatedRooms.reduce((acc, r) => acc + r.basePricePerNight, 0);
                const extraAdultTotal = allocatedRooms.reduce((acc, r) => acc + r.extraAdultChargePerNight, 0);
                const extraChildTotal = allocatedRooms.reduce((acc, r) => acc + r.extraChildChargePerNight, 0);
                const totalPerNight = baseTotal + extraAdultTotal + extraChildTotal;

                const isRequestedRoomCountMatch = requestedRooms !== undefined ? k === requestedRooms : false;
                const distinctRoomTypeCount = Object.keys(roomTypeCounts).length;
                const totalSolutionCapacity = candidateRooms.reduce((acc, r) => acc + r.totalMaxOccupancy, 0);
                const spareCapacity = totalSolutionCapacity - (adults + children);

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
                    distinctRoomTypeCount,
                    spareCapacity,
                });
            }
        }
    }

    // Deterministic 4-Tier Ranking Policy:
    // Tier 1: Lowest total price
    // Tier 2: Closest match to requested room count (if requestedRooms specified)
    // Tier 3: Inventory homogeneity (fewer distinct RoomTypes preferred)
    // Tier 4: Tightest capacity fit (lowest spare unused capacity)
    solutions.sort((a, b) => {
        // Tier 1: Lowest Price
        const priceDiff = (a.pricingSummary.totalPerNight || 0) - (b.pricingSummary.totalPerNight || 0);
        if (priceDiff !== 0) return priceDiff;

        // Tier 2: Room Count Proximity (if preference was provided)
        if (requestedRooms !== undefined) {
            const distA = Math.abs(a.totalRooms - requestedRooms);
            const distB = Math.abs(b.totalRooms - requestedRooms);
            if (distA !== distB) return distA - distB;
        }

        // Tier 3: Fewer distinct RoomTypes
        if (a.distinctRoomTypeCount !== b.distinctRoomTypeCount) {
            return a.distinctRoomTypeCount - b.distinctRoomTypeCount;
        }

        // Tier 4: Tightest capacity fit (spare capacity)
        if (a.spareCapacity !== b.spareCapacity) {
            return a.spareCapacity - b.spareCapacity;
        }

        // Tie-breaker: fewer total rooms
        return a.totalRooms - b.totalRooms;
    });

    // Mark the top solution as Recommended / Best Value
    if (solutions.length > 0) {
        solutions[0].isRecommended = true;
        solutions[0].badge = 'Best Value';
    }

    return solutions;
}
