-- AlterTable: Add capacity fields to room_types
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseAdults" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "baseChildren" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "maxPhysicalAdults" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "maxPhysicalChildren" INTEGER NOT NULL DEFAULT 2;

-- AlterTable: Add extra guest count tracking to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "extraAdultsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "extraChildrenCount" INTEGER NOT NULL DEFAULT 0;
