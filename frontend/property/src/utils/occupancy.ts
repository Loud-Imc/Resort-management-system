export interface OccupancyComposition {
    adults: number;
    children: number;
    label: string; // e.g., "1A", "2A + 1C", "3A + 2C"
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
        ? Math.max(1, totalMaxCapacity)
        : (safeMaxAdults + safeMaxChildren);
    const safeTotalMax = resolvedTotal;

    const compositions: OccupancyComposition[] = [];

    for (let a = 1; a <= safeMaxAdults && a <= safeTotalMax; a++) {
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
 * Validates whether a single room of a given RoomType can physically accommodate
 * the requested guest party under canonical V2 physical occupancy rules.
 */
export function canRoomTypeFitParty(
    roomType: {
        maxPhysicalAdults?: number | null;
        maxAdults?: number;
        maxPhysicalChildren?: number | null;
        maxChildren?: number;
        maxPhysicalInfants?: number | null;
        totalMaxOccupancy?: number | null;
        capacity?: number;
    },
    party: {
        adults: number;
        children: number;
        infants?: number;
    }
): boolean {
    const adults = party.adults;
    const children = party.children;
    const infants = party.infants || 0;

    // Minimum 1 adult required per room
    if (adults < 1) return false;

    // 1. Physical Adult Limit
    const maxAdults = roomType.maxPhysicalAdults ?? roomType.maxAdults ?? 2;
    if (adults > maxAdults) return false;

    // 2. Physical Child Limit
    const maxChildren = roomType.maxPhysicalChildren ?? (roomType.maxChildren ?? 0);
    if (children > maxChildren) return false;

    // 3. Total Combined Physical Occupancy Limit (Adults + Children <= M)
    const totalMax = roomType.totalMaxOccupancy ?? roomType.capacity ?? (maxAdults + maxChildren);
    if (adults + children > totalMax) return false;

    // 4. Physical Infant Limit
    const maxInfants = roomType.maxPhysicalInfants ?? 0;
    if (infants > 0 && infants > maxInfants) return false;

    return true;
}
