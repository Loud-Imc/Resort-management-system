import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityDeveloperController } from './connectivity-developer.controller';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivityCertificationService } from './services/connectivity-certification.service';
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectivityDeveloperController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConnectivityPartnerService, useValue: mockPartnerService },
        { provide: ConnectivityCertificationService, useValue: mockCertificationService },
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
    it('successfully registers developer company, issues Sandbox key (rg_test_...), and returns JWT token', async () => {
      mockPrisma.connectivityPartner.findUnique.mockResolvedValue(null);
      mockPrisma.connectivityPartner.findFirst.mockResolvedValue(null);

      const createdPartner = {
        id: 'partner-uuid-1',
        name: 'Nexus PMS',
        code: 'NEXUS_PMS',
        type: ConnectivityPartnerType.PMS,
        status: ConnectivityPartnerStatus.ACTIVE,
        certificationStatus: ConnectivityCertificationStatus.NOT_STARTED,
        contactEmail: 'dev@nexuspms.com',
        webhookUrl: 'https://webhook.nexuspms.com',
        webhookSecret: 'mock_webhook_secret_hex',
        passwordHash: 'hashed_password',
        createdAt: new Date(),
      };

      mockPrisma.connectivityPartner.create.mockResolvedValue(createdPartner);
      mockPartnerService.createCredential.mockResolvedValue({
        credential: { id: 'cred-1', environment: ConnectivityCredentialEnv.SANDBOX, keyPrefix: 'rg_test_1234' },
        plainApiKey: 'rg_test_1234567890abcdef12345678',
      });

      const result = await controller.register(
        {
          name: 'Nexus PMS',
          code: 'NEXUS_PMS',
          type: ConnectivityPartnerType.PMS,
          contactEmail: 'dev@nexuspms.com',
          password: 'SecurePassword123!',
        },
        { ip: '127.0.0.1' },
      );

      expect(result.partner.code).toBe('NEXUS_PMS');
      expect(result.accessToken).toBe('mock_developer_jwt_token');
      expect(result.initialApiKey).toContain('rg_test_');
      expect(mockPartnerService.createCredential).toHaveBeenCalledWith('partner-uuid-1', expect.objectContaining({
        environment: ConnectivityCredentialEnv.SANDBOX,
      }));
    });

    it('rejects duplicate partner code with ConflictException', async () => {
      mockPrisma.connectivityPartner.findUnique.mockResolvedValue({ id: 'existing-id' });

      await expect(
        controller.register(
          {
            name: 'Duplicate PMS',
            code: 'EXISTING_CODE',
            type: ConnectivityPartnerType.PMS,
            contactEmail: 'unique@example.com',
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
});
