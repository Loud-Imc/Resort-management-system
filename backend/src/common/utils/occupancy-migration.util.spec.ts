import {
    auditRoomTypeMapping,
    auditPropertyReadiness,
    performShadowValidation,
    RoomTypeAuditInput,
} from './occupancy-migration.util';

describe('Occupancy Migration & Compatibility Utility (Phase 6)', () => {
    describe('auditRoomTypeMapping', () => {
        it('Migration Case A: Safe standard legacy configuration maps to SAFE mapping without fabricating arbitrary values', () => {
            const standardRoom: RoomTypeAuditInput = {
                id: 'rt-std-1',
                name: 'Deluxe Room',
                propertyId: 'prop-1',
                occupancyVersion: 'V1',
                baseAdults: 2,
                maxAdults: 3,
                baseChildren: 0,
                maxChildren: 1,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 1,
                freeChildrenCount: 1,
                groupMaxOccupancy: null,
            };

            const audit = auditRoomTypeMapping(standardRoom);
            expect(audit.status).toBe('SAFE');
            expect(audit.isV2Ready).toBe(false); // Safe candidate, but not yet finalized to V2
            expect(audit.proposedCanonicalValues.totalBaseOccupancy).toBe(2);
            expect(audit.proposedCanonicalValues.totalMaxOccupancy).toBe(4); // 3 + 1
            expect(audit.proposedCanonicalValues.maxPhysicalAdults).toBe(3);
            expect(audit.proposedCanonicalValues.maxPhysicalChildren).toBe(1);
            expect(audit.proposedCanonicalValues.maxPhysicalInfants).toBe(1);
            expect(audit.proposedCanonicalValues.freeChildrenCount).toBe(1);
        });

        it('Migration Case B: Ambiguous legacy configuration (divergences / baseChildren > 0) flags as REVIEW_REQUIRED', () => {
            const ambiguousRoom: RoomTypeAuditInput = {
                id: 'rt-amb-1',
                name: 'Family Suite Divergent',
                propertyId: 'prop-1',
                occupancyVersion: 'V1',
                baseAdults: 2,
                maxAdults: 6, // High divergence
                baseChildren: 2, // Non-zero legacy baseChildren
                maxChildren: 4,
                maxPhysicalAdults: 8,
                maxPhysicalChildren: 4,
                freeChildrenCount: 3,
            };

            const audit = auditRoomTypeMapping(ambiguousRoom);
            expect(audit.status).toBe('REVIEW_REQUIRED');
            expect(audit.isV2Ready).toBe(false);
            expect(audit.reasons.length).toBeGreaterThan(0);
            expect(audit.warnings.length).toBeGreaterThan(0);
        });

        it('Migration Case C: Invalid legacy configuration (physical < base or max < base) flags as INVALID', () => {
            const invalidRoom: RoomTypeAuditInput = {
                id: 'rt-inv-1',
                name: 'Corrupted Room',
                propertyId: 'prop-1',
                occupancyVersion: 'V1',
                baseAdults: 3,
                maxAdults: 2, // max < base
                maxPhysicalAdults: 1,
                maxPhysicalChildren: 0,
            };

            const audit = auditRoomTypeMapping(invalidRoom);
            expect(audit.status).toBe('INVALID');
            expect(audit.isV2Ready).toBe(false);
            expect(audit.reasons.some(r => r.includes('maxAdults is less than baseAdults'))).toBe(true);
        });

        it('Migration Case D & E: Does NOT fabricate arbitrary totalBaseOccupancy or totalMaxOccupancy for invalid records', () => {
            const brokenRoom: RoomTypeAuditInput = {
                id: 'rt-broken',
                name: 'Broken Room',
                propertyId: 'prop-1',
                occupancyVersion: 'V1',
                baseAdults: 0, // invalid baseAdults
                maxAdults: 0,
            };

            const audit = auditRoomTypeMapping(brokenRoom);
            expect(audit.status).toBe('INVALID');
            expect(audit.proposedCanonicalValues.totalBaseOccupancy).toBeNull();
            expect(audit.proposedCanonicalValues.totalMaxOccupancy).toBeNull();
        });

        it('Already configured and valid V2 room type is recognized as SAFE and V2_READY', () => {
            const v2Room: RoomTypeAuditInput = {
                id: 'rt-v2-1',
                name: 'V2 Villa',
                propertyId: 'prop-1',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 1,
                freeChildrenCount: 1,
            };

            const audit = auditRoomTypeMapping(v2Room);
            expect(audit.status).toBe('SAFE');
            expect(audit.isV2Ready).toBe(true);
        });
    });

    describe('auditPropertyReadiness', () => {
        it('Migration Case F: Property with 100% ready V2 RoomTypes is eligible for V2 activation', () => {
            const roomTypes: RoomTypeAuditInput[] = [
                {
                    id: 'rt-1',
                    name: 'Villa A',
                    propertyId: 'prop-1',
                    occupancyVersion: 'V2',
                    totalBaseOccupancy: 2,
                    totalMaxOccupancy: 3,
                    maxPhysicalAdults: 3,
                    maxPhysicalChildren: 1,
                    maxPhysicalInfants: 1,
                },
                {
                    id: 'rt-2',
                    name: 'Villa B',
                    propertyId: 'prop-1',
                    occupancyVersion: 'V2',
                    totalBaseOccupancy: 3,
                    totalMaxOccupancy: 4,
                    maxPhysicalAdults: 3,
                    maxPhysicalChildren: 2,
                    maxPhysicalInfants: 1,
                },
            ];

            const result = auditPropertyReadiness('prop-1', 'Resort Alpha', 'V1', roomTypes);
            expect(result.isEligibleForV2Activation).toBe(true);
            expect(result.readyRoomTypesCount).toBe(2);
            expect(result.blockingReasons.length).toBe(0);
        });

        it('Migration Case G: Property with even one unresolved or review-required RoomType is NOT eligible for V2 activation', () => {
            const roomTypes: RoomTypeAuditInput[] = [
                {
                    id: 'rt-1',
                    name: 'Villa A (Ready)',
                    propertyId: 'prop-1',
                    occupancyVersion: 'V2',
                    totalBaseOccupancy: 2,
                    totalMaxOccupancy: 3,
                    maxPhysicalAdults: 3,
                    maxPhysicalChildren: 1,
                    maxPhysicalInfants: 1,
                },
                {
                    id: 'rt-2',
                    name: 'Suite B (Legacy Ambiguous)',
                    propertyId: 'prop-1',
                    occupancyVersion: 'V1',
                    baseAdults: 2,
                    maxAdults: 8,
                    baseChildren: 3,
                    maxChildren: 4,
                    maxPhysicalAdults: 8,
                    maxPhysicalChildren: 4,
                },
            ];

            const result = auditPropertyReadiness('prop-1', 'Resort Beta', 'V1', roomTypes);
            expect(result.isEligibleForV2Activation).toBe(false);
            expect(result.readyRoomTypesCount).toBe(1);
            expect(result.reviewRequiredRoomTypesCount).toBe(1);
            expect(result.blockingReasons.length).toBeGreaterThan(0);
        });

        it('Property with 0 RoomTypes is NOT eligible for V2 activation', () => {
            const result = auditPropertyReadiness('prop-empty', 'Empty Resort', 'V1', []);
            expect(result.isEligibleForV2Activation).toBe(false);
            expect(result.blockingReasons).toContain('Property has no RoomTypes configured');
        });
    });

    describe('performShadowValidation', () => {
        it('Migration Case H: performShadowValidation returns non-mutating comparison across guest party matrix', () => {
            const room: RoomTypeAuditInput = {
                id: 'rt-shadow-1',
                name: 'Executive Suite',
                propertyId: 'prop-1',
                occupancyVersion: 'V1',
                baseAdults: 2,
                maxAdults: 3,
                baseChildren: 0,
                maxChildren: 1,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 1,
                freeChildrenCount: 0,
                basePrice: 2000,
                extraAdultPrice: 500,
                extraChildPrice: 300,
            };

            const shadow = performShadowValidation(room, {
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 1,
                baseMaxAdults: 2,
                baseMaxChildren: null,
                freeChildrenCount: 0,
                extraAdultPrice: 500,
                extraChildPrice: 300,
            });

            expect(shadow.roomTypeId).toBe('rt-shadow-1');
            expect(shadow.testedParties.length).toBeGreaterThan(5);

            // 2 Adults + 0 Children
            const party2A = shadow.testedParties.find(p => p.adults === 2 && p.children === 0);
            expect(party2A?.v1Allowed).toBe(true);
            expect(party2A?.v2Allowed).toBe(true);
            expect(party2A?.v1Price).toBe(2000);
            expect(party2A?.v2Price).toBe(2000);
            expect(party2A?.priceDelta).toBe(0);

            // 3 Adults + 0 Children (V1: 2000 + 500 = 2500, V2: 2000 + 500 = 2500)
            const party3A = shadow.testedParties.find(p => p.adults === 3 && p.children === 0);
            expect(party3A?.v1Allowed).toBe(true);
            expect(party3A?.v2Allowed).toBe(true);
            expect(party3A?.v1Price).toBe(2500);
            expect(party3A?.v2Price).toBe(2500);
        });
    });
});
