import {
    validatePhysicalFeasibility,
    calculateCanonicalSurcharges,
    solveAccommodationOptions,
    CanonicalRoomPricingConfig,
} from './occupancy-solver.util';

export type MigrationMappingStatus = 'SAFE' | 'REVIEW_REQUIRED' | 'INVALID';

export interface RoomTypeAuditInput {
    id: string;
    name: string;
    propertyId: string;
    occupancyVersion?: string | null;
    // Legacy fields
    maxAdults?: number | null;
    maxChildren?: number | null;
    baseAdults?: number | null;
    baseChildren?: number | null;
    maxPhysicalAdults?: number | null;
    maxPhysicalChildren?: number | null;
    freeChildrenCount?: number | null;
    groupMaxOccupancy?: number | null;
    basePrice?: number | null;
    extraAdultPrice?: number | null;
    extraChildPrice?: number | null;
    // Canonical V2 fields (if partially or fully configured)
    totalBaseOccupancy?: number | null;
    totalMaxOccupancy?: number | null;
    baseMaxAdults?: number | null;
    baseMaxChildren?: number | null;
    maxPhysicalInfants?: number | null;
}

export interface CanonicalProposal {
    totalBaseOccupancy: number | null;
    totalMaxOccupancy: number | null;
    baseMaxAdults: number | null;
    baseMaxChildren: number | null;
    maxPhysicalAdults: number | null;
    maxPhysicalChildren: number | null;
    maxPhysicalInfants: number | null;
    freeChildrenCount: number | null;
}

export interface RoomTypeAuditResult {
    roomTypeId: string;
    roomTypeName: string;
    currentOccupancyVersion: string;
    status: MigrationMappingStatus;
    isV2Ready: boolean;
    reasons: string[];
    warnings: string[];
    proposedCanonicalValues: CanonicalProposal;
}

export interface PropertyAuditResult {
    propertyId: string;
    propertyName?: string;
    currentOccupancyVersion: string;
    isEligibleForV2Activation: boolean;
    totalRoomTypes: number;
    readyRoomTypesCount: number;
    reviewRequiredRoomTypesCount: number;
    invalidRoomTypesCount: number;
    roomTypeAudits: RoomTypeAuditResult[];
    blockingReasons: string[];
}

export interface ShadowPartyResult {
    adults: number;
    children: number;
    infants: number;
    v1Allowed: boolean;
    v2Allowed: boolean;
    v1Price?: number;
    v2Price?: number;
    priceDelta?: number;
    notes?: string;
}

export interface ShadowValidationResult {
    roomTypeId: string;
    roomTypeName: string;
    testedParties: ShadowPartyResult[];
    hasOccupancyDifference: boolean;
    hasPricingDifference: boolean;
}

/**
 * Audits a single RoomType configuration and proposes canonical V2 fields if safe.
 * Adheres strictly to the principle: NEVER FABRICATE values for ambiguous records.
 */
