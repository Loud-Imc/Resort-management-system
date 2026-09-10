import {
    generateOccupancyCompositions,
    validateRoomOccupancy,
    RoomOccupancyRules,
} from './occupancy.util';

describe('Occupancy Utility & Composition Generator', () => {
    describe('generateOccupancyCompositions', () => {
        it('should generate exact valid compositions for Max 3A + 2C (Cap: 5)', () => {
            const compositions = generateOccupancyCompositions(3, 2, 5);
            const labels = compositions.map((c) => c.label);

            expect(labels).toEqual([
                '1A',
                '1A + 1C',
                '1A + 2C',
                '2A',
                '2A + 1C',
                '2A + 2C',
                '3A',
                '3A + 1C',
                '3A + 2C',
            ]);
            expect(compositions.length).toBe(9);
        });

        it('should generate valid compositions for Base 2A + 1C (Cap: 3)', () => {
            const compositions = generateOccupancyCompositions(2, 1, 3);
            const labels = compositions.map((c) => c.label);

            expect(labels).toEqual(['1A', '1A + 1C', '2A', '2A + 1C']);
            expect(compositions.length).toBe(4);
        });

        it('should generate valid compositions for Standard 1A + 0C (Cap: 1)', () => {
            const compositions = generateOccupancyCompositions(1, 0, 1);
            const labels = compositions.map((c) => c.label);

            expect(labels).toEqual(['1A']);
            expect(compositions.length).toBe(1);
        });

        it('should generate valid compositions for Large Family Villa 4A + 2C (Cap: 6)', () => {
            const compositions = generateOccupancyCompositions(4, 2, 6);
            const labels = compositions.map((c) => c.label);

            expect(labels).toEqual([
                '1A',
                '1A + 1C',
                '1A + 2C',
                '2A',
                '2A + 1C',
                '2A + 2C',
                '3A',
                '3A + 1C',
                '3A + 2C',
                '4A',
                '4A + 1C',
                '4A + 2C',
            ]);
            expect(compositions.length).toBe(12);
        });

        it('should respect totalMaxCapacity when totalMaxCapacity is less than maxAdults + maxChildren', () => {
            // e.g., MaxAdults 3, MaxChildren 3, but TotalCap restricted to 4
            const compositions = generateOccupancyCompositions(3, 3, 4);
            const labels = compositions.map((c) => c.label);

            expect(labels).not.toContain('3A + 2C'); // sum = 5 > 4
            expect(labels).not.toContain('2A + 3C'); // sum = 5 > 4
            expect(labels).toContain('3A + 1C'); // sum = 4 <= 4
            expect(labels).toContain('2A + 2C'); // sum = 4 <= 4
            expect(labels).toContain('1A + 3C'); // sum = 4 <= 4
        });

        it('should correctly generate only valid compositions for PA=5, PC=4, M=3 regression case', () => {
            // For PA=5, PC=4, M=3:
            // Valid combinations: 1A, 1A+1C, 1A+2C, 2A, 2A+1C, 3A
            // Combinations must satisfy A >= 1, C >= 0, A <= 5, C <= 4, and A + C <= 3
            const compositions = generateOccupancyCompositions(5, 4, 3);
            const labels = compositions.map((c) => c.label);

            expect(labels).toEqual([
                '1A',
                '1A + 1C',
                '1A + 2C',
                '2A',
                '2A + 1C',
                '3A',
            ]);
            expect(compositions.length).toBe(6);

            // Verify no combination exceeds Total Max Occupancy (3)
            for (const comp of compositions) {
                expect(comp.adults + comp.children).toBeLessThanOrEqual(3);
                expect(comp.adults).toBeGreaterThanOrEqual(1);
                expect(comp.adults).toBeLessThanOrEqual(3);
                expect(comp.children).toBeGreaterThanOrEqual(0);
                expect(comp.children).toBeLessThanOrEqual(2);
            }
        });
    });

    describe('validateRoomOccupancy', () => {
        const standardRoomRules: RoomOccupancyRules = {
            baseAdults: 2,
            baseChildren: 1,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
        };

        it('should validate guest compositions within Base Occupancy', () => {
            const res1A = validateRoomOccupancy({ adults: 1, children: 0, infants: 0 }, standardRoomRules);
            expect(res1A.isValid).toBe(true);
            expect(res1A.isBaseIncluded).toBe(true);

            const res2A1C = validateRoomOccupancy({ adults: 2, children: 1, infants: 0 }, standardRoomRules);
            expect(res2A1C.isValid).toBe(true);
            expect(res2A1C.isBaseIncluded).toBe(true);
        });

        it('should validate guest compositions that require extra beds (above Base but within Physical Max)', () => {
            const res3A = validateRoomOccupancy({ adults: 3, children: 0, infants: 0 }, standardRoomRules);
            expect(res3A.isValid).toBe(true);
            expect(res3A.isBaseIncluded).toBe(false); // Extra adult bed required

            const res1A2C = validateRoomOccupancy({ adults: 1, children: 2, infants: 0 }, standardRoomRules);
            expect(res1A2C.isValid).toBe(true);
            expect(res1A2C.isBaseIncluded).toBe(false); // Extra child bed required

            const res3A2C = validateRoomOccupancy({ adults: 3, children: 2, infants: 0 }, standardRoomRules);
            expect(res3A2C.isValid).toBe(true);
            expect(res3A2C.isBaseIncluded).toBe(false); // Max physical limit
        });

        it('should reject invalid guest compositions (outside Physical Max)', () => {
            // Exceeds max physical adults (4 > 3)
            const res4A = validateRoomOccupancy({ adults: 4, children: 0, infants: 0 }, standardRoomRules);
            expect(res4A.isValid).toBe(false);
            expect(res4A.reason).toContain('exceeds maximum physical adult capacity');

            // Exceeds max physical children (3 > 2)
            const res2A3C = validateRoomOccupancy({ adults: 2, children: 3, infants: 0 }, standardRoomRules);
            expect(res2A3C.isValid).toBe(false);
            expect(res2A3C.reason).toContain('exceeds maximum physical child capacity');

            // 0 adults
            const res0A2C = validateRoomOccupancy({ adults: 0, children: 2, infants: 0 }, standardRoomRules);
            expect(res0A2C.isValid).toBe(false);
            expect(res0A2C.reason).toContain('At least 1 adult is required');
        });

        it('should validate infants as an independent dimension without reducing standard bed capacity', () => {
            // 3A + 2C + 1 Infant (fits 3A physical + 2C physical + 1 Infant in cot)
            const resMaxWithInfant = validateRoomOccupancy(
                { adults: 3, children: 2, infants: 1 },
                standardRoomRules
            );
            expect(resMaxWithInfant.isValid).toBe(true);

            // 2 Infants on a room allowing only 1 infant
            const resExceedInfant = validateRoomOccupancy(
                { adults: 2, children: 1, infants: 2 },
                standardRoomRules
            );
            expect(resExceedInfant.isValid).toBe(false);
            expect(resExceedInfant.reason).toContain('exceeds maximum baby cot capacity');
        });

        it('should not assume equal total headcounts mean equivalent occupancy', () => {
            // Total 4 guests:
            // 3A + 1C is valid (3A <= 3, 1C <= 2)
            const res3A1C = validateRoomOccupancy({ adults: 3, children: 1 }, standardRoomRules);
            expect(res3A1C.isValid).toBe(true);

            // 2A + 2C is valid (2A <= 3, 2C <= 2)
            const res2A2C = validateRoomOccupancy({ adults: 2, children: 2 }, standardRoomRules);
            expect(res2A2C.isValid).toBe(true);

            // 4A + 0C is INVALID even though total is 4 (because 4A > 3 maxPhysicalAdults)
            const res4A0C = validateRoomOccupancy({ adults: 4, children: 0 }, standardRoomRules);
            expect(res4A0C.isValid).toBe(false);

            // 1A + 3C is INVALID even though total is 4 (because 3C > 2 maxPhysicalChildren)
            const res1A3C = validateRoomOccupancy({ adults: 1, children: 3 }, standardRoomRules);
            expect(res1A3C.isValid).toBe(false);
        });
    });
});
