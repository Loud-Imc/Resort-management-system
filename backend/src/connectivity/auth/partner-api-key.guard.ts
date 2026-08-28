import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConnectivityPartnerService } from '../services/connectivity-partner.service';

@Injectable()
export class PartnerApiKeyGuard implements CanActivate {
  constructor(private readonly partnerService: ConnectivityPartnerService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'];

    let keyToValidate: string | null = null;

    if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim()) {
      keyToValidate = apiKeyHeader.trim();
    } else if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
      keyToValidate = authHeader.substring(7).trim();
    }

    if (!keyToValidate) {
      throw new UnauthorizedException('Authentication failed: Missing x-api-key header or Bearer token');
    }

    const validated = await this.partnerService.validateApiKey(keyToValidate);

    if (!validated) {
      throw new UnauthorizedException('Authentication failed: Invalid, revoked, or inactive API key');
    }

    request.user = {
      partner: validated.partner,
      credential: validated.credential,
    };

    return true;
  }
}
