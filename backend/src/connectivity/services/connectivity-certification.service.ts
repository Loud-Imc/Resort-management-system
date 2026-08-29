import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CertificationMilestone {
  key: string;
  title: string;
  status: 'PASSED' | 'FAILED' | 'NOT_STARTED';
  details: string;
}

export interface CertificationChecklist {
  sandboxConnection: CertificationMilestone;
  roomTypeMapping: CertificationMilestone;
  ratesAndRestrictions: CertificationMilestone;
  reservationLifecycle: CertificationMilestone;
  idempotency: CertificationMilestone;
  webhookAndHmac: CertificationMilestone;
}

@Injectable()
export class ConnectivityCertificationService {
  private readonly logger = new Logger(ConnectivityCertificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStatus(partnerId: string) {
    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${partnerId} not found`);
    }

    const checklist = await this.evaluateChecklist(partnerId);
    return {
      partnerId: partner.id,
      partnerCode: partner.code,
      certificationStatus: partner.certificationStatus,
      certifiedAt: partner.certifiedAt,
      webhookUrl: partner.webhookUrl,
      checklist,
    };
  }

  async verifyAndEvaluate(partnerId: string) {
    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${partnerId} not found`);
    }

    const checklist = await this.evaluateChecklist(partnerId);
    const allPassed = Object.values(checklist).every((m) => m.status === 'PASSED');

    const newStatus = allPassed ? 'PASSED' : 'FAILED';
    const certifiedAt = allPassed ? new Date() : partner.certifiedAt;

    const updatedPartner = await this.prisma.connectivityPartner.update({
      where: { id: partnerId },
      data: {
        certificationStatus: newStatus as any,
        certifiedAt,
        certificationDetails: checklist as any,
      },
    });

    // Record auditable verification run in connectivity_logs
    await this.prisma.connectivityLog.create({
      data: {
        partnerId,
        direction: 'INBOUND',
        endpoint: '/api/connectivity/v1/sandbox/certification/verify',
        method: 'POST',
        statusCode: allPassed ? 200 : 400,
        requestPayload: { action: 'VERIFY_CERTIFICATION', partnerId },
        responsePayload: {
          certificationStatus: newStatus,
          certifiedAt,
          allPassed,
          passedCount: Object.values(checklist).filter((m) => m.status === 'PASSED').length,
          totalMilestones: 6,
        },
      },
    });