export function auditRoomTypeMapping(rt: RoomTypeAuditInput): RoomTypeAuditResult {
    const reasons: string[] = [];
    const warnings: string[] = [];
    const currentVersion = rt.occupancyVersion || 'V1';

    // If already marked V2 and has all required canonical fields populated and valid:
    if (
        currentVersion === 'V2' &&
        rt.totalBaseOccupancy !== null && rt.totalBaseOccupancy !== undefined &&
        rt.totalMaxOccupancy !== null && rt.totalMaxOccupancy !== undefined &&
        rt.maxPhysicalAdults !== null && rt.maxPhysicalAdults !== undefined &&
        rt.maxPhysicalChildren !== null && rt.maxPhysicalChildren !== undefined
    ) {
        // Validate internal consistency of existing V2 config
        const totalBase = Number(rt.totalBaseOccupancy);
        const totalMax = Number(rt.totalMaxOccupancy);
        const maxPhysA = Number(rt.maxPhysicalAdults);
        const maxPhysC = Number(rt.maxPhysicalChildren);
        const maxPhysI = rt.maxPhysicalInfants !== null && rt.maxPhysicalInfants !== undefined ? Number(rt.maxPhysicalInfants) : 1;

        if (totalBase < 1) reasons.push('totalBaseOccupancy must be at least 1');
        if (totalMax < totalBase) reasons.push('totalMaxOccupancy cannot be less than totalBaseOccupancy');
        if (maxPhysA < 1) reasons.push('maxPhysicalAdults must be at least 1');
        if (maxPhysC < 0) reasons.push('maxPhysicalChildren cannot be negative');
        if (maxPhysI < 0) reasons.push('maxPhysicalInfants cannot be negative');
        if (totalMax > maxPhysA + maxPhysC) {
            reasons.push(`totalMaxOccupancy (${totalMax}) cannot exceed sum of physical limits (${maxPhysA + maxPhysC})`);
        }

        if (reasons.length > 0) {
            return {
                roomTypeId: rt.id,
                roomTypeName: rt.name,
                currentOccupancyVersion: 'V2',
                status: 'INVALID',
                isV2Ready: false,
                reasons,
                warnings,
                proposedCanonicalValues: {
                    totalBaseOccupancy: rt.totalBaseOccupancy,
                    totalMaxOccupancy: rt.totalMaxOccupancy,
                    baseMaxAdults: rt.baseMaxAdults ?? null,
                    baseMaxChildren: rt.baseMaxChildren ?? null,
                    maxPhysicalAdults: rt.maxPhysicalAdults,
                    maxPhysicalChildren: rt.maxPhysicalChildren,
                    maxPhysicalInfants: maxPhysI,
                    freeChildrenCount: rt.freeChildrenCount ?? 0,
                },
            };
        }

        return {
            roomTypeId: rt.id,
            roomTypeName: rt.name,
            currentOccupancyVersion: 'V2',
            status: 'SAFE',
            isV2Ready: true,
            reasons: ['Already configured with valid V2 canonical values'],
            warnings,
            proposedCanonicalValues: {
                totalBaseOccupancy: rt.totalBaseOccupancy,
                totalMaxOccupancy: rt.totalMaxOccupancy,
                baseMaxAdults: rt.baseMaxAdults ?? null,
                baseMaxChildren: rt.baseMaxChildren ?? null,
                maxPhysicalAdults: rt.maxPhysicalAdults,
                maxPhysicalChildren: rt.maxPhysicalChildren,
                maxPhysicalInfants: maxPhysI,
                freeChildrenCount: rt.freeChildrenCount ?? 0,
            },
        };
    }

    // Inspect legacy fields
    const baseAdults = rt.baseAdults !== null && rt.baseAdults !== undefined ? Number(rt.baseAdults) : 2;
    const maxAdults = rt.maxAdults !== null && rt.maxAdults !== undefined ? Number(rt.maxAdults) : baseAdults;
    const baseChildren = rt.baseChildren !== null && rt.baseChildren !== undefined ? Number(rt.baseChildren) : 0;
    const maxChildren = rt.maxChildren !== null && rt.maxChildren !== undefined ? Number(rt.maxChildren) : 0;
    const maxPhysA = rt.maxPhysicalAdults !== null && rt.maxPhysicalAdults !== undefined ? Number(rt.maxPhysicalAdults) : maxAdults;
    const maxPhysC = rt.maxPhysicalChildren !== null && rt.maxPhysicalChildren !== undefined ? Number(rt.maxPhysicalChildren) : maxChildren;
    const freeChildren = rt.freeChildrenCount !== null && rt.freeChildrenCount !== undefined ? Number(rt.freeChildrenCount) : 0;

    // Check for invalid legacy values
    if (baseAdults < 1) reasons.push('Legacy baseAdults is less than 1');
    if (maxAdults < baseAdults) reasons.push('Legacy maxAdults is less than baseAdults');
    if (maxPhysA < maxAdults) reasons.push('Legacy maxPhysicalAdults is less than maxAdults');
    if (maxPhysC < maxChildren) reasons.push('Legacy maxPhysicalChildren is less than maxChildren');

    if (reasons.length > 0) {
        return {
            roomTypeId: rt.id,
            roomTypeName: rt.name,
            currentOccupancyVersion: currentVersion,
            status: 'INVALID',
            isV2Ready: false,
            reasons,
            warnings,
            proposedCanonicalValues: {
                totalBaseOccupancy: null,
                totalMaxOccupancy: null,
                baseMaxAdults: null,
                baseMaxChildren: null,
                maxPhysicalAdults: null,
                maxPhysicalChildren: null,
                maxPhysicalInfants: null,
                freeChildrenCount: null,
            },
        };
    }

    // Evaluate whether legacy values represent a clear standard pattern (Safe) or an ambiguous exception (Review Required)
    // Standard Safe Pattern:
    // 1. baseAdults == maxAdults (or standard + extra adult), baseChildren == 0 (or standard child),
    // 2. No contradictory physical caps,
    // 3. Simple standard room: baseAdults = 2, maxAdults = 2 or 3, maxChildren = 0 or 1 or 2, maxPhysicalAdults >= maxAdults, maxPhysicalChildren >= maxChildren.
    const isStandardCleanPattern =
        baseAdults >= 1 &&
        baseAdults <= 4 &&
        maxAdults >= baseAdults &&
        maxAdults <= baseAdults + 2 &&
        maxChildren >= 0 &&
        maxChildren <= 2 &&
        maxPhysA >= maxAdults &&
        maxPhysC >= maxChildren &&
        (rt.groupMaxOccupancy === null || rt.groupMaxOccupancy === undefined || Number(rt.groupMaxOccupancy) >= maxAdults);

    // If there is legacy child divergence or baseChildren > 0 with baseAdults != 2, flag for review
    const hasAmbiguousChildSemantics = baseChildren > 0 || (maxChildren > 0 && freeChildren > maxChildren);
    const hasLargeDivergence = maxAdults - baseAdults > 2 || maxPhysA - maxAdults > 2;

    if (!isStandardCleanPattern || hasAmbiguousChildSemantics || hasLargeDivergence) {
        warnings.push('Legacy occupancy has custom or non-standard semantics requiring human confirmation.');
        if (hasAmbiguousChildSemantics) warnings.push('Non-zero legacy baseChildren or freeChildrenCount divergence detected.');
        if (hasLargeDivergence) warnings.push('High divergence between base, max, and physical adult limits.');

        return {
            roomTypeId: rt.id,
            roomTypeName: rt.name,
            currentOccupancyVersion: currentVersion,
            status: 'REVIEW_REQUIRED',
            isV2Ready: false,
            reasons: ['RoomType configuration has ambiguous legacy semantics; human review required before V2 activation.'],
            warnings,
            proposedCanonicalValues: {
                totalBaseOccupancy: baseAdults,
                totalMaxOccupancy: Math.min(maxPhysA + maxPhysC, maxAdults + maxChildren),
                baseMaxAdults: baseAdults,
                baseMaxChildren: baseChildren > 0 ? baseChildren : null,
                maxPhysicalAdults: maxPhysA,
                maxPhysicalChildren: maxPhysC,
                maxPhysicalInfants: 1,
                freeChildrenCount: freeChildren,
            },
        };
    }

    // Safe Automatic Mapping
    const proposedTotalBase = baseAdults;
    const proposedTotalMax = maxAdults + maxChildren;
    const proposedMaxPhysA = Math.max(maxPhysA, maxAdults);
    const proposedMaxPhysC = Math.max(maxPhysC, maxChildren);

    return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        currentOccupancyVersion: currentVersion,
        status: 'SAFE',
        isV2Ready: false, // Remains false until explicitly saved/confirmed into V2 fields
        reasons: ['Standard legacy configuration safely maps to canonical V2 fields'],
        warnings,
        proposedCanonicalValues: {
            totalBaseOccupancy: proposedTotalBase,
            totalMaxOccupancy: proposedTotalMax,
            baseMaxAdults: baseAdults,
            baseMaxChildren: null,
            maxPhysicalAdults: proposedMaxPhysA,
            maxPhysicalChildren: proposedMaxPhysC,
            maxPhysicalInfants: 1,
            freeChildrenCount: freeChildren,
        },
    };
}

