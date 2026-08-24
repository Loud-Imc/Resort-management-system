import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Optional,
} from '@nestjs/common';
import { ConnectivitySettingsService } from '../services/connectivity-settings.service';

export interface RateLimitBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class PartnerRateLimitGuard implements CanActivate {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    @Optional() private readonly settingsService?: ConnectivitySettingsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 1. Identify authenticated partner from request.user attached by PartnerApiKeyGuard
    const partnerId = request.user?.partner?.id;

    // Safety fallback: if partner object is absent, skip rate limiting
    if (!partnerId) {
      return true;
    }

    const now = Date.now();
    const windowMs = 60 * 1000; // 60-second window

    // Determine configured limit (default 100 requests per minute)
    let limit = 100;
    if (this.settingsService && typeof (this.settingsService as any).getRateLimitPerMinute === 'function') {
      try {
        const configured = await (this.settingsService as any).getRateLimitPerMinute();
        if (typeof configured === 'number' && configured > 0) {
          limit = configured;
        }
      } catch {
        limit = 100;
      }
    }

    // 2. Fetch or initialize in-memory partner bucket
    let bucket = this.buckets.get(partnerId);

    if (!bucket || now >= bucket.resetAt) {
      bucket = {
        count: 0,
        resetAt: now + windowMs,
      };
      this.buckets.set(partnerId, bucket);
    }

    // 3. Increment request count for this authenticated partner
    bucket.count += 1;

    const remaining = Math.max(0, limit - bucket.count);
    const resetSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    const resetTimestampSec = Math.ceil(bucket.resetAt / 1000);

    // 4. Attach standard rate-limit headers to response
    if (response && typeof response.setHeader === 'function') {
      response.setHeader('X-RateLimit-Limit', limit);
      response.setHeader('X-RateLimit-Remaining', remaining);
      response.setHeader('X-RateLimit-Reset', resetTimestampSec);
    }

    // 5. Exceeded quota check
    if (bucket.count > limit) {
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Retry-After', resetSec);
      }

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          error: 'Too Many Requests',
          message: `RATE_LIMIT_EXCEEDED: Partner API rate limit of ${limit} requests/minute exceeded. Please retry after ${resetSec} seconds.`,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Helper method for test suite bucket cleanup
   */
  resetBuckets(): void {
    this.buckets.clear();
  }
}
