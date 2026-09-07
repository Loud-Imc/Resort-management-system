-- AlterTable
ALTER TABLE "room_types" ADD COLUMN IF NOT EXISTS "maxPhysicalInfants" INTEGER NOT NULL DEFAULT 1;
