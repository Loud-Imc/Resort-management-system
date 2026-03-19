import { Injectable, Inject, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { IReferralAbuseStore } from './referral-abuse-store.interface';
import { REFERRAL_ABUSE_STORE } from './referral-abuse-store.interface';

/**
 * ReferralAbuseService
 *
 * Business logic layer for referral brute-force protection.
 * Storage is abstracted behind IReferralAbuseStore so it can be swapped for
 * Redis or a DB without touching this service.
 *
 * Rules:
 *   - Only FAILED referral code lookups are tracked.
 *   - VALID code usage is never restricted (counter resets on success).
 *   - Limit: 10 invalid attempts per 60-second window per IP.
 */
@Injectable()
export class ReferralAbuseService {
    private readonly logger = new Logger(ReferralAbuseService.name);
    private readonly MAX_FAILURES = 10;

    constructor(
        @Inject(REFERRAL_ABUSE_STORE)
        private readonly store: IReferralAbuseStore,
    ) {}

    /**
     * Record a failed referral attempt for this IP.
     * Throws 429 Too Many Requests if the limit is exceeded.
     */
    async recordFailure(ip: string): Promise<void> {
        const count = await this.store.increment(ip);
        this.logger.debug(`Referral failure #${count} from IP ${ip}`);

        if (count > this.MAX_FAILURES) {
            this.logger.warn(`IP ${ip} exceeded referral validation limit (${count} failures). Blocking.`);
            throw new HttpException(
                `Too many invalid referral code attempts from this IP. Please wait 60 seconds before retrying.`,
                HttpStatus.TOO_MANY_REQUESTS,
            );
        }
    }

    /**
     * Reset the failure counter for an IP after a successful referral validation.
     * This ensures a legitimate user is never permanently penalized.
     */
    async resetFailures(ip: string): Promise<void> {
        await this.store.reset(ip);
    }

    /**
     * Check whether an IP is currently blocked (without incrementing).
     * Used for pre-check at entry points if needed.
     */
    async isBlocked(ip: string): Promise<boolean> {
        const count = await this.store.getCount(ip);
        return count > this.MAX_FAILURES;
    }
}
