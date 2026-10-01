-- AlterTable
ALTER TABLE "connectivity_availability_overrides" ADD COLUMN IF NOT EXISTS "channelTarget" TEXT NOT NULL DEFAULT 'ALL';

-- DropIndex
DROP INDEX IF EXISTS "connectivity_availability_overrides_propertyId_roomTypeId_date_key";
DROP INDEX IF EXISTS "connectivity_availability_overrides_propertyId_date_idx";

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "connectivity_availability_overrides_propertyId_roomTypeId_channelTarget_date_key" 
ON "connectivity_availability_overrides"("propertyId", "roomTypeId", "channelTarget", "date");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "connectivity_availability_overrides_propertyId_channelTarget_date_idx" 
ON "connectivity_availability_overrides"("propertyId", "channelTarget", "date");
