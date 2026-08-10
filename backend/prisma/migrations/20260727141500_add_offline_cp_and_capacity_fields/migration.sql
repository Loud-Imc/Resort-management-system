-- AlterTable: Add capacity fields to room_types
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseAdults" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseChildren" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "maxPhysicalAdults" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "maxPhysicalChildren" INTEGER NOT NULL DEFAULT 2;

-- AlterTable: Add extra guest count tracking to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "extraAdultsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "extraChildrenCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Add offlineCpId and offlineCpCommission to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "offlineCpId" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "offlineCpCommission" DECIMAL(10, 2) DEFAULT 0;

-- CreateTable: offline_channel_partners
CREATE TABLE IF NOT EXISTS "offline_channel_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "defaultCommission" DECIMAL(5, 2),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offline_channel_partners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "offline_channel_partners_propertyId_name_key" ON "offline_channel_partners"("propertyId", "name");

-- AddForeignKey for offlineCpId on bookings
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_offlineCpId_fkey') THEN
        ALTER TABLE "bookings" ADD CONSTRAINT "bookings_offlineCpId_fkey" FOREIGN KEY ("offlineCpId") REFERENCES "offline_channel_partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey for propertyId on offline_channel_partners
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'offline_channel_partners_propertyId_fkey') THEN
        ALTER TABLE "offline_channel_partners" ADD CONSTRAINT "offline_channel_partners_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "properties"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
