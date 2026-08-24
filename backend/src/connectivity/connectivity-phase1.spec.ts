import { Test, TestingModule } from '@nestjs/testing';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivityConnectionService } from './services/connectivity-connection.service';
import { ConnectivityMappingService } from './services/connectivity-mapping.service';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityLogService } from './services/connectivity-log.service';
import { PrismaService } from '../prisma/prisma.service';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConnectivityPartnerStatus, ConnectivityPartnerType, ConnectivityCredentialEnv, ConnectivityCredentialStatus } from '@prisma/client';

describe('Connectivity Platform Phase 1 Unit Tests', () => {
  let partnerService: ConnectivityPartnerService;
  let connectionService: ConnectivityConnectionService;
  let mappingService: ConnectivityMappingService;
  let settingsService: ConnectivitySettingsService;

  const mockPrismaService = {
    connectivityPartner: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    connectivityPartnerCredential: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    connectivityPartnerConnection: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    connectivityRoomTypeMapping: {
      findFirst: jest.fn(),
      upsert: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    connectivityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    roomType: {
      findFirst: jest.fn(),
    },
    cancellationPolicy: {
      count: jest.fn(),
    },
  };

  const mockSystemSettingsService = {
    getSetting: jest.fn(),
    updateSetting: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConnectivityPartnerService,
        ConnectivityConnectionService,
        ConnectivityMappingService,
        ConnectivitySettingsService,
        ConnectivityLogService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SystemSettingsService, useValue: mockSystemSettingsService },
      ],
    }).compile();

    partnerService = module.get<ConnectivityPartnerService>(ConnectivityPartnerService);
    connectionService = module.get<ConnectivityConnectionService>(ConnectivityConnectionService);
    mappingService = module.get<ConnectivityMappingService>(ConnectivityMappingService);
    settingsService = module.get<ConnectivitySettingsService>(ConnectivitySettingsService);
  });

  describe('ConnectivityPartnerService', () => {
    it('should create a new partner and generate an initial production API key', async () => {
      mockPrismaService.connectivityPartner.findUnique.mockImplementation((args: any) => {
        if (args?.where?.code === 'SITEMINDER') return Promise.resolve(null);
        if (args?.where?.id === 'partner-1') return Promise.resolve({ id: 'partner-1', name: 'SiteMinder', code: 'SITEMINDER' });
        return Promise.resolve(null);
      });
      mockPrismaService.connectivityPartner.create.mockResolvedValue({
        id: 'partner-1',
        name: 'SiteMinder',
        code: 'SITEMINDER',
        status: ConnectivityPartnerStatus.ACTIVE,
      });
      mockPrismaService.connectivityPartnerCredential.create.mockResolvedValue({
        id: 'cred-1',
        name: 'Initial Key',
        environment: ConnectivityCredentialEnv.PRODUCTION,
        keyPrefix: 'rg_live_1234',
        apiKeyHash: 'hashed_key',
        status: ConnectivityCredentialStatus.ACTIVE,
      });

      const result = await partnerService.createPartner({
        name: 'SiteMinder',
        code: 'SITEMINDER',
        type: ConnectivityPartnerType.PMS,
      });

      expect(result.partner.code).toBe('SITEMINDER');
      expect(result.initialApiKey).toMatch(/^rg_live_/);
    });

    it('should prevent duplicate partner codes', async () => {
      mockPrismaService.connectivityPartner.findUnique.mockResolvedValue({ id: 'p-1', code: 'SITEMINDER' });

      await expect(
        partnerService.createPartner({ name: 'SiteMinder 2', code: 'SITEMINDER' })
      ).rejects.toThrow(ConflictException);
    });

    it('should reject invalid or revoked API keys', async () => {
      mockPrismaService.connectivityPartnerCredential.findUnique.mockResolvedValue(null);

      const invalidResult = await partnerService.validateApiKey('rg_live_invalid_key');
      expect(invalidResult).toBeNull();
    });
  });

  describe('ConnectivityConnectionService (Property Readiness)', () => {
    it('should reject connection if property is not active or incomplete', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        isActive: false,
        status: 'PENDING',
        latitude: null,
        longitude: null,
        roomTypes: [],
      });

      await expect(
        connectionService.createConnection('partner-1', {
          propertyId: 'prop-1',
          externalPropertyId: 'EXT-100',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create connection if property passes all readiness checks', async () => {
      mockPrismaService.property.findUnique.mockResolvedValue({
        id: 'prop-1',
        isActive: true,
        status: 'APPROVED',
        latitude: 12.34,
        longitude: 56.78,
        coverImage: 'cover.jpg',
        images: ['img1.jpg'],
        roomTypes: [{ id: 'rt-1', rooms: [{ id: 'r-1' }] }],
      });
      mockPrismaService.cancellationPolicy.count.mockResolvedValue(1);
      mockPrismaService.connectivityPartnerConnection.findUnique.mockResolvedValue(null);
      mockPrismaService.connectivityPartnerConnection.create.mockResolvedValue({
        id: 'conn-1',
        partnerId: 'partner-1',
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-100',
        status: 'ACTIVE',
      });

      const conn = await connectionService.createConnection('partner-1', {
        propertyId: 'prop-1',
        externalPropertyId: 'EXT-100',
      });

      expect(conn.externalPropertyId).toBe('EXT-100');
    });
  });

  describe('ConnectivitySettingsService', () => {
    it('should return default global capabilities if no setting is saved', async () => {
      mockSystemSettingsService.getSetting.mockResolvedValue(null);

      const caps = await settingsService.getGlobalCapabilities();

      expect(caps.availabilitySync).toBe(true);
      expect(caps.contentEditing).toBe(false);
    });

    it('should update and persist global capability switches centrally', async () => {
      mockSystemSettingsService.getSetting.mockResolvedValue({
        contentEditing: false,
        availabilitySync: true,
        rateSync: true,
        restrictionSync: true,
        reservationSync: true,
      });

      const updated = await settingsService.updateGlobalCapabilities({ contentEditing: true });

      expect(updated.contentEditing).toBe(true);
      expect(mockSystemSettingsService.updateSetting).toHaveBeenCalledWith(
        'CONNECTIVITY_GLOBAL_CAPABILITIES',
        expect.objectContaining({ contentEditing: true }),
        expect.any(String)
      );
    });
  });
});
