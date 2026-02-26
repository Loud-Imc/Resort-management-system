import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CurrenciesService implements OnModuleInit {
    private readonly logger = new Logger(CurrenciesService.name);
    private readonly BASE_CURRENCY = 'INR';
    private readonly API_URL = 'https://api.exchangerate-api.com/v4/latest/INR';

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        try {
            await this.seedCurrencies();
            // Automatically update rates on startup
            await this.updateAllRates();
        } catch (error) {
            this.logger.warn(`⚠️ Could not initialize currencies: ${error.message}`);
        }
    }

    private async seedCurrencies() {
        const initialCurrencies = [
            { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
            { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
            { code: 'USD', symbol: '$', name: 'US Dollar' },
            { code: 'EUR', symbol: '€', name: 'Euro' },
            { code: 'GBP', symbol: '£', name: 'British Pound' },
            { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
            { code: 'QAR', symbol: 'QAR', name: 'Qatari Riyal' },
            { code: 'OMR', symbol: 'OMR', name: 'Omani Rial' },
            { code: 'KWD', symbol: 'KWD', name: 'Kuwaiti Dinar' },
            { code: 'BHD', symbol: 'BHD', name: 'Bahraini Dinar' },
        ];

        for (const cur of initialCurrencies) {
            await this.prisma.currency.upsert({
                where: { code: cur.code },
                update: {},
                create: {
                    code: cur.code,
                    symbol: cur.symbol,
                    rateToINR: 1.0, // Default, will be updated by updateAllRates
                    isActive: true,
                },
            });
        }
    }

    async updateAllRates() {
        this.logger.log('Updating exchange rates from API...');
        try {
            const response = await fetch(this.API_URL);
            if (!response.ok) throw new Error(`API returned ${response.status}`);
            
            const data = await response.json();
            const rates = data.rates;

            if (!rates) throw new Error('Invalid API response: rates not found');

            // The API returns rates relative to INR (e.g., USD: 0.012)
            // But our DB stores rateToINR (e.g., 1 USD = 83 INR)
            // So we need: 1 / rateFromAPI
            
            const activeCurrencies = await this.prisma.currency.findMany();
            
            for (const currency of activeCurrencies) {
                if (currency.code === this.BASE_CURRENCY) continue;

                const rateFromAPI = rates[currency.code];
                if (rateFromAPI) {
                    const rateToINR = 1 / rateFromAPI;
                    await this.prisma.currency.update({
                        where: { code: currency.code },
                        data: { 
                            rateToINR: Number(rateToINR.toFixed(4)),
                            updatedAt: new Date()
                        },
                    });
                }
            }
            this.logger.log('Exchange rates updated successfully.');
        } catch (error) {
            this.logger.error(`Failed to update exchange rates: ${error.message}`);
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
