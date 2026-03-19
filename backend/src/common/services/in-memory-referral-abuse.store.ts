import { Injectable } from '@nestjs/common';
import { IReferralAbuseStore } from './referral-abuse-store.interface';

interface StoreEntry {
    count: number;
    windowStart: number;
    timer: NodeJS.Timeout; // auto-expiry handle
}

/**
 * InMemoryReferralAbuseStore
 *
 * Default implementation of IReferralAbuseStore using a plain in-process Map.
 * Each entry carries a setTimeout handle that auto-removes it after WINDOW_MS,
 * so memory is always reclaimed without any manual scheduler.
 *
 * Suitable for single-instance deployments. 
 *
 * To switch to Redis: implement IReferralAbuseStore using ioredis and register
 * it in the module with `{ provide: REFERRAL_ABUSE_STORE, useClass: RedisReferralAbuseStore }`.
 */
@Injectable()
export class InMemoryReferralAbuseStore implements IReferralAbuseStore {
    private readonly WINDOW_MS = 60_000; // 60-second rolling window
    private readonly store = new Map<string, StoreEntry>();

    async increment(key: string): Promise<number> {
        const now = Date.now();
        const existing = this.store.get(key);

        if (!existing || now - existing.windowStart > this.WINDOW_MS) {
            // Cancel any stale timer and open a fresh window
            if (existing) clearTimeout(existing.timer);
            const timer = setTimeout(() => this.store.delete(key), this.WINDOW_MS);
            this.store.set(key, { count: 1, windowStart: now, timer });
            return 1;
        }

        // Still within the same window — bump count, extend timer
        clearTimeout(existing.timer);
        const remainingMs = this.WINDOW_MS - (now - existing.windowStart);
        existing.count++;
        existing.timer = setTimeout(() => this.store.delete(key), remainingMs);
        this.store.set(key, existing);
        return existing.count;
    }

    async reset(key: string): Promise<void> {
        const entry = this.store.get(key);
        if (entry) {
            clearTimeout(entry.timer); // cancel the scheduled cleanup
            this.store.delete(key);
        }
    }

    async getCount(key: string): Promise<number> {
        const now = Date.now();
        const entry = this.store.get(key);
        if (!entry || now - entry.windowStart > this.WINDOW_MS) return 0;
        return entry.count;
    }
}
