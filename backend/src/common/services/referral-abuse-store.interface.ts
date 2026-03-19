/**
 * IReferralAbuseStore
 *
 * Abstract interface for the referral brute-force attempt storage.
 * The current default implementation is InMemoryReferralAbuseStore.
 *
 * To switch to Redis or a DB-backed store in the future:
 *   1. Create a class implementing this interface
 *   2. Register it in ChannelPartnersModule with `useClass`
 *   3. No changes needed to ReferralAbuseService business logic
 */
export interface IReferralAbuseStore {
    /**
     * Increment the failure counter for this key (e.g., IP address).
     * Returns the new count of failures in the current window.
     */
    increment(key: string): Promise<number>;

    /**
     * Reset the failure counter for a key (called on valid code found).
     */
    reset(key: string): Promise<void>;

    /**
     * Get the current failure count for a key without incrementing.
     */
    getCount(key: string): Promise<number>;
}

/** Injection token for the store */
export const REFERRAL_ABUSE_STORE = 'REFERRAL_ABUSE_STORE';
