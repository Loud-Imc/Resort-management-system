import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
    constructor(private prisma: PrismaService) {}

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

    async getSetting(key: string) {
        const setting = await this.prisma.globalSetting.findUnique({
            where: { key }
        });
        return setting?.value;
    }

    async getAllSettings() {
        return this.prisma.globalSetting.findMany();
    }

    async updateSetting(key: string, value: any, description?: string) {
        return this.prisma.globalSetting.upsert({
            where: { key },
            update: { value, ...(description && { description }) },
            create: { key, value, description }
        });
    }
}
