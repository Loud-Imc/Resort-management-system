import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PricingService - Canonical V2 Pricing & V1 Isolation', () => {
    let service: PricingService;
    let prismaMock: any;
    let currenciesMock: any;
    let systemSettingsMock: any;

    const checkIn = new Date('2026-10-01T00:00:00.000Z');
    const checkOut = new Date('2026-10-02T00:00:00.000Z'); // 1 night

    beforeEach(async () => {
        prismaMock = {
            roomType: {
                findUnique: jest.fn(),
            },
            coupon: {
                findUnique: jest.fn().mockResolvedValue(null),
            },
            channelPartner: {
                findFirst: jest.fn().mockResolvedValue(null),
            },
            pricingRule: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            propertyPricingRule: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            offer: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            $queryRaw: jest.fn().mockResolvedValue([]),
        };

        currenciesMock = {
            getExchangeRate: jest.fn().mockResolvedValue(1),
        };

        systemSettingsMock = {
            getSetting: jest.fn().mockResolvedValue(null),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PricingService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: CurrenciesService, useValue: currenciesMock },
                { provide: SystemSettingsService, useValue: systemSettingsMock },
            ],
        }).compile();

        service = module.get<PricingService>(PricingService);
    });

    // =========================================================================
    // CASE A: Base Occupancy with No Base Demographic Restrictions
    // totalBaseOccupancy = 3, baseMaxAdults = null, baseMaxChildren = null
    // All combinations up to 3 A+C guests must be charged base price only.
    // =========================================================================
    describe('Case A — Base Occupancy (Unconstrained Demographic)', () => {
        const roomTypeA = {
            id: 'rt-case-a',
            name: 'Deluxe Room A',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: null,
            baseMaxChildren: null,
            freeChildrenCount: 0,
            basePrice: 2000,
            extraAdultPrice: 500,
            extraChildPrice: 250,
            isGstInclusive: false,
            property: {
                id: 'prop-1',
                name: 'Resort Alpha',
                occupancyVersion: 'V2',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(roomTypeA);
        });

        it.each([
            { adults: 1, children: 0, desc: '1A' },
            { adults: 2, children: 0, desc: '2A' },
            { adults: 3, children: 0, desc: '3A' },
            { adults: 1, children: 1, desc: '1A + 1C' },
            { adults: 2, children: 1, desc: '2A + 1C' },
            { adults: 1, children: 2, desc: '1A + 2C' },
        ])('should price $desc at base rate without extra charges', async ({ adults, children }) => {
            const result = await service.calculatePrice(
                'rt-case-a',
                checkIn,
                checkOut,
                adults,
                children,
            );

            expect(result.baseAmount).toBe(2000);
            expect(result.extraAdultAmount).toBe(0);
            expect(result.extraChildAmount).toBe(0);
            expect(result.totalAmount).toBe(2100); // 2000 + 5% fallback GST (100)
        });
    });

    // =========================================================================
    // CASE B: Base Demographic Restrictions
    // totalBaseOccupancy = 3, baseMaxAdults = 2, baseMaxChildren = 1
    // extraAdultPrice = 300, extraChildPrice = 150
    // =========================================================================
    describe('Case B — Base Demographic Restrictions', () => {
        const roomTypeB = {
            id: 'rt-case-b',
            name: 'Deluxe Room B',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 0,
            basePrice: 2000,
            extraAdultPrice: 300,
            extraChildPrice: 150,
            isGstInclusive: false,
            property: {
                id: 'prop-1',
                name: 'Resort Alpha',
                occupancyVersion: 'V2',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(roomTypeB);
        });

        it('1A -> base price', async () => {
            const res = await service.calculatePrice('rt-case-b', checkIn, checkOut, 1, 0);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(0);
        });

        it('2A -> base price', async () => {
            const res = await service.calculatePrice('rt-case-b', checkIn, checkOut, 2, 0);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(0);
        });

        it('1A + 1C -> base price', async () => {
            const res = await service.calculatePrice('rt-case-b', checkIn, checkOut, 1, 1);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(0);
        });

        it('2A + 1C -> base price', async () => {
            const res = await service.calculatePrice('rt-case-b', checkIn, checkOut, 2, 1);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(0);
        });

        it('3A -> +1 extra adult surcharge (+300)', async () => {
            const res = await service.calculatePrice('rt-case-b', checkIn, checkOut, 3, 0);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(300);
            expect(res.extraChildAmount).toBe(0);
        });

        it('1A + 2C -> +1 extra child surcharge (+150)', async () => {
            const res = await service.calculatePrice('rt-case-b', checkIn, checkOut, 1, 2);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(150);
        });
    });

    // =========================================================================
    // CASE C: Mixed Excess Rule (2A + 2C on B=3, bMA=2, bMC=1 -> 1 extra adult)
    // =========================================================================
    describe('Case C — Mixed Excess Rule', () => {
        const roomTypeC = {
            id: 'rt-case-c',
            name: 'Deluxe Room C',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 0,
            basePrice: 2000,
            extraAdultPrice: 300,
            extraChildPrice: 150,
            isGstInclusive: false,
            property: {
                id: 'prop-1',
                name: 'Resort Alpha',
                occupancyVersion: 'V2',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(roomTypeC);
        });

        it('2A + 2C classifies mixed excess as +1 extra adult (not extra child)', async () => {
            const res = await service.calculatePrice('rt-case-c', checkIn, checkOut, 2, 2);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(300);
            expect(res.extraChildAmount).toBe(0);
        });
    });

    // =========================================================================
    // CASE D: Free Children Allowance Semantics
    // B=3, bMA=2, bMC=1, freeChildrenCount=1, extraChildPrice=150
    // =========================================================================
    describe('Case D — Free Children Allowance', () => {
        const roomTypeD = {
            id: 'rt-case-d',
            name: 'Deluxe Room D',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 3,
            totalMaxOccupancy: 5,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 3,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 1,
            basePrice: 2000,
            extraAdultPrice: 300,
            extraChildPrice: 150,
            isGstInclusive: false,
            property: {
                id: 'prop-1',
                name: 'Resort Alpha',
                occupancyVersion: 'V2',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(roomTypeD);
        });

        it('1A + 2C (FC=1, bMC=1) -> 1st child uses base & FC=1, 2nd child is charged extra child price', async () => {
            const res = await service.calculatePrice('rt-case-d', checkIn, checkOut, 1, 2);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(150);
        });

        it('1A + 2C (FC=2, bMC=1) -> 2nd child covered by free allowance -> 0 extra child charge', async () => {
            prismaMock.roomType.findUnique.mockResolvedValueOnce({
                ...roomTypeD,
                freeChildrenCount: 2,
            });
            const res = await service.calculatePrice('rt-case-d', checkIn, checkOut, 1, 2);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(0);
        });

        it('2A + 2C -> free child does NOT expand base capacity; mixed excess applies -> 1 extra adult', async () => {
            const res = await service.calculatePrice('rt-case-d', checkIn, checkOut, 2, 2);
            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(300);
            expect(res.extraChildAmount).toBe(0);
        });
    });

    // =========================================================================
    // CASE E: Infants (Separate & Free)
    // =========================================================================
    describe('Case E — Infants', () => {
        const roomTypeE = {
            id: 'rt-case-e',
            name: 'Deluxe Room E',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 2,
            maxPhysicalAdults: 2,
            maxPhysicalChildren: 0,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 0,
            freeChildrenCount: 0,
            basePrice: 2000,
            extraAdultPrice: 500,
            extraChildPrice: 250,
            isGstInclusive: false,
            property: {
                id: 'prop-1',
                name: 'Resort Alpha',
                occupancyVersion: 'V2',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(roomTypeE);
        });

        it('2A + 1 Infant -> valid, infants do not consume headcount, ₹0 infant charge', async () => {
            const res = await service.calculatePrice(
                'rt-case-e',
                checkIn,
                checkOut,
                2,
                0,
                undefined,
                undefined,
                'INR',
                false,
                undefined,
                1,
                undefined,
                undefined,
                true,
                undefined,
                undefined,
                1 // 1 infant
            );

            expect(res.baseAmount).toBe(2000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(0);
        });
    });

    // =========================================================================
    // CASE F: Physical Validation & Rejection
    // =========================================================================
    describe('Case F — Physical Rejection', () => {
        const roomTypeF = {
            id: 'rt-case-f',
            name: 'Deluxe Room F',
            occupancyVersion: 'V2',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 3,
            maxPhysicalAdults: 2,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
            baseMaxAdults: 2,
            baseMaxChildren: 1,
            freeChildrenCount: 0,
            basePrice: 2000,
            extraAdultPrice: 500,
            extraChildPrice: 250,
            isGstInclusive: false,
            property: {
                id: 'prop-1',
                name: 'Resort Alpha',
                occupancyVersion: 'V2',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(roomTypeF);
        });

        it('rejects 0 adults (A < 1)', async () => {
            await expect(
                service.calculatePrice('rt-case-f', checkIn, checkOut, 0, 2)
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects adults exceeding maxPhysicalAdults (3A > 2)', async () => {
            await expect(
                service.calculatePrice('rt-case-f', checkIn, checkOut, 3, 0)
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects children exceeding maxPhysicalChildren (1A + 3C > 2)', async () => {
            await expect(
                service.calculatePrice('rt-case-f', checkIn, checkOut, 1, 3)
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects combined A+C exceeding totalMaxOccupancy (2A + 2C = 4 > 3)', async () => {
            await expect(
                service.calculatePrice('rt-case-f', checkIn, checkOut, 2, 2)
            ).rejects.toThrow(BadRequestException);
        });

        it('rejects infants exceeding maxPhysicalInfants (2 infants > 1)', async () => {
            await expect(
                service.calculatePrice(
                    'rt-case-f',
                    checkIn,
                    checkOut,
                    1,
                    0,
                    undefined,
                    undefined,
                    'INR',
                    false,
                    undefined,
                    1,
                    undefined,
                    undefined,
                    true,
                    undefined,
                    undefined,
                    2 // 2 infants
                )
            ).rejects.toThrow(BadRequestException);
        });
    });

    // =========================================================================
    // CASE G: Incomplete V2 Null Safety Guard
    // A roomType with occupancyVersion = V2 but null totalBaseOccupancy must fail
    // =========================================================================
    // =========================================================================
    // CASE G: Incomplete V2 Null Safety Guard & Property Switch
    // Under a V2 property, all RoomTypes must be V2-ready with non-null canonical fields
    // =========================================================================
    describe('Case G — Incomplete V2 RoomType Null Safety', () => {
        it('throws BadRequestException if required V2 canonical fields are missing under a V2 Property', async () => {
            prismaMock.roomType.findUnique.mockResolvedValue({
                id: 'rt-incomplete-v2',
                name: 'Incomplete V2 Room',
                occupancyVersion: 'V2',
                totalBaseOccupancy: null, // missing required V2 field
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 1,
                basePrice: 2000,
                extraAdultPrice: 500,
                extraChildPrice: 250,
                isGstInclusive: false,
                property: { id: 'prop-1', name: 'Resort Alpha', occupancyVersion: 'V2' },
            });

            await expect(
                service.calculatePrice('rt-incomplete-v2', checkIn, checkOut, 2, 0)
            ).rejects.toThrow(BadRequestException);
        });

        it('throws BadRequestException if a RoomType under a V2 Property is still marked V1 (not V2-ready)', async () => {
            prismaMock.roomType.findUnique.mockResolvedValue({
                id: 'rt-v1-in-v2-prop',
                name: 'Unready Room',
                occupancyVersion: 'V1', // not V2 ready
                baseAdults: 2,
                baseChildren: 1,
                maxAdults: 2,
                maxChildren: 1,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 1,
                basePrice: 2000,
                extraAdultPrice: 500,
                extraChildPrice: 250,
                isGstInclusive: false,
                property: { id: 'prop-1', name: 'Resort Alpha', occupancyVersion: 'V2' },
            });

            await expect(
                service.calculatePrice('rt-v1-in-v2-prop', checkIn, checkOut, 2, 0)
            ).rejects.toThrow(BadRequestException);
        });
    });

    // =========================================================================
    // CASE H: V1 Legacy Pricing Isolation & Regression
    // Property.occupancyVersion = V1 uses legacy baseAdults / baseChildren math unchanged,
    // even if a RoomType has occupancyVersion = V2
    // =========================================================================
    describe('Case H — V1 Legacy Pricing Isolation', () => {
        const legacyV1Room = {
            id: 'rt-legacy-v1',
            name: 'Legacy V1 Room',
            occupancyVersion: 'V1',
            baseAdults: 2,
            baseChildren: 1,
            maxAdults: 4,
            maxChildren: 2,
            maxPhysicalAdults: 4,
            maxPhysicalChildren: 2,
            basePrice: 1000,
            extraAdultPrice: 400,
            extraChildPrice: 200,
            isGstInclusive: false,
            property: {
                id: 'prop-legacy',
                name: 'Legacy Resort',
                occupancyVersion: 'V1',
            },
        };

        beforeEach(() => {
            prismaMock.roomType.findUnique.mockResolvedValue(legacyV1Room);
        });

        it('prices 3A as 1 extra adult under V1 legacy math', async () => {
            const res = await service.calculatePrice('rt-legacy-v1', checkIn, checkOut, 3, 0);
            expect(res.baseAmount).toBe(1000);
            expect(res.extraAdultAmount).toBe(400); // 3 - 2 = 1 extra adult
            expect(res.extraChildAmount).toBe(0);
        });

        it('prices 2A + 2C as 1 extra child under V1 legacy math', async () => {
            const res = await service.calculatePrice('rt-legacy-v1', checkIn, checkOut, 2, 2);
            expect(res.baseAmount).toBe(1000);
            expect(res.extraAdultAmount).toBe(0);
            expect(res.extraChildAmount).toBe(200); // 2 - 1 = 1 extra child
        });

        it('preserves V1 legacy math when Property is V1 even if RoomType has V2 readiness flag', async () => {
            prismaMock.roomType.findUnique.mockResolvedValueOnce({
                ...legacyV1Room,
                occupancyVersion: 'V2',
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
                property: {
                    id: 'prop-legacy',
                    name: 'Legacy Resort',
                    occupancyVersion: 'V1', // Property is V1
                },
            });

            const res = await service.calculatePrice('rt-legacy-v1', checkIn, checkOut, 3, 0);
            // Under V1 math: 3A - 2 baseAdults = 1 extra adult
            expect(res.baseAmount).toBe(1000);
            expect(res.extraAdultAmount).toBe(400);
        });
    });
});
