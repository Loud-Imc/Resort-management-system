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
