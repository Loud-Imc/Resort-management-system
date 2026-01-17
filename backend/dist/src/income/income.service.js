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
exports.IncomeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const audit_service_1 = require("../audit/audit.service");
let IncomeService = class IncomeService {
    prisma;
    auditService;
    constructor(prisma, auditService) {
        this.prisma = prisma;
        this.auditService = auditService;
    }
    async create(createIncomeDto, userId) {
        const { amount, description, source, date, bookingId } = createIncomeDto;
        const income = await this.prisma.income.create({
            data: {
                amount,
                description,
                source: source,
                date: date ? new Date(date) : new Date(),
                bookingId,
            },
            include: {
                booking: {
                    select: {
                        bookingNumber: true,
                    },
                },
            },
        });
        await this.auditService.createLog({
            action: 'CREATE',
            entity: 'Income',
            entityId: income.id,
            userId,
            newValue: income,
        });
        return income;
    }
    async findAll(filters) {
        return this.prisma.income.findMany({
            where: {
                source: filters?.source,
                bookingId: filters?.bookingId,
                date: {
                    gte: filters?.startDate,
                    lte: filters?.endDate,
                },
            },
            include: {
                booking: {
                    select: {
                        bookingNumber: true,
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                date: 'desc',
            },
        });
    }
    async findOne(id) {
        const income = await this.prisma.income.findUnique({
            where: { id },
            include: {
                booking: {
                    include: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                        roomType: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        if (!income) {
            throw new common_1.NotFoundException('Income record not found');
        }
        return income;
    }
    async update(id, updateIncomeDto, userId) {
        const income = await this.findOne(id);
        const updated = await this.prisma.income.update({
            where: { id },
            data: {
                amount: updateIncomeDto.amount,
                description: updateIncomeDto.description,
                source: updateIncomeDto.source,
                date: updateIncomeDto.date ? new Date(updateIncomeDto.date) : undefined,
            },
        });
        await this.auditService.createLog({
            action: 'UPDATE',
            entity: 'Income',
            entityId: id,
            userId,
            oldValue: income,
            newValue: updated,
        });
        return updated;
    }
    async remove(id, userId) {
        const income = await this.findOne(id);
        await this.prisma.income.delete({
            where: { id },
        });
        await this.auditService.createLog({
            action: 'DELETE',
            entity: 'Income',
            entityId: id,
            userId,
            oldValue: income,
        });
        return { message: 'Income record deleted successfully' };
    }
    async getSummary(startDate, endDate) {
        const incomes = await this.prisma.income.findMany({
            where: {
                date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
        });
        const totalIncome = incomes.reduce((sum, inc) => sum + Number(inc.amount), 0);
        const bySource = incomes.reduce((acc, inc) => {
            const source = inc.source;
            if (!acc[source]) {
                acc[source] = 0;
            }
            acc[source] += Number(inc.amount);
            return acc;
        }, {});
        return {
            totalIncome,
            incomeCount: incomes.length,
            bySource,
            incomes,
        };
    }
};
exports.IncomeService = IncomeService;
exports.IncomeService = IncomeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        audit_service_1.AuditService])
], IncomeService);
//# sourceMappingURL=income.service.js.map