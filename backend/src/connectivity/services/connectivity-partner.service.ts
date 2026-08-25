import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePartnerDto } from '../dto/create-partner.dto';
import { CreateCredentialDto } from '../dto/create-credential.dto';
import { ConnectivityCredentialEnv, ConnectivityCredentialStatus, ConnectivityPartnerStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class ConnectivityPartnerService {
  private readonly logger = new Logger(ConnectivityPartnerService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createPartner(dto: CreatePartnerDto) {
    const existing = await this.prisma.connectivityPartner.findUnique({
      where: { code: dto.code.toUpperCase() },
    });
    if (existing) {
      throw new ConflictException(`Partner with code '${dto.code}' already exists`);
    }

    const partner = await this.prisma.connectivityPartner.create({
      data: {
        name: dto.name,
        code: dto.code.toUpperCase(),
        type: dto.type,
        status: ConnectivityPartnerStatus.ACTIVE,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        webhookUrl: dto.webhookUrl,
      },
    });

    // Auto-issue initial production API key
    const initialCredential = await this.createCredential(partner.id, {
      name: 'Initial Key',
      environment: ConnectivityCredentialEnv.PRODUCTION,
    });

    return {
      partner,
      initialApiKey: initialCredential.plainApiKey,
    };
  }

  async getAllPartners() {
    return this.prisma.connectivityPartner.findMany({
      include: {
        credentials: {
          select: {
            id: true,
            name: true,
            environment: true,
            keyPrefix: true,
            status: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        _count: {
          select: { connections: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPartnerById(id: string) {
    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id },
      include: {
        credentials: {
          select: {
            id: true,
            name: true,
            environment: true,
            keyPrefix: true,
            status: true,
            expiresAt: true,
            lastUsedAt: true,
            createdAt: true,
          },
        },
        connections: {
          include: {
            property: {
              select: { id: true, name: true, city: true, state: true, status: true, isActive: true },
            },
          },
        },
      },
    });

    if (!partner) {
      throw new NotFoundException(`Connectivity Partner with ID ${id} not found`);
    }
    return partner;
  }

  async updatePartnerStatus(id: string, status: ConnectivityPartnerStatus) {
    const partner = await this.getPartnerById(id);
    return this.prisma.connectivityPartner.update({
      where: { id: partner.id },
      data: { status },
    });
  }

  async createCredential(partnerId: string, dto: CreateCredentialDto) {
    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${partnerId} not found`);
    }

    const envPrefix = dto.environment === ConnectivityCredentialEnv.SANDBOX ? 'rg_test_' : 'rg_live_';
    const randomBytes = crypto.randomBytes(24).toString('hex');
    const plainApiKey = `${envPrefix}${randomBytes}`;
    const keyPrefix = plainApiKey.substring(0, 12);
    const apiKeyHash = crypto.createHash('sha256').update(plainApiKey).digest('hex');

    const credential = await this.prisma.connectivityPartnerCredential.create({
      data: {
        partnerId,
        name: dto.name || 'API Key',
        environment: dto.environment || ConnectivityCredentialEnv.PRODUCTION,
        keyPrefix,
        apiKeyHash,
        status: ConnectivityCredentialStatus.ACTIVE,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    return {
      credential: {
        id: credential.id,
        name: credential.name,
        environment: credential.environment,
        keyPrefix: credential.keyPrefix,
        status: credential.status,
        expiresAt: credential.expiresAt,
        createdAt: credential.createdAt,
      },
      plainApiKey,
    };
  }

  async revokeCredential(partnerId: string, credentialId: string) {
    const credential = await this.prisma.connectivityPartnerCredential.findFirst({
      where: { id: credentialId, partnerId },
    });
    if (!credential) {
      throw new NotFoundException(`Credential not found for partner ${partnerId}`);
    }

    return this.prisma.connectivityPartnerCredential.update({
      where: { id: credentialId },
      data: { status: ConnectivityCredentialStatus.REVOKED },
    });
  }

  async validateApiKey(plainApiKey: string) {
    if (!plainApiKey || typeof plainApiKey !== 'string') return null;

    const apiKeyHash = crypto.createHash('sha256').update(plainApiKey.trim()).digest('hex');

    const credential = await this.prisma.connectivityPartnerCredential.findUnique({
      where: { apiKeyHash },
      include: { partner: true },
    });

    if (!credential) return null;
    if (credential.status !== ConnectivityCredentialStatus.ACTIVE) return null;
    if (credential.expiresAt && new Date() > credential.expiresAt) return null;
    if (credential.partner.status !== ConnectivityPartnerStatus.ACTIVE) return null;

    // Update lastUsedAt asynchronously
    this.prisma.connectivityPartnerCredential.update({
      where: { id: credential.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {});

    return {
      partner: credential.partner,
      credential,
    };
  }
}
