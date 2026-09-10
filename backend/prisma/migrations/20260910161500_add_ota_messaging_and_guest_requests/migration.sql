-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OtaRequestType" AS ENUM ('DATE_CHANGE', 'CANCELLATION_FEE_WAIVER', 'EARLY_CHECKIN', 'LATE_CHECKOUT', 'ROOM_PREFERENCE', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "OtaRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ota_message_threads" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bookingId" TEXT,
    "channelName" TEXT NOT NULL DEFAULT 'CHANNEX',
    "externalThreadId" TEXT NOT NULL,
    "externalBookingId" TEXT,
    "guestName" TEXT,
    "subject" TEXT,
    "channel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "lastMessageAt" TIMESTAMP(3),
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_message_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ota_messages" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "externalMessageId" TEXT,
    "senderType" TEXT NOT NULL,
    "senderName" TEXT,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ota_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ota_guest_requests" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bookingId" TEXT,
    "threadId" TEXT,
    "externalRequestId" TEXT,
    "requestType" "OtaRequestType" NOT NULL,
    "status" "OtaRequestStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requestedDetails" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "respondedById" TEXT,
    "responseNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ota_guest_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ota_message_threads_externalThreadId_key" ON "ota_message_threads"("externalThreadId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ota_message_threads_propertyId_idx" ON "ota_message_threads"("propertyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ota_message_threads_bookingId_idx" ON "ota_message_threads"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ota_messages_externalMessageId_key" ON "ota_messages"("externalMessageId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ota_messages_threadId_idx" ON "ota_messages"("threadId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ota_guest_requests_externalRequestId_key" ON "ota_guest_requests"("externalRequestId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ota_guest_requests_propertyId_status_idx" ON "ota_guest_requests"("propertyId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ota_guest_requests_bookingId_idx" ON "ota_guest_requests"("bookingId");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "ota_message_threads" ADD CONSTRAINT "ota_message_threads_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ota_message_threads" ADD CONSTRAINT "ota_message_threads_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ota_messages" ADD CONSTRAINT "ota_messages_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ota_message_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ota_guest_requests" ADD CONSTRAINT "ota_guest_requests_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ota_guest_requests" ADD CONSTRAINT "ota_guest_requests_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ota_guest_requests" ADD CONSTRAINT "ota_guest_requests_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ota_message_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ota_guest_requests" ADD CONSTRAINT "ota_guest_requests_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
