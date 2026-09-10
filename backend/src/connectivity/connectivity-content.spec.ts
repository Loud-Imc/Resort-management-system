import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { PartnerApiKeyGuard } from './auth/partner-api-key.guard';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivityLogService } from './services/connectivity-log.service';

describe('Property Content Connectivity API (GET /connectivity/v1/content) Unit Tests', () => {
  let connectionService: ConnectivityConnectionService;
  let prismaService: any;
  let apiKeyGuard: PartnerApiKeyGuard;

  const mockPrismaService = {
    connectivityPartnerConnection: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    connectivityRoomTypeMapping: {
      findMany: jest.fn(),
    },
  };

  const mockPartnerService = {
    validateApiKey: jest.fn(),
  };

  const mockLogService = {
    createLog: jest.fn().mockResolvedValue({ id: 'log-1' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityConnectionService,
        PartnerApiKeyGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivityPartnerService, useValue: mockPartnerService },
        { provide: ConnectivityLogService, useValue: mockLogService },
      ],
    }).compile();

    connectionService = module.get<ConnectivityConnectionService>(ConnectivityConnectionService);
    prismaService = module.get<PrismaService>(PrismaService);
    apiKeyGuard = module.get<PartnerApiKeyGuard>(PartnerApiKeyGuard);
  });

  const mockActiveConnection = {
    id: 'conn-uuid-101',
    partnerId: 'partner-uuid-1',
    propertyId: 'prop-uuid-999',
    externalPropertyId: 'EXT-PROP-101',
    status: 'ACTIVE',
  };

  const mockDbProperty = {
    name: 'Grand Mountain Resort & Spa',
    slug: 'grand-mountain-resort',
    type: 'RESORT',
    description: 'Luxury mountain resort with spa.',
    address: '123 Alpine Ridge Road',
    city: 'Manali',
    state: 'Himachal Pradesh',
    country: 'India',
    pincode: '175131',
    latitude: 32.2432,
    longitude: 77.1892,
    email: 'reservations@grandmountain.com',
    phone: '+919876543210',
    images: ['https://cdn.example.com/prop-1.jpg'],
    coverImage: 'https://cdn.example.com/cover-1.jpg',
    amenities: ['Pool', 'WiFi', 'Spa'],
    policies: { cancellation: 'Flexible 48h' },
    defaultCheckInTime: '14:00',
    defaultCheckOutTime: '11:00',
    ownerId: 'private-user-id-999',
    platformCommission: 15.0,
    gstNumber: '22AAAAA0000A1Z5',
    roomTypes: [
      {
        id: 'rt-deluxe-uuid',
        name: 'Deluxe Room',
        description: 'Spacious deluxe room.',
        size: 350,
        amenities: ['King Bed', 'Balcony'],
        images: ['https://cdn.example.com/dlx-1.jpg'],
        basePrice: 5000.0,
        maxAdults: 2,
        maxChildren: 2,
        baseAdults: 2,
        baseChildren: 0,
        highlights: ['Mountain View'],
        inclusions: ['Breakfast'],
        cancellationPolicyText: 'Free cancellation up to 48 hours.',
        cancellationPolicy: {
          name: 'Flexible 48h',
          description: 'Standard policy',
        },
      },
    ],
  };

  const mockRoomMappings = [
    {
      id: 'mapping-1',
      connectionId: 'conn-uuid-101',
      roomTypeId: 'rt-deluxe-uuid',
      externalRoomTypeId: 'EXT-ROOM-DLX',
    },
  ];

  // ─── AUTHENTICATION TESTS ──────────────────────────────────────────────────

  it('1. Unauthenticated request rejected by PartnerApiKeyGuard', async () => {
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as any;

    await expect(apiKeyGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  it('2. Invalid API key rejected by PartnerApiKeyGuard', async () => {
    mockPartnerService.validateApiKey.mockResolvedValue(null);
    const mockContext = {
      switchToHttp: () => ({
        getRequest: () => ({ headers: { 'x-api-key': 'invalid_key' } }),
      }),
    } as any;

    await expect(apiKeyGuard.canActivate(mockContext)).rejects.toThrow(UnauthorizedException);
  });

  // ─── PARTNER ISOLATION & VALIDATION TESTS ──────────────────────────────────

  it('3. Throws BadRequestException if neither externalPropertyId nor propertyId is provided', async () => {
    await expect(connectionService.getContentForPartner('partner-uuid-1', {})).rejects.toThrow(
      BadRequestException,
    );
  });

  it('4. Partner A can retrieve its mapped property content', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result).toBeDefined();
    expect(result.externalPropertyId).toBe('EXT-PROP-101');
    expect(result.property.name).toBe('Grand Mountain Resort & Spa');
  });

  it('5. Partner A cannot retrieve Partner B\'s property mapping (404 Not Found)', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);

    await expect(
      connectionService.getContentForPartner('partner-uuid-A', {
        externalPropertyId: 'EXT-PROP-PARTNER-B',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('6. Inactive connection cannot retrieve content (404 Not Found)', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);

    await expect(
      connectionService.getContentForPartner('partner-uuid-1', {
        externalPropertyId: 'EXT-PROP-INACTIVE',
      }),
    ).rejects.toThrow(NotFoundException);
  });

  // ─── PROPERTY CONTENT & EXCLUSION TESTS ───────────────────────────────────

  it('7. Property public fields are returned correctly', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.property.name).toBe('Grand Mountain Resort & Spa');
    expect(result.property.slug).toBe('grand-mountain-resort');
    expect(result.property.type).toBe('RESORT');
    expect(result.property.location.city).toBe('Manali');
    expect(result.property.contact.email).toBe('reservations@grandmountain.com');
    expect(result.property.checkInTime).toBe('14:00');
    expect(result.property.checkOutTime).toBe('11:00');
    expect(result.property.coverImage).toBe('https://cdn.example.com/cover-1.jpg');
    expect(result.property.amenities).toEqual(['Pool', 'WiFi', 'Spa']);
  });

  it('8. Internal owner, commission, legal, and GST fields are NOT returned', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    const propObj = result.property as any;
    expect(propObj.ownerId).toBeUndefined();
    expect(propObj.platformCommission).toBeUndefined();
    expect(propObj.gstNumber).toBeUndefined();
    expect(propObj.licenceImage).toBeUndefined();
    expect(propObj.documents).toBeUndefined();
  });

  // ─── ROOM TYPE & PHYSICAL ROOM ISOLATION TESTS ─────────────────────────────

  it('9. Mapped RoomTypes are returned with externalRoomTypeId', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.roomTypes.length).toBe(1);
    expect(result.roomTypes[0].externalRoomTypeId).toBe('EXT-ROOM-DLX');
    expect(result.roomTypes[0].name).toBe('Deluxe Room');
  });

  it('10. Oreedu RoomType ID is returned as id for mapping configuration', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    const rtObj = result.roomTypes[0] as any;
    expect(rtObj.id).toBe('rt-deluxe-uuid');
    expect(rtObj.roomTypeId).toBeUndefined();
    expect(rtObj.platformRoomTypeId).toBeUndefined();
  });

  it('11. Physical rooms (Room 101, physical room IDs) are NOT returned', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    const rtObj = result.roomTypes[0] as any;
    expect(rtObj.rooms).toBeUndefined();
    expect(rtObj.physicalRooms).toBeUndefined();
    expect(rtObj.roomNumbers).toBeUndefined();
  });

  // ─── PRICING BOUNDARY TESTS ───────────────────────────────────────────────

  it('12. basePrice is NOT returned as an OTA selling price', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    const rtObj = result.roomTypes[0] as any;
    expect(rtObj.basePrice).toBeUndefined();
    expect(rtObj.price).toBeUndefined();
    expect(rtObj.pricing).toBeUndefined();
  });

  it('13. Content response does not duplicate the Rates API structure', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect((result as any).rates).toBeUndefined();
    expect((result as any).dailyRates).toBeUndefined();
  });

  // ─── POLICIES, IMAGES & AMENITIES TESTS ───────────────────────────────────

  it('14. Public policies returned correctly', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.property.policies).toEqual({ cancellation: 'Flexible 48h' });
    expect(result.roomTypes[0].cancellationPolicy).toEqual({
      name: 'Flexible 48h',
      text: 'Free cancellation up to 48 hours.',
    });
  });

  it('15. Image URLs returned correctly', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.property.images).toEqual(['https://cdn.example.com/prop-1.jpg']);
    expect(result.roomTypes[0].images).toEqual(['https://cdn.example.com/dlx-1.jpg']);
  });

  it('16. Amenities returned correctly', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.property.amenities).toEqual(['Pool', 'WiFi', 'Spa']);
    expect(result.roomTypes[0].amenities).toEqual(['King Bed', 'Balcony']);
  });

  // ─── RESPONSE CONTRACT & IDENTIFIER TESTS ─────────────────────────────────

  it('17. apiVersion is v1', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.apiVersion).toBe('v1');
  });

  it('18. externalPropertyId is returned in root contract', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    expect(result.externalPropertyId).toBe('EXT-PROP-101');
  });

  it('19. Response contains no internal database identifiers', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    const result = await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    const strResponse = JSON.stringify(result);
    expect(strResponse).not.toContain('prop-uuid-999');
    expect(strResponse).toContain('rt-deluxe-uuid');
    expect(strResponse).not.toContain('propertyId');
    expect(strResponse).not.toContain('roomTypeId');
    expect(strResponse).not.toContain('platformPropertyId');
    expect(strResponse).not.toContain('platformRoomTypeId');
  });

  it('20. Query strategy omits physical room relation from property findUnique query', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(mockActiveConnection);
    mockPrismaService.property.findUnique.mockResolvedValue(mockDbProperty);
    mockPrismaService.connectivityRoomTypeMapping.findMany.mockResolvedValue(mockRoomMappings);

    await connectionService.getContentForPartner('partner-uuid-1', {
      externalPropertyId: 'EXT-PROP-101',
    });

    const callArgs = mockPrismaService.property.findUnique.mock.calls[0][0];
    expect(callArgs.select.rooms).toBeUndefined();
    expect(callArgs.select.roomTypes.select.rooms).toBeUndefined();
  });
});
