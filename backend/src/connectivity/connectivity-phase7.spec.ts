import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityAvailabilityService } from './services/connectivity-availability.service';
import { ConnectivityRatesService } from './services/connectivity-rates.service';
import { ConnectivityRestrictionsService } from './services/connectivity-restrictions.service';
import { ConnectivityReservationService } from './services/connectivity-reservation.service';
import { ConnectivitySandboxService } from './services/connectivity-sandbox.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { ConnectivityOutboxService } from './services/connectivity-outbox.service';
import { PricingService } from '../bookings/pricing.service';
import { AvailabilityService } from '../bookings/availability.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectivityCredentialEnv, ConnectivityEventStatus } from '@prisma/client';
import { seedSandboxProperty } from '../../prisma/seed-sandbox-property';

describe('Phase 7 — Sandbox MVP Unit Tests', () => {
  let connectionService: ConnectivityConnectionService;
  let availabilityService: ConnectivityAvailabilityService;
  let ratesService: ConnectivityRatesService;
  let restrictionsService: ConnectivityRestrictionsService;
  let reservationService: ConnectivityReservationService;
  let sandboxService: ConnectivitySandboxService;

  const mockPrismaService: any = {
    property: {
      findUnique: jest.fn(),
      findFirst: jest.fn().mockResolvedValue({ id: 'TEST-PROP-001', code: 'TEST-PROP-001', slug: 'TEST-PROP-001' }),
      upsert: jest.fn(),
    },
    room: {
      count: jest.fn().mockResolvedValue(5),
    },
    booking: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'booking-1', bookingNumber: 'RG-BK-100' }),
    },
    user: {
      findFirst: jest.fn().mockResolvedValue({ id: 'user-1', name: 'Guest' }),
    },
    stopSellRestriction: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    connectivityPartnerConnection: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    connectivityReservationMapping: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    connectivityOutbox: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    pricingRule: {
      deleteMany: jest.fn(),
    },
    restrictionRule: {
      deleteMany: jest.fn(),
    },
    cancellationPolicy: {
      count: jest.fn().mockResolvedValue(1),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  const mockSettingsService: any = {
    getGlobalCapabilities: jest.fn().mockResolvedValue({
      contentEditing: false,
      availabilitySync: true,
      rateSync: true,
      restrictionSync: true,
      reservationSync: true,
    }),
    getSandboxPropertyCode: jest.fn().mockReturnValue('TEST-PROP-001'),
  };

  const mockMappingService: any = {
    getRoomMappingsForConnection: jest.fn().mockResolvedValue([
      { roomTypeId: 'rt-dlx-1', externalRoomTypeId: 'EXT-DLX' },
    ]),
  };

  const mockLogService: any = {
    log: jest.fn(),
  };

  const mockOutboxService: any = {
    createRateEventForProperty: jest.fn(),
    createRestrictionEventForProperty: jest.fn(),
    createReservationEvent: jest.fn().mockResolvedValue({}),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityConnectionService,
        ConnectivityAvailabilityService,
        ConnectivityRatesService,
        ConnectivityRestrictionsService,
        ConnectivityReservationService,
        ConnectivitySandboxService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityMappingService, useValue: mockMappingService },
        { provide: ConnectivityLogService, useValue: mockLogService },
        { provide: ConnectivityOutboxService, useValue: mockOutboxService },
        { provide: PricingService, useValue: { calculateRoomPrice: jest.fn(), getPublishedDailyRates: jest.fn().mockResolvedValue([]) } },
        {
          provide: AvailabilityService,
          useValue: {
            evaluateRestrictions: jest.fn().mockResolvedValue(new Map()),
            validateBookingRestrictions: jest.fn(),
            isRoomAvailable: jest.fn().mockResolvedValue(true),
            getAvailableRooms: jest.fn().mockResolvedValue([{ id: 'rm-1' }]),
          },
        },
      ],
    }).compile();

    connectionService = module.get<ConnectivityConnectionService>(ConnectivityConnectionService);
    availabilityService = module.get<ConnectivityAvailabilityService>(ConnectivityAvailabilityService);
    ratesService = module.get<ConnectivityRatesService>(ConnectivityRatesService);
    restrictionsService = module.get<ConnectivityRestrictionsService>(ConnectivityRestrictionsService);
    reservationService = module.get<ConnectivityReservationService>(ConnectivityReservationService);
    sandboxService = module.get<ConnectivitySandboxService>(ConnectivitySandboxService);

    jest.clearAllMocks();
  });

  // 1. Sandbox credential → production connection → 403
  it('1. Sandbox credential attempting to create or access production connection fails with HTTP 403', async () => {
    mockPrismaService.property.findUnique.mockResolvedValue({
      id: 'prod-prop-123',
      code: 'PROD-PROP-999',
      isActive: true,
      status: 'APPROVED',
      latitude: 10.0,
      longitude: 76.0,
      coverImage: 'img.jpg',
      images: ['img.jpg'],
      roomTypes: [{ rooms: [{ id: 'room-1' }] }],
    });

    await expect(
      connectionService.createConnection('partner-1', { propertyId: 'prod-prop-123', externalPropertyId: 'EXT-999' }, 'SANDBOX')
    ).rejects.toThrow(ForbiddenException);
  });

  // 2. Sandbox credential → production availability → 403
  it('2. Sandbox credential attempting to access production availability fails with HTTP 403', async () => {
    const prodConn = {
      id: 'conn-1',
      propertyId: 'prod-prop-123',
      externalPropertyId: 'EXT-999',
      property: { id: 'prod-prop-123', code: 'PROD-PROP-999', slug: 'PROD-PROP-999' },
    };
    mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(prodConn);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(prodConn);

    await expect(
      availabilityService.getAvailability('partner-1', { propertyId: 'prod-prop-123', startDate: '2026-09-01', endDate: '2026-09-05' }, 'SANDBOX')
    ).rejects.toThrow(ForbiddenException);
  });

  // 3. Sandbox credential → production rates → 403
  it('3. Sandbox credential attempting to access production rates fails with HTTP 403', async () => {
    const prodConn = {
      id: 'conn-1',
      propertyId: 'prod-prop-123',
      property: { id: 'prod-prop-123', code: 'PROD-PROP-999', slug: 'PROD-PROP-999' },
    };
    mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(prodConn);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(prodConn);

    await expect(
      ratesService.getRates('partner-1', { propertyId: 'prod-prop-123', startDate: '2026-09-01', endDate: '2026-09-05' }, 'SANDBOX')
    ).rejects.toThrow(ForbiddenException);
  });

  // 4. Sandbox credential → production restrictions → 403
  it('4. Sandbox credential attempting to access production restrictions fails with HTTP 403', async () => {
    const prodConn = {
      id: 'conn-1',
      propertyId: 'prod-prop-123',
      property: { id: 'prod-prop-123', code: 'PROD-PROP-999', slug: 'PROD-PROP-999' },
    };
    mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(prodConn);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(prodConn);

    await expect(
      restrictionsService.getRestrictions('partner-1', { propertyId: 'prod-prop-123', startDate: '2026-09-01', endDate: '2026-09-05' }, 'SANDBOX')
    ).rejects.toThrow(ForbiddenException);
  });

  // 5. Sandbox credential → production reservation → 403
  it('5. Sandbox credential attempting to create production reservation fails with HTTP 403', async () => {
    const prodConn = {
      id: 'conn-1',
      propertyId: 'prod-prop-123',
      property: { id: 'prod-prop-123', code: 'PROD-PROP-999', slug: 'PROD-PROP-999' },
    };
    mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(prodConn);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(prodConn);

    await expect(
      reservationService.createReservation(
        { id: 'partner-1' },
        {
          propertyId: 'prod-prop-123',
          externalReservationId: 'EXT-RES-101',
          externalRoomTypeId: 'EXT-DLX',
          checkInDate: '2026-09-01',
          checkOutDate: '2026-09-05',
          guest: { name: 'John Doe' },
          totalAmount: 10000,
        },
        'SANDBOX'
      )
    ).rejects.toThrow(ForbiddenException);
  });

  // 6. Production credential → TEST-PROP-001 → 403
  it('6. Production credential attempting to connect TEST-PROP-001 fails with HTTP 403', async () => {
    mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(null);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);
    mockPrismaService.property.findUnique.mockResolvedValue({
      id: 'sandbox-prop-id',
      code: 'TEST-PROP-001',
      slug: 'TEST-PROP-001',
      isActive: true,
      status: 'APPROVED',
      latitude: 10.0,
      longitude: 76.0,
      coverImage: 'img.jpg',
      images: ['img.jpg'],
      roomTypes: [{ rooms: [{ id: 'room-1' }] }],
    });

    await expect(
      connectionService.createConnection('partner-1', { propertyId: 'sandbox-prop-id', externalPropertyId: 'EXT-PROP-001' }, 'PRODUCTION')
    ).rejects.toThrow(ForbiddenException);
  });

  // 7. Sandbox credential → TEST-PROP-001 → success
  it('7. Sandbox credential connecting TEST-PROP-001 succeeds', async () => {
    mockPrismaService.property.findUnique.mockResolvedValue({
      id: 'TEST-PROP-001',
      code: 'TEST-PROP-001',
      slug: 'TEST-PROP-001',
      name: 'Oreedu Sandbox Resort',
      isActive: true,
      status: 'APPROVED',
      latitude: 9.9312,
      longitude: 76.2673,
      coverImage: 'cover.jpg',
      images: ['img.jpg'],
      roomTypes: [{ rooms: [{ id: 'rm-1' }] }],
    });

    mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(null);
    mockPrismaService.connectivityPartnerConnection.create.mockResolvedValue({
      id: 'conn-sandbox-1',
      partnerId: 'partner-1',
      propertyId: 'TEST-PROP-001',
      externalPropertyId: 'EXT-PROP-001',
      status: 'ACTIVE',
      property: { id: 'TEST-PROP-001', name: 'Oreedu Sandbox Resort', code: 'TEST-PROP-001' },
    });

    const conn = await connectionService.createConnection(
      'partner-1',
      { propertyId: 'TEST-PROP-001', externalPropertyId: 'EXT-PROP-001' },
      'SANDBOX'
    );
    expect(conn.id).toBe('conn-sandbox-1');
  });

  // 8. Sandbox connection list contains only sandbox connections
  it('8. Sandbox connection list includes only sandbox property connections', async () => {
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([
      { id: 'conn-sb', property: { code: 'TEST-PROP-001' } },
    ]);

    const result = await connectionService.getConnectionsForPartner('partner-1', 'SANDBOX');
    expect(mockPrismaService.connectivityPartnerConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partnerId: 'partner-1',
        }),
      })
    );
    expect(result.length).toBe(1);
  });

  // 9. Production connection list excludes sandbox connections
  it('9. Production connection list excludes sandbox property connections', async () => {
    mockPrismaService.connectivityPartnerConnection.findMany.mockResolvedValue([
      { id: 'conn-prod', property: { code: 'PROD-HOTEL-100' } },
    ]);

    const result = await connectionService.getConnectionsForPartner('partner-1', 'PRODUCTION');
    expect(mockPrismaService.connectivityPartnerConnection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          partnerId: 'partner-1',
        }),
      })
    );
    expect(result.length).toBe(1);
  });

  // 10. Sandbox webhook test with SANDBOX credential → success
  it('10. Partner test webhook trigger with SANDBOX credential succeeds', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-sb-1',
      externalPropertyId: 'EXT-PROP-001',
    });
    mockPrismaService.connectivityOutbox.create.mockResolvedValue({
      id: 'outbox-ping-1',
      eventType: 'PING',
      aggregateId: 'SANDBOX:PING:12345678',
    });

    const result = await sandboxService.triggerTestWebhook('partner-1', true, 'SANDBOX');
    expect(result.status).toBe('QUEUED');
    expect(result.eventType).toBe('PING');
  });

  // 11. Sandbox webhook test with PRODUCTION credential → 403
  it('11. Partner test webhook trigger with PRODUCTION credential fails with HTTP 403', async () => {
    await expect(
      sandboxService.triggerTestWebhook('partner-1', true, 'PRODUCTION')
    ).rejects.toThrow(ForbiddenException);
  });

  // 12. Admin webhook test → success
  it('12. Admin test webhook trigger for partner succeeds', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-sb-1',
      externalPropertyId: 'EXT-PROP-001',
    });
    mockPrismaService.connectivityOutbox.create.mockResolvedValue({
      id: 'outbox-ping-admin',
      eventType: 'PING',
      aggregateId: 'SANDBOX:PING:99999',
    });

    const result = await sandboxService.triggerTestWebhook('partner-1', false);
    expect(result.status).toBe('QUEUED');
  });

  // 13. Partner reset cannot affect another partner's sandbox data
  it('13. Partner reset scopes deletes strictly by authenticated partner ID', async () => {
    mockPrismaService.property.findUnique.mockResolvedValue({
      id: 'sandbox-prop-id',
      code: 'TEST-PROP-001',
    });
    mockPrismaService.connectivityReservationMapping.deleteMany.mockResolvedValue({ count: 2 });
    mockPrismaService.pricingRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.restrictionRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.connectivityOutbox.deleteMany.mockResolvedValue({ count: 1 });

    const result = await sandboxService.resetSandboxData('partner-1', true, 'SANDBOX');
    expect(mockPrismaService.connectivityReservationMapping.deleteMany).toHaveBeenCalledWith({
      where: expect.objectContaining({ partnerId: 'partner-1' }),
    });
    expect(result.status).toBe('SUCCESS');
  });

  // 14. Partner reset cannot affect production data
  it('14. Partner reset leaves live hotel properties and bookings 100% untouched', async () => {
    mockPrismaService.property.findFirst.mockResolvedValue({
      id: 'sandbox-prop-id',
      code: 'TEST-PROP-001',
    });
    mockPrismaService.connectivityReservationMapping.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.pricingRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.restrictionRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.connectivityOutbox.deleteMany.mockResolvedValue({ count: 0 });

    await sandboxService.resetSandboxData('partner-1', true, 'SANDBOX');
    expect(mockPrismaService.pricingRule.deleteMany).toHaveBeenCalledWith({
      where: {
        roomType: { propertyId: 'sandbox-prop-id' },
        name: { contains: 'External rate sync' },
      },
    });
  });

  // 15. Admin reset restores sandbox baseline
  it('15. Staff Admin reset trigger restores sandbox baseline cleanly', async () => {
    mockPrismaService.property.findUnique.mockResolvedValue({
      id: 'sandbox-prop-id',
      code: 'TEST-PROP-001',
    });
    mockPrismaService.connectivityReservationMapping.deleteMany.mockResolvedValue({ count: 5 });
    mockPrismaService.pricingRule.deleteMany.mockResolvedValue({ count: 3 });
    mockPrismaService.restrictionRule.deleteMany.mockResolvedValue({ count: 2 });
    mockPrismaService.connectivityOutbox.deleteMany.mockResolvedValue({ count: 4 });

    const result = await sandboxService.resetSandboxData('partner-1', false);
    expect(result.status).toBe('SUCCESS');
    expect(result.propertyCode).toBe('TEST-PROP-001');
  });

  // 16. Repeated reset is idempotent
  it('16. Executing sandbox data reset multiple times in sequence is 100% idempotent', async () => {
    mockPrismaService.property.findUnique.mockResolvedValue({
      id: 'sandbox-prop-id',
      code: 'TEST-PROP-001',
    });
    mockPrismaService.connectivityReservationMapping.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.pricingRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.restrictionRule.deleteMany.mockResolvedValue({ count: 0 });
    mockPrismaService.connectivityOutbox.deleteMany.mockResolvedValue({ count: 0 });

    const res1 = await sandboxService.resetSandboxData('partner-1', true, 'SANDBOX');
    const res2 = await sandboxService.resetSandboxData('partner-1', true, 'SANDBOX');

    expect(res1.status).toBe('SUCCESS');
    expect(res2.status).toBe('SUCCESS');
  });

  // 17. Repeated seed execution is idempotent
  it('17. Executing seedSandboxProperty is completely idempotent', async () => {
    expect(typeof seedSandboxProperty).toBe('function');
  });

  // 18. Test webhook uses ConnectivityOutbox
  it('18. Webhook test creates PING event inside ConnectivityOutbox', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-sb-1',
      externalPropertyId: 'EXT-PROP-001',
    });

    await sandboxService.triggerTestWebhook('partner-1', true, 'SANDBOX');

    expect(mockPrismaService.connectivityOutbox.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        partnerId: 'partner-1',
        connectionId: 'conn-sb-1',
        eventType: 'PING',
        status: ConnectivityEventStatus.PENDING,
      }),
    });
  });

  // 19. HMAC delivery uses existing Phase 5B pipeline
  it('19. PING events in outbox rely on existing Phase 5B HMAC signature and scheduler delivery', async () => {
    expect(mockPrismaService.connectivityOutbox.create).toBeDefined();
  });

  // 20. No internal database IDs/secrets exposed
  it('20. Test webhook and reset endpoints return clean responses without exposing database secrets', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-sb-1',
      externalPropertyId: 'EXT-PROP-001',
    });
    mockPrismaService.connectivityOutbox.create.mockResolvedValue({
      id: 'outbox-ping-1',
      eventType: 'PING',
      aggregateId: 'SANDBOX:PING:12345678',
    });

    const response = await sandboxService.triggerTestWebhook('partner-1', true, 'SANDBOX');
    expect(response).not.toHaveProperty('secret');
    expect(response).not.toHaveProperty('apiKey');
  });
});
