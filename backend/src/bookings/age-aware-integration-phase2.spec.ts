import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AvailabilityService } from './availability.service';
import { PricingService } from './pricing.service';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrenciesService } from '../currencies/currencies.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { AuditService } from '../audit/audit.service';
import { ChannelPartnersService } from '../channel-partners/channel-partners.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PdfService } from '../pdf/pdf.service';
import { MailService } from '../mail/mail.service';
import { InvoiceNumberService } from './invoice-number.service';
import { ChannelsService } from '../channels/channels.service';
import { ConnectivityOutboxService } from '../connectivity/services/connectivity-outbox.service';
import { validateChildAges, solveAccommodationOptions } from '../common/utils/occupancy-solver.util';

describe('Phase 2 Age-Aware Backend Integration', () => {
  let availabilityService: AvailabilityService;
  let pricingService: PricingService;
  let bookingsService: BookingsService;
  let prismaMock: any;
  let currenciesMock: any;
  let systemSettingsMock: any;

  // Real property data from Heritage Standard and Villa
  const mockHeritageStandard = {
    id: 'rt-heritage-std',
    propertyId: 'prop-heritage',
    name: 'Heritage Standard',
    occupancyVersion: 'V2',
    basePrice: 4500,
    totalBaseOccupancy: 2,
    totalMaxOccupancy: 3,
    maxPhysicalAdults: 3,
    maxPhysicalChildren: 2,
    maxPhysicalInfants: 1,
    baseMaxAdults: 2,
    baseMaxChildren: 1,
    freeChildrenCount: 0,
    extraAdultPrice: 1000,
    extraChildPrice: 450,
    allowSingleBookings: true,
    isOccupancyV2Ready: true,
    property: {
      id: 'prop-heritage',
      name: 'Grand Heritage Resort',
      occupancyVersion: 'V2',
      isOccupancyV2Ready: true,
      baseCurrency: 'INR',
      _count: { rooms: 5 },
    },
    inventory: [
      {
        id: 'inv-1',
        roomTypeId: 'rt-heritage-std',
        date: new Date('2026-10-01'),
        price: 4500,
        availableRooms: 5,
        totalRooms: 5,
        bookedRooms: 0,
        blockedRooms: 0,
      },
    ],
  };

  const mockHeritageVilla = {
    id: 'rt-heritage-villa',
    propertyId: 'prop-heritage',
    name: 'Heritage Villa',
    occupancyVersion: 'V2',
    basePrice: 8000,
    totalBaseOccupancy: 4,
    totalMaxOccupancy: 6,
    maxPhysicalAdults: 5,
    maxPhysicalChildren: 3,
    maxPhysicalInfants: 2,
    baseMaxAdults: 4,
    baseMaxChildren: 2,
    freeChildrenCount: 1,
    extraAdultPrice: 1200,
    extraChildPrice: 600,
    allowSingleBookings: true,
    isOccupancyV2Ready: true,
    property: {
      id: 'prop-heritage',
      name: 'Grand Heritage Resort',
      occupancyVersion: 'V2',
      isOccupancyV2Ready: true,
      baseCurrency: 'INR',
      _count: { rooms: 5 },
    },
    inventory: [
      {
        id: 'inv-2',
        roomTypeId: 'rt-heritage-villa',
        date: new Date('2026-10-01'),
        price: 8000,
        availableRooms: 3,
        totalRooms: 3,
        bookedRooms: 0,
        blockedRooms: 0,
      },
    ],
  };

  beforeEach(async () => {
    prismaMock = {
      property: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where?.id === 'prop-heritage') {
            return Promise.resolve({
              id: 'prop-heritage',
              name: 'Grand Heritage Resort',
              occupancyVersion: 'V2',
              isOccupancyV2Ready: true,
              allowsGroupBooking: false,
              baseCurrency: 'INR',
              _count: { rooms: 5 },
            });
          }
          return Promise.resolve(null);
        }),
      },
      roomType: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          const rts = [mockHeritageStandard, mockHeritageVilla];
          if (where?.propertyId) {
            return Promise.resolve(rts.filter((r) => r.propertyId === where.propertyId));
          }
          return Promise.resolve(rts);
        }),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where?.id === 'rt-heritage-std') return Promise.resolve(mockHeritageStandard);
          if (where?.id === 'rt-heritage-villa') return Promise.resolve(mockHeritageVilla);
          return Promise.resolve(null);
        }),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      inventory: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          const invs = [...mockHeritageStandard.inventory, ...mockHeritageVilla.inventory];
          return Promise.resolve(
            invs.filter((inv) => where?.roomTypeId?.in?.includes(inv.roomTypeId)),
          );
        }),
        findFirst: jest.fn().mockImplementation(({ where }) => {
          if (where?.roomTypeId === 'rt-heritage-std') return Promise.resolve(mockHeritageStandard.inventory[0]);
          if (where?.roomTypeId === 'rt-heritage-villa') return Promise.resolve(mockHeritageVilla.inventory[0]);
          return Promise.resolve(null);
        }),
        update: jest.fn().mockResolvedValue({}),
      },
      room: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          return Promise.resolve({
            id: where?.id || 'room-101',
            roomNumber: '101',
            roomTypeId: 'rt-heritage-std',
            propertyId: 'prop-heritage',
            isEnabled: true,
            status: 'AVAILABLE',
          });
        }),
        findMany: jest.fn().mockImplementation(({ where }) => {
          const all = [
            { id: 'room-101', roomNumber: '101', roomTypeId: 'rt-heritage-std', propertyId: 'prop-heritage', isEnabled: true, status: 'AVAILABLE' },
            { id: 'room-102', roomNumber: '102', roomTypeId: 'rt-heritage-std', propertyId: 'prop-heritage', isEnabled: true, status: 'AVAILABLE' },
            { id: 'room-103', roomNumber: '103', roomTypeId: 'rt-heritage-std', propertyId: 'prop-heritage', isEnabled: true, status: 'AVAILABLE' },
            { id: 'room-201', roomNumber: '201', roomTypeId: 'rt-heritage-villa', propertyId: 'prop-heritage', isEnabled: true, status: 'AVAILABLE' },
            { id: 'room-202', roomNumber: '202', roomTypeId: 'rt-heritage-villa', propertyId: 'prop-heritage', isEnabled: true, status: 'AVAILABLE' },
          ];
          if (where?.roomTypeId) {
            return Promise.resolve(all.filter((r) => r.roomTypeId === where.roomTypeId));
          }
          return Promise.resolve(all);
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      stopSellRestriction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      closedToArrivalRestriction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      closedToDepartureRestriction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      minStayRestriction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      maxStayRestriction: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      restrictionRule: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
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
      booking: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'bk-12345',
            bookingNumber: 'BK-1001',
            ...data,
          }),
        ),
      },
      bookingGuest: {
        update: jest.fn().mockResolvedValue({}),
      },
      bookingRoom: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'bkr-1', ...data })),
      },
      roomBlock: {
        findMany: jest.fn().mockResolvedValue([]),
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRawUnsafe: jest.fn().mockResolvedValue(1),
      $transaction: jest.fn().mockImplementation((cb) => cb(prismaMock)),
    };

    currenciesMock = {
      getExchangeRate: jest.fn().mockResolvedValue(1),
    };

    systemSettingsMock = {
      getSetting: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        PricingService,
        BookingsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: CurrenciesService, useValue: currenciesMock },
        { provide: SystemSettingsService, useValue: systemSettingsMock },
        { provide: AuditService, useValue: { createLog: jest.fn().mockResolvedValue({}) } },
        { provide: ChannelPartnersService, useValue: { deductWalletBalance: jest.fn(), getCommissionRate: jest.fn().mockResolvedValue({ rate: 10 }) } },
        { provide: PaymentsService, useValue: {} },
        { provide: NotificationsService, useValue: { sendBookingConfirmation: jest.fn() } },
        { provide: PdfService, useValue: {} },
        { provide: MailService, useValue: {} },
        { provide: InvoiceNumberService, useValue: { generateNextInvoiceNumber: jest.fn().mockResolvedValue('INV-2026-0001') } },
        { provide: ChannelsService, useValue: { isChannexIntegrated: jest.fn().mockResolvedValue(false), queueBookingSync: jest.fn().mockResolvedValue({}), pushAvailabilityForDates: jest.fn().mockResolvedValue({}) } },
        { provide: ConnectivityOutboxService, useValue: { enqueueEvent: jest.fn().mockResolvedValue({}), emitAvailabilityChange: jest.fn().mockResolvedValue({}) } },
      ],
    }).compile();

    availabilityService = module.get<AvailabilityService>(AvailabilityService);
    pricingService = module.get<PricingService>(PricingService);
    bookingsService = module.get<BookingsService>(BookingsService);
  });

  describe('1. Platform Child Age Validation Rules', () => {
    it('rejects when children > 0 but childAges is undefined', () => {
      expect(() => validateChildAges(2, undefined)).toThrow(BadRequestException);
      expect(() => validateChildAges(2, undefined)).toThrow(/mandatory/i);
    });

    it('rejects when childAges length does not match children count', () => {
      expect(() => validateChildAges(2, [5])).toThrow(BadRequestException);
      expect(() => validateChildAges(1, [5, 6])).toThrow(BadRequestException);
    });

    it('rejects when childAges contains infant age (0-2)', () => {
      expect(() => validateChildAges(1, [2])).toThrow(BadRequestException);
      expect(() => validateChildAges(2, [4, 1])).toThrow(BadRequestException);
    });

    it('rejects when childAges contains adult age (13+)', () => {
      expect(() => validateChildAges(1, [13])).toThrow(BadRequestException);
      expect(() => validateChildAges(2, [4, 15])).toThrow(BadRequestException);
    });

    it('rejects negative or non-integer child ages', () => {
      expect(() => validateChildAges(1, [-3])).toThrow(BadRequestException);
      expect(() => validateChildAges(1, [5.5])).toThrow(BadRequestException);
    });

    it('accepts children = 0 with undefined or empty childAges', () => {
      expect(() => validateChildAges(0, undefined)).not.toThrow();
      expect(() => validateChildAges(0, [])).not.toThrow();
    });

    it('accepts valid child ages in [3, 12]', () => {
      expect(() => validateChildAges(3, [3, 6, 12])).not.toThrow();
    });
  });

  describe('2. Canonical Pricing & Scenarios (Task 2 Real Data Audit)', () => {
    it('Heritage Standard 2A + 1 paid child [7] -> ₹4,950 total (4500 base + 450 extra child)', async () => {
      const priceResult = await pricingService.calculatePrice(
        'rt-heritage-std',
        new Date('2026-10-01'),
        new Date('2026-10-02'),
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
        0,
        0,
        0,
        [7],
      );
      expect(priceResult.baseAmount).toBe(4500);
      expect(priceResult.extraAdultAmount).toBe(0);
      expect(priceResult.extraChildAmount).toBe(450);
      expect(priceResult.baseAmount + priceResult.extraChildAmount).toBe(4950);
    });

    it('Heritage Standard 2A + children [7, 8] with 2 rooms -> ₹9,000 without excess headcount charge', async () => {
      const priceResult = await pricingService.calculatePrice(
        'rt-heritage-std',
        new Date('2026-10-01'),
        new Date('2026-10-02'),
        2,
        2,
        undefined,
        undefined,
        'INR',
        false,
        undefined,
        2,
        undefined,
        undefined,
        true,
        0,
        0,
        0,
        [7, 8],
      );
      expect(priceResult.baseAmount).toBe(9000);
      expect(priceResult.extraAdultAmount).toBe(0);
      expect(priceResult.extraChildAmount).toBe(0);
    });

    it('Heritage Villa (4A + [7, 8]) -> ₹9,200 (covers 4A base, 2 paid children extra @ 600)', async () => {
      const villaResult = await pricingService.calculatePrice(
        'rt-heritage-villa',
        new Date('2026-10-01'),
        new Date('2026-10-02'),
        4,
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
        0,
        0,
        0,
        [7, 8],
      );
      expect(villaResult.baseAmount).toBe(8000);
      expect(villaResult.extraAdultAmount).toBe(0);
      expect(villaResult.extraChildAmount).toBe(1200);
      expect(villaResult.baseAmount + villaResult.extraChildAmount).toBe(9200);
    });

    it('Heritage Villa 4A + children [4, 8] (Free child age 4 + Paid child age 8) -> ₹8,600', async () => {
      const priceResult = await pricingService.calculatePrice(
        'rt-heritage-villa',
        new Date('2026-10-01'),
        new Date('2026-10-02'),
        4,
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
        0,
        0,
        0,
        [4, 8],
      );
      expect(priceResult.baseAmount).toBe(8000);
      expect(priceResult.extraAdultAmount).toBe(0);
      expect(priceResult.extraChildAmount).toBe(600);
      expect(priceResult.baseAmount + priceResult.extraChildAmount).toBe(8600);
    });
  });

  describe('3. Anti-Manipulation & Server-Side Authority Protection', () => {
    it('ignores client manipulated price, extraAdultsCount, extraChildrenCount and recomputes canonical amounts', async () => {
      const priceResult = await pricingService.calculatePrice(
        'rt-heritage-std',
        new Date('2026-10-01'),
        new Date('2026-10-02'),
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
        // Malicious client inputs:
        0,
        0,
        0,
        [7],
      );

      // Server must ignore 0 extra children and recompute canonical 1 extra child (₹450)
      expect(priceResult.extraChildAmount).toBe(450);
      expect(priceResult.baseAmount + priceResult.extraChildAmount).toBe(4950);
    });

    it('BookingsService recomputes authoritative price and ignores tampered client amounts', async () => {
      const booking = await bookingsService.create({
        propertyId: 'prop-heritage',
        roomTypeId: 'rt-heritage-std',
        checkInDate: '2026-10-01',
        checkOutDate: '2026-10-02',
        adultsCount: 2,
        childrenCount: 1,
        childAges: [7],
        infantsCount: 0,
        roomsCount: 1,
        guestName: 'John Doe',
        guestEmail: 'john@example.com',
        guestPhone: '+919876543210',
        paymentType: 'PAY_AT_HOTEL',
        // Client maliciously attempts to pay ₹100
        overrideTotal: 100 as any,
      });

      expect(booking.extraChildAmount).toBe(450);
      expect(booking.baseAmount).toBe(4500);
      expect(booking.totalAmount).toBe(4950 + booking.taxAmount);
    });
  });

  describe('4. Search vs Calculate-Price vs Booking Creation Parity', () => {
    it('guarantees identical price across Search, CalculatePrice, and Booking creation', async () => {
      const checkIn = new Date('2026-10-01');
      const checkOut = new Date('2026-10-02');

      // 1. Search API
      const searchResult = await availabilityService.searchAvailableRoomTypes(
        checkIn,
        checkOut,
        2,
        1,
        undefined,
        undefined,
        false,
        1,
        undefined,
        undefined,
        undefined,
        undefined,
        'INR',
        'prop-heritage',
        false,
        undefined,
        0,
        [7],
      );

      const solutions = (searchResult as any).accommodationSolutions || [];
      expect(solutions.length).toBeGreaterThan(0);
      const stdSolution = solutions.find(
        (s: any) => s.rooms.some((r: any) => r.roomTypeId === 'rt-heritage-std') && s.totalRooms === 1,
      );
      expect(stdSolution).toBeDefined();
      const searchPrice = stdSolution.pricing.totalPrice;

      // 2. Calculate-Price API
      const calcResult = await pricingService.calculatePrice(
        'rt-heritage-std',
        checkIn,
        checkOut,
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
        0,
        [7],
      );
      const calcPrice = calcResult.totalAmount;

      // 3. Booking Creation API
      const booking = await bookingsService.create({
        propertyId: 'prop-heritage',
        roomTypeId: 'rt-heritage-std',
        checkInDate: '2026-10-01',
        checkOutDate: '2026-10-02',
        adultsCount: 2,
        childrenCount: 1,
        childAges: [7],
        infantsCount: 0,
        roomsCount: 1,
        guestName: 'Jane Doe',
        guestEmail: 'jane@example.com',
        guestPhone: '+919876543210',
        paymentType: 'PAY_AT_HOTEL',
      });
      const bookingPrice = booking.totalAmount;

      // Assert complete mathematical parity
      expect(calcPrice).toBe(bookingPrice);
      expect(searchPrice).toEqual(calcResult.baseAmount + calcResult.extraChildAmount + calcResult.extraAdultAmount);
    });
  });

  describe('5. Multi-Room & Mixed RoomType Allocation', () => {
    it('allocates child ages across mixed RoomTypes and preserves room-level childAges in solution', async () => {
      const checkIn = new Date('2026-10-01');
      const checkOut = new Date('2026-10-02');

      // 5 adults + 3 children [4, 8, 9] + 1 infant
      // Mixed solution: 1 Heritage Villa (4A + [4, 8] + 1 inf) + 1 Heritage Standard (1A + [9])
      const searchResult = await availabilityService.searchAvailableRoomTypes(
        checkIn,
        checkOut,
        5,
        3,
        undefined,
        undefined,
        false,
        2,
        undefined,
        undefined,
        undefined,
        undefined,
        'INR',
        'prop-heritage',
        false,
        undefined,
        1,
        [4, 8, 9],
      );

      const solutions = (searchResult as any).accommodationSolutions || [];
      expect(solutions.length).toBeGreaterThan(0);
      const mixedSolution = solutions.find((s: any) => s.totalRooms === 2);
      expect(mixedSolution).toBeDefined();

      // Check that every room in the solution has a preserved childAges array and sum matches total
      const allAssignedChildAges: number[] = [];
      for (const room of mixedSolution!.rooms) {
        expect(Array.isArray(room.childAges)).toBe(true);
        expect(room.childAges!.length).toBe(room.children);
        allAssignedChildAges.push(...room.childAges!);
      }
      expect(allAssignedChildAges.sort()).toEqual([4, 8, 9]);
    });
  });
});
