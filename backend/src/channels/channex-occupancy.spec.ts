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
        'Channex sync blocked: totalBaseOccupancy (4) exceeds maxPhysicalAdults (2), but Channex default_occupancy cannot exceed occ_adults. Correct the V2 occupancy configuration before syncing.',
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

  describe('K. Missing/Incomplete V2 Occupancy -> Sync Blocked', () => {
    it('should block sync if maxPhysicalAdults is missing', () => {
      const roomType: any = {
        name: 'Invalid Room',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 4,
        maxPhysicalChildren: 2,
      };

      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(
        'Channex sync blocked for room type "Invalid Room": maxPhysicalAdults is missing or less than 1 (undefined).',
      );
    });

    it('should block sync if totalBaseOccupancy is missing', () => {
      const roomType: any = {
        name: 'Invalid Room',
        maxPhysicalAdults: 2,
        maxPhysicalChildren: 2,
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
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 1,
      };

      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(
        'Channex sync blocked for room type "Invalid Room": totalMaxOccupancy (2) cannot be less than totalBaseOccupancy (3).',
      );
    });

    it('should block sync if totalMaxOccupancy exceeds sum of physical limits', () => {
      const roomType: any = {
        name: 'Overcrowded Room',
        totalBaseOccupancy: 2,
        totalMaxOccupancy: 8,
        maxPhysicalAdults: 3,
        maxPhysicalChildren: 2,
      };

      expect(() => validateAndMapChannexOccupancy(roomType, true)).toThrow(
        'Channex sync blocked for room type "Overcrowded Room": totalMaxOccupancy (8) exceeds sum of physical limits (adults: 3 + children: 2 = 5).',
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
});
