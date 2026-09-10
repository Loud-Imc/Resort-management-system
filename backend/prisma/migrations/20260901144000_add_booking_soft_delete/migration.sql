-- AlterTable: Add isDeleted and deletedAt to bookings
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "isDeleted" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);
