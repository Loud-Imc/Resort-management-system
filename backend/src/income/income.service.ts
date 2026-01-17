import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto, UpdateIncomeDto } from './dto/income.dto';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class IncomeService {
    constructor(
        private prisma: PrismaService,
        private auditService: AuditService,
    ) { }

    /**
     * Create income record
     */
    async create(createIncomeDto: CreateIncomeDto, userId: string) {
        const { amount, description, source, date, bookingId } = createIncomeDto;

        const income = await this.prisma.income.create({
            data: {
                amount,
                description,
                source: source as any,
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

    /**
     * Get all income records with filters
     */
    async findAll(filters?: {
        source?: string;
        startDate?: Date;
        endDate?: Date;
        bookingId?: string;
    }) {
        return this.prisma.income.findMany({
            where: {
                source: filters?.source as any,
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

    /**
     * Get income by ID
     */
    async findOne(id: string) {
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
            throw new NotFoundException('Income record not found');
        }

        return income;
    }

    /**
     * Update income
     */
    async update(id: string, updateIncomeDto: UpdateIncomeDto, userId: string) {
        const income = await this.findOne(id);

        const updated = await this.prisma.income.update({
            where: { id },
            data: {
                amount: updateIncomeDto.amount,
                description: updateIncomeDto.description,
                source: updateIncomeDto.source as any,
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

    /**
     * Delete income record
     */
    async remove(id: string, userId: string) {
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

    /**
     * Get income summary
     */
    async getSummary(startDate: Date, endDate: Date) {
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
        }, {} as Record<string, number>);

        return {
            totalIncome,
            incomeCount: incomes.length,
            bySource,
            incomes,
        };
    }
}
