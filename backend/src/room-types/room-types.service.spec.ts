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
                    groupMaxOccupancy: 5, // Canonical V2: groupMaxOccupancy = totalMaxOccupancy (5), NEVER PA + PC (7)
                }),
            });
        });

        it('7: sets canonical groupMaxOccupancy to totalMaxOccupancy on V2 create', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Presidential Villa',
                description: 'Villa with private pool',
                basePrice: 20000,
                totalBaseOccupancy: 4,
                totalMaxOccupancy: 6,
                maxPhysicalAdults: 6,
                maxPhysicalChildren: 2,
                isPubliclyVisible: true,
                images: ['img1.jpg'],
                amenities: ['Pool'],
            };

            await service.create(dto);

            expect(prisma.roomType.create).toHaveBeenCalledWith({
                data: expect.objectContaining({
                    groupMaxOccupancy: 6, // Canonical V2: groupMaxOccupancy = totalMaxOccupancy
                }),
            });
        });
    });

    describe('Update RoomType Mapping', () => {
        it('8 & 12: sets groupMaxOccupancy to totalMaxOccupancy on V2 update', async () => {
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
            };

            await service.update('rt-legacy', updateDto);

            expect(prisma.roomType.update).toHaveBeenCalledWith({
                where: { id: 'rt-legacy' },
                data: expect.objectContaining({
                    groupMaxOccupancy: 5, // Canonical V2: groupMaxOccupancy updated to totalMaxOccupancy (5)
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

    describe('previewOccupancy & enrichRoomTypeWithOccupancy', () => {
        it('previewOccupancy strictly respects Total Max Occupancy (PA=5, PC=4, M=3)', () => {
            const preview = service.previewOccupancy({
                baseAdults: 2,
                baseChildren: 1,
                totalBaseOccupancy: 3,
                maxPhysicalAdults: 5,
                maxPhysicalChildren: 4,
                totalMaxOccupancy: 3,
                maxPhysicalInfants: 1,
            });

            expect(preview.maxPhysicalCompositions.length).toBe(6);
            expect(preview.maxPhysicalCompositions.map(c => c.label)).toEqual([
                '1A',
                '1A + 1C',
                '1A + 2C',
                '2A',
                '2A + 1C',
                '3A',
            ]);

            for (const comp of preview.maxPhysicalCompositions) {
                expect(comp.adults + comp.children).toBeLessThanOrEqual(3);
                expect(comp.adults).toBeLessThanOrEqual(3);
            }
        });

        it('Part B: Physical preview for PA=4, PC=2, M=5 contains exactly 11 combinations, including 3A+2C', () => {
            const preview = service.previewOccupancy({
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                totalMaxOccupancy: 5,
                totalBaseOccupancy: 4,
            });

            expect(preview.maxPhysicalCompositions.length).toBe(11);
            expect(preview.maxPhysicalCompositions.map(c => c.label)).toEqual([
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
            ]);
            expect(preview.maxPhysicalCompositions.some(c => c.label === '3A + 2C')).toBe(true);
            // No combination exceeds M=5
            for (const c of preview.maxPhysicalCompositions) {
                expect(c.adults + c.children).toBeLessThanOrEqual(5);
            }
        });

        it('Part C & D: Base preview for PA=4, PC=2, M=5, B=4, BMA=null, BMC=null contains exactly 9 combinations without legacy leakage', () => {
            const preview = service.previewOccupancy({
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                totalMaxOccupancy: 5,
                totalBaseOccupancy: 4,
                baseMaxAdults: null,
                baseMaxChildren: null,
                // Legacy fields present in DTO but must NOT restrict V2 base compositions
                baseAdults: 2,
                baseChildren: 0,
            });

            expect(preview.baseCompositions.length).toBe(9);
            expect(preview.baseCompositions.map(c => c.label)).toEqual([
                '1A',
                '1A + 1C',
                '1A + 2C',
                '2A',
                '2A + 1C',
                '2A + 2C',
                '3A',
                '3A + 1C',
                '4A',
            ]);
            // 3A + 2C (total 5 > 4) and 4A + 1C (total 5 > 4) must NOT appear
            expect(preview.baseCompositions.some(c => c.label === '3A + 2C')).toBe(false);
            expect(preview.baseCompositions.some(c => c.label === '4A + 1C')).toBe(false);
        });

        it('Part E: Base preview with demographic restrictions (PA=4, PC=2, M=5, B=4, BMA=2, BMC=1) has exactly 4 combinations', () => {
            const preview = service.previewOccupancy({
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                totalMaxOccupancy: 5,
                totalBaseOccupancy: 4,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
            });

            expect(preview.baseCompositions.length).toBe(4);
            expect(preview.baseCompositions.map(c => c.label)).toEqual([
                '1A',
                '1A + 1C',
                '2A',
                '2A + 1C',
            ]);
            // Excludes combinations exceeding BMA=2 or BMC=1
            expect(preview.baseCompositions.some(c => c.label === '3A')).toBe(false);
            expect(preview.baseCompositions.some(c => c.label === '1A + 2C')).toBe(false);
        });
    });

    describe('Migration Safety & Null V2 Invariants', () => {
        it('1 & 2 & 5: reading or enriching a RoomType with NULL V2 fields leaves them null and does not mutate DB', async () => {
            const rawV1RoomType = {
                id: 'rt-legacy-1',
                propertyId: 'prop-1',
                name: 'Lake View Haven',
                basePrice: 3000,
                // V2 fields are unconfigured / null in DB
                totalMaxOccupancy: null,
                totalBaseOccupancy: null,
                baseMaxAdults: null,
                baseMaxChildren: null,
                // Legacy fields
                maxAdults: 2,
                maxChildren: 1,
                baseAdults: 2,
                baseChildren: 1,
                groupMaxOccupancy: 0,
                freeChildrenCount: 1,
                // Physical fields
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 1,
                maxPhysicalInfants: 1,
                property: { id: 'prop-1', name: 'Alpha Resort', ownerId: 'user-1', staff: [] },
            };

            prisma.roomType.findUnique.mockResolvedValue(rawV1RoomType);

            // Read room type
            const result = await service.findOne('rt-legacy-1');

            // DB was NOT updated simply because room type was fetched/viewed
            expect(prisma.roomType.update).not.toHaveBeenCalled();

            // V2 fields returned from DB remain null, NOT silently overwritten
            expect(result.totalMaxOccupancy).toBeNull();
            expect(result.totalBaseOccupancy).toBeNull();
            expect(result.baseMaxAdults).toBeNull();
            expect(result.baseMaxChildren).toBeNull();

            // Legacy fields remain exactly as stored
            expect(result.maxAdults).toBe(2);
            expect(result.maxChildren).toBe(1);
            expect(result.baseAdults).toBe(2);
            expect(result.baseChildren).toBe(1);
        });

        it('4: explicit operator entry/update establishes canonical V2 values', async () => {
            prisma.roomType.findUnique.mockResolvedValue({
                id: 'rt-legacy-1',
                propertyId: 'prop-1',
                totalMaxOccupancy: null,
                totalBaseOccupancy: null,
                property: { id: 'prop-1', name: 'Alpha Resort', ownerId: 'user-1', staff: [] },
            });

            // Operator explicitly submits V2 values
            const updateDto: any = {
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 3,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 1,
                maxPhysicalInfants: 1,
                baseMaxAdults: 2,
                baseMaxChildren: 1,
                freeChildrenCount: 1,
                maxAdults: 2,
                maxChildren: 1,
            };

            await service.update('rt-legacy-1', updateDto);

            expect(prisma.roomType.update).toHaveBeenCalledWith({
                where: { id: 'rt-legacy-1' },
                data: expect.objectContaining({
                    totalBaseOccupancy: 3,
                    totalMaxOccupancy: 3,
                    maxPhysicalAdults: 2,
                    maxPhysicalChildren: 1,
                }),
            });
        });
    });

    describe('Occupancy Hierarchy & Dependency Validations', () => {
        it('CREATE: allows new RoomType when Max Physical Adults (PA) is unconfigured (optional)', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Suite Without PA',
                description: 'Description',
                basePrice: 5000,
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 4,
                maxPhysicalChildren: 2,
                images: ['img.jpg'],
            };

            const res = await service.create(dto);
            expect(res).toBeDefined();
            expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    maxPhysicalAdults: null,
                }),
            }));
        });

        it('CREATE: allows new RoomType when Max Physical Children (PC) is unconfigured (optional)', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Suite Without PC',
                description: 'Description',
                basePrice: 5000,
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 2,
                images: ['img.jpg'],
            };

            const res = await service.create(dto);
            expect(res).toBeDefined();
            expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    maxPhysicalChildren: null,
                }),
            }));
        });

        it('CREATE: rejects new RoomType when Total Max Occupancy (M) is unconfigured', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Suite Without M',
                description: 'Description',
                basePrice: 5000,
                totalBaseOccupancy: 2,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                // totalMaxOccupancy is omitted
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Total Max Occupancy is required.');
        });

        it('CREATE: rejects new RoomType when Total Base Occupancy (B) is unconfigured', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Suite Without B',
                description: 'Description',
                basePrice: 5000,
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                // totalBaseOccupancy is omitted
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Total Base Occupancy is required.');
        });

        it('CREATE: intentionally defaults Max Infants to 0 when omitted', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Zero Infant Suite',
                description: 'Description',
                basePrice: 5000,
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 4,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                // maxPhysicalInfants omitted
                images: ['img.jpg'],
            };

            await service.create(dto);
            expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    maxPhysicalInfants: 0,
                }),
            }));
        });

        it('1: rejects BMA when Total Base Occupancy (B) is unconfigured on create', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Suite Without B',
                description: 'Description',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                // totalBaseOccupancy is omitted / undefined
                baseMaxAdults: 2,
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Total Base Occupancy is required.');
        });

        it('2: rejects BMC when Total Base Occupancy (B) is unconfigured on create', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Suite Without B',
                description: 'Description',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                // totalBaseOccupancy is omitted / undefined
                baseMaxChildren: 1,
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Total Base Occupancy is required.');
        });

        it('3: rejects BMA > B with specific error message', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Invalid BMA Suite',
                description: 'Description',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                baseMaxAdults: 4, // 4 > 3
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Base Max Adults cannot exceed Total Base Occupancy (3).');
        });

        it('4: rejects BMC > B with specific error message', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Invalid BMC Suite',
                description: 'Description',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                baseMaxChildren: 4, // 4 > 3
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Base Max Children cannot exceed Total Base Occupancy (3).');
        });

        it('5: rejects Total Max Occupancy (M) < Total Base Occupancy (B)', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Invalid M < B Suite',
                description: 'Description',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 2, // 2 < 3
                images: ['img.jpg'],
            };

            await expect(service.create(dto)).rejects.toThrow('Total Max Occupancy cannot be less than Total Base Occupancy (3).');
        });

        it('6: allows BMA + BMC > B as valid demographic restrictions (B=3, BMA=2, BMC=2)', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Valid Suite',
                description: 'Description',
                basePrice: 5000,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 4,
                baseMaxAdults: 2,
                baseMaxChildren: 2, // 2 + 2 = 4 > 3, but BMA <= 3 and BMC <= 3
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                isPubliclyVisible: true,
                images: ['img.jpg'],
                amenities: [],
            };

            const result = await service.create(dto);
            expect(result).toBeDefined();
            expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    totalBaseOccupancy: 3,
                    baseMaxAdults: 2,
                    baseMaxChildren: 2,
                }),
            }));
        });

        it('7: allows B > PA as valid canonical configuration (e.g. B=3, PA=2) without clamping', async () => {
            const dto: any = {
                propertyId: 'prop-1',
                name: 'Channex Discrepancy Suite',
                description: 'Description',
                basePrice: 5000,
                totalBaseOccupancy: 3,
                totalMaxOccupancy: 3,
                maxPhysicalAdults: 2, // B (3) > PA (2)
                maxPhysicalChildren: 1,
                isPubliclyVisible: true,
                images: ['img.jpg'],
                amenities: [],
            };

            const result = await service.create(dto);
            expect(result).toBeDefined();
            expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    totalBaseOccupancy: 3,
                    maxPhysicalAdults: 2,
                }),
            }));
        });

        it('8: Preview does not generate combinations when unconfigured', () => {
            const unconfiguredPreview = service.previewOccupancy({
                maxPhysicalAdults: undefined,
                maxPhysicalChildren: undefined,
                totalMaxOccupancy: undefined,
                totalBaseOccupancy: undefined,
            });

            expect(unconfiguredPreview.maxPhysicalCompositions).toEqual([]);
            expect(unconfiguredPreview.baseCompositions).toEqual([]);
            expect(unconfiguredPreview.maxPhysicalInfants).toBe(0);
        });

        describe('Exhaustive Validation Audit Test Matrix', () => {
            const baseValidDto = {
                propertyId: 'prop-1',
                name: 'Audit Suite',
                basePrice: 5000,
                maxPhysicalAdults: 4,
                maxPhysicalChildren: 2,
                maxPhysicalInfants: 0,
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 4,
                images: ['img.jpg'],
            };

            // CASE P1: PA = undefined on create (VALID - PA is optional)
            it('Case P1: allows PA = undefined on create', async () => {
                const dto = { ...baseValidDto, maxPhysicalAdults: undefined };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
                expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({
                        maxPhysicalAdults: null,
                    }),
                }));
            });

            // CASE P2: PA = 0
            it('Case P2: rejects PA = 0', async () => {
                const dto = { ...baseValidDto, maxPhysicalAdults: 0 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Adults must be at least 1.');
            });

            // CASE P3: PA = 1 (valid)
            it('Case P3: allows PA = 1', async () => {
                const dto = { ...baseValidDto, maxPhysicalAdults: 1, maxPhysicalChildren: 0, totalBaseOccupancy: 1, totalMaxOccupancy: 1 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE P4: PC = undefined on create (VALID - PC is optional)
            it('Case P4: allows PC = undefined on create', async () => {
                const dto = { ...baseValidDto, maxPhysicalChildren: undefined };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
                expect(prisma.roomType.create).toHaveBeenCalledWith(expect.objectContaining({
                    data: expect.objectContaining({
                        maxPhysicalChildren: null,
                    }),
                }));
            });

            // CASE P5: PC = -1
            it('Case P5: rejects PC = -1', async () => {
                const dto = { ...baseValidDto, maxPhysicalChildren: -1 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Children cannot be negative.');
            });

            // CASE P6: M = undefined on create
            it('Case P6: rejects M = undefined on create', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: undefined };
                await expect(service.create(dto as any)).rejects.toThrow('Total Max Occupancy is required.');
            });

            // CASE P7: M = 0
            it('Case P7: rejects M = 0', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 0 };
                await expect(service.create(dto as any)).rejects.toThrow('Total Max Occupancy must be at least 1.');
            });

            // CASE P8: M < B
            it('Case P8: rejects M < B', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 4, totalMaxOccupancy: 3 };
                await expect(service.create(dto as any)).rejects.toThrow('Total Max Occupancy cannot be less than Total Base Occupancy (4).');
            });

            // SECTION 23 SPECIFIED PHYSICAL VALIDATION TEST MATRIX:
            it('Section 23: M=5, PA=null -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: null, maxPhysicalChildren: 2, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PA=1 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 1, maxPhysicalChildren: 2, totalBaseOccupancy: 1 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PA=4 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 2, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PA=5 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 5, maxPhysicalChildren: 2, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PA=0 -> INVALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 0, totalBaseOccupancy: 2 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Adults must be at least 1.');
            });

            it('Section 23: M=5, PA=6 -> INVALID (PA > M)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 6, totalBaseOccupancy: 2 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Adults cannot exceed Total Max Occupancy (5).');
            });

            it('Section 23: M=5, PC=null -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: null, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PC=0 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 0, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PC=3 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 3, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PC=4 -> VALID (PC <= M-1)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 4, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=5, PC=5 -> INVALID (PC > M-1)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 5, totalBaseOccupancy: 2 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Children cannot exceed Total Max Occupancy minus 1 (4), because at least one adult is required.');
            });

            it('Section 23: M=5, PC=6 -> INVALID (PC > M-1)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 6, totalBaseOccupancy: 2 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Children cannot exceed Total Max Occupancy minus 1 (4), because at least one adult is required.');
            });

            it('Section 23: M=1, PC=0 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 1, maxPhysicalAdults: 1, maxPhysicalChildren: 0, totalBaseOccupancy: 1 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=1, PC=1 -> INVALID (PC > M-1=0)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 1, maxPhysicalAdults: 1, maxPhysicalChildren: 1, totalBaseOccupancy: 1 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Physical Children cannot exceed Total Max Occupancy minus 1 (0), because at least one adult is required.');
            });

            it('Section 23: M=5, PA=4, PC=3 -> VALID (PA+PC=7 is not restricted)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 5, maxPhysicalAdults: 4, maxPhysicalChildren: 3, totalBaseOccupancy: 2 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=2, PI=0 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 2, maxPhysicalAdults: 2, maxPhysicalChildren: 0, totalBaseOccupancy: 1, maxPhysicalInfants: 0 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=2, PI=1 -> VALID', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 2, maxPhysicalAdults: 2, maxPhysicalChildren: 0, totalBaseOccupancy: 1, maxPhysicalInfants: 1 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            it('Section 23: M=2, PI=5 -> VALID (PI > M is allowed as infants do not consume A+C capacity)', async () => {
                const dto = { ...baseValidDto, totalMaxOccupancy: 2, maxPhysicalAdults: 2, maxPhysicalChildren: 0, totalBaseOccupancy: 1, maxPhysicalInfants: 5 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE P11: PI = -1
            it('Case P11: rejects PI = -1', async () => {
                const dto = { ...baseValidDto, maxPhysicalInfants: -1 };
                await expect(service.create(dto as any)).rejects.toThrow('Max Infants cannot be negative.');
            });

            // CASE B1: B = undefined on create
            it('Case B1: rejects B = undefined on create', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: undefined };
                await expect(service.create(dto as any)).rejects.toThrow('Total Base Occupancy is required.');
            });

            // CASE B2: B = 0
            it('Case B2: rejects B = 0', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 0 };
                await expect(service.create(dto as any)).rejects.toThrow('Total Base Occupancy must be at least 1.');
            });

            // CASE B3: B = 1 (valid)
            it('Case B3: allows B = 1', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 1, totalMaxOccupancy: 2, maxPhysicalAdults: 1, maxPhysicalChildren: 0 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE B4: B = 5, BMA = 6
            it('Case B4: rejects B = 5, BMA = 6', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxAdults: 6 };
                await expect(service.create(dto as any)).rejects.toThrow('Base Max Adults cannot exceed Total Base Occupancy (5).');
            });

            // CASE B5: B = 5, BMC = 6
            it('Case B5: rejects B = 5, BMC = 6', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxChildren: 6 };
                await expect(service.create(dto as any)).rejects.toThrow('Base Max Children cannot exceed Total Base Occupancy (5).');
            });

            // CASE B6: B = 5, BMA = 5, BMC = 5 (valid)
            it('Case B6: allows B = 5, BMA = 5, BMC = 5', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxAdults: 5, baseMaxChildren: 5, maxPhysicalAdults: 5, maxPhysicalChildren: 4 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE B7: B = 5, BMA = 4, BMC = 5 (valid)
            it('Case B7: allows B = 5, BMA = 4, BMC = 5', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxAdults: 4, baseMaxChildren: 5, maxPhysicalAdults: 5, maxPhysicalChildren: 4 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE B8: B = 5, BMA = 2, BMC = 2 (valid)
            it('Case B8: allows B = 5, BMA = 2, BMC = 2', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxAdults: 2, baseMaxChildren: 2, maxPhysicalAdults: 5, maxPhysicalChildren: 4 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE B9: B = 5, BMA = 0 (error)
            it('Case B9: rejects B = 5, BMA = 0', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxAdults: 0 };
                await expect(service.create(dto as any)).rejects.toThrow('Base Max Adults must be at least 1.');
            });

            // CASE B10: B = 5, BMC = 0 (valid)
            it('Case B10: allows B = 5, BMC = 0 (0 children included in base rate)', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 5, baseMaxChildren: 0, maxPhysicalAdults: 5, maxPhysicalChildren: 4 };
                const res = await service.create(dto as any);
                expect(res).toBeDefined();
            });

            // CASE B11: B = 5, M = 4 (error)
            it('Case B11: rejects B = 5, M = 4', async () => {
                const dto = { ...baseValidDto, totalBaseOccupancy: 5, totalMaxOccupancy: 4 };
                await expect(service.create(dto as any)).rejects.toThrow('Total Max Occupancy cannot be less than Total Base Occupancy (5).');
            });

            // SECTION 24 REGRESSION: M = 5, PA = 4, PC = 3 -> exactly 13 valid physical compositions
            it('Section 24: M = 5, PA = 4, PC = 3 generates exactly 13 valid physical compositions', () => {
                const preview = service.previewOccupancy({
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: 3,
                    totalMaxOccupancy: 5,
                });
                const labels = preview.maxPhysicalCompositions.map(c => c.label);
                expect(labels).toHaveLength(13);
                expect(labels).toEqual([
                    '1A',
                    '1A + 1C',
                    '1A + 2C',
                    '1A + 3C',
                    '2A',
                    '2A + 1C',
                    '2A + 2C',
                    '2A + 3C',
                    '3A',
                    '3A + 1C',
                    '3A + 2C',
                    '4A',
                    '4A + 1C',
                ]);
                expect(labels).toContain('4A + 1C'); // VALID
                expect(labels).not.toContain('1A + 4C'); // INVALID because C > PC
                expect(labels).toContain('1A + 3C'); // VALID
                expect(labels).toContain('2A + 3C'); // VALID
                expect(labels).not.toContain('5A');      // INVALID because A > PA
                expect(labels).not.toContain('6A');      // INVALID because A > PA and A+C > M
                expect(labels).not.toContain('3A + 3C'); // INVALID because A+C > M
                expect(labels).not.toContain('4A + 2C'); // INVALID because A+C > M
            });

            // SECTION 25 REGRESSION: Solver Null-Restriction Regressions
            it('Section 25: M = 5, PA = null, PC = null generates exactly 15 compositions', () => {
                const preview = service.previewOccupancy({
                    maxPhysicalAdults: undefined,
                    maxPhysicalChildren: undefined,
                    totalMaxOccupancy: 5,
                });
                const labels = preview.maxPhysicalCompositions.map(c => c.label);
                expect(labels).toHaveLength(15);
                expect(labels).toEqual([
                    '1A', '1A + 1C', '1A + 2C', '1A + 3C', '1A + 4C',
                    '2A', '2A + 1C', '2A + 2C', '2A + 3C',
                    '3A', '3A + 1C', '3A + 2C',
                    '4A', '4A + 1C',
                    '5A',
                ]);
                expect(labels).toContain('1A + 4C'); // VALID
                expect(labels).toContain('5A');      // VALID
                expect(labels).not.toContain('0A + 5C'); // ALWAYS INVALID (A >= 1)
            });

            it('Section 25: M = 5, PA = 4, PC = null generates 14 compositions', () => {
                const preview = service.previewOccupancy({
                    maxPhysicalAdults: 4,
                    maxPhysicalChildren: undefined,
                    totalMaxOccupancy: 5,
                });
                const labels = preview.maxPhysicalCompositions.map(c => c.label);
                expect(labels).toHaveLength(14);
                expect(labels).toContain('4A + 1C'); // VALID
                expect(labels).not.toContain('5A');      // INVALID because A > PA
            });

            it('Section 25: M = 5, PA = null, PC = 4 generates 15 compositions', () => {
                const preview = service.previewOccupancy({
                    maxPhysicalAdults: undefined,
                    maxPhysicalChildren: 4,
                    totalMaxOccupancy: 5,
                });
                const labels = preview.maxPhysicalCompositions.map(c => c.label);
                expect(labels).toHaveLength(15);
                expect(labels).toContain('1A + 4C'); // VALID
                expect(labels).not.toContain('0A + 5C'); // INVALID
            });
        });
    });
});
