/*
  Warnings:

  - You are about to drop the column `groupPricePerHead` on the `room_types` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'RESERVED';

-- AlterTable
ALTER TABLE "properties" ADD COLUMN     "groupPricePerHead" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "room_blocks" ADD COLUMN     "bookingId" TEXT;

-- AlterTable
ALTER TABLE "room_types" DROP COLUMN "groupPricePerHead";

-- AddForeignKey
ALTER TABLE "room_blocks" ADD CONSTRAINT "room_blocks_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
