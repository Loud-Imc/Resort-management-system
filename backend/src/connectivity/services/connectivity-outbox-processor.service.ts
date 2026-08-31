import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivityLogService } from './connectivity-log.service';
import * as crypto from 'crypto';

export interface WebhookValidationResult {
  valid: boolean;
  reason?: string;
}

export interface DeliveryResult {
  status: 'DELIVERED' | 'FAILED_PERMANENT' | 'RETRYING' | 'FAILED_DEAD_LETTER' | 'ERROR';
  statusCode?: number;
  error?: string;
}

@Injectable()
export class ConnectivityOutboxProcessorService {
  private readonly logger = new Logger(ConnectivityOutboxProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: ConnectivityLogService,
  ) {}

  /**
   * Validate webhook URL against SSRF rules and protocol requirements
   */
  validateDestinationUrl(urlStr: string): WebhookValidationResult {
    if (!urlStr || typeof urlStr !== 'string') {
      return { valid: false, reason: 'URL is missing or empty' };
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(urlStr);
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }

    const isProd = process.env.NODE_ENV === 'production';
    if (isProd && parsedUrl.protocol !== 'https:') {
      return { valid: false, reason: 'HTTPS is required in production' };
    }

    const hostname = parsedUrl.hostname.toLowerCase();

    // Reject localhost & loopback addresses
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0'
    ) {
      return { valid: false, reason: 'Localhost and loopback destinations are rejected' };
    }

    // Reject private IP ranges
    if (
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname === '169.254.169.254' ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
    ) {
      return { valid: false, reason: 'Private network and metadata IP destinations are rejected' };
    }

