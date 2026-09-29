-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RateLogAction" AS ENUM ('RATE_UPDATE', 'RESTRICTION_UPDATE', 'STOP_SELL_TOGGLE', 'INVENTORY_OVERRIDE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "SyncStatus" AS ENUM ('SUCCESS', 'PENDING', 'FAILED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: rate_restriction_logs
CREATE TABLE IF NOT EXISTS "rate_restriction_logs" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "actionType" "RateLogAction" NOT NULL,
    "roomTypeId" TEXT,
    "roomTypeName" TEXT,
    "channelId" TEXT,
    "channelName" TEXT NOT NULL DEFAULT 'All Channels',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "daysOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_restriction_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_restriction_logs_propertyId_fkey') THEN
        ALTER TABLE "rate_restriction_logs" ADD CONSTRAINT "rate_restriction_logs_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_restriction_logs_userId_fkey') THEN
        ALTER TABLE "rate_restriction_logs" ADD CONSTRAINT "rate_restriction_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_restriction_logs_roomTypeId_fkey') THEN
        ALTER TABLE "rate_restriction_logs" ADD CONSTRAINT "rate_restriction_logs_roomTypeId_fkey" FOREIGN KEY ("roomTypeId") REFERENCES "room_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "rate_restriction_logs_propertyId_createdAt_idx" ON "rate_restriction_logs"("propertyId", "createdAt");
