import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConnectivitySettingsService } from './connectivity-settings.service';
import { ConnectivityCredentialEnv, ConnectivityEventStatus } from '@prisma/client';

@Injectable()
export class ConnectivitySandboxService {
  private readonly logger = new Logger(ConnectivitySandboxService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly settingsService: ConnectivitySettingsService,
  ) {}

  /**
   * Enforces two-way environment isolation:
   * - SANDBOX keys (rg_test_...) ➔ Restricted strictly to TEST-PROP-001.
   * - PRODUCTION keys (rg_live_...) ➔ Restricted strictly to live hotel properties (code !== TEST-PROP-001).
   */
  validateEnvironmentPropertyAccess(credentialEnv: string | undefined | null, propertyCode: string) {
    const sandboxCode = this.settingsService.getSandboxPropertyCode();
    const isSandboxEnv = credentialEnv === ConnectivityCredentialEnv.SANDBOX || credentialEnv === 'SANDBOX';
    const isSandboxProperty = propertyCode === sandboxCode;

    if (isSandboxEnv && !isSandboxProperty) {
      throw new ForbiddenException('Sandbox API keys (rg_test_...) are restricted to Sandbox Test Properties only.');
    }
    if (!isSandboxEnv && isSandboxProperty) {
      throw new ForbiddenException('Production API keys (rg_live_...) cannot access Sandbox Test Properties.');
    }
  }

  /**
   * Triggers a safe test webhook event (PING) to verify partner URL reachability & HMAC signature validation.
   * Reuses the existing Phase 5B delivery pipeline (ConnectivityOutbox ➔ Scheduler ➔ HMAC Signer ➔ HTTP POST).
   */
  async triggerTestWebhook(partnerId: string, isPartnerSelfService = false, credentialEnv?: string) {
    if (isPartnerSelfService && credentialEnv !== ConnectivityCredentialEnv.SANDBOX && credentialEnv !== 'SANDBOX') {
      throw new ForbiddenException('Sandbox webhook testing is only available for SANDBOX credentials.');
    }

    const sandboxCode = this.settingsService.getSandboxPropertyCode();
    const connection = await this.prisma.connectivityPartnerConnection.findFirst({
      where: {
        partnerId,
        OR: [
          { propertyId: sandboxCode },
          { property: { slug: sandboxCode } },
        ],
      },
    });

    if (!connection) {
      throw new NotFoundException(`No active sandbox connection found between partner ${partnerId} and test property ${sandboxCode}.`);
    }

    const outboxEvent = await this.prisma.connectivityOutbox.create({
      data: {
        partnerId,
        connectionId: connection.id,
        eventType: 'PING',
        aggregateId: `SANDBOX:PING:${Date.now()}`,
        payload: {
          changeType: 'SANDBOX_TEST',
          ping: 'RouteGuide Connectivity Webhook Signature Verification',
          timestamp: new Date().toISOString(),
          externalPropertyId: connection.externalPropertyId,
        },
        status: ConnectivityEventStatus.PENDING,
        retryCount: 0,
        maxRetries: 5,
      },
    });

    this.logger.log(`Dispatched Sandbox Test Webhook Event [${outboxEvent.id}] for Partner [${partnerId}]`);

    return {
      status: 'QUEUED',
      eventId: outboxEvent.id,
      eventType: 'PING',
      aggregateId: outboxEvent.aggregateId,
      partnerId,
      connectionId: connection.id,
      message: 'Test webhook event enqueued in outbox for Phase 5B delivery processing.',
    };
  }

  /**
   * Resets mock sandbox test data (bookings, rules, outbox test events) for a partner on TEST-PROP-001.
   * Executed atomically inside a single Prisma transaction block.
   */
  async resetSandboxData(partnerId: string, isPartnerSelfService = false, credentialEnv?: string) {
    if (isPartnerSelfService && credentialEnv !== ConnectivityCredentialEnv.SANDBOX && credentialEnv !== 'SANDBOX') {
      throw new ForbiddenException('Sandbox data reset is only available for SANDBOX credentials.');
    }

    const sandboxCode = this.settingsService.getSandboxPropertyCode();
    const sandboxProperty = await this.prisma.property.findFirst({
      where: {
        OR: [
          { id: sandboxCode },
          { slug: sandboxCode },
        ],
      },
    });

    if (!sandboxProperty) {
      throw new NotFoundException(`Sandbox Test Property with code '${sandboxCode}' not found.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Delete mapping entries for this partner on TEST-PROP-001
      const mappingsDeleted = await tx.connectivityReservationMapping.deleteMany({
        where: {
          partnerId,
          externalPropertyId: { in: [sandboxCode, 'EXT-PROP-001'] },
        },
      });

      // 2. Delete test pricing rules created for TEST-PROP-001
      const pricingRulesDeleted = await tx.pricingRule.deleteMany({
        where: {
          roomType: { propertyId: sandboxProperty.id },
          name: { contains: 'External rate sync' },
        },
      });

      // 3. Delete restriction rules created for TEST-PROP-001
      const restrictionRulesDeleted = await (tx as any).restrictionRule.deleteMany({
        where: { propertyId: sandboxProperty.id },
      });

      // 4. Delete test outbox events (PING or SANDBOX: aggregateId) for this partner
      const outboxDeleted = await tx.connectivityOutbox.deleteMany({
        where: {
          partnerId,
          OR: [
            { eventType: 'PING' },
            { aggregateId: { startsWith: 'SANDBOX:' } },
          ],
        },
      });

      return {
        mappingsDeleted: mappingsDeleted.count,
        pricingRulesDeleted: pricingRulesDeleted.count,
        restrictionRulesDeleted: restrictionRulesDeleted.count,
        outboxEventsCleared: outboxDeleted.count,
      };
    });

    this.logger.log(`Reset Sandbox Data for Partner [${partnerId}] on Property [${sandboxCode}]: ${JSON.stringify(result)}`);

    return {
      status: 'SUCCESS',
      partnerId,
      propertyCode: sandboxCode,
      resetSummary: result,
      message: 'Sandbox test data reset cleanly to baseline state.',
    };
  }
}
