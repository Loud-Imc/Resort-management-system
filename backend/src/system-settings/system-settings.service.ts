import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Default TTL for the settings cache (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class SystemSettingsService implements OnModuleInit {
    constructor(private prisma: PrismaService) {}

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
                key: 'LOYALTY_POINTS_PER_INR',
                value: 1,
                description: 'Number of loyalty points earned per 1 INR spent'
            },
            {
                key: 'MAX_DISCOUNT_PCT',
                value: 30,
                description: 'Global maximum combined discount percentage allowed on any booking (offer + referral + coupon). Changeable from admin panel.'
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
