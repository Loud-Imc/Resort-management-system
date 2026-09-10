import {
    GuestParty,
    RoomTypeInventoryCandidate,
    validatePhysicalFeasibility,
    isPhysicalRoomAllocationValid,
    calculateCanonicalSurcharges,
    solveAccommodationOptions,
} from './occupancy-solver.util';

describe('Canonical Occupancy Engine (Phase 1 & 2)', () => {
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
    // 1. PHYSICAL FEASIBILITY VALIDATION TESTS
    // =============================================================
    describe('1. Physical Feasibility Validation (validatePhysicalFeasibility)', () => {
        const roomLimits = {
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
        };

        it('accepts valid single-room combinations', () => {
            expect(validatePhysicalFeasibility({ adults: 1, children: 0 }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 2, children: 1 }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 3, children: 1 }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 2, children: 2 }, roomLimits).isValid).toBe(true);
            expect(validatePhysicalFeasibility({ adults: 2, children: 1, infants: 1 }, roomLimits).isValid).toBe(true);
        });

        it('rejects allocations with 0 adults (A < 1)', () => {
            const res = validatePhysicalFeasibility({ adults: 0, children: 2 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations).toContain('At least one adult is required per room.');
        });

        it('rejects negative counts', () => {
            expect(validatePhysicalFeasibility({ adults: 1, children: -1 }, roomLimits).isValid).toBe(false);
            expect(validatePhysicalFeasibility({ adults: 1, children: 0, infants: -1 }, roomLimits).isValid).toBe(false);
        });

        it('rejects adult count exceeding maxPhysicalAdults (A > P_A)', () => {
            const res = validatePhysicalFeasibility({ adults: 4, children: 0 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed physical adult capacity'))).toBe(true);
        });

        it('rejects child count exceeding maxPhysicalChildren (C > P_C)', () => {
            const res = validatePhysicalFeasibility({ adults: 1, children: 3 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed physical child capacity'))).toBe(true);
        });

        it('rejects total guests exceeding totalMaxOccupancy (A + C > M)', () => {
            // A=3 <= 3, C=2 <= 2, but A+C = 5 > 4 (M)
            const res = validatePhysicalFeasibility({ adults: 3, children: 2 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed max room capacity'))).toBe(true);
        });

        it('rejects infant count exceeding maxPhysicalInfants (I > P_I)', () => {
            const res = validatePhysicalFeasibility({ adults: 2, children: 1, infants: 2 }, roomLimits);
            expect(res.isValid).toBe(false);
            expect(res.violations.some((v) => v.includes('exceed baby cot capacity'))).toBe(true);
        });

        it('verifies backward-compatibility helper isPhysicalRoomAllocationValid matches', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 1 }, roomLimits)).toBe(true);
            expect(isPhysicalRoomAllocationValid({ adults: 0, children: 2 }, roomLimits)).toBe(false);
            expect(isPhysicalRoomAllocationValid({ adults: 4, children: 0 }, roomLimits)).toBe(false);
        });
    });

    // =============================================================
    // 2. PURE BASE OCCUPANCY (NO DEMOGRAPHIC RESTRICTIONS)
    // =============================================================
    describe('2. Pure Base Occupancy (B=3, no bMA or bMC configured)', () => {
        const pureBaseRoom = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: null,
            baseMaxChildren: null,
            freeChildrenCount: 0,
            basePrice: 3000,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
        };

        it('covers 1A completely with ₹0 surcharge', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 0 }, pureBaseRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(1);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(0);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalExtraAmount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });

        it('covers 2A completely with ₹0 surcharge', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 0 }, pureBaseRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(2);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalExtraAmount).toBe(0);
        });

        it('covers 3A completely with ₹0 surcharge (dynamic headcount)', () => {
            const res = calculateCanonicalSurcharges({ adults: 3, children: 0 }, pureBaseRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(3);
            expect(res.baseAdultsCovered).toBe(3);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalExtraAmount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });

        it('covers 1A + 1C completely with ₹0 surcharge', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 1 }, pureBaseRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(2);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalExtraAmount).toBe(0);
        });

        it('covers 2A + 1C completely with ₹0 surcharge', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 1 }, pureBaseRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(3);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalExtraAmount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });

        it('covers 1A + 2C completely with ₹0 surcharge', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 2 }, pureBaseRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(3);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(2);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalExtraAmount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });
    });

    // =============================================================
    // 3. BASE DEMOGRAPHIC RESTRICTIONS
    // =============================================================
    describe('3. Base Demographic Restrictions (B=3, bMA=2, bMC=1)', () => {
        const restrictedRoom = {
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 0,
            basePrice: 3000,
            extraAdultPrice: 1000,
            extraChildPrice: 500,
        };

        it('3A on B=3, bMA=2 produces 1 Extra Adult (₹1,000 extra)', () => {
            const res = calculateCanonicalSurcharges({ adults: 3, children: 0 }, restrictedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(0);
            expect(res.extraAdultsCount).toBe(1);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.extraAdultAmount).toBe(1000);
            expect(res.extraChildAmount).toBe(0);
            expect(res.totalPrice).toBe(4000);
        });

        it('1A + 2C on B=3, bMC=1 produces 1 Extra Child (₹500 extra)', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 2 }, restrictedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(1);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(500);
            expect(res.totalPrice).toBe(3500);
        });
    });

    // =============================================================
    // 4. FREE CHILDREN (FC) SEMANTICS
    // =============================================================
    describe('4. Free Children Semantics (B=3, bMA=2, bMC=1, FC=1)', () => {
        const roomWithFC = {
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

        it('1A + 2C produces 1 base child and 1 extra child (NOT zero extra children)', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 2 }, roomWithFC);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            // 1 child is already free via base (c_base = 1). FC=1 means 0 free children available for uncovered!
            expect(res.extraChildrenCount).toBe(1);
            expect(res.freeChildrenCount).toBe(1);
            expect(res.totalExtraAmount).toBe(500);
            expect(res.totalPrice).toBe(3500);
        });

        it('1A + 1C produces 0 extra charges and 1 free child count', () => {
            const res = calculateCanonicalSurcharges({ adults: 1, children: 1 }, roomWithFC);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(1);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.freeChildrenCount).toBe(1);
            expect(res.totalPrice).toBe(3000);
        });
    });

    // =============================================================
    // 5. MIXED EXCESS HEADCOUNT RULE
    // =============================================================
    describe('5. Mixed Excess Headcount Rule (B=3, M=4, bMA=2, bMC=1, FC=1)', () => {
        const mixedRoom = {
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

        it('2A + 2C produces 1 Extra Adult and 0 Extra Children (Mixed Excess Rule)', () => {
            // A=2, C=2. Total headcount = 4 > B(3) => Excess = 1.
            // By rule: Excess above total base is charged as Extra Adult.
            const res = calculateCanonicalSurcharges({ adults: 2, children: 2 }, mixedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(1); // 1 extra adult fee for the mixed excess guest
            expect(res.extraChildrenCount).toBe(0); // 0 extra children fee
            expect(res.extraAdultAmount).toBe(1000);
            expect(res.extraChildAmount).toBe(0);
            expect(res.totalPrice).toBe(4000);
        });

        it('3A + 1C produces 1 Extra Adult and 0 Extra Children', () => {
            // A=3, C=1. Total headcount = 4 > B(3) => Excess = 1.
            const res = calculateCanonicalSurcharges({ adults: 3, children: 1 }, mixedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.baseChildrenCovered).toBe(1);
            expect(res.extraAdultsCount).toBe(1);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(4000);
        });

        it('4A + 0C produces 2 Extra Adults and 0 Extra Children', () => {
            const res = calculateCanonicalSurcharges({ adults: 4, children: 0 }, mixedRoom);
            expect(res.isFeasible).toBe(true);
            expect(res.baseAdultsCovered).toBe(2);
            expect(res.extraAdultsCount).toBe(2);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(5000);
        });
    });

    // =============================================================
    // 6. INFANT INDEPENDENCE & ZERO CHARGE
    // =============================================================
    describe('6. Infant Independence (P_I=1, ₹0 charge)', () => {
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

        it('2A + 1C + 1I does not increase A+C headcount or price (Infant is ₹0)', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 1, infants: 1 }, roomWithInfant);
            expect(res.isFeasible).toBe(true);
            expect(res.baseGuestsCovered).toBe(3);
            expect(res.extraAdultsCount).toBe(0);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(3000);
        });

        it('2A + 2C + 1I retains 1 Extra Adult charge with ₹0 for infant', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 2, infants: 1 }, roomWithInfant);
            expect(res.isFeasible).toBe(true);
            expect(res.extraAdultsCount).toBe(1);
            expect(res.extraChildrenCount).toBe(0);
            expect(res.totalPrice).toBe(4000);
        });

        it('rejects allocation when infants exceed maxPhysicalInfants', () => {
            const res = calculateCanonicalSurcharges({ adults: 2, children: 1, infants: 2 }, roomWithInfant);
            expect(res.isFeasible).toBe(false);
            expect(res.violations).toBeDefined();
            expect(res.violations!.some((v) => v.includes('baby cot'))).toBe(true);
        });
    });

    // =============================================================
    // 7. MULTI-ROOM COMBINATORIAL SEARCH & 4-TIER RANKING
    // =============================================================
    describe('7. Multi-Room Combinatorial Search & 4-Tier Ranking', () => {
        it('Scenario 1: Single room standard guest party (2A, 1C)', () => {
            const solutions = solveAccommodationOptions(
                { adults: 2, children: 1, infants: 0 },
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

        it('Scenario 2: Multi-room same type allocation (6A, 2C in Standard Deluxe)', () => {
            const solutions = solveAccommodationOptions(
                { adults: 6, children: 2, infants: 0 },
                [standardRoom]
            );

            expect(solutions.length).toBeGreaterThan(0);
            const best = solutions[0];
            expect(best.isRecommended).toBe(true);
            expect(best.badge).toBe('Best Value');
            expect(best.totalRooms).toBe(2);
            expect(best.roomTypeCounts['rt-std']).toBe(2);
            // Each room gets 3A + 1C:
            // Room 1: 3A+1C => Base covers 2A+1C, 1 Extra Adult => ₹4,000
            // Room 2: 3A+1C => Base covers 2A+1C, 1 Extra Adult => ₹4,000
            // Total per night = ₹8,000
            expect(best.pricingSummary.totalPerNight).toBe(8000);
        });

        it('Scenario 3: Mixed room types combination (Couple Pod + Family Suite)', () => {
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 2, infants: 0 },
                [couplePod, familySuite]
            );

            expect(solutions.length).toBeGreaterThan(0);
            const mixSolution = solutions.find(
                (s) => s.roomTypeCounts['rt-cpl'] === 1 && s.roomTypeCounts['rt-fam'] === 1
            );
            expect(mixSolution).toBeDefined();
            expect(mixSolution!.rooms.length).toBe(2);
        });

        it('Scenario 4: Asymmetric capacities with uneven adult distribution', () => {
            // rt-asym-a (P_A=3, P_C=1), rt-asym-c (P_A=1, P_C=3)
            // 4 Adults, 2 Children across both rooms:
            // Room A must take 3A + 0C (or 3A + 1C) and Room C must take 1A + 2C
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 2, infants: 0 },
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

        it('Scenario 5: Requested room count acts as ranking preference, not hard constraint', () => {
            // 2 Adults, 1 Child searching with requestedRooms = 2
            const solutions = solveAccommodationOptions(
                { adults: 2, children: 1, infants: 0, requestedRooms: 2 },
                [standardRoom]
            );

            expect(solutions.length).toBeGreaterThan(0);
            // 1-room solution is still returned and evaluated
            const oneRoom = solutions.find((s) => s.totalRooms === 1);
            const twoRoom = solutions.find((s) => s.totalRooms === 2);
            expect(oneRoom).toBeDefined();
            expect(twoRoom).toBeDefined();

            // 1-room solution is ₹3,000, 2-room solution is ₹6,000
            // Tier 1 (Price) ranks ₹3,000 as cheapest / Best Value
            expect(solutions[0].pricingSummary.totalPerNight).toBe(3000);
            expect(solutions[0].isRecommended).toBe(true);
            expect(solutions[0].badge).toBe('Best Value');
        });

        it('Scenario 6: 0 adults returns empty array', () => {
            const solutions = solveAccommodationOptions(
                { adults: 0, children: 2, infants: 0 },
                [standardRoom]
            );
            expect(solutions).toEqual([]);
        });

        it('Scenario 7: Rejects multi-room if adults < rooms (1A, 4C cannot be placed in 2 rooms)', () => {
            const solutions = solveAccommodationOptions(
                { adults: 1, children: 4, infants: 0 },
                [standardRoom]
            );
            // 1 adult cannot occupy 2 rooms simultaneously
            expect(solutions.every((s) => s.totalRooms === 1)).toBe(true);
        });

        it('Scenario 8: Respects physical inventory quantity limits', () => {
            const singleStockSuite = { ...familySuite, availableQuantity: 1 };
            const solutions = solveAccommodationOptions(
                { adults: 6, children: 4, infants: 0 },
                [singleStockSuite]
            );
            // Max 1 room available => cannot fulfill 10 guests in 1 family suite
            expect(solutions).toEqual([]);
        });

        it('Scenario 9: Bounded backtracking succeeds where naive even distribution fails', () => {
            // Party: 4 Adults, 4 Children (Total 8 guests)
            // Inventory:
            // Type 1 (Adult Heavy): P_A = 3, P_C = 1 (Total cap 4) - 1 room
            // Type 2 (Child Heavy): P_A = 1, P_C = 3 (Total cap 4) - 1 room
            // Naive even split (2A+2C in both) fails Type 1 (C=2 > 1) and Type 2 (A=2 > 1).
            // Backtracking finds (3A+1C in Type 1) and (1A+3C in Type 2).
            const solutions = solveAccommodationOptions(
                { adults: 4, children: 4, infants: 0 },
                [adultHeavyAsymmetric, childHeavyAsymmetric]
            );

            expect(solutions.length).toBeGreaterThan(0);
            const sol = solutions[0];
            expect(sol.rooms.length).toBe(2);
            const room1 = sol.rooms.find((r) => r.roomTypeId === 'rt-asym-a')!;
            const room2 = sol.rooms.find((r) => r.roomTypeId === 'rt-asym-c')!;
            expect(room1.adults).toBe(3);
            expect(room1.children).toBe(1);
            expect(room2.adults).toBe(1);
            expect(room2.children).toBe(3);
        });
    });
});
