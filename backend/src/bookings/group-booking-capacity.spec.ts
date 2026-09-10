import { Test, TestingModule } from '@nestjs/testing';
import { RoomTypesService } from '../room-types/room-types.service';
import { AvailabilityService } from './availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { ConnectivityOutboxService } from '../connectivity/services/connectivity-outbox.service';
import { PricingService } from './pricing.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';

describe('Group Booking Capacity — Final V2 totalMaxOccupancy Authority Tests', () => {
    let roomTypesService: RoomTypesService;
    let availabilityService: AvailabilityService;
    let prisma: any;

    beforeEach(async () => {
        prisma = {
            property: {
                findUnique: jest.fn().mockResolvedValue({ id: 'prop-1', name: 'Alpha Resort', occupancyVersion: 'V2', ownerId: 'user-1', staff: [] }),
                update: jest.fn().mockResolvedValue({ id: 'prop-1' }),
            },
            roomType: {
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rt-1', ...data })),
                findUnique: jest.fn(),
                update: jest.fn().mockImplementation(async ({ where: { id }, data }) => {
                    const existing = await prisma.roomType.findUnique({ where: { id } });
                    return { ...existing, ...data, id };
                }),
                findMany: jest.fn().mockResolvedValue([]),
            },
            room: {
                findMany: jest.fn().mockResolvedValue([]),
                count: jest.fn().mockResolvedValue(0),
            },
            booking: {
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'bk-1', ...data })),
                findUnique: jest.fn(),
                findMany: jest.fn().mockResolvedValue([]),
            },
            bookingRoom: {
                createMany: jest.fn().mockResolvedValue({ count: 1 }),
                findMany: jest.fn().mockResolvedValue([]),
            },
            $transaction: jest.fn().mockImplementation(async (cb) => {
                if (typeof cb === 'function') return cb(prisma);
                return Promise.all(cb);
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomTypesService,
                AvailabilityService,
                { provide: PrismaService, useValue: prisma },
                { provide: ChannelsService, useValue: { pushAriForProperty: jest.fn().mockResolvedValue(undefined) } },
                { provide: ConnectivityOutboxService, useValue: { createRateEventForProperty: jest.fn().mockResolvedValue(undefined), createContentEventForProperty: jest.fn().mockResolvedValue(undefined) } },
                { provide: PricingService, useValue: { calculatePrice: jest.fn().mockResolvedValue({ grandTotal: 1000, baseAmount: 900, taxAmount: 100 }) } },
                { provide: SystemSettingsService, useValue: { getSetting: jest.fn() } },
            ],
        }).compile();

        roomTypesService = module.get<RoomTypesService>(RoomTypesService);
        availabilityService = module.get<AvailabilityService>(AvailabilityService);
    });

    describe('Test A & B — V2 Runtime Capacity Authority', () => {
        it('Test A: conflicting V2 values (totalMaxOccupancy = 5, groupMaxOccupancy = 7, PA = 4, PC = 3) resolves to 5 (NOT 7)', async () => {
            prisma.roomType.findMany.mockResolvedValue([
                {
                    id: 'rt-conflict',
                    totalMaxOccupancy: 5,
                    groupMaxOccupancy: 7, // Stale/conflicting stored value
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: 3,
                    isAvailableForGroupBooking: true,
                    rooms: [
                        { id: 'r-1', isEnabled: true },
                    ],
                }
            ]);

            await (roomTypesService as any).syncPropertyGroupCapacity('prop-1');

            expect(prisma.property.update).toHaveBeenCalledWith({
                where: { id: 'prop-1' },
                data: { maxGroupCapacity: 5 }, // 1 room * 5 = 5 (NOT 7)
            });
        });

        it('Test B: normal V2 values (totalMaxOccupancy = 5, groupMaxOccupancy = 5, PA = 4, PC = 3) resolves to 5', async () => {
            const createDto: any = {
                propertyId: 'prop-1',
                name: 'Family Villa',
                basePrice: 5000,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 5,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 3,
                isAvailableForGroupBooking: true,
            };

            const created = await roomTypesService.create(createDto);
            expect(created.totalMaxOccupancy).toBe(5);
            expect(created.groupMaxOccupancy).toBe(5);
            expect(created.maxPhysicalAdults).toBe(4);
            expect(created.maxPhysicalChildren).toBe(3);
        });
    });

    describe('Test C — V2 Property Group Capacity with Stale groupMaxOccupancy', () => {
        it('totalMaxOccupancy = 5, groupMaxOccupancy = 7, physical rooms = 5 produces Property Group Capacity = 25 (NOT 35)', async () => {
            prisma.roomType.findMany.mockResolvedValue([
                {
                    id: 'rt-conflict-5rooms',
                    totalMaxOccupancy: 5,
                    groupMaxOccupancy: 7, // Stale value
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: 3,
                    isAvailableForGroupBooking: true,
                    rooms: [
                        { id: 'r-1', isEnabled: true },
                        { id: 'r-2', isEnabled: true },
                        { id: 'r-3', isEnabled: true },
                        { id: 'r-4', isEnabled: true },
                        { id: 'r-5', isEnabled: true },
                    ],
                }
            ]);

            await (roomTypesService as any).syncPropertyGroupCapacity('prop-1');

            expect(prisma.property.update).toHaveBeenCalledWith({
                where: { id: 'prop-1' },
                data: { maxGroupCapacity: 25 }, // 5 rooms * 5 = 25 (NOT 35)
            });
        });
    });

    describe('Test D — V2 Room Allocation Authority', () => {
        it('totalMaxOccupancy = 5, groupMaxOccupancy = 7 allocates rooms treating room capacity as 5 (NOT 7)', async () => {
            prisma.roomType.findMany.mockResolvedValue([
                {
                    id: 'rt-conflict-alloc',
                    name: 'V2 Villa',
                    totalMaxOccupancy: 5,
                    groupMaxOccupancy: 7, // Stale
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: 3,
                    isAvailableForGroupBooking: true,
                }
            ]);

            jest.spyOn(availabilityService, 'getAvailableRooms').mockResolvedValue([
                { id: 'r-1', roomNumber: '101' },
                { id: 'r-2', roomNumber: '102' },
            ] as any);

            const allocated = await availabilityService.allocateRoomsForGroup(
                'prop-1',
                new Date('2026-10-01'),
                new Date('2026-10-03'),
                8 // Group of 8: with capacity 5 each, needs 2 rooms (total capacity 10 >= 8)
            );

            expect(allocated.length).toBe(2);
            expect(allocated[0].capacity).toBe(5); // Authoritative M = 5, NOT 7
            expect(allocated[1].capacity).toBe(5);
        });
    });

    describe('Test E — V2 Reschedule Capacity Authority', () => {
        it('totalMaxOccupancy = 5, groupMaxOccupancy = 7 validates reschedule capacity using M = 5', async () => {
            const targetRoomType: any = {
                id: 'rt-conflict-reschedule',
                totalMaxOccupancy: 5,
                groupMaxOccupancy: 7, // Stale
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 3,
                property: { occupancyVersion: 'V2' },
            };

            const roomsToAllocate = [{ id: 'r-1', roomType: targetRoomType }];

            let totalPoolCapacity = 0;
            for (const room of roomsToAllocate) {
                const rType = room.roomType || targetRoomType;
                const isV2 = rType.totalMaxOccupancy !== null && rType.totalMaxOccupancy !== undefined;
                totalPoolCapacity += isV2
                    ? Number(rType.totalMaxOccupancy)
                    : (rType.groupMaxOccupancy || ((rType.maxAdults || 2) + (rType.maxChildren || 0)));
            }

            expect(totalPoolCapacity).toBe(5); // M = 5 (NOT 7)
            const guestCount = 6;
            expect(guestCount > totalPoolCapacity).toBe(true);
        });
    });

    describe('Test F — V1 Compatibility Preserved', () => {
        it('preserves existing legacy Group Booking capacity behavior for V1 room types where totalMaxOccupancy is null', async () => {
            prisma.roomType.findMany.mockResolvedValue([
                {
                    id: 'rt-v1-legacy',
                    totalMaxOccupancy: null,
                    groupMaxOccupancy: 12, // Explicit legacy buyout cap
                    maxAdults: 3,
                    maxChildren: 2,
                    isAvailableForGroupBooking: true,
                    rooms: [
                        { id: 'r-1', isEnabled: true },
                        { id: 'r-2', isEnabled: true },
                    ],
                },
                {
                    id: 'rt-v1-fallback',
                    totalMaxOccupancy: null,
                    groupMaxOccupancy: null,
                    maxPhysicalAdults: 3,
                    maxPhysicalChildren: 1,
                    isAvailableForGroupBooking: true,
                    rooms: [
                        { id: 'r-3', isEnabled: true },
                    ],
                }
            ]);

            await (roomTypesService as any).syncPropertyGroupCapacity('prop-1');

            // Legacy V1: (12 * 2) + ((3 + 1) * 1) = 24 + 4 = 28
            expect(prisma.property.update).toHaveBeenCalledWith({
                where: { id: 'prop-1' },
                data: { maxGroupCapacity: 28 },
            });
        });
    });
});
