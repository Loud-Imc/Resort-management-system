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
