import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { PricingService } from './pricing.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { PropertyStatus } from '@prisma/client';

describe('AvailabilityService - Canonical V2 Search & Accommodation Integration', () => {
    let service: AvailabilityService;
    let prismaMock: any;
    let pricingServiceMock: any;
    let systemSettingsMock: any;

    const checkIn = new Date('2026-10-01T00:00:00.000Z');
    const checkOut = new Date('2026-10-02T00:00:00.000Z');

    beforeEach(async () => {
        prismaMock = {
            property: {
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn().mockResolvedValue(null),
            },
            roomType: {
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn().mockResolvedValue(null),
            },
            room: {
                findMany: jest.fn().mockResolvedValue([]),
                findUnique: jest.fn().mockImplementation(async ({ where }: any) => ({
                    id: where.id,
                    roomNumber: '101',
                    isEnabled: true,
                    status: 'AVAILABLE',
                    property: { defaultCheckOutTime: '11:00' },
                })),
            },
            booking: {
                findMany: jest.fn().mockResolvedValue([]),
                findFirst: jest.fn().mockResolvedValue(null),
            },
            roomBlock: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            stopSellRestriction: {
                findMany: jest.fn().mockResolvedValue([]),
                findFirst: jest.fn().mockResolvedValue(null),
            },
            restrictionRule: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            offer: {
                findMany: jest.fn().mockResolvedValue([]),
            },
            $queryRaw: jest.fn().mockResolvedValue([]),
        };

        pricingServiceMock = {
            calculatePrice: jest.fn().mockImplementation(async (roomTypeId, inDate, outDate, adults, children, _c, _r, _curr, _isG, _gSize, rooms, _gen, _ov, _inc, extraA, extraC) => ({
                baseAmount: 2000 * (rooms || 1),
                extraAdultAmount: (extraA || 0) * 500,
                extraChildAmount: (extraC || 0) * 250,
                taxAmount: 240 * (rooms || 1),
                totalAmount: 2240 * (rooms || 1) + (extraA || 0) * 560 + (extraC || 0) * 280,
                convertedTotal: 2240 * (rooms || 1) + (extraA || 0) * 560 + (extraC || 0) * 280,
                originalConvertedTotal: 2240 * (rooms || 1) + (extraA || 0) * 560 + (extraC || 0) * 280,
                numberOfNights: 1,
                pricePerNight: 2000 * (rooms || 1),
                taxRate: 0.12,
                isGstInclusive: false,
                offerDiscountAmount: 0,
            })),
        };

        systemSettingsMock = {
            getSetting: jest.fn().mockResolvedValue(50),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AvailabilityService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: PricingService, useValue: pricingServiceMock },
                { provide: SystemSettingsService, useValue: systemSettingsMock },
            ],
        }).compile();

        service = module.get<AvailabilityService>(AvailabilityService);
    });

    // =========================================================================
    // CASE G: Single Room Search (1 V2 room fits guest request)
    // =========================================================================
    describe('Case G — Single Room Search', () => {
        it('returns available V2 RoomType with neededRooms = 1', async () => {
            const v2RoomType = {
                id: 'rt-single-v2',
                name: 'Deluxe Queen',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 3,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 1,
                basePrice: 2000,
                extraAdultPrice: 500,
                extraChildPrice: 250,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 5 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([v2RoomType]);
            prismaMock.room.findMany.mockResolvedValue([{ id: 'r1', isEnabled: true, status: 'AVAILABLE' }]);

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                2, // 2 adults
                0, // 0 children
                undefined,
                undefined,
                false,
                1 // 1 room requested
            );

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('rt-single-v2');
            expect(results[0].neededRooms).toBe(1);
            expect(results[0].isRecommended).toBe(true);
            expect(results[0].badge).toBe('Best Value');
        });
    });

    // =========================================================================
    // CASE H: Multiple Rooms Solution (Same RoomType Repetition)
    // Guest party (4 adults) exceeds single room (max 2), needs 2 rooms
    // =========================================================================
    describe('Case H — Multiple Rooms Solution (Repeated RoomType)', () => {
        it('calculates multi-room solution with neededRooms = 2', async () => {
            const v2RoomType = {
                id: 'rt-multi-v2',
                name: 'Cozy Double',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 2,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 0,
                maxPhysicalInfants: 1,
                basePrice: 1500,
                extraAdultPrice: 0,
                extraChildPrice: 0,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 5 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([v2RoomType]);
            prismaMock.room.findMany.mockResolvedValue([
                { id: 'r1', isEnabled: true, status: 'AVAILABLE' },
                { id: 'r2', isEnabled: true, status: 'AVAILABLE' },
                { id: 'r3', isEnabled: true, status: 'AVAILABLE' },
            ]);

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                4, // 4 adults
                0, // 0 children
                undefined,
                undefined,
                false,
                2 // requested 2 rooms
            );

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('rt-multi-v2');
            expect(results[0].neededRooms).toBe(2);
        });
    });

    // =========================================================================
    // CASE I: Unequal Allocation Across Rooms
    // 2 adults + 5 children across 2 family suites (1A+3C and 1A+2C)
    // =========================================================================
    describe('Case I — Unequal Room Allocation', () => {
        it('allocates unequal guest counts (e.g. 1A+3C and 1A+2C) across rooms', async () => {
            const suite = {
                id: 'rt-suite',
                name: 'Family Suite',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 5,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 4,
                maxPhysicalInfants: 1,
                basePrice: 3000,
                extraAdultPrice: 600,
                extraChildPrice: 300,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 4 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([suite]);
            prismaMock.room.findMany.mockResolvedValue([
                { id: 'r1', isEnabled: true, status: 'AVAILABLE' },
                { id: 'r2', isEnabled: true, status: 'AVAILABLE' },
            ]);

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                2, // 2 adults
                5, // 5 children (total 7 guests)
                undefined,
                undefined,
                false,
                2
            );

            expect(results.length).toBe(1);
            expect(results[0].neededRooms).toBe(2);
        });
    });

    // =========================================================================
    // CASE J: Mixed RoomTypes
    // Property has 1 Deluxe Villa (cap 4) and 1 Standard Cottage (cap 4).
    // A party of 4 adults + 4 children (8 guests) is accommodated by 1 Villa + 1 Cottage.
    // =========================================================================
    describe('Case J — Mixed RoomTypes', () => {
        it('returns mixed RoomType combination when pure solutions are insufficient', async () => {
            const villa = {
                id: 'rt-villa',
                name: 'Deluxe Villa',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 3,
                maxPhysicalInfants: 1,
                basePrice: 4000,
                extraAdultPrice: 800,
                extraChildPrice: 400,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 2 },
                },
            };

            const cottage = {
                id: 'rt-cottage',
                name: 'Standard Cottage',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 3,
                maxPhysicalInfants: 1,
                basePrice: 3000,
                extraAdultPrice: 600,
                extraChildPrice: 300,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 2 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([villa, cottage]);
            // Exactly 1 room available for each type (cannot do 2 villas or 2 cottages)
            prismaMock.room.findMany.mockImplementation(async ({ where }: any) => {
                if (where.roomTypeId === 'rt-villa') {
                    return [{ id: 'r-villa-1', isEnabled: true, status: 'AVAILABLE' }];
                }
                if (where.roomTypeId === 'rt-cottage') {
                    return [{ id: 'r-cot-1', isEnabled: true, status: 'AVAILABLE' }];
                }
                return [];
            });

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                4, // 4 adults
                4, // 4 children (total 8 guests)
                undefined,
                undefined,
                false,
                2
            );

            expect(results.length).toBeGreaterThanOrEqual(1);
            // Both participating room types should be available in the results
            const roomTypeIds = results.map(r => r.id);
            expect(roomTypeIds).toContain('rt-villa');
            expect(roomTypeIds).toContain('rt-cottage');
        });
    });

    // =========================================================================
    // CASE K: Requested Room Count as Ranking Preference
    // Preferred room count affects ranking, NOT hard elimination of valid options
    // =========================================================================
    describe('Case K — Requested Room Count Ranking Preference', () => {
        it('returns multi-room solutions even if user requested rooms=1', async () => {
            const smallRoom = {
                id: 'rt-small',
                name: 'Small Double',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 2,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 0,
                maxPhysicalInfants: 1,
                basePrice: 1500,
                extraAdultPrice: 0,
                extraChildPrice: 0,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 4 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([smallRoom]);
            prismaMock.room.findMany.mockResolvedValue([
                { id: 'r1', isEnabled: true, status: 'AVAILABLE' },
                { id: 'r2', isEnabled: true, status: 'AVAILABLE' },
            ]);

            // User asked for rooms=1, but 4 adults need 2 rooms
            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                4, // 4 adults
                0,
                undefined,
                undefined,
                false,
                1 // requested 1 room
            );

            expect(results.length).toBe(1);
            expect(results[0].neededRooms).toBe(2);
        });
    });

    // =========================================================================
    // CASE L: Ranking & Cheapest Recommendation
    // =========================================================================
    describe('Case L — Recommendation & Sorting', () => {
        it('identifies the cheapest valid solution as recommended', async () => {
            const cheapRoom = {
                id: 'rt-cheap',
                name: 'Economy Room',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 2,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 1,
                maxPhysicalInfants: 1,
                basePrice: 1000,
                extraAdultPrice: 300,
                extraChildPrice: 150,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 5 },
                },
            };

            const premiumRoom = {
                id: 'rt-prem',
                name: 'Premium Room',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 3,
                maxPhysicalAdults: 3,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 1,
                basePrice: 4000,
                extraAdultPrice: 800,
                extraChildPrice: 400,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 5 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([cheapRoom, premiumRoom]);
            prismaMock.room.findMany.mockResolvedValue([{ id: 'r1', isEnabled: true, status: 'AVAILABLE' }]);

            // Custom pricing mock for cheap vs premium
            pricingServiceMock.calculatePrice.mockImplementation(async (roomTypeId: string) => {
                const isCheap = roomTypeId === 'rt-cheap';
                const total = isCheap ? 1000 : 4000;
                return {
                    baseAmount: total,
                    extraAdultAmount: 0,
                    extraChildAmount: 0,
                    taxAmount: total * 0.12,
                    totalAmount: total * 1.12,
                    convertedTotal: total * 1.12,
                    originalConvertedTotal: total * 1.12,
                    numberOfNights: 1,
                    pricePerNight: total,
                    taxRate: 0.12,
                    isGstInclusive: false,
                    offerDiscountAmount: 0,
                };
            });

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                2,
                0
            );

            expect(results.length).toBe(2);
            // The cheapest room should be ranked first and recommended
            expect(results[0].id).toBe('rt-cheap');
            expect(results[0].isRecommended).toBe(true);
            expect(results[0].badge).toBe('Best Value');
        });
    });

    // =========================================================================
    // CASE M: groupMaxOccupancy Isolation from Standard V2 Search
    // =========================================================================
    describe('Case M — groupMaxOccupancy Isolation', () => {
        it('ignores groupMaxOccupancy during standard V2 availability search', async () => {
            const roomWithGroupCap = {
                id: 'rt-group-cap',
                name: 'Standard with High Group Cap',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 2, // physical standard cap is 2
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 0,
                maxPhysicalInfants: 1,
                groupMaxOccupancy: 10, // group booking cap should NOT be used for standard search
                basePrice: 1500,
                extraAdultPrice: 0,
                extraChildPrice: 0,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 1 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([roomWithGroupCap]);
            prismaMock.room.findMany.mockResolvedValue([{ id: 'r1', isEnabled: true, status: 'AVAILABLE' }]);

            // Search for 4 adults in 1 room (fails because totalMaxOccupancy = 2, even though groupMaxOccupancy = 10)
            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                4,
                0,
                undefined,
                undefined,
                false,
                1
            );

            expect(results.length).toBe(0);
        });
    });

    // =========================================================================
    // CASE N: Non-Lossy Candidate Prefilter
    // Ensure room capable of participating in multi-room solution is queryable
    // =========================================================================
    describe('Case N — Non-Lossy Candidate Prefilter', () => {
        it('does not eliminate room types with totalMaxOccupancy < totalGuests when multi-room search is permitted', async () => {
            const candidateRoom = {
                id: 'rt-cand',
                name: 'Candidate Room',
                propertyId: 'prop-v2',
                occupancyVersion: 'V2',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 4, // 4 < 8 guests, but 2 rooms can hold 8
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 1,
                basePrice: 2000,
                extraAdultPrice: 500,
                extraChildPrice: 250,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v2',
                    name: 'V2 Resort',
                    occupancyVersion: 'V2',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 4 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([candidateRoom]);
            prismaMock.room.findMany.mockResolvedValue([
                { id: 'r1', isEnabled: true, status: 'AVAILABLE' },
                { id: 'r2', isEnabled: true, status: 'AVAILABLE' },
            ]);

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                4, // 4 adults
                4, // 4 children (total 8 guests)
                undefined,
                undefined,
                false,
                2 // requested 2 rooms
            );

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('rt-cand');
            expect(results[0].neededRooms).toBe(2);
        });
    });

    // =========================================================================
    // CASE O: V1 Search Regression Safety & Property Activation Boundary
    // =========================================================================
    describe('Case O — V1 Search Regression & Property Boundary', () => {
        it('executes legacy search path when Property is V1', async () => {
            const v1Room = {
                id: 'rt-v1',
                name: 'Legacy Standard',
                propertyId: 'prop-v1',
                occupancyVersion: 'V1',
                baseAdults: 2,
                baseChildren: 1,
                maxAdults: 2,
                maxChildren: 1,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 1,
                basePrice: 1200,
                extraAdultPrice: 400,
                extraChildPrice: 200,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v1',
                    name: 'Legacy Resort',
                    occupancyVersion: 'V1',
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 3 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([v1Room]);
            prismaMock.room.findMany.mockResolvedValue([{ id: 'r1', isEnabled: true, status: 'AVAILABLE' }]);

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                2,
                0,
                undefined,
                undefined,
                false,
                1
            );

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('rt-v1');
            expect(results[0].neededRooms).toBe(1);
        });

        it('executes legacy search when Property is V1 even if a RoomType has V2 readiness flag', async () => {
            const v1PropertyRoom = {
                id: 'rt-v2-ready-in-v1-prop',
                name: 'V2 Ready Room in V1 Property',
                propertyId: 'prop-v1',
                occupancyVersion: 'V2', // RoomType has V2 readiness flag
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
                baseAdults: 2,
                baseChildren: 1,
                maxAdults: 2,
                maxChildren: 1,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 1,
                basePrice: 1200,
                extraAdultPrice: 400,
                extraChildPrice: 200,
                isPubliclyVisible: true,
                property: {
                    id: 'prop-v1',
                    name: 'Legacy Resort',
                    occupancyVersion: 'V1', // Property is V1
                    isActive: true,
                    status: PropertyStatus.APPROVED,
                    _count: { rooms: 3 },
                },
            };

            prismaMock.roomType.findMany.mockResolvedValue([v1PropertyRoom]);
            prismaMock.room.findMany.mockResolvedValue([{ id: 'r1', isEnabled: true, status: 'AVAILABLE' }]);

            const results = await service.searchAvailableRoomTypes(
                checkIn,
                checkOut,
                2,
                0,
                undefined,
                undefined,
                false,
                1
            );

            expect(results.length).toBe(1);
            expect(results[0].id).toBe('rt-v2-ready-in-v1-prop');
            expect(results[0].neededRooms).toBe(1);
        });
    });
});