/**
 * Audits a Property and all its RoomTypes for V2 activation eligibility.
 * Property is eligible ONLY if ALL required RoomTypes are ready/valid V2 configurations.
 */
export function auditPropertyReadiness(
    propertyId: string,
    propertyName: string | undefined,
    currentPropertyOccupancyVersion: string,
    roomTypes: RoomTypeAuditInput[]
): PropertyAuditResult {
    const roomTypeAudits = roomTypes.map(rt => auditRoomTypeMapping(rt));
    const blockingReasons: string[] = [];

    const totalRoomTypes = roomTypeAudits.length;
    let readyCount = 0;
    let reviewCount = 0;
    let invalidCount = 0;

    for (const audit of roomTypeAudits) {
        if (audit.isV2Ready) {
            readyCount++;
        } else if (audit.status === 'INVALID') {
            invalidCount++;
            blockingReasons.push(`RoomType "${audit.roomTypeName}" is INVALID: ${audit.reasons.join(', ')}`);
        } else if (audit.status === 'REVIEW_REQUIRED') {
            reviewCount++;
            blockingReasons.push(`RoomType "${audit.roomTypeName}" requires review: ${audit.reasons.join(', ')}`);
        } else {
            // Status is SAFE but not yet saved as V2
            blockingReasons.push(`RoomType "${audit.roomTypeName}" has safe proposed mapping but has not been saved as V2`);
        }
    }

    if (totalRoomTypes === 0) {
        blockingReasons.push('Property has no RoomTypes configured');
    }

    const isEligibleForV2Activation = totalRoomTypes > 0 && readyCount === totalRoomTypes && blockingReasons.length === 0;

    return {
        propertyId,
        propertyName,
        currentOccupancyVersion: currentPropertyOccupancyVersion || 'V1',
        isEligibleForV2Activation,
        totalRoomTypes,
        readyRoomTypesCount: readyCount,
        reviewRequiredRoomTypesCount: reviewCount,
        invalidRoomTypesCount: invalidCount,
        roomTypeAudits,
        blockingReasons,
    };
}

