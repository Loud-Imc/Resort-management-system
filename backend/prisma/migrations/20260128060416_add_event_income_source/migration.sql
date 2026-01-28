-- AlterEnum
ALTER TYPE "IncomeSource" ADD VALUE 'EVENT_BOOKING';

-- AlterTable
ALTER TABLE "income" ADD COLUMN     "eventBookingId" TEXT;

-- AddForeignKey
ALTER TABLE "income" ADD CONSTRAINT "income_eventBookingId_fkey" FOREIGN KEY ("eventBookingId") REFERENCES "event_bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
