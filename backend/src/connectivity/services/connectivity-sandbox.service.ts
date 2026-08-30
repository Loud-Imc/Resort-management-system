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
          connection: { propertyId: sandboxProperty.id },
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
      const restrictionRulesDeleted = await tx.stopSellRestriction.deleteMany({
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

  /**
   * Generates the official RouteGuide V1 Sandbox Postman Collection v2.1.0 object.
   */
  getPostmanCollection(baseUrl = 'http://localhost:3000') {
    return {
      info: {
        name: 'RouteGuide V1 Sandbox API Collection',
        description: 'Official RouteGuide V1 REST API Sandbox collection for external PMS and Channel Manager developers. Execute sequentially against TEST-PROP-001 to complete the 6 certification milestones.',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: '01. Ping Authentication',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: { raw: '{{baseUrl}}/api/connectivity/v1/ping', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'ping'] },
            description: 'Verify Partner API key authentication and connection status',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Status is 200 OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '02. Connect PMS to Property',
          request: {
            method: 'POST',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ externalPropertyId: '{{externalPropertyId}}' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/connections', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'connections'] },
            description: 'Connect a RouteGuide property using externalPropertyId. Completes Milestone 1.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Connection Created", function () { pm.expect([200, 201]).to.include(pm.response.code); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '03. Query Property Content & RoomTypes',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: {
              raw: '{{baseUrl}}/api/connectivity/v1/content?propertyId={{propertyId}}',
              host: ['{{baseUrl}}'],
              path: ['api', 'connectivity', 'v1', 'content'],
              query: [{ key: 'propertyId', value: '{{propertyId}}' }],
            },
            description: 'Query sanitized property listing content, RoomTypes, policies, and amenities',
          },
          event: [{
            listen: 'test',
            script: {
              exec: [
                'pm.test("Content Retrieved", function () { pm.response.to.have.status(200); });',
                'var jsonData = pm.response.json();',
                'if (jsonData.roomTypes && jsonData.roomTypes.length > 0) {',
                '    pm.environment.set("roomTypeId", jsonData.roomTypes[0].id);',
                '}',
              ],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '04. Create RoomType Mapping',
          request: {
            method: 'POST',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ externalRoomTypeId: '{{externalRoomTypeId}}', roomTypeId: '{{roomTypeId}}', externalRatePlanId: '{{externalRatePlanId}}' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/connections/{{propertyId}}/mappings/room-types', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'connections', '{{propertyId}}', 'mappings', 'room-types'] },
            description: 'Register or update RoomType mapping for a connected property. Completes Milestone 2.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Mapping Registered", function () { pm.expect([200, 201]).to.include(pm.response.code); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '05. Get RoomType Mappings',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: { raw: '{{baseUrl}}/api/connectivity/v1/connections/{{propertyId}}/mappings/room-types', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'connections', '{{propertyId}}', 'mappings', 'room-types'] },
            description: 'Get all RoomType mappings for a connected property',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Mappings Retrieved", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '06. Read Availability',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: {
              raw: '{{baseUrl}}/api/connectivity/v1/availability?propertyId={{propertyId}}&startDate=2026-09-01&endDate=2026-09-07',
              host: ['{{baseUrl}}'],
              path: ['api', 'connectivity', 'v1', 'availability'],
              query: [
                { key: 'propertyId', value: '{{propertyId}}' },
                { key: 'startDate', value: '2026-09-01' },
                { key: 'endDate', value: '2026-09-07' },
              ],
            },
            description: 'Query RoomType-level sellable availability',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Availability Query OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '07. Push Availability Update',
          request: {
            method: 'PUT',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                propertyId: '{{propertyId}}',
                availability: [
                  { externalRoomTypeId: '{{externalRoomTypeId}}', date: '2026-09-01', availableCount: 10 },
                  { externalRoomTypeId: '{{externalRoomTypeId}}', date: '2026-09-02', availableCount: 10 },
                ],
              }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/availability', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'availability'] },
            description: 'Create or update date-range external availability allocation caps',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Availability Push OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '08. Read Rates',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: {
              raw: '{{baseUrl}}/api/connectivity/v1/rates?propertyId={{propertyId}}&startDate=2026-09-01&endDate=2026-09-07',
              host: ['{{baseUrl}}'],
              path: ['api', 'connectivity', 'v1', 'rates'],
              query: [
                { key: 'propertyId', value: '{{propertyId}}' },
                { key: 'startDate', value: '2026-09-01' },
                { key: 'endDate', value: '2026-09-07' },
              ],
            },
            description: 'Query published rates for mapped RoomTypes',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Rates Query OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '09. Push Rates Update',
          request: {
            method: 'PUT',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                propertyId: '{{propertyId}}',
                rates: [
                  { externalRoomTypeId: '{{externalRoomTypeId}}', externalRatePlanId: '{{externalRatePlanId}}', startDate: '2026-09-01', endDate: '2026-09-07', amount: 5500, currency: 'INR' },
                ],
              }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/rates', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'rates'] },
            description: 'Create or update date-range rate rules from external PMS/Channel Manager',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Rates Push OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '10. Read Restrictions',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: {
              raw: '{{baseUrl}}/api/connectivity/v1/restrictions?propertyId={{propertyId}}&startDate=2026-09-01&endDate=2026-09-07',
              host: ['{{baseUrl}}'],
              path: ['api', 'connectivity', 'v1', 'restrictions'],
              query: [
                { key: 'propertyId', value: '{{propertyId}}' },
                { key: 'startDate', value: '2026-09-01' },
                { key: 'endDate', value: '2026-09-07' },
              ],
            },
            description: 'Query active restrictions for mapped RoomTypes',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Restrictions Query OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '11. Push Restrictions Update',
          request: {
            method: 'PUT',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                propertyId: '{{propertyId}}',
                restrictions: [
                  { externalRoomTypeId: '{{externalRoomTypeId}}', externalRatePlanId: '{{externalRatePlanId}}', startDate: '2026-09-01', endDate: '2026-09-07', minStay: 2, closedToArrival: false },
                ],
              }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/restrictions', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'restrictions'] },
            description: 'Create or update date-range restriction rules (Min Stay, CTA, CTD). Completes Milestone 3.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Restrictions Push OK", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '12. Ingest Reservation (Create)',
          request: {
            method: 'POST',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                externalPropertyId: '{{externalPropertyId}}',
                externalReservationId: '{{externalReservationId}}',
                externalRoomTypeId: '{{externalRoomTypeId}}',
                externalRatePlanId: '{{externalRatePlanId}}',
                checkInDate: '2026-09-01',
                checkOutDate: '2026-09-03',
                guestName: 'Jane Doe',
                guestEmail: 'jane@example.com',
                totalAmount: 11000,
                currency: 'INR',
              }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/reservations', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'reservations'] },
            description: 'Ingest external PMS / Channel Manager reservation',
          },
          event: [{
            listen: 'test',
            script: {
              exec: [
                'pm.test("Reservation Created", function () { pm.expect([200, 201]).to.include(pm.response.code); });',
                'var jsonData = pm.response.json();',
                'if (jsonData.id) { pm.environment.set("reservationId", jsonData.id); }',
              ],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '13. Read Reservation',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: { raw: '{{baseUrl}}/api/connectivity/v1/reservations/{{reservationId}}', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'reservations', '{{reservationId}}'] },
            description: 'Retrieve external reservation details',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Reservation Retrieved", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '14. Modify Reservation',
          request: {
            method: 'PUT',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ guestName: 'Jane M. Doe', totalAmount: 11000 }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/reservations/{{reservationId}}', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'reservations', '{{reservationId}}'] },
            description: 'Modify an existing external reservation',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Reservation Modified", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '15. Cancel Reservation',
          request: {
            method: 'POST',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ reason: 'Guest requested cancellation' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/reservations/{{reservationId}}/cancel', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'reservations', '{{reservationId}}', 'cancel'] },
            description: 'Cancel an existing external reservation. Completes Milestone 4.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Reservation Cancelled", function () { pm.expect([200, 201]).to.include(pm.response.code); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '16. Idempotency Test (Duplicate Reservation)',
          request: {
            method: 'POST',
            header: [
              { key: 'x-api-key', value: '{{apiKey}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({
                externalPropertyId: '{{externalPropertyId}}',
                externalReservationId: '{{externalReservationId}}',
                externalRoomTypeId: '{{externalRoomTypeId}}',
                externalRatePlanId: '{{externalRatePlanId}}',
                checkInDate: '2026-09-01',
                checkOutDate: '2026-09-03',
                guestName: 'Jane Doe',
                guestEmail: 'jane@example.com',
                totalAmount: 11000,
                currency: 'INR',
              }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/reservations', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'reservations'] },
            description: 'Send duplicate reservation request with identical externalReservationId. Completes Milestone 5.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: [
                'pm.test("Duplicate Reservation Handled Idempotently", function () { pm.response.to.have.status(200); });',
                'var jsonData = pm.response.json();',
                'pm.test("Duplicate flag set", function () { pm.expect(jsonData.duplicateDetected).to.eql(true); });',
              ],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '17. Webhook URL Configuration',
          request: {
            method: 'PATCH',
            header: [
              { key: 'Authorization', value: 'Bearer {{developerToken}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ webhookUrl: 'https://webhook.site/test-receiver', rotateSecret: true }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/developer/webhook-config', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'developer', 'webhook-config'] },
            description: 'Update destination Webhook URL and optionally rotate HMAC secret',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Webhook Configured", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '18. Sandbox Webhook Test Trigger',
          request: {
            method: 'POST',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: { raw: '{{baseUrl}}/api/connectivity/v1/sandbox/test-webhook', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'sandbox', 'test-webhook'] },
            description: 'Trigger test webhook signature & reachability verification. Completes Milestone 6 when receiver responds 200 OK.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Webhook Test Triggered", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '19. Get Certification Status',
          request: {
            method: 'GET',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: { raw: '{{baseUrl}}/api/connectivity/v1/sandbox/certification/status', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'sandbox', 'certification', 'status'] },
            description: 'Check current 6-milestone certification checklist status',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Certification Status Retrieved", function () { pm.response.to.have.status(200); });'],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '20. Verify & Run Self-Certification Audit',
          request: {
            method: 'POST',
            header: [{ key: 'x-api-key', value: '{{apiKey}}', type: 'text' }],
            url: { raw: '{{baseUrl}}/api/connectivity/v1/sandbox/certification/verify', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'sandbox', 'certification', 'verify'] },
            description: 'Evaluate certification checklist and update partner status to PASSED if all 6 milestones pass',
          },
          event: [{
            listen: 'test',
            script: {
              exec: [
                'pm.test("Certification Evaluation Finished", function () { pm.response.to.have.status(200); });',
                'var jsonData = pm.response.json();',
                'pm.test("Check Certification Passed", function () { pm.expect(jsonData.certificationStatus).to.eql("PASSED"); });',
              ],
              type: 'text/javascript',
            },
          }],
        },
        {
          name: '21. Request Production Credential',
          request: {
            method: 'POST',
            header: [
              { key: 'Authorization', value: 'Bearer {{developerToken}}', type: 'text' },
              { key: 'Content-Type', value: 'application/json', type: 'text' },
            ],
            body: {
              mode: 'raw',
              raw: JSON.stringify({ environment: 'PRODUCTION', name: 'Production Key' }, null, 2),
            },
            url: { raw: '{{baseUrl}}/api/connectivity/v1/developer/credentials', host: ['{{baseUrl}}'], path: ['api', 'connectivity', 'v1', 'developer', 'credentials'] },
            description: 'Issue live production API key (rg_live_...). Strict security gate enforces certificationStatus === PASSED.',
          },
          event: [{
            listen: 'test',
            script: {
              exec: ['pm.test("Credential Response Handled", function () { pm.expect([200, 201, 403]).to.include(pm.response.code); });'],
              type: 'text/javascript',
            },
          }],
        },
      ],
    };
  }

  /**
   * Generates the official RouteGuide V1 Sandbox Postman Environment object.
   */
  getPostmanEnvironment(sandboxApiKey?: string, developerToken?: string, baseUrl = 'http://localhost:3000') {
    return {
      id: 'routeguide-v1-sandbox-env',
      name: 'RouteGuide V1 Sandbox Environment',
      values: [
        { key: 'baseUrl', value: baseUrl, enabled: true },
        { key: 'apiKey', value: sandboxApiKey || 'rg_test_REPLACE_WITH_YOUR_SANDBOX_API_KEY', enabled: true },
        { key: 'developerToken', value: developerToken || 'REPLACE_WITH_YOUR_DEVELOPER_JWT', enabled: true },
        { key: 'propertyId', value: 'TEST-PROP-001', enabled: true },
        { key: 'externalPropertyId', value: 'TEST-PROP-001', enabled: true },
        { key: 'roomTypeId', value: '', enabled: true },
        { key: 'externalRoomTypeId', value: 'DELUXE', enabled: true },
        { key: 'externalRatePlanId', value: 'BAR_EP', enabled: true },
        { key: 'reservationId', value: '', enabled: true },
        { key: 'externalReservationId', value: `EXT-RES-${Math.floor(1000 + Math.random() * 9000)}`, enabled: true },
        { key: 'webhookSecret', value: 'PASTE_HMAC_SECRET_FROM_DASHBOARD', enabled: true },
      ],
      _postman_variable_scope: 'environment',
    };
  }
}
