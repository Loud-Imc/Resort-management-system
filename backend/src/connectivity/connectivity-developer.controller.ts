import { Controller, Get, Post, Patch, Body, UseGuards, Req, ConflictException, UnauthorizedException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { ConnectivityCertificationService } from './services/connectivity-certification.service';
import { ConnectivitySandboxService } from './services/connectivity-sandbox.service';
import { CreateDeveloperRegisterDto } from './dto/create-developer-register.dto';
import { DeveloperLoginDto } from './dto/developer-login.dto';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { DeveloperJwtGuard } from './auth/developer-jwt.guard';
import { ConnectivityCredentialEnv, ConnectivityPartnerStatus, ConnectivityCertificationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

// In-memory rate limiting map for registration and login abuse protection
const authRateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(key: string, maxRequests = 10, windowMs = 60000) {
  const now = Date.now();
  const record = authRateLimitMap.get(key);

  if (!record || now > record.resetTime) {
    authRateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return;
  }

  if (record.count >= maxRequests) {
    throw new BadRequestException('Too many requests. Please wait a minute before retrying.');
  }

  record.count += 1;
}

@ApiTags('Developer Portal Connectivity')
@Controller('connectivity/v1/developer')
export class ConnectivityDeveloperController {
  private readonly logger = new Logger(ConnectivityDeveloperController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly partnerService: ConnectivityPartnerService,
    private readonly certificationService: ConnectivityCertificationService,
    private readonly sandboxService: ConnectivitySandboxService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private sanitizePartner(partner: any) {
    const { passwordHash, webhookSecret, ...sanitized } = partner;
    return sanitized;
  }

  private generateDeveloperToken(partnerId: string, email: string): string {
    const secret = this.configService.get<string>('JWT_SECRET') || 'secret';
    return this.jwtService.sign(
      {
        sub: partnerId,
        partnerId,
        email,
        type: 'DEVELOPER_PARTNER',
      },
      { secret, expiresIn: '7d' },
    );
  }

  private async generateUniquePartnerCode(companyName: string, type: string, requestedCode?: string): Promise<string> {
    if (requestedCode && requestedCode.trim()) {
      const sanitized = requestedCode.toUpperCase().replace(/[^A-Z0-9_-]/g, '').trim();
      if (sanitized.length >= 3) {
        const existing = await this.prisma.connectivityPartner.findUnique({
          where: { code: sanitized },
        });
        if (existing) {
          throw new ConflictException(`Partner code '${sanitized}' is already registered.`);
        }
        return sanitized;
      }
    }

    const cleanName = (companyName || 'PARTNER')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, 18);

    const basePrefix = cleanName || 'PARTNER';

    for (let i = 0; i < 5; i++) {
      const hex = crypto.randomBytes(2).toString('hex').toUpperCase();
      const candidate = `${basePrefix}_${hex}`;
      const existing = await this.prisma.connectivityPartner.findUnique({
        where: { code: candidate },
      });
      if (!existing) {
        return candidate;
      }
    }

    return `${basePrefix}_${Date.now().toString(36).toUpperCase()}`;
  }

  @Post('register')
  @ApiOperation({ summary: 'Register external PMS / Channel Manager company for RouteGuide Connectivity' })
  async register(@Body() dto: CreateDeveloperRegisterDto, @Req() req: any) {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    checkRateLimit(`register_${clientIp}`, 5, 60000);

    const contactEmail = dto.contactEmail.toLowerCase().trim();

    // Check contact email uniqueness
    const existingEmail = await this.prisma.connectivityPartner.findFirst({
      where: { contactEmail },
    });
    if (existingEmail) {
      throw new ConflictException(`An account with contact email '${contactEmail}' is already registered.`);
    }

    const partnerCode = await this.generateUniquePartnerCode(dto.name, dto.type, dto.code);

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const initialWebhookSecret = crypto.randomBytes(32).toString('hex');

    const partner = await this.prisma.connectivityPartner.create({
      data: {
        name: dto.name.trim(),
        code: partnerCode,
        type: dto.type,
        status: ConnectivityPartnerStatus.ACTIVE,
        certificationStatus: ConnectivityCertificationStatus.NOT_STARTED,
        contactEmail,
        contactPhone: dto.contactPhone?.trim(),
        webhookUrl: dto.webhookUrl?.trim(),
        webhookSecret: initialWebhookSecret,
        passwordHash: hashedPassword,
      },
    });

    // Auto-issue initial SANDBOX credential (rg_test_...) using existing engine
    const initialCredential = await this.partnerService.createCredential(partner.id, {
      name: 'Initial Sandbox Key',
      environment: ConnectivityCredentialEnv.SANDBOX,
    } as CreateCredentialDto);

    const accessToken = this.generateDeveloperToken(partner.id, partner.contactEmail!);

    this.logger.log(`New Developer Partner registered: ${partner.name} (${partner.code})`);

    return {
      partner: this.sanitizePartner(partner),
      accessToken,
      initialApiKey: initialCredential.plainApiKey,
      webhookSecret: initialWebhookSecret,
    };
  }

  @Post('login')
  @ApiOperation({ summary: 'Developer account login for Connectivity Developer Portal' })
  async login(@Body() dto: DeveloperLoginDto, @Req() req: any) {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    checkRateLimit(`login_${clientIp}_${dto.email}`, 10, 60000);

    const email = dto.email.toLowerCase().trim();
    const partner = await this.prisma.connectivityPartner.findFirst({
      where: { contactEmail: email },
    });

    if (!partner || !partner.passwordHash) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, partner.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (partner.status !== ConnectivityPartnerStatus.ACTIVE) {
      throw new UnauthorizedException('Developer partner account is inactive or suspended.');
    }

    const accessToken = this.generateDeveloperToken(partner.id, partner.contactEmail!);

    return {
      partner: this.sanitizePartner(partner),
      accessToken,
    };
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(DeveloperJwtGuard)
  @ApiOperation({ summary: 'Get current developer partner profile, credentials, and certification status' })
  async getProfile(@Req() req: any) {
    const partnerId = req.user.id;

    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id: partnerId },
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
          orderBy: { createdAt: 'desc' },
        },
        connections: {
          include: {
            property: {
              select: { id: true, name: true, city: true, status: true },
            },
          },
        },
      },
    });

    if (!partner) {
      throw new UnauthorizedException('Partner account not found.');
    }

    return {
      partner: this.sanitizePartner(partner),
      sandboxProperty: {
        propertyId: 'TEST-PROP-001',
        name: 'RouteGuide Sandbox Resort',
      },
      hasWebhookSecretConfigured: !!partner.webhookSecret,
    };
  }

  @Post('credentials')
  @ApiBearerAuth()
  @UseGuards(DeveloperJwtGuard)
  @ApiOperation({ summary: 'Issue a new API credential key for developer account' })
  async createCredential(@Req() req: any, @Body() dto: CreateCredentialDto) {
    const partnerId = req.user.id;
    const targetEnv = dto.environment || ConnectivityCredentialEnv.SANDBOX;

    // Strict Production Credential Security Gate Check
    if (targetEnv === ConnectivityCredentialEnv.PRODUCTION) {
      const partner = await this.prisma.connectivityPartner.findUnique({
        where: { id: partnerId },
      });

      if (!partner || partner.certificationStatus !== ConnectivityCertificationStatus.PASSED) {
        throw new ForbiddenException(
          'PRODUCTION credentials (rg_live_...) cannot be issued until partner self-certification status is PASSED.',
        );
      }
    }

    // Reuse existing credential issuance engine in partnerService
    return this.partnerService.createCredential(partnerId, {
      name: dto.name || (targetEnv === ConnectivityCredentialEnv.SANDBOX ? 'Sandbox Key' : 'Production Key'),
      environment: targetEnv,
      expiresAt: dto.expiresAt,
    });
  }

  @Patch('webhook-config')
  @ApiBearerAuth()
  @UseGuards(DeveloperJwtGuard)
  @ApiOperation({ summary: 'Update webhook URL and optionally rotate HMAC secret' })
  async updateWebhookConfig(
    @Req() req: any,
    @Body('webhookUrl') webhookUrl?: string,
    @Body('rotateSecret') rotateSecret?: boolean,
  ) {
    const partnerId = req.user.id;

    const dataToUpdate: any = {};

    if (typeof webhookUrl === 'string') {
      dataToUpdate.webhookUrl = webhookUrl.trim();
    }

    let newSecret: string | undefined = undefined;
    if (rotateSecret) {
      newSecret = crypto.randomBytes(32).toString('hex');
      dataToUpdate.webhookSecret = newSecret;
    }

    const updated = await this.prisma.connectivityPartner.update({
      where: { id: partnerId },
      data: dataToUpdate,
    });

    return {
      partner: this.sanitizePartner(updated),
      rotatedWebhookSecret: newSecret,
    };
  }

  @Post('certification/verify')
  @ApiBearerAuth()
  @UseGuards(DeveloperJwtGuard)
  @ApiOperation({ summary: 'Execute Phase 8 self-certification audit against TEST-PROP-001' })
  async runCertification(@Req() req: any) {
    const partnerId = req.user.id;
    // Reuse existing certification audit engine
    return this.certificationService.verifyAndEvaluate(partnerId);
  }

  @Get('postman/collection')
  @ApiOperation({ summary: 'Download official RouteGuide V1 Sandbox Postman Collection JSON' })
  async getPostmanCollection(@Req() req: any) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    return this.sandboxService.getPostmanCollection(baseUrl);
  }

  @Get('postman/environment')
  @ApiBearerAuth()
  @UseGuards(DeveloperJwtGuard)
  @ApiOperation({ summary: 'Download personalized RouteGuide V1 Sandbox Postman Environment JSON' })
  async getPostmanEnvironment(@Req() req: any) {
    const authHeader = req.headers?.authorization || '';
    const developerToken = authHeader.replace(/^Bearer\s+/i, '').trim();

    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;

    return this.sandboxService.getPostmanEnvironment(
      'rg_test_PASTE_YOUR_SANDBOX_API_KEY_HERE',
      developerToken,
      baseUrl,
    );
  }
}
