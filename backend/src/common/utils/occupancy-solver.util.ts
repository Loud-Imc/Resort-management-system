/**
 * Canonical Occupancy & Accommodation Solver Engine (V2)
 *
 * Single Mathematical Authority for:
 * 1. Physical Feasibility Validation: <P_A, P_C, M, P_I>
 * 2. Demographic Age Classification:
 *    - 0–2: Infant (₹0, baby cot limit P_I, excluded from bed headcount)
 *    - 3–6: Free-child eligible (consumes physical bed capacity, free within room freeChildrenCount allowance)
 *    - 7–12: Paid child (consumes physical bed capacity, covered by baseMaxChildren or extraChildPrice)
 *    - 13+: Adult (consumes physical bed capacity, covered by baseMaxAdults or extraAdultPrice)
 * 3. Headcount Base Rate Allocation: B (flexible A+C headcount)
 * 4. Base Rate Demographic Pricing Caps: bMA, bMC
 * 5. Free Children Exemption: FC (free-child allowance for ages 3–6)
 * 6. Pure Excess Surcharges: Extra adults charged at extraAdultPrice, extra paid children charged at extraChildPrice (zero child->adult spillover)
 * 7. Multi-Room Combinatorial Generation & Deterministic Bounded Backtracking
 * 8. Deterministic 4-Tier Solution Ranking & "Best Value" Recommendation
 */

import { BadRequestException } from '@nestjs/common';

export interface GuestParty {
    adults: number;          // A >= 1 (13+)
    children: number;        // C >= 0 (3–12)
    infants: number;         // I >= 0 (0–2)
    childAges?: number[];    // Mandatory for C > 0; each age must be 3–12
    requestedRooms?: number; // Optional preference/ranking signal
}

/**
 * Strict Platform Child-Age Contract Validator.
 * Throws a BadRequestException if child ages violate platform contract.
 */
export function validateChildAges(children: number, childAges?: number[]): void {
    const c = typeof children === 'number' ? children : 0;
    if (c === 0) {
        if (childAges && childAges.length > 0) {
            throw new BadRequestException('childAges must be empty or omitted when children count is 0.');
        }
        return;
    }
    if (!childAges || !Array.isArray(childAges)) {
        throw new BadRequestException(`childAges is mandatory when children count (${c}) > 0.`);
    }
    if (childAges.length !== c) {
        throw new BadRequestException(`childAges count (${childAges.length}) does not match children count (${c}).`);
    }
    for (let i = 0; i < childAges.length; i++) {
        const age = childAges[i];
        if (typeof age !== 'number' || !Number.isInteger(age)) {
            throw new BadRequestException(`Invalid child age (${age}). Child age must be an integer.`);
        }
        if (age < 0) {
            throw new BadRequestException(`Invalid child age (${age}). Child age cannot be negative.`);
        }
        if (age < 3) {
            throw new BadRequestException(`Invalid child age (${age}). Guests aged 0–2 must be classified as infants.`);
        }
        if (age > 12) {
            throw new BadRequestException(`Invalid child age (${age}). Guests aged 13+ must be classified as adults.`);
        }
    }
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
    freeChildrenCount?: number;      // FC: Free-child allowance count (for children aged 3–6)
    basePrice?: number;
    extraAdultPrice?: number;
    extraChildPrice?: number;
}

export interface FeasibilityResult {
    isValid: boolean;
    violations: string[];
}

export interface DemographicClassification {
    adultsCount: number;
    freeChildrenCount: number;
    paidChildrenCount: number;
    infantsCount: number;
    totalPhysicalBedOccupants: number;
    freeEligibleChildrenCount: number;
    olderChildrenCount: number;
    freeAllowance: number;
    spilloverPaidChildrenCount: number;
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
    paidChildrenCount: number;
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
    isGstInclusive?: boolean;

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
    childAges?: number[];

