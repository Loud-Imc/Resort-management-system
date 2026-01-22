"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let MarketingService = class MarketingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getStats(userId) {
        const addedProperties = await this.prisma.property.findMany({
            where: { addedById: userId },
            select: {
                id: true,
                marketingCommission: true,
                commissionStatus: true,
            },
        });
        const totalProperties = addedProperties.length;
        const totalEarnings = addedProperties
            .filter(p => p.commissionStatus === 'PAID')
            .reduce((sum, p) => sum + Number(p.marketingCommission), 0);
        const pendingEarnings = addedProperties
            .filter(p => p.commissionStatus === 'PENDING')
            .reduce((sum, p) => sum + Number(p.marketingCommission), 0);
        return {
            totalProperties,
            totalEarnings,
            pendingEarnings,
        };
    }
    async getMyProperties(userId) {
        return this.prisma.property.findMany({
            where: { addedById: userId },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                name: true,
                slug: true,
                city: true,
                state: true,
                isActive: true,
                isVerified: true,
                marketingCommission: true,
                commissionStatus: true,
                createdAt: true,
                images: true
            }
        });
    }
};
exports.MarketingService = MarketingService;
exports.MarketingService = MarketingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MarketingService);
//# sourceMappingURL=marketing.service.js.map