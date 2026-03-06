-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_FAILED';
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_CANCELLED';

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "groupSize" INTEGER,
ADD COLUMN     "isGroupBooking" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "allowsGroupBooking" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "room_types" ADD COLUMN     "groupPricePerHead" DECIMAL(10,2),
ADD COLUMN     "isAvailableForGroupBooking" BOOLEAN NOT NULL DEFAULT false;
