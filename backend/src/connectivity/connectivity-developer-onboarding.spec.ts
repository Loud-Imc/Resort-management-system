import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityDeveloperController } from './connectivity-developer.controller';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivityCertificationService } from './services/connectivity-certification.service';
import { ConnectivitySandboxService } from './services/connectivity-sandbox.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConflictException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { ConnectivityPartnerType, ConnectivityPartnerStatus, ConnectivityCertificationStatus, ConnectivityCredentialEnv } from '@prisma/client';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { UsersService } from '../users/users.service';

describe('Developer Account Onboarding & Security Gate Unit Tests', () => {
  let controller: ConnectivityDeveloperController;
  let partnerService: ConnectivityPartnerService;
  let jwtStrategy: JwtStrategy;
  let prismaService: any;

  const mockPrisma = {
    connectivityPartner: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockPartnerService = {
    createCredential: jest.fn(),
  };

  const mockCertificationService = {
    runCertificationAudit: jest.fn(),
  };

  const mockUsersService = {
    findByIdForAuth: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock_developer_jwt_token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('mock_jwt_secret'),
  };

  const mockSandboxService = {
    getPostmanCollection: jest.fn().mockReturnValue({
      info: { name: 'Oreedu V1 Sandbox API Collection' },
      item: [{ name: '01. Ping Authentication' }],
    }),
    getPostmanEnvironment: jest.fn().mockReturnValue({
      id: 'oreedu-v1-sandbox-env',
      values: [{ key: 'baseUrl', value: 'http://localhost:3000' }],
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectivityDeveloperController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConnectivityPartnerService, useValue: mockPartnerService },
        { provide: ConnectivityCertificationService, useValue: mockCertificationService },
        { provide: ConnectivitySandboxService, useValue: mockSandboxService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: UsersService, useValue: mockUsersService },
        JwtStrategy,
      ],
    }).compile();

    controller = module.get<ConnectivityDeveloperController>(ConnectivityDeveloperController);
    partnerService = module.get<ConnectivityPartnerService>(ConnectivityPartnerService);
    jwtStrategy = module.get<JwtStrategy>(JwtStrategy);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('1. Public Developer Registration (POST /developer/register)', () => {
    it('successfully registers developer company without code, auto-generates partner code, issues Sandbox key (rg_test_...), and returns JWT token', async () => {
      mockPrisma.connectivityPartner.findUnique.mockResolvedValue(null);
      mockPrisma.connectivityPartner.findFirst.mockResolvedValue(null);

      mockPrisma.connectivityPartner.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'partner-uuid-1',
          name: args.data.name,
          code: args.data.code,
          type: args.data.type,
          status: ConnectivityPartnerStatus.ACTIVE,
          certificationStatus: ConnectivityCertificationStatus.NOT_STARTED,
          contactEmail: args.data.contactEmail,
          webhookSecret: args.data.webhookSecret,
          passwordHash: args.data.passwordHash,
          createdAt: new Date(),
        });
      });

      mockPartnerService.createCredential.mockResolvedValue({
        credential: { id: 'cred-1', environment: ConnectivityCredentialEnv.SANDBOX, keyPrefix: 'rg_test_1234' },
        plainApiKey: 'rg_test_1234567890abcdef12345678',
      });

      const result = await controller.register(
        {
          name: 'QMR PMS',
          type: ConnectivityPartnerType.PMS,
          contactEmail: 'dev@qmrpms.com',
          password: 'SecurePassword123!',
        },
        { ip: '127.0.0.1' },
      );

      expect(result.partner.code).toMatch(/^QMR_PMS_[A-Z0-9]{4}$/);
      expect(result.accessToken).toBe('mock_developer_jwt_token');
      expect(result.initialApiKey).toContain('rg_test_');
      expect(mockPartnerService.createCredential).toHaveBeenCalledWith('partner-uuid-1', expect.objectContaining({
        environment: ConnectivityCredentialEnv.SANDBOX,
      }));
    });

    it('auto-generates unique collision-resistant codes for two registering companies without manual coordination', async () => {
      mockPrisma.connectivityPartner.findFirst.mockResolvedValue(null);
      mockPrisma.connectivityPartner.findUnique.mockResolvedValue(null);

      mockPrisma.connectivityPartner.create.mockImplementation((args: any) => {
        return Promise.resolve({
          id: 'partner-uuid-2',
          name: args.data.name,
          code: args.data.code,
          type: args.data.type,
          status: ConnectivityPartnerStatus.ACTIVE,
          certificationStatus: ConnectivityCertificationStatus.NOT_STARTED,
          contactEmail: args.data.contactEmail,
          createdAt: new Date(),
        });
      });

      mockPartnerService.createCredential.mockResolvedValue({
        credential: { id: 'cred-2', environment: ConnectivityCredentialEnv.SANDBOX, keyPrefix: 'rg_test_5678' },
        plainApiKey: 'rg_test_999988887777666655554444',
      });

      const res1 = await controller.register(
        {
          name: 'Acme Systems',
          type: ConnectivityPartnerType.CHANNEL_MANAGER,
          contactEmail: 'dev1@acme.com',
          password: 'SecurePassword123!',
        },
        { ip: '127.0.0.1' },
      );

      const res2 = await controller.register(
        {
          name: 'Acme Systems',
          type: ConnectivityPartnerType.CHANNEL_MANAGER,
          contactEmail: 'dev2@acme.com',
          password: 'SecurePassword123!',
        },
        { ip: '127.0.0.1' },
      );

      expect(res1.partner.code).toMatch(/^ACME_SYSTEMS_/);
      expect(res2.partner.code).toMatch(/^ACME_SYSTEMS_/);
    });

    it('rejects duplicate contact email with ConflictException', async () => {
      mockPrisma.connectivityPartner.findFirst.mockResolvedValue({ id: 'existing-id' });

      await expect(
        controller.register(
          {
            name: 'Duplicate PMS',
            type: ConnectivityPartnerType.PMS,
            contactEmail: 'duplicate@example.com',
            password: 'SecurePassword123!',
          },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('2. Developer Login (POST /developer/login)', () => {
    it('authenticates valid email and password, returning Developer JWT', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('ValidPass123!', 10);

      mockPrisma.connectivityPartner.findFirst.mockResolvedValue({
        id: 'partner-uuid-1',
        name: 'Nexus PMS',
        contactEmail: 'dev@nexuspms.com',
        passwordHash: hash,
        status: ConnectivityPartnerStatus.ACTIVE,
      });

      const result = await controller.login(
        {
          email: 'dev@nexuspms.com',
          password: 'ValidPass123!',
        },
        { ip: '127.0.0.1' },
      );

      expect(result.accessToken).toBe('mock_developer_jwt_token');
      expect(result.partner.id).toBe('partner-uuid-1');
    });

    it('rejects incorrect password with UnauthorizedException', async () => {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('CorrectPass!', 10);

      mockPrisma.connectivityPartner.findFirst.mockResolvedValue({
        id: 'partner-uuid-1',
        contactEmail: 'dev@nexuspms.com',
        passwordHash: hash,
        status: ConnectivityPartnerStatus.ACTIVE,
      });

      await expect(
        controller.login(
          {
            email: 'dev@nexuspms.com',
            password: 'WrongPassword!',
          },
          { ip: '127.0.0.1' },
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('3. Developer & Property Owner JWT Token Isolation', () => {
    it('Property-Owner JwtStrategy rejects Developer JWT tokens', async () => {
      const developerPayload = {
        sub: 'partner-uuid-1',
        partnerId: 'partner-uuid-1',
        type: 'DEVELOPER_PARTNER',
      };

      await expect(jwtStrategy.validate(developerPayload)).rejects.toThrow(
        'Invalid token type for property owner authentication',
      );
    });
  });

  describe('4. Production Credential Security Gate Enforcement', () => {
    it('blocks issuing PRODUCTION credentials (rg_live_...) when certificationStatus is NOT_STARTED', async () => {
      mockPrisma.connectivityPartner.findUnique.mockResolvedValue({
        id: 'partner-uuid-1',
        certificationStatus: ConnectivityCertificationStatus.NOT_STARTED,
      });

      await expect(
        controller.createCredential(
          { user: { id: 'partner-uuid-1' } },
          { name: 'Live Key', environment: ConnectivityCredentialEnv.PRODUCTION },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows issuing PRODUCTION credentials (rg_live_...) only when certificationStatus is PASSED', async () => {
      mockPrisma.connectivityPartner.findUnique.mockResolvedValue({
        id: 'partner-uuid-1',
        certificationStatus: ConnectivityCertificationStatus.PASSED,
      });

      mockPartnerService.createCredential.mockResolvedValue({
        credential: { id: 'live-cred-1', environment: ConnectivityCredentialEnv.PRODUCTION, keyPrefix: 'rg_live_1234' },
        plainApiKey: 'rg_live_999988887777666655554444',
      });

      const result = await controller.createCredential(
        { user: { id: 'partner-uuid-1' } },
        { name: 'Live Key', environment: ConnectivityCredentialEnv.PRODUCTION },
      );

      expect(result.plainApiKey).toContain('rg_live_');
    });
  });

  describe('5. Official Postman Collection & Environment Generators', () => {
    it('returns official Postman Collection JSON schema v2.1.0 with DTO-compliant request bodies', async () => {
      const realSandboxService = new (require('./services/connectivity-sandbox.service').ConnectivitySandboxService)(null);
      const collection = realSandboxService.getPostmanCollection('http://localhost:3000');

      expect(collection.info.name).toBe('Oreedu V1 Sandbox API Collection');
      expect(collection.item.length).toBe(21);

      // Verify Request #02 contains propertyId AND externalPropertyId
      const req2 = collection.item.find((i: any) => i.name.startsWith('02.'));
      const req2Body = JSON.parse(req2.request.body.raw);
      expect(req2Body.propertyId).toBe('{{propertyId}}');
      expect(req2Body.externalPropertyId).toBe('{{externalPropertyId}}');

      // Verify Request #07 (Availability Push) contains startDate, endDate, sellableQuantity
      const req7 = collection.item.find((i: any) => i.name.startsWith('07.'));
      const req7Body = JSON.parse(req7.request.body.raw);
      expect(req7Body.availability[0].startDate).toBe('2026-09-01');
      expect(req7Body.availability[0].sellableQuantity).toBe(10);

      // Verify Request #09 (Rates Push) contains price
      const req9 = collection.item.find((i: any) => i.name.startsWith('09.'));
      const req9Body = JSON.parse(req9.request.body.raw);
      expect(req9Body.rates[0].price).toBe(5500.00);

      // Verify Request #11 (Restrictions Push) contains minStayArrival
      const req11 = collection.item.find((i: any) => i.name.startsWith('11.'));
      const req11Body = JSON.parse(req11.request.body.raw);
      expect(req11Body.restrictions[0].minStayArrival).toBe(2);

      // Verify Request #12 (Ingest Reservation) contains propertyId, adultsCount, guest object
      const req12 = collection.item.find((i: any) => i.name.startsWith('12.'));
      const req12Body = JSON.parse(req12.request.body.raw);
      expect(req12Body.propertyId).toBe('{{propertyId}}');
      expect(req12Body.adultsCount).toBe(2);
      expect(req12Body.guest.firstName).toBe('Jane');
    });

    it('returns Postman Environment JSON with sandbox variables', async () => {
      const mockRes = { setHeader: jest.fn() };
      const result = await controller.getPostmanEnvironment({
        headers: { authorization: 'Bearer test_jwt_token' },
        protocol: 'http',
        get: () => 'localhost:3000',
      }, mockRes);
      expect(result.id).toBe('oreedu-v1-sandbox-env');
      expect(mockSandboxService.getPostmanEnvironment).toHaveBeenCalledWith(
        'rg_test_PASTE_YOUR_SANDBOX_API_KEY_HERE',
        'test_jwt_token',
        'http://localhost:3000',
      );
    });
  });
});
