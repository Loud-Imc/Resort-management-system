import { Test, TestingModule } from '@nestjs/testing';
import { RoomTypesService } from './room-types.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChannelsService } from '../channels/channels.service';
import { ConnectivityOutboxService } from '../connectivity/services/connectivity-outbox.service';

describe('RoomTypesService — Legacy Compatibility & Canonical V2 Mapping', () => {
    let service: RoomTypesService;
    let prisma: any;
    let channelsService: any;
    let outboxService: any;

    beforeEach(async () => {
        prisma = {
            property: {
                findUnique: jest.fn().mockResolvedValue({ id: 'prop-1', name: 'Alpha Resort', ownerId: 'user-1', staff: [] }),
                update: jest.fn().mockResolvedValue({ id: 'prop-1' }),
            },
            roomType: {
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rt-1', ...data })),
                findUnique: jest.fn(),
                update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'rt-1', ...data })),
                findMany: jest.fn().mockResolvedValue([]),
            },
        };

        channelsService = {
            pushAriForProperty: jest.fn().mockResolvedValue(undefined),
        };

        outboxService = {
            createRateEventForProperty: jest.fn().mockResolvedValue(undefined),
            createContentEventForProperty: jest.fn().mockResolvedValue(undefined),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RoomTypesService,
                { provide: PrismaService, useValue: prisma },
                { provide: ChannelsService, useValue: channelsService },
                { provide: ConnectivityOutboxService, useValue: outboxService },
            ],
        }).compile();

        service = module.get<RoomTypesService>(RoomTypesService);
    });

    describe('Create RoomType Mapping', () => {
        it('1 & 3 & 4: preserves canonical V2 fields and maps maxPhysicalAdults -> maxAdults, maxPhysicalChildren -> maxChildren', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Deluxe Suite',
                description: 'Spacious ocean suite',
                basePrice: 5000,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 5,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 3,
                maxPhysicalInfants: 1,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
                freeChildrenCount: 1,
                baseAdults: 2,
                baseChildren: 0,
                maxAdults: 4,
                maxChildren: 3,
                extraAdultPrice: 1000,
                extraChildPrice: 500,
                isPubliclyVisible: true,
                images: ['img1.jpg'],
                amenities: ['Wifi'],
                highlights: [],
                inclusions: [],
            };

            await service.create(dto);

            expect(prisma.roomType.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    totalBaseOccupancy: 3,
                    totalMaxOccupancy: 5,
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: 3,
                    maxPhysicalInfants: 1,
                    baseMaxAdults: 2,
                    baseMaxChildren: 1,
                    freeChildrenCount: 1,
                    maxAdults: 4,
                    maxChildren: 3,
                    baseAdults: 2,
                    baseChildren: 0,
                    groupMaxOccupancy: 7, // Fallback computed as 4 + 3 when groupMaxOccupancy is omitted
                }),
            });
        });

        it('7: preserves explicit groupMaxOccupancy on create', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Presidential Villa',
                description: 'Villa with private pool',
                basePrice: 20000,
                totalBaseOccupancy: 4,
                totalMaxOccupancy: 6,
                maxPhysicalAdults: 6,
                maxPhysicalChildren: 2,
                groupMaxOccupancy: 15, // Explicit villa group buyout cap
                isPubliclyVisible: true,
                images: ['img1.jpg'],
                amenities: ['Pool'],
            };

            await service.create(dto);

            expect(prisma.roomType.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    groupMaxOccupancy: 15, // Preserves explicit 15, does not overwrite with 8
                }),
            });
        });
    });

    describe('Update RoomType Mapping', () => {
        it('8 & 12: preserves existing groupMaxOccupancy and historical exception on update when omitted', async () => {
            // Existing legacy exceptional room type:
            prisma.roomType.findUnique.mockResolvedValue({
                id: 'rt-legacy',
                propertyId: 'prop-1',
                name: 'Heritage Villa',
                basePrice: 10000,
                maxAdults: 10,
                baseAdults: 2,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                groupMaxOccupancy: 10,
                property: { id: 'prop-1', name: 'Alpha Resort', ownerId: 'user-1', staff: [] },
            });

            const updateDto: any = {
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 5,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                maxAdults: 4,
                maxChildren: 2,
                // groupMaxOccupancy omitted
            };

            await service.update('rt-legacy', updateDto);

            expect(prisma.roomType.update).toHaveBeenCalledWith({
                where: { id: 'rt-legacy' },
                data: expect.objectContaining({
                    groupMaxOccupancy: 10, // Explicitly preserved existing 10, NOT overwritten with 6!
                    maxAdults: 4,
                    maxChildren: 2,
                    totalBaseOccupancy: 3,
                    totalMaxOccupancy: 5,
                }),
            });
        });

        it('9: allows administrator to explicitly update groupMaxOccupancy', async () => {
            prisma.roomType.findUnique.mockResolvedValue({
                id: 'rt-1',
                propertyId: 'prop-1',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                groupMaxOccupancy: 6,
                property: { id: 'prop-1', name: 'Alpha Resort', ownerId: 'user-1', staff: [] },
            });

            const updateDto: any = {
                groupMaxOccupancy: 12, // Explicit admin change
            };

            await service.update('rt-1', updateDto);

            expect(prisma.roomType.update).toHaveBeenCalledWith({
                where: { id: 'rt-1' },
                data: expect.objectContaining({
                    groupMaxOccupancy: 12,
                }),
            });
        });

        it('5 & 6: verifies baseMaxAdults / baseMaxChildren do NOT overwrite legacy maxAdults / maxChildren', async () => {
            prisma.roomType.findUnique.mockResolvedValue({
                id: 'rt-1',
                propertyId: 'prop-1',
                basePrice: 5000,
                property: { id: 'prop-1', name: 'Alpha Resort', ownerId: 'user-1', staff: [] },
            });

            const updateDto: any = {
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 5,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 3,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
                maxAdults: 4,
                maxChildren: 3,
            };

            await service.update('rt-1', updateDto);

            expect(prisma.roomType.update).toHaveBeenCalledWith({
                where: { id: 'rt-1' },
                data: expect.objectContaining({
                    maxAdults: 4, // Equals maxPhysicalAdults (4), NOT baseMaxAdults (2)
                    maxChildren: 3, // Equals maxPhysicalChildren (3), NOT baseMaxChildren (1)
                    baseMaxAdults: 2,
                    baseMaxChildren: 1,
                }),
            });
        });
    });

    describe('syncPropertyGroupCapacity', () => {
        it('11: respects explicit rt.groupMaxOccupancy in property maxGroupCapacity summation', async () => {
            prisma.roomType.findMany.mockResolvedValue([
                {
                    id: 'rt-1',
                    isAvailableForGroupBooking: true,
                    groupMaxOccupancy: 12, // Explicit buyout capacity
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: 2,
                    rooms: [{ isEnabled: true }, { isEnabled: true }], // 2 rooms * 12 = 24
                },
                {
                    id: 'rt-2',
                    isAvailableForGroupBooking: true,
                    groupMaxOccupancy: null, // Fallback to 3 + 1 = 4
                    maxPhysicalAdults: 3,
                    maxPhysicalChildren: 1,
                    rooms: [{ isEnabled: true }], // 1 room * 4 = 4
                },
            ]);

            await service.syncPropertyGroupCapacity('prop-1');

            expect(prisma.property.update).toHaveBeenCalledWith({
                where: { id: 'prop-1' },
                data: { maxGroupCapacity: 28 }, // 24 + 4 = 28
            });
        });
    });
});
