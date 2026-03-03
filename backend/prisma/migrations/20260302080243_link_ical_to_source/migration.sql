-- AlterTable
ALTER TABLE "property_icals" ADD COLUMN     "bookingSourceId" TEXT;

-- AddForeignKey
ALTER TABLE "property_icals" ADD CONSTRAINT "property_icals_bookingSourceId_fkey" FOREIGN KEY ("bookingSourceId") REFERENCES "booking_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;