/**
 * Performs a non-mutating Shadow Validation comparing V1 legacy behavior
 * against V2 canonical behavior across standard occupancy combinations.
 */
export function performShadowValidation(
    rt: RoomTypeAuditInput,
    canonicalConfig?: CanonicalRoomPricingConfig
): ShadowValidationResult {
    const testMatrix: Array<{ adults: number; children: number; infants: number }> = [
        { adults: 1, children: 0, infants: 0 },
        { adults: 2, children: 0, infants: 0 },
        { adults: 3, children: 0, infants: 0 },
        { adults: 4, children: 0, infants: 0 },
        { adults: 1, children: 1, infants: 0 },
        { adults: 1, children: 2, infants: 0 },
        { adults: 2, children: 1, infants: 0 },
        { adults: 2, children: 2, infants: 0 },
        { adults: 2, children: 1, infants: 1 },
        { adults: 3, children: 1, infants: 0 },
        { adults: 3, children: 2, infants: 0 },
    ];

    const testedParties: ShadowPartyResult[] = [];
    let hasOccupancyDiff = false;
    let hasPricingDiff = false;

    // Resolve V2 config to test (either explicitly passed or proposed)
    const audit = auditRoomTypeMapping(rt);
    const proposed = audit.proposedCanonicalValues;
    const v2Cfg: CanonicalRoomPricingConfig = canonicalConfig || {
        totalBaseOccupancy: proposed.totalBaseOccupancy || 2,
        totalMaxOccupancy: proposed.totalMaxOccupancy || 4,
        maxPhysicalAdults: proposed.maxPhysicalAdults || 3,
        maxPhysicalChildren: proposed.maxPhysicalChildren || 2,
        maxPhysicalInfants: proposed.maxPhysicalInfants || 1,
        baseMaxAdults: proposed.baseMaxAdults,
        baseMaxChildren: proposed.baseMaxChildren,
        freeChildrenCount: proposed.freeChildrenCount || 0,
        extraAdultPrice: Number(rt.extraAdultPrice) || 0,
        extraChildPrice: Number(rt.extraChildPrice) || 0,
    };

    const basePrice = Number(rt.basePrice) || 1000;
    const legacyBaseAdults = Number(rt.baseAdults) || 2;
    const legacyMaxAdults = Number(rt.maxAdults) || legacyBaseAdults;
    const legacyMaxChildren = Number(rt.maxChildren) || 0;
    const legacyExtraAdultPrice = Number(rt.extraAdultPrice) || 0;
    const legacyExtraChildPrice = Number(rt.extraChildPrice) || 0;

    for (const party of testMatrix) {
        // Evaluate V1
        const v1AdultsAllowed = party.adults <= legacyMaxAdults;
        const v1ChildrenAllowed = party.children <= legacyMaxChildren;
        const v1Allowed = v1AdultsAllowed && v1ChildrenAllowed;

        let v1Price: number | undefined;
        if (v1Allowed) {
            const extraA = Math.max(0, party.adults - legacyBaseAdults);
            const extraC = Math.max(0, party.children - (rt.freeChildrenCount || 0));
            v1Price = basePrice + (extraA * legacyExtraAdultPrice) + (extraC * legacyExtraChildPrice);
        }

        // Evaluate V2
        const v2Feasibility = validatePhysicalFeasibility(
            { adults: party.adults, children: party.children, infants: party.infants },
            {
                totalMaxOccupancy: v2Cfg.totalMaxOccupancy,
                maxPhysicalAdults: v2Cfg.maxPhysicalAdults,
                maxPhysicalChildren: v2Cfg.maxPhysicalChildren,
                maxPhysicalInfants: v2Cfg.maxPhysicalInfants ?? 1,
            }
        );
        const v2Allowed = v2Feasibility.isValid;

        let v2Price: number | undefined;
        if (v2Allowed) {
            const surcharges = calculateCanonicalSurcharges(
                { adults: party.adults, children: party.children, infants: party.infants },
                v2Cfg
            );
            v2Price = basePrice + surcharges.totalExtraAmount;
        }

        if (v1Allowed !== v2Allowed) hasOccupancyDiff = true;
        if (v1Price !== undefined && v2Price !== undefined && v1Price !== v2Price) hasPricingDiff = true;

        testedParties.push({
            adults: party.adults,
            children: party.children,
            infants: party.infants,
            v1Allowed,
            v2Allowed,
            v1Price,
            v2Price,
            priceDelta: (v1Price !== undefined && v2Price !== undefined) ? (v2Price - v1Price) : undefined,
            notes: !v2Allowed ? v2Feasibility.violations.join('; ') : undefined,
        });
    }

    return {
        roomTypeId: rt.id,
        roomTypeName: rt.name,
        testedParties,
        hasOccupancyDifference: hasOccupancyDiff,
        hasPricingDifference: hasPricingDiff,
    };
}
