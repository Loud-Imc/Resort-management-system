import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as os from 'os';
import { performance } from 'perf_hooks';

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
                    { min: 0, max: 7500, rate: 5 },
                    { min: 7500, max: null, rate: 18 }
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

    /**
     * Diagnostic health check for production database, disk space, memory, and OS uptime.
     */
    async getSystemHealth() {
        // 1. Database Health & Latency
        let dbStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
        let dbLatencyMs = 0;
        let dbSize = 'Unknown';
        let dbError: string | null = null;

        try {
            const start = performance.now();
            await this.prisma.$queryRaw`SELECT 1`;
            dbLatencyMs = Math.round(performance.now() - start);

            const sizeResult: any = await this.prisma.$queryRaw`
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            `;
            if (sizeResult && sizeResult[0]?.size) {
                dbSize = sizeResult[0].size;
            }

            if (dbLatencyMs > 250) {
                dbStatus = 'degraded';
            }
        } catch (err: any) {
            dbStatus = 'down';
            dbError = err?.message || 'Database query failed';
        }

        // 2. Disk Space (using Node native fs.statfsSync)
        let diskInfo = {
            totalGb: 0,
            freeGb: 0,
            usedGb: 0,
            usedPercentage: 0,
            status: 'healthy' as 'healthy' | 'warning' | 'critical',
        };

        try {
            const targetPath = process.platform === 'win32' ? process.cwd() : '/';
            const stats = fs.statfsSync(targetPath);
            const totalBytes = stats.bsize * stats.blocks;
            const freeBytes = stats.bsize * stats.bavail;
            const usedBytes = totalBytes - freeBytes;

            const totalGb = +(totalBytes / (1024 ** 3)).toFixed(2);
            const freeGb = +(freeBytes / (1024 ** 3)).toFixed(2);
            const usedGb = +(usedBytes / (1024 ** 3)).toFixed(2);
            const usedPercentage = totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0;

            let diskStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
            if (usedPercentage >= 90) {
                diskStatus = 'critical';
            } else if (usedPercentage >= 80) {
                diskStatus = 'warning';
            }

            diskInfo = {
                totalGb,
                freeGb,
                usedGb,
                usedPercentage,
                status: diskStatus,
            };
        } catch (err: any) {
            // Ignore error if statfs fails on unusual environments
        }

        // 3. Memory & OS
        const totalMemBytes = os.totalmem();
        const freeMemBytes = os.freemem();
        const usedMemBytes = totalMemBytes - freeMemBytes;
        const memUsedPercentage = Math.round((usedMemBytes / totalMemBytes) * 100);
        const processRssMb = +(process.memoryUsage().rss / (1024 * 1024)).toFixed(1);

        let memStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (memUsedPercentage >= 92) {
            memStatus = 'critical';
        } else if (memUsedPercentage >= 85) {
            memStatus = 'warning';
        }

        // 4. Overall Health Status
        let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';
        if (dbStatus === 'down' || diskInfo.status === 'critical' || memStatus === 'critical') {
            overallStatus = 'critical';
        } else if (dbStatus === 'degraded' || diskInfo.status === 'warning' || memStatus === 'warning') {
            overallStatus = 'warning';
        }

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptimeSeconds: Math.round(process.uptime()),
            uptimeFormatted: this.formatUptime(process.uptime()),
            database: {
                status: dbStatus,
                latencyMs: dbLatencyMs,
                size: dbSize,
                error: dbError,
            },
            disk: diskInfo,
            memory: {
                totalMb: Math.round(totalMemBytes / (1024 * 1024)),
                usedMb: Math.round(usedMemBytes / (1024 * 1024)),
                freeMb: Math.round(freeMemBytes / (1024 * 1024)),
                usedPercentage: memUsedPercentage,
                processRssMb,
                status: memStatus,
            },
            system: {
                nodeVersion: process.version,
                platform: process.platform,
                cpus: os.cpus().length,
            },
        };
    }

    private formatUptime(seconds: number): string {
        const days = Math.floor(seconds / (3600 * 24));
        const hours = Math.floor((seconds % (3600 * 24)) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const parts: string[] = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        parts.push(`${minutes}m`);
        return parts.join(' ');
    }
}
