import { Injectable, NotFoundException, BadRequestException, ConflictException, Logger, ForbiddenException, Inject, forwardRef, Optional } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivitySandboxService } from './connectivity-sandbox.service';
import { CreateConnectionDto } from '../dto/create-connection.dto';
import { QueryContentDto } from '../dto/query-content.dto';
import { ConnectivityConnectionStatus, ConnectivityCredentialEnv } from '@prisma/client';

@Injectable()
export class ConnectivityConnectionService {
  private readonly logger = new Logger(ConnectivityConnectionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => ConnectivitySandboxService))
    private readonly sandboxService?: ConnectivitySandboxService,
  ) {}

  /**
   * Validate RouteGuide property readiness using existing platform rules:
   * 1. property.isActive === true
   * 2. property.status === 'APPROVED'
   * 3. Map coordinates set (latitude & longitude)
   * 4. At least 1 RoomType & physical Room created
   * 5. Cover image & images uploaded
   * 6. At least 1 Cancellation Policy configured
   */
  async validatePropertyReadiness(propertyId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        roomTypes: {
          include: { rooms: true },
        },
      },
    });

    if (!property) {
      throw new NotFoundException(`RouteGuide Property with ID ${propertyId} not found.`);
    }

    const pending: string[] = [];

    if (!property.isActive) {
      pending.push('Enable Property (isActive = true)');
    }
    if (property.status !== 'APPROVED') {
      pending.push(`Property Approval Status is currently '${property.status}' (Must be APPROVED)`);
    }

    const hasCoordinates = !!property.latitude && !!property.longitude;
    const hasImages = !!property.coverImage && property.images && property.images.length > 0;
    const hasRoomTypes = property.roomTypes && property.roomTypes.length > 0;
    const hasRooms = property.roomTypes && property.roomTypes.some(rt => rt.rooms && rt.rooms.length > 0);

    const policiesCount = await this.prisma.cancellationPolicy.count({ where: { propertyId } });
    const hasPolicies = policiesCount > 0;

    if (!hasCoordinates) pending.push('Set Map Coordinates');
    if (!hasRoomTypes) pending.push('Create Room Types');
    if (!hasRooms) pending.push('Add Physical Rooms');
    if (!hasImages) pending.push('Upload Property Images');
    if (!hasPolicies) pending.push('Set Cancellation Policies');

    if (pending.length > 0) {
      throw new BadRequestException(
        `PROPERTY_SETUP_REQUIRED: Property profile is incomplete. Please resolve: ${pending.join(', ')}`
      );
    }

    return property;
  }

  private validateEnvironmentAccess(credentialEnv: string | undefined | null, propertyCode?: string) {
    if (!credentialEnv || !propertyCode) return;
    const sandboxCode = 'TEST-PROP-001';
    const isSandboxEnv = credentialEnv === ConnectivityCredentialEnv.SANDBOX || credentialEnv === 'SANDBOX';
    const isSandboxProperty = propertyCode === sandboxCode;

    if (isSandboxEnv && !isSandboxProperty) {
      throw new ForbiddenException('Sandbox API keys (rg_test_...) are restricted to Sandbox Test Properties only.');
    }
    if (!isSandboxEnv && isSandboxProperty) {
      throw new ForbiddenException('Production API keys (rg_live_...) cannot access Sandbox Test Properties.');
    }
  }

  async createConnection(partnerId: string, dto: CreateConnectionDto, credentialEnv?: string) {
    // 1. Verify property readiness using existing RG checklist
    const property = await this.validatePropertyReadiness(dto.propertyId);

    // Enforce environment isolation
    this.validateEnvironmentAccess(credentialEnv, property.slug || property.id);

    // 2. Check for duplicate connection or duplicate externalPropertyId under this partner
    const existingPropertyConn = await this.prisma.connectivityPartnerConnection.findUnique({
      where: {
        partnerId_propertyId: { partnerId, propertyId: dto.propertyId },
      },
    });
    if (existingPropertyConn) {
      throw new ConflictException(`Property ${dto.propertyId} is already connected to this partner.`);
    }

    const existingExternalConn = await this.prisma.connectivityPartnerConnection.findUnique({
      where: {
        partnerId_externalPropertyId: { partnerId, externalPropertyId: dto.externalPropertyId },
      },
    });
    if (existingExternalConn) {
      throw new ConflictException(`External Property ID '${dto.externalPropertyId}' is already connected under another property.`);
    }

    // 3. Create connection
    const connection = await this.prisma.connectivityPartnerConnection.create({
      data: {
        partnerId,
        propertyId: dto.propertyId,
        externalPropertyId: dto.externalPropertyId,
        status: ConnectivityConnectionStatus.ACTIVE,
      },
      include: {
        property: {
          select: { id: true, name: true, city: true, state: true, baseCurrency: true, slug: true },
        },
      },
    });

    this.logger.log(`Created Connectivity Connection for Partner [${partnerId}] ➔ RG Property [${dto.propertyId}] (External ID: ${dto.externalPropertyId})`);
    return connection;
  }

  async getConnectionsForPartner(partnerId: string, credentialEnv?: string) {
    const isSandboxEnv = credentialEnv === ConnectivityCredentialEnv.SANDBOX || credentialEnv === 'SANDBOX';
    const sandboxCode = 'TEST-PROP-001';

    const whereClause: any = { partnerId };
    if (credentialEnv) {
      if (isSandboxEnv) {
        whereClause.property = { OR: [{ id: sandboxCode }, { slug: sandboxCode }] };
      } else {
        whereClause.property = { NOT: { OR: [{ id: sandboxCode }, { slug: sandboxCode }] } };
      }
    }

    return this.prisma.connectivityPartnerConnection.findMany({
      where: whereClause,
      include: {
        property: {
          select: { id: true, name: true, slug: true, city: true, state: true, status: true, isActive: true },
        },
        roomMappings: {
          include: {
            roomType: { select: { id: true, name: true, basePrice: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getConnectionForPartnerAndProperty(partnerId: string, propertyId: string, credentialEnv?: string) {
    const connection = await this.prisma.connectivityPartnerConnection.findUnique({
      where: {
        partnerId_propertyId: { partnerId, propertyId },
      },
      include: {
        property: {
          select: { id: true, name: true, slug: true, city: true, state: true, status: true, isActive: true, baseCurrency: true },
        },
        roomMappings: {
          include: {
            roomType: { select: { id: true, name: true, basePrice: true } },
          },
        },
      },
    });

    if (!connection) {
      throw new NotFoundException(`No active connection found between partner ${partnerId} and property ${propertyId}`);
    }

    this.validateEnvironmentAccess(credentialEnv, connection.property?.slug || connection.property?.id);
    return connection;
  }

  async updateConnectionStatus(connectionId: string, status: ConnectivityConnectionStatus) {
    return this.prisma.connectivityPartnerConnection.update({
      where: { id: connectionId },
      data: { status },
    });
  }

  /**
   * Property Content READ API (GET /connectivity/v1/content)
   * Resolves partner-isolated connection and outputs sanitized property & roomType listing content.
   * STRICT COMPLIANCE RULES:
   * 1. Internal database IDs (propertyId, roomTypeId) are EXCLUDED from response.
   * 2. Physical room records (Room 101, physical room IDs) are EXCLUDED.
   * 3. BasePrice / pricing is EXCLUDED (pricing is isolated to /rates API).
   * 4. Owner PII, commission rates, GST/legal docs are EXCLUDED.
   */
  async getContentForPartner(partnerId: string, dto: QueryContentDto, credentialEnv?: string) {
    if (!dto.externalPropertyId && !dto.propertyId) {
      throw new BadRequestException('Either externalPropertyId or propertyId must be provided.');
    }

    let connection: any = null;

    if (dto.externalPropertyId) {
      connection = await this.prisma.connectivityPartnerConnection.findFirst({
        where: {
          partnerId,
          externalPropertyId: dto.externalPropertyId,
          status: { in: [ConnectivityConnectionStatus.ACTIVE, ConnectivityConnectionStatus.DEGRADED] },
        },
        include: { property: { select: { slug: true } } },
      });
    } else if (dto.propertyId) {
      connection = await this.prisma.connectivityPartnerConnection.findFirst({
        where: {
          partnerId,
          propertyId: dto.propertyId,
          status: { in: [ConnectivityConnectionStatus.ACTIVE, ConnectivityConnectionStatus.DEGRADED] },
        },
        include: { property: { select: { slug: true } } },
      });
    }

    if (!connection) {
      throw new NotFoundException('No active connection found for the specified property mapping.');
    }

    this.validateEnvironmentAccess(credentialEnv, connection.property?.slug);

    // Single optimized query omitting internal/sensitive fields and physical rooms
    const property = await this.prisma.property.findUnique({
      where: { id: connection.propertyId },
      select: {
        name: true,
        slug: true,
        type: true,
        description: true,
        address: true,
        city: true,
        state: true,
        country: true,
        pincode: true,
        latitude: true,
        longitude: true,
        email: true,
        phone: true,
        images: true,
        coverImage: true,
        amenities: true,
        policies: true,
        defaultCheckInTime: true,
        defaultCheckOutTime: true,
        cancellationPolicies: {
          select: {
            name: true,
            description: true,
            rules: true,
          },
        },
        roomTypes: {
          where: { isPubliclyVisible: true },
          select: {
            id: true, // Used internally to map to externalRoomTypeId, NOT outputted
            name: true,
            description: true,
            size: true,
            amenities: true,
            images: true,
            maxAdults: true,
            maxChildren: true,
            baseAdults: true,
            baseChildren: true,
            highlights: true,
            inclusions: true,
            cancellationPolicyText: true,
            cancellationPolicy: {
              select: {
                name: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property content not found.');
    }

    // Resolve RoomType external mappings for this connection
    const roomMappings = await this.prisma.connectivityRoomTypeMapping.findMany({
      where: { connectionId: connection.id },
    });

    const mappingMap = new Map<string, string>();
    roomMappings.forEach(rm => mappingMap.set(rm.roomTypeId, rm.externalRoomTypeId));

    return {
      apiVersion: 'v1',
      timestamp: new Date().toISOString(),
      externalPropertyId: connection.externalPropertyId,
      property: {
        name: property.name,
        slug: property.slug,
        type: property.type,
        description: property.description || null,
        location: {
          address: property.address,
          city: property.city,
          state: property.state,
          country: property.country,
          pincode: property.pincode || null,
          coordinates: {
            latitude: property.latitude ? Number(property.latitude) : null,
            longitude: property.longitude ? Number(property.longitude) : null,
          },
        },
        contact: {
          email: property.email,
          phone: property.phone,
        },
        checkInTime: property.defaultCheckInTime,
        checkOutTime: property.defaultCheckOutTime,
        coverImage: property.coverImage || null,
        images: property.images || [],
        amenities: property.amenities || [],
        policies: property.policies || null,
      },
      roomTypes: property.roomTypes.map(rt => ({
        externalRoomTypeId: mappingMap.get(rt.id) || null,
        name: rt.name,
        description: rt.description || null,
        sizeSqFt: rt.size || null,
        occupancy: {
          maxAdults: rt.maxAdults,
          maxChildren: rt.maxChildren,
          baseAdults: rt.baseAdults,
          baseChildren: rt.baseChildren,
        },
        amenities: rt.amenities || [],
        highlights: rt.highlights || [],
        inclusions: rt.inclusions || [],
        images: rt.images || [],
        cancellationPolicy: rt.cancellationPolicy
          ? {
              name: rt.cancellationPolicy.name,
              text: rt.cancellationPolicyText || rt.cancellationPolicy.description || null,
            }
          : null,
      })),
    };
  }
}

