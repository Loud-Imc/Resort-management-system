import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrenciesService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        try {
            await this.seedCurrencies();
        } catch (error) {
            console.warn('⚠️ Could not seed currencies during initialization. This is normal during first migration.', error.message);
        }
    }

    private async seedCurrencies() {
        const currencies = [
            { code: 'INR', symbol: '₹', rateToINR: 1.0, isActive: true },
            { code: 'AED', symbol: 'AED', rateToINR: 22.70, isActive: true }, // 1 AED ≈ 22.7 INR
            { code: 'USD', symbol: '$', rateToINR: 83.00, isActive: true },
        ];

        for (const currency of currencies) {
            await this.prisma.currency.upsert({
                where: { code: currency.code },
                update: {},
                create: currency,
            });
        }
    }

    async getAll() {
        return this.prisma.currency.findMany({
            where: { isActive: true },
        });
    }

    async getRate(code: string) {
        const currency = await this.prisma.currency.findUnique({
            where: { code },
        });
        return Number(currency?.rateToINR || 1);
    }

    async convert(amount: number, from: string, to: string) {
        if (from === to) return amount;

        const fromRate = await this.getRate(from);
        const toRate = await this.getRate(to);

        // Convert to INR first, then to target
        const inINR = amount * fromRate;
        return inINR / toRate;
    }

    async updateRate(code: string, rateToINR: number) {
        return this.prisma.currency.update({
            where: { code },
            data: { rateToINR },
        });
    }
}
