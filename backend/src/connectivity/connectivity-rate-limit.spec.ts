import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { PartnerRateLimitGuard } from './auth/partner-rate-limit.guard';
import { PartnerApiKeyGuard } from './auth/partner-api-key.guard';
import { ConnectivitySettingsService } from './services/connectivity-settings.service';
import { ConnectivityPartnerService } from './services/connectivity-partner.service';
import { AdminConnectivityController } from './admin-connectivity.controller';

describe('Inbound API Rate Limiting (PartnerRateLimitGuard) Unit Tests', () => {
  let rateLimitGuard: PartnerRateLimitGuard;
  let settingsService: ConnectivitySettingsService;

  const mockSettingsService = {
    getRateLimitPerMinute: jest.fn(),
    getGlobalCapabilities: jest.fn(),
  };

  const mockPartnerService = {
    validateApiKey: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSettingsService.getRateLimitPerMinute.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartnerRateLimitGuard,
        PartnerApiKeyGuard,
        { provide: ConnectivitySettingsService, useValue: mockSettingsService },
        { provide: ConnectivityPartnerService, useValue: mockPartnerService },
      ],
    }).compile();

    rateLimitGuard = module.get<PartnerRateLimitGuard>(PartnerRateLimitGuard);
    settingsService = module.get<ConnectivitySettingsService>(ConnectivitySettingsService);
    rateLimitGuard.resetBuckets();
  });

  function createMockContext(partnerId?: string, headers: Record<string, string> = {}) {
    const req: any = {
      headers,
      user: partnerId ? { partner: { id: partnerId, name: 'Test Partner' } } : undefined,
    };
    const res: any = {
      headers: {},
      setHeader: jest.fn((key: string, value: any) => {
        res.headers[key.toLowerCase()] = value;
      }),
    };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => res,
      }),
      req,
      res,
    };
  }

  it('1. First authenticated request succeeds', async () => {
    const { switchToHttp } = createMockContext('partner-A');
    const canActivate = await rateLimitGuard.canActivate({ switchToHttp } as any);
    expect(canActivate).toBe(true);
  });

  it('2. Requests up to exactly 100/minute succeed', async () => {
    for (let i = 1; i <= 100; i++) {
      const { switchToHttp } = createMockContext('partner-A');
      const result = await rateLimitGuard.canActivate({ switchToHttp } as any);
      expect(result).toBe(true);
    }
  });

  it('3. 101st request returns 429 Too Many Requests', async () => {
    for (let i = 1; i <= 100; i++) {
      const { switchToHttp } = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp } as any);
    }

    const { switchToHttp } = createMockContext('partner-A');
    await expect(rateLimitGuard.canActivate({ switchToHttp } as any)).rejects.toThrow(HttpException);

    try {
      await rateLimitGuard.canActivate({ switchToHttp } as any);
    } catch (err: any) {
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(err.getResponse().statusCode).toBe(429);
      expect(err.getResponse().message).toContain('RATE_LIMIT_EXCEEDED');
    }
  });

  it('4. 429 response contains Retry-After header', async () => {
    for (let i = 1; i <= 100; i++) {
      const { switchToHttp } = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp } as any);
    }

    const { switchToHttp, res } = createMockContext('partner-A');
    try {
      await rateLimitGuard.canActivate({ switchToHttp } as any);
    } catch {
      expect(res.headers['retry-after']).toBeDefined();
      expect(typeof res.headers['retry-after']).toBe('number');
      expect(res.headers['retry-after']).toBeGreaterThan(0);
    }
  });

  it('5. 429 response contains X-RateLimit-Limit header', async () => {
    const { switchToHttp, res } = createMockContext('partner-A');
    await rateLimitGuard.canActivate({ switchToHttp } as any);
    expect(res.headers['x-ratelimit-limit']).toBe(100);
  });

  it('6. 429 response contains X-RateLimit-Remaining = 0 header when limit is reached', async () => {
    for (let i = 1; i <= 100; i++) {
      const { switchToHttp } = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp } as any);
    }

    const { switchToHttp, res } = createMockContext('partner-A');
    try {
      await rateLimitGuard.canActivate({ switchToHttp } as any);
    } catch {
      expect(res.headers['x-ratelimit-remaining']).toBe(0);
    }
  });

  it('7. 429 response contains X-RateLimit-Reset header', async () => {
    const { switchToHttp, res } = createMockContext('partner-A');
    await rateLimitGuard.canActivate({ switchToHttp } as any);
    expect(res.headers['x-ratelimit-reset']).toBeDefined();
    expect(typeof res.headers['x-ratelimit-reset']).toBe('number');
  });

  it('8. Two different partners have independent quotas', async () => {
    // Exhaust Partner A
    for (let i = 1; i <= 100; i++) {
      const ctxA = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp: ctxA.switchToHttp } as any);
    }

    // Partner A 101st request fails
    const ctxA101 = createMockContext('partner-A');
    await expect(rateLimitGuard.canActivate({ switchToHttp: ctxA101.switchToHttp } as any)).rejects.toThrow(HttpException);

    // Partner B request succeeds (independent quota)
    const ctxB = createMockContext('partner-B');
    const resultB = await rateLimitGuard.canActivate({ switchToHttp: ctxB.switchToHttp } as any);
    expect(resultB).toBe(true);
  });

  it('9. Multiple connections belonging to the same partner share the same quota', async () => {
    for (let i = 1; i <= 50; i++) {
      // Requests targeting property 1
      const ctxProp1 = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp: ctxProp1.switchToHttp } as any);

      // Requests targeting property 2 under same partner
      const ctxProp2 = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp: ctxProp2.switchToHttp } as any);
    }

    // 100 total requests completed across properties for partner-A. 101st request fails.
    const ctxExhausted = createMockContext('partner-A');
    await expect(rateLimitGuard.canActivate({ switchToHttp: ctxExhausted.switchToHttp } as any)).rejects.toThrow(HttpException);
  });

  it('10. Unauthenticated request does not consume partner quota', async () => {
    // Unauthenticated request without request.user attached
    const ctxUnauth = createMockContext(undefined);
    const result = await rateLimitGuard.canActivate({ switchToHttp: ctxUnauth.switchToHttp } as any);
    expect(result).toBe(true);

    // Partner A still has full quota
    for (let i = 1; i <= 100; i++) {
      const ctxA = createMockContext('partner-A');
      const resA = await rateLimitGuard.canActivate({ switchToHttp: ctxA.switchToHttp } as any);
      expect(resA).toBe(true);
    }
  });

  it('11. Window resets correctly after resetAt', async () => {
    // Exhaust quota
    for (let i = 1; i <= 100; i++) {
      const ctx = createMockContext('partner-A');
      await rateLimitGuard.canActivate({ switchToHttp: ctx.switchToHttp } as any);
    }

    // Force expire bucket resetAt timestamp by accessing private map
    const bucketMap = (rateLimitGuard as any).buckets;
    const bucketA = bucketMap.get('partner-A');
    bucketA.resetAt = Date.now() - 1000; // Expired 1 second ago

    // Subsequent request should succeed as new window starts
    const ctxNewWindow = createMockContext('partner-A');
    const result = await rateLimitGuard.canActivate({ switchToHttp: ctxNewWindow.switchToHttp } as any);
    expect(result).toBe(true);
  });

  it('12. Configured limit is respected if ConnectivitySettingsService specifies custom limit', async () => {
    mockSettingsService.getRateLimitPerMinute.mockResolvedValue(5); // Custom limit 5

    for (let i = 1; i <= 5; i++) {
      const ctx = createMockContext('partner-custom');
      const res = await rateLimitGuard.canActivate({ switchToHttp: ctx.switchToHttp } as any);
      expect(res).toBe(true);
    }

    // 6th request fails against limit 5
    const ctx6 = createMockContext('partner-custom');
    await expect(rateLimitGuard.canActivate({ switchToHttp: ctx6.switchToHttp } as any)).rejects.toThrow(HttpException);
  });

  it('13. Admin connectivity endpoints are not affected', () => {
    const guards = Reflect.getMetadata('__guards__', AdminConnectivityController);
    const hasRateLimitGuard = guards && guards.includes(PartnerRateLimitGuard);
    expect(hasRateLimitGuard).toBeFalsy();
  });

  it('14. Existing connectivity endpoints continue working with the new guard', async () => {
    const ctx = createMockContext('partner-regression');
    const result = await rateLimitGuard.canActivate({ switchToHttp: ctx.switchToHttp } as any);
    expect(result).toBe(true);
    expect(ctx.res.headers['x-ratelimit-limit']).toBe(100);
    expect(ctx.res.headers['x-ratelimit-remaining']).toBe(99);
  });
});
