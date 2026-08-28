import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivityLogDirection } from '@prisma/client';

export interface CreateLogParams {
  partnerId: string;
  connectionId?: string;
  direction?: ConnectivityLogDirection;
  endpoint: string;
  method: string;
  statusCode: number;
  requestPayload?: any;
  responsePayload?: any;
  ipAddress?: string;
}

@Injectable()
export class ConnectivityLogService {
  private readonly logger = new Logger(ConnectivityLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createLog(params: CreateLogParams) {
    try {
      return await this.prisma.connectivityLog.create({
        data: {
          partnerId: params.partnerId,
          connectionId: params.connectionId || null,
          direction: params.direction || ConnectivityLogDirection.INBOUND,
          endpoint: params.endpoint,
          method: params.method,
          statusCode: params.statusCode,
          requestPayload: params.requestPayload ?? undefined,
          responsePayload: params.responsePayload ?? undefined,
          ipAddress: params.ipAddress || null,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to create connectivity log: ${err.message}`);
    }
  }

  async getLogs(partnerId?: string, connectionId?: string, limit = 50) {
    return this.prisma.connectivityLog.findMany({
      where: {
        ...(partnerId ? { partnerId } : {}),
        ...(connectionId ? { connectionId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }
}
