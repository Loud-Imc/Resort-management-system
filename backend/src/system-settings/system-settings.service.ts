import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Default TTL for the settings cache (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SystemSettingsService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    // Simple in-process cache: key → { value, expiresAt }
    private readonly cache = new Map<string, { value: any; expiresAt: number }>();

    async onModuleInit() {
        await this.ensureDefaultSettings();
    }

    private async ensureDefaultSettings() {
        const defaultSettings = [
            {
                key: 'GST_TIERS',
                value: [
                    { min: 0, max: 1000, rate: 0 },
                    { min: 1001, max: 7500, rate: 12 },
                    { min: 7501, max: null, rate: 18 }
                ],
                description: 'GST tax tiers based on room tariff per night'
            },
            {
                key: 'LOYALTY_POINTS_PER_UNIT',
                value: 1,
                description: 'Number of loyalty points earned per unit amount spent (based on unitAmount).'
            },
            {
                key: 'LOYALTY_UNIT_AMOUNT',
                value: 100,
                description: 'The unit amount (in INR) used for point calculation. e.g., if set to 100, and pointsPerUnit is 1, then ₹100 = 1 point.'
            },
            {
                key: 'MAX_DISCOUNT_PCT',
                value: 30,
                description: 'Global maximum combined discount percentage allowed on any booking (offer + referral + coupon). Changeable from admin panel.'
            },
            {
                key: 'DEFAULT_COMMISSION_RATE',
                value: 10.0,
                description: 'Global default commission rate for Channel Partners if no tier, property, or partner-specific overrides exist.'
            },
            {
                key: 'DEFAULT_PLATFORM_COMMISSION',
                value: 10.0,
                description: 'Global default platform commission rate for properties during registration.'
            },
            {
                key: 'PAYOUT_COOLING_HOURS',
                value: 24,
                description: 'Cooling period (in hours) after checkout before a property settlement can be approved.'
            },
            {
                key: 'PARTIAL_PAYMENT_PCT',
                value: 33.33,
                description: 'The percentage of the total amount required for a partial payment booking advance.'
            },
            {
                key: 'PAYOUT_FREQUENCY',
                value: 'Monthly',
                description: 'Global payout frequency for Channel Partners (e.g., Weekly, Monthly).'
            },
            {
                key: 'ONLINE_PAYMENT_DISCOUNT_PCT',
                value: 5,
                description: 'Discount percentage offered to "Pay at Property" customers who choose to pay online before check-in.'
            },
            {
                key: 'SEARCH_RADIUS',
                value: 50,
                description: 'Default radius (in km) used for nearby property discovery and recommendations.'
            },
            {
                key: 'AUTO_NO_SHOW_HOURS',
                value: 6,
                description: 'Grace period (in hours) after the scheduled check-in time before marking an unarrived guest booking as NO_SHOW.'
            },
            {
                key: 'AUTO_CHECKOUT_HOURS',
                value: 2,
                description: 'Grace period (in hours) after the scheduled check-out time before automatically checking out guests.'
            },
            {
                key: 'INVOICE_GUEST_INSTRUCTIONS',
                value: [
                    'Please carry a valid photo ID for all guests.',
                    'Standard check-in is 2 PM. Early check-in is subject to availability.',
                    'Cancellation policy applies as per the selected rate plan.',
                    'For any assistance, contact the resort at {{PROPERTY_PHONE}}'
                ],
                description: 'Important information/instructions displayed on the guest invoice. Use {{PROPERTY_PHONE}} to inject the property contact number.'
            }
        ];

        for (const setting of defaultSettings) {
            const existing = await this.prisma.globalSetting.findUnique({
                where: { key: setting.key }
            });

            if (!existing) {
                await this.prisma.globalSetting.create({
                    data: setting
                });
            }
        }
    }

    /**
     * Fetch a setting by key, served from in-process cache for CACHE_TTL_MS.
     * Falls back to DB on cache miss or expiry.
     */
    async getSetting(key: string) {
        const now = Date.now();
        const cached = this.cache.get(key);
        if (cached && now < cached.expiresAt) {
            return cached.value;
        }

        const setting = await this.prisma.globalSetting.findUnique({ where: { key } });
        const value = setting?.value ?? null;

        this.cache.set(key, { value, expiresAt: now + CACHE_TTL_MS });
        return value;
    }

    async getAllSettings() {
        return this.prisma.globalSetting.findMany();
    }

    async updateSetting(key: string, value: any, description?: string) {
        // Invalidate cache on update so next fetch picks up the new value immediately
        this.cache.delete(key);

        return this.prisma.globalSetting.upsert({
            where: { key },
            update: { value, ...(description && { description }) },
            create: { key, value, description }
        });
    }

    /** Manually invalidate the cache for a specific key (or all if no key given) */
    invalidateCache(key?: string) {
        if (key) {
            this.cache.delete(key);
        } else {
            this.cache.clear();
        }
    }
}
