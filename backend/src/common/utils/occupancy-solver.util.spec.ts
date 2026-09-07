import {
    GuestParty,
    RoomTypeInventoryCandidate,
    isPhysicalRoomAllocationValid,
    solveAccommodationOptions,
} from './occupancy-solver.util';

describe('Occupancy Solver Utility (Pure Accommodation Solver)', () => {
    // Sample Room Types for testing
    const standardRoom: RoomTypeInventoryCandidate = {
        id: 'rt-std',
        name: 'Standard Deluxe',
        baseAdults: 2,
        baseChildren: 1,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
        maxPhysicalCapacity: 5,
        maxPhysicalInfants: 1,
        basePrice: 1000,
        extraAdultPrice: 300,
        extraChildPrice: 150,
        availableQuantity: 5,
    };

    const familySuite: RoomTypeInventoryCandidate = {
        id: 'rt-fam',
        name: 'Family Suite',
        baseAdults: 3,
        baseChildren: 2,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 3,
        maxPhysicalCapacity: 6,
        maxPhysicalInfants: 2,
        basePrice: 2000,
        extraAdultPrice: 400,
        extraChildPrice: 200,
        availableQuantity: 2,
    };

    const couplePod: RoomTypeInventoryCandidate = {
        id: 'rt-cpl',
        name: 'Couple Pod',
        baseAdults: 2,
        baseChildren: 0,
        maxPhysicalAdults: 2,
        maxPhysicalChildren: 0,
        maxPhysicalCapacity: 2,
        maxPhysicalInfants: 1,
        basePrice: 800,
        extraAdultPrice: 0,
        extraChildPrice: 0,
        availableQuantity: 3,
    };

    const adultHeavyAsymmetric: RoomTypeInventoryCandidate = {
        id: 'rt-asym-a',
        name: 'Adult Heavy Villa',
        baseAdults: 2,
        baseChildren: 0,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 1,
        maxPhysicalCapacity: 4,
        maxPhysicalInfants: 1,
        basePrice: 1500,
        availableQuantity: 2,
    };

    const childHeavyAsymmetric: RoomTypeInventoryCandidate = {
        id: 'rt-asym-c',
        name: 'Kids Bunk Lodge',
        baseAdults: 1,
        baseChildren: 2,
        maxPhysicalAdults: 1,
        maxPhysicalChildren: 3,
        maxPhysicalCapacity: 4,
        maxPhysicalInfants: 1,
        basePrice: 1200,
        availableQuantity: 2,
    };

    // -------------------------------------------------------------
    // 1. Single Room Validation Helper Tests
    // -------------------------------------------------------------
    describe('isPhysicalRoomAllocationValid (Single Room)', () => {
        it('should accept valid adult and child combinations within limits', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 1 }, standardRoom)).toBe(true);
            expect(isPhysicalRoomAllocationValid({ adults: 3, children: 2 }, standardRoom)).toBe(true);
            expect(isPhysicalRoomAllocationValid({ adults: 1, children: 0 }, standardRoom)).toBe(true);
        });

        it('should reject allocations with 0 adults', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 0, children: 2 }, standardRoom)).toBe(false);
        });

        it('should reject allocations exceeding maxPhysicalAdults', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 4, children: 0 }, standardRoom)).toBe(false);
        });

        it('should reject allocations exceeding maxPhysicalChildren', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 3 }, standardRoom)).toBe(false);
        });

        it('should reject allocations exceeding maxPhysicalCapacity (even if A and C individually fit)', () => {
            const cappedRoom: RoomTypeInventoryCandidate = {
                ...standardRoom,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 3,
                maxPhysicalCapacity: 4, // Hard cap 4
            };
            expect(isPhysicalRoomAllocationValid({ adults: 3, children: 2 }, cappedRoom)).toBe(false); // 5 > 4
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 2 }, cappedRoom)).toBe(true); // 4 <= 4
        });

        it('should reject allocations exceeding maxPhysicalInfants', () => {
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 1, infants: 2 }, standardRoom)).toBe(false);
            expect(isPhysicalRoomAllocationValid({ adults: 2, children: 1, infants: 1 }, standardRoom)).toBe(true);
        });
    });

    // -------------------------------------------------------------
    // 2. Pure Accommodation Solver Scenarios
    // -------------------------------------------------------------
    describe('solveAccommodationOptions', () => {
        // Scenario 1: Single room exact fit
        it('Scenario 1: Single room standard guest party (2 Adults, 1 Child)', () => {
            const party: GuestParty = { adults: 2, children: 1, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            // Both 1-room (1 Std) and 2-room (2 Std) are valid physical options
            expect(solutions.length).toBe(2);
            expect(solutions[0].totalRooms).toBe(1);
            expect(solutions[0].rooms[0].adults).toBe(2);
            expect(solutions[0].rooms[0].children).toBe(1);
            expect(solutions[0].rooms[0].extraAdults).toBe(0);
            expect(solutions[0].rooms[0].extraChildren).toBe(0);
            expect(solutions[0].pricingSummary?.totalPerNight).toBe(1000);
        });

        // Scenario 2: Single room maximum physical capacity boundary
        it('Scenario 2: Single room max physical capacity boundary (3 Adults, 2 Children = 5 cap)', () => {
            const party: GuestParty = { adults: 3, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            // 1-room, 2-room, and 3-room options are valid
            expect(solutions.length).toBe(3);
            const singleRoom = solutions.find((s) => s.totalRooms === 1)!;
            expect(singleRoom).toBeDefined();
            expect(singleRoom.rooms[0].adults).toBe(3);
            expect(singleRoom.rooms[0].children).toBe(2);
            expect(singleRoom.rooms[0].extraAdults).toBe(1);
            expect(singleRoom.rooms[0].extraChildren).toBe(1);
            expect(singleRoom.pricingSummary?.baseTotal).toBe(1000);
            expect(singleRoom.pricingSummary?.extraAdultTotal).toBe(300);
            expect(singleRoom.pricingSummary?.extraChildTotal).toBe(150);
            expect(singleRoom.pricingSummary?.totalPerNight).toBe(1450);
        });

        // Scenario 3: Single room capacity overflow failure
        it('Scenario 3: Single room overflow (4 Adults, 0 Children) cannot fit in single standardRoom', () => {
            const party: GuestParty = { adults: 4, children: 0, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            // Single room cannot take 4 adults (maxPhysicalAdults = 3), so single room should not appear
            const singleRoomSolutions = solutions.filter((s) => s.totalRooms === 1);
            expect(singleRoomSolutions.length).toBe(0);

            // But 2 rooms of standardRoom can fit (e.g. 2A + 2A)
            const twoRoomSolutions = solutions.filter((s) => s.totalRooms === 2);
            expect(twoRoomSolutions.length).toBeGreaterThan(0);
        });

        // Scenario 4: Same-type multi-room allocation (6 Adults, 2 Children)
        it('Scenario 4: Same-type multi-room allocation (6 Adults, 2 Children in Standard Deluxe)', () => {
            const party: GuestParty = { adults: 6, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            // 6 adults requires at least 2 rooms (since maxPhysicalAdults = 3, 2 * 3 = 6)
            expect(solutions.length).toBeGreaterThan(0);
            const solution = solutions.find((s) => s.totalRooms === 2);
            expect(solution).toBeDefined();
            expect(solution?.rooms.length).toBe(2);

            const totalAllocatedAdults = solution!.rooms.reduce((acc, r) => acc + r.adults, 0);
            const totalAllocatedChildren = solution!.rooms.reduce((acc, r) => acc + r.children, 0);
            expect(totalAllocatedAdults).toBe(6);
            expect(totalAllocatedChildren).toBe(2);

            // Each room must have at least 1 adult and <= 3 adults, <= 2 children
            for (const r of solution!.rooms) {
                expect(r.adults).toBeGreaterThanOrEqual(1);
                expect(r.adults).toBeLessThanOrEqual(3);
                expect(r.children).toBeLessThanOrEqual(2);
                expect(r.adults + r.children).toBeLessThanOrEqual(5);
            }
        });

        // Scenario 5: Multiple different room types (Mixed combination)
        it('Scenario 5: Mixed room types combination (Couple Pod + Family Suite)', () => {
            const party: GuestParty = { adults: 5, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [couplePod, familySuite]);

            expect(solutions.length).toBeGreaterThan(0);
            const mixedSolution = solutions.find(
                (s) => s.roomTypeCounts['rt-cpl'] === 1 && s.roomTypeCounts['rt-fam'] === 1
            );
            expect(mixedSolution).toBeDefined();
            expect(mixedSolution?.totalRooms).toBe(2);

            const cplRoom = mixedSolution!.rooms.find((r) => r.roomTypeId === 'rt-cpl')!;
            const famRoom = mixedSolution!.rooms.find((r) => r.roomTypeId === 'rt-fam')!;

            expect(cplRoom.adults).toBe(2);
            expect(cplRoom.children).toBe(0); // Couple Pod has maxPhysicalChildren = 0
            expect(famRoom.adults).toBe(3);
            expect(famRoom.children).toBe(2);
        });

        // Scenario 6: Asymmetric capacities with uneven adult distribution
        it('Scenario 6: Asymmetric capacities with uneven adult distribution', () => {
            // Party: 4 Adults, 2 Children
            // Available: 1 Adult-Heavy (Max 3A, 1C) + 1 Child-Heavy (Max 1A, 3C)
            const party: GuestParty = { adults: 4, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [adultHeavyAsymmetric, childHeavyAsymmetric]);

            const asymSolution = solutions.find(
                (s) => s.roomTypeCounts['rt-asym-a'] === 1 && s.roomTypeCounts['rt-asym-c'] === 1
            );
            expect(asymSolution).toBeDefined();

            const villa = asymSolution!.rooms.find((r) => r.roomTypeId === 'rt-asym-a')!;
            const bunk = asymSolution!.rooms.find((r) => r.roomTypeId === 'rt-asym-c')!;

            // Bunk lodge can only take max 1 adult, so villa MUST take 3 adults
            expect(villa.adults).toBe(3);
            expect(bunk.adults).toBe(1);

            // Total children = 2. Villa max 1C (cap 4 - 3A = 1C), Bunk max 3C (cap 4 - 1A = 3C).
            // Distribution must fit physical caps
            expect(villa.children + bunk.children).toBe(2);
            expect(villa.adults + villa.children).toBeLessThanOrEqual(4);
            expect(bunk.adults + bunk.children).toBeLessThanOrEqual(4);
        });

        // Scenario 7: Uneven child distribution
        it('Scenario 7: Uneven child distribution across 2 rooms', () => {
            // Party: 2 Adults, 3 Children in 2 Standard Deluxe rooms (Max 3A, 2C each)
            const party: GuestParty = { adults: 2, children: 3, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            const solution = solutions.find((s) => s.totalRooms === 2);
            expect(solution).toBeDefined();

            // 1 adult in room 1, 1 adult in room 2 (since 2 adults total, min 1 per room)
            // 3 children split: 2 in one room, 1 in the other
            const r1 = solution!.rooms[0];
            const r2 = solution!.rooms[1];
            expect(r1.adults).toBe(1);
            expect(r2.adults).toBe(1);
            expect(r1.children + r2.children).toBe(3);
            expect([r1.children, r2.children].sort()).toEqual([1, 2]);
        });

        // Scenario 8: Zero adults should return empty solutions
        it('Scenario 8: Zero adults should return empty solutions (invalid booking)', () => {
            const party: GuestParty = { adults: 0, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);
            expect(solutions).toEqual([]);
        });

        // Scenario 9: Infants do NOT consume A+C bed capacity and are free
        it('Scenario 9: Infants do not participate in A+C physical capacity and are free', () => {
            // Room at max physical A+C capacity (3 Adults, 2 Children = 5) + 1 Infant
            const party: GuestParty = { adults: 3, children: 2, infants: 1 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            const singleRoom = solutions.find((s) => s.totalRooms === 1)!;
            expect(singleRoom).toBeDefined();
            const room = singleRoom.rooms[0];
            expect(room.adults).toBe(3);
            expect(room.children).toBe(2);
            expect(room.infants).toBe(1);
            // Infant charge must be 0
            expect(singleRoom.pricingSummary?.infantTotal).toBe(0);
            expect(singleRoom.pricingSummary?.totalPerNight).toBe(1450); // 1000 + 300(extraA) + 150(extraC) + 0(infant)
        });

        // Scenario 10: Infant capacity overflow
        it('Scenario 10: Infant capacity overflow (2 Infants requested for 1 standardRoom with maxPhysicalInfants=1)', () => {
            const party: GuestParty = { adults: 2, children: 1, infants: 2 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            // Single room cannot accommodate 2 infants
            const singleRoom = solutions.filter((s) => s.totalRooms === 1);
            expect(singleRoom.length).toBe(0);

            // 2 standard rooms can accommodate 2 infants (1 per room)
            const twoRooms = solutions.filter((s) => s.totalRooms === 2);
            expect(twoRooms.length).toBeGreaterThan(0);
            expect(twoRooms[0].rooms[0].infants + twoRooms[0].rooms[1].infants).toBe(2);
        });

        // Scenario 11: Respecting room type availableQuantity limit
        it('Scenario 11: Respects physical inventory quantity limit (availableQuantity = 2)', () => {
            const limitedFamilySuite: RoomTypeInventoryCandidate = {
                ...familySuite,
                availableQuantity: 2,
            };

            // Party needs 3 Family Suites (12 Adults, 6 Children)
            const party: GuestParty = { adults: 12, children: 6, infants: 0 };
            const solutions = solveAccommodationOptions(party, [limitedFamilySuite]);

            // Since only 2 family suites are available, 3 cannot be booked
            expect(solutions.length).toBe(0);
        });

        // Scenario 12: Requested room count matching metadata
        it('Scenario 12: Requested room count metadata (requestedRooms = 2)', () => {
            const party: GuestParty = { adults: 2, children: 1, infants: 0, requestedRooms: 2 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            const singleRoomSol = solutions.find((s) => s.totalRooms === 1);
            const twoRoomSol = solutions.find((s) => s.totalRooms === 2);

            expect(singleRoomSol?.isRequestedRoomCountMatch).toBe(false);
            expect(twoRoomSol?.isRequestedRoomCountMatch).toBe(true);

            // Requested match is prioritized first
            expect(solutions[0].totalRooms).toBe(2);
        });

        // Scenario 13: Deduplication of room multisets (A+B vs B+A)
        it('Scenario 13: Duplicate room-set combination prevention (A+B and B+A represent same solution)', () => {
            const party: GuestParty = { adults: 4, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom, familySuite]);

            // Count how many solutions have exactly 1 standard and 1 family suite
            const mixedSolutions = solutions.filter(
                (s) => s.roomTypeCounts['rt-std'] === 1 && s.roomTypeCounts['rt-fam'] === 1
            );
            expect(mixedSolutions.length).toBe(1);
        });

        // Scenario 14: Solo traveller in single room
        it('Scenario 14: Solo traveller (1 Adult, 0 Children, 0 Infants)', () => {
            const party: GuestParty = { adults: 1, children: 0, infants: 0 };
            const solutions = solveAccommodationOptions(party, [couplePod, standardRoom]);

            expect(solutions.length).toBeGreaterThanOrEqual(2);
            const coupleSol = solutions.find((s) => s.rooms[0].roomTypeId === 'rt-cpl');
            expect(coupleSol).toBeDefined();
            expect(coupleSol?.rooms[0].adults).toBe(1);
            expect(coupleSol?.rooms[0].extraAdults).toBe(0);
            expect(coupleSol?.pricingSummary?.totalPerNight).toBe(800);
        });

        // Scenario 15: Children without enough adults across multiple rooms
        it('Scenario 15: Rejects multi-room if adults < rooms (e.g. 1 Adult, 4 Children across 2 rooms is impossible)', () => {
            const party: GuestParty = { adults: 1, children: 4, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            // Cannot have 2 rooms because adults = 1 and every room requires adults >= 1
            const multiRoom = solutions.filter((s) => s.totalRooms > 1);
            expect(multiRoom.length).toBe(0);
        });

        // Scenario 16: Zero available inventory across all room types
        it('Scenario 16: Zero available inventory returns empty solutions', () => {
            const soldOutRoom: RoomTypeInventoryCandidate = {
                ...standardRoom,
                availableQuantity: 0,
            };
            const party: GuestParty = { adults: 2, children: 1, infants: 0 };
            const solutions = solveAccommodationOptions(party, [soldOutRoom]);
            expect(solutions).toEqual([]);
        });

        // Scenario 17: Multi-room pricing calculation accuracy
        it('Scenario 17: Accurate multi-room pricing with extra adult & child charges', () => {
            // 2 Standard rooms (base: 2A, 1C). Allocation: Room1 (3A, 2C), Room2 (2A, 0C)
            // Room 1: base 1000 + extraAdult 300 + extraChild 150 = 1450
            // Room 2: base 1000 + 0 + 0 = 1000
            // Total per night = 2450
            const party: GuestParty = { adults: 5, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            const twoRoomSol = solutions.find((s) => s.totalRooms === 2);
            expect(twoRoomSol).toBeDefined();
            expect(twoRoomSol?.pricingSummary?.baseTotal).toBe(2000);
            expect(twoRoomSol?.pricingSummary?.extraAdultTotal).toBe(300);
            expect(twoRoomSol?.pricingSummary?.extraChildTotal).toBe(150);
            expect(twoRoomSol?.pricingSummary?.totalPerNight).toBe(2450);
        });

        // Scenario 18: Exact room type breakdown representation
        it('Scenario 18: Returns roomTypeCounts and roomTypeBreakdown accurately', () => {
            const party: GuestParty = { adults: 5, children: 2, infants: 0 };
            const solutions = solveAccommodationOptions(party, [couplePod, familySuite]);

            const mixed = solutions.find(
                (s) => s.roomTypeCounts['rt-cpl'] === 1 && s.roomTypeCounts['rt-fam'] === 1
            );
            expect(mixed).toBeDefined();
            expect(mixed?.roomTypeCounts).toEqual({ 'rt-cpl': 1, 'rt-fam': 1 });
            expect(mixed?.roomTypeBreakdown).toEqual([
                { roomTypeId: 'rt-cpl', roomTypeName: 'Couple Pod', count: 1 },
                { roomTypeId: 'rt-fam', roomTypeName: 'Family Suite', count: 1 },
            ]);
        });

        // Scenario 19: All children in family suite, all adults in couple pod when capacities allow
        it('Scenario 19: Partition respects per-room child capacity (Couple pod 0 children)', () => {
            const party: GuestParty = { adults: 3, children: 3, infants: 0 };
            const solutions = solveAccommodationOptions(party, [couplePod, familySuite]);

            const mixed = solutions.find(
                (s) => s.roomTypeCounts['rt-cpl'] === 1 && s.roomTypeCounts['rt-fam'] === 1
            );
            expect(mixed).toBeDefined();
            const cpl = mixed!.rooms.find((r) => r.roomTypeId === 'rt-cpl')!;
            const fam = mixed!.rooms.find((r) => r.roomTypeId === 'rt-fam')!;

            expect(cpl.children).toBe(0);
            expect(fam.children).toBe(3);
        });

        // Scenario 20: Maximum multi-room search bounded by adult count
        it('Scenario 20: Max rooms evaluated is bounded by adult count', () => {
            // 3 Adults cannot be allocated into 4 rooms
            const party: GuestParty = { adults: 3, children: 0, infants: 0 };
            const solutions = solveAccommodationOptions(party, [standardRoom]);

            for (const s of solutions) {
                expect(s.totalRooms).toBeLessThanOrEqual(3);
            }
        });
    });

    // -------------------------------------------------------------
    // 3. Proving Backtracking vs Naive Greedy / Even-Distribution Failure
    // -------------------------------------------------------------
    describe('Greedy / Even-Distribution Failure vs Backtracking Success', () => {
        /**
         * Counterexample Proof:
         * Room A (Adult-Heavy): Max 3 Adults, Max 1 Child (Cap 4)
         * Room B (Child-Heavy): Max 1 Adult, Max 3 Children (Cap 4)
         * Guest Party: 4 Adults, 4 Children
         *
         * Naive Even Split:
         * - Adults = 4 / 2 = 2 adults per room
         * - Children = 4 / 2 = 2 children per room
         *
         * Evaluating Room B with Naive Even Split:
         * - Room B has Adults = 2 > maxPhysicalAdults (1) -> FAILS!
         * Naive algorithm falsely reports: "No accommodation solution possible".
         *
         * Deterministic Backtracking:
         * - Room A gets 3 Adults, 1 Child (Valid: 3 <= 3, 1 <= 1, 3+1 = 4 <= 4)
         * - Room B gets 1 Adult, 3 Children (Valid: 1 <= 1, 3 <= 3, 1+3 = 4 <= 4)
         * Total: 4 Adults, 4 Children allocated successfully.
         */
        it('should SUCCEED via bounded backtracking where naive even adult/child distribution FAILS', () => {
            const party: GuestParty = { adults: 4, children: 4, infants: 0 };
            const candidateRooms = [adultHeavyAsymmetric, childHeavyAsymmetric];

            // 1. Prove Naive Even Distribution fails:
            const naiveSplitPerRoom = {
                adults: Math.floor(party.adults / 2),
                children: Math.floor(party.children / 2),
            };
            expect(naiveSplitPerRoom).toEqual({ adults: 2, children: 2 });

            const isRoomAValidUnderEvenSplit = isPhysicalRoomAllocationValid(naiveSplitPerRoom, adultHeavyAsymmetric);
            const isRoomBValidUnderEvenSplit = isPhysicalRoomAllocationValid(naiveSplitPerRoom, childHeavyAsymmetric);

            // Room A accepts (2A, 2C? wait: maxPhysicalChildren = 1, so 2C > 1 fails too!)
            expect(isRoomAValidUnderEvenSplit).toBe(false);
            // Room B rejects (2A > maxPhysicalAdults 1)
            expect(isRoomBValidUnderEvenSplit).toBe(false);

            // 2. Prove Backtracking solver finds the exact valid partition:
            const solutions = solveAccommodationOptions(party, candidateRooms);
            const validSolution = solutions.find(
                (s) => s.roomTypeCounts['rt-asym-a'] === 1 && s.roomTypeCounts['rt-asym-c'] === 1
            );

            expect(validSolution).toBeDefined();
            expect(validSolution?.totalRooms).toBe(2);

            const roomA = validSolution!.rooms.find((r) => r.roomTypeId === 'rt-asym-a')!;
            const roomB = validSolution!.rooms.find((r) => r.roomTypeId === 'rt-asym-c')!;

            expect(roomA.adults).toBe(3);
            expect(roomA.children).toBe(1);
            expect(roomB.adults).toBe(1);
            expect(roomB.children).toBe(3);

            expect(roomA.adults + roomB.adults).toBe(4);
            expect(roomA.children + roomB.children).toBe(4);
        });

        /**
         * Counterexample 2: Uneven 3-room heterogeneous partition
         * Room 1: Couple Pod (Max 2A, 0C)
         * Room 2: Adult-Heavy (Max 3A, 1C)
         * Room 3: Child-Heavy (Max 1A, 3C)
         * Party: 6 Adults, 3 Children
         *
         * Even split (2A, 1C):
         * - Couple Pod fails (1C > 0C)
         * - Child-Heavy fails (2A > 1A)
         *
         * Backtracking finds:
         * - Room 1 (Couple Pod): 2A, 0C
         * - Room 2 (Adult Heavy): 3A, 0C (or 2A, 1C)
         * - Room 3 (Child Heavy): 1A, 3C (or 1A, 2C)
         */
        it('should solve heterogeneous 3-room asymmetric allocation where even split fails', () => {
            const party: GuestParty = { adults: 6, children: 3, infants: 0 };
            const solutions = solveAccommodationOptions(party, [
                couplePod,
                adultHeavyAsymmetric,
                childHeavyAsymmetric,
            ]);

            const triSolution = solutions.find(
                (s) =>
                    s.roomTypeCounts['rt-cpl'] === 1 &&
                    s.roomTypeCounts['rt-asym-a'] === 1 &&
                    s.roomTypeCounts['rt-asym-c'] === 1
            );

            expect(triSolution).toBeDefined();
            expect(triSolution?.totalRooms).toBe(3);

            const cpl = triSolution!.rooms.find((r) => r.roomTypeId === 'rt-cpl')!;
            const asymA = triSolution!.rooms.find((r) => r.roomTypeId === 'rt-asym-a')!;
            const asymC = triSolution!.rooms.find((r) => r.roomTypeId === 'rt-asym-c')!;

            expect(cpl.children).toBe(0);
            expect(cpl.adults).toBeGreaterThanOrEqual(1);
            expect(asymC.adults).toBe(1);

            const totalA = cpl.adults + asymA.adults + asymC.adults;
            const totalC = cpl.children + asymA.children + asymC.children;
            expect(totalA).toBe(6);
            expect(totalC).toBe(3);
        });
    });
});