    // Canonical limits
    totalBaseOccupancy: number;
    totalMaxOccupancy: number;
    maxPhysicalAdults: number;
    maxPhysicalChildren: number;
    maxPhysicalInfants: number;
    baseMaxAdults?: number | null;
    baseMaxChildren?: number | null;
    freeChildrenCount?: number;

    // Headcount breakdown
    baseGuestsCovered: number;
    baseAdultsCovered: number;
    baseChildrenCovered: number;
    extraAdults: number;
    extraChildren: number;
    freeChildren: number;
    paidChildren?: number;

    // Pricing details
    basePricePerNight: number;
    extraAdultChargePerNight: number;
    extraChildChargePerNight: number;
    totalPricePerNight: number;
    isGstInclusive?: boolean;

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
        childAges?: number[];
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
 * Validates physical feasibility and demographic input contracts for a room allocation.
 *
 * Rules:
 * 1. A >= 1 (Unaccompanied children/infants strictly rejected)
 * 2. C >= 0, I >= 0 (Non-negative integers)
 * 3. If C > 0: childAges is mandatory, childAges.length === C, and each age must be an integer in [3, 12].
 *    - Age < 3 is rejected (must be classified as infants).
 *    - Age > 12 is rejected (must be classified as adults).
 * 4. A <= P_A (Physical adult bedding limit)
 * 5. C <= P_C (Physical child bedding limit)
 * 6. A + C <= M (Hard room physical bed capacity)
 * 7. I <= P_I (Dedicated infant cot limit)
 * Infants do NOT consume standard A+C physical bed capacity.
 */
export function validatePhysicalFeasibility(
    party: { adults: number; children: number; infants?: number; childAges?: number[]; requireChildAges?: boolean },
    room: {
        totalMaxOccupancy?: number;
        maxPhysicalAdults: number;
        maxPhysicalChildren: number;
        maxPhysicalInfants: number;
        maxPhysicalCapacity?: number; // legacy fallback
        freeChildrenCount?: number | null;
    },
    options?: { requireChildAges?: boolean }
): FeasibilityResult {
    const A = party.adults;
    const C = party.children;
    const I = party.infants ?? 0;
    const maxA = room.maxPhysicalAdults;
    const maxC = room.maxPhysicalChildren;
    const M = room.totalMaxOccupancy ?? room.maxPhysicalCapacity ?? (maxA + maxC);
    const maxI = room.maxPhysicalInfants;

    const violations: string[] = [];

    if (typeof A !== 'number' || !Number.isInteger(A) || A < 1) {
        violations.push('At least one adult is required per room.');
    }
    if (typeof C !== 'number' || !Number.isInteger(C) || C < 0) {
        violations.push('Children count cannot be negative.');
    }
    if (typeof I !== 'number' || !Number.isInteger(I) || I < 0) {
        violations.push('Infants count cannot be negative.');
    }

    // Strict Child Ages Validation
    if (typeof C === 'number' && C > 0) {
        if (!party.childAges || !Array.isArray(party.childAges)) {
            violations.push('Child ages are required when children are present.');
        } else if (party.childAges.length !== C) {
            violations.push(`Child ages count (${party.childAges.length}) does not match children count (${C}).`);
        } else {
            for (const age of party.childAges) {
                if (typeof age !== 'number' || !Number.isInteger(age)) {
                    violations.push(`Invalid child age (${age}). Child age must be an integer.`);
                } else if (age < 0) {
                    violations.push(`Invalid child age (${age}). Child age cannot be negative.`);
                } else if (age < 3) {
                    violations.push(`Invalid child age (${age}). Ages 0–2 must be classified as infants.`);
                } else if (age > 12) {
                    violations.push(`Invalid child age (${age}). Guests aged 13+ must be classified as adults.`);
                }
            }
        }
    } else if (party.childAges && Array.isArray(party.childAges) && party.childAges.length > 0) {
        violations.push(`Child ages count (${party.childAges.length}) does not match children count (0).`);
    }

    // Physical Capacity Checks
    if (typeof A === 'number' && A > maxA) {
        violations.push(`Adults (${A}) exceed physical adult capacity (${maxA}).`);
    }
    if (typeof C === 'number' && C > maxC) {
        violations.push(`Children (${C}) exceed physical child capacity (${maxC}).`);
    }
    if (typeof A === 'number' && typeof C === 'number' && A + C > M) {
        violations.push(`Total guests (${A + C}) exceed max room capacity (${M}).`);
    }
    if (typeof I === 'number' && I > maxI) {
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
    allocation: { adults: number; children: number; infants?: number; childAges?: number[] },
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
 * Classifies guest demographics into Free Children, Paid Children, Adults, and Infants
 * based on platform age boundaries (0–2 infant, 3–6 free-child eligible, 7–12 paid child, 13+ adult)
 * and room-level freeChildrenCount allowance.
 */
export function classifyGuestDemographics(
    party: { adults: number; children: number; infants?: number; childAges?: number[] },
    room: { freeChildrenCount?: number | null }
): DemographicClassification {
    const adultsCount = party.adults;
    const infantsCount = party.infants ?? 0;
    const FC = room.freeChildrenCount ?? 0;

    if (!party.children || party.children === 0) {
        return {
            adultsCount,
            freeChildrenCount: 0,
            paidChildrenCount: 0,
            infantsCount,
            totalPhysicalBedOccupants: adultsCount,
            freeEligibleChildrenCount: 0,
            olderChildrenCount: 0,
            freeAllowance: FC,
            spilloverPaidChildrenCount: 0,
        };
    }

    const ages = party.childAges ?? [];
    let freeEligibleChildrenCount = 0;
    let olderChildrenCount = 0;
    if (ages.length > 0) {
        freeEligibleChildrenCount = ages.filter((a) => a >= 3 && a <= 6).length;
        olderChildrenCount = ages.filter((a) => a >= 7 && a <= 12).length;
    } else {
        olderChildrenCount = party.children;
    }

    const freeChildrenCount = Math.min(freeEligibleChildrenCount, FC);
    const spilloverPaidChildrenCount = Math.max(0, freeEligibleChildrenCount - FC);
    const paidChildrenCount = olderChildrenCount + spilloverPaidChildrenCount;

    return {
        adultsCount,
        freeChildrenCount,
        paidChildrenCount,
        infantsCount,
        totalPhysicalBedOccupants: adultsCount + freeChildrenCount + paidChildrenCount,
        freeEligibleChildrenCount,
        olderChildrenCount,
        freeAllowance: FC,
        spilloverPaidChildrenCount,
    };
}

/**
 * Deterministic Pricing & Surcharge Allocation Engine (Canonical V2)
 *
 * Implements the canonical age-aware surcharge algorithm:
 * 1. Validates physical feasibility and input contracts.
 * 2. Classifies children into Free Children (3–6 within FC allowance) and Paid Children (7–12 plus 3–6 spillover).
 * 3. Base rate covers adults up to min(A, bMA, B).
 * 4. Remaining base slots cover paid children up to min(C_paid, bMC, remainingBaseSlots).
 * 5. Extra adults beyond base coverage are charged strictly at extraAdultPrice.
 * 6. Extra paid children beyond base coverage are charged strictly at extraChildPrice.
 *    (Child excess NEVER spills over into extraAdultPrice).
 * 7. Free children produce ₹0 and NEVER consume baseMaxChildren or base slots.
 * 8. Infants are always ₹0 and do not consume base/max occupancy.
 */
export function calculateCanonicalSurcharges(
    party: { adults: number; children: number; infants?: number; childAges?: number[] },
    room: {
        totalBaseOccupancy: number;
        totalMaxOccupancy?: number;
        maxPhysicalAdults: number;
        maxPhysicalChildren: number;
        maxPhysicalInfants: number;
        baseMaxAdults?: number | null;
        baseMaxChildren?: number | null;
        freeChildrenCount?: number | null;
        basePrice?: number;
        extraAdultPrice?: number;
        extraChildPrice?: number;
        maxPhysicalCapacity?: number;
    }
): SurchargeBreakdown {
    const basePrice = room.basePrice ?? 0;
    const extraAdultPrice = room.extraAdultPrice ?? 0;
    const extraChildPrice = room.extraChildPrice ?? 0;

    // Step 1: Physical Feasibility & Input Validation
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
            paidChildrenCount: 0,
            extraAdultAmount: 0,
            extraChildAmount: 0,
            totalExtraAmount: 0,
            basePrice,
            totalPrice: 0,
        };
    }

    // Step 2: Canonical Demographic Classification
    const demo = classifyGuestDemographics(party, room);
    const A = demo.adultsCount;
    const Cpaid = demo.paidChildrenCount;
    const Cfree = demo.freeChildrenCount;

    // Step 3: Base Rate Capacities & Caps
    const B = room.totalBaseOccupancy;
    const bMA = room.baseMaxAdults !== null && room.baseMaxAdults !== undefined ? room.baseMaxAdults : B;
    const bMC = room.baseMaxChildren !== null && room.baseMaxChildren !== undefined ? room.baseMaxChildren : B;

    // Step 4: Base Rate Adult Allocation
    const baseAdultsCovered = Math.min(A, bMA, B);
    const remainingBaseSlots = Math.max(0, B - baseAdultsCovered);

    // Step 5: Base Rate Paid Child Allocation
    const baseChildrenCovered = Math.min(Cpaid, bMC, remainingBaseSlots);
    const baseGuestsCovered = baseAdultsCovered + baseChildrenCovered;

    // Step 6: Pure Excess Surcharges (Zero child -> adult surcharge spillover)
    const extraAdultsCount = Math.max(0, A - baseAdultsCovered);
    const extraChildrenCount = Math.max(0, Cpaid - baseChildrenCovered);

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
        freeChildrenCount: Cfree,
        paidChildrenCount: Cpaid,
        extraAdultAmount,
        extraChildAmount,
        totalExtraAmount,
        basePrice,
        totalPrice: basePrice + totalExtraAmount,
    };
}