    return { valid: true };
  }

  /**
   * Secure HMAC-SHA256 signature generator for outbound webhooks
   */
  generateHmacSignature(payload: any, secret: string, timestamp: string): string {
    const signedMessage = `${timestamp}.${JSON.stringify(payload)}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(signedMessage)
      .digest('hex');
    return `t=${timestamp},v1=${signature}`;
  }

  /**
   * Resolve secret key for signing
   */
  resolveSecret(partner: any): string {
    if (partner?.webhookSecret) {
      return partner.webhookSecret;
    }
    if (process.env.CONNECTIVITY_WEBHOOK_SECRET) {
      return process.env.CONNECTIVITY_WEBHOOK_SECRET;
    }
    return 'oreedu_default_test_secret';
  }

  /**
   * Calculate exponential backoff delay based on current retry count
   * retryCount 0 (initial failed) -> Retry 1: 10s
   * retryCount 1 -> Retry 2: 60s
   * retryCount 2 -> Retry 3: 300s
   * retryCount 3 -> Retry 4: 1800s
   * retryCount 4 -> Retry 5: 7200s
   */
  calculateBackoffDelay(retryCount: number): number {
    switch (retryCount) {
      case 0:
        return 10; // 10s
      case 1:
        return 60; // 1m
      case 2:
        return 300; // 5m
      case 3:
        return 1800; // 30m
      case 4:
      default:
        return 7200; // 2h
    }
  }

  /**
   * Parse Retry-After header (seconds integer or HTTP date)
   * Caps maximum delay at 86,400 seconds (24 hours).
   */
  parseRetryAfter(retryAfterHeader: string | null | undefined): number | null {
    if (!retryAfterHeader || typeof retryAfterHeader !== 'string') {
      return null;
    }

    const trimmed = retryAfterHeader.trim();
    if (!trimmed) return null;

    // Check if integer seconds
    if (/^\d+$/.test(trimmed)) {
      const seconds = parseInt(trimmed, 10);
      if (isNaN(seconds) || seconds <= 0) return null;
      return Math.min(seconds, 86400); // Cap at 24h
    }

    // Attempt parsing HTTP date
    const dateMs = Date.parse(trimmed);
    if (!isNaN(dateMs)) {
      const diffSec = Math.ceil((dateMs - Date.now()) / 1000);
      if (diffSec <= 0) return 0;
      return Math.min(diffSec, 86400); // Cap at 24h
    }

    return null;
  }

  /**
   * Atomically claim PENDING, RETRYING, and stale PROCESSING outbox records,
   * respecting per-aggregate sequential ordering.
   */
  async claimNextBatch(limit: number = 10): Promise<string[]> {
    try {
      const rawResult: any[] = await this.prisma.$queryRaw`
        UPDATE connectivity_outbox
        SET status = 'PROCESSING', "updatedAt" = NOW()
        WHERE id IN (
          SELECT id FROM connectivity_outbox o1
          WHERE (
            (status IN ('PENDING', 'RETRYING') AND ("nextRetryAt" IS NULL OR "nextRetryAt" <= NOW()))
            OR (status = 'PROCESSING' AND "updatedAt" < NOW() - INTERVAL '15 minutes')
          )
          AND NOT EXISTS (
            SELECT 1 FROM connectivity_outbox o2
            WHERE o2."aggregateId" IS NOT NULL
              AND o2."aggregateId" = o1."aggregateId"
              AND o2."sequenceNumber" < o1."sequenceNumber"
              AND o2.status IN ('PENDING', 'RETRYING', 'PROCESSING')
          )
          ORDER BY "sequenceNumber" ASC
          LIMIT ${limit}
          FOR UPDATE SKIP LOCKED
        )
        RETURNING id;
      `;

      if (Array.isArray(rawResult)) {
        return rawResult.map((row) => row.id);
      }
      return [];
    } catch (err) {
      // Fallback for mock/test environments
      const allRecords = await this.prisma.connectivityOutbox.findMany({
        where: {
          OR: [
            {
              status: { in: ['PENDING', 'RETRYING'] },
              OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
            },
            {
              status: 'PROCESSING',
              updatedAt: { lt: new Date(Date.now() - 15 * 60 * 1000) },
            },
          ],
        },
        orderBy: { sequenceNumber: 'asc' },
      });

      const eligibleRecords: any[] = [];
      for (const rec of allRecords) {
        if (rec.aggregateId) {
          const earlierBlocker = await this.prisma.connectivityOutbox.findFirst({
            where: {
              aggregateId: rec.aggregateId,
              sequenceNumber: { lt: rec.sequenceNumber },
              status: { in: ['PENDING', 'RETRYING', 'PROCESSING'] },
            },
          });
          if (earlierBlocker) {
            continue; // Skip because an earlier event is blocked/processing
          }
        }
        eligibleRecords.push(rec);
        if (eligibleRecords.length >= limit) break;
      }

      const ids: string[] = [];
      for (const rec of eligibleRecords) {
        await this.prisma.connectivityOutbox.update({
          where: { id: rec.id },
          data: { status: 'PROCESSING' },
        });
        ids.push(rec.id);
      }
      return ids;
    }
  }

  /**
   * Process and deliver a single outbox record over HTTP with 5B-2a classification & backoff
   */
  async processOutboxRecord(recordId: string): Promise<DeliveryResult> {
    const record = await this.prisma.connectivityOutbox.findUnique({
      where: { id: recordId },
      include: { partner: true, connection: true },
    });

    if (!record) {
      return { status: 'FAILED_PERMANENT', error: 'Outbox record not found' };
    }

    // Resolve destination URL (Connection override || Partner fallback)
    const destinationUrl = record.connection?.webhookUrl || record.partner?.webhookUrl;

    if (!destinationUrl) {
      const errorMsg = 'No valid webhook URL configured for connection/partner';
      await this.prisma.connectivityOutbox.update({
        where: { id: record.id },
        data: { status: 'FAILED_PERMANENT', lastError: errorMsg },
      });
      await this.updateConnectionHealth(record.connectionId, 404, errorMsg);
      return { status: 'FAILED_PERMANENT', error: errorMsg };
    }

    // Validate SSRF and protocol rules
    const validation = this.validateDestinationUrl(destinationUrl);
    if (!validation.valid) {
      const errorMsg = `Insecure or invalid webhook URL: ${validation.reason}`;
      await this.prisma.connectivityOutbox.update({
        where: { id: record.id },
        data: { status: 'FAILED_PERMANENT', lastError: errorMsg },
      });
      await this.updateConnectionHealth(record.connectionId, 400, errorMsg);
      return { status: 'FAILED_PERMANENT', error: errorMsg };
    }

    // Format headers and HMAC signature
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const secret = this.resolveSecret(record.partner);
    const signatureHeader = this.generateHmacSignature(record.payload, secret, timestamp);

    const payloadObj: any = record.payload || {};
    const eventId = payloadObj.eventId || `evt-${record.id}`;
    const eventType = payloadObj.eventType || record.eventType;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Oreedu-Connectivity-Platform/1.0',
      'X-Oreedu-Signature': signatureHeader,
      'X-Oreedu-Event-Id': eventId,
      'X-Oreedu-Event-Type': eventType,
    };

    const startTime = Date.now();
    const jsonBody = JSON.stringify(record.payload);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

      const response = await fetch(destinationUrl, {
        method: 'POST',
        headers,
        body: jsonBody,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const responseText = await response.text();
      const truncatedResponse = responseText.slice(0, 2000);

      let responseJson: any = null;
      try {
        responseJson = JSON.parse(truncatedResponse);
      } catch {
        responseJson = { text: truncatedResponse };
      }

      // Log outbound delivery attempt (secrets excluded)
      await this.logService.createLog({
        partnerId: record.partnerId,
        connectionId: record.connectionId,
        direction: 'OUTBOUND',
        endpoint: destinationUrl,
        method: 'POST',
        statusCode: response.status,
        requestPayload: record.payload,
        responsePayload: responseJson,
      });

      // HTTP 2xx SUCCESS (200, 201, 202, 204)
      if (response.ok) {
        await this.prisma.connectivityOutbox.update({
          where: { id: record.id },
          data: {
            status: 'DELIVERED',
            deliveredAt: new Date(),
            lastError: null,
          },
        });

        // Restore Connection Health to ACTIVE
        await this.updateConnectionHealth(record.connectionId, response.status, null);

        return { status: 'DELIVERED', statusCode: response.status };
      }

      // Handle non-2xx HTTP failures
      const retryAfterHeader = response.headers.get('retry-after');
      return this.handleFailureResult(record, response.status, truncatedResponse, retryAfterHeader);
    } catch (err: any) {
      const duration = Date.now() - startTime;
      const errorMsg = err.name === 'AbortError' ? 'HTTP request timeout (10s)' : err.message;

      await this.logService.createLog({
        partnerId: record.partnerId,
        connectionId: record.connectionId,
        direction: 'OUTBOUND',
        endpoint: destinationUrl,
        method: 'POST',
        statusCode: 0,
        requestPayload: record.payload,
        responsePayload: { error: errorMsg },
      });

      return this.handleFailureResult(record, 0, errorMsg, null);
    }
  }

  /**
   * Evaluates HTTP status code classifications, exponential retries, dead-lettering, and connection health metrics.
   */
  private async handleFailureResult(
    record: any,
    statusCode: number,
    errorText: string,
    retryAfterHeader?: string | null,
  ): Promise<DeliveryResult> {
    const errorMsg = `HTTP ${statusCode}: ${errorText}`;

    // 1. PERMANENT FAILURES (400, 401, 403, 404, 409, 422)
    if ([400, 401, 403, 404, 409, 422].includes(statusCode)) {
      await this.prisma.connectivityOutbox.update({
        where: { id: record.id },
        data: {
          status: 'FAILED_PERMANENT',
          lastError: errorMsg,
        },
      });

      // Update Connection Health for Auth (401/403) and 404
      await this.updateConnectionHealth(record.connectionId, statusCode, errorMsg);

      return { status: 'FAILED_PERMANENT', statusCode, error: errorMsg };
    }

    // 2. RETRYABLE FAILURES (429, 500, 502, 503, 504, timeout, network)
    const currentRetry = record.retryCount || 0;
    const maxRetries = record.maxRetries || 5;

    // Check if max retries exceeded (Attempt 6 failed)
    if (currentRetry >= maxRetries) {
      const deadLetterError = `Max retries (${maxRetries}) exceeded. Last error: ${errorMsg}`;

      await this.prisma.connectivityOutbox.update({
        where: { id: record.id },
        data: {
          status: 'FAILED_DEAD_LETTER',
          lastError: deadLetterError,
        },
      });

      // Dead-Letter Aggregate Dependency Cascade:
      if (record.aggregateId) {
        await this.prisma.connectivityOutbox.updateMany({
          where: {
            aggregateId: record.aggregateId,
            sequenceNumber: { gt: record.sequenceNumber },
            status: { in: ['PENDING', 'RETRYING'] },
          },
          data: {
            status: 'FAILED_PERMANENT',
            lastError: 'Parent reservation event dead-lettered',
          },
        });
      }

      await this.updateConnectionHealth(record.connectionId, statusCode, deadLetterError);

      return { status: 'FAILED_DEAD_LETTER', statusCode, error: deadLetterError };
    }

    // Standard Retry Calculation
    let delaySeconds: number;
    if (statusCode === 429 && retryAfterHeader) {
      const parsed = this.parseRetryAfter(retryAfterHeader);
      delaySeconds = parsed !== null ? parsed : this.calculateBackoffDelay(currentRetry);
    } else {
      delaySeconds = this.calculateBackoffDelay(currentRetry);
    }

    const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);
    const newRetryCount = currentRetry + 1;

    await this.prisma.connectivityOutbox.update({
      where: { id: record.id },
      data: {
        status: 'RETRYING',
        retryCount: newRetryCount,
        nextRetryAt,
        lastError: errorMsg,
      },
    });

    await this.updateConnectionHealth(record.connectionId, statusCode, errorMsg, newRetryCount);

    return { status: 'RETRYING', statusCode, error: errorMsg };
  }

  /**
   * Updates partner connection health status based on delivery status & failure counts
   */
  private async updateConnectionHealth(
    connectionId: string | null | undefined,
    statusCode: number,
    errorMsg: string | null,
    consecutiveFailuresHint?: number,
  ) {
    if (!connectionId || !this.prisma.connectivityPartnerConnection) return;

    try {
      // HTTP 2xx SUCCESS (200, 201, 202, 204)
      if (statusCode >= 200 && statusCode < 300) {
        await this.prisma.connectivityPartnerConnection.update({
          where: { id: connectionId },
          data: {
            status: 'ACTIVE',
            lastSyncedAt: new Date(),
            lastError: null,
          },
        });
        return;
      }

      // Business validation failures (400, 409, 422) have NO health impact
      if ([400, 409, 422].includes(statusCode)) {
        return;
      }

      // Authentication Failures (401, 403) immediately degrade connection
      if (statusCode === 401 || statusCode === 403) {
        await this.prisma.connectivityPartnerConnection.update({
          where: { id: connectionId },
          data: {
            status: 'DEGRADED',
            lastFailedAt: new Date(),
            lastError: errorMsg || `Authentication failure (HTTP ${statusCode})`,
          },
        });
        return;
      }

      // 404, 429, 5xx, timeouts, transport errors
      const failureCount = consecutiveFailuresHint || 1;
      const isDegraded = failureCount >= 5;

      await this.prisma.connectivityPartnerConnection.update({
        where: { id: connectionId },
        data: {
          lastFailedAt: new Date(),
          lastError: errorMsg,
          ...(isDegraded ? { status: 'DEGRADED' } : {}),
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to update connection health for connection ${connectionId}: ${err.message}`);
    }
  }

  /**
   * Safely replays an outbox record stuck in FAILED_DEAD_LETTER status, restoring aggregate cascade failures.
   */
  async replayDeadLetterEvent(eventId: string) {
    const record = await this.prisma.connectivityOutbox.findUnique({
      where: { id: eventId },
    });

    if (!record) {
      throw new NotFoundException(`Outbox record ${eventId} not found`);
    }

    if (record.status !== 'FAILED_DEAD_LETTER') {
      throw new BadRequestException(
        `Only FAILED_DEAD_LETTER records can be replayed. Current status: ${record.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Reset target event to PENDING
      const replayed = await tx.connectivityOutbox.update({
        where: { id: record.id },
        data: {
          status: 'PENDING',
          retryCount: 0,
          nextRetryAt: new Date(),
          lastError: null,
        },
      });

      // 2. Cascade Safety: Restore dependent events stuck in FAILED_PERMANENT due to parent dead-letter cascade
      if (record.aggregateId) {
        await tx.connectivityOutbox.updateMany({
          where: {
            aggregateId: record.aggregateId,
            sequenceNumber: { gt: record.sequenceNumber },
            status: 'FAILED_PERMANENT',
            lastError: { contains: 'Parent reservation event dead-lettered' },
          },
          data: {
            status: 'PENDING',
            retryCount: 0,
            nextRetryAt: new Date(),
            lastError: null,
          },
        });
      }

      this.logger.log(`Admin replayed dead-letter outbox event [${record.id}] for aggregate [${record.aggregateId || 'N/A'}]`);
      return replayed;
    });
  }
}
