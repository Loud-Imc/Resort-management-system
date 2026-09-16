import {
    GuestParty,
    RoomTypeInventoryCandidate,
    validatePhysicalFeasibility,
    isPhysicalRoomAllocationValid,
    classifyGuestDemographics,
    calculateCanonicalSurcharges,
    assignChildAgesToRooms,
    solveAccommodationOptions,
} from './occupancy-solver.util';

describe('Canonical Occupancy & Pricing Engine (Task 2A Phase 1)', () => {
    // -------------------------------------------------------------
    // Standard Test Inventory
    // -------------------------------------------------------------
    const standardRoom: RoomTypeInventoryCandidate = {
        id: 'rt-std',
        name: 'Standard Deluxe',
        totalBaseOccupancy: 3,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 2,
        maxPhysicalInfants: 1,
        baseMaxAdults: 2,
        baseMaxChildren: 1,
        freeChildrenCount: 1,
        basePrice: 3000,
        extraAdultPrice: 1000,
        extraChildPrice: 500,
        availableQuantity: 5,
    };

    const couplePod: RoomTypeInventoryCandidate = {
        id: 'rt-cpl',
        name: 'Couple Pod',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 2,
        maxPhysicalAdults: 2,
        maxPhysicalChildren: 0,
        maxPhysicalInfants: 1,
        baseMaxAdults: 2,
        baseMaxChildren: 0,
        freeChildrenCount: 0,
        basePrice: 1500,
        extraAdultPrice: 0,
        extraChildPrice: 0,
        availableQuantity: 3,
    };

    const familySuite: RoomTypeInventoryCandidate = {
        id: 'rt-fam',
        name: 'Family Suite',
        totalBaseOccupancy: 4,
        totalMaxOccupancy: 6,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 3,
        maxPhysicalInfants: 2,
        baseMaxAdults: 3,
        baseMaxChildren: 2,
        freeChildrenCount: 1,
        basePrice: 5000,
        extraAdultPrice: 1200,
        extraChildPrice: 600,
        availableQuantity: 2,
    };

    const adultHeavyAsymmetric: RoomTypeInventoryCandidate = {
        id: 'rt-asym-a',
        name: 'Adult Heavy Villa',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 1,
        maxPhysicalInfants: 1,
        baseMaxAdults: 2,
        baseMaxChildren: 0,
        freeChildrenCount: 0,
        basePrice: 2500,
        extraAdultPrice: 800,
        extraChildPrice: 400,
        availableQuantity: 2,
    };

    const childHeavyAsymmetric: RoomTypeInventoryCandidate = {
        id: 'rt-asym-c',
        name: 'Kids Bunk Lodge',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 1,
        maxPhysicalChildren: 3,
        maxPhysicalInfants: 1,
        baseMaxAdults: 1,
        baseMaxChildren: 2,
        freeChildrenCount: 1,
        basePrice: 2000,
        extraAdultPrice: 800,
        extraChildPrice: 400,
        availableQuantity: 2,
    };

    // =============================================================
    // 1. INPUT VALIDATION & FEASIBILITY TESTS
    // =============================================================
    describe('1. Physical Feasibility & Child-Age Input Validation', () => {
        const roomLimits = {
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
        };

        it('accepts valid single-room combinations with explicit child ages', () => {
            expect(validatePhysicalFeasibility({ adults: 1, children: 0 }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 2, children: 1, childAges: [4] }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 3, children: 1, childAges: [8] }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 2, children: 2, childAges: [4, 8] }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 2, children: 1, childAges: [5], infants: 1 }, roomLimits).isValid).toBe(true);
        });

        it('rejects allocations with 0 adults (A < 1)', () => {
            const res = validatePhysicalFeasibility({ adults: 0, children: 2, childAges: [4, 5] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations).toContain('At least one adult is required per room.');
        });

        it('rejects negative counts', () => {
            expect(validatePhysicalFeasibility({ adults: -1, children: 0 }, roomLimits).isValid).toBe(false);
            expect(validatePhysicalFeasibility({ adults: 1, children: -1 }, roomLimits).isValid).toBe(false);
            expect(validatePhysicalFeasibility({ adults: 1, children: 0, infants: -1 }, roomLimits).isValid).toBe(false);
        });

        it('Case A: rejects when childAges is shorter than children count (children=3, childAges=[4,5])', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 3, childAges: [4, 5] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('does not match children count'))).toBe(true);
        });

        it('Case B: rejects when childAges is longer than children count (children=2, childAges=[4,5,8])', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 2, childAges: [4, 5, 8] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('does not match children count'))).toBe(true);
        });

        it('Case C: rejects negative child age (children=1, childAges=[-1])', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 1, childAges: [-1] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('cannot be negative'))).toBe(true);
        });

        it('Case D: rejects child age 13+ (children=1, childAges=[13])', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 1, childAges: [13] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('13+ must be classified as adults'))).toBe(true);
        });

        it('Case E: rejects child age 0-2 inside childAges (children=2, childAges=[2,8])', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 2, childAges: [2, 8] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('0–2 must be classified as infants'))).toBe(true);
        });

        it('Case F: accepts valid children=2, childAges=[4,8]', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 2, childAges: [4, 8] }, roomLimits);
            expect(res.isValid).toBe(true);
        });

        it('rejects non-integer child age (children=1, childAges=[4.5])', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 1, childAges: [4.5] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('must be an integer'))).toBe(true);
        });

        it('rejects missing childAges when children > 0', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 1 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('Child ages are required'))).toBe(true);
        });

        it('rejects non-empty childAges when children === 0', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 0, childAges: [5] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('does not match children count'))).toBe(true);
        });

        it('rejects adult count exceeding maxPhysicalAdults (A > P_A)', () => {
            const res = validatePhysicalFeasibility({ adults: 4, children: 0 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed physical adult capacity'))).toBe(true);
        });

        it('rejects child count exceeding maxPhysicalChildren (C > P_C)', () => {
            const res = validatePhysicalFeasibility({ adults: 1, children: 3, childAges: [4, 5, 8] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed physical child capacity'))).toBe(true);
        });

        it('rejects total guests exceeding totalMaxOccupancy (A + C > M)', () => {
            // A=3 <= 3, C=2 <= 2, but A+C = 5 > 4 (M)
            const res = validatePhysicalFeasibility({ adults: 3, children: 2, childAges: [4, 8] }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed max room capacity'))).toBe(true);
        });

        it('rejects infant count exceeding maxPhysicalInfants (I > P_I)', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 1, childAges: [4], infants: 2 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed baby cot capacity'))).toBe(true);
        });

        it('verifies backward-compatibility helper isPhysicalRoomAllocationValid matches', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 1, childAges: [4] }, roomLimits)).toBe(true);
            expect(isPhysicalRoomAllocationValid({ adults: 0, children: 2, childAges: [4, 5] }, roomLimits)).toBe(false);
            expect(isPhysicalRoomAllocationValid({ adults: 4, children: 0 }, roomLimits)).toBe(false);
        });
    });

    // =============================================================
    // 2. DEMOGRAPHIC CLASSIFICATION TESTS
    // =============================================================
    describe('2. Canonical Demographic Classification (classifyGuestDemographics)', () => {
        it('classifies adults-only party correctly', () => {
            const demo = classifyGuestDemographics({ adults: 2, children: 0 }, { freeChildrenCount: 1 });
            expect(demo.adultsCount).toBe(2);
            expect(demo.freeChildrenCount).toBe(0);
            expect(demo.paidChildrenCount).toBe(0);
            expect(demo.totalPhysicalBedOccupants).toBe(2);
        });

        it('classifies free-child eligible children within allowance', () => {
            // FC = 2, ages [3, 4]
            const demo = classifyGuestDemographics({ adults: 2, children: 2, childAges: [3, 4] }, { freeChildrenCount: 2 });
            expect(demo.freeChildrenCount).toBe(2);
            expect(demo.paidChildrenCount).toBe(0);
            expect(demo.totalPhysicalBedOccupants).toBe(4);
        });

        it('classifies older children (7-12) as paid children', () => {
            // FC = 2, ages [7, 8]
            const demo = classifyGuestDemographics({ adults: 2, children: 2, childAges: [7, 8] }, { freeChildrenCount: 2 });
            expect(demo.freeChildrenCount).toBe(0);
            expect(demo.paidChildrenCount).toBe(2);
            expect(demo.totalPhysicalBedOccupants).toBe(4);
        });

        it('classifies mixed free and paid children (2A + [3, 8])', () => {
            const demo = classifyGuestDemographics({ adults: 2, children: 2, childAges: [3, 8] }, { freeChildrenCount: 1 });
            expect(demo.freeChildrenCount).toBe(1);
            expect(demo.paidChildrenCount).toBe(1);
            expect(demo.totalPhysicalBedOccupants).toBe(4);
        });

        it('spills over 3-6 children beyond FC into paid children ([3, 4, 5, 8] on FC=2)', () => {
            // FC = 2, ages [3, 4, 5, 8]
            // Eligible: 3 (ages 3, 4, 5). Allowance: 2 -> Free: 2, Spillover: 1. Older: 1 (age 8).
            // Paid children = 1 (older) + 1 (spillover) = 2.
            const demo = classifyGuestDemographics({ adults: 2, children: 4, childAges: [3, 4, 5, 8] }, { freeChildrenCount: 2 });
            expect(demo.freeChildrenCount).toBe(2);
            expect(demo.paidChildrenCount).toBe(2);
            expect(demo.totalPhysicalBedOccupants).toBe(6);
        });

        it('preserves infant independence in classification', () => {
            const demo = classifyGuestDemographics({ adults: 2, children: 1, childAges: [4], infants: 1 }, { freeChildrenCount: 1 });
            expect(demo.adultsCount).toBe(2);
            expect(demo.infantsCount).toBe(1);
            expect(demo.freeChildrenCount).toBe(1);
            expect(demo.paidChildrenCount).toBe(0);
            expect(demo.totalPhysicalBedOccupants).toBe(3); // Infants do not consume bed headcount
        });
    });

    // =============================================================
    // 3. STEP 4 FORENSIC REGRESSION TESTS (ELIMINATION OF CHILD->ADULT SPILLOVER)
    // =============================================================
    describe('3. Step 4 Forensic Regressions: Child Excess NEVER Billed as Extra Adult', () => {
        const heritageRoom = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 6,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 0,
            basePrice: 4500,
            extraAdultPrice: 900,
            extraChildPrice: 450,
        };

        it('S09 Regression: 2 Adults + [7, 8] (B=3, bMA=2, bMC=1) produces ₹4,950 (NOT ₹5,400)', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 2, childAges: [7, 8] }, heritageRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0); // STRICTLY 0 extra adults
            expect(res.extraChildrenCount).toBe(1); // 1 extra paid child
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(450);
            expect(res.totalExtraAmount).toBe(450);
            expect(res.totalPrice).toBe(4950);
        });

        it('S10 Regression: 4 Adults + [7, 8] (B=3, bMA=2, bMC=1) produces ₹6,750 (2 extra adults, 1 extra child)', () => {
            const res = calculateCanonicalSurcharges({ adults: 4, children: 2, childAges: [7, 8] }, heritageRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1); // remaining base slot is 0, so baseChildrenCovered = min(2, 1, 0) = 0? Wait!
            // Let's verify formula:
            // A=4, B=3, bMA=2 => BaseAdultsCovered = min(4, 2, 3) = 2.
            // RemainingBaseSlots = max(0, 3 - 2) = 1.
            // Cpaid = 2, bMC = 1 => BaseChildrenCovered = min(2, 1, 1) = 1.
            // ExtraAdults = max(0, 4 - 2) = 2 => 2 * 900 = 1800.
            // ExtraChildren = max(0, 2 - 1) = 1 => 1 * 450 = 450.
            // Total = 4500 + 1800 + 450 = 6750.
            expect(res.extraAdultsCount).toBe(2);
            expect(res.extraChildrenCount).toBe(1);
            expect(res.extraAdultAmount).toBe(1800);
            expect(res.extraChildAmount).toBe(450);
            expect(res.totalPrice).toBe(6750);
        });

        it('S15 Regression: 2 Adults + [7, 8, 9] (B=3, bMA=2, bMC=1, P_C=3, M=5) produces ₹5,400 (2 extra children)', () => {
            const bigChildRoom = {
                ...heritageRoom,
                totalMaxOccupancy: 5,
                maxPhysicalChildren: 3,
            };
            const res = calculateCanonicalSurcharges({ adults: 2, children: 3, childAges: [7, 8, 9] }, bigChildRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(2);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(900);
            expect(res.totalPrice).toBe(5400);
        });
    });

    // =============================================================
    // 4. FREE CHILD TESTS (F1 - F4)
    // =============================================================
    describe('4. Free Children Allowance Tests (F1 - F4) (B=3, bMA=2, bMC=1, FC=2)', () => {
        const freeChildRoom = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 6,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 4,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 2,
            basePrice: 4500,
            extraAdultPrice: 900,
            extraChildPrice: 450,
        };

        it('Test F1: 2A + [3] -> 1 Free, 0 Paid -> ₹4,500', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 1, childAges: [3] }, freeChildRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(1);
            expect(res.paidChildrenCount).toBe(0);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(4500);
        });

        it('Test F2: 2A + [3, 4] -> 2 Free, 0 Paid -> ₹4,500', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 2, childAges: [3, 4] }, freeChildRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(2);
            expect(res.paidChildrenCount).toBe(0);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(4500);
        });

        it('Test F3: 2A + [3, 4, 5] -> 2 Free, 1 Paid (covered in base bMC=1) -> ₹4,500', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 3, childAges: [3, 4, 5] }, freeChildRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(2);
            expect(res.paidChildrenCount).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(4500);
        });

        it('Test F4: 2A + [3, 4, 5, 8] -> 2 Free, 2 Paid (1 base, 1 extra) -> ₹4,950', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 4, childAges: [3, 4, 5, 8] }, freeChildRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(2);
            expect(res.paidChildrenCount).toBe(2);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(1);
            expect(res.extraChildAmount).toBe(450);
            expect(res.totalPrice).toBe(4950);
        });
    });

    // =============================================================
    // 5. MIXED AGE TESTS
    // =============================================================
    describe('5. Mixed Age Surcharge Tests', () => {
        const mixedRoom = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 6,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 4,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 1,
            basePrice: 4500,
            extraAdultPrice: 900,
            extraChildPrice: 450,
        };

        it('2A + [3, 8] -> Free=1, Paid=1 (base covered) -> ₹4,500', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 2, childAges: [3, 8] }, mixedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(1);
            expect(res.paidChildrenCount).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(4500);
        });

        it('2A + [4, 5, 8] -> Free=1, Paid=2 (1 base, 1 extra) -> ₹4,950', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 3, childAges: [4, 5, 8] }, mixedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(1);
            expect(res.paidChildrenCount).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraChildrenCount).toBe(1);
            expect(res.totalPrice).toBe(4950);
        });

        it('2A + [3, 4, 7, 10] with FC=2 -> Free=2, Paid=2 (1 base, 1 extra) -> ₹4,950', () => {
            const res = calculateCanonicalSurcharges(
                { adults: 2, children: 4, childAges: [3, 4, 7, 10] },
                { ...mixedRoom, freeChildrenCount: 2 }
            );
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(2);
            expect(res.paidChildrenCount).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraChildrenCount).toBe(1);
            expect(res.totalPrice).toBe(4950);
        });

        it('2A + [3, 6, 7, 12] with FC=1 -> Free=1, Paid=3 (1 base, 2 extra) -> ₹5,400', () => {
            const res = calculateCanonicalSurcharges(
                { adults: 2, children: 4, childAges: [3, 6, 7, 12] },
                mixedRoom
            );
            expect(res.isFeasible).toBe(true);
            expect(res.freeChildrenCount).toBe(1);
            expect(res.paidChildrenCount).toBe(3);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraChildrenCount).toBe(2);
            expect(res.extraChildAmount).toBe(900);
            expect(res.totalPrice).toBe(5400);
        });
    });

    // =============================================================
    // 6. INFANT INDEPENDENCE TESTS
    // =============================================================
    describe('6. Infant Independence (P_I = 1, ₹0 charge)', () => {
        const roomWithInfant = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 1,
            basePrice: 3000,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
        };

        it('2A + [4] + 1 Infant is VALID and ₹0 infant surcharge', () => {
            const res = calculateCanonicalSurcharges(
                { adults: 2, children: 1, childAges: [4], infants: 1 },
                roomWithInfant
            );
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(2); // 2 adults covered, 1 free child
            expect(res.freeChildrenCount).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });

        it('2A + 2 Infants is INVALID when P_I = 1', () => {
            const res = calculateCanonicalSurcharges(
                { adults: 2, children: 0, infants: 2 },
                roomWithInfant
            );
            expect(res.isFeasible).toBe(false);
            expect(res.violations!.some((v) => v.includes('baby cot capacity'))).toBe(true);
        });

        it('2A + 3 Infants is INVALID when P_I = 1', () => {
            const res = calculateCanonicalSurcharges(
                { adults: 2, children: 0, infants: 3 },
                roomWithInfant
            );
            expect(res.isFeasible).toBe(false);
        });
    });

    // =============================================================
    // 7. PHYSICAL CAPACITY CONSTRAINTS WITH FREE CHILDREN
    // =============================================================
    describe('7. Physical Bed Capacity Constraints with Free Children', () => {
        const constrainedRoom = {
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            freeChildrenCount: 2,
            basePrice: 3000,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
        };

        it('rejects 2A + [3, 4, 5] because 3 children > P_C=2 (even though 2 are free)', () => {
            const res = calculateCanonicalSurcharges(
                { adults: 2, children: 3, childAges: [3, 4, 5] },
                constrainedRoom
            );
            expect(res.isFeasible).toBe(false);
            expect(res.violations!.some((v) => v.includes('physical child capacity'))).toBe(true);
        });

        it('accepts 3A + [3] when M=4, P_A=3, P_C=4 (3+1=4 <= M)', () => {
            const bigRoom = {
                ...constrainedRoom,
                maxPhysicalChildren: 4,
            };
            const res = calculateCanonicalSurcharges(
                { adults: 3, children: 1, childAges: [3] },
                bigRoom
            );
            expect(res.isFeasible).toBe(true);
        });

        it('rejects 3A + [3, 4] when M=4 (3+2=5 > M=4)', () => {
            const bigRoom = {
                ...constrainedRoom,
                maxPhysicalChildren: 4,
            };
            const res = calculateCanonicalSurcharges(
                { adults: 3, children: 2, childAges: [3, 4] },
                bigRoom
            );
            expect(res.isFeasible).toBe(false);
            expect(res.violations!.some((v) => v.includes('max room capacity'))).toBe(true);
        });
    });

    // =============================================================
    // 8. B / bMA / bMC INTERACTION TESTS
    // =============================================================
    describe('8. B / bMA / bMC Capacity & Pricing Caps', () => {
        const baseRoom = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 0,
            basePrice: 3000,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
        };

        it('covers 3A on B=3, bMA=2 with 1 extra adult (capped by bMA)', () => {
            const res = calculateCanonicalSurcharges({ adults: 3, children: 0 }, baseRoom);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.extraAdultsCount).toBe(1);
            expect(res.totalPrice).toBe(4000);
        });

        it('covers 1A + [7, 8] on B=3, bMC=1 with 1 extra child (capped by bMC)', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 2, childAges: [7, 8] }, baseRoom);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraChildrenCount).toBe(1);
            expect(res.totalPrice).toBe(3500);
        });

        it('free children never consume baseMaxChildren or remainingBaseSlots', () => {
            const roomWithFree = { ...baseRoom, freeChildrenCount: 1 };
            // 1A + [4 (free), 8 (paid)]
            // Free child consumes 0 base slots. Paid child consumes 1 base slot (bMC=1).
            const res = calculateCanonicalSurcharges(
                { adults: 1, children: 2, childAges: [4, 8] },
                roomWithFree
            );
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(1); // paid child is covered in base
            expect(res.freeChildrenCount).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });
    });

    // =============================================================
    // 9. S11 MULTI-AGE RESOLUTION TESTS
    // =============================================================
    describe('9. S11 Multi-Age Proof: 4 Adults + 4 Children across Multi-Room Inventory', () => {
        const lakeHomestayDeluxe: RoomTypeInventoryCandidate = {
            id: 'rt-lake-deluxe',
            name: 'Lake View Deluxe',
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 1,
            basePrice: 4000,
            extraAdultPrice: 800,
            extraChildPrice: 400,
            availableQuantity: 4,
        };

        it('S11-A (All Free-Eligible: [3, 4, 5, 6]): 2 rooms get 1 free child each', () => {
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 4, infants: 0, childAges: [3, 4, 5, 6] },
                [lakeHomestayDeluxe]
            );
            expect(solutions.length).toBeGreaterThan(0);
            const best = solutions[0];
            expect(best.totalRooms).toBe(2);
            // Each room gets 2A + 2C (e.g. [3,4] in room 1, [5,6] in room 2).
            // For each room: FC=1 => 1 free, 1 paid.
            // Base covers 2A + 1 paid child (bMC=1).
            // Extra: 0 adults, 0 children! Total per room = ₹4,000 => Total = ₹8,000.
            expect(best.pricingSummary.totalPerNight).toBe(8000);
        });

        it('S11-B (Mixed: [3, 4, 7, 8]): 2 free children, 2 paid children', () => {
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 4, infants: 0, childAges: [3, 4, 7, 8] },
                [lakeHomestayDeluxe]
            );
            expect(solutions.length).toBeGreaterThan(0);
            const best = solutions[0];
            expect(best.totalRooms).toBe(2);
            // Room 1: 2A + [3, 7] -> 1 free, 1 paid (covered in base). Price = 4000.
            // Room 2: 2A + [4, 8] -> 1 free, 1 paid (covered in base). Price = 4000.
            // Total = ₹8,000.
            expect(best.pricingSummary.totalPerNight).toBe(8000);
        });

        it('S11-C (All Older Paid Children: [7, 8, 9, 10]): 4 paid children', () => {
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 4, infants: 0, childAges: [7, 8, 9, 10] },
                [lakeHomestayDeluxe]
            );
            expect(solutions.length).toBeGreaterThan(0);
            const best = solutions[0];
            expect(best.totalRooms).toBe(2);
            // Room 1: 2A + [7, 8] -> 0 free, 2 paid -> 1 base, 1 extra (₹400) -> ₹4,400.
            // Room 2: 2A + [9, 10] -> 0 free, 2 paid -> 1 base, 1 extra (₹400) -> ₹4,400.
            // Total = ₹8,800.
            expect(best.pricingSummary.totalPerNight).toBe(8800);
        });
    });

    // =============================================================
    // 10. MULTI-ROOM COMBINATORIAL SOLVER TESTS
    // =============================================================
    describe('10. Multi-Room Combinatorial Search & 4-Tier Ranking', () => {
        it('Scenario 1: Single room standard guest party (2A, 1C [4])', () => {
            const solutions = solveAccommodationOptions(
                { adults: 2, children: 1, infants: 0, childAges: [4] },
                [standardRoom, couplePod]
            );

            expect(solutions.length).toBeGreaterThan(0);
            const best = solutions[0];
            expect(best.isRecommended).toBe(true);
            expect(best.badge).toBe('Best Value');
            expect(best.totalRooms).toBe(1);
            expect(best.rooms[0].roomTypeId).toBe('rt-std');
            expect(best.pricingSummary.totalPerNight).toBe(3000);
        });

        it('Scenario 2: Multi-room same type allocation (6A, 2C [7, 8] in Standard Deluxe)', () => {
            const solutions = solveAccommodationOptions(
                { adults: 6, children: 2, infants: 0, childAges: [7, 8] },
                [standardRoom]
            );

            expect(solutions.length).toBeGreaterThan(0);
            const best = solutions[0];
            expect(best.isRecommended).toBe(true);
            expect(best.badge).toBe('Best Value');
            expect(best.totalRooms).toBe(2);
            expect(best.roomTypeCounts['rt-std']).toBe(2);
            // Each room gets 3A + 1C:
            // Base covers 2A + 1 paid child (bMC=1).
            // 1 Extra Adult per room (₹1,000) => ₹4,000 per room => ₹8,000 total.
            expect(best.pricingSummary.totalPerNight).toBe(8000);
        });

        it('Scenario 3: Multi-room optimal child age distribution across rooms with different FC', () => {
            // Room A: FC = 2, Room B: FC = 0
            // Party: 4 Adults, 2 Children [4, 8]
            // Optimal assignment puts the eligible child (age 4) in Room A (FC=2) so age 4 is free!
            const roomWithFC = { ...adultHeavyAsymmetric, freeChildrenCount: 2, id: 'rt-fc2' };
            const roomNoFC = { ...adultHeavyAsymmetric, freeChildrenCount: 0, id: 'rt-fc0' };

            const allocations = assignChildAgesToRooms(
                [roomNoFC, roomWithFC],
                [{ adults: 2, children: 1 }, { adults: 2, children: 1 }],
                [4, 8]
            );
            // Room index 1 (with FC=2) should get the eligible child (age 4)
            expect(allocations[1].length).toBe(1);
            expect(allocations[1][0]).toBe(4);
            expect(allocations[0][0]).toBe(8);
        });

        it('Scenario 4: Asymmetric capacities with uneven adult distribution', () => {
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 2, infants: 0, childAges: [4, 8] },
                [adultHeavyAsymmetric, childHeavyAsymmetric]
            );

            expect(solutions.length).toBeGreaterThan(0);
            const validSol = solutions.find(
                (s) => s.roomTypeCounts['rt-asym-a'] === 1 && s.roomTypeCounts['rt-asym-c'] === 1
            );
            expect(validSol).toBeDefined();
            const roomA = validSol!.rooms.find((r) => r.roomTypeId === 'rt-asym-a')!;
            const roomC = validSol!.rooms.find((r) => r.roomTypeId === 'rt-asym-c')!;
            expect(roomA.adults).toBe(3);
            expect(roomC.adults).toBe(1);
        });

        it('Scenario 5: 0 adults returns empty array', () => {
            const solutions = solveAccommodationOptions(
                { adults: 0, children: 2, infants: 0, childAges: [4, 5] },
                [standardRoom]
            );
            expect(solutions).toEqual([]);
        });

        it('Scenario 6: Rejects multi-room if adults < rooms (1A, 4C cannot be placed in 2 rooms)', () => {
            const solutions = solveAccommodationOptions(
                { adults: 1, children: 4, infants: 0, childAges: [4, 5, 7, 8] },
                [standardRoom]
            );
            expect(solutions.every((s) => s.totalRooms === 1)).toBe(true);
        });
    });
});