/**
 * Exhaustively evaluates all valid demographic distributions of free-eligible (3–6)
 * and older (7–12) children across candidate rooms to find the mathematically
 * guaranteed globally cheapest child-age assignment.
 */
export function findOptimalChildAgeAssignment(
    candidateRooms: RoomTypeInventoryCandidate[],
    partition: Array<{ adults: number; children: number }>,
    childAges: number[]
): { roomChildAges: number[][]; minExtraCost: number; isFeasible: boolean } {
    const totalRooms = candidateRooms.length;
    if (childAges.length === 0 || totalRooms === 0) {
        return { roomChildAges: partition.map(() => []), minExtraCost: 0, isFeasible: true };
    }
    if (totalRooms === 1) {
        const surcharges = calculateCanonicalSurcharges(
            { adults: partition[0].adults, children: partition[0].children, childAges },
            candidateRooms[0]
        );
        return {
            roomChildAges: [childAges],
            minExtraCost: surcharges.totalExtraAmount,
            isFeasible: surcharges.isFeasible,
        };
    }

    const eligibleAges = childAges.filter((a) => a >= 3 && a <= 6);
    const olderAges = childAges.filter((a) => a >= 7 && a <= 12);
    const N_eligible = eligibleAges.length;

    let bestAssignment: number[][] | null = null;
    let bestTotalExtra = Infinity;

    // Generate all valid vectors (f_0, f_1, ..., f_{k-1}) such that 0 <= f_i <= c_i and sum(f_i) == N_eligible
    function exploreVectors(roomIdx: number, remainingEligible: number, currentVector: number[]): void {
        if (roomIdx === totalRooms - 1) {
            const cap = partition[roomIdx].children;
            if (remainingEligible >= 0 && remainingEligible <= cap) {
                currentVector.push(remainingEligible);

                // Build child ages for each room based on vector
                let eIdx = 0;
                let oIdx = 0;
                const candidateRoomAges: number[][] = [];
                let currentExtra = 0;
                let feasible = true;

                for (let i = 0; i < totalRooms; i++) {
                    const f_i = currentVector[i];
                    const o_i = partition[i].children - f_i;
                    const rAges: number[] = [];
                    for (let j = 0; j < f_i; j++) rAges.push(eligibleAges[eIdx++]);
                    for (let j = 0; j < o_i; j++) rAges.push(olderAges[oIdx++]);
                    candidateRoomAges.push(rAges);

                    const surcharges = calculateCanonicalSurcharges(
                        { adults: partition[i].adults, children: partition[i].children, childAges: rAges, infants: 0 },
                        candidateRooms[i]
                    );
                    if (!surcharges.isFeasible) {
                        feasible = false;
                        break;
                    }
                    currentExtra += surcharges.totalExtraAmount;
                }

                if (feasible && (bestAssignment === null || currentExtra < bestTotalExtra)) {
                    bestTotalExtra = currentExtra;
                    bestAssignment = candidateRoomAges;
                }

                currentVector.pop();
            }
            return;
        }

        const roomCap = partition[roomIdx].children;
        const maxCanTake = Math.min(roomCap, remainingEligible);
        for (let take = maxCanTake; take >= 0; take--) {
            currentVector.push(take);
            exploreVectors(roomIdx + 1, remainingEligible - take, currentVector);
            currentVector.pop();
        }
    }

    exploreVectors(0, N_eligible, []);

    if (bestAssignment !== null) {
        return { roomChildAges: bestAssignment, minExtraCost: bestTotalExtra, isFeasible: true };
    }

    return {
        roomChildAges: partition.map(() => []),
        minExtraCost: Infinity,
        isFeasible: false,
    };
}

