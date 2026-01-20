import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async createLog(data: {
        action: string;
        entity: string;
        entityId: string;
        userId?: string;
        oldValue?: any;
        newValue?: any;
        ipAddress?: string;
        userAgent?: string;
        bookingId?: string;
    }) {
        return this.prisma.auditLog.create({
            data: {
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                userId: data.userId,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                bookingId: data.bookingId,
                oldValue: data.oldValue ? JSON.parse(JSON.stringify(data.oldValue)) : null,
                newValue: data.newValue ? JSON.parse(JSON.stringify(data.newValue)) : null,
            } as any,
        });
    }

    async getEntityLogs(entity: string, entityId: string) {
        return this.prisma.auditLog.findMany({
            where: { entity, entityId },
            include: { user: true },
            orderBy: { createdAt: 'desc' },
        });
    }
}
