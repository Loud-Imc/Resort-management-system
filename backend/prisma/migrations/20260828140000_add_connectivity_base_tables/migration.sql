-- CreateEnum IF NOT EXISTS
DO $$ BEGIN
    CREATE TYPE "ConnectivityPartnerType" AS ENUM ('PMS', 'CHANNEL_MANAGER', 'CONNECTIVITY_PROVIDER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConnectivityPartnerStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConnectivityCredentialEnv" AS ENUM ('SANDBOX', 'PRODUCTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConnectivityCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConnectivityConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConnectivityLogDirection" AS ENUM ('INBOUND', 'OUTBOUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ConnectivityEventStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'DEAD_LETTER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable connectivity_partners
CREATE TABLE IF NOT EXISTS "connectivity_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ConnectivityPartnerType" NOT NULL DEFAULT 'PMS',
    "status" "ConnectivityPartnerStatus" NOT NULL DEFAULT 'PENDING',
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "webhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_partners_code_key" ON "connectivity_partners"("code");

-- CreateTable connectivity_partner_credentials
CREATE TABLE IF NOT EXISTS "connectivity_partner_credentials" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Primary Key',
    "environment" "ConnectivityCredentialEnv" NOT NULL DEFAULT 'PRODUCTION',
    "keyPrefix" TEXT NOT NULL,
    "apiKeyHash" TEXT NOT NULL,
    "status" "ConnectivityCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_partner_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_partner_credentials_apiKeyHash_key" ON "connectivity_partner_credentials"("apiKeyHash");
CREATE INDEX IF NOT EXISTS "connectivity_partner_credentials_apiKeyHash_idx" ON "connectivity_partner_credentials"("apiKeyHash");
CREATE INDEX IF NOT EXISTS "connectivity_partner_credentials_partnerId_status_idx" ON "connectivity_partner_credentials"("partnerId", "status");

-- CreateTable connectivity_partner_connections
CREATE TABLE IF NOT EXISTS "connectivity_partner_connections" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalPropertyId" TEXT NOT NULL,
    "webhookUrl" TEXT,
    "status" "ConnectivityConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncedAt" TIMESTAMP(3),
    "lastFailedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_partner_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_partner_connections_partnerId_propertyId_key" ON "connectivity_partner_connections"("partnerId", "propertyId");
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_partner_connections_partnerId_externalPropert_key" ON "connectivity_partner_connections"("partnerId", "externalPropertyId");

-- CreateTable connectivity_room_type_mappings
CREATE TABLE IF NOT EXISTS "connectivity_room_type_mappings" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "roomTypeId" TEXT NOT NULL,
    "externalRoomTypeId" TEXT NOT NULL,
    "externalRatePlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_room_type_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_room_type_mappings_connectionId_roomTypeId_key" ON "connectivity_room_type_mappings"("connectionId", "roomTypeId");
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_room_type_mappings_connectionId_externalRoomT_key" ON "connectivity_room_type_mappings"("connectionId", "externalRoomTypeId");

-- CreateTable connectivity_reservation_mappings
CREATE TABLE IF NOT EXISTS "connectivity_reservation_mappings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalReservationId" TEXT NOT NULL,
    "externalPropertyId" TEXT NOT NULL,
    "externalRoomTypeId" TEXT NOT NULL,
    "externalRatePlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_reservation_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_reservation_mappings_bookingId_key" ON "connectivity_reservation_mappings"("bookingId");
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_reservation_mappings_partnerId_externalReserv_key" ON "connectivity_reservation_mappings"("partnerId", "externalReservationId");
CREATE INDEX IF NOT EXISTS "connectivity_reservation_mappings_partnerId_connectionId_idx" ON "connectivity_reservation_mappings"("partnerId", "connectionId");

-- CreateTable connectivity_logs
CREATE TABLE IF NOT EXISTS "connectivity_logs" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "connectionId" TEXT,
    "direction" "ConnectivityLogDirection" NOT NULL DEFAULT 'INBOUND',
    "endpoint" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "connectivity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "connectivity_logs_partnerId_idx" ON "connectivity_logs"("partnerId");
CREATE INDEX IF NOT EXISTS "connectivity_logs_connectionId_idx" ON "connectivity_logs"("connectionId");

-- CreateTable connectivity_outbox
CREATE TABLE IF NOT EXISTS "connectivity_outbox" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "aggregateId" TEXT,
    "sequenceNumber" BIGSERIAL NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "ConnectivityEventStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "nextRetryAt" TIMESTAMP(3),
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "connectivity_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "connectivity_outbox_partnerId_status_nextRetryAt_idx" ON "connectivity_outbox"("partnerId", "status", "nextRetryAt");
CREATE INDEX IF NOT EXISTS "connectivity_outbox_connectionId_sequenceNumber_idx" ON "connectivity_outbox"("connectionId", "sequenceNumber");

-- AddForeignKey IF NOT EXISTS
DO $$ BEGIN
    ALTER TABLE "connectivity_partner_credentials" ADD CONSTRAINT "connectivity_partner_credentials_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "connectivity_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_partner_connections" ADD CONSTRAINT "connectivity_partner_connections_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "connectivity_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_partner_connections" ADD CONSTRAINT "connectivity_partner_connections_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_room_type_mappings" ADD CONSTRAINT "connectivity_room_type_mappings_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connectivity_partner_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_room_type_mappings" ADD CONSTRAINT "connectivity_room_type_mappings_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_reservation_mappings" ADD CONSTRAINT "connectivity_reservation_mappings_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_reservation_mappings" ADD CONSTRAINT "connectivity_reservation_mappings_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "connectivity_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_reservation_mappings" ADD CONSTRAINT "connectivity_reservation_mappings_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connectivity_partner_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_logs" ADD CONSTRAINT "connectivity_logs_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "connectivity_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_logs" ADD CONSTRAINT "connectivity_logs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connectivity_partner_connections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_outbox" ADD CONSTRAINT "connectivity_outbox_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "connectivity_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "connectivity_outbox" ADD CONSTRAINT "connectivity_outbox_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connectivity_partner_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