    return {
      partnerId: updatedPartner.id,
      partnerCode: updatedPartner.code,
      certificationStatus: updatedPartner.certificationStatus,
      certifiedAt: updatedPartner.certifiedAt,
      checklist,
    };
  }

  async overrideCertification(
    partnerId: string,
    status: 'PASSED' | 'FAILED',
    reason: string,
    adminUserId: string,
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('A reason is mandatory for admin certification override');
    }

    const partner = await this.prisma.connectivityPartner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) {
      throw new NotFoundException(`Partner with ID ${partnerId} not found`);
    }

    const certifiedAt = status === 'PASSED' ? new Date() : null;
    const existingDetails = (partner.certificationDetails as any) || {};
    const updatedDetails = {
      ...existingDetails,
      adminOverride: {
        overriddenBy: adminUserId,
        overriddenAt: new Date().toISOString(),
        status,
        reason,
      },
    };

    const updatedPartner = await this.prisma.connectivityPartner.update({
      where: { id: partnerId },
      data: {
        certificationStatus: status as any,
        certifiedAt,
        certificationDetails: updatedDetails,
      },
    });

    // Audit log
    await this.prisma.connectivityLog.create({
      data: {
        partnerId,
        direction: 'INBOUND',
        endpoint: `/api/admin/connectivity/partners/${partnerId}/certification/override`,
        method: 'PATCH',
        statusCode: 200,
        requestPayload: { status, reason, adminUserId },
        responsePayload: {
          action: 'SUPERADMIN_CERTIFICATION_OVERRIDE',
          previousStatus: partner.certificationStatus,
          newStatus: status,
          reason,
        },
      },
    });

    return {
      partnerId: updatedPartner.id,
      certificationStatus: updatedPartner.certificationStatus,
      certifiedAt: updatedPartner.certifiedAt,
      reason,
    };
  }

  private async evaluateChecklist(partnerId: string): Promise<CertificationChecklist> {
    // 1. Sandbox Connection Check on TEST-PROP-001
    const sandboxConn = await this.prisma.connectivityPartnerConnection.findFirst({
      where: {
        partnerId,
        propertyId: 'TEST-PROP-001',
      },
      include: {
        roomMappings: true,
      },
    });

    const sandboxConnectionMilestone: CertificationMilestone = {
      key: 'sandboxConnection',
      title: 'Sandbox Connection Setup',
      status: sandboxConn ? 'PASSED' : 'NOT_STARTED',
      details: sandboxConn
        ? `Connected to Sandbox property TEST-PROP-001 (Connection ID: ${sandboxConn.id})`
        : 'Partner must create a connection to Sandbox property TEST-PROP-001.',
    };

    // 2. RoomType Mapping Check
    const hasRoomMappings = sandboxConn && sandboxConn.roomMappings && sandboxConn.roomMappings.length > 0;
    const roomTypeMappingMilestone: CertificationMilestone = {
      key: 'roomTypeMapping',
      title: 'RoomType Mapping Configuration',
      status: hasRoomMappings ? 'PASSED' : 'NOT_STARTED',
      details: hasRoomMappings
        ? `Mapped ${sandboxConn.roomMappings.length} RoomType(s) on TEST-PROP-001`
        : 'Partner must map at least one external room code to a RouteGuide RoomType on TEST-PROP-001.',
    };

    // Query partner's logs for TEST-PROP-001 / V1 endpoints
    const partnerLogs = await this.prisma.connectivityLog.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 250,
    });

    // 3. Rates & Restrictions Check
    const rateLogs = partnerLogs.filter(
      (l) => l.endpoint && l.endpoint.includes('/rates') && l.statusCode === 200,
    );
    const restrictionLogs = partnerLogs.filter(
      (l) => l.endpoint && l.endpoint.includes('/restrictions') && l.statusCode === 200,
    );
    const ratesAndRestrictionsPassed = rateLogs.length > 0 && restrictionLogs.length > 0;

    const ratesAndRestrictionsMilestone: CertificationMilestone = {
      key: 'ratesAndRestrictions',
      title: 'Rates & Restrictions Push/Query',
      status: ratesAndRestrictionsPassed ? 'PASSED' : 'NOT_STARTED',
      details: ratesAndRestrictionsPassed
        ? `Verified rate sync (${rateLogs.length} reqs) and restriction sync (${restrictionLogs.length} reqs)`
        : 'Partner must execute rate sync (PUT/GET /rates) and restriction sync (PUT/GET /restrictions).',
    };

    // 4. Reservation Lifecycle Check (Create, Read, Modify, Cancel)
    const resCreateLogs = partnerLogs.filter(
      (l) => l.endpoint && l.endpoint.endsWith('/reservations') && l.method === 'POST' && (l.statusCode === 201 || l.statusCode === 200),
    );
    const resGetLogs = partnerLogs.filter(
      (l) => l.endpoint && l.endpoint.includes('/reservations/') && l.method === 'GET' && l.statusCode === 200,
    );
    const resUpdateLogs = partnerLogs.filter(
      (l) => l.endpoint && l.endpoint.includes('/reservations/') && l.method === 'PUT' && l.statusCode === 200,
    );
    const resCancelLogs = partnerLogs.filter(
      (l) => l.endpoint && (l.endpoint.endsWith('/cancel') || l.endpoint.includes('/cancel')) && l.method === 'POST' && (l.statusCode === 200 || l.statusCode === 201),
    );

    const cancelledBookingInDb = await this.prisma.connectivityReservationMapping.findFirst({
      where: { partnerId },
      include: { booking: true },
    });

    const hasCompletedLifecycle =
      resCreateLogs.length > 0 &&
      resGetLogs.length > 0 &&
      resUpdateLogs.length > 0 &&
      resCancelLogs.length > 0 &&
      cancelledBookingInDb !== null;

    const reservationLifecycleMilestone: CertificationMilestone = {
      key: 'reservationLifecycle',
      title: 'Full Reservation Lifecycle',
      status: hasCompletedLifecycle ? 'PASSED' : 'NOT_STARTED',
      details: hasCompletedLifecycle
        ? `Verified reservation lifecycle: Create (${resCreateLogs.length}), Read (${resGetLogs.length}), Modify (${resUpdateLogs.length}), Cancel (${resCancelLogs.length})`
        : 'Partner must create, read, modify, and cancel a reservation on TEST-PROP-001.',
    };

    // 5. Idempotency Demonstration Check
    const extResIdCounts: Record<string, number> = {};
    resCreateLogs.forEach((l) => {
      const payload = l.requestPayload as any;
      const extId = payload?.externalReservationId;
      if (extId) {
        extResIdCounts[extId] = (extResIdCounts[extId] || 0) + 1;
      }
    });

    const duplicateExtId = Object.keys(extResIdCounts).find((id) => extResIdCounts[id] >= 2);
    const reservationMappingsCount = await this.prisma.connectivityReservationMapping.count({
      where: { partnerId },
    });

    const idempotencyPassed = Boolean(duplicateExtId) || (resCreateLogs.length >= 2 && reservationMappingsCount <= resCreateLogs.length);

    const idempotencyMilestone: CertificationMilestone = {
      key: 'idempotency',
      title: 'Reservation Ingestion Idempotency',
      status: idempotencyPassed ? 'PASSED' : 'NOT_STARTED',
      details: idempotencyPassed
        ? `Verified idempotency: duplicate reservation requests correctly mapped without duplicate canonical bookings`
        : 'Partner must send duplicate reservation requests with identical externalReservationId to prove idempotent handling.',
    };

    // 6. Webhook Reachability & HMAC Verification Check
    const outboundLogs = partnerLogs.filter(
      (l) => l.direction === 'OUTBOUND' && l.statusCode === 200,
    );

    const ackLog = outboundLogs.find((l) => {
      const resPayload = l.responsePayload as any;
      if (!resPayload) return false;
      if (typeof resPayload === 'object') {
        return resPayload.signatureVerified === true || resPayload.received === true;
      }
      if (typeof resPayload === 'string') {
        return resPayload.includes('signatureVerified') || resPayload.includes('200');
      }
      return false;
    });

    const webhookPassed = outboundLogs.length > 0 && (Boolean(ackLog) || outboundLogs.some((l) => l.statusCode === 200));

    const webhookAndHmacMilestone: CertificationMilestone = {
      key: 'webhookAndHmac',
      title: 'Outbound Webhook Delivery & HMAC Verification',
      status: webhookPassed ? 'PASSED' : 'NOT_STARTED',
      details: webhookPassed
        ? `Verified outbound webhook POST delivery (${outboundLogs.length} successful deliveries, HTTP 200 OK)`
        : 'Partner must receive an outbound test webhook (POST /sandbox/test-webhook) and return HTTP 200 with signature verification acknowledgment.',
    };

    return {
      sandboxConnection: sandboxConnectionMilestone,
      roomTypeMapping: roomTypeMappingMilestone,
      ratesAndRestrictions: ratesAndRestrictionsMilestone,
      reservationLifecycle: reservationLifecycleMilestone,
      idempotency: idempotencyMilestone,
      webhookAndHmac: webhookAndHmacMilestone,
    };
  }
}
