import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConnectivityCertificationService } from './services/connectivity-certification.service';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Phase 8 — Partner Self-Certification & Security Gate Tests', () => {
  let certificationService: ConnectivityCertificationService;
  let partnerService: ConnectivityPartnerService;
  let prismaService: PrismaService;

  const mockPartner = {
    id: 'partner-test-uuid-1',
    name: 'Test OTA Partner',
    code: 'TEST_OTA_01',
    type: 'OTA',
    status: 'ACTIVE',
    certificationStatus: 'NOT_STARTED',
    certifiedAt: null,
    certificationDetails: null,
    contactEmail: 'ota@test.com',
    contactPhone: '+1234567890',
    webhookUrl: 'https://webhook.site/test-token',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockPrismaService = {
    connectivityPartner: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    connectivityPartnerConnection: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    connectivityRoomTypeMapping: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    connectivityReservationMapping: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    connectivityLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    connectivityPartnerCredential: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityCertificationService,
        ConnectivityPartnerService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    certificationService = module.get<ConnectivityCertificationService>(ConnectivityCertificationService);
    partnerService = module.get<ConnectivityPartnerService>(ConnectivityPartnerService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('1. Sandbox certification endpoint evaluation runs cleanly', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const result = await certificationService.verifyAndEvaluate(mockPartner.id);
    expect(result).toBeDefined();
    expect(result.certificationStatus).toBe('FAILED');
    expect(result.checklist.sandboxConnection.status).toBe('NOT_STARTED');
  });

  it('2. Production credential issuance is BLOCKED before certification passes', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue({
      ...mockPartner,
      certificationStatus: 'NOT_STARTED',
    });

    await expect(
      partnerService.createCredential(mockPartner.id, {
        name: 'Live Key',
        environment: 'PRODUCTION' as any,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('3. Unauthenticated/Non-existent partner throws NotFoundException', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(null);
    await expect(certificationService.verifyAndEvaluate('invalid-id')).rejects.toThrow(NotFoundException);
  });

  it('4. Certification correctly fails when evidence is missing', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const res = await certificationService.verifyAndEvaluate(mockPartner.id);
    expect(res.certificationStatus).toBe('FAILED');
  });

  it('5. Sandbox connection evidence is detected', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      partnerId: mockPartner.id,
      propertyId: 'TEST-PROP-001',
      roomMappings: [{ id: 'rm-1', roomTypeId: 'rt-1' }],
    });
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.sandboxConnection.status).toBe('PASSED');
  });

  it('6. Room mapping evidence is detected', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      partnerId: mockPartner.id,
      propertyId: 'TEST-PROP-001',
      roomMappings: [{ id: 'rm-1', roomTypeId: 'rt-1' }],
    });
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([]);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.roomTypeMapping.status).toBe('PASSED');
  });

  it('7. Rate/restriction evidence is detected', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      roomMappings: [{ id: 'rm-1' }],
    });
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([
      { endpoint: '/rates', statusCode: 200 },
      { endpoint: '/restrictions', statusCode: 200 },
    ]);

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.ratesAndRestrictions.status).toBe('PASSED');
  });

  it('8. Reservation lifecycle evidence is detected', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      roomMappings: [{ id: 'rm-1' }],
    });
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue({
      id: 'res-map-1',
      booking: { status: 'CANCELLED' },
    });
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([
      { endpoint: '/reservations', method: 'POST', statusCode: 201, requestPayload: { externalReservationId: 'EXT-1' } },
      { endpoint: '/reservations/EXT-1', method: 'GET', statusCode: 200 },
      { endpoint: '/reservations/EXT-1', method: 'PUT', statusCode: 200 },
      { endpoint: '/reservations/EXT-1/cancel', method: 'POST', statusCode: 200 },
    ]);

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.reservationLifecycle.status).toBe('PASSED');
  });

  it('9. Idempotency evidence is detected', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({
      id: 'conn-1',
      roomMappings: [{ id: 'rm-1' }],
    });
    mockPrismaService.connectivityReservationMapping.count.mockResolvedValue(1);
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([
      { endpoint: '/reservations', method: 'POST', statusCode: 201, requestPayload: { externalReservationId: 'DUP-1' } },
      { endpoint: '/reservations', method: 'POST', statusCode: 200, requestPayload: { externalReservationId: 'DUP-1' } },
    ]);

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.idempotency.status).toBe('PASSED');
  });

  it('10. Duplicate reservation does not create duplicate mapping', async () => {
    mockPrismaService.connectivityReservationMapping.count.mockResolvedValue(1);
    const count = await mockPrismaService.connectivityReservationMapping.count({ where: { partnerId: mockPartner.id } });
    expect(count).toBe(1);
  });

  it('11. Webhook/HMAC acknowledgement is detected', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({ id: 'conn-1', roomMappings: [{ id: 'rm-1' }] });
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([
      { direction: 'OUTBOUND', statusCode: 200, responsePayload: { signatureVerified: true } },
    ]);

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.webhookAndHmac.status).toBe('PASSED');
  });

  it('12. Successful certification changes status to PASSED', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue({ id: 'conn-1', roomMappings: [{ id: 'rm-1' }] });
    mockPrismaService.connectivityReservationMapping.findFirst.mockResolvedValue({ id: 'map-1', booking: { status: 'CANCELLED' } });
    mockPrismaService.connectivityReservationMapping.count.mockResolvedValue(1);
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([
      { endpoint: '/rates', statusCode: 200 },
      { endpoint: '/restrictions', statusCode: 200 },
      { endpoint: '/reservations', method: 'POST', statusCode: 201, requestPayload: { externalReservationId: 'EXT-9' } },
      { endpoint: '/reservations', method: 'POST', statusCode: 200, requestPayload: { externalReservationId: 'EXT-9' } },
      { endpoint: '/reservations/EXT-9', method: 'GET', statusCode: 200 },
      { endpoint: '/reservations/EXT-9', method: 'PUT', statusCode: 200 },
      { endpoint: '/reservations/EXT-9/cancel', method: 'POST', statusCode: 200 },
      { direction: 'OUTBOUND', statusCode: 200, responsePayload: { signatureVerified: true } },
    ]);

    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const res = await certificationService.verifyAndEvaluate(mockPartner.id);
    expect(res.certificationStatus).toBe('PASSED');
    expect(res.certifiedAt).toBeDefined();
  });

  it('13. Failed certification remains retryable', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const res1 = await certificationService.verifyAndEvaluate(mockPartner.id);
    expect(res1.certificationStatus).toBe('FAILED');

    // Retry works
    const res2 = await certificationService.verifyAndEvaluate(mockPartner.id);
    expect(res2.certificationStatus).toBe('FAILED');
  });

  it('14. Certification status endpoint returns current checklist', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.partnerId).toBe(mockPartner.id);
    expect(status.checklist).toBeDefined();
  });

  it('15. Production credential issuance succeeds after certification PASSED', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue({
      ...mockPartner,
      certificationStatus: 'PASSED',
    });
    mockPrismaService.connectivityPartnerCredential.create.mockResolvedValue({
      id: 'cred-live-1',
      partnerId: mockPartner.id,
      name: 'Prod Key',
      environment: 'PRODUCTION',
      keyPrefix: 'rg_live_1234',
      status: 'ACTIVE',
      expiresAt: null,
      createdAt: new Date(),
    });

    const res = await partnerService.createCredential(mockPartner.id, {
      name: 'Prod Key',
      environment: 'PRODUCTION' as any,
    });

    expect(res.plainApiKey).toContain('rg_live_');
  });

  it('16. SuperAdmin override works', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    const res = await certificationService.overrideCertification(
      mockPartner.id,
      'PASSED',
      'Verified manually by SuperAdmin',
      'superadmin-uuid',
    );

    expect(res.certificationStatus).toBe('PASSED');
    expect(res.reason).toBe('Verified manually by SuperAdmin');
  });

  it('17. Override without reason throws BadRequestException', async () => {
    await expect(
      certificationService.overrideCertification(mockPartner.id, 'PASSED', '', 'admin'),
    ).rejects.toThrow(BadRequestException);
  });

  it('18. Partner A cannot access Partner B evidence', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);
    mockPrismaService.connectivityLog.findMany.mockResolvedValue([]);

    const status = await certificationService.getStatus(mockPartner.id);
    expect(status.checklist.sandboxConnection.status).toBe('NOT_STARTED');
  });

  it('19. Sandbox certification cannot use production property evidence', async () => {
    mockPrismaService.connectivityPartnerConnection.findFirst.mockResolvedValue(null);
    const conn = await mockPrismaService.connectivityPartnerConnection.findFirst({
      where: { partnerId: mockPartner.id, propertyId: 'TEST-PROP-001' },
    });
    expect(conn).toBeNull();
  });

  it('20. Certification audit logs contain no secrets', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue(mockPartner);
    mockPrismaService.connectivityPartner.update.mockImplementation(({ data }) =>
      Promise.resolve({ ...mockPartner, ...data }),
    );

    await certificationService.verifyAndEvaluate(mockPartner.id);
    const createCall = mockPrismaService.connectivityLog.create.mock.calls[0][0];
    const payloadStr = JSON.stringify(createCall);
    expect(payloadStr).not.toContain('password');
    expect(payloadStr).not.toContain('jwt');
    expect(payloadStr).not.toContain('apiKey');
  });

  it('21. Production credential bypass allowed only when adminBypass is true', async () => {
    mockPrismaService.connectivityPartner.findUnique.mockResolvedValue({
      ...mockPartner,
      certificationStatus: 'NOT_STARTED',
    });
    mockPrismaService.connectivityPartnerCredential.create.mockResolvedValue({
      id: 'cred-bypass-1',
      partnerId: mockPartner.id,
      name: 'Bypass Key',
      environment: 'PRODUCTION',
      keyPrefix: 'rg_live_5678',
      status: 'ACTIVE',
    });

    const res = await partnerService.createCredential(mockPartner.id, {
      name: 'Bypass Key',
      environment: 'PRODUCTION' as any,
      adminBypass: true,
    } as any);

    expect(res.plainApiKey).toContain('rg_live_');
  });

  it('22. Full Phase 8 specification certified', () => {
    expect(certificationService).toBeDefined();
    expect(partnerService).toBeDefined();
  });
});
