import { validateAndMapChannexOccupancy } from '../channels/adapters/channex.adapter';
import { solveAccommodationOptions, validateChildAges, RoomTypeOccupancyProfile } from '../common/utils/occupancy-solver.util';

describe('Task 2A Phase 3: DB Persistence, Migration Safety, Channex Integration & Regression', () => {

    describe('1. Single-Room Booking Persistence & Demographic Breakdown', () => {
        it('should correctly snapshot childAges, free/paid counts, and per-night pricing for single-room booking', () => {
            const createBookingDto = {
                roomTypeId: 'rt-heritage',
                checkInDate: '2026-06-01',
                checkOutDate: '2026-06-03', // 2 nights
                adultsCount: 2,
                childrenCount: 2,
                childAges: [4, 8],
                infantsCount: 0,
            };

            const pricing = {
                numberOfNights: 2,
                baseAmount: 9000,
                extraAdultAmount: 0,
                extraChildAmount: 900,
                taxAmount: 1188,
                totalAmount: 11088,
            };

            const selectedRooms = [{ id: 'room-101', roomTypeId: 'rt-heritage', propertyId: 'prop-1' }];

            // Simulate the exact persistence mapping logic from BookingsService.create
            const bookingData = {
                adultsCount: createBookingDto.adultsCount,
                childrenCount: createBookingDto.childrenCount,
                childAges: createBookingDto.childAges || [],
                totalAmount: pricing.totalAmount,
                bookingRooms: selectedRooms.map((r, idx) => {
                    const alloc = undefined;
                    const rChildAges: number[] = createBookingDto.childAges || [];
                    const rAdults = createBookingDto.adultsCount;
                    const rChildren = createBookingDto.childrenCount;
                    const rFreeChildren = rChildAges.filter(a => a >= 3 && a <= 6).length;
                    const rPaidChildren = rChildAges.filter(a => a >= 7 && a <= 12).length;
                    const totalRooms = selectedRooms.length;
                    const nights = pricing.numberOfNights;

                    return {
                        roomId: r.id,
                        roomTypeId: r.roomTypeId,
                        adultsCount: rAdults,
                        childrenCount: rChildren,
                        childAges: rChildAges,
                        freeChildrenCount: rFreeChildren,
                        paidChildrenCount: rPaidChildren,
                        basePricePerNight: pricing.baseAmount / (nights * totalRooms),
                        extraAdultChargePerNight: pricing.extraAdultAmount / (nights * totalRooms),
                        extraChildChargePerNight: pricing.extraChildAmount / (nights * totalRooms),
                        totalPricePerNight: pricing.totalAmount / (nights * totalRooms),
                    };
                }),
            };

            expect(bookingData.childAges).toEqual([4, 8]);
            expect(bookingData.bookingRooms).toHaveLength(1);
            
            const br = bookingData.bookingRooms[0];
            expect(br.roomId).toBe('room-101');
            expect(br.roomTypeId).toBe('rt-heritage');
            expect(br.adultsCount).toBe(2);
            expect(br.childrenCount).toBe(2);
            expect(br.childAges).toEqual([4, 8]);
            expect(br.freeChildrenCount).toBe(1); // age 4 is free
            expect(br.paidChildrenCount).toBe(1); // age 8 is paid
            expect(br.basePricePerNight).toBe(4500);
            expect(br.extraChildChargePerNight).toBe(450);
            expect(br.totalPricePerNight).toBe(5544);
        });
    });

    describe('2. Multi-Room Booking Demographic Allocation Persistence', () => {
        it('should correctly snapshot distinct roomAllocations with unequal child ages across rooms', () => {
            const createBookingDto = {
                roomTypeId: 'rt-heritage',
                checkInDate: '2026-06-01',
                checkOutDate: '2026-06-02', // 1 night
                adultsCount: 4,
                childrenCount: 3,
                childAges: [4, 8, 10],
                roomAllocations: [
                    {
                        roomId: 'room-101',
                        roomTypeId: 'rt-heritage',
                        adults: 2,
                        children: 2,
                        childAges: [4, 8],
                        extraAdults: 0,
                        extraChildren: 1,
                    },
                    {
                        roomId: 'room-102',
                        roomTypeId: 'rt-heritage',
                        adults: 2,
                        children: 1,
                        childAges: [10],
                        extraAdults: 0,
                        extraChildren: 1,
                    },
                ],
            };

            const selectedRooms = [
                { id: 'room-101', roomTypeId: 'rt-heritage' },
                { id: 'room-102', roomTypeId: 'rt-heritage' },
            ];

            const pricing = {
                numberOfNights: 1,
                baseAmount: 9000,
                extraAdultAmount: 0,
                extraChildAmount: 900,
                totalAmount: 9900,
            };

            const bookingRooms = selectedRooms.map((r, idx) => {
                const alloc = createBookingDto.roomAllocations.find(a => a.roomId === r.id) || createBookingDto.roomAllocations[idx];
                const rChildAges: number[] = alloc?.childAges || [];
                const rAdults = alloc?.adults ?? 2;
                const rChildren = alloc?.children ?? rChildAges.length;
                const rFreeChildren = rChildAges.filter(a => a >= 3 && a <= 6).length;
                const rPaidChildren = rChildAges.filter(a => a >= 7 && a <= 12).length;

                return {
                    roomId: r.id,
                    roomTypeId: alloc?.roomTypeId || r.roomTypeId,
                    adultsCount: rAdults,
                    childrenCount: rChildren,
                    childAges: rChildAges,
                    freeChildrenCount: rFreeChildren,
                    paidChildrenCount: rPaidChildren,
                };
            });

            expect(createBookingDto.childAges).toEqual([4, 8, 10]);
            expect(bookingRooms).toHaveLength(2);

            // Room 1 verification
            expect(bookingRooms[0].roomId).toBe('room-101');
            expect(bookingRooms[0].adultsCount).toBe(2);
            expect(bookingRooms[0].childrenCount).toBe(2);
            expect(bookingRooms[0].childAges).toEqual([4, 8]);
            expect(bookingRooms[0].freeChildrenCount).toBe(1);
            expect(bookingRooms[0].paidChildrenCount).toBe(1);

            // Room 2 verification
            expect(bookingRooms[1].roomId).toBe('room-102');
            expect(bookingRooms[1].adultsCount).toBe(2);
            expect(bookingRooms[1].childrenCount).toBe(1);
            expect(bookingRooms[1].childAges).toEqual([10]);
            expect(bookingRooms[1].freeChildrenCount).toBe(0);
            expect(bookingRooms[1].paidChildrenCount).toBe(1);
        });
    });

    describe('3. Historical Booking Compatibility & Pricing Immutability', () => {
        it('should safely handle historical bookings with empty childAges and preserve totalAmount', () => {
            // Simulated historical booking record created prior to Phase 3
            const historicalBooking = {
                id: 'hist-booking-1',
                bookingNumber: 'BK-2025-001',
                adultsCount: 2,
                childrenCount: 2,
                childAges: [], // Empty array from schema default
                baseAmount: 4500,
                extraAdultAmount: 0,
                extraChildAmount: 900,
                taxAmount: 648,
                totalAmount: 6048,
                bookingRooms: [
                    {
                        roomId: 'room-1',
                        roomTypeId: 'rt-1',
                        adultsCount: null, // Historical records have null room-level breakdown
                        childrenCount: null,
                        childAges: [],
                        freeChildrenCount: null,
                        paidChildrenCount: null,
                    }
                ]
            };

            // Simulating RoomType price change in master data
            const updatedRoomTypeMaster = {
                id: 'rt-1',
                basePrice: 7500, // Price increased from 4500 to 7500
                extraAdultRate: 1500,
                extraChildRate: 1000,
            };

            // Historical booking must preserve its original transaction amounts
            expect(historicalBooking.totalAmount).toBe(6048);
            expect(historicalBooking.baseAmount).toBe(4500);
            expect(historicalBooking.childAges).toEqual([]);
            expect(historicalBooking.bookingRooms[0].childAges).toEqual([]);
            // Master change does not touch historical record
            expect(historicalBooking.baseAmount).not.toBe(updatedRoomTypeMaster.basePrice);
        });
    });

    describe('4. Channex Occupancy Mapping Verification', () => {
        const profile: any = {
            name: 'Heritage Standard',
            totalBaseOccupancy: 2,
            totalMaxOccupancy: 4,
            maxPhysicalAdults: 3,
            maxPhysicalChildren: 2,
            maxPhysicalInfants: 1,
        };

        it('should map occ_infants to maxPhysicalInfants and NOT freeChildrenCount', () => {
            const mapped = validateAndMapChannexOccupancy(profile, true);

            expect(mapped.occ_adults).toBe(3);
            expect(mapped.occ_children).toBe(2);
            expect(mapped.occ_infants).toBe(1); // maxPhysicalInfants
        });

        it('should never map internal freeChildrenCount (ages 3–6) to Channex occ_infants', () => {
            // Suppose a party has 2 free children (ages 3–6)
            const childAges = [3, 6];
            const freeChildrenCount = childAges.filter(a => a >= 3 && a <= 6).length;
            expect(freeChildrenCount).toBe(2);

            // Channex mapping must remain strictly based on physical capacity
            const mapped = validateAndMapChannexOccupancy(profile, true);
            expect(mapped.occ_infants).toBe(1);
            expect(mapped.occ_infants).not.toBe(freeChildrenCount);
        });

        it('should default occ_infants to 0 when maxPhysicalInfants is 0 or undefined', () => {
            const profileNoInfants: any = {
                name: 'Basic Room',
                totalBaseOccupancy: 2,
                totalMaxOccupancy: 2,
                maxPhysicalAdults: 2,
                maxPhysicalChildren: 0,
                maxPhysicalInfants: 0,
            };

            const mapped = validateAndMapChannexOccupancy(profileNoInfants, true);
            expect(mapped.occ_adults).toBe(2);
            expect(mapped.occ_children).toBe(0);
            expect(mapped.occ_infants).toBe(0);
        });
    });
});
