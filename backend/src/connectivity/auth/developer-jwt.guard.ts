import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivityPartnerStatus } from '@prisma/client';

@Injectable()
export class DeveloperJwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
      throw new UnauthorizedException('Authentication failed: Missing or invalid Bearer token');
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      throw new UnauthorizedException('Authentication failed: Token string is empty');
    }

    let payload: any;
    try {
      const secret = this.configService.get<string>('JWT_SECRET') || 'secret';
      payload = this.jwtService.verify(token, { secret });
    } catch (err) {
      throw new UnauthorizedException('Authentication failed: Invalid or expired developer token');
    }

    // Strict Audience/Type Claim Assertion for Developer Partner JWTs
    if (payload?.type !== 'DEVELOPER_PARTNER' || !payload?.partnerId) {
      throw new UnauthorizedException('Authentication failed: Token is not a valid developer partner token');
    }

    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id: payload.partnerId },
    });

    if (!partner) {
      throw new UnauthorizedException('Authentication failed: Developer partner account not found');
    }

    if (partner.status !== ConnectivityPartnerStatus.ACTIVE) {
      throw new UnauthorizedException('Authentication failed: Developer partner account is inactive or suspended');
    }

    // Attach developer partner identity to request object
    request.user = partner;
    return true;
  }
}
