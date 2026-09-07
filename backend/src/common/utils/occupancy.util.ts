export interface OccupancyComposition {
    adults: number;
    children: number;
    label: string; // e.g., "1A", "2A + 1C", "3A + 2C"
}

export interface RoomOccupancyRules {
    baseAdults: number;
    baseChildren: number;
    maxPhysicalAdults: number;
    maxPhysicalChildren: number;
    maxPhysicalInfants: number;
}

/**
 * Generate all valid (Adults, Children) combinations for a room's given capacity limits.
 *
 * Rules:
 * 1. Adults >= 1 (Every room requires at least 1 adult)
 * 2. Adults <= maxAdults
 * 3. Children <= maxChildren
 * 4. Adults + Children <= totalMaxCapacity
 *
 * Output is ordered: Adults ascending, then Children ascending.
 */
export function generateOccupancyCompositions(
    paramsOrMaxAdults: number | { maxAdults: number; maxChildren?: number; totalCapacity?: number },
    maxChildrenParam?: number,
    totalMaxCapacityParam?: number
): OccupancyComposition[] {
    let maxAdults = 1;
    let maxChildren = 0;
    let totalMaxCapacity: number | undefined;

    if (typeof paramsOrMaxAdults === 'object' && paramsOrMaxAdults !== null) {
        maxAdults = Number(paramsOrMaxAdults.maxAdults);
        maxChildren = Number(paramsOrMaxAdults.maxChildren ?? 0);
        totalMaxCapacity = paramsOrMaxAdults.totalCapacity !== undefined ? Number(paramsOrMaxAdults.totalCapacity) : undefined;
    } else {
        maxAdults = Number(paramsOrMaxAdults);
        maxChildren = Number(maxChildrenParam ?? 0);
        totalMaxCapacity = totalMaxCapacityParam !== undefined ? Number(totalMaxCapacityParam) : undefined;
    }

    const safeMaxAdults = Math.max(1, isNaN(maxAdults) ? 1 : maxAdults);
    const safeMaxChildren = Math.max(0, isNaN(maxChildren) ? 0 : maxChildren);
    const resolvedTotal = totalMaxCapacity !== undefined && !isNaN(totalMaxCapacity)
        ? totalMaxCapacity
        : (safeMaxAdults + safeMaxChildren);
    const safeTotalMax = Math.max(safeMaxAdults, resolvedTotal);

    const compositions: OccupancyComposition[] = [];

    for (let a = 1; a <= safeMaxAdults; a++) {
        for (let c = 0; c <= safeMaxChildren; c++) {
            if (a + c <= safeTotalMax) {
                const label = c === 0 ? `${a}A` : `${a}A + ${c}C`;
                compositions.push({ adults: a, children: c, label });
            }
        }
    }

    return compositions;
}

/**
 * Validate whether a specific guest request (sA, sC, sI) is physically allowed in a single room.
 */
export function validateRoomOccupancy(
    requested: { adults: number; children?: number; infants?: number },
    rules: RoomOccupancyRules
): {
    isValid: boolean;
    isBaseIncluded: boolean;
    reason?: string;
} {
    const adults = Number(requested.adults) || 0;
    const children = Number(requested.children) || 0;
    const infants = Number(requested.infants) || 0;

    if (adults < 1) {
        return { isValid: false, isBaseIncluded: false, reason: 'At least 1 adult is required per room' };
    }

    if (adults > rules.maxPhysicalAdults) {
        return {
            isValid: false,
            isBaseIncluded: false,
            reason: `Adult count (${adults}) exceeds maximum physical adult capacity (${rules.maxPhysicalAdults})`,
        };
    }

    if (children > rules.maxPhysicalChildren) {
        return {
            isValid: false,
            isBaseIncluded: false,
            reason: `Child count (${children}) exceeds maximum physical child capacity (${rules.maxPhysicalChildren})`,
        };
    }

    const totalHeadcount = adults + children;
    const maxPhysicalHeadcount = rules.maxPhysicalAdults + rules.maxPhysicalChildren;
    if (totalHeadcount > maxPhysicalHeadcount) {
        return {
            isValid: false,
            isBaseIncluded: false,
            reason: `Total headcount (${totalHeadcount}) exceeds total physical capacity (${maxPhysicalHeadcount})`,
        };
    }

    if (infants > rules.maxPhysicalInfants) {
        return {
            isValid: false,
            isBaseIncluded: false,
            reason: `Infant count (${infants}) exceeds maximum baby cot capacity (${rules.maxPhysicalInfants})`,
        };
    }

    // Check if within Base Occupancy (no extra adult/child fees)
    const isBaseIncluded =
        adults <= rules.baseAdults &&
        children <= rules.baseChildren &&
        (adults + children) <= (rules.baseAdults + rules.baseChildren);

    return {
        isValid: true,
        isBaseIncluded,
    };
}
