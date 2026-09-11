import { BadRequestException } from '@nestjs/common';
import { ChannexAdapter, validateAndMapChannexOccupancy } from './adapters/channex.adapter';

describe('Phase 7: Channex Canonical Occupancy Integration', () => {
  let adapter: ChannexAdapter;

  beforeEach(() => {
    adapter = new ChannexAdapter();
  });

  describe('A. Correct V2 Mapping', () => {
    it('should correctly map all canonical V2 fields for a V2 property', () => {
      const roomType: any = {
        name: 'Deluxe Suite',
        occupancyVersion: 'V2',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
        maxPhysicalInfants: 1,
        freeChildrenCount: 1,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);

      expect(result).toEqual({
        occ_adults: 3,
        occ_children: 2,
        occ_infants: 1,
        default_occupancy: 2,
        ratePlanOccupancy: 2,
      });
    });
  });

  describe('B. V1 Property Preserves Existing Behavior', () => {
    it('should preserve legacy maxAdults, maxChildren, freeChildrenCount for V1 properties', () => {
      const roomType: any = {
        name: 'Legacy Villa',
        occupancyVersion: 'V1',
        maxAdults: 4,
        maxChildren: 2,
        freeChildrenCount: 0,
        // Even if some V2 fields exist in DB, V1 runtime property ignores them
        totalBaseOccupancy: 2,
        maxPhysicalAdults: 5,
      };

      const result = validateAndMapChannexOccupancy(roomType, false);

      expect(result).toEqual({
        occ_adults: 4,
        occ_children: 2,
        occ_infants: 0,
        default_occupancy: 4,
        ratePlanOccupancy: 4,
      });
    });

    it('should use default fallback values for V1 if legacy fields are omitted', () => {
      const roomType: any = {
        name: 'Unspecified Room',
      };

      const result = validateAndMapChannexOccupancy(roomType, false);

      expect(result).toEqual({
        occ_adults: 2,
        occ_children: 2,
        occ_infants: 0,
        default_occupancy: 2,
        ratePlanOccupancy: 2,
      });
    });
  });

  describe('C. V2 Property Sends Canonical Values', () => {
    it('should use canonical fields and not legacy maxAdults when isV2Property is true', () => {
      const roomType: any = {
        name: 'Executive Room',
        maxAdults: 10, // Legacy artifact
        maxChildren: 10, // Legacy artifact
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 3,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 1,
        maxPhysicalInfants: 1,
        freeChildrenCount: 0,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);

      expect(result.occ_adults).toBe(3); // canonical maxPhysicalAdults, NOT 10
      expect(result.occ_children).toBe(1); // canonical maxPhysicalChildren, NOT 10
      expect(result.default_occupancy).toBe(2); // canonical totalBaseOccupancy
    });
  });

  describe('D. maxPhysicalAdults -> occ_adults', () => {
    it('should map maxPhysicalAdults directly to occ_adults', () => {
      const roomType: any = {
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 0,
        freeChildrenCount: 0,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(4);
    });
  });

  describe('E. maxPhysicalChildren -> occ_children', () => {
    it('should map maxPhysicalChildren directly to occ_children', () => {
      const roomType: any = {
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
        freeChildrenCount: 0,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_children).toBe(2);
    });
  });

  describe('F. freeChildrenCount -> occ_infants', () => {
    it('should map freeChildrenCount directly to occ_infants', () => {
      const roomType: any = {
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 2,
        maxPhysicalChildren: 2,
        freeChildrenCount: 2,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_infants).toBe(2);
    });
  });

  describe('G. totalBaseOccupancy -> default_occupancy', () => {
    it('should map totalBaseOccupancy directly to default_occupancy', () => {
      const roomType: any = {
        totalBaseOccupancy: 3,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 2,
        freeChildrenCount: 1,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.default_occupancy).toBe(3);
    });
  });

  describe('H. totalBaseOccupancy <= maxPhysicalAdults -> Sync Allowed', () => {
    it('should succeed when totalBaseOccupancy equals maxPhysicalAdults', () => {
      const roomType: any = {
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 3,
        maxPhysicalAdults: 2,
        maxPhysicalChildren: 1,
        freeChildrenCount: 0,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.default_occupancy).toBe(2);
      expect(result.occ_adults).toBe(2);
    });

    it('should succeed when totalBaseOccupancy is less than maxPhysicalAdults', () => {
      const roomType: any = {
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
        freeChildrenCount: 1,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.default_occupancy).toBe(2);
      expect(result.occ_adults).toBe(3);
    });
  });

  describe('I. totalBaseOccupancy > maxPhysicalAdults -> Sync Blocked', () => {
    it('should throw BadRequestException and block sync without clamping when B > P_A', () => {
      const roomType: any = {
        name: 'Family Suite',
        totalBaseOccupancy: 4,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: 2, // B (4) > P_A (2)
        maxPhysicalChildren: 3,
        freeChildrenCount: 0,
      };

      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(BadRequestException);
      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(
        'Channex sync blocked: totalBaseOccupancy (4) exceeds occ_adults (2), but Channex default_occupancy cannot exceed occ_adults. Correct the V2 occupancy configuration before syncing.',
      );
    });
  });

  describe('J. Canonical Value is Never Clamped or Mutated', () => {
    it('should verify that when valid, canonical values are never altered to arbitrary minimums', () => {
      const roomType: any = {
        totalBaseOccupancy: 1,
        totalMaxOccupancy: 1,
        maxPhysicalAdults: 1,
        maxPhysicalChildren: 0,
        freeChildrenCount: 0,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.default_occupancy).toBe(1);
      expect(result.occ_adults).toBe(1);
      expect(result.occ_children).toBe(0);
      expect(result.occ_infants).toBe(0);
    });
  });

  describe('K. Canonical Optional PA/PC Fallback Mapping (Non-Persisted)', () => {
    it('Example A: M=5, PA=null, PC=null -> occ_adults=5, occ_children=4', () => {
      const roomType: any = {
        name: 'Suite A',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: null,
        maxPhysicalChildren: null,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(5);
      expect(result.occ_children).toBe(4);
      expect(result.default_occupancy).toBe(2);
    });

    it('Example B: M=5, PA=4, PC=null -> occ_adults=4, occ_children=4', () => {
      const roomType: any = {
        name: 'Suite B',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: null,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(4);
      expect(result.occ_children).toBe(4);
      expect(result.default_occupancy).toBe(2);
    });

    it('Example C: M=5, PA=null, PC=3 -> occ_adults=5, occ_children=3', () => {
      const roomType: any = {
        name: 'Suite C',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: null,
        maxPhysicalChildren: 3,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(5);
      expect(result.occ_children).toBe(3);
      expect(result.default_occupancy).toBe(2);
    });

    it('Example D: M=5, PA=4, PC=3 -> occ_adults=4, occ_children=3', () => {
      const roomType: any = {
        name: 'Suite D',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 3,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(4);
      expect(result.occ_children).toBe(3);
      expect(result.default_occupancy).toBe(2);
    });

    it('Example E: M=1, PA=null, PC=null -> occ_adults=1, occ_children=0', () => {
      const roomType: any = {
        name: 'Single Pod',
        totalBaseOccupancy: 1,
        totalMaxOccupancy: 1,
        maxPhysicalAdults: null,
        maxPhysicalChildren: null,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(1);
      expect(result.occ_children).toBe(0);
      expect(result.default_occupancy).toBe(1);
    });

    it('should allow PA+PC = 7 > M = 5 when PA=4, PC=3 (PA+PC sum is NOT compared)', () => {
      const roomType: any = {
        name: 'Independent Demographic Limits',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 5,
        maxPhysicalAdults: 4,
        maxPhysicalChildren: 3,
      };

      const result = validateAndMapChannexOccupancy(roomType, true);
      expect(result.occ_adults).toBe(4);
      expect(result.occ_children).toBe(3);
    });

    it('should block sync if totalBaseOccupancy is missing', () => {
      const roomType: any = {
        name: 'Invalid Room',
        totalMaxOccupancy: 4,
      };

      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(
        'Channex sync blocked for room type "Invalid Room": totalBaseOccupancy is missing or less than 1 (undefined).',
      );
    });

    it('should block sync if totalMaxOccupancy is less than totalBaseOccupancy', () => {
      const roomType: any = {
        name: 'Invalid Room',
        totalBaseOccupancy: 3,
        totalMaxOccupancy: 2,
      };

      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(
        'Channex sync blocked for room type "Invalid Room": totalMaxOccupancy (2) cannot be less than totalBaseOccupancy (3).',
      );
    });
  });

  describe('L. Channex Adapter createRemoteRoomType with Property Context', () => {
    it('should build proper payload for V2 property without mutating canonical values', async () => {
      // Mock fetch
      const mockFetch = jest.fn();
      global.fetch = mockFetch;
      process.env.CHANNEX_USER_API_KEY = 'test-key';

      // 1. Room type creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'ext-rt-123' } }),
      });
      // 2. Rate plan creation response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { id: 'ext-rp-456' } }),
      });

      const roomType: any = {
        id: 'rt-v2-1',
        name: 'Luxury Chalet',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
        maxPhysicalInfants: 1,
        freeChildrenCount: 1,
        basePrice: 5000,
        property: {
          occupancyVersion: 'V2',
        },
      };

      const result = await adapter.createRemoteRoomType('ext-prop-1', roomType);

      expect(result.externalRoomTypeId).toBe('ext-rt-123');
      expect(result.externalRatePlanId).toBe('ext-rp-456');

      // Verify room type payload
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/room_types'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            room_type: {
              property_id: 'ext-prop-1',
              title: 'Luxury Chalet',
              count_of_rooms: 5,
              occ_adults: 3,
              occ_children: 2,
              occ_infants: 1,
              default_occupancy: 2,
            },
          }),
        }),
      );

      // Verify rate plan payload
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/rate_plans'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            rate_plan: {
              title: 'Luxury Chalet Standard Rate',
              property_id: 'ext-prop-1',
              room_type_id: 'ext-rt-123',
              currency: 'INR',
              options: [
                {
                  occupancy: 2,
                  is_primary: true,
                  rate: 5000,
                },
              ],
            },
          }),
        }),
      );
    });
  });

  describe('Phase 8: Channex Multi-Room & Rich Booking Ingestion', () => {
    it('should correctly parse multi-room Booking.com reservation with aggregated occupancy, commission, and hotel-collect payment', async () => {
      const incomingChannexPayload = {
        event: 'booking',
        data: {
          id: '79951e86-3210-40f6-8109-1965dfd9eb8f',
          booking_revision_id: 'b0e25109-0c9d-4974-b156-e685bad20d19',
          ota_reservation_code: '6253905014',
          channel_name: 'Booking.com',
          property_id: 'channex-prop-001',
          arrival_date: '2026-09-15',
          departure_date: '2026-09-16',
          total_amount: 8925.0,
          currency: 'INR',
          ota_commission: 1275.0,
          guarantee: 'No credit card is supplied with this booking',
          notes: 'Reservation has a cancellation grace period. Do not charge if cancelled before 2026-09-12 07:50:33 LargeBed, NonSmoke Meal Plan for Room 1718323601 (469): Breakfast is included in the room rate. Meal Plan for Room 1718323601 (467): Breakfast is included in the room rate. Smoking Preference for Room 1718323601 (469): Non-Smoking Smoking Preference for Room 1718323601 (467): Non-Smoking OTA Commission: 1275.00',
          customer: {
            name: 'Hh',
            surname: 'Vbb',
            mail: 'hvbb.724055@guest.booking.com',
            phone: '+91 20 3564 0799',
            address: '30 08 Prudential Tower, 19 Cecil St',
            city: 'bangkok',
            zip: '049712',
            country: 'India',
            language: 'en-gb',
          },
          rooms: [
            {
              id: 'room-unit-1',
              room_type_id: 'rt-vista-villa-101',
              rate_plan_id: 'rp-standard-breakfast',
              amount: 4462.5,
              occupancy: { adults: 3, children: 0, infants: 0 },
              meal_plan: 'Breakfast included',
              smoking_preference: 'Non-Smoking',
              bed_preference: 'LargeBed',
            },
            {
              id: 'room-unit-2',
              room_type_id: 'rt-vista-villa-101',
              rate_plan_id: 'rp-standard-breakfast',
              amount: 4462.5,
              occupancy: { adults: 3, children: 0, infants: 0 },
              meal_plan: 'Breakfast included',
              smoking_preference: 'Non-Smoking',
              bed_preference: 'LargeBed',
            },
          ],
        },
      };

      const parsed = await adapter.parseIncomingReservation(incomingChannexPayload);

      // Verify core identifiers and channel
      expect(parsed.externalBookingId).toBe('79951e86-3210-40f6-8109-1965dfd9eb8f');
      expect(parsed.externalRevisionId).toBe('b0e25109-0c9d-4974-b156-e685bad20d19');
      expect(parsed.channelName).toBe('Booking.com');
      expect(parsed.status).toBe('CONFIRMED');

      // Verify multi-room array
      expect(parsed.rooms).toHaveLength(2);
      expect(parsed.rooms?.[0].externalRoomTypeId).toBe('rt-vista-villa-101');
      expect(parsed.rooms?.[1].externalRoomTypeId).toBe('rt-vista-villa-101');
      expect(parsed.rooms?.[0].amount).toBe(4462.5);

      // Verify aggregated occupancy (3 + 3 = 6 adults)
      expect(parsed.adultsCount).toBe(6);
      expect(parsed.childrenCount).toBe(0);
      expect(parsed.infantsCount).toBe(0);

      // Verify total amount and commission
      expect(parsed.totalAmount).toBe(8925.0);
      expect(parsed.commissionAmount).toBe(1275.0);

      // Verify payment collect determination (hotel collect / unpaid)
      expect(parsed.paymentType).toBe('HOTEL_COLLECT');

      // Verify rich guest details
      expect(parsed.guest.firstName).toBe('Hh');
      expect(parsed.guest.lastName).toBe('Vbb');
      expect(parsed.guest.email).toBe('hvbb.724055@guest.booking.com');
      expect(parsed.guest.phone).toBe('+91 20 3564 0799');
      expect(parsed.guest.address).toBe('30 08 Prudential Tower, 19 Cecil St');
      expect(parsed.guest.city).toBe('bangkok');
      expect(parsed.guest.postalCode).toBe('049712');
      expect(parsed.guest.country).toBe('India');
      expect(parsed.guest.language).toBe('en-gb');

      // Verify special requests include notes, guarantee, and guest address
      expect(parsed.specialRequests).toContain('Breakfast is included in the room rate');
      expect(parsed.specialRequests).toContain('Non-Smoking');
      expect(parsed.specialRequests).toContain('30 08 Prudential Tower, 19 Cecil St');
      expect(parsed.specialRequests).toContain('bangkok');
    });
  });
});
