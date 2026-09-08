-- AlterTable
ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "occupancyVersion" TEXT NOT NULL DEFAULT 'V1';

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "occupancyVersion" TEXT NOT NULL DEFAULT 'V1';
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "totalBaseOccupancy" INTEGER;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "totalMaxOccupancy" INTEGER;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseMaxAdults" INTEGER;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseMaxChildren" INTEGER;