/**
 * Public wrapper returning globally optimal child age assignments per room.
 */
export function assignChildAgesToRooms(
    candidateRooms: RoomTypeInventoryCandidate[],
    partition: Array<{ adults: number; children: number }>,
    childAges: number[]
): number[][] {
    return findOptimalChildAgeAssignment(candidateRooms, partition, childAges).roomChildAges;
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
    childAges: number[],
    roomIdx: number,
    currentAllocations: Array<{ adults: number; children: number }>,
    best: {
        allocation: Array<{ adults: number; children: number }> | null;
        roomChildAges: number[][] | null;
        minPrice: number;
    }
): void {
    const totalRooms = candidateRooms.length;

    // Base condition: all rooms processed
    if (roomIdx === totalRooms) {
        if (remainingAdults === 0 && remainingChildren === 0) {
            const ageAssignment = findOptimalChildAgeAssignment(candidateRooms, currentAllocations, childAges);
            if (!ageAssignment.isFeasible) {
                return;
            }

            const baseTotal = candidateRooms.reduce((acc, r) => acc + (r.basePrice ?? 0), 0);
            const totalPrice = baseTotal + ageAssignment.minExtraCost;

            if (best.allocation === null || totalPrice < best.minPrice) {
                best.minPrice = totalPrice;
                best.allocation = [...currentAllocations];
                best.roomChildAges = ageAssignment.roomChildAges;
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
                childAges,
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
        for (let i = 0; i < count; i++) {
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
    const childAges = party.childAges ? [...party.childAges] : (children > 0 ? Array(children).fill(7) : []);
    const requestedRooms = party.requestedRooms && party.requestedRooms >= 1 ? Number(party.requestedRooms) : undefined;

    // Boundary check: At least 1 adult is mandatory for any booking
    if (adults < 1) {
        return [];
    }

    // Strict validation check if children are present
    if (children > 0 && party.childAges) {
        if (party.childAges.length !== children) {
            return [];
        }
        for (const age of party.childAges) {
            if (typeof age !== 'number' || !Number.isInteger(age) || age < 3 || age > 12) {
                return [];
            }
        }
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

    const totalAvailableRooms = availableTypes.reduce((acc, rt) => acc + rt.availableQuantity, 0);
    const totalMaxAdults = availableTypes.reduce((acc, rt) => acc + (rt.availableQuantity * rt.maxPhysicalAdults), 0);
    const totalMaxCapacity = availableTypes.reduce((acc, rt) => acc + (rt.availableQuantity * rt.totalMaxOccupancy), 0);
    const totalMaxInfants = availableTypes.reduce((acc, rt) => acc + (rt.availableQuantity * rt.maxPhysicalInfants), 0);

    if (totalMaxAdults < adults || totalMaxCapacity < (adults + children) || totalMaxInfants < infants) {
        return [];
    }

    const maxSingleRoomCap = Math.max(...availableTypes.map(rt => rt.totalMaxOccupancy || 1));
    const minRoomsNeeded = Math.max(1, Math.ceil((adults + children) / maxSingleRoomCap));

    // Dynamic search bounds: Start at minRoomsNeeded, upper bounded by requestedRooms or tight envelope
    const upperLimit = requestedRooms 
        ? Math.max(requestedRooms + 2, minRoomsNeeded + 2) 
        : Math.min(minRoomsNeeded + 3, adults);
    const maxRoomsToSearch = Math.min(upperLimit, totalAvailableRooms, adults);

    const solutions: SolverAccommodationSolution[] = [];
    const seenSolutionKeys = new Set<string>();

    for (let k = minRoomsNeeded; k <= maxRoomsToSearch; k++) {
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
            const best: {
                allocation: Array<{ adults: number; children: number }> | null;
                roomChildAges: number[][] | null;
                minPrice: number;
            } = {
                allocation: null,
                roomChildAges: null,
                minPrice: Infinity,
            };
            findOptimalPartition(candidateRooms, adults, children, childAges, 0, [], best);
            const partition = best.allocation;
            const distributedChildAges = best.roomChildAges;

            if (partition !== null && distributedChildAges !== null) {
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
                    const rAges = distributedChildAges[idx];

                    const surchargeResult = calculateCanonicalSurcharges(
                        { adults: alloc.adults, children: alloc.children, childAges: rAges, infants: inf },
                        r
                    );

                    const basePrice = r.basePrice ?? 0;

                    return {
                        roomTypeId: r.id,
                        roomTypeName: r.name,
                        adults: alloc.adults,
                        children: alloc.children,
                        infants: inf,
                        childAges: rAges,
                        totalBaseOccupancy: r.totalBaseOccupancy,
                        totalMaxOccupancy: r.totalMaxOccupancy,
                        maxPhysicalAdults: r.maxPhysicalAdults,
                        maxPhysicalChildren: r.maxPhysicalChildren,
                        maxPhysicalInfants: r.maxPhysicalInfants,
                        baseMaxAdults: r.baseMaxAdults,
                        baseMaxChildren: r.baseMaxChildren,
                        freeChildrenCount: r.freeChildrenCount,
                        baseGuestsCovered: surchargeResult.baseGuestsCovered,
                        baseAdultsCovered: surchargeResult.baseAdultsCovered,
                        baseChildrenCovered: surchargeResult.baseChildrenCovered,
                        extraAdults: surchargeResult.extraAdultsCount,
                        extraChildren: surchargeResult.extraChildrenCount,
                        freeChildren: surchargeResult.freeChildrenCount,
                        paidChildren: surchargeResult.paidChildrenCount,
                        basePricePerNight: basePrice,
                        extraAdultChargePerNight: surchargeResult.extraAdultAmount,
                        extraChildChargePerNight: surchargeResult.extraChildAmount,
                        totalPricePerNight: (surchargeResult.totalPrice ?? (basePrice + surchargeResult.totalExtraAmount)),
                        isGstInclusive: r.isGstInclusive,
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
                        childAges: party.childAges,
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
