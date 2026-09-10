import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { AuditService } from '../audit/audit.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { BadRequestException } from '@nestjs/common';

describe('BookingsService - Phase 5 Canonical Occupancy & Booking Integration', () => {
    let service: BookingsService;
    let prismaMock: any;
    let availabilityServiceMock: any;
    let pricingServiceMock: any;
    let systemSettingsMock: any;

    const baseDto = {
        roomTypeId: 'rt-v2-1',
        checkInDate: '2026-10-01',
        checkOutDate: '2026-10-02',
        adultsCount: 2,
        childrenCount: 1,
        infantsCount: 0,
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '+919876543210',
    };

    const v2RoomType = {
        id: 'rt-v2-1',
        name: 'Deluxe Suite',
        propertyId: 'prop-v2',
        occupancyVersion: 'V2',
        totalBaseOccupancy: 3,
        totalMaxOccupancy: 4,
        baseMaxAdults: 2,
        baseMaxChildren: 1,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
        maxPhysicalInfants: 1,
        freeChildrenCount: 1,
        basePrice: 5000,
        extraAdultPrice: 1000,
        extraChildPrice: 500,
        property: {
            id: 'prop-v2',
            name: 'V2 Luxury Resort',
            occupancyVersion: 'V2',
            baseCurrency: 'INR',
        },
    };

    const v1RoomType = {
        id: 'rt-v1-1',
        name: 'Standard Room',
        propertyId: 'prop-v1',
        occupancyVersion: 'V1',
        baseAdults: 2,
        maxAdults: 3,
        baseChildren: 0,
        maxChildren: 1,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 1,
        basePrice: 3000,
        extraAdultPrice: 800,
        extraChildPrice: 400,
        property: {
            id: 'prop-v1',
            name: 'V1 Classic Resort',
            occupancyVersion: 'V1',
            baseCurrency: 'INR',
        },
    };

    beforeEach(async () => {
        prismaMock = {
            roomType: {
                findUnique: jest.fn().mockImplementation(({ where: { id } }) => {
                    if (id === 'rt-v2-1') return Promise.resolve(v2RoomType);
                    if (id === 'rt-v1-1') return Promise.resolve(v1RoomType);
                    if (id === 'rt-unready') return Promise.resolve({
                        id: 'rt-unready',
                        name: 'Unready Villa',
                        propertyId: 'prop-v2',
                        occupancyVersion: 'V1',
                        property: {
                            id: 'prop-v2',
                            occupancyVersion: 'V2',
                        },
                    });
                    if (id === 'rt-ready-in-v1-prop') return Promise.resolve({
                        id: 'rt-ready-in-v1-prop',
                        name: 'Ready Room in V1 Prop',
                        propertyId: 'prop-v1',
                        occupancyVersion: 'V2',
                        totalBaseOccupancy: 3,
                        totalMaxOccupancy: 4,
                        baseAdults: 2,
                        maxAdults: 2,
                        property: {
                            id: 'prop-v1',
                            occupancyVersion: 'V1',
                        },
                    });
                    return Promise.resolve(null);
                }),
                findFirst: jest.fn().mockResolvedValue(null),
            },
            room: {
                findUnique: jest.fn().mockResolvedValue({ id: 'room-1', roomNumber: '101', roomTypeId: 'rt-v2-1', propertyId: 'prop-v2' }),
                findMany: jest.fn().mockResolvedValue([{ id: 'room-1', roomNumber: '101', roomTypeId: 'rt-v2-1', propertyId: 'prop-v2' }]),
                updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            },
            property: {
                findUnique: jest.fn().mockResolvedValue({ id: 'prop-v2', allowsGroupBooking: false }),
            },
            user: {
                findFirst: jest.fn().mockResolvedValue(null),
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue({ id: 'user-guest-1' }),
            },
            role: {
                findFirst: jest.fn().mockResolvedValue({ id: 'role-customer' }),
            },
            coupon: {
                findUnique: jest.fn().mockResolvedValue(null),
            },
            booking: {
                count: jest.fn().mockResolvedValue(1),
                findUnique: jest.fn(),
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({
                    id: 'booking-new-1',
                    bookingNumber: 'BK-1001',
                    ...data,
                })),
                update: jest.fn().mockImplementation(({ where: { id }, data }) => Promise.resolve({
                    id,
                    ...data,
                })),
            },
            bookingGuest: {
                update: jest.fn().mockResolvedValue({}),
            },
            roomBlock: {
                deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
            $queryRaw: jest.fn().mockResolvedValue([]),
            $executeRawUnsafe: jest.fn().mockResolvedValue(1),
            $transaction: jest.fn().mockImplementation(async (cb) => cb(prismaMock)),
        };

        availabilityServiceMock = {
            getAvailableRoomCount: jest.fn().mockResolvedValue(5),
            getAvailableRooms: jest.fn().mockResolvedValue([{ id: 'room-1', roomNumber: '101', roomTypeId: 'rt-v2-1', propertyId: 'prop-v2' }]),
            isRoomAvailable: jest.fn().mockResolvedValue(true),
            validateBookingRestrictions: jest.fn().mockResolvedValue(true),
        };

        pricingServiceMock = {
            calculatePrice: jest.fn().mockImplementation((roomTypeId, checkIn, checkOut, adults, children, _c, _r, _curr, _isG, _gSize, _rCount, _gCode, overrideTotal, _incl, _eA, _eC, infants = 0) => {
                const total = overrideTotal !== undefined ? overrideTotal : 5000;
                return Promise.resolve({
                    baseAmount: 5000,
                    extraAdultAmount: 0,
                    extraChildAmount: 0,
                    taxAmount: 600,
                    offerDiscountAmount: 0,
                    couponDiscountAmount: 0,
                    referralDiscountAmount: 0,
                    totalAmount: total + 600,
                    numberOfNights: 1,
                    targetCurrency: 'INR',
                    convertedTotal: total + 600,
                    exchangeRate: 1.0,
                    isGstInclusive: false,
                });
            }),
            validatePriceOverride: jest.fn().mockReturnValue(true),
        };

        systemSettingsMock = {
            getSetting: jest.fn().mockResolvedValue(null),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BookingsService,
                { provide: PrismaService, useValue: prismaMock },
                { provide: AvailabilityService, useValue: availabilityServiceMock },
                { provide: PricingService, useValue: pricingServiceMock },
                { provide: AuditService, useValue: { createLog: jest.fn().mockResolvedValue({}) } },
                { provide: ChannelPartnersService, useValue: { deductWalletBalance: jest.fn(), getCommissionRate: jest.fn().mockResolvedValue({ rate: 10 }) } },
                { provide: PaymentsService, useValue: {} },
                { provide: NotificationsService, useValue: { sendBookingConfirmation: jest.fn() } },
                { provide: SystemSettingsService, useValue: systemSettingsMock },
                { provide: PdfService, useValue: {} },
                { provide: MailService, useValue: {} },
            ],
        }).compile();

        service = module.get<BookingsService>(BookingsService);
    });

    describe('Booking Flow Tests (Cases A - L)', () => {
        it('Booking Case A: V1 property continues existing legacy booking behavior', async () => {
            const v1Dto = {
                ...baseDto,
                roomTypeId: 'rt-v1-1',
                adultsCount: 2,
                childrenCount: 1,
            };

            const booking = await service.create(v1Dto as any, null);
            expect(booking).toBeDefined();
            expect(pricingServiceMock.calculatePrice).toHaveBeenCalledWith(
                'rt-v1-1',
                expect.any(Date),
                expect.any(Date),
                2,
                1,
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
                0
            );
        });

        it('Booking Case B: Valid V2 guest party successfully creates booking', async () => {
            const v2Dto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 1,
                infantsCount: 1,
            };

            const booking = await service.create(v2Dto as any, null);
            expect(booking).toBeDefined();
            expect(prismaMock.booking.create).toHaveBeenCalled();
            const createCall = prismaMock.booking.create.mock.calls[0][0];
            expect(createCall.data.infantsCount).toBe(1);
        });

        it('Booking Case C: Physical adult rejection (A > maxPhysicalAdults) fails validation', async () => {
            const overAdultsDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 4, // maxPhysicalAdults = 3
                childrenCount: 0,
            };

            await expect(service.create(overAdultsDto as any, null)).rejects.toThrow(BadRequestException);
            await expect(service.create(overAdultsDto as any, null)).rejects.toThrow(/exceeds physical/i);
        });

        it('Booking Case D: Physical child rejection (C > maxPhysicalChildren) fails validation', async () => {
            const overChildrenDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 3, // maxPhysicalChildren = 2
            };

            await expect(service.create(overChildrenDto as any, null)).rejects.toThrow(BadRequestException);
            await expect(service.create(overChildrenDto as any, null)).rejects.toThrow(/exceeds physical/i);
        });

        it('Booking Case E: Total occupancy rejection (A + C > totalMaxOccupancy) fails validation', async () => {
            const overTotalDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 3, // 3 <= maxPhysA(3)
                childrenCount: 2, // 2 <= maxPhysC(2)
                // A + C = 5 > totalMaxOccupancy(4)
            };

            await expect(service.create(overTotalDto as any, null)).rejects.toThrow(BadRequestException);
            await expect(service.create(overTotalDto as any, null)).rejects.toThrow(/exceeds physical/i);
        });

        it('Booking Case F: Infant capacity (I <= maxPhysicalInfants accepted, I > maxPhysicalInfants rejected)', async () => {
            // I = 1 is accepted (maxPhysicalInfants = 1)
            const validInfantsDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 1,
                infantsCount: 1,
            };
            const booking = await service.create(validInfantsDto as any, null);
            expect(booking).toBeDefined();

            // I = 2 is rejected
            const invalidInfantsDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 1,
                infantsCount: 2,
            };
            await expect(service.create(invalidInfantsDto as any, null)).rejects.toThrow(BadRequestException);
        });

        it('Booking Case G: Infant pricing (infants do not consume A+C capacity and are ₹0)', async () => {
            // Party 2A + 2C + 1I (A+C = 4 == totalMaxOccupancy, plus 1 infant)
            const maxPartyWithInfantDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 2,
                infantsCount: 1,
            };

            const booking = await service.create(maxPartyWithInfantDto as any, null);
            expect(booking).toBeDefined();
            expect(pricingServiceMock.calculatePrice).toHaveBeenCalledWith(
                'rt-v2-1',
                expect.any(Date),
                expect.any(Date),
                2,
                2,
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
                1 // infantsCount forwarded
            );
        });

        it('Booking Case J: Client-supplied price cannot override authoritative backend calculation for unprivileged guest', async () => {
            const manipulatedDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                overrideTotal: 100, // Attempted hack
                overrideReason: 'cheap price',
            };

            // Guest user (user = null)
            await service.create(manipulatedDto as any, null);
            expect(pricingServiceMock.calculatePrice).toHaveBeenCalledWith(
                'rt-v2-1',
                expect.any(Date),
                expect.any(Date),
                2,
                1,
                undefined,
                undefined,
                'INR',
                false,
                undefined,
                1,
                undefined,
                undefined, // overrideTotal stripped because caller is not authorized staff
                true,
                undefined,
                undefined,
                0
            );
        });

        it('Booking Case L & Isolation: V2 Property with unready RoomType blocks V2 booking creation', async () => {
            const unreadyV2RoomType = {
                id: 'rt-unready',
                name: 'Unready Villa',
                propertyId: 'prop-v2',
                occupancyVersion: 'V1', // Missing V2 readiness
                property: {
                    id: 'prop-v2',
                    occupancyVersion: 'V2', // Property is V2
                },
            };
            prismaMock.roomType.findUnique.mockResolvedValueOnce(unreadyV2RoomType);

            await expect(service.create({ ...baseDto, roomTypeId: 'rt-unready' } as any, null)).rejects.toThrow(BadRequestException);
            await expect(service.create({ ...baseDto, roomTypeId: 'rt-unready' } as any, null)).rejects.toThrow(/not V2-ready/i);
        });

        it('Booking Case H & I: Mixed excess (2A + 2C) forwards to canonical pricing and records authoritative breakdown', async () => {
            const mixedPartyDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 2,
                infantsCount: 0,
            };

            const booking = await service.create(mixedPartyDto as any, null);
            expect(booking).toBeDefined();
            expect(pricingServiceMock.calculatePrice).toHaveBeenCalledWith(
                'rt-v2-1',
                expect.any(Date),
                expect.any(Date),
                2,
                2,
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
                0
            );
            expect(prismaMock.booking.create).toHaveBeenCalled();
            const createCall = prismaMock.booking.create.mock.calls[0][0];
            expect(createCall.data.adultsCount).toBe(2);
            expect(createCall.data.childrenCount).toBe(2);
            expect(createCall.data.totalAmount).toBe(5600);
        });

        it('Booking Case K: Historical entry requires full payment and preserves historical financial integrity', async () => {
            const historicalDto = {
                ...baseDto,
                roomTypeId: 'rt-v2-1',
                adultsCount: 2,
                childrenCount: 1,
                isHistoricalEntry: true,
                paidAmount: 2000, // Insufficient for full payment (total = 5600)
                guests: [{ firstName: 'John', lastName: 'Doe', idType: 'Aadhaar', idNumber: '123456789012' }],
            };

            await expect(service.create(historicalDto as any, null)).rejects.toThrow(BadRequestException);
            await expect(service.create(historicalDto as any, null)).rejects.toThrow(/full payment/i);
        });

        it('Reschedule under V2 Property: Revalidates physical feasibility against canonical limits and recalculates price', async () => {
            const existingBooking = {
                id: 'bk-resched-1',
                bookingNumber: 'BK-999',
                status: 'CONFIRMED',
                checkInDate: new Date('2026-10-01'),
                checkOutDate: new Date('2026-10-02'),
                roomTypeId: 'rt-v2-1',
                roomId: 'room-1',
                adultsCount: 2,
                childrenCount: 1,
                infantsCount: 0,
                paidAmount: 5600,
                paymentStatus: 'FULL',
                isGroupBooking: false,
                propertyId: 'prop-v2',
                room: { roomType: v2RoomType },
                roomType: v2RoomType,
                bookingRooms: [{ roomId: 'room-1' }],
                roomBlocks: [],
                guests: [],
            };
            prismaMock.booking.findUnique.mockResolvedValue(existingBooking);

            // Attempt reschedule with exceeding adults (4 > maxPhysicalAdults 3)
            const overCapacityRescheduleDto = {
                checkInDate: '2026-10-10',
                checkOutDate: '2026-10-11',
                adultsCount: 4,
                childrenCount: 0,
            };

            await expect(service.reschedule('bk-resched-1', overCapacityRescheduleDto as any, null)).rejects.toThrow(BadRequestException);
            await expect(service.reschedule('bk-resched-1', overCapacityRescheduleDto as any, null)).rejects.toThrow(/exceeds physical/i);
        });
    });
});
