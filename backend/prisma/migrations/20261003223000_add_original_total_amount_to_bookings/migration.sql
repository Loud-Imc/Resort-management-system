-- AlterTable
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "originalTotalAmount" DECIMAL(10, 2);
